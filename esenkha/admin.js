/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let games    = [];
let projects = [];
let tags     = [];
let config   = { site_title: 'Esenkha', site_subtitle: 'Mes aventures en ligne', mode: 'games' };
let editingId   = null;
let dragSrcIdx  = null;
let activeFilters = new Set();

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
async function loadAll() {
  const [gRes, pRes, tRes, cRes] = await Promise.all([
    fetch('games.json'), fetch('projects.json'), fetch('tags.json'), fetch('config.json')
  ]);
  games    = await gRes.json();
  projects = await pRes.json();
  tags     = await tRes.json();
  config   = await cRes.json();
  // Ensure tag_categories exists with defaults
  if (!config.tag_categories) {
    config.tag_categories = {
      games:    [{ id:'type', label:'Type' }, { id:'status', label:'Statut' }, { id:'other', label:'Autres' }],
      projects: [{ id:'type', label:'Type' }, { id:'status', label:'Statut' }, { id:'other', label:'Autres' }]
    };
  }
  updateCardRatioPreviews();
  renderList();
  renderFilterBar();
  populateTagSelects();
}

/* Card ratio preview helper */
function updateCardRatioPreviews() {
  const ratio = config.card_ratio || '3/4';
  const [w, h] = ratio.split('/').map(Number);
  const height = Math.round(92 * (h / w));
  ['img-preview-wrap-card', 'img-preview-wrap-card-p'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.height = height + 'px';
  });
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const currentMode  = () => config.mode || 'games';
const currentItems = () => currentMode() === 'projects' ? projects : games;
const modeTags     = (cat) => tags.filter(t => (t.mode ?? 'games') === currentMode() && (!cat || t.category === cat));

// Returns ordered categories for a given mode
function modeCategories(mode) {
  const m = mode || currentMode();
  const cats = (config.tag_categories || {})[m] || [];
  return cats;
}

function tagById(id)         { return tags.find(t => t.id === id); }
function tagsByCategory(cat) { return tags.filter(t => t.category === cat); }

