<?php
/**
 * KWIZY - Monitoring API v2 (professeurs/)
 * Endpoints : get_results, get_live_students, unlock_student
 */

// Temporairement activer les erreurs pour debug
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Chemin vers db.php : remonter à la racine du projet
$dbPath = __DIR__ . '/../../config/db.php';
if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuration DB introuvable: ' . $dbPath]);
    exit;
}
require_once $dbPath;

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$data   = [];
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?? [];
}

// Migration automatique pour le monitoring
function autoMigrateMonitoring($pdo) {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM quizs");
        $stmt->execute();
        $cols = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
        if (!in_array('teacher_last_seen', $cols)) {
            $pdo->exec("ALTER TABLE quizs ADD COLUMN teacher_last_seen TIMESTAMP NULL DEFAULT NULL");
        }
    } catch (Exception $e) {}
}
autoMigrateMonitoring($pdo);

try {
    // ── 1. Résultats complets ────────────────────────────────────────────
    if ($action === 'get_results') {
        $quizId = $_GET['quiz_id'] ?? null;
        $code   = $_GET['code']    ?? null;

        if (!$quizId && $code) {
            $s = $pdo->prepare('SELECT id, statut FROM quizs WHERE code = ?');
            $s->execute([$code]);
            $q = $s->fetch();
            $quizId = $q['id'] ?? null;
        }

        if (!$quizId) {
            echo json_encode(['success' => false, 'message' => 'quiz_id ou code requis.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT * FROM sessions_eleves WHERE quiz_id = ? ORDER BY id DESC');
        $stmt->execute([$quizId]);
        $sessions = $stmt->fetchAll();

        foreach ($sessions as &$session) {
            if ($session['answers'] && is_string($session['answers'])) {
                $session['answers'] = json_decode($session['answers'], true);
            }
            $session['reponses'] = []; // Obsolete en v2 (données dans 'answers')
        }

        $quizStatus = isset($q['statut']) ? $q['statut'] : 'inconnu';
        echo json_encode([
            'success' => true, 
            'sessions' => $sessions,
            'quiz_status' => $quizStatus
        ]);
        exit;
    }

    // ── 2. Élèves en direct ──────────────────────────────────────────────
    if ($action === 'get_live_students') {
        $code = $_GET['code'] ?? null;
        if (!$code) {
            echo json_encode(['success' => false, 'message' => 'code requis.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT id, statut, teacher_last_seen FROM quizs WHERE code = ?');
        $stmt->execute([$code]);
        $quiz = $stmt->fetch();
        
        $totalQuestions = 0;
        if ($quiz) {
            $qStmt = $pdo->prepare('SELECT COUNT(*) FROM questions WHERE quiz_id = ?');
            $qStmt->execute([$quiz['id']]);
            $totalQuestions = (int)$qStmt->fetchColumn();
        }

        if (!$quiz) {
            echo json_encode(['success' => true, 'students' => []]);
            exit;
        }

        // On ne charge QUE les sessions en cours — les sessions 'termine' restent dans get_results
        $sStmt = $pdo->prepare("
            SELECT * FROM sessions_eleves
            WHERE quiz_id = ? AND statut = 'en_cours'
            ORDER BY id DESC
        ");
        $sStmt->execute([$quiz['id']]);
        $sessions = $sStmt->fetchAll();

        $students = [];
        $activeCount = 0;
        
        foreach ($sessions as $s) {
            // Calcul du temps depuis le dernier heartbeat
            $lastSeenVal = $s['last_seen'] ?? null;
            $secondsAgo = 0;
            if ($lastSeenVal) {
                $secondsAgo = max(0, time() - strtotime($lastSeenVal));
            }

            $statut   = $s['statut'] ?? 'en_cours';
            
            // Auto-clean : uniquement pendant un quiz lancé (pas en salle d'attente)
            if ($quiz['statut'] === 'lance' && $statut !== 'termine' && $secondsAgo > 120) {
                $del = $pdo->prepare('DELETE FROM sessions_eleves WHERE id = ?');
                $del->execute([$s['id']]);
                continue; // Ne pas l'ajouter à la liste
            }

            $isLocked = (bool)($s['is_locked'] ?? false);

            if ($statut === 'termine') {
                $status = 'done';
            } elseif ($isLocked) {
                $status = 'locked';
                $activeCount++;
            } elseif ($secondsAgo < 60) {
                $status = 'active';
                $activeCount++;
            } else {
                $status = 'disconnected';
                $activeCount++;
            }

            $students[$s['student_id'] ?? $s['id']] = [
                'sessionId'       => $s['id'],
                'name'            => $s['nom_eleve'] ?? '—',
                'class'           => $s['student_class'] ?? '',
                'status'          => $status,
                'cheats'          => (int)($s['triche_count'] ?? 0),
                'isLocked'        => $isLocked,
                'currentQuestion' => (int)($s['current_question'] ?? 0),
                'totalQuestions'  => $totalQuestions,
                'score'           => (int)($s['score'] ?? 0),
                'total'           => (int)($s['total_score'] ?? 0),
                'lastSeen'        => $secondsAgo,
                'answers'         => isset($s['answers']) && $s['answers'] ? json_decode($s['answers'], true) : [],
                'cheatLog'        => isset($s['cheat_log']) && $s['cheat_log'] ? json_decode($s['cheat_log'], true) : []
            ];
        }

        // Mettre à jour la présence du prof EN PREMIER
        // (pour que la visite courante empêche un auto-revert intem pestif)
        $pdo->prepare('UPDATE quizs SET teacher_last_seen = CURRENT_TIMESTAMP WHERE id = ?')->execute([$quiz['id']]);

        // --- AUTO-REVERT : seulement si le quiz est "lance", teacher_last_seen ETAIT non-null
        //     et le prof était absent depuis plus de 2 minutes, ET aucun élève actif
        if ($quiz['statut'] === 'lance') {
            $teacherWasHere = $quiz['teacher_last_seen']; // Valeur AVANT la mise à jour
            
            // Si teacher_last_seen était NULL = première visite = NE PAS réverter
            if ($teacherWasHere !== null) {
                $secSinceTeacher = max(0, time() - strtotime($teacherWasHere));
                
                $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM sessions_eleves WHERE quiz_id = ? AND statut = 'en_cours'");
                $cntStmt->execute([$quiz['id']]);
                $activeSessionCount = (int)$cntStmt->fetchColumn();
                
                // Réverter uniquement si vraiment absent ET aucun élève
                if ($activeSessionCount === 0 && $secSinceTeacher > 120) {
                    $pdo->prepare('UPDATE quizs SET statut = "publie" WHERE id = ?')->execute([$quiz['id']]);
                    $quiz['statut'] = 'publie';
                }
            }
        }

        echo json_encode([
            'success' => true, 
            'students' => $students,
            'quiz_status' => $quiz['statut'] ?? 'publie'
        ]);
        exit;
    }

    // ── 3. Déverrouiller un élève ────────────────────────────────────────
    if ($action === 'unlock_student' && $method === 'POST') {
        $studentId = $data['studentId'] ?? null;
        $code      = $data['code']      ?? null;

        if (!$studentId) {
            echo json_encode(['success' => false, 'message' => 'studentId requis.']);
            exit;
        }

        if ($code) {
            $stmt = $pdo->prepare('
                UPDATE sessions_eleves se
                JOIN quizs q ON se.quiz_id = q.id
                SET se.is_locked = 0
                WHERE se.student_id = ? AND q.code = ?
            ');
            $stmt->execute([$studentId, $code]);
        } else {
            $stmt = $pdo->prepare('UPDATE sessions_eleves SET is_locked = 0 WHERE student_id = ?');
            $stmt->execute([$studentId]);
        }

        echo json_encode(['success' => true, 'message' => 'Élève déverrouillé.']);
        exit;
    }

    // ── 4. Démarrer la session (Lancer le quiz) ─────────────────────────────
    if ($action === 'start_session' && $method === 'POST') {
        $code = $data['code'] ?? null;
        if (!$code) {
            echo json_encode(['success' => false, 'message' => 'Code requis.']);
            exit;
        }
        // Mettre à jour le statut ET teacher_last_seen pour éviter un auto-revert immédiat
        $stmt = $pdo->prepare('UPDATE quizs SET statut = "lance", teacher_last_seen = CURRENT_TIMESTAMP WHERE code = ?');
        $stmt->execute([$code]);
        echo json_encode(['success' => true, 'message' => 'Quiz lancé !']);
        exit;
    }

    // ── 5. Clôturer la session (Fin du live) ────────────────────────────
    if ($action === 'close_session' && $method === 'POST') {
        $code = $data['code'] ?? null;
        if (!$code) {
            echo json_encode(['success' => false, 'message' => 'Code requis.']);
            exit;
        }

        // 1. Remettre le quiz en mode "publié" (attente)
        $stmt = $pdo->prepare('UPDATE quizs SET statut = "publie" WHERE code = ?');
        $stmt->execute([$code]);

        // 2. Supprimer toutes les sessions de ce quiz qui ne sont pas terminées
        $stmt2 = $pdo->prepare('
            DELETE se FROM sessions_eleves se
            JOIN quizs q ON se.quiz_id = q.id
            WHERE q.code = ? AND (se.statut = "en_cours" OR se.statut IS NULL)
        ');
        $stmt2->execute([$code]);

        echo json_encode(['success' => true, 'message' => 'Session clôturée et élèves non terminés effacés.']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Action non reconnue.']);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Monitoring Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur: ' . $e->getMessage()]);
}
?>
