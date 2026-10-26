<?php
/**
 * KWIZY - Base de données (MySQL Hostinger)
 */

// Charge la configuration locale si existante (ignorée par Git)
$localConfig = file_exists(__DIR__ . '/db.local.php') ? require __DIR__ . '/db.local.php' : [];

$host     = getenv('DB_HOST') ?: ($localConfig['host'] ?? 'localhost');
$dbname   = getenv('DB_NAME') ?: ($localConfig['dbname'] ?? 'kwizy_db');
$username = getenv('DB_USER') ?: ($localConfig['username'] ?? 'root');
$password = getenv('DB_PASS') ?: ($localConfig['password'] ?? '');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Auto-migration pour s'assurer que la colonne 'statut' supporte la valeur 'corbeille'
    try {
        $check = $pdo->query("SHOW COLUMNS FROM quizs LIKE 'statut'")->fetch();
        if ($check) {
            $type = strtolower($check['Type']);
            if (strpos($type, 'corbeille') === false && strpos($type, 'varchar') === false) {
                // Modification de la colonne pour accepter 'corbeille' (changement en VARCHAR pour plus de flexibilité)
                $pdo->exec("ALTER TABLE quizs MODIFY COLUMN statut VARCHAR(50) NOT NULL DEFAULT 'brouillon'");
            }
        }

        // Auto-migration pour synchronisation des dossiers profs
        $checkQuizFolders = $pdo->query("SHOW COLUMNS FROM professeurs LIKE 'quiz_folders'")->fetch();
        if (!$checkQuizFolders) {
            $pdo->exec("ALTER TABLE professeurs ADD COLUMN quiz_folders TEXT DEFAULT NULL");
        }
        $checkReportFolders = $pdo->query("SHOW COLUMNS FROM professeurs LIKE 'report_folders'")->fetch();
        if (!$checkReportFolders) {
            $pdo->exec("ALTER TABLE professeurs ADD COLUMN report_folders TEXT DEFAULT NULL");
        }
        $checkSidebarOrder = $pdo->query("SHOW COLUMNS FROM professeurs LIKE 'sidebar_order'")->fetch();
        if (!$checkSidebarOrder) {
            $pdo->exec("ALTER TABLE professeurs ADD COLUMN sidebar_order TEXT DEFAULT NULL");
        }
        $checkQuizSettings = $pdo->query("SHOW COLUMNS FROM quizs LIKE 'settings'")->fetch();
        if (!$checkQuizSettings) {
            $pdo->exec("ALTER TABLE quizs ADD COLUMN settings TEXT DEFAULT NULL");
        }
    } catch (Exception $migrateException) {
        error_log("Database Auto-Migration Error: " . $migrateException->getMessage());
    }
} catch (PDOException $e) {
    // On log l'erreur réelle côté serveur pour le débug mais on ne l'affiche pas à l'utilisateur
    error_log("DB Connection Error: " . $e->getMessage());
    die(json_encode(["success" => false, "message" => "Le serveur de base de données est temporairement inaccessible. Veuillez réessayer plus tard."]));
}
?>
