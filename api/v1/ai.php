<?php
/**
 * KWIZY AI - Mistral Backend Proxy V2
 * Sécurisé, gère les CORS, les erreurs d'API, et masque la clé privée.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Récupération de la clé API Mistral :
// 1. Depuis l'en-tête de requête 'X-Mistral-Key' (clé personnelle configurée par l'enseignant)
// 2. Depuis les variables d'environnement du serveur
// 3. Depuis le fichier config/db.local.php (non versionné)
$headers = getallheaders();
$userApiKey = $headers['X-Mistral-Key'] ?? ($headers['x-mistral-key'] ?? '');

$localConfig = file_exists(__DIR__ . '/../../config/db.local.php') ? require __DIR__ . '/../../config/db.local.php' : [];
$apiKey = !empty($userApiKey) ? $userApiKey : (getenv('MISTRAL_API_KEY') ?: ($localConfig['mistral_api_key'] ?? ''));

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => 'Clé API Mistral non configurée. Veuillez renseigner votre clé dans les Paramètres du compte.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Requête invalide.']);
    exit;
}

$action = $input['action'] ?? 'quiz_generation';
$systemMessage = "";
$userPrompt = "";
$responseFormat = null;
$messages = null;

if ($action === 'quiz_generation') {
    if (empty($input['prompt'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Prompt manquant pour la génération.']);
        exit;
    }
    $systemMessage = "Tu es Kwizy AI, un expert en ingénierie pédagogique. Tu dois TOUJOURS répondre uniquement avec un objet JSON valide, sans markdown, sans texte avant ou après.
Format strict attendu :
{
  \"title\": \"Titre généré\",
  \"description\": \"Description courte du quiz\",
  \"questions\": [
    {
      \"text\": \"Intitulé de la question\",
      \"options\": [
        {\"text\": \"Bonne réponse\", \"isCorrect\": true},
        {\"text\": \"Mauvaise réponse 1\", \"isCorrect\": false},
        {\"text\": \"Mauvaise réponse 2\", \"isCorrect\": false},
        {\"text\": \"Mauvaise réponse 3\", \"isCorrect\": false}
      ]
    }
  ]
}";
    $userPrompt = $input['prompt'];
    $responseFormat = ['type' => 'json_object'];

} elseif ($action === 'quiz_analysis') {
    $systemMessage = "Tu es Kwizy AI, un expert pédagogique. Fais une analyse globale des résultats d'un quiz. Réponds directement en HTML avec une structure propre (utilisation de <h4>, <ul>, <p>, <strong>). Ne mets pas de balise html ou body. Sois constructif, concis et précis.";
    $stats = json_encode($input['questionsStats'] ?? []);
    $userPrompt = "Titre du quiz : {$input['quizTitle']}\n"
                . "Nombre d'élèves : {$input['studentsCount']}\n"
                . "Moyenne : {$input['average']}/20\n"
                . "Stats des questions : {$stats}\n"
                . "Génère une analyse des points forts, points faibles et recommandations pédagogiques.";
} elseif ($action === 'student_analysis') {
    $systemMessage = "Tu es Kwizy AI, un expert pédagogique. Fais une analyse des erreurs d'un élève spécifique. Réponds directement en HTML avec une structure propre (utilisation de <h4>, <ul>, <p>, <strong>). Ne mets pas de balise html ou body. Sois encourageant et donne des conseils ciblés.";
    $answers = json_encode($input['answers'] ?? []);
    $userPrompt = "Élève : {$input['studentName']}\n"
                . "Score : {$input['score']}/{$input['total']}\n"
                . "Réponses : {$answers}\n"
                . "Analyse ce que l'élève a raté et donne 2 ou 3 conseils concrets de révision.";
} elseif ($action === 'report_chat') {
    if (empty($input['question'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Question manquante.']);
        exit;
    }
    $context = (string)($input['context'] ?? '');
    $history = is_array($input['history'] ?? null) ? array_slice($input['history'], -8) : [];
    $systemMessage = "Tu es Kwizy AI, assistant pedagogique pour professeurs. Tu aides a analyser les resultats d'un quiz Kwizy. Tu as acces au contexte fourni : quiz, questions, reponses, scores et copies d'eleves. Reponds en francais, clairement, avec des conseils actionnables. Si une information n'est pas dans le contexte, dis-le au lieu d'inventer. Reste concis sauf si le professeur demande un detail.";
    $messages = [
        ['role' => 'system', 'content' => $systemMessage],
        ['role' => 'user', 'content' => "Contexte du quiz et des copies :\n" . $context]
    ];
    foreach ($history as $item) {
        $role = (($item['role'] ?? '') === 'assistant') ? 'assistant' : 'user';
        $content = trim((string)($item['content'] ?? ''));
        if ($content !== '') {
            $messages[] = ['role' => $role, 'content' => substr($content, 0, 2500)];
        }
    }
    $messages[] = ['role' => 'user', 'content' => trim((string)$input['question'])];
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Action inconnue.']);
    exit;
}

$requestBody = [
    'model' => 'mistral-small-latest',
    'messages' => $messages ?: [
        ['role' => 'system', 'content' => $systemMessage],
        ['role' => 'user', 'content' => $userPrompt]
    ],
    'temperature' => 0.7
];

if ($responseFormat) {
    $requestBody['response_format'] = $responseFormat;
}

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
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode ?: 500);
    echo json_encode([
        'error' => 'Erreur de communication avec Mistral AI.',
        'details' => $curlError ?: "Code HTTP $httpCode",
        'raw' => $response
    ]);
    exit;
}

$mistralData = json_decode($response, true);
$content = $mistralData['choices'][0]['message']['content'] ?? '';

if ($action === 'quiz_generation') {
    $content = preg_replace('/^```json\s*/i', '', $content);
    $content = preg_replace('/```\s*$/i', '', $content);
    $content = trim($content);
    $quizData = json_decode($content, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode(['error' => 'L\'IA a généré un format invalide.', 'raw_content' => $content]);
        exit;
    }
    echo json_encode(['success' => true, 'data' => $quizData]);
} else {
    // Pour l'analyse, on renvoie directement le contenu HTML
    echo json_encode(['success' => true, 'content' => $content]);
}