// Returns tags for a mode+category, respecting sort_order
function tagsForCat(mode, catId) {
  return tags
    .filter(t => (t.mode ?? 'games') === mode && t.category === catId)
    .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function renderTagPill(id) {
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

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────
   Section title
───────────────────────────────────────── */
function updateSectionTitle() {
  const el = document.getElementById('section-title-text');
  if (el) el.textContent = currentMode() === 'projects' ? 'Projets' : 'Jeux';
}

/* ─────────────────────────────────────────
   Filter bar (admin list)
───────────────────────────────────────── */
function renderFilterBar() {
  const container = document.getElementById('filter-tags');
  if (!container) return;

  const visibleTags = tags.filter(t => (t.mode ?? 'games') === currentMode());
  if (!visibleTags.length) { container.innerHTML = ''; return; }

  const activeCount = activeFilters.size;
  const label = activeCount ? `Filtrer · ${activeCount}` : 'Filtrer';

  // Use dynamic categories (ordered)
  const cats = modeCategories(currentMode());

  const groupsHtml = cats.map(cat => {
    const catTags = visibleTags
      .filter(t => t.category === cat.id)
      .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (!catTags.length) return '';
    const items = catTags.map(t => {
      const col     = t.color || '#888';
      const checked = activeFilters.has(t.id);
      return `<label class="filter-drop-item" style="${checked ? `color:${col};` : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleFilter('${esc(t.id)}')" style="display:none;">
        <span class="filter-dot" style="background:${col};"></span>
        ${esc(t.label)}
        ${checked ? '<span class="filter-check">✓</span>' : ''}
      </label>`;
    }).join('');
    return `<div class="filter-drop-group">
      <p class="filter-drop-cat">${esc(cat.label)}</p>
      ${items}
    </div>`;
  }).join('');

  const clearBtn = activeCount
    ? `<button class="filter-drop-clear" onclick="clearFilters()">Effacer les filtres</button>`
    : '';

  container.innerHTML = `
    <div class="filter-dropdown" id="filter-dropdown">
      <button class="btn btn-ghost btn-sm filter-drop-trigger ${activeCount ? 'active' : ''}"
        onclick="toggleFilterDropdown(event)" id="filter-drop-btn">
        <span style="font-size:0.75rem;">▾</span> ${esc(label)}
      </button>
      <div class="filter-drop-panel" id="filter-drop-panel">
        ${groupsHtml}
        ${clearBtn}
      </div>
    </div>`;
}

function toggleFilterDropdown(e) {
  e.stopPropagation();
  document.getElementById('filter-drop-panel')?.classList.toggle('open');
}

function clearFilters() {
  activeFilters.clear();
  renderFilterBar();
  renderList();
}

document.addEventListener('click', () => {
  document.getElementById('filter-drop-panel')?.classList.remove('open');
});

function toggleFilter(id) {
  if (activeFilters.has(id)) activeFilters.delete(id);
  else activeFilters.add(id);
  renderFilterBar();
  renderList();
}

function renderList() {
  updateSectionTitle();
  currentMode() === 'projects' ? renderProjectList() : renderGameList();
}

function renderGameList() {
  const el     = document.getElementById('game-list');
  const sorted = [...games].sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  const filtered = activeFilters.size === 0 ? sorted : sorted.filter(g => {
    const gameTagIds = new Set([g.tag_type, g.tag_status, ...(g.tag_others||[])].filter(Boolean));
    return [...activeFilters].every(id => gameTagIds.has(id));
  });

  if (!filtered.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.83rem;padding:0.75rem 0;">Aucun jeu correspondant.</p>';
    return;
  }

  el.innerHTML = filtered.map((g, i) => {
    const allTagIds = [g.tag_type, g.tag_status, ...(g.tag_others||[])].filter(Boolean);
    const tagsHtml  = allTagIds.map(renderTagPill).join('');
    const imgHtml   = g.image
      ? `<img class="game-item-img" src="${esc(g.image)}" alt="${esc(g.name)}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="game-item-img-placeholder" style="display:none;">🎮</div>`
      : `<div class="game-item-img-placeholder">🎮</div>`;

    return `
      <div class="game-item" draggable="true" data-id="${g.id}"
           ondragstart="onDragStart(event,${i})"
           ondragover="onDragOver(event)"
           ondrop="onDrop(event,${i})"
           ondragleave="onDragLeave(event)"
           ondragend="onDragEnd(event)">
        <span class="drag-handle" title="Glisser pour réordonner">⠿</span>
        ${imgHtml}
        <div class="game-item-info">
          <p class="game-item-name">${esc(g.name)}</p>
          <div class="game-item-meta">${tagsHtml}</div>
        </div>
        <div class="game-item-actions">
          <button class="btn btn-ghost btn-sm" onclick="editGame(${g.id})">Modifier</button>
          <button class="btn btn-danger" onclick="deleteGame(${g.id})">✕</button>
        </div>
      </div>`;
  }).join('');
}

function renderProjectList() {
  const el     = document.getElementById('game-list');
  const sorted = [...projects].sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  const filtered = activeFilters.size === 0 ? sorted : sorted.filter(p => {
    const pTagIds = new Set([p.tag_type, p.tag_status, ...(p.tag_others||[])].filter(Boolean));
    return [...activeFilters].every(id => pTagIds.has(id));
  });

  if (!filtered.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.83rem;padding:0.75rem 0;">Aucun projet correspondant.</p>';
    return;
  }

  el.innerHTML = filtered.map((p, i) => {
    const allTagIds = [p.tag_type, p.tag_status, ...(p.tag_others||[])].filter(Boolean);
    const tagsHtml  = allTagIds.map(renderTagPill).join('');
    const imgHtml   = p.image
      ? `<img class="game-item-img" src="${esc(p.image)}" alt="${esc(p.name)}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="game-item-img-placeholder" style="display:none;">💻</div>`
      : `<div class="game-item-img-placeholder">💻</div>`;

    return `
      <div class="game-item" draggable="true" data-id="${p.id}"
           ondragstart="onDragStart(event,${i})"
           ondragover="onDragOver(event)"
           ondrop="onDrop(event,${i})"
           ondragleave="onDragLeave(event)"
           ondragend="onDragEnd(event)">
        <span class="drag-handle" title="Glisser pour réordonner">⠿</span>
        ${imgHtml}
        <div class="game-item-info">
          <p class="game-item-name">${esc(p.name)}</p>
          <div class="game-item-meta">${tagsHtml}</div>
        </div>
        <div class="game-item-actions">
          <button class="btn btn-ghost btn-sm" onclick="editProject(${p.id})">Modifier</button>
          <button class="btn btn-danger" onclick="deleteProject(${p.id})">✕</button>
        </div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────
   Drag & drop sort (items list)
───────────────────────────────────────── */
function getSortedItems() {
  return [...currentItems()].sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
}

function onDragStart(e, i) {
  dragSrcIdx = i;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.target.closest('.game-item').classList.add('dragging'), 0);
}
function onDragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('drag-over'); }
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDragEnd(e)   { document.querySelectorAll('.game-item').forEach(el => el.classList.remove('dragging','drag-over')); }

function onDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;

  const sorted = getSortedItems();
  const [moved] = sorted.splice(dragSrcIdx, 1);
  sorted.splice(targetIdx, 0, moved);

  const collection = currentMode() === 'projects' ? projects : games;
  sorted.forEach((item, i) => {
    const found = collection.find(x => x.id === item.id);
    if (found) found.sort_order = i;
  });

  dragSrcIdx = null;
  renderList();
  saveCurrentItems(false);
}

/* ─────────────────────────────────────────
   Games / Projects form
───────────────────────────────────────── */
function populateTagSelects() {
  const mode = currentMode();

  // ── Games selects (always populate both regardless of current mode) ──
  // type select
  const gTypeTags = tags.filter(t => (t.mode ?? 'games') === 'games' && t.category === 'type')
                        .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
  document.getElementById('f-tag-type').innerHTML =
    gTypeTags.map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');

  // status select
  const gStatusTags = tags.filter(t => (t.mode ?? 'games') === 'games' && t.category === 'status')
                          .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
  document.getElementById('f-tag-status').innerHTML =
    gStatusTags.map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');

  // "other" categories for games: all non-type, non-status cats
  const gCats = modeCategories('games').filter(c => c.id !== 'type' && c.id !== 'status');
  const gOtherWrap = document.getElementById('f-tag-others-wrap');
  if (gCats.length === 0) {
    // Fallback: all "other" tags flat
    const gOtherTags = tags.filter(t => (t.mode ?? 'games') === 'games' && t.category !== 'type' && t.category !== 'status')
                            .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
    gOtherWrap.innerHTML = gOtherTags.map(t => checkboxPill(t, 'f-tag-other')).join('') ||
      `<span style="font-size:0.78rem;color:var(--text-muted);">Aucun tag supplémentaire.</span>`;
  } else {
    gOtherWrap.innerHTML = gCats.map(cat => {
      const catTags = tags.filter(t => (t.mode ?? 'games') === 'games' && t.category === cat.id)
                          .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
      if (!catTags.length) return '';
      return `<div style="width:100%;margin-bottom:0.3rem;">
        <span style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;">${esc(cat.label)}</span>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.25rem;">
          ${catTags.map(t => checkboxPill(t, 'f-tag-other')).join('')}
        </div>
      </div>`;
    }).join('') || `<span style="font-size:0.78rem;color:var(--text-muted);">Aucun tag supplémentaire.</span>`;
  }

  // ── Projects selects ──
  const pTypeTags = tags.filter(t => t.mode === 'projects' && t.category === 'type')
                        .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
  document.getElementById('fp-tag-type').innerHTML =
    pTypeTags.map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');

  const pStatusTags = tags.filter(t => t.mode === 'projects' && t.category === 'status')
                          .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
  document.getElementById('fp-tag-status').innerHTML =
    pStatusTags.map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');

  const pCats = modeCategories('projects').filter(c => c.id !== 'type' && c.id !== 'status');
  const pOtherWrap = document.getElementById('fp-tag-others-wrap');
  if (pCats.length === 0) {
    const pOtherTags = tags.filter(t => t.mode === 'projects' && t.category !== 'type' && t.category !== 'status')
                           .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
    pOtherWrap.innerHTML = pOtherTags.map(t => checkboxPill(t, 'fp-tag-other')).join('') ||
      `<span style="font-size:0.78rem;color:var(--text-muted);">Aucun tag supplémentaire.</span>`;
  } else {
    pOtherWrap.innerHTML = pCats.map(cat => {
      const catTags = tags.filter(t => t.mode === 'projects' && t.category === cat.id)
                          .sort((a,b) => (a.sort_order??0)-(b.sort_order??0));
      if (!catTags.length) return '';
      return `<div style="width:100%;margin-bottom:0.3rem;">
        <span style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;">${esc(cat.label)}</span>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.25rem;">
          ${catTags.map(t => checkboxPill(t, 'fp-tag-other')).join('')}
        </div>
      </div>`;
    }).join('') || `<span style="font-size:0.78rem;color:var(--text-muted);">Aucun tag supplémentaire.</span>`;
  }
}

function checkboxPill(t, cls) {
  return `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.83rem;cursor:pointer;text-transform:none;letter-spacing:0;">
    <input type="checkbox" class="${esc(cls)}" value="${esc(t.id)}" style="width:auto;accent-color:var(--pink);">
    ${renderTagPill(t.id)}
  </label>`;
}

function openGameModal(title = 'Ajouter un jeu') {
  document.getElementById('form-title').textContent = title;
  document.getElementById('form-games').style.display  = '';
  document.getElementById('form-projects').style.display = 'none';
  updateCardRatioPreviews();
  document.getElementById('modal-game').classList.add('open');
}

function openProjectModal(title = 'Ajouter un projet') {
  document.getElementById('form-title').textContent = title;
  document.getElementById('form-games').style.display    = 'none';
  document.getElementById('form-projects').style.display = '';
  updateCardRatioPreviews();
  document.getElementById('modal-game').classList.add('open');
}

function openAddModal() {
  currentMode() === 'projects' ? openProjectModal() : openGameModal();
}

function closeGameModal() {
  document.getElementById('modal-game').classList.remove('open');
  document.getElementById('game-form').reset();
  document.getElementById('project-form').reset();
  const emptyHtml = '<span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span>';
  ['img-preview-card','img-preview-modal','img-preview-card-p','img-preview-modal-p'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = emptyHtml;
  });
  switchImgSource('url');
  switchImgSourceP('url');
  editingId = null;
}

function editGame(id) {
  const g = games.find(x => x.id === id);
  if (!g) return;
  editingId = id;
  document.getElementById('f-name').value        = g.name || '';
  document.getElementById('f-tag-type').value    = g.tag_type || '';
  document.getElementById('f-tag-status').value  = g.tag_status || '';
  document.getElementById('f-server').value      = g.server || '';
  document.getElementById('f-old-servers').value = (g.old_servers||[]).join(', ');
  document.getElementById('f-main').value        = g.main_character || '';
  document.getElementById('f-alts').value        = (g.alt_characters||[]).join(', ');
  document.getElementById('f-uid').value         = g.uid || '';
  document.getElementById('f-guild').value       = g.guild || '';
  document.getElementById('f-old-guilds').value  = (g.old_guilds||[]).join(', ');
  document.getElementById('f-image').value       = g.image || '';
  document.querySelectorAll('.f-tag-other').forEach(cb => { cb.checked = (g.tag_others||[]).includes(cb.value); });
  updateImgPreview(g.image || '');
  openGameModal('Modifier le jeu');
}

function editProject(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('fp-name').value        = p.name || '';
  document.getElementById('fp-tag-type').value    = p.tag_type || '';
  document.getElementById('fp-tag-status').value  = p.tag_status || '';
  document.getElementById('fp-description').value = p.description || '';
  document.getElementById('fp-url-project').value = p.url_project || '';
  document.getElementById('fp-url-repo').value    = p.url_repo || '';
  document.getElementById('fp-image').value       = p.image || '';
  document.querySelectorAll('.fp-tag-other').forEach(cb => { cb.checked = (p.tag_others||[]).includes(cb.value); });
  updateImgPreviewP(p.image || '');
  openProjectModal('Modifier le projet');
}

function deleteGame(id) {
  if (!confirm('Supprimer ce jeu ?')) return;
  games = games.filter(g => g.id !== id);
  saveGames();
}

function deleteProject(id) {
  if (!confirm('Supprimer ce projet ?')) return;
  projects = projects.filter(p => p.id !== id);
  saveProjects();
}

document.getElementById('game-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('f-name').value.trim();
  if (!name) return;
  const others = [...document.querySelectorAll('.f-tag-other:checked')].map(cb => cb.value);
  const entry = {
    id:             editingId || (games.length ? Math.max(...games.map(g=>g.id)) + 1 : 1),
    name,
    tag_type:       document.getElementById('f-tag-type').value,
    tag_status:     document.getElementById('f-tag-status').value,
    tag_others:     others,
    image:          document.getElementById('f-image').value.trim(),
    server:         document.getElementById('f-server').value.trim(),
    old_servers:    document.getElementById('f-old-servers').value.split(',').map(s=>s.trim()).filter(Boolean),
    main_character: document.getElementById('f-main').value.trim(),
    alt_characters: document.getElementById('f-alts').value.split(',').map(s=>s.trim()).filter(Boolean),
    uid:            document.getElementById('f-uid').value.trim(),
    guild:          document.getElementById('f-guild').value.trim(),
    old_guilds:     document.getElementById('f-old-guilds').value.split(',').map(s=>s.trim()).filter(Boolean),
    sort_order:     editingId ? (games.find(g=>g.id===editingId)?.sort_order ?? games.length) : games.length,
  };
  if (editingId) { const idx = games.findIndex(g=>g.id===editingId); games[idx] = entry; }
  else games.push(entry);
  saveGames();
  closeGameModal();
});

document.getElementById('project-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('fp-name').value.trim();
  if (!name) return;
  const others = [...document.querySelectorAll('.fp-tag-other:checked')].map(cb => cb.value);
  const entry = {
    id:          editingId || (projects.length ? Math.max(...projects.map(p=>p.id)) + 1 : 1),
    name,
    tag_type:    document.getElementById('fp-tag-type').value,
    tag_status:  document.getElementById('fp-tag-status').value,
    tag_others:  others,
    image:       document.getElementById('fp-image').value.trim(),
    description: document.getElementById('fp-description').value.trim(),
    url_project: document.getElementById('fp-url-project').value.trim(),
    url_repo:    document.getElementById('fp-url-repo').value.trim(),
    sort_order:  editingId ? (projects.find(p=>p.id===editingId)?.sort_order ?? projects.length) : projects.length,
  };
  if (editingId) { const idx = projects.findIndex(p=>p.id===editingId); projects[idx] = entry; }
  else projects.push(entry);
  saveProjects();
  closeGameModal();
});

/* ─────────────────────────────────────────
   Image source tabs & preview — games
───────────────────────────────────────── */
function switchImgSource(src) {
  document.querySelectorAll('#form-games .img-source-tab').forEach(t => t.classList.toggle('active', t.dataset.src === src));
  document.getElementById('img-src-url').style.display     = src === 'url'    ? '' : 'none';
  document.getElementById('img-src-folder').style.display  = src === 'folder' ? '' : 'none';
}

function updateImgPreview(url) {
  const emptyHtml = '<span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span>';
  ['img-preview-card','img-preview-modal'].forEach(id => {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    if (!url) { wrap.innerHTML = emptyHtml; return; }
    wrap.innerHTML = `<img src="${esc(url)}" alt="aperçu"
      style="width:100%;height:100%;object-fit:cover;display:block;"
      onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=\\'img-preview-empty\\' style=\\'font-size:0.7rem;\\'>Introuvable</span>')">`;
  });
}

/* ─────────────────────────────────────────
   Image source tabs & preview — projects
───────────────────────────────────────── */
function switchImgSourceP(src) {
  document.querySelectorAll('#form-projects .img-source-tab').forEach(t => t.classList.toggle('active', t.dataset.src === src));
  document.getElementById('img-src-url-p').style.display     = src === 'url'    ? '' : 'none';
  document.getElementById('img-src-folder-p').style.display  = src === 'folder' ? '' : 'none';
}

function updateImgPreviewP(url) {
  const emptyHtml = '<span class="img-preview-empty" style="font-size:0.7rem;">Aperçu</span>';
  ['img-preview-card-p','img-preview-modal-p'].forEach(id => {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    if (!url) { wrap.innerHTML = emptyHtml; return; }
    wrap.innerHTML = `<img src="${esc(url)}" alt="aperçu"
      style="width:100%;height:100%;object-fit:cover;display:block;"
      onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=\\'img-preview-empty\\' style=\\'font-size:0.7rem;\\'>Introuvable</span>')">`;
  });
}

/* ─────────────────────────────────────────
   Options modal
───────────────────────────────────────── */
function openOptions() {
  document.getElementById('opt-title').value        = config.site_title    || '';
  document.getElementById('opt-subtitle').value     = config.site_subtitle || '';
  document.getElementById('opt-baseurl').value      = config.base_url      || '';
  document.getElementById('opt-mode').value         = config.mode          || 'games';
  document.getElementById('opt-card-ratio').value   = config.card_ratio    || '3/4';
  document.getElementById('opt-saucenao').checked   = config.saucenao !== false;
  renderCustomLinksList();
  document.getElementById('modal-options').classList.add('open');
}
function closeOptions() { document.getElementById('modal-options').classList.remove('open'); }

/* Drag state for custom links reorder */
let linkDragIdx = null;

function renderCustomLinksList() {
  const list  = document.getElementById('opt-links-list');
  const links = config.custom_links || [];
  if (!links.length) { list.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted);">Aucun lien.</span>'; return; }
  list.innerHTML = links.map((l, i) => `
    <div class="custom-link-row" draggable="true" data-idx="${i}"
         ondragstart="onLinkDragStart(event,${i})"
         ondragover="onLinkDragOver(event)"
         ondrop="onLinkDrop(event,${i})"
         ondragleave="onLinkDragLeave(event)"
         ondragend="onLinkDragEnd(event)">
      <span class="drag-handle" style="font-size:0.9rem;color:var(--text-muted);cursor:grab;flex-shrink:0;">⠿</span>
      <span style="flex:1;font-size:0.82rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(l.url)}">${esc(l.label)}</span>
      <span style="font-size:0.72rem;color:var(--text-muted);flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(l.url)}</span>
      <button class="btn btn-danger btn-icon" onclick="removeCustomLink(${i})" style="flex-shrink:0;">✕</button>
    </div>`).join('');
}

function onLinkDragStart(e, i) {
  linkDragIdx = i;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'link');
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
}
function onLinkDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onLinkDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onLinkDragEnd(e) {
  document.querySelectorAll('.custom-link-row').forEach(el => el.classList.remove('dragging','drag-over'));
  linkDragIdx = null;
}
function onLinkDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (linkDragIdx === null || linkDragIdx === targetIdx) return;
  const links = config.custom_links || [];
  const [moved] = links.splice(linkDragIdx, 1);
  links.splice(targetIdx, 0, moved);
  linkDragIdx = null;
  renderCustomLinksList();
}

