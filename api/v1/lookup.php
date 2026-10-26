<?php
/**
 * KWIZY - Quiz Lookup API (eleves/)
 * Recherche d'un quiz par son code de partage — vue élève (sans données correctes)
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php';

try {
    $code = $_GET['share_code'] ?? '';

    if (!$code) {
        echo json_encode(['status' => 'error', 'message' => 'Code manquant.']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM quizs WHERE code = ?');
    $stmt->execute([$code]);
    $quiz = $stmt->fetch();

    if (!$quiz) {
        echo json_encode(['status' => 'error', 'message' => 'Quiz introuvable ou non publié.']);
        exit;
    }

    $allowedStatuts = ['publie', 'lance'];
    if (!in_array($quiz['statut'], $allowedStatuts, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Ce quiz n\'est pas encore disponible pour les élèves.']);
        exit;
    }

    $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ?');
    $qStmt->execute([$quiz['id']]);
    $questionsDb = $qStmt->fetchAll();

    $questions = [];
    foreach ($questionsDb as $qDb) {
        $optionsData         = $qDb['options'] ? json_decode($qDb['options'], true) : [];
        $items               = [];
        $correctOptionIndex  = null;
        $correctOptionIndexes = [];
        $expectedAnswer      = '';

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

        $questions[] = [
            'id'                   => $qDb['id'],
            'type'                 => $qDb['type'],
            'text'                 => $qDb['enonce'],
            'points'               => (int)$qDb['points'],
            'image'                => $qDb['image'],
            'options'              => $items,
            'correctOptionIndex'   => $correctOptionIndex,
            'correctOptionIndexes' => $correctOptionIndexes,
            'expectedAnswer'       => $expectedAnswer
        ];
    }

    echo json_encode([
        'status' => 'found',
        'quiz'   => [
            'id'        => (string)$quiz['id'],
            'title'     => $quiz['titre'],
            'statut'    => $quiz['statut'],
            'questions' => $questions
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Quiz Lookup Error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Erreur serveur: ' . $e->getMessage()]);
}
?>
