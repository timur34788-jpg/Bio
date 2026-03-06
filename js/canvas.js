// ══════════════════════════════════════════
// CANVAS — Eco Belgeleri  (Nature.co)
// Firebase: canvases/{roomId}/{canvasId}
// ══════════════════════════════════════════

let _canvasRoom  = null;
let _canvasId    = null;
let _canvasStop  = null;

// ── Aç ──────────────────────────────────
function openCanvasPanel(roomId) {
  _canvasRoom = roomId || _cRoom;
  const panel = document.getElementById('canvasPanel');
  if (!panel) return;
  panel.style.display = 'flex';
  loadCanvasList();
}

function closeCanvasPanel() {
  document.getElementById('canvasPanel').style.display = 'none';
  if (_canvasStop) { _canvasStop(); _canvasStop = null; }
  _canvasId = null;
}

// ── Liste ────────────────────────────────
async function loadCanvasList() {
  const list = document.getElementById('canvasList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px;font-size:.8rem;">Yükleniyor...</div>';

  const snap = await dbRef('canvases/' + _canvasRoom).once('value').catch(() => null);
  const data = snap ? snap.val() : null;

  showCanvasListView();

  if (!data) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:32px 16px;"><div style="font-size:2rem;margin-bottom:8px;">📄</div><div style="font-size:.85rem;">Henüz belge yok</div><div style="font-size:.75rem;margin-top:4px;">Yeni oluştur ↑</div></div>';
    return;
  }

  list.innerHTML = '';
  Object.entries(data).sort((a,b) => (b[1].updatedAt||0)-(a[1].updatedAt||0)).forEach(([id, cv]) => {
    const d = document.createElement('div');
    d.className = 'canvas-item';
    d.innerHTML = `
      <div class="canvas-item-icon">📄</div>
      <div class="canvas-item-info">
        <div class="canvas-item-title">${esc(cv.title||'İsimsiz Belge')}</div>
        <div class="canvas-item-meta">${cv.author||''} · ${_timeAgo(cv.updatedAt||cv.createdAt)}</div>
      </div>
      <div class="canvas-item-del" onclick="deleteCanvas('${id}',event)" title="Sil">✕</div>
    `;
    d.onclick = () => openCanvasEditor(id, cv);
    list.appendChild(d);
  });
}

// ── Editör ───────────────────────────────
function openCanvasEditor(id, data) {
  _canvasId = id || ('cv_' + Date.now());
  const isNew = !id;

  document.getElementById('canvasTitleInput').value = data?.title || '';
  document.getElementById('canvasEditor').value = data?.body || '';
  document.getElementById('canvasAuthorLabel').textContent = data?.author ? 'Son: ' + data.author : '';

  showCanvasEditorView();
  _renderCanvasPreview();

  // Gerçek zamanlı dinle
  if (_canvasStop) _canvasStop();
  const ref = dbRef('canvases/' + _canvasRoom + '/' + _canvasId);
  const handler = ref.on('value', snap => {
    const d = snap.val();
    if (!d) return;
    // Sadece başkası değiştirdiyse güncelle
    if (d.lastEditor && d.lastEditor !== _cu) {
      const ed = document.getElementById('canvasEditor');
      if (ed && document.activeElement !== ed) {
        ed.value = d.body || '';
        _renderCanvasPreview();
      }
    }
  });
  _canvasStop = () => ref.off('value', handler);
}

function showCanvasListView() {
  document.getElementById('canvasListView').style.display = 'flex';
  document.getElementById('canvasEditorView').style.display = 'none';
}

function showCanvasEditorView() {
  document.getElementById('canvasListView').style.display = 'none';
  document.getElementById('canvasEditorView').style.display = 'flex';
}

function newCanvas() {
  openCanvasEditor(null, { title: '', body: '' });
}

async function saveCanvas() {
  const title = document.getElementById('canvasTitleInput').value.trim() || 'İsimsiz Belge';
  const body  = document.getElementById('canvasEditor').value;
  const id    = _canvasId || ('cv_' + Date.now());

  await dbRef('canvases/' + _canvasRoom + '/' + id).update({
    title, body,
    author: _cu,
    lastEditor: _cu,
    updatedAt: Date.now(),
    createdAt: (await dbRef('canvases/' + _canvasRoom + '/' + id + '/createdAt').once('value')).val() || Date.now()
  });

  showToast('📄 Belge kaydedildi', title);
  showCanvasListView();
  loadCanvasList();
}

async function deleteCanvas(id, e) {
  e && e.stopPropagation();
  if (!confirm('Bu belgeyi silmek istiyor musun?')) return;
  await dbRef('canvases/' + _canvasRoom + '/' + id).remove();
  loadCanvasList();
}

// ── Canvas toolbar ───────────────────────
function canvasInsert(tag) {
  const ed = document.getElementById('canvasEditor');
  const start = ed.selectionStart, end = ed.selectionEnd;
  const sel = ed.value.substring(start, end);
  const map = {
    bold: `**${sel||'metin'}**`,
    italic: `_${sel||'metin'}_`,
    h1: `\n# ${sel||'Başlık'}`,
    h2: `\n## ${sel||'Alt Başlık'}`,
    list: `\n- ${sel||'Madde'}`,
    check: `\n- [ ] ${sel||'Görev'}`,
    code: `\`${sel||'kod'}\``,
    hr: `\n---\n`,
    link: `[${sel||'metin'}](url)`,
    eco: `\n🌿 **Eko Not:** ${sel||''}`,
  };
  const ins = map[tag] || sel;
  ed.value = ed.value.substring(0, start) + ins + ed.value.substring(end);
  ed.focus();
  ed.selectionStart = ed.selectionEnd = start + ins.length;
  _renderCanvasPreview();
}