function addCustomLink() {
  const label = document.getElementById('opt-new-link-label').value.trim();
  const url   = document.getElementById('opt-new-link-url').value.trim();
  if (!label || !url) return;
  if (!config.custom_links) config.custom_links = [];
  config.custom_links.push({ label, url });
  document.getElementById('opt-new-link-label').value = '';
  document.getElementById('opt-new-link-url').value   = '';
  renderCustomLinksList();
}

function removeCustomLink(i) {
  config.custom_links.splice(i, 1);
  renderCustomLinksList();
}

document.getElementById('form-options').addEventListener('submit', async function(e) {
  e.preventDefault();
  const prevMode  = config.mode;
  const prevRatio = config.card_ratio;
  config.site_title    = document.getElementById('opt-title').value.trim();
  config.site_subtitle = document.getElementById('opt-subtitle').value.trim();
  config.base_url      = document.getElementById('opt-baseurl').value.trim().replace(/\/$/, '');
  config.mode          = document.getElementById('opt-mode').value;
  config.card_ratio    = document.getElementById('opt-card-ratio').value;
  config.saucenao      = document.getElementById('opt-saucenao').checked;

  const res = await fetch('save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'config', data: config })
  });
  const d = await res.json();
  if (d.ok) {
    closeOptions();
    notify('Options sauvegardées !');
    if (prevMode !== config.mode) {
      activeFilters.clear();
      renderList();
      renderFilterBar();
      populateTagSelects();
    }
    if (prevRatio !== config.card_ratio) {
      updateCardRatioPreviews();
    }
  } else notify('Erreur : ' + (d.error||'inconnue'), true);
});

