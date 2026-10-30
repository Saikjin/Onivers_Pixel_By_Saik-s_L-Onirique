<?php
/**
 * Vérification de la version de PHP — Esenkha requiert PHP 8.5 ou supérieur.
 *
 * Inclus en tout premier par chaque point d'entrée (pages et endpoints).
 * Ce fichier n'utilise volontairement qu'une syntaxe compatible avec les
 * anciennes versions de PHP, afin d'afficher un message clair plutôt
 * qu'une erreur fatale obscure sur un hébergement trop ancien.
 */
if (PHP_VERSION_ID < 80500) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Esenkha nécessite PHP 8.5 ou supérieur (version détectée : ' . PHP_VERSION . ').';
    exit;
}
