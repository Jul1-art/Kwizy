<?php
// KWIZY - API Router
// Reçoit toutes les requêtes API et les dirige vers la bonne version/contrôleur

$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Analyse de l'URI pour trouver la version et l'endpoint
// Format attendu : /api/v1/endpoint
if (preg_match('/\/api\/v1\/([a-zA-Z0-9_]+)/', $requestUri, $matches)) {
    $endpoint = $matches[1];
    $targetFile = __DIR__ . '/v1/' . $endpoint . '.php';

    if (file_exists($targetFile)) {
        require_once $targetFile;
    } else {
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found', 'path' => $targetFile]);
    }
} else {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid API request']);
}