function _renderCanvasPreview() {
  const src = document.getElementById('canvasEditor').value;
  const pre = document.getElementById('canvasPreview');
  if (!pre) return;
  // Basit Markdown → HTML
  let html = src
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$2</h2>'.replace('$2','$1'))
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- \[ \] (.+)$/gm, '<label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" disabled> $1</label>')
    .replace(/^- \[x\] (.+)$/gm, '<label style="display:flex;gap:6px;align-items:center;text-decoration:line-through;opacity:.6"><input type="checkbox" checked disabled> $1</label>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/🌿 \*\*Eko Not:\*\*/g, '<span style="color:var(--green);font-weight:700;">🌿 Eko Not:</span>')
    .replace(/\n/g, '<br>');
  pre.innerHTML = html;
}

// ── Canvas CSS ───────────────────────────
(function injectCanvasCSS() {
  const s = document.createElement('style');
  s.textContent = `
#canvasPanel {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.75);
  z-index: 4000;
  align-items: flex-end;
  justify-content: center;
}
.canvas-sheet {
  background: var(--bg2);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 680px;
  height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
}
.canvas-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.canvas-header-title { font-size:.95rem; font-weight:800; color:var(--text-hi); flex:1; }
.canvas-close { width:30px;height:30px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.9rem;color:var(--muted);border:none; }
.canvas-new-btn { display:flex;align-items:center;gap:5px;background:var(--green);color:#000;font-weight:700;font-size:.78rem;border:none;border-radius:8px;padding:7px 12px;cursor:pointer; }
#canvasListView { flex:1;flex-direction:column;overflow:hidden; }
.canvas-list-body { flex:1;overflow-y:auto;padding:8px; }
.canvas-item { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--border); }
.canvas-item:hover { background:var(--surface); }
.canvas-item-icon { font-size:1.4rem;flex-shrink:0; }
.canvas-item-info { flex:1;min-width:0; }
.canvas-item-title { font-size:.85rem;font-weight:700;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.canvas-item-meta { font-size:.68rem;color:var(--muted);margin-top:1px; }
.canvas-item-del { color:var(--muted);padding:4px 6px;border-radius:6px;cursor:pointer;font-size:.8rem;flex-shrink:0; }
.canvas-item-del:hover { color:var(--red);background:rgba(224,85,85,.1); }
#canvasEditorView { flex:1;flex-direction:column;overflow:hidden; }
.canvas-editor-header { display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);flex-shrink:0; }
.canvas-title-inp { flex:1;background:transparent;border:none;outline:none;font-size:.95rem;font-weight:800;color:var(--text-hi);font-family:inherit; }
.canvas-save-btn { background:var(--accent);color:#fff;font-weight:700;font-size:.75rem;border:none;border-radius:8px;padding:7px 14px;cursor:pointer; }
.canvas-back-btn { background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:1rem;padding:4px; }
.canvas-toolbar { display:flex;gap:3px;padding:8px 12px;border-bottom:1px solid var(--border);flex-wrap:wrap;flex-shrink:0;background:var(--bg); }
.canvas-tb-btn { background:var(--surface);border:none;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:.75rem;color:var(--text);font-weight:700;transition:background .15s; }
.canvas-tb-btn:hover { background:var(--surface2);color:var(--accent); }
.canvas-body { flex:1;display:flex;overflow:hidden; }
#canvasEditor { flex:1;background:var(--bg);border:none;outline:none;padding:14px;font-size:.85rem;color:var(--text);font-family:'DM Mono',monospace;resize:none;line-height:1.65; }
#canvasPreview { flex:1;padding:14px;font-size:.85rem;color:var(--text);overflow-y:auto;line-height:1.65;display:none; }
#canvasPreview h1{font-size:1.2rem;font-weight:900;color:var(--text-hi);margin:10px 0 6px;}
#canvasPreview h2{font-size:1rem;font-weight:800;color:var(--text-hi);margin:8px 0 4px;}
#canvasPreview h3{font-size:.9rem;font-weight:700;color:var(--text-hi);margin:6px 0 3px;}
#canvasPreview code{background:var(--surface);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:.8rem;}
#canvasPreview hr{border:none;border-top:1px solid var(--border);margin:10px 0;}
#canvasPreview a{color:var(--accent);}
#canvasPreview li{margin-left:18px;margin-bottom:3px;}
.canvas-tab-bar { display:flex;border-top:1px solid var(--border);flex-shrink:0; }
.canvas-tab-btn { flex:1;background:transparent;border:none;padding:9px;font-size:.75rem;color:var(--muted);cursor:pointer;font-weight:700;font-family:inherit;transition:color .15s; }
.canvas-tab-btn.active { color:var(--accent);border-bottom:2px solid var(--accent); }
`;
  document.head.appendChild(s);
})();

window.openCanvasPanel  = openCanvasPanel;
window.closeCanvasPanel = closeCanvasPanel;
window.newCanvas        = newCanvas;
window.saveCanvas       = saveCanvas;
window.deleteCanvas     = deleteCanvas;
window.canvasInsert     = canvasInsert;
window.switchCanvasTab  = function(tab) {
  const ed  = document.getElementById('canvasEditor');
  const pre = document.getElementById('canvasPreview');
  document.querySelectorAll('.canvas-tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'edit') { ed.style.display='block'; pre.style.display='none'; }
  else { _renderCanvasPreview(); ed.style.display='none'; pre.style.display='block'; }
};