/* ─────────────────────────────────────────
   Tags modal — refonte complète
   • Filtre par mode courant
   • Catégories dynamiques (créer / supprimer / réordonner)
   • Tags drag-and-drop pour réordonner
───────────────────────────────────────── */

// Drag state for tags reorder
let tagDragId      = null;   // id of the tag being dragged
let tagDragCat     = null;   // category it belongs to
let tagDragMode    = null;   // mode it belongs to

// Drag state for category reorder
let catDragIdx     = null;   // index in modeCategories array
let catDragMode    = null;

function openTagsModal() {
  renderTagsModal();
  document.getElementById('modal-tags').classList.add('open');
}
function closeTagsModal() { document.getElementById('modal-tags').classList.remove('open'); }

function renderTagsModal() {
  const mode      = currentMode();
  const modeLabel = mode === 'projects' ? '💻 Projets' : '🎮 Jeux';
  const cats      = modeCategories(mode);
  const container = document.getElementById('tags-modal-body');
  if (!container) return;

  // Protected categories that can't be deleted
  const PROTECTED = ['type', 'status'];

  let html = `<p class="tag-mode-title">${modeLabel}</p>`;

  cats.forEach((cat, catIdx) => {
    const catTags = tagsForCat(mode, cat.id);
    const isProtected = PROTECTED.includes(cat.id);

    const tagsHtml = catTags.length
      ? catTags.map((t, tIdx) => `
          <div class="tag-row" draggable="true" data-tag-id="${esc(t.id)}"
               ondragstart="onTagDragStart(event,'${esc(t.id)}','${esc(cat.id)}','${esc(mode)}')"
               ondragover="onTagDragOver(event)"
               ondrop="onTagDrop(event,'${esc(t.id)}','${esc(cat.id)}','${esc(mode)}')"
               ondragleave="onTagDragLeave(event)"
               ondragend="onTagDragEnd(event)">
            <span class="drag-handle" style="font-size:0.9rem;color:var(--text-muted);cursor:grab;flex-shrink:0;">⠿</span>
            <input type="color" value="${esc(t.color||'#888888')}" onchange="updateTagColor('${esc(t.id)}',this.value)">
            <span class="tag-preview-pill" id="pill-${esc(t.id)}"
              style="background:rgba(${hexToRgb(t.color)||'136,136,136'},0.18);color:${esc(t.color||'#888')};border:1px solid rgba(${hexToRgb(t.color)||'136,136,136'},0.4)"
            >${esc(t.label)}</span>
            <input type="text" value="${esc(t.label)}" oninput="updateTagLabel('${esc(t.id)}',this.value)" style="flex:1">
            <button class="btn btn-danger btn-icon" onclick="deleteTag('${esc(t.id)}')">✕</button>
          </div>`)
        .join('')
      : `<span style="font-size:0.78rem;color:var(--text-muted);padding:0.3rem 0;">Aucun tag.</span>`;

    const delCatBtn = isProtected ? '' :
      `<button class="btn btn-danger btn-sm" onclick="deleteCategory('${esc(cat.id)}','${esc(mode)}')" title="Supprimer la catégorie">Supprimer</button>`;

    // Indique où la catégorie apparaît sur le site public :
    // "status" alimente les onglets du menu haut, toutes les autres catégories
    // (type, other, ou toute catégorie personnalisée) alimentent le panneau de filtres latéral.
    const isStatus   = cat.id === 'status';
    const placement  = isStatus
      ? `<span class="tag-cat-placement top" title="Ces tags forment les onglets du menu du haut">↑ Menu haut</span>`
      : `<span class="tag-cat-placement side" title="Ces tags apparaissent comme filtres dans le panneau latéral">☰ Filtres latéraux</span>`;

    html += `
      <div class="tag-cat-section" draggable="true" data-cat-idx="${catIdx}"
           ondragstart="onCatDragStart(event,${catIdx},'${esc(mode)}')"
           ondragover="onCatDragOver(event,${catIdx})"
           ondrop="onCatDrop(event,${catIdx},'${esc(mode)}')"
           ondragleave="onCatDragLeave(event)"
           ondragend="onCatDragEnd(event)">
        <div class="tag-cat-header">
          <span class="drag-handle" style="color:var(--text-muted);cursor:grab;">⠿</span>
          <input type="text" class="tag-cat-title-input" value="${esc(cat.label)}"
                 oninput="updateCategoryLabel('${esc(cat.id)}','${esc(mode)}',this.value)"
                 placeholder="Nom de la catégorie">
          ${placement}
          ${delCatBtn}
        </div>
        <div class="tag-list" id="tag-list-${esc(mode)}-${esc(cat.id)}">
          ${tagsHtml}
        </div>
        <div class="add-tag-row">
          <input type="text"  id="new-tag-label-${esc(cat.id)}-${esc(mode)}" placeholder="Nouveau tag…">
          <input type="color" id="new-tag-color-${esc(cat.id)}-${esc(mode)}" value="${mode === 'projects' ? '#38bdf8' : '#db7093'}" style="width:40px;height:34px;">
          <button type="button" class="btn btn-primary btn-sm" onclick="addTag('${esc(cat.id)}','${esc(mode)}')">Ajouter</button>
        </div>
      </div>`;
  });

  // Add new category section
  html += `
    <div style="border-top:1px solid var(--border);margin:1.25rem 0 0.75rem;"></div>
    <div class="add-cat-row">
      <input type="text" id="new-cat-label-${esc(mode)}" placeholder="Nouvelle catégorie…" style="flex:1;">
      <button type="button" class="btn btn-ghost btn-sm" onclick="addCategory('${esc(mode)}')">+ Catégorie</button>
    </div>`;

  container.innerHTML = html;
}

