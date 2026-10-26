<?php
/**
 * KWIZY - Quiz API (professeurs/)
 * CRUD complet des quiz pour les professeurs.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data   = [];

if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?? $_POST;
}

// Helper : parser les options d'une question
function parseOptions($qDb) {
    $optionsData          = $qDb['options'] ? json_decode($qDb['options'], true) : [];
    $items                = [];
    $correctOptionIndex   = null;
    $correctOptionIndexes = [];
    $expectedAnswer       = '';

    if (is_array($optionsData) && isset($optionsData['items'])) {
        $items                = $optionsData['items'];
        $correctOptionIndex   = $optionsData['correctOptionIndex'] ?? null;
        $correctOptionIndexes = $optionsData['correctOptionIndexes'] ?? [];
        $expectedAnswer       = $optionsData['expectedAnswer'] ?? '';
    } elseif (is_array($optionsData)) {
        foreach ($optionsData as $idx => $opt) {
            if (is_array($opt)) {
                $items[] = $opt['text'] ?? '';
                if (!empty($opt['isCorrect'])) {
                    $correctOptionIndex     = $idx;
                    $correctOptionIndexes[] = $idx;
                }
            } else {
                $items[] = $opt;
            }
        }
    }

    return [
        'items'                => $items,
        'correctOptionIndex'   => $correctOptionIndex,
        'correctOptionIndexes' => $correctOptionIndexes,
        'expectedAnswer'       => $expectedAnswer
    ];
}

try {
    // ── 1. Lister les quiz d'un professeur ───────────────────────────────
    if ($method === 'GET' && isset($_GET['teacher_id'])) {
        $profId = $_GET['teacher_id'];

        $stmt = $pdo->prepare("SELECT * FROM quizs WHERE professeur_id = ? ORDER BY created_at DESC");
        $stmt->execute([$profId]);
        $quizs = $stmt->fetchAll();

        $result = [];
        foreach ($quizs as $quiz) {
            $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ?');
            $qStmt->execute([$quiz['id']]);
            $questionsDb = $qStmt->fetchAll();

            $questions = [];
            foreach ($questionsDb as $qDb) {
                $opts = parseOptions($qDb);
                $questions[] = [
                    'id'                   => $qDb['id'],
                    'type'                 => $qDb['type'],
                    'text'                 => $qDb['enonce'],
                    'points'               => (int)$qDb['points'],
                    'image'                => $qDb['image'],
                    'options'              => $opts['items'],
                    'correctOptionIndex'   => $opts['correctOptionIndex'],
                    'correctOptionIndexes' => $opts['correctOptionIndexes'],
                    'expectedAnswer'       => $opts['expectedAnswer']
                ];
            }

            $result[] = [
                'id'        => (string)$quiz['id'],
                'folderId'  => $quiz['folderId'],
                'title'     => $quiz['titre'],
                'shareCode' => $quiz['code'],
                'isDraft'   => $quiz['statut'] === 'brouillon',
                'status'    => $quiz['statut'] === 'corbeille' ? 'Trash' : ($quiz['statut'] === 'brouillon' ? 'Draft' : ($quiz['statut'] === 'lance' ? 'Live' : 'Published')),
                'liveStatut'=> $quiz['statut'],
                'createdAt' => date('Y-m-d\TH:i:s\Z', strtotime($quiz['created_at'])),
                'updatedAt' => date('Y-m-d\TH:i:s\Z', strtotime($quiz['updated_at'])),
                'questions' => $questions,
                'settings'  => $quiz['settings'] ? json_decode($quiz['settings'], true) : null
            ];
        }

        echo json_encode($result);
        exit;
    }

        // ── 1b. Get quiz by share_code ───────────────────────────────
        if ($method === 'GET' && isset($_GET['share_code'])) {
            $code = $_GET['share_code'];
            $stmt = $pdo->prepare('SELECT * FROM quizs WHERE code = ?');
            $stmt->execute([$code]);
            $quiz = $stmt->fetch();
            if (!$quiz) {
                echo json_encode(['error' => 'Quiz not found']);
                exit;
            }
            $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ?');
            $qStmt->execute([$quiz['id']]);
            $questionsDb = $qStmt->fetchAll();
            $questions = [];
            foreach ($questionsDb as $qDb) {
                $opts = parseOptions($qDb);
                $questions[] = [
                    'id' => $qDb['id'],
                    'type' => $qDb['type'],
                    'text' => $qDb['enonce'],
                    'points' => (int)$qDb['points'],
                    'image' => $qDb['image'],
                    'options' => $opts['items'],
                    'correctOptionIndex' => $opts['correctOptionIndex'],
                    'correctOptionIndexes' => $opts['correctOptionIndexes'],
                    'expectedAnswer' => $opts['expectedAnswer']
                ];
            }
            $result = [
                'quiz' => [
                    'id' => (string)$quiz['id'],
                    'folderId' => $quiz['folderId'],
                    'title' => $quiz['titre'],
                    'shareCode' => $quiz['code'],
                    'isDraft' => $quiz['statut'] === 'brouillon',
                    'status' => $quiz['statut'] === 'corbeille' ? 'Trash' : ($quiz['statut'] === 'brouillon' ? 'Draft' : ($quiz['statut'] === 'lance' ? 'Live' : 'Published')),
                    'liveStatut' => $quiz['statut'],
                    'createdAt' => date('Y-m-d\TH:i:s\Z', strtotime($quiz['created_at'])),
                    'updatedAt' => date('Y-m-d\TH:i:s\Z', strtotime($quiz['updated_at'])),
                    'questions' => $questions
                ]
            ];
            echo json_encode($result);
            exit;
        }

        // ── 2. Créer / Mettre à jour un quiz (POST) ──────────────────────────

    // ── 2. Créer / Mettre à jour un quiz (POST) ──────────────────────────
    if ($method === 'POST' && !isset($_GET['delete_permanent']) && !isset($_GET['trash_id']) && !isset($_GET['restore_id'])) {
        $profId = $data['teacher_id'] ?? null;
        if (!$profId) {
            echo json_encode(['success' => false, 'message' => 'teacher_id manquant.']);
            exit;
        }

        $id       = $data['id']       ?? null;
        $title    = $data['title']    ?? 'Nouveau Quiz';
        $folderId = $data['folderId'] ?? 'root';
        $statut   = 'publie';
        if (isset($data['status'])) {
            $statut = ($data['status'] === 'Draft') ? 'brouillon' : 'publie';
        } elseif (isset($data['isDraft'])) {
            $statut = $data['isDraft'] ? 'brouillon' : 'publie';
        }

        $shareCode = null;
        if ($statut === 'publie' || $statut === 'lance') {
            $shareCode = !empty($data['shareCode'])
                ? $data['shareCode']
                : substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6);
        }

        try {
            $pdo->beginTransaction();

            if ($id && is_numeric($id)) {
                // Ne pas annuler un quiz en cours de session live lors d'une sauvegarde auto
                $curStmt = $pdo->prepare('SELECT statut, code FROM quizs WHERE id = ? AND professeur_id = ?');
                $curStmt->execute([$id, $profId]);
                $current = $curStmt->fetch();
                if ($current) {
                    if ($current['statut'] === 'lance' && $statut === 'publie') {
                        $statut = 'lance';
                    }
                    if (!empty($current['code'])) {
                        $shareCode = $current['code'];
                    }
                }

                $stmt = $pdo->prepare('UPDATE quizs SET titre = ?, folderId = ?, code = ?, statut = ?, settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND professeur_id = ?');
                $stmt->execute([$title, $folderId, $shareCode, $statut, isset($data['settings']) ? json_encode($data['settings']) : null, $id, $profId]);
                $quizId = $id;
                $delStmt = $pdo->prepare('DELETE FROM questions WHERE quiz_id = ?');
                $delStmt->execute([$quizId]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO quizs (professeur_id, titre, folderId, code, statut, settings) VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->execute([$profId, $title, $folderId, $shareCode, $statut, isset($data['settings']) ? json_encode($data['settings']) : null]);
                $quizId = $pdo->lastInsertId();
            }

            if (isset($data['questions']) && is_array($data['questions'])) {
                $qStmt = $pdo->prepare('INSERT INTO questions (quiz_id, type, enonce, points, image, options) VALUES (?, ?, ?, ?, ?, ?)');
                foreach ($data['questions'] as $q) {
                    $optionsJson = json_encode([
                        'items'                => $q['options']              ?? [],
                        'correctOptionIndex'   => $q['correctOptionIndex']   ?? null,
                        'correctOptionIndexes' => $q['correctOptionIndexes'] ?? [],
                        'expectedAnswer'       => $q['expectedAnswer']       ?? ''
                    ]);
                    $qStmt->execute([
                        $quizId,
                        $q['type']   ?? 'MCQ',
                        $q['text']   ?? '',
                        $q['points'] ?? 1,
                        $q['image']  ?? null,
                        $optionsJson
                    ]);
                }
            }

            $pdo->commit();

            $data['id']        = (string)$quizId;
            $data['shareCode'] = $shareCode;
            $data['success']   = true;
            echo json_encode($data);
            exit;

        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log("Save Quiz Error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Erreur technique lors de la sauvegarde.']);
            exit;
        }
    }

    // ── 3. Mise à la corbeille & Suppression ─────────────────────────────
    if ($method === 'POST' && isset($_GET['trash_id'])) {
        $stmt = $pdo->prepare("UPDATE quizs SET statut = 'corbeille', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND professeur_id = ?");
        $stmt->execute([$_GET['trash_id'], $_GET['teacher_id']]);
        echo json_encode(['success' => true, 'message' => 'Quiz mis à la corbeille.']);
        exit;
    }

    if ($method === 'POST' && isset($_GET['restore_id'])) {
        $stmt = $pdo->prepare("UPDATE quizs SET statut = 'brouillon', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND professeur_id = ?");
        $stmt->execute([$_GET['restore_id'], $_GET['teacher_id']]);
        echo json_encode(['success' => true, 'message' => 'Quiz restauré.']);
        exit;
    }

    if ($method === 'POST' && isset($_GET['delete_permanent'])) {
        // Supprimer d'abord les questions associées pour être propre
        $stmtQ = $pdo->prepare("DELETE FROM questions WHERE quiz_id = ?");
        $stmtQ->execute([$_GET['id']]);
        
        $stmt = $pdo->prepare("DELETE FROM quizs WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Action non reconnue.']);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Quiz Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur lors du traitement des quiz.']);
}
?>
