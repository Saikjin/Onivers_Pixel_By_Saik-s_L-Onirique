<?php
require __DIR__ . '/requirements.php';
session_start();
$passFile = __DIR__ . '/pass.json';
$passData = json_decode(file_get_contents($passFile), true) ?? [];
$valid_password_hash = $passData['hash'] ?? '';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    if (isset($_POST['password']) && password_verify($_POST['password'], $valid_password_hash)) {
        $_SESSION['logged_in'] = true;
    } else {
        $error = isset($_POST['password']) ? 'Mot de passe incorrect.' : '';
        if (isset($_GET['vestikan_error'])) {
            $error = $_GET['vestikan_error'] === 'config'
                ? 'Vestikan est mal configuré (voir vestikan-config.php).'
                : 'Connexion Vestikan refusée.';
        }
        $vestikanAvailable = is_file(__DIR__ . '/vestikan-config.php')
            && is_file(__DIR__ . '/vestikan-login.php');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion — Esenkha</title>
  <link rel="stylesheet" href="admin.css">
</head>
<body>
<div class="login-wrap">
  <div class="login-box">
    <p class="login-title">Esenkha</p>
    <form method="post" style="display:flex;flex-direction:column;gap:0.9rem;">
      <div>
        <label for="password">Mot de passe</label>
        <input type="password" id="password" name="password" required autofocus style="margin-top:0.4rem;">
      </div>
      <?php if ($error): ?><p class="login-error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
      <button type="submit" class="btn btn-primary" style="margin-top:0.25rem;width:100%;justify-content:center;">Se connecter</button>
    </form>
    <?php if (!empty($vestikanAvailable)): ?>
    <div class="login-sep"><span>ou</span></div>
    <a href="vestikan-login.php" class="btn btn-vestikan" style="width:100%;justify-content:center;">
      Se connecter avec Vestikan
    </a>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
<?php
        exit;
    }
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: admin.php");
    exit;
}
$vCss = filemtime(__DIR__.'/admin.css');
$vJs  = filemtime(__DIR__.'/admin.js');
$verData = json_decode(file_get_contents(__DIR__.'/version.json'), true) ?? [];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Esenkha</title>
  <link rel="stylesheet" href="admin.css?v=<?= $vCss ?>">
  <link rel="icon" type="image/x-png" href="esenkha.png">
</head>
<body>

<button class="hamburger" onclick="toggleSidebar()" aria-label="Menu">
  <span></span><span></span><span></span>
</button>
<div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleSidebar()"></div>

<div class="admin-layout">

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <p class="sidebar-title">Esenkha</p>
      <p class="sidebar-sub">Administration</p>
    </div>
    <nav class="sidebar-nav">
      <a href="index.php" class="sidebar-link"><span class="icon">←</span> Voir le site</a>
      <button class="sidebar-link" onclick="openOptions()"><span class="icon">⚙</span> Options du site</button>
      <button class="sidebar-link" onclick="openTagsModal()"><span class="icon">🏷</span> Gérer les tags</button>
      <button class="sidebar-link" onclick="openImagesModal(currentMode())"><span class="icon">🖼</span> Bibliothèque images</button>
      <button class="sidebar-link" onclick="openPasswordModal()"><span class="icon">۹</span> Changer le mot de passe</button>
      <a href="?logout=1" class="sidebar-link" style="margin-top:auto;"><span class="icon">↩</span> Déconnexion</a>
    </nav>
    <a href="https://git.crystalyx.net/Esenjin_Asakha/Esenkha/" target="_blank" style="font-size:0.7rem;color:var(--text-muted);letter-spacing:0.06em;text-decoration:none;">
      <p id="sidebar-version" style="font-size:0.7rem;color:var(--text-muted);letter-spacing:0.06em;padding-top:1rem;border-top:1px solid var(--border);">v<?= htmlspecialchars($verData['version'] ?? '?') ?></p>
    </a>
  </aside>

  <div class="admin-main">
    <section>
      <div class="section-header">
        <h2 class="section-title" id="section-title-text">Jeux</h2>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <div id="filter-tags" style="display:flex;gap:0.35rem;flex-wrap:wrap;"></div>
          <button class="btn btn-primary" onclick="openAddModal()">+ Ajouter</button>
        </div>
      </div>
      <div class="game-list" id="game-list"></div>
    </section>
  </div>
