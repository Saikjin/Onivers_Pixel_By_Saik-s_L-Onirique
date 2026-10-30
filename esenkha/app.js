let games    = [];
let projects = [];
let tags     = [];
let config   = { site_title: 'Esenkha', site_subtitle: 'Mes aventures en ligne', mode: 'games' };
let activeTab = '';
let activeTagFilters = new Set(); // tags actifs/cochés (empty = aucun filtre = tout afficher). Combinaison en "ET" : un item doit posséder TOUS les tags cochés.

async function init() {
  const v = window.JSON_V || {};
  const [gRes, pRes, tRes, cRes] = await Promise.all([
    fetch('games.json'    + (v.games    ? '?v=' + v.games    : '')),
    fetch('projects.json' + (v.projects ? '?v=' + v.projects : '')),
    fetch('tags.json'     + (v.tags     ? '?v=' + v.tags     : '')),
    fetch('config.json'   + (v.config   ? '?v=' + v.config   : '')),
  ]);
  games    = await gRes.json();
  projects = await pRes.json();
  tags     = await tRes.json();
  config   = await cRes.json();

  document.getElementById('site-title').textContent    = config.site_title    || 'Esenkha';
  document.getElementById('site-subtitle').textContent = config.site_subtitle || '';
  document.title = config.site_title || 'Esenkha';

  // Card ratio
  const ratio = config.card_ratio || '3/4';
  document.documentElement.style.setProperty('--card-ratio', ratio);

  buildHeaderLinks();
  buildTabs();
  buildTagPanel();
  render();
}

/* ── Helpers ── */
const currentMode = () => config.mode || 'games';
const modeItems   = () => currentMode() === 'projects' ? projects : games;
const modeTags    = () => tags.filter(t => (t.mode ?? 'games') === currentMode());

/* ── Header links ── */
function buildHeaderLinks() {
  const container = document.getElementById('header-links');
  if (!container) return;
  const links = config.custom_links || [];
  if (!links.length) { container.innerHTML = ''; return; }

  if (links.length === 1) {
    // Single link: direct button/anchor
    const l = links[0];
    container.innerHTML = `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="header-link-btn">${esc(l.label)}</a>`;
  } else {
    // Multiple links: "Liens" button that opens the modal
    container.innerHTML = `<button class="header-link-btn" onclick="openLinksModal()">Liens</button>`;
  }
}

function openLinksModal() {
  const links = config.custom_links || [];
  const title = document.getElementById('links-modal-title');
  if (title) title.textContent = 'Liens';
  const body = document.getElementById('links-modal-body');
  if (!body) return;
  body.innerHTML = links.map(l =>
    `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="links-modal-item">
      <span class="links-modal-item-icon">↗</span>
      ${esc(l.label)}
    </a>`
  ).join('');
  document.getElementById('modal-links').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLinksModal() {
  document.getElementById('modal-links').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Tabs ── */
function buildTabs() {
  const statusTags = modeTags().filter(t => t.category === 'status').sort((a,b) => (a.sort_order??0) - (b.sort_order??0));
  const container  = document.getElementById('tabs');
  if (!statusTags.length) { container.innerHTML = ''; return; }

  if (!activeTab || !statusTags.find(t => t.id === activeTab)) {
    activeTab = statusTags[0].id;
  }

  container.innerHTML = statusTags.map(t =>
    `<button class="tab-btn" data-tab="${esc(t.id)}" data-color="${esc(t.color||'#888')}"
      onclick="switchTab('${esc(t.id)}')">${esc(t.label)}</button>`
  ).join('');

  updateTabStyles();
}

function updateTabStyles() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === activeTab;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      const col = btn.dataset.color || 'var(--pink)';
      const rgb = hexToRgb(col);
      btn.style.background  = rgb ? `rgba(${rgb},0.15)` : 'var(--pink-glow)';
      btn.style.borderColor = col;
      btn.style.color       = col;
    } else {
      btn.style.background  = '';
      btn.style.borderColor = '';
      btn.style.color       = '';
    }
  });
}

/* ── Tag rendering ── */
function tagById(id) { return tags.find(t => t.id === id); }

function sortTagIds(ids) {
  return [...ids].sort((a, b) => {
    const ta = tagById(a);
    const tb = tagById(b);
    return (ta?.sort_order ?? 0) - (tb?.sort_order ?? 0);
  });
}

function renderTag(id) {
  const t = tagById(id);
  if (!t) return '';
  const col = t.color || '#888';
  const rgb = hexToRgb(col);
  const bg  = rgb ? `rgba(${rgb},0.18)` : '#333';
  const bdr = rgb ? `rgba(${rgb},0.4)`  : '#555';
  return `<span class="tag" style="background:${bg};color:${col};border:1px solid ${bdr}">${esc(t.label)}</span>`;
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : null;
}

/* ── Render grid ── */
function render() {
  currentMode() === 'projects' ? renderProjects() : renderGames();
}

