<?php
/**
 * KWIZY - Results API (professeurs/)
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

try {
    // 1. Résultats d'un quiz par code
    if ($method === 'GET' && isset($_GET['code'])) {
        $code = $_GET['code'];

        $stmt = $pdo->prepare('SELECT * FROM quizs WHERE code = ?');
        $stmt->execute([$code]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            echo json_encode([]);
            exit;
        }

        $sStmt = $pdo->prepare("SELECT * FROM sessions_eleves WHERE quiz_id = ? AND statut = 'termine'");
        $sStmt->execute([$quiz['id']]);
        $sessions = $sStmt->fetchAll();

        $results = [];
        foreach ($sessions as $s) {
            $score = (int)$s['score'];
            $total = (int)$s['total_score'];
            $pct   = $total > 0 ? round(($score / $total) * 100) : 0;

            $results[] = [
                'studentId'   => $s['student_id'],
                'name'        => $s['nom_eleve'],
                'class'       => $s['student_class'],
                'score'       => $score,
                'total'       => $total,
                'percentage'  => $pct,
                'answers'     => $s['answers'] ? json_decode($s['answers'], true) : [],
                'submittedAt' => date('d/m/Y H:i', strtotime($s['created_at']))
            ];
        }

        echo json_encode($results);
        exit;
    }

    // 2. Supprimer un élève
    if ($method === 'POST' && isset($_GET['delete_student'])) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        $code = $data['code'] ?? null;
        $studentId = $data['studentId'] ?? null;

        if (!$code || !$studentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Données manquantes (code ou studentId).']);
            exit;
        }

        // Trouver l'ID du quiz
        $stmt = $pdo->prepare('SELECT id FROM quizs WHERE code = ?');
        $stmt->execute([$code]);
        $quiz = $stmt->fetch();

        if ($quiz) {
            $dStmt = $pdo->prepare('DELETE FROM sessions_eleves WHERE quiz_id = ? AND student_id = ?');
            $success = $dStmt->execute([$quiz['id'], $studentId]);
            $count = $dStmt->rowCount();
            
            error_log("Kwizy Delete: QuizCode=$code, QuizID={$quiz['id']}, StudentID=$studentId, RowsDeleted=$count");
            
            echo json_encode(['success' => true, 'deleted_count' => $count]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Quiz introuvable pour ce code.']);
        }
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("Results Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur lors du traitement des résultats.']);
}
?>
