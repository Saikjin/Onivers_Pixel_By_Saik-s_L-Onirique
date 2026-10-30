<?php
require __DIR__ . '/requirements.php';
header('Content-Type: text/html; charset=utf-8');
$config  = json_decode(file_get_contents(__DIR__.'/config.json'),  true) ?? [];
$verData = json_decode(file_get_contents(__DIR__.'/version.json'), true) ?? [];
$title   = htmlspecialchars($config['site_title']    ?? 'Esenkha');
$sub     = htmlspecialchars($config['site_subtitle'] ?? 'Mes aventures en ligne');
$vCss      = filemtime(__DIR__.'/style.css');
$vJs       = filemtime(__DIR__.'/app.js');
$vGames    = filemtime(__DIR__.'/games.json');
$vProjects = file_exists(__DIR__.'/projects.json') ? filemtime(__DIR__.'/projects.json') : 0;
$vTags     = filemtime(__DIR__.'/tags.json');
$vConfig   = filemtime(__DIR__.'/config.json');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $title ?></title>
  <link rel="stylesheet" href="style.css?v=<?= $vCss ?>">
  <link rel="icon" type="image/x-png" href="esenkha.png">
</head>
<body>

<header>
  <h1 class="site-title" id="site-title"><?= $title ?></h1>
  <p class="site-subtitle" id="site-subtitle"><?= $sub ?></p>
  <div class="header-links" id="header-links">
    <!-- Filled dynamically by app.js from config.custom_links -->
  </div>
  <a href="admin.php" class="admin-link">⚙ Admin</a>
</header>

<div class="tabs" id="tabs"></div>

<div class="content-layout">
  <aside class="tag-filter-panel" id="tag-filter-panel"></aside>
  <main>
    <div class="grid" id="grid">
      <p class="empty">Chargement…</p>
    </div>
  </main>
</div>

<!-- Modal détail -->
<div class="modal-backdrop" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-header">
      <img id="modal-img" src="" alt="">
      <button class="modal-close" onclick="closeModal()" aria-label="Fermer">✕</button>
      <div class="modal-header-info">
        <p id="modal-title" class="modal-title"></p>
        <div id="modal-tags" class="modal-tags"></div>
      </div>
    </div>
    <div class="modal-body">
      <div id="modal-rows"></div>
    </div>
  </div>
</div>

<!-- Modal Liens -->
<div class="modal-backdrop" id="modal-links" onclick="if(event.target===this)closeLinksModal()">
  <div class="modal modal-links-inner" role="dialog" aria-modal="true">
    <div class="modal-head">
      <span class="modal-head-title" id="links-modal-title">Liens</span>
      <button class="modal-x" onclick="closeLinksModal()">✕</button>
    </div>
    <div class="modal-body" id="links-modal-body"></div>
  </div>
</div>

<!-- Footer -->
<footer class="site-footer">
  <a href="https://git.crystalyx.net/Esenjin_Asakha/Esenkha/" target="_blank" rel="noopener" class="footer-version" id="footer-version">v<?= htmlspecialchars($verData['version'] ?? '?') ?></a>
  <?php if ($config['saucenao'] ?? true): ?>
  <span class="footer-sep">·</span>
  <button class="footer-sources-btn" id="footer-sources-btn" onclick="openSourcesModal()">sources</button>
  <?php endif; ?>
</footer>

<!-- Modal Sources -->
<div class="modal-backdrop" id="modal-sources" onclick="if(event.target===this)closeSourcesModal()">
  <div class="modal modal-sources-inner" role="dialog" aria-modal="true">
    <div class="modal-head">
      <span class="modal-head-title">Sources des illustrations</span>
      <button class="modal-x" onclick="closeSourcesModal()">✕</button>
    </div>
    <div class="modal-body" id="sources-body">
      <p style="color:var(--text-muted);font-size:0.83rem;">Chargement…</p>
    </div>
  </div>
</div>

<button class="scroll-top" id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Retour en haut">↑</button>
<script>
  const JSON_V = {
    games:    '<?= $vGames ?>',
    projects: '<?= $vProjects ?>',
    tags:     '<?= $vTags ?>',
    config:   '<?= $vConfig ?>'
  };
</script>
<script src="app.js?v=<?= $vJs ?>"></script>
</body>
</html>
