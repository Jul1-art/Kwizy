<?php
/**
 * KWIZY - Modèle Session Élève
 */
class Session {
    private static $table = 'sessions_eleves';

    public static function join($quizId, $studentId, $name, $class) {
        global $pdo;
        $stmt = $pdo->prepare("INSERT INTO " . self::$table . " (quiz_id, student_id, nom_eleve, student_class) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$quizId, $studentId, $name, $class]);
    }

    public static function updateStatus($studentId, $quizId, $status, $currentQ = 0) {
        global $pdo;
        $stmt = $pdo->prepare("UPDATE " . self::$table . " SET statut = ?, current_question = ?, last_seen = NOW() WHERE student_id = ? AND quiz_id = ?");
        return $stmt->execute([$status, $currentQ, $studentId, $quizId]);
    }

    public static function lock($studentId, $quizId, $reason) {
        global $pdo;
        $stmt = $pdo->prepare("UPDATE " . self::$table . " SET is_locked = 1, cheat_log = JSON_ARRAY_APPEND(IFNULL(cheat_log, '[]'), '$', ?) WHERE student_id = ? AND quiz_id = ?");
        return $stmt->execute([$reason, $studentId, $quizId]);
    }

    public static function unlock($studentId, $quizId) {
        global $pdo;
        $stmt = $pdo->prepare("UPDATE " . self::$table . " SET is_locked = 0 WHERE student_id = ? AND quiz_id = ?");
        return $stmt->execute([$studentId, $quizId]);
    }

    public static function getActiveStudents($quizId) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT * FROM " . self::$table . " WHERE quiz_id = ? AND statut != 'termine'");
        $stmt->execute([$quizId]);
        return $stmt->fetchAll();
    }
}
?>
