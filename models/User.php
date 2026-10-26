<?php
/**
 * KWIZY - Modèle Professeur
 */
class User {
    private static $table = 'professeurs';

    public static function create($nom, $email, $password) {
        global $pdo;
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO " . self::$table . " (nom, email, mot_de_passe) VALUES (?, ?, ?)");
        return $stmt->execute([$nom, $email, $hashed]);
    }

    public static function findByEmail($email) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT * FROM " . self::$table . " WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public static function findById($id) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT * FROM " . self::$table . " WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public static function update($id, $nom, $email, $nickname = null, $password = null, $quizFolders = null, $reportFolders = null, $sidebarOrder = null) {
        global $pdo;

        $sql = "UPDATE " . self::$table . " SET nom = ?, email = ?, quiz_folders = ?, report_folders = ?, sidebar_order = ?";
        $params = [$nom, $email, $quizFolders, $reportFolders, $sidebarOrder];

        if ($nickname !== null && $nickname !== '') {
            $sql .= ", nickname = ?";
            $params[] = $nickname;
        }

        if ($password) {
            $sql .= ", mot_de_passe = ?";
            $params[] = password_hash($password, PASSWORD_DEFAULT);
        }

        $sql .= " WHERE id = ?";
        $params[] = $id;

        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public static function delete($id) {
        global $pdo;
        $stmt = $pdo->prepare("DELETE FROM " . self::$table . " WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
?>
