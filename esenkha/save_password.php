<?php
require __DIR__ . '/requirements.php';
session_start();
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Non autorisé']);
    exit;
}
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON invalide']);
    exit;
}

$current = $body['current'] ?? '';
$new     = $body['new']     ?? '';

if (strlen($new) < 6) {
    echo json_encode(['ok' => false, 'error' => 'Le mot de passe doit faire au moins 6 caractères.']);
    exit;
}

$passFile = __DIR__ . '/pass.json';
$passData = json_decode(file_get_contents($passFile), true) ?? [];
$storedHash = $passData['hash'] ?? '';

if (!password_verify($current, $storedHash)) {
    echo json_encode(['ok' => false, 'error' => 'Mot de passe actuel incorrect.']);
    exit;
}

$newHash = password_hash($new, PASSWORD_DEFAULT);
$result  = file_put_contents($passFile, json_encode(['hash' => $newHash], JSON_PRETTY_PRINT));

if ($result === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Impossible d\'écrire le fichier.']);
    exit;
}

echo json_encode(['ok' => true]);