/* ── Tag drag-and-drop (reorder within a category) ── */
function onTagDragStart(e, tagId, catId, mode) {
  tagDragId   = tagId;
  tagDragCat  = catId;
  tagDragMode = mode;
  e.stopPropagation(); // don't fire category drag
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'tag');
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
}
function onTagDragOver(e) {
  if (e.dataTransfer.types.includes('text/plain')) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }
}
function onTagDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onTagDragEnd(e)   {
  document.querySelectorAll('.tag-row').forEach(el => el.classList.remove('dragging','drag-over'));
  tagDragId = tagDragCat = tagDragMode = null;
}

function onTagDrop(e, targetTagId, catId, mode) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  if (!tagDragId || tagDragId === targetTagId || tagDragCat !== catId || tagDragMode !== mode) return;

  // Get ordered tags in this category
  const catTags = tagsForCat(mode, catId);
  const srcIdx  = catTags.findIndex(t => t.id === tagDragId);
  const dstIdx  = catTags.findIndex(t => t.id === targetTagId);
  if (srcIdx === -1 || dstIdx === -1) return;

  const [moved] = catTags.splice(srcIdx, 1);
  catTags.splice(dstIdx, 0, moved);

  // Reassign sort_order
  catTags.forEach((t, i) => {
    const found = tags.find(x => x.id === t.id);
    if (found) found.sort_order = i;
  });

  renderTagsModal();
  populateTagSelects();
}