</div>

<!-- ── Modal : Options ── -->
<div class="modal-backdrop" id="modal-options" onclick="if(event.target===this)closeOptions()">
  <div class="modal modal-opts">
    <div class="modal-head">
      <span class="modal-head-title">Options du site</span>
      <button class="modal-x" onclick="closeOptions()">✕</button>
    </div>
    <form id="form-options">
      <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label for="opt-title">Titre du site</label>
          <input type="text" id="opt-title" placeholder="Esenkha">
        </div>
        <div class="form-group">
          <label for="opt-subtitle">Sous-titre</label>
          <input type="text" id="opt-subtitle" placeholder="Mes aventures en ligne">
        </div>
        <div class="form-group">
          <label for="opt-mode">Mode d'affichage</label>
          <select id="opt-mode">
            <option value="games">🎮 Présenter mes jeux</option>
            <option value="projects">💻 Présenter mes projets</option>
          </select>
        </div>
        <div class="form-group">
          <label for="opt-card-ratio">Format des cartes</label>
          <select id="opt-card-ratio">
            <option value="3/4">Portrait (3/4)</option>
            <option value="1/1">Carré (1/1)</option>
            <option value="4/3">Paysage (4/3)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Liens personnalisés</label>
          <div id="opt-links-list" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.5rem;"></div>
          <div style="display:flex;gap:0.5rem;">
            <input type="text" id="opt-new-link-label" placeholder="Label" style="flex:1">
            <input type="text" id="opt-new-link-url"   placeholder="https://…"  style="flex:2">
            <button type="button" class="btn btn-primary btn-sm" onclick="addCustomLink()">+</button>
          </div>
          <span class="form-hint">Un seul lien = bouton direct. Plusieurs = bouton « Liens » + modale.</span>
        </div>
        <div class="form-group">
          <label for="opt-baseurl">URL de base du site</label>
          <input type="text" id="opt-baseurl" placeholder="https://example.com/esenkha">
          <span class="form-hint">Utilisée pour les recherches SauceNAO (sans slash final)</span>
        </div>
        <label class="opt-toggle-row">
          <span>Activer SauceNAO (bouton « sources » dans le footer)</span>
          <input type="checkbox" id="opt-saucenao" role="switch">
        </label>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" onclick="closeOptions()">Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  </div>
</div>

<!-- ── Modal : Tags ── -->
<div class="modal-backdrop" id="modal-tags" onclick="if(event.target===this)closeTagsModal()">
  <div class="modal modal-tags-mgr">
    <div class="modal-head">
      <span class="modal-head-title">Gérer les tags</span>
      <button class="modal-x" onclick="closeTagsModal()">✕</button>
    </div>
    <!-- Body is fully rendered by renderTagsModal() in admin.js -->
    <div class="modal-body" id="tags-modal-body"></div>
    <div class="modal-foot">
      <button type="button" class="btn btn-ghost" onclick="closeTagsModal()">Annuler</button>
      <button type="button" class="btn btn-primary" onclick="saveTagsAndClose()">Enregistrer</button>
    </div>
  </div>
</div>

<!-- ── Modal : Images ── -->
<div class="modal-backdrop" id="modal-images" onclick="if(event.target===this)closeImagesModal()">
  <div class="modal modal-images">
    <div class="modal-head">
      <span class="modal-head-title">Bibliothèque d'images</span>
      <button class="modal-x" onclick="closeImagesModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="img-upload-zone" id="upload-zone">
        <input type="file" id="upload-input" accept="image/*" multiple>
        <div class="upload-idle">
          <p>Glissez vos images ici ou <strong>cliquez pour parcourir</strong></p>
          <p style="font-size:0.72rem;margin-top:0.3rem;">jpg, png, webp, gif — max 5 Mo</p>
        </div>
        <div class="upload-busy" aria-live="polite">
          <span class="upload-spinner"></span>
          <span>Téléversement en cours…</span>
          <span id="upload-progress" style="font-weight:600;"></span>
        </div>
      </div>
      <div id="img-bulk-bar" style="display:none;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;"></div>
      <div class="img-grid" id="img-modal-grid"></div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-ghost" onclick="closeImagesModal()">Fermer</button>
    </div>
  </div>