function renderGames() {
  const grid     = document.getElementById('grid');
  const sorted   = [...games].sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  let filtered   = sorted.filter(g => g.tag_status === activeTab);

  // Apply tag panel filters (active/checked tags narrow the list — logique "ET")
  if (activeTagFilters.size > 0) {
    filtered = filtered.filter(g => {
      const itemTags = new Set([g.tag_type, ...(g.tag_others||[])].filter(Boolean));
      // n'afficher que si l'item possède TOUS les tags actifs
      return [...activeTagFilters].every(id => itemTags.has(id));
    });
  }

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty">Aucun jeu dans cette catégorie.</p>';
    return;
  }

  grid.innerHTML = filtered.map(g => {
    const imgHtml = g.image
      ? `<img class="card-img" src="${esc(g.image)}" alt="${esc(g.name)}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="card-no-img" style="display:none;position:absolute;inset:0;">🎮</div>`
      : `<div class="card-no-img">🎮</div>`;

    const overlayLines = [
      g.server         ? `<p class="overlay-line">Serveur <span>${esc(g.server)}</span></p>` : '',
      g.main_character ? `<p class="overlay-line">Perso <span>${esc(g.main_character)}</span></p>` : '',
      g.uid            ? `<p class="overlay-line">UID <span>${esc(g.uid)}</span></p>` : ''
    ].join('');

    const cardTagIds = sortTagIds([g.tag_type, ...(g.tag_others||[])].filter(Boolean));
    const tagsHtml   = cardTagIds.map(renderTag).join('');

    return `
      <article class="card" onclick="openGameModal(${g.id})" tabindex="0" role="button" aria-label="${esc(g.name)}">
        <div class="card-img-wrap">
          ${imgHtml}
          <div class="card-overlay">${overlayLines}</div>
        </div>
        <div class="card-info">
          <p class="card-name">${esc(g.name)}</p>
          <div class="card-tags">${tagsHtml}</div>
        </div>
      </article>`;
  }).join('');
}

function renderProjects() {
  const grid     = document.getElementById('grid');
  const sorted   = [...projects].sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  let filtered   = sorted.filter(p => p.tag_status === activeTab);

  if (activeTagFilters.size > 0) {
    filtered = filtered.filter(p => {
      const itemTags = new Set([p.tag_type, ...(p.tag_others||[])].filter(Boolean));
      // n'afficher que si l'item possède TOUS les tags actifs
      return [...activeTagFilters].every(id => itemTags.has(id));
    });
  }

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty">Aucun projet dans cette catégorie.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const imgHtml = p.image
      ? `<img class="card-img" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="card-no-img" style="display:none;position:absolute;inset:0;">💻</div>`
      : `<div class="card-no-img">💻</div>`;

    // Overlay: description preview
    const overlayLines = p.description
      ? `<p class="overlay-line overlay-desc">${esc(p.description)}</p>`
      : '';

    const cardTagIds = sortTagIds([p.tag_type, ...(p.tag_others||[])].filter(Boolean));
    const tagsHtml   = cardTagIds.map(renderTag).join('');

    // Link badges
    const links = [
      p.url_project ? `<a class="card-link" href="${esc(p.url_project)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 Voir</a>` : '',
      p.url_repo    ? `<a class="card-link" href="${esc(p.url_repo)}"    target="_blank" rel="noopener" onclick="event.stopPropagation()">📦 Dépôt</a>` : '',
    ].join('');

    return `
      <article class="card" onclick="openProjectModal(${p.id})" tabindex="0" role="button" aria-label="${esc(p.name)}">
        <div class="card-img-wrap">
          ${imgHtml}
          <div class="card-overlay">${overlayLines}</div>
        </div>
        <div class="card-info">
          <p class="card-name">${esc(p.name)}</p>
          <div class="card-tags">${tagsHtml}</div>
          ${links ? `<div class="card-links">${links}</div>` : ''}
        </div>
      </article>`;
  }).join('');
}

function switchTab(tab) {
  activeTab = tab;
  updateTabStyles();
  render();
}

/* ── Tag filter panel ── */
function buildTagPanel() {
  const panel = document.getElementById('tag-filter-panel');
  if (!panel) return;

  const mode = currentMode();

  // Dynamic categories, excluding 'status' (status = tabs)
  const allCats = ((config.tag_categories || {})[mode] || [
    { id: 'type', label: 'Type' },
    { id: 'status', label: 'Statut' },
    { id: 'other', label: 'Autres' },
  ]).filter(c => c.id !== 'status');

  // Tags for current mode, excluding status category
  const filterableTags = modeTags().filter(t => t.category !== 'status')
                                   .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));

  if (!filterableTags.length) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';

  let html = '<p class="tag-panel-title">Filtres</p>';

  allCats.forEach(cat => {
    const catTags = filterableTags.filter(t => t.category === cat.id);
    if (!catTags.length) return;
    html += `<p class="tag-panel-cat">${esc(cat.label)}</p>`;
    html += catTags.map(t => {
      const col  = t.color || '#888';
      const rgb  = hexToRgb(col);
      const isOn = activeTagFilters.has(t.id);
      const bg   = rgb ? `rgba(${rgb},0.15)` : '#333';
      const bdr  = rgb ? `rgba(${rgb},0.35)` : '#555';
      return `
        <button class="tag-filter-btn${isOn ? ' on' : ''}"
          style="${isOn ? `--tag-col:${col};--tag-bg:${bg};--tag-bdr:${bdr};` : ''}"
          onclick="toggleTagFilter('${esc(t.id)}')"
          title="${isOn ? 'Retirer ce filtre' : 'Filtrer sur ce tag'}">
          <span class="tag-filter-dot" style="background:${isOn ? col : 'transparent'};${isOn ? '' : `border:1.5px solid ${col};opacity:0.35;`}"></span>
          ${esc(t.label)}
        </button>`;
    }).join('');
  });

  if (activeTagFilters.size > 0) {
    html += `<button class="tag-filter-reset" onclick="resetTagFilters()">Tout désactiver</button>`;
  }

  panel.innerHTML = html;
}