/* ── Category drag-and-drop (reorder categories) ── */
function onCatDragStart(e, idx, mode) {
  if (tagDragId) return; // tag drag takes priority
  catDragIdx  = idx;
  catDragMode = mode;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'cat');
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
}
function onCatDragOver(e, idx) {
  if (tagDragId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onCatDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onCatDragEnd(e) {
  document.querySelectorAll('.tag-cat-section').forEach(el => el.classList.remove('dragging','drag-over'));
  catDragIdx = catDragMode = null;
}

function onCatDrop(e, targetIdx, mode) {
  e.preventDefault();
  if (tagDragId) return;
  e.currentTarget.classList.remove('drag-over');
  if (catDragIdx === null || catDragIdx === targetIdx || catDragMode !== mode) return;

  const cats = modeCategories(mode);
  const [moved] = cats.splice(catDragIdx, 1);
  cats.splice(targetIdx, 0, moved);
  // mutate in place
  config.tag_categories[mode] = cats;

  catDragIdx = null;
  renderTagsModal();
}

/* ── Tag CRUD ── */
function updateTagColor(id, color) {
  const t = tagById(id); if (!t) return;
  t.color = color;
  const pill = document.getElementById(`pill-${id}`);
  if (pill) {
    const rgb = hexToRgb(color);
    pill.style.background = `rgba(${rgb},0.18)`;
    pill.style.color      = color;
    pill.style.border     = `1px solid rgba(${rgb},0.4)`;
  }
}

function updateTagLabel(id, label) {
  const t = tagById(id); if (!t) return;
  t.label = label;
  const pill = document.getElementById(`pill-${id}`);
  if (pill) pill.textContent = label;
}

function deleteTag(id) {
  if (!confirm('Supprimer ce tag ? Les entrées l\'utilisant le perdront.')) return;
  tags = tags.filter(t => t.id !== id);
  [games, projects].forEach(col => col.forEach(item => {
    if (item.tag_type === id)   item.tag_type   = '';
    if (item.tag_status === id) item.tag_status = '';
    item.tag_others = (item.tag_others||[]).filter(x => x !== id);
  }));
  renderTagsModal();
  populateTagSelects();
}

function addTag(cat, mode) {
  const inp   = document.getElementById(`new-tag-label-${cat}-${mode}`);
  const col   = document.getElementById(`new-tag-color-${cat}-${mode}`);
  const label = inp.value.trim();
  if (!label) return;
  const id = label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Date.now();
  // sort_order = last in this category
  const maxOrder = Math.max(-1, ...tags.filter(t => (t.mode??'games') === mode && t.category === cat).map(t => t.sort_order ?? 0));
  tags.push({ id, label, category: cat, color: col.value || '#db7093', mode, sort_order: maxOrder + 1 });
  inp.value = '';
  renderTagsModal();
  populateTagSelects();
}

/* ── Category CRUD ── */
function addCategory(mode) {
  const inp   = document.getElementById(`new-cat-label-${mode}`);
  const label = inp.value.trim();
  if (!label) return;
  const id = label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Date.now();
  if (!config.tag_categories[mode]) config.tag_categories[mode] = [];
  config.tag_categories[mode].push({ id, label });
  inp.value = '';
  renderTagsModal();
  populateTagSelects();
}

function deleteCategory(catId, mode) {
  const PROTECTED = ['type','status'];
  if (PROTECTED.includes(catId)) { notify('Cette catégorie est protégée.', true); return; }

  const catTags = tags.filter(t => (t.mode??'games') === mode && t.category === catId);
  if (catTags.length > 0) {
    if (!confirm(`Supprimer la catégorie et ses ${catTags.length} tag(s) ?`)) return;
    const tagIds = new Set(catTags.map(t => t.id));
    tags = tags.filter(t => !tagIds.has(t.id));
    [games, projects].forEach(col => col.forEach(item => {
      item.tag_others = (item.tag_others||[]).filter(x => !tagIds.has(x));
    }));
  } else {
    if (!confirm('Supprimer la catégorie vide ?')) return;
  }

  config.tag_categories[mode] = (config.tag_categories[mode] || []).filter(c => c.id !== catId);
  renderTagsModal();
  populateTagSelects();
}

function updateCategoryLabel(catId, mode, label) {
  const cats = config.tag_categories?.[mode];
  if (!cats) return;
  const cat = cats.find(c => c.id === catId);
  if (cat) cat.label = label;
}

/* ── Save tags + config (categories) + games + projects ── */
async function saveTagsAndClose() {
  // Save tags
  const r1 = await fetch('save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'tags', data: tags })
  });
  const d1 = await r1.json();
  if (!d1.ok) { notify('Erreur sauvegarde tags : ' + (d1.error||'inconnue'), true); return; }

  // Save config (includes tag_categories)
  const r2 = await fetch('save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'config', data: config })
  });
  const d2 = await r2.json();
  if (!d2.ok) { notify('Erreur sauvegarde config : ' + (d2.error||'inconnue'), true); return; }

  // Also persist games/projects since we may have wiped tag references
  await saveGames(false);
  await saveProjects(false);

  closeTagsModal();
  renderList();
  renderFilterBar();
  populateTagSelects();
  notify('Tags sauvegardés !');
}

