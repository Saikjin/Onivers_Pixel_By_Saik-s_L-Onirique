<?php
require __DIR__ . '/requirements.php';
session_start();
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Non autorisé']);
    exit;
}
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok'=>false,'error'=>'Method not allowed']);
    exit;
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'JSON invalide']);
    exit;
}

$type = $body['type'] ?? '';
$data = $body['data'] ?? null;

$files = [
    'games'    => __DIR__ . '/games.json',
    'projects' => __DIR__ . '/projects.json',
    'tags'     => __DIR__ . '/tags.json',
    'config'   => __DIR__ . '/config.json',
    'version'  => __DIR__ . '/version.json',
];

if (!isset($files[$type])) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'Type inconnu']);
    exit;
}

$result = file_put_contents($files[$type], json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Impossible d\'écrire le fichier']);
    exit;
}

echo json_encode(['ok'=>true]);