function toggleTagFilter(id) {
  if (activeTagFilters.has(id)) activeTagFilters.delete(id);
  else activeTagFilters.add(id);
  buildTagPanel();
  render();
}

function resetTagFilters() {
  activeTagFilters.clear();
  buildTagPanel();
  render();
}

/* ── Game modal ── */
function openGameModal(id) {
  const g = games.find(x => x.id === id);
  if (!g) return;

  const rows = [];
  if (g.server)              rows.push(row('Serveur', esc(g.server)));
  if (g.old_servers?.length) rows.push(row('Anciens serveurs', esc(g.old_servers.join(', '))));
  if (g.main_character)      rows.push(row('Personnage principal', esc(g.main_character)));
  if (g.alt_characters?.length) {
    const altsHtml = g.alt_characters.map(a => `<span class="sub">${esc(a)}</span>`).join('');
    rows.push(row('Personnages secondaires', altsHtml));
  }
  if (g.uid)   rows.push(row('UID', esc(g.uid)));
  if (g.guild) rows.push(row('Guilde', esc(g.guild)));
  if (g.old_guilds?.length) rows.push(row('Anciennes guildes', `<span class="sub">${esc(g.old_guilds.join(', '))}</span>`));

  openDetailModal(g.name, g.image, [g.tag_type, g.tag_status, ...(g.tag_others||[])], rows);
}

/* ── Project modal ── */
function openProjectModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;

  const rows = [];
  if (p.description) rows.push(row('Description', esc(p.description)));
  if (p.url_project) rows.push(row('Projet', `<a href="${esc(p.url_project)}" target="_blank" rel="noopener" class="modal-link">${esc(p.url_project)}</a>`));
  if (p.url_repo)    rows.push(row('Dépôt', `<a href="${esc(p.url_repo)}" target="_blank" rel="noopener" class="modal-link">${esc(p.url_repo)}</a>`));

  openDetailModal(p.name, p.image, [p.tag_type, p.tag_status, ...(p.tag_others||[])], rows);
}

function openDetailModal(name, image, tagIds, rows) {
  document.getElementById('modal-title').textContent = name;

  const img = document.getElementById('modal-img');
  if (image) {
    img.src = image;
    img.style.display = '';
    img.onerror = () => { img.style.display = 'none'; };
  } else {
    img.style.display = 'none';
  }

  document.getElementById('modal-tags').innerHTML  = sortTagIds(tagIds.filter(Boolean)).map(renderTag).join('');
  document.getElementById('modal-rows').innerHTML  = rows.join('');

  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}

function row(label, value) {
  return `<div class="modal-row"><span class="modal-label">${label}</span><span class="modal-value">${value}</span></div>`;
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeLinksModal(); closeSourcesModal(); } });
document.addEventListener('DOMContentLoaded', init);

/* ── Scroll to top ── */
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 300);
});

/* ── Sources modal ── */
function openSourcesModal() {
  const body = document.getElementById('sources-body');
  const items = [...games, ...projects].filter(g => g.image);
  if (!items.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:0.83rem;">Aucune illustration renseignée.</p>';
  } else {
    body.innerHTML = `<div class="sources-grid">${items.map(g => {
      const imgUrl = g.image;
      const base   = (config.base_url || '').replace(/\/$/, '') || window.location.origin;
      const absUrl = imgUrl.startsWith('http') ? imgUrl : (base + '/' + imgUrl.replace(/^\//, ''));
      const sauceUrl = 'https://saucenao.com/search.php?url=' + encodeURIComponent(absUrl);
      return `
        <div class="source-thumb">
          <div class="source-img-wrap">
            <img src="${esc(imgUrl)}" alt="${esc(g.name)}" loading="lazy">
            <div class="source-saucenao"><a href="${esc(sauceUrl)}" target="_blank" rel="noopener">SauceNAO</a></div>
          </div>
          <span class="source-name" title="${esc(g.name)}">${esc(g.name)}</span>
        </div>`;
    }).join('')}</div>`;
  }
  document.getElementById('modal-sources').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSourcesModal() {
  document.getElementById('modal-sources').classList.remove('open');
  document.body.style.overflow = '';
}
