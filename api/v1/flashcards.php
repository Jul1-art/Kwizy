<?php
/**
 * KWIZY AI - Mistral Backend for Flashcards
 */
header('Content-Type: application/json; charset=utf-8');

$headers = getallheaders();
$userApiKey = $headers['X-Mistral-Key'] ?? ($headers['x-mistral-key'] ?? '');

$localConfig = file_exists(__DIR__ . '/../../config/db.local.php') ? require __DIR__ . '/../../config/db.local.php' : [];
$apiKey = !empty($userApiKey) ? $userApiKey : (getenv('MISTRAL_API_KEY') ?: ($localConfig['mistral_api_key'] ?? ''));

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => 'Clé API Mistral non configurée.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$topic = $input['topic'] ?? 'Culture générale';
$questionsContext = '';
if (!empty($input['questions']) && is_array($input['questions'])) {
    $questionsContext = implode("\n", array_slice($input['questions'], 0, 30)); // max 30 questions
}

$systemMessage = "Tu es Kwizy AI. Tu dois TOUJOURS répondre uniquement avec un objet JSON valide, sans markdown.
Génère 20 'flashcards' (faits intéressants, anecdotes, ou concepts clés) sur le sujet: '$topic'.
Voici les questions du quiz qui vont être posées (sans les réponses) pour t'inspirer :\n$questionsContext\n
Règles strictes :
1. Les infos doivent aider à apprendre ou réviser le sujet global.
2. NE DONNE PAS les réponses directes aux questions de façon évidente (sauf pour 2 ou 3 questions maximum où tu peux donner la réponse sous forme de fait intéressant).
3. Ne cite pas le fait que ce soit un quiz ou des questions, donne juste les informations.
4. Les flashcards doivent être courtes (1 à 2 phrases max).

Format strict attendu :
{
  \"flashcards\": [
    \"Fait intéressant 1\",
    \"Fait intéressant 2\",
    ... jusqu'à 20
  ]
}";

$requestBody = [
    'model' => 'mistral-small-latest',
    'messages' => [
        ['role' => 'system', 'content' => $systemMessage]
    ],
    'response_format' => ['type' => 'json_object'],
    'temperature' => 0.7
];

$ch = curl_init('https://api.mistral.ai/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode ?: 500);
    echo json_encode(['error' => 'Erreur Mistral.']);
    exit;
}

$mistralData = json_decode($response, true);
$content = $mistralData['choices'][0]['message']['content'] ?? '';
$content = preg_replace('/^```json\s*/i', '', $content);
$content = preg_replace('/```\s*$/i', '', $content);

echo $content;
