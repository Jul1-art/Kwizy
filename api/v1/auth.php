<?php
session_start();
/**
 * KWIZY - Auth API (professeurs/)
 * Gère : register, login, update_account, delete_account, logout, upload_image
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php';
require_once '../../models/User.php';

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?? $_POST;

$action = $_GET['action'] ?? $data['action'] ?? '';

try {
    if ($action === 'register') {
        $nom      = trim($data['nom'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = $data['mot_de_passe'] ?? '';

        if (empty($nom) || empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis.']);
            exit;
        }

        if (User::findByEmail($email)) {
            echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé.']);
            exit;
        }

        if (User::create($nom, $email, $password)) {
            $user = User::findByEmail($email);
            $_SESSION['user_id']  = $user['id'];
            $_SESSION['user_nom'] = $user['nom'];

            echo json_encode([
                'success' => true,
                'message' => 'Inscription réussie.',
                'user'    => [
                    'id' => $user['id'], 
                    'nom' => $user['nom'], 
                    'email' => $user['email'],
                    'quizFolders' => isset($user['quiz_folders']) && $user['quiz_folders'] ? json_decode($user['quiz_folders'], true) : [],
                    'reportFolders' => isset($user['report_folders']) && $user['report_folders'] ? json_decode($user['report_folders'], true) : [],
                    'sidebarOrder' => isset($user['sidebar_order']) && $user['sidebar_order'] ? json_decode($user['sidebar_order'], true) : []
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => "Erreur lors de l'inscription."]);
        }
        exit;
    }

    if ($action === 'login') {
        $email    = trim($data['email'] ?? '');
        $password = $data['mot_de_passe'] ?? '';

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Email et mot de passe requis.']);
            exit;
        }

        $user = User::findByEmail($email);

        if ($user && password_verify($password, $user['mot_de_passe'])) {
            $_SESSION['user_id']  = $user['id'];
            $_SESSION['user_nom'] = $user['nom'];
            echo json_encode([
                'success' => true,
                'message' => 'Connexion réussie.',
                'user'    => [
                    'id'       => $user['id'],
                    'name'     => $user['nom'],
                    'nom'      => $user['nom'],
                    'nickname' => $user['nickname'] ?? '',
                    'email'    => $user['email'],
                    'quizFolders'   => isset($user['quiz_folders'])   && $user['quiz_folders']   ? json_decode($user['quiz_folders'],   true) : [],
                    'reportFolders' => isset($user['report_folders']) && $user['report_folders'] ? json_decode($user['report_folders'], true) : [],
                    'sidebarOrder'  => isset($user['sidebar_order'])  && $user['sidebar_order']  ? json_decode($user['sidebar_order'],  true) : []
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Identifiants incorrects.']);
        }
        exit;
    }

    if ($action === 'update_account') {
        $id            = $data['id']          ?? null;
        $nom           = trim($data['name']   ?? '');
        $email         = trim($data['email']  ?? '');
        $nickname      = trim($data['nickname'] ?? '');
        $newPassword   = $data['newPassword'] ?? '';
        $quizFolders   = isset($data['quizFolders'])   ? json_encode($data['quizFolders'])   : null;
        $reportFolders = isset($data['reportFolders']) ? json_encode($data['reportFolders']) : null;
        $sidebarOrder  = isset($data['sidebarOrder'])  ? json_encode($data['sidebarOrder'])  : null;

        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID manquant.']);
            exit;
        }

        $existing = User::findById($id);
        if (!$existing) {
            echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable.']);
            exit;
        }
        if (empty($nom))      $nom      = $existing['nom'];
        if (empty($email))    $email    = $existing['email'];
        if ($nickname === '') $nickname = $existing['nickname'] ?? '';
        if (!isset($data['quizFolders']))   $quizFolders   = $existing['quiz_folders'];
        if (!isset($data['reportFolders'])) $reportFolders = $existing['report_folders'];
        if (!isset($data['sidebarOrder']))  $sidebarOrder  = $existing['sidebar_order'];

        if (User::update($id, $nom, $email, $nickname, !empty($newPassword) ? $newPassword : null, $quizFolders, $reportFolders, $sidebarOrder)) {
            echo json_encode([
                'success' => true,
                'message' => 'Compte mis à jour.',
                'user'    => ['name' => $nom, 'nickname' => $nickname, 'email' => $email]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour.']);
        }
        exit;
    }

    if ($action === 'delete_account') {
        $id = $data['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID manquant.']);
            exit;
        }
        if (User::delete($id)) {
            echo json_encode(['success' => true, 'message' => 'Compte supprimé.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression.']);
        }
        exit;
    }

    if ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Déconnexion réussie.']);
        exit;
    }

    if ($action === 'get_account') {
        $id = $_GET['id'] ?? $data['id'] ?? $_SESSION['user_id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID manquant.']);
            exit;
        }
        $user = User::findById($id);
        if ($user) {
            echo json_encode([
                'success' => true,
                'user'    => [
                    'id'       => $user['id'],
                    'name'     => $user['nom'],
                    'nom'      => $user['nom'],
                    'nickname' => $user['nickname'] ?? '',
                    'email'    => $user['email'],
                    'quizFolders'   => isset($user['quiz_folders'])   && $user['quiz_folders']   ? json_decode($user['quiz_folders'],   true) : [],
                    'reportFolders' => isset($user['report_folders']) && $user['report_folders'] ? json_decode($user['report_folders'], true) : [],
                    'sidebarOrder'  => isset($user['sidebar_order'])  && $user['sidebar_order']  ? json_decode($user['sidebar_order'],  true) : []
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable.']);
        }
        exit;
    }

    if ($action === 'upload_image') {
        echo json_encode(['success' => true, 'imageUrl' => 'dummy_url.png']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Action non reconnue.']);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Auth Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur imprévue est survenue.']);
}
?>
