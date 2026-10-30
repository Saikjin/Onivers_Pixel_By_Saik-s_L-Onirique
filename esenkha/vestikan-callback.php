<?php
/**
 * Page de callback Vestikan (redirect_uri).
 *
 * Pattern A — Esenkha n'a pas de comptes locaux : l'accès admin est protégé
 * par un simple mot de passe. Une identité Vestikan validée suffit donc à
 * ouvrir l'accès. C'est légitime car Vestikan est MONO-UTILISATEUR : le seul
 * vestikan_id possible est celui du maître.
 *
 * On ouvre l'accès en posant EXACTEMENT le même flag de session que le login
 * par mot de passe (admin.php) : $_SESSION['logged_in'] = true. Ainsi save.php,
 * images.php et save_password.php fonctionnent sans aucune modification.
 */
require __DIR__ . '/requirements.php';
require __DIR__ . '/vestikan-sdk.php';

$vk = new Vestikan(require __DIR__ . '/vestikan-config.php');

try {
    $vestikanId = $vk->complete();   // lève VestikanException si le flux échoue
} catch (VestikanException $e) {
    // Échec du flux → traité comme un refus d'authentification.
    // On journalise le détail et on renvoie vers l'écran de login.
    error_log('[Esenkha] Vestikan complete() a échoué : ' . $e->getMessage());
    header('Location: admin.php?vestikan_error=denied');
    exit;
}

// Identité maître prouvée : on ouvre l'accès admin.
// (Le SDK a déjà démarré la session ; on s'en assure malgré tout.)
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
session_regenerate_id(true);            // durcissement anti-fixation de session
$_SESSION['logged_in']   = true;        // flag attendu par tout Esenkha
$_SESSION['vestikan_id'] = $vestikanId; // informatif (traçabilité)

// Redirige vers la destination mémorisée dans begin() (admin.php par défaut).
$dest = $vk->popReturnTo() ?: 'admin.php';

// Garde-fou : on n'autorise qu'une redirection interne relative.
if (!preg_match('#^[A-Za-z0-9_./?=&-]+$#', $dest) || str_contains($dest, '://')) {
    $dest = 'admin.php';
}

header('Location: ' . $dest);
exit;