/* ─────────────────────────────────────────
   Images modal
───────────────────────────────────────── */
let localImages    = [];
let selectedImages = new Set();
let imgSelectMode  = false;
let imgTargetForm  = 'games';

const IMG_FOLDER = {
  games:    { param: 'games',    prefix: 'img/' },
  projects: { param: 'projects', prefix: 'img/projects/' },
};

async function openImagesModal(targetForm = 'games') {
  imgTargetForm = targetForm;
  selectedImages.clear();
  imgSelectMode = false;
  await refreshImageList();
  const label = targetForm === 'projects' ? 'Bibliothèque d\'images — Projets' : 'Bibliothèque d\'images';
  const titleEl = document.querySelector('#modal-images .modal-head-title');
  if (titleEl) titleEl.textContent = label;
  document.getElementById('modal-images').classList.add('open');
}
function closeImagesModal() {
  document.getElementById('modal-images').classList.remove('open');
  selectedImages.clear();
  imgSelectMode = false;
}

async function refreshImageList() {
  const folder = IMG_FOLDER[imgTargetForm]?.param ?? 'games';
  const res = await fetch(`images.php?action=list&folder=${folder}`);
  const d   = await res.json();
  localImages = d.files || [];
  renderImageGrid();
}

function renderImageGrid() {
  const grid   = document.getElementById('img-modal-grid');
  const prefix = IMG_FOLDER[imgTargetForm]?.prefix ?? 'img/';

  if (!localImages.length) {
    grid.innerHTML = `<p class="img-empty">Aucune image dans le dossier ${prefix}</p>`;
    renderBulkBar();
    return;
  }
  const allImages = new Set([...games, ...projects].map(x => x.image).filter(Boolean));

  grid.innerHTML = localImages.map(f => {
    const path   = `${prefix}${f}`;
    const isUsed = allImages.has(path);
    const isSel  = selectedImages.has(f);
    const badge  = !isUsed
      ? `<span class="img-thumb-unused">Non utilisé</span>`
      : '';
    const checkEl = `<span class="img-sel-check${isSel ? ' visible' : ''}">✓</span>`;
    // Le bouton de suppression n'est proposé que pour les images non utilisées,
    // pour éviter de casser une entrée jeu/projet qui y fait encore référence.
    const delBtn = !isUsed
      ? `<button class="img-thumb-del" onclick="deleteLocalImage(event,'${esc(f)}')" title="Supprimer">✕</button>`
      : '';
    return `
    <div class="img-thumb${isSel ? ' selected' : ''}${!isUsed ? ' unused' : ''}" data-file="${esc(f)}" onclick="imgThumbClick(event,'${esc(f)}','${esc(path)}')">
      <img src="${esc(path)}" alt="${esc(f)}" loading="lazy">
      ${delBtn}
      ${badge}
      ${checkEl}
      <span class="img-thumb-name">${esc(f)}</span>
    </div>`;
  }).join('');

  renderBulkBar();
}

