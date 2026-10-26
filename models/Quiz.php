<?php
/**
 * KWIZY - Modèle Quiz
 */
class Quiz {
    private static $table = 'quizzes';

    public static function getAllByProf($profId) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT * FROM " . self::$table . " WHERE professeur_id = ? ORDER BY created_at DESC");
        $stmt->execute([$profId]);
        return $stmt->fetchAll();
    }

    public static function findByCode($code) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT * FROM " . self::$table . " WHERE share_code = ?");
        $stmt->execute([$code]);
        return $stmt->fetch();
    }

    public static function create($profId, $title, $questions, $shareCode) {
        global $pdo;
        $stmt = $pdo->prepare("INSERT INTO " . self::$table . " (professeur_id, title, questions, share_code) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$profId, $title, json_encode($questions), $shareCode]);
    }

    public static function update($id, $title, $questions) {
        global $pdo;
        $stmt = $pdo->prepare("UPDATE " . self::$table . " SET title = ?, questions = ? WHERE id = ?");
        return $stmt->execute([$title, json_encode($questions), $id]);
    }

    public static function delete($id) {
        global $pdo;
        $stmt = $pdo->prepare("DELETE FROM " . self::$table . " WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
?>
