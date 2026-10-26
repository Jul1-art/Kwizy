<?php
/**
 * KWIZY - Runtime Configuration
 * Retourne la configuration temps réel pour le frontend.
 * Pour activer Pusher, remplissez les champs ci-dessous.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'realtime' => [
        'enabled'  => false,
        'provider' => 'pusher',
        'pusher'   => [
            'key'     => '',
            'cluster' => 'eu'
        ]
    ]
]);