function renderBulkBar() {
  const bar = document.getElementById('img-bulk-bar');
  if (!bar) return;
  const count = selectedImages.size;
  if (count === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = `
    <span style="font-size:0.82rem;color:var(--text-secondary);flex:1;">${count} image${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}</span>
    <button class="btn btn-ghost btn-sm" onclick="clearImageSelection()">Désélectionner tout</button>
    <button class="btn btn-danger" onclick="deleteSelectedImages()">Supprimer (${count})</button>`;
}

function imgThumbClick(e, filename, path) {
  if (e.target.classList.contains('img-thumb-del')) return;
  if (imgSelectMode || selectedImages.size > 0) {
    if (selectedImages.has(filename)) selectedImages.delete(filename);
    else selectedImages.add(filename);
    if (selectedImages.size === 0) imgSelectMode = false;
    renderImageGrid();
  } else {
    selectLocalImage(path);
  }
}

function setupImgLongPress() {
  document.getElementById('img-modal-grid')?.addEventListener('pointerdown', e => {
    const thumb = e.target.closest('.img-thumb');
    if (!thumb || e.target.classList.contains('img-thumb-del')) return;
    if (thumb.classList.contains('unused') === false) return; // suppression groupée réservée aux images non utilisées
    const filename = thumb.dataset.file;
    if (!filename) return;
    const timer = setTimeout(() => {
      imgSelectMode = true;
      selectedImages.add(filename);
      renderImageGrid();
    }, 500);
    const cancel = () => clearTimeout(timer);
    thumb.addEventListener('pointerup',   cancel, { once: true });
    thumb.addEventListener('pointermove', cancel, { once: true });
  });
}

function clearImageSelection() {
  selectedImages.clear();
  imgSelectMode = false;
  renderImageGrid();
}

function selectLocalImage(path) {
  if (imgTargetForm === 'projects') {
    document.getElementById('fp-image').value = path;
    updateImgPreviewP(path);
    switchImgSourceP('url');
  } else {
    document.getElementById('f-image').value = path;
    updateImgPreview(path);
    switchImgSource('url');
  }
  closeImagesModal();
}

async function deleteLocalImage(e, filename) {
  e.stopPropagation();
  if (!confirm(`Supprimer "${filename}" ?`)) return;
  const folder = IMG_FOLDER[imgTargetForm]?.param ?? 'games';
  const res = await fetch(`images.php?action=delete&folder=${folder}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  const d = await res.json();
  if (d.ok) { await refreshImageList(); notify('Image supprimée.'); }
  else notify('Erreur : ' + (d.error||'inconnue'), true);
}

async function deleteSelectedImages() {
  const files = [...selectedImages];
  if (!files.length) return;
  if (!confirm(`Supprimer ${files.length} image${files.length > 1 ? 's' : ''} ?`)) return;
  const folder = IMG_FOLDER[imgTargetForm]?.param ?? 'games';
  let errors = 0;
  for (const filename of files) {
    const res = await fetch(`images.php?action=delete&folder=${folder}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    const d = await res.json();
    if (!d.ok) errors++;
  }
  selectedImages.clear();
  imgSelectMode = false;
  await refreshImageList();
  if (!errors) notify(`${files.length} image${files.length > 1 ? 's' : ''} supprimée${files.length > 1 ? 's' : ''}.`);
  else notify(`${errors} erreur(s) lors de la suppression.`, true);
}

function setupUploadZone() {
  const zone  = document.getElementById('upload-zone');
  const input = document.getElementById('upload-input');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-active'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-active'); uploadFiles(e.dataTransfer.files); });
  input.addEventListener('change', () => uploadFiles(input.files));
}

async function uploadFiles(files) {
  if (!files.length) return;
  const total = files.length;
  let done = 0, errors = 0;
  const zone = document.getElementById('upload-zone');
  const progressEl = document.getElementById('upload-progress');
  const setProgress = t => { if (progressEl) progressEl.textContent = t; };
  zone.classList.add('uploading');
  setProgress(total > 1 ? `0 / ${total}` : '');
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    const folder = IMG_FOLDER[imgTargetForm]?.param ?? 'games';
    const res = await fetch(`images.php?action=upload&folder=${folder}`, { method: 'POST', body: fd });
    const d   = await res.json();
    done++;
    if (!d.ok) { errors++; notify('Erreur upload : ' + (d.error||file.name), true); }
    if (total > 1) setProgress(`${done} / ${total}`);
  }
  zone.classList.remove('uploading');
  setProgress('');
  await refreshImageList();
  if (!errors) notify(total > 1 ? `${total} images téléversées !` : 'Image téléversée !');
}

/* ─────────────────────────────────────────
   Save
───────────────────────────────────────── */
async function saveGames(showNotif = true) {
  const res = await fetch('save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'games', data: games })
  });
  const d = await res.json();
  if (d.ok) { renderList(); renderFilterBar(); if (showNotif) notify('Sauvegardé !'); }
  else notify('Erreur : ' + (d.error||'inconnue'), true);
}

async function saveProjects(showNotif = true) {
  const res = await fetch('save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'projects', data: projects })
  });
  const d = await res.json();
  if (d.ok) { renderList(); renderFilterBar(); if (showNotif) notify('Sauvegardé !'); }
  else notify('Erreur : ' + (d.error||'inconnue'), true);
}

function saveCurrentItems(showNotif = true) {
  return currentMode() === 'projects' ? saveProjects(showNotif) : saveGames(showNotif);
}

/* ─────────────────────────────────────────
   Notification
───────────────────────────────────────── */
function notify(msg, isError = false) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.className   = 'notif' + (isError ? ' error' : '');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ─────────────────────────────────────────
   Sidebar (mobile)
───────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

/* ─────────────────────────────────────────
   Close modals on ESC
───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['modal-options','modal-tags','modal-images','modal-game','modal-password'].forEach(id => {
    document.getElementById(id)?.classList.remove('open');
  });
  editingId = null;
});

document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  setupUploadZone();
  switchImgSource('url');
  switchImgSourceP('url');
  setupImgLongPress();

  const fImage = document.getElementById('f-image');
  if (fImage) fImage.addEventListener('input', e => updateImgPreview(e.target.value));

  const fpImage = document.getElementById('fp-image');
  if (fpImage) fpImage.addEventListener('input', e => updateImgPreviewP(e.target.value));
});

/* ── Scroll to top ── */
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 300);
});

/* ─────────────────────────────────────────
   Password modal
───────────────────────────────────────── */
function openPasswordModal() {
  document.getElementById('form-password').reset();
  document.getElementById('pwd-error').style.display = 'none';
  document.getElementById('modal-password').classList.add('open');
}
function closePasswordModal() { document.getElementById('modal-password').classList.remove('open'); }

document.getElementById('form-password').addEventListener('submit', async function(e) {
  e.preventDefault();
  const errEl   = document.getElementById('pwd-error');
  const current = document.getElementById('pwd-current').value;
  const newPwd  = document.getElementById('pwd-new').value;
  const confirm = document.getElementById('pwd-confirm').value;
  errEl.style.display = 'none';
  if (newPwd !== confirm) {
    errEl.textContent = 'Les mots de passe ne correspondent pas.';
    errEl.style.display = 'block';
    return;
  }
  const res = await fetch('save_password.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current, new: newPwd })
  });
  const d = await res.json();
  if (d.ok) { closePasswordModal(); notify('Mot de passe mis à jour !'); }
  else { errEl.textContent = d.error || 'Erreur inconnue.'; errEl.style.display = 'block'; }
});
