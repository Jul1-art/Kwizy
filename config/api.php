<?php
/** Shared session and authorization helpers for the Kwizy API. */
declare(strict_types=1);

function kwizy_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    $https = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
    session_name('KWIZYSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function kwizy_json_error(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function kwizy_require_teacher(): int {
    kwizy_start_session();
    $id = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) kwizy_json_error(401, 'Authentification requise.');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '') {
            $originHost = parse_url($origin, PHP_URL_HOST);
            $requestHost = preg_replace('/:\\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
            if (!$originHost || strcasecmp($originHost, $requestHost) !== 0) {
                kwizy_json_error(403, 'Origine de requête refusée.');
            }
        }
    }
    return (int) $id;
}

function kwizy_require_quiz_owner(PDO $pdo, int $quizId, int $teacherId): array {
    $stmt = $pdo->prepare('SELECT * FROM quizs WHERE id = ? AND professeur_id = ? LIMIT 1');
    $stmt->execute([$quizId, $teacherId]);
    $quiz = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$quiz) kwizy_json_error(404, 'Quiz introuvable.');
    return $quiz;
}
