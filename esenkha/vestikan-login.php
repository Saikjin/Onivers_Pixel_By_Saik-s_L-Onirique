<?php
/**
 * Démarre le flux « Se connecter avec Vestikan ».
 * Génère le state anti-CSRF et redirige vers l'IdP ; ne revient pas ici.
 * Après authentification, l'utilisateur reviendra sur vestikan-callback.php,
 * qui ouvrira la session puis renverra vers admin.php.
 */
require __DIR__ . '/requirements.php';
require __DIR__ . '/vestikan-sdk.php';

try {
    $vk = new Vestikan(require __DIR__ . '/vestikan-config.php');
} catch (VestikanException $e) {
    // Config absente ou incomplète : on renvoie proprement vers le login.
    header('Location: admin.php?vestikan_error=config');
    exit;
}

// On mémorise la destination post-connexion (l'admin).
$vk->begin('admin.php');
