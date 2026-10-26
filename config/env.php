<?php
/**
 * KWIZY - Runtime Config
 * Fournit la configuration temps-réel au frontend.
 * Pusher désactivé (clés placeholder non configurées).
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'realtime' => [
        'enabled'  => false,
        'provider' => 'none',
        'pusher'   => [
            'key'     => '',
            'cluster' => 'eu'
        ]
    ]
]);
?>
