// ══════════════════════════════════════════
// LISTS — Görev Listesi  (Nature.co)
// Firebase: lists/{roomId}/{listId}
// ══════════════════════════════════════════

let _listsRoom = null;
let _listsStop = null;
let _activeListId = null;

function openListsPanel(roomId) {
  _listsRoom = roomId || _cRoom;
  document.getElementById('listsPanel').style.display = 'flex';
  loadLists();
}

function closeListsPanel() {
  document.getElementById('listsPanel').style.display = 'none';
  if (_listsStop) { _listsStop(); _listsStop = null; }
  _activeListId = null;
}

async function loadLists() {
  showListsHome();
  const body = document.getElementById('listsHomeBody');
  body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:.8rem;">Yükleniyor...</div>';

  const snap = await dbRef('lists/' + _listsRoom).once('value').catch(() => null);
  const data = snap ? snap.val() : null;

  if (!data) {
    body.innerHTML = `<div style="text-align:center;color:var(--muted);padding:36px 16px;">
      <div style="font-size:2.2rem;margin-bottom:10px;">✅</div>
      <div style="font-size:.9rem;font-weight:700;color:var(--text-hi);margin-bottom:4px;">Görev listesi yok</div>
      <div style="font-size:.78rem;">Yeni liste oluştur ↑</div>
    </div>`;
    return;
  }

  body.innerHTML = '';
  Object.entries(data).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).forEach(([id, lst]) => {
    const items = lst.items ? Object.values(lst.items) : [];
    const done  = items.filter(i=>i.done).length;
    const pct   = items.length ? Math.round(done/items.length*100) : 0;

    const d = document.createElement('div');
    d.className = 'list-card';
    d.innerHTML = `
      <div class="list-card-top">
        <div class="list-card-emoji">${lst.emoji||'📋'}</div>
        <div class="list-card-info">
          <div class="list-card-title">${esc(lst.title||'İsimsiz Liste')}</div>
          <div class="list-card-meta">${items.length} görev · ${done} tamamlandı</div>
        </div>
        <div class="list-card-del" onclick="deleteList('${id}',event)" title="Sil">✕</div>
      </div>
      ${items.length ? `
      <div class="list-progress-bar">
        <div class="list-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="list-progress-pct">${pct}%</div>` : ''}
    `;
    d.onclick = () => openListEditor(id, lst);
    body.appendChild(d);
  });
}

function openListEditor(id, data) {
  _activeListId = id;
  document.getElementById('listEditorTitle').textContent = data?.title || 'İsimsiz Liste';
  document.getElementById('listEditorEmoji').textContent = data?.emoji || '📋';
  showListEditor();
  renderListItems(data?.items || {});

  // Gerçek zamanlı dinle
  if (_listsStop) _listsStop();
  const ref = dbRef('lists/' + _listsRoom + '/' + id + '/items');
  const fn = ref.on('value', snap => renderListItems(snap.val() || {}));
  _listsStop = () => ref.off('value', fn);
}

function renderListItems(items) {
  const body = document.getElementById('listItemsBody');
  const arr  = Object.entries(items).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));

  if (!arr.length) {
    body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px;font-size:.8rem;">Görev ekle ↓</div>';
    return;
  }

  body.innerHTML = '';
  arr.forEach(([iid, item]) => {
    const d = document.createElement('div');
    d.className = 'list-item' + (item.done ? ' done' : '');
    d.innerHTML = `
      <div class="list-item-check" onclick="toggleListItem('${iid}',${!item.done})">
        ${item.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      <div class="list-item-text">${esc(item.text||'')}</div>
      ${item.assignee ? `<div class="list-item-tag">@${esc(item.assignee)}</div>` : ''}
      ${item.due ? `<div class="list-item-tag due">📅 ${item.due}</div>` : ''}
      <div class="list-item-del" onclick="deleteListItem('${iid}')">✕</div>
    `;
    body.appendChild(d);
  });
}

async function addListItem() {
  const inp = document.getElementById('listItemInput');
  const text = inp.value.trim();
  if (!text || !_activeListId) return;

  // @mention ve tarih parse et
  const assignee = (text.match(/@(\w+)/) || [])[1] || null;
  const due      = (text.match(/:\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
  const cleanText = text.replace(/@\w+/,'').replace(/:\s*\d{4}-\d{2}-\d{2}/,'').trim();

  await dbRef('lists/' + _listsRoom + '/' + _activeListId + '/items').push({
    text: cleanText, done: false, assignee, due,
    createdBy: _cu, createdAt: Date.now()
  });
  inp.value = '';
}

async function toggleListItem(iid, done) {
  await dbRef('lists/' + _listsRoom + '/' + _activeListId + '/items/' + iid).update({ done });
}

async function deleteListItem(iid) {
  await dbRef('lists/' + _listsRoom + '/' + _activeListId + '/items/' + iid).remove();
}

async function deleteList(id, e) {
  e && e.stopPropagation();
  if (!confirm('Bu listeyi silmek istiyor musun?')) return;
  await dbRef('lists/' + _listsRoom + '/' + id).remove();
  loadLists();
}

function showNewListForm() {
  const title = prompt('Liste başlığı:');
  if (!title) return;
  const emojis = ['📋','✅','🌿','🎯','🔥','📌','🗒️','⚡'];
  const emoji  = emojis[Math.floor(Math.random() * emojis.length)];
  const id     = 'lst_' + Date.now();
  dbRef('lists/' + _listsRoom + '/' + id).set({
    title, emoji, createdBy: _cu, createdAt: Date.now()
  }).then(() => loadLists());
}

function showListsHome() {
  document.getElementById('listsHomeView').style.display = 'flex';
  document.getElementById('listsEditorView').style.display = 'none';
}
function showListEditor() {
  document.getElementById('listsHomeView').style.display = 'none';
  document.getElementById('listsEditorView').style.display = 'flex';
}

// ── CSS ──────────────────────────────────
(function injectListsCSS() {
  const s = document.createElement('style');
  s.textContent = `
#listsPanel {
  display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:4000;
  align-items:flex-end;justify-content:center;
}
.lists-sheet {
  background:var(--bg2);border-radius:20px 20px 0 0;
  width:100%;max-width:680px;height:88dvh;
  display:flex;flex-direction:column;overflow:hidden;
  border:1px solid var(--border);
}
.lists-header {
  display:flex;align-items:center;gap:10px;
  padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;
}
.lists-header-title { font-size:.95rem;font-weight:800;color:var(--text-hi);flex:1; }
.lists-new-btn { display:flex;align-items:center;gap:5px;background:var(--green);color:#000;font-weight:700;font-size:.78rem;border:none;border-radius:8px;padding:7px 12px;cursor:pointer; }
.lists-close { width:30px;height:30px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.9rem;color:var(--muted);border:none; }
#listsHomeView { flex:1;flex-direction:column;overflow:hidden; }
.lists-home-body { flex:1;overflow-y:auto;padding:10px; }
.list-card { background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;transition:border-color .2s; }
.list-card:hover { border-color:var(--accent); }
.list-card-top { display:flex;align-items:center;gap:10px; }
.list-card-emoji { font-size:1.6rem;flex-shrink:0; }
.list-card-info { flex:1;min-width:0; }
.list-card-title { font-size:.88rem;font-weight:700;color:var(--text-hi); }
.list-card-meta { font-size:.7rem;color:var(--muted);margin-top:2px; }
.list-card-del { color:var(--muted);padding:4px 6px;border-radius:6px;cursor:pointer;font-size:.8rem;flex-shrink:0; }
.list-card-del:hover { color:var(--red); }
.list-progress-bar { height:4px;background:var(--surface2);border-radius:2px;margin-top:10px;overflow:hidden; }
.list-progress-fill { height:100%;background:var(--green);border-radius:2px;transition:width .4s; }
.list-progress-pct { font-size:.65rem;color:var(--green);margin-top:3px;font-weight:700; }
#listsEditorView { flex:1;flex-direction:column;overflow:hidden; }
.list-editor-header { display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0; }
#listEditorEmoji { font-size:1.4rem;cursor:pointer; }
#listEditorTitle { font-size:.95rem;font-weight:800;color:var(--text-hi);flex:1; }
.list-back-btn { background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:1rem;padding:4px; }
#listItemsBody { flex:1;overflow-y:auto;padding:8px; }
.list-item { display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;border-bottom:1px solid var(--border);transition:background .15s; }
.list-item:hover { background:var(--surface); }
.list-item.done .list-item-text { text-decoration:line-through;opacity:.5; }
.list-item-check { width:22px;height:22px;border-radius:6px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s; }
.list-item.done .list-item-check { background:var(--green);border-color:var(--green); }
.list-item-text { flex:1;font-size:.82rem;color:var(--text); }
.list-item-tag { font-size:.62rem;font-weight:700;padding:2px 7px;border-radius:100px;background:var(--surface2);color:var(--muted);flex-shrink:0; }
.list-item-tag.due { color:var(--yellow); }
.list-item-del { color:var(--muted);font-size:.75rem;cursor:pointer;padding:3px 5px;border-radius:5px;flex-shrink:0; }
.list-item-del:hover { color:var(--red);background:rgba(224,85,85,.1); }
.list-add-row { display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border);flex-shrink:0; }
.list-add-inp { flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:.82rem;color:var(--text);outline:none;font-family:inherit; }
.list-add-inp:focus { border-color:var(--accent); }
.list-add-btn { background:var(--accent);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:.82rem;font-weight:700;cursor:pointer; }
.list-add-hint { font-size:.62rem;color:var(--muted);padding:0 12px 8px; }
`;
  document.head.appendChild(s);
})();

window.openListsPanel = openListsPanel;
window.closeListsPanel = closeListsPanel;
window.showNewListForm = showNewListForm;
window.openListEditor = openListEditor;
window.addListItem = addListItem;
window.toggleListItem = toggleListItem;
window.deleteListItem = deleteListItem;
window.deleteList = deleteList;
window.showListsHome = showListsHome;