</div>

<!-- ── Modal : Mot de passe ── -->
<div class="modal-backdrop" id="modal-password" onclick="if(event.target===this)closePasswordModal()">
  <div class="modal modal-opts">
    <div class="modal-head">
      <span class="modal-head-title">Changer le mot de passe</span>
      <button class="modal-x" onclick="closePasswordModal()">✕</button>
    </div>
    <form id="form-password">
      <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label for="pwd-current">Mot de passe actuel</label>
          <input type="password" id="pwd-current" required autocomplete="current-password">
        </div>
        <div class="form-group">
          <label for="pwd-new">Nouveau mot de passe</label>
          <input type="password" id="pwd-new" required minlength="6" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label for="pwd-confirm">Confirmer le nouveau mot de passe</label>
          <input type="password" id="pwd-confirm" required autocomplete="new-password">
        </div>
        <p id="pwd-error" style="font-size:0.8rem;color:var(--danger);display:none;"></p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" onclick="closePasswordModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  </div>
</div>

<!-- ── Modal : Formulaire (jeu + projet) ── -->
<div class="modal-backdrop" id="modal-game" onclick="if(event.target===this)closeGameModal()">
  <div class="modal modal-game-form">
    <div class="modal-head">
      <span class="modal-head-title" id="form-title">Ajouter</span>
      <button class="modal-x" onclick="closeGameModal()">✕</button>
    </div>
    <div class="modal-body">

      <!-- ── Formulaire Jeux ── -->
      <div id="form-games">
        <form id="game-form">
          <div class="form-grid">

            <div class="form-group full">
              <label for="f-name">Nom du jeu *</label>
              <input type="text" id="f-name" required placeholder="Final Fantasy XIV">
            </div>

            <div class="form-group">
              <label for="f-tag-type">Tag type</label>
              <select id="f-tag-type"></select>
            </div>

            <div class="form-group">
              <label for="f-tag-status">Tag statut</label>
              <select id="f-tag-status"></select>
            </div>

            <div class="form-group full">
              <label>Tags supplémentaires</label>
              <div id="f-tag-others-wrap" style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.3rem;"></div>
            </div>

            <div class="form-group full">
              <label>Illustration</label>
              <div class="img-source-tabs">
                <button type="button" class="img-source-tab active" data-src="url"    onclick="switchImgSource('url')">Lien URL</button>
                <button type="button" class="img-source-tab"        data-src="folder" onclick="switchImgSource('folder')">Dossier img/</button>
              </div>
              <div id="img-src-url">
                <input type="text" id="f-image" placeholder="https://… ou img/nom.jpg">
                <span class="form-hint">URL distante ou chemin local (img/nom.jpg)</span>
              </div>
              <div id="img-src-folder" style="display:none;">
                <button type="button" class="btn btn-ghost" style="width:100%;justify-content:center;" onclick="openImagesModal('games')">
                  Choisir depuis la bibliothèque…
                </button>
              </div>
              <div style="display:flex;gap:0.75rem;margin-top:0.75rem;align-items:flex-start;">
                <div style="flex-shrink:0;">
                  <p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.3rem;">Carte</p>
                  <div class="img-preview-wrap" id="img-preview-wrap-card" style="width:92px;">
                    <div id="img-preview-card"><span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span></div>
                  </div>
                </div>
                <div style="flex:1;">
                  <p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.3rem;">Modale</p>
                  <div class="img-preview-wrap" style="height:120px;">
                    <div id="img-preview-modal"><span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="f-server">Serveur actuel</label>
              <input type="text" id="f-server" placeholder="Louisoix">
            </div>

            <div class="form-group">
              <label for="f-old-servers">Anciens serveurs</label>
              <input type="text" id="f-old-servers" placeholder="Shiva, Odin">
              <span class="form-hint">Séparés par des virgules</span>
            </div>

            <div class="form-group">
              <label for="f-main">Personnage principal</label>
              <input type="text" id="f-main" placeholder="Esenkha">
            </div>

            <div class="form-group">
              <label for="f-alts">Personnages secondaires</label>
              <input type="text" id="f-alts" placeholder="Saya, Nyx">
              <span class="form-hint">Séparés par des virgules</span>
            </div>

            <div class="form-group">
              <label for="f-uid">UID</label>
              <input type="text" id="f-uid" placeholder="76561198…">
            </div>

            <div class="form-group">
              <label for="f-guild">Guilde</label>
              <input type="text" id="f-guild" placeholder="Nom de la guilde">
            </div>

            <div class="form-group">
              <label for="f-old-guilds">Anciennes guildes</label>
              <input type="text" id="f-old-guilds" placeholder="Aetherwing, Moonlit Vale">
              <span class="form-hint">Séparées par des virgules</span>
            </div>

          </div>
          <div class="modal-foot" style="padding:1rem 0 0;border-top:1px solid var(--border);margin-top:1rem;display:flex;gap:0.6rem;justify-content:flex-end;">
            <button type="button" class="btn btn-ghost" onclick="closeGameModal()">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>

      <!-- ── Formulaire Projets ── -->
      <div id="form-projects" style="display:none;">
        <form id="project-form">
          <div class="form-grid">

            <div class="form-group full">
              <label for="fp-name">Nom du projet *</label>
              <input type="text" id="fp-name" required placeholder="Esenkha">
            </div>

            <div class="form-group">
              <label for="fp-tag-type">Tag type</label>
              <select id="fp-tag-type"></select>
            </div>

            <div class="form-group">
              <label for="fp-tag-status">Tag statut</label>
              <select id="fp-tag-status"></select>
            </div>

            <div class="form-group full">
              <label>Tags supplémentaires</label>
              <div id="fp-tag-others-wrap" style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.3rem;"></div>
            </div>

            <div class="form-group full">
              <label>Illustration</label>
              <div class="img-source-tabs">
                <button type="button" class="img-source-tab active" data-src="url"    onclick="switchImgSourceP('url')">Lien URL</button>
                <button type="button" class="img-source-tab"        data-src="folder" onclick="switchImgSourceP('folder')">Dossier img/</button>
              </div>
              <div id="img-src-url-p">
                <input type="text" id="fp-image" placeholder="https://… ou img/nom.jpg">
                <span class="form-hint">URL distante ou chemin local (img/nom.jpg)</span>
              </div>
              <div id="img-src-folder-p" style="display:none;">
                <button type="button" class="btn btn-ghost" style="width:100%;justify-content:center;" onclick="openImagesModal('projects')">
                  Choisir depuis la bibliothèque…
                </button>
              </div>
              <div style="display:flex;gap:0.75rem;margin-top:0.75rem;align-items:flex-start;">
                <div style="flex-shrink:0;">
                  <p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.3rem;">Carte</p>
                  <div class="img-preview-wrap" id="img-preview-wrap-card-p" style="width:92px;">
                    <div id="img-preview-card-p"><span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span></div>
                  </div>
                </div>
                <div style="flex:1;">
                  <p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.3rem;">Modale</p>
                  <div class="img-preview-wrap" style="height:120px;">
                    <div id="img-preview-modal-p"><span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group full">
              <label for="fp-description">Description</label>
              <textarea id="fp-description" placeholder="Courte description du projet…" rows="3"></textarea>
            </div>

            <div class="form-group full">
              <label for="fp-url-project">URL du projet</label>
              <input type="text" id="fp-url-project" placeholder="https://monprojet.example.com">
            </div>

            <div class="form-group full">
              <label for="fp-url-repo">URL du dépôt</label>
              <input type="text" id="fp-url-repo" placeholder="https://github.com/…">
            </div>

          </div>
          <div class="modal-foot" style="padding:1rem 0 0;border-top:1px solid var(--border);margin-top:1rem;display:flex;gap:0.6rem;justify-content:flex-end;">
            <button type="button" class="btn btn-ghost" onclick="closeGameModal()">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>

    </div>
  </div>
</div>

<button class="scroll-top" id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Retour en haut">↑</button>

<div class="notif" id="notif"></div>
<script src="admin.js?v=<?= $vJs ?>"></script>
</body>
</html>
