<?php
/**
 * KWIZY - Session API v4 (eleves/)
 * Robuste : fonctionne quelle que soit la structure exacte de sessions_eleves
 * Colonnes de base garanties : quiz_id, student_id, nom_eleve, student_class, statut
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php';
autoMigrate($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$data   = [];

if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?? [];
}

$action = $_GET['action'] ?? ($data['action'] ?? '');

/**
 * Récupère la liste des colonnes d'une table (mise en cache en mémoire).
 */
function getTableColumns($pdo, $table) {
    static $cache = [];
    if (isset($cache[$table])) return $cache[$table];
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table`");
    $stmt->execute();
    $cols = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
    $cache[$table] = $cols;
    return $cols;
}

/**
 * Construit un SET clause uniquement avec les colonnes qui existent.
 */
function safeUpdate($pdo, $table, $desired, $whereClause, $whereParams) {
    $cols = getTableColumns($pdo, $table);
    $sets = [];
    $params = [];
    foreach ($desired as $col => $val) {
        if (in_array($col, $cols)) {
            $sets[] = "`$col` = ?";
            $params[] = $val;
        }
    }
    if (empty($sets)) return false;
    $sql = "UPDATE `$table` SET " . implode(', ', $sets) . " WHERE $whereClause";
    $stmt = $pdo->prepare($sql);
    return $stmt->execute(array_merge($params, $whereParams));
}

/**
 * Construit un INSERT uniquement avec les colonnes qui existent.
 */
function safeInsert($pdo, $table, $desired) {
    $cols = getTableColumns($pdo, $table);
    $insertCols = [];
    $placeholders = [];
    $params = [];
    foreach ($desired as $col => $val) {
        if (in_array($col, $cols)) {
            $insertCols[] = "`$col`";
            if ($val === 'CURRENT_TIMESTAMP') {
                $placeholders[] = 'CURRENT_TIMESTAMP';
            } else {
                $placeholders[] = '?';
                $params[] = $val;
            }
        }
    }
    if (empty($insertCols)) return false;
    $sql = "INSERT INTO `$table` (" . implode(', ', $insertCols) . ") VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    return $stmt->execute($params);
}

function findSession($pdo, $studentId, $code = null) {
    if ($code) {
        $stmt = $pdo->prepare('
            SELECT se.* FROM sessions_eleves se
            JOIN quizs q ON se.quiz_id = q.id
            WHERE se.student_id = ? AND q.code = ?
            ORDER BY se.id DESC LIMIT 1
        ');
        $stmt->execute([$studentId, $code]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM sessions_eleves WHERE student_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$studentId]);
    }
    return $stmt->fetch();
}

/**
 * Tente d'ajouter les colonnes manquantes si nécessaire.
 */
function autoMigrate($pdo) {
    $cols = getTableColumns($pdo, 'sessions_eleves');
    $toAdd = [
        'current_question' => "INT DEFAULT 0 AFTER statut",
        'last_seen'        => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        'is_locked'        => "TINYINT(1) DEFAULT 0",
        'last_tab_id'      => "VARCHAR(32) DEFAULT NULL",
        'cheat_log'        => "TEXT DEFAULT NULL"
    ];
    foreach ($toAdd as $col => $def) {
        if (!in_array($col, $cols)) {
            try {
                $pdo->exec("ALTER TABLE sessions_eleves ADD COLUMN `$col` $def");
            } catch (Exception $e) {
                // On ignore si on n'a pas les droits, safeUpdate gérera
            }
        }
    }
}

try {

    // ── DEBUG ────────────────────────────────────────────────────────────
    if ($action === 'debug') {
        $cols = getTableColumns($pdo, 'sessions_eleves');
        $stmt = $pdo->query('SELECT * FROM sessions_eleves ORDER BY id DESC LIMIT 5');
        $rows = $stmt->fetchAll();
        // Also test quiz lookup
        $quizStmt = $pdo->query('SELECT id, code, titre, statut FROM quizs ORDER BY id DESC LIMIT 5');
        $quizRows = $quizStmt->fetchAll();
        echo json_encode([
            'columns'       => $cols,
            'last_sessions' => $rows,
            'last_quizzes'  => $quizRows,
        ]);
        exit;
    }

    // ── 1. JOIN ─────────────────────────────────────────────────────────
    if ($action === 'join' && $method === 'POST') {
        $code         = $data['code'] ?? null;
        $nomEleve     = trim($data['nom_eleve'] ?? '');
        $studentId    = $data['student_id'] ?? ('std_' . uniqid());
        $studentClass = $data['student_class'] ?? '';

        if (!$code || !$nomEleve) {
            echo json_encode(['success' => false, 'message' => 'code et nom_eleve requis.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT id, statut FROM quizs WHERE code = ?');
        $stmt->execute([$code]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            echo json_encode(['success' => false, 'message' => 'Quiz introuvable.']);
            exit;
        }

        $ex = $pdo->prepare('SELECT * FROM sessions_eleves WHERE student_id = ? AND quiz_id = ?');
        $ex->execute([$studentId, $quiz['id']]);
        $existing = $ex->fetch();

        if ($existing) {
            // Si la session existe mais était terminée et que le prof a relancé le quiz ('lance')
            if ($existing['statut'] === 'termine' && $quiz['statut'] === 'lance') {
                safeUpdate($pdo, 'sessions_eleves', [
                    'statut' => 'en_cours',
                    'current_question' => 0,
                    'answers' => NULL,
                    'triche_count' => 0,
                    'is_locked' => 0,
                    'last_seen' => 'CURRENT_TIMESTAMP'
                ], 'id = ?', [$existing['id']]);
                
                echo json_encode([
                    'success'    => true,
                    'session_id' => $existing['id'],
                    'student_id' => $studentId,
                    'is_locked'  => false,
                    'message'    => 'Session réinitialisée car le quiz a été relancé.'
                ]);
                exit;
            }

            // Sinon on récupère normalement
            safeUpdate($pdo, 'sessions_eleves',
                ['last_seen' => 'CURRENT_TIMESTAMP'],
                'id = ?', [$existing['id']]
            );
            echo json_encode([
                'success'    => true,
                'session_id' => $existing['id'],
                'student_id' => $studentId,
                'is_locked'  => (bool)($existing['is_locked'] ?? false),
                'message'    => 'Session existante récupérée.'
            ]);
            exit;
        }

        // Insérer seulement les colonnes qui existent réellement
        safeInsert($pdo, 'sessions_eleves', [
            'quiz_id'       => $quiz['id'],
            'nom_eleve'     => $nomEleve,
            'student_id'    => $studentId,
            'student_class' => $studentClass,
            'statut'        => 'en_cours',
            'is_locked'     => 0,
            'triche_count'  => 0,
            'last_seen'     => 'CURRENT_TIMESTAMP',
        ]);

        echo json_encode([
            'success'    => true,
            'session_id' => $pdo->lastInsertId(),
            'student_id' => $studentId,
            'message'    => 'Session créée.'
        ]);
        exit;
    }

    // ── 2. CHECK_STATUS (GET) ────────────────────────────────────────────
    if ($action === 'check_status' && $method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $code      = $_GET['code'] ?? null;

        if (!$studentId) {
            echo json_encode(['success' => true, 'status' => 'active']);
            exit;
        }

        $session = findSession($pdo, $studentId, $code);

        if (!$session) {
            echo json_encode(['success' => true, 'status' => 'active']);
            exit;
        }

        $savedAnswers = isset($session['answers']) ? json_decode($session['answers'], true) : null;
        $isLocked     = (bool)($session['is_locked'] ?? false);

        $qStatut = 'publie';
        if ($code) {
            $qStmt = $pdo->prepare('SELECT statut FROM quizs WHERE code = ?');
            $qStmt->execute([$code]);
            $qStatut = $qStmt->fetchColumn() ?: 'publie';
        }

        echo json_encode([
            'success'         => true,
            'status'          => $isLocked ? 'locked' : 'active',
            'session_statut'  => $session['statut'] ?? 'en_cours',
            'quiz_statut'     => $qStatut,
            'currentQuestion' => (int)($session['current_question'] ?? 0),
            'savedAnswers'    => $savedAnswers,
            'cheats'          => (int)($session['triche_count'] ?? 0)
        ]);
        exit;
    }

    // ── 3. HEARTBEAT (POST ?check_status=1) ─────────────────────────────
    if ($method === 'POST' && isset($_GET['check_status'])) {
        $studentId       = $_GET['studentId'] ?? null;
        $code            = $_GET['code']      ?? null;
        $currentQuestion = (int)($_GET['currentQuestion'] ?? 0);
        $answersPayload  = $data['answers'] ?? null;
        $tabId           = $data['tabId'] ?? null;

        if (!$studentId || !$code) {
            echo json_encode(['success' => false]);
            exit;
        }

        $session = findSession($pdo, $studentId, $code);

        if ($session) {
            // Récupérer le statut du quiz
            $qStmt = $pdo->prepare('SELECT statut FROM quizs WHERE code = ?');
            $qStmt->execute([$code]);
            $qStatut = $qStmt->fetchColumn() ?: 'publie';

            // Multi-tab prevention
            if (!empty($session['last_tab_id']) && $tabId && $session['last_tab_id'] !== $tabId && empty($session['is_locked'])) {
                // Cheat detected: different tab/device
                $cLog = isset($session['cheat_log']) ? json_decode($session['cheat_log'], true) : [];
                if (!is_array($cLog)) $cLog = [];
                $cLog[] = ['time' => date('H:i:s'), 'reason' => 'multi_onglets_appareils'];
                
                safeUpdate($pdo, 'sessions_eleves', [
                    'is_locked' => 1,
                    'last_seen' => 'CURRENT_TIMESTAMP',
                    'cheat_log' => json_encode($cLog)
                ], 'id = ?', [$session['id']]);
                
                // Increment cheat count
                $pdo->prepare('UPDATE sessions_eleves SET triche_count = triche_count + 1 WHERE id = ?')
                    ->execute([$session['id']]);
                    
                echo json_encode([
                    'success' => true, 
                    'status' => 'locked',
                    'session_statut' => $session['statut'] ?? 'en_cours',
                    'quiz_statut' => $qStatut
                ]);
                exit;
            }

            $answersJson = ($answersPayload !== null) ? json_encode($answersPayload) : ($session['answers'] ?? null);

            safeUpdate($pdo, 'sessions_eleves', [
                'current_question' => $currentQuestion,
                'answers'          => $answersJson,
                'last_seen'        => 'CURRENT_TIMESTAMP',
                'last_tab_id'      => $tabId
            ], 'id = ?', [$session['id']]);
            
            $isLocked = (bool)($session['is_locked'] ?? false);
            echo json_encode([
                'success' => true, 
                'status' => $isLocked ? 'locked' : 'active',
                'session_statut' => $session['statut'] ?? 'en_cours',
                'quiz_statut' => $qStatut
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Session introuvable.']);
        }
        exit;
    }

    // ── 4. REPORT_CHEAT ──────────────────────────────────────────────────
    if ($action === 'report_cheat') {
        $studentId = $data['studentId'] ?? ($_GET['studentId'] ?? null);
        $code      = $data['code']      ?? ($_GET['code']      ?? null);

        if (!$studentId) {
            echo json_encode(['success' => false, 'message' => 'studentId requis.']);
            exit;
        }

        $session = findSession($pdo, $studentId, $code);

        if ($session) {
            $reason = $data['reason'] ?? 'Triche inconnue';
            $cols = getTableColumns($pdo, 'sessions_eleves');
            $sets = [];
            $params = [];
            if (in_array('triche_count', $cols)) {
                $sets[] = 'triche_count = triche_count + 1';
            }
            if (in_array('is_locked', $cols)) {
                $sets[] = 'is_locked = 1';
            }
            
            // Handle cheat_log array
            if (in_array('cheat_log', $cols)) {
                $cLog = isset($session['cheat_log']) ? json_decode($session['cheat_log'], true) : [];
                if (!is_array($cLog)) $cLog = [];
                $cLog[] = ['time' => date('H:i:s'), 'reason' => $reason];
                $sets[] = 'cheat_log = ?';
                $params[] = json_encode($cLog);
            }
            
            if (!empty($sets)) {
                $params[] = $session['id'];
                $pdo->prepare('UPDATE sessions_eleves SET ' . implode(', ', $sets) . ' WHERE id = ?')
                    ->execute($params);
            }
            echo json_encode(['success' => true, 'message' => 'Triche signalée.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Session introuvable.']);
        }
        exit;
    }

    // ── 5. UNLOCK ────────────────────────────────────────────────────────
    if ($action === 'unlock' && $method === 'POST') {
        $studentId = $data['studentId'] ?? null;
        $code      = $data['code']      ?? null;

        if (!$studentId) {
            echo json_encode(['success' => false, 'message' => 'studentId requis.']);
            exit;
        }

        $session = findSession($pdo, $studentId, $code);

        if ($session) {
            safeUpdate($pdo, 'sessions_eleves', ['is_locked' => 0], 'id = ?', [$session['id']]);
            echo json_encode(['success' => true, 'message' => 'Élève déverrouillé.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Session introuvable.']);
        }
        exit;
    }

    // ── 6. FINISH_AND_SUBMIT ─────────────────────────────────────────────
    if ($action === 'finish_and_submit' || $action === 'submit') {
        $studentId = $data['studentId'] ?? null;
        $code      = $data['code']      ?? null;
        $score     = (int)($data['score'] ?? 0);
        $total     = (int)($data['total'] ?? 0);
        $answers   = $data['answers']   ?? [];

        if (!$studentId) {
            echo json_encode(['success' => false, 'message' => 'studentId requis.']);
            exit;
        }

        $session = findSession($pdo, $studentId, $code);

        if ($session) {
            safeUpdate($pdo, 'sessions_eleves', [
                'statut'      => 'termine',
                'score'       => $score,
                'total_score' => $total,
                'answers'     => json_encode($answers),
                'is_locked'   => 0,
                'last_seen'   => 'CURRENT_TIMESTAMP',
            ], 'id = ?', [$session['id']]);
            echo json_encode(['success' => true, 'message' => 'Résultats enregistrés avec succès.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Session introuvable.']);
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Action non reconnue : ' . htmlspecialchars($action)]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Session Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur: ' . $e->getMessage()]);
}
?>
