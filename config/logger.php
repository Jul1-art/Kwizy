<?php
/**
 * KWIZY - Logger Utility
 * Centralise l'écriture des logs personnalisés pour l'application.
 */

/**
 * Log centralisé
 */
function kwizy_log($type, $message, $context = []) {
    $logDir = __DIR__ . '/../logs/';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }

    $filename = 'errors.log';
    switch ($type) {
        case 'cheating': $filename = 'cheating.log'; break;
        case 'ai':       $filename = 'ai.log'; break;
        case 'access':   $filename = 'access.log'; break;
        case 'error':    $filename = 'errors.log'; break;
        default:         $filename = 'general.log'; break;
    }

    $path = $logDir . $filename;
    $date = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' | Context: ' . json_encode($context) : '';
    $formattedMessage = "[$date] $message$contextStr" . PHP_EOL;

    file_put_contents($path, $formattedMessage, FILE_APPEND);
}

/**
 * Raccourci pour logger une tentative de triche
 */
function kwizy_cheating_report($studentName, $quizTitle) {
    kwizy_log('cheating', "CHEAT DETECTED: $studentName", [
        'student' => $studentName,
        'quiz' => $quizTitle,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
}

/**
 * Raccourci pour logger un appel IA
 */
function kwizy_ai_call($action, $tokens = 0) {
    kwizy_log('ai', "AI CALL: $action", [
        'action' => $action,
        'tokens' => $tokens,
        'ts' => time()
    ]);
}
?>
