<?php
/**
 * KWIZY - Modèle Résultats
 */
class Result {
    private static $table = 'results';

    public static function save($sessionId, $studentId, $quizId, $score, $total, $answers) {
        global $pdo;
        $stmt = $pdo->prepare("INSERT INTO " . self::$table . " (session_id, student_id, quiz_id, score, total_score, answers) VALUES (?, ?, ?, ?, ?, ?)");
        return $stmt->execute([$sessionId, $studentId, $quizId, $score, $total, json_encode($answers)]);
    }

    public static function getByQuiz($quizId) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT r.*, s.nom_eleve, s.student_class FROM " . self::$table . " r JOIN sessions_eleves s ON r.student_id = s.student_id WHERE r.quiz_id = ?");
        $stmt->execute([$quizId]);
        return $stmt->fetchAll();
    }
}
?>
