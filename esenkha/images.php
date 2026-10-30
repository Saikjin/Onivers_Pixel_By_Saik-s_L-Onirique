<?php
require __DIR__ . '/requirements.php';
session_start();
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Non autorisé']);
    exit;
}
header('Content-Type: application/json; charset=utf-8');

$allowed = ['jpg','jpeg','png','webp','gif'];
$maxSize = 5 * 1024 * 1024; // 5 Mo
$action  = $_GET['action'] ?? '';

// folder param: 'games' (default) → img/   |   'projects' → img/projects/
$folderKey = $_GET['folder'] ?? 'games';
$imgDir    = $folderKey === 'projects'
    ? __DIR__ . '/img/projects/'
    : __DIR__ . '/img/';

// Create subfolder if needed
if (!is_dir($imgDir)) {
    mkdir($imgDir, 0775, true);
}

/* ── LIST ── */
if ($action === 'list') {
    $files = array_values(array_filter(
        scandir($imgDir) ?: [],
        fn($f) => $f !== '.' && $f !== '..' && in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), $allowed)
    ));
    echo json_encode(['ok'=>true,'files'=>$files]);
    exit;
}

/* ── UPLOAD ── */
if ($action === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_FILES['file'])) {
        echo json_encode(['ok'=>false,'error'=>'Aucun fichier']);
        exit;
    }
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['ok'=>false,'error'=>'Erreur upload ('.$file['error'].')']);
        exit;
    }
    if ($file['size'] > $maxSize) {
        echo json_encode(['ok'=>false,'error'=>'Fichier trop lourd (max 5 Mo)']);
        exit;
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed)) {
        echo json_encode(['ok'=>false,'error'=>'Extension non autorisée']);
        exit;
    }
    $base = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $dest = $imgDir . $base . '.' . $ext;
    $i = 1;
    while (file_exists($dest)) { $dest = $imgDir . $base . '_' . $i++ . '.' . $ext; }

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        echo json_encode(['ok'=>false,'error'=>'Impossible de déplacer le fichier']);
        exit;
    }
    echo json_encode(['ok'=>true,'filename'=>basename($dest)]);
    exit;
}

/* ── DELETE ── */
if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true);
    $filename = basename($body['filename'] ?? '');
    if (!$filename) { echo json_encode(['ok'=>false,'error'=>'Nom manquant']); exit; }

    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed)) { echo json_encode(['ok'=>false,'error'=>'Fichier non autorisé']); exit; }

    $path = $imgDir . $filename;
    if (!file_exists($path)) { echo json_encode(['ok'=>false,'error'=>'Fichier introuvable']); exit; }
    if (!unlink($path))      { echo json_encode(['ok'=>false,'error'=>'Impossible de supprimer']); exit; }

    echo json_encode(['ok'=>true]);
    exit;
}

http_response_code(400);
echo json_encode(['ok'=>false,'error'=>'Action inconnue']);
