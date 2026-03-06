/* ════════════════════════════════════════════════════════════
   Biyom Business — İş Platformu Modülü v1.0
   Görev Yönetimi | Çalışan Rehberi | Takvim | Dosya Merkezi
   Entegrasyon | İş Durumu | Duyuru Kanalları | Raporlar
   ════════════════════════════════════════════════════════════ */

/* ── İş Durumu Seçenekleri ── */
const WORK_STATUSES = [
  { id: 'available',   emoji: '🟢', label: 'Müsait',             color: '#2ecc71' },
  { id: 'busy',        emoji: '🔴', label: 'Meşgul',             color: '#e05555' },
  { id: 'meeting',     emoji: '📅', label: 'Toplantıda',         color: '#f0c040' },
  { id: 'focus',       emoji: '🎯', label: 'Odak Modunda',       color: '#9b59b6' },
  { id: 'vacation',    emoji: '🏖️', label: 'İzinde',             color: '#27ae60' },
  { id: 'remote',      emoji: '🏠', label: 'Uzaktan Çalışıyor',  color: '#3498db' },
  { id: 'offline',     emoji: '⚫', label: 'Görünmez',           color: '#7f8c8d' },
];

/* ── Kanal Türleri ── */
const CHANNEL_TYPES = {
  general:      { icon: '#',   label: 'Genel',         desc: 'Herkese açık kanal' },
  announcement: { icon: '📢',  label: 'Duyuru',        desc: 'Sadece adminler yazabilir' },
  private:      { icon: '🔒',  label: 'Özel',          desc: 'Yalnızca davetliler' },
  task:         { icon: '✅',  label: 'Görev',         desc: 'Görev takibi entegreli' },
  document:     { icon: '📄',  label: 'Doküman',       desc: 'Ortak belge paylaşımı' },
  video:        { icon: '🎥',  label: 'Video Toplantı', desc: 'Görüntülü toplantı odası' },
};

/* ═══════════════════════════════════════════════════════════
   1. İŞ DURUMU YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
function openWorkStatusModal() {
  const old = document.getElementById('_workStatusModal');
  if (old) old.remove();

  const current = _getMyWorkStatus();
  const modal = document.createElement('div');
  modal.id = '_workStatusModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6);">
      <div style="padding:20px 22px 12px;border-bottom:1px solid var(--border);">
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);margin-bottom:4px;">İş Durumunu Ayarla</div>
        <div style="font-size:.78rem;color:var(--muted);">Ekip arkadaşlarınız durumunuzu görecek</div>
      </div>
      <div style="padding:12px;">
        <input id="_workStatusMsg" type="text" maxlength="80" placeholder="Özel durum mesajı (isteğe bağlı)..."
          value="${current.message||''}"
          style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.85rem;margin-bottom:10px;outline:none;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${WORK_STATUSES.map(s => `
            <div onclick="setWorkStatus('${s.id}', document.getElementById('_workStatusMsg').value)"
              style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;cursor:pointer;
                     background:${current.id===s.id?'var(--surface2)':'transparent'};
                     border:1px solid ${current.id===s.id?s.color:'transparent'};transition:all .15s;"
              onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='${current.id===s.id?'var(--surface2)':'transparent'}'">
              <span style="font-size:1.2rem;">${s.emoji}</span>
              <span style="font-size:.88rem;font-weight:600;color:${s.color};">${s.label}</span>
              ${current.id===s.id?'<svg style="margin-left:auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>':''}
            </div>
          `).join('')}
        </div>
      </div>
      <div style="padding:12px 22px 20px;display:flex;gap:10px;">
        <button onclick="document.getElementById('_workStatusModal').remove()"
          style="flex:1;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--muted);cursor:pointer;font-size:.85rem;">İptal</button>
        <button onclick="clearWorkStatus()"
          style="flex:1;padding:10px;background:rgba(224,85,85,.15);border:1px solid rgba(224,85,85,.3);border-radius:10px;color:#e05555;cursor:pointer;font-size:.85rem;font-weight:700;">Temizle</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target===modal) modal.remove(); });
}

async function setWorkStatus(statusId, message='') {
  if (!_cu || !_db) return;
  const status = WORK_STATUSES.find(s => s.id === statusId) || WORK_STATUSES[0];
  const data = { id: statusId, emoji: status.emoji, label: status.label, message: message.trim(), ts: Date.now() };
  try {
    await dbRef(`users/${_cu}/workStatus`).set(data);
    _applyMyStatusBadge(data);
    if (typeof showToast === 'function') showToast(`${status.emoji} ${status.label} olarak ayarlandı`);
  } catch(e) { console.warn('setWorkStatus:', e); }
  const m = document.getElementById('_workStatusModal');
  if (m) m.remove();
}

async function clearWorkStatus() {
  if (!_cu || !_db) return;
  await dbRef(`users/${_cu}/workStatus`).remove().catch(()=>{});
  _applyMyStatusBadge(null);
  if (typeof showToast === 'function') showToast('Durum temizlendi');
  const m = document.getElementById('_workStatusModal');
  if (m) m.remove();
}

function _getMyWorkStatus() {
  return window._myWorkStatus || { id: 'available', emoji: '🟢', label: 'Müsait' };
}

function _applyMyStatusBadge(data) {
  window._myWorkStatus = data;
  const badge = document.getElementById('_workStatusBadge');
  if (!badge) return;
  if (!data || data.id === 'available') {
    badge.textContent = '🟢';
    badge.title = 'Müsait';
  } else {
    badge.textContent = data.emoji;
    badge.title = data.message || data.label;
  }
}

/* ═══════════════════════════════════════════════════════════
   2. GÖREV YÖNETİMİ (Kanban)
   ═══════════════════════════════════════════════════════════ */
const TASK_COLS = [
  { id: 'todo',        label: 'Yapılacak',   color: '#5b9bd5' },
  { id: 'inprogress',  label: 'Devam Ediyor',color: '#f0c040' },
  { id: 'review',      label: 'İncelemede',  color: '#9b59b6' },
  { id: 'done',        label: 'Tamamlandı',  color: '#2ecc71' },
];

const TASK_PRIORITIES = { low: '🔵', medium: '🟡', high: '🔴' };

function openTaskBoard() {
  const scr = document.getElementById('taskBoardScreen');
  if (!scr) return;
  if (typeof deskNav === 'function') deskNav('tasks');
  else { document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); scr.classList.add('active'); }
  _loadTaskBoard();
}

async function _loadTaskBoard() {
  const body = document.getElementById('taskBoardBody');
  if (!body) return;
  body.innerHTML = `<div style="color:var(--muted);padding:20px;font-size:.85rem;">Yükleniyor...</div>`;

  let tasks = {};
  try {
    if (_db) {
      const snap = await dbRef('tasks').once('value');
      tasks = snap.val() || {};
    }
  } catch(e) {}

  const cols = TASK_COLS.map(col => {
    const colTasks = Object.entries(tasks)
      .filter(([,t]) => t.status === col.id)
      .sort(([,a],[,b]) => (b.ts||0)-(a.ts||0));
    return `
      <div style="flex:1;min-width:260px;max-width:320px;display:flex;flex-direction:column;gap:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${col.color};"></div>
            <span style="font-size:.82rem;font-weight:800;color:var(--text-hi);text-transform:uppercase;letter-spacing:.06em;">${col.label}</span>
            <span style="font-size:.72rem;background:var(--surface2);padding:1px 7px;border-radius:100px;color:var(--muted);">${colTasks.length}</span>
          </div>
          ${col.id === 'todo' ? `<div onclick="openCreateTaskModal()" style="width:22px;height:22px;border-radius:6px;background:rgba(91,155,213,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#5b9bd5;" title="Görev Ekle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>` : ''}
        </div>
        <div id="taskCol_${col.id}" style="display:flex;flex-direction:column;gap:8px;min-height:60px;">
          ${colTasks.map(([id, t]) => _taskCard(id, t)).join('')}
        </div>
      </div>`;
  }).join('');

  body.innerHTML = `
    <div style="display:flex;gap:20px;overflow-x:auto;padding:20px;height:100%;align-items:flex-start;">
      ${cols}
    </div>`;
}

function _taskCard(id, t) {
  const pri = TASK_PRIORITIES[t.priority||'medium'] || '🟡';
  const due = t.due ? `<span style="font-size:.7rem;color:${Date.now()>t.due?'#e05555':'var(--muted)'};">📅 ${new Date(t.due).toLocaleDateString('tr-TR')}</span>` : '';
  return `
    <div onclick="openTaskDetail('${id}')"
      style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.borderColor='var(--accent)';this.style.background='var(--surface2)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--surface)'">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
        <span style="font-size:.85rem;flex-shrink:0;">${pri}</span>
        <span style="font-size:.85rem;font-weight:700;color:var(--text-hi);line-height:1.3;">${_esc(t.title)}</span>
      </div>
      ${t.desc?`<div style="font-size:.75rem;color:var(--muted);margin-bottom:6px;line-height:1.4;">${_esc(t.desc).slice(0,80)}${t.desc.length>80?'…':''}</div>`:''}
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        ${due}
        ${t.assignee?`<span style="font-size:.7rem;background:rgba(91,155,213,.15);color:#90caf9;padding:2px 7px;border-radius:100px;">@${_esc(t.assignee)}</span>`:''}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        ${TASK_COLS.filter(c=>c.id!==t.status).map(c=>`
          <button onclick="event.stopPropagation();moveTask('${id}','${c.id}')"
            style="font-size:.68rem;padding:2px 8px;border-radius:6px;background:${c.color}22;border:1px solid ${c.color}44;color:${c.color};cursor:pointer;">${c.label}</button>
        `).join('')}
        <button onclick="event.stopPropagation();deleteTask('${id}')"
          style="font-size:.68rem;padding:2px 8px;border-radius:6px;background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.2);color:#e05555;cursor:pointer;margin-left:auto;">Sil</button>
      </div>
    </div>`;
}

function openCreateTaskModal() {
  const old = document.getElementById('_createTaskModal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = '_createTaskModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:460px;overflow:hidden;">
      <div style="padding:20px 22px;border-bottom:1px solid var(--border);">
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">✅ Yeni Görev</div>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px;">
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:5px;font-weight:600;">BAŞLIK *</div>
          <input id="_taskTitle" type="text" placeholder="Görev başlığı..."
            style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.88rem;outline:none;">
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:5px;font-weight:600;">AÇIKLAMA</div>
          <textarea id="_taskDesc" placeholder="Detaylar..." rows="2"
            style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.85rem;resize:none;outline:none;"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:5px;font-weight:600;">ÖNCELİK</div>
            <select id="_taskPriority" style="width:100%;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.82rem;outline:none;">
              <option value="low">🔵 Düşük</option>
              <option value="medium" selected>🟡 Orta</option>
              <option value="high">🔴 Yüksek</option>
            </select>
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:5px;font-weight:600;">ATANAN</div>
            <input id="_taskAssignee" type="text" placeholder="Kullanıcı adı..."
              style="width:100%;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.82rem;outline:none;">
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:5px;font-weight:600;">TARİH</div>
            <input id="_taskDue" type="date"
              style="width:100%;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.82rem;outline:none;">
          </div>
        </div>
      </div>
      <div style="padding:12px 22px 20px;display:flex;gap:10px;">
        <button onclick="document.getElementById('_createTaskModal').remove()"
          style="flex:1;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--muted);cursor:pointer;">İptal</button>
        <button onclick="submitCreateTask()"
          style="flex:1;padding:10px;background:var(--accent);border:none;border-radius:10px;color:#fff;cursor:pointer;font-weight:800;">Oluştur</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  setTimeout(()=>document.getElementById('_taskTitle')?.focus(), 100);
}

async function submitCreateTask() {
  const title = document.getElementById('_taskTitle')?.value.trim();
  if (!title) { if(typeof showToast==='function') showToast('Başlık gerekli'); return; }
  const task = {
    title,
    desc:      document.getElementById('_taskDesc')?.value.trim() || '',
    priority:  document.getElementById('_taskPriority')?.value || 'medium',
    assignee:  document.getElementById('_taskAssignee')?.value.trim() || '',
    due:       document.getElementById('_taskDue')?.value ? new Date(document.getElementById('_taskDue').value).getTime() : null,
    status:    'todo',
    createdBy: _cu,
    ts:        Date.now(),
  };
  try {
    if (_db) await dbRef('tasks').push(task);
    if(typeof showToast==='function') showToast('✅ Görev oluşturuldu');
    document.getElementById('_createTaskModal')?.remove();
    _loadTaskBoard();
  } catch(e) { console.warn('createTask:', e); }
}

async function moveTask(id, newStatus) {
  try {
    if (_db) await dbRef(`tasks/${id}/status`).set(newStatus);
    _loadTaskBoard();
  } catch(e) {}
}

async function deleteTask(id) {
  if (!confirm('Görevi silmek istiyor musun?')) return;
  try {
    if (_db) await dbRef(`tasks/${id}`).remove();
    if(typeof showToast==='function') showToast('Görev silindi');
    _loadTaskBoard();
  } catch(e) {}
}

async function openTaskDetail(id) {
  try {
    if (!_db) return;
    const snap = await dbRef(`tasks/${id}`).once('value');
    const t = snap.val();
    if (!t) return;
    const old = document.getElementById('_taskDetailModal');
    if (old) old.remove();
    const pri = TASK_PRIORITIES[t.priority||'medium'];
    const colInfo = TASK_COLS.find(c=>c.id===t.status) || TASK_COLS[0];
    const m = document.createElement('div');
    m.id = '_taskDetailModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:460px;overflow:hidden;">
        <div style="padding:20px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.2rem;">${pri}</span>
          <div style="flex:1;">
            <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">${_esc(t.title)}</div>
            <div style="font-size:.75rem;padding:2px 8px;display:inline-block;border-radius:100px;margin-top:4px;background:${colInfo.color}22;color:${colInfo.color};">${colInfo.label}</div>
          </div>
          <div onclick="document.getElementById('_taskDetailModal').remove()" style="cursor:pointer;color:var(--muted);font-size:1.3rem;padding:4px;">×</div>
        </div>
        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px;">
          ${t.desc?`<div style="font-size:.88rem;color:var(--text);line-height:1.5;">${_esc(t.desc)}</div>`:''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.82rem;">
            ${t.assignee?`<div><span style="color:var(--muted);">Atanan: </span><span style="color:var(--text-hi);">@${_esc(t.assignee)}</span></div>`:''}
            ${t.due?`<div><span style="color:var(--muted);">Tarih: </span><span style="color:${Date.now()>t.due?'#e05555':'var(--text-hi)'};">${new Date(t.due).toLocaleDateString('tr-TR')}</span></div>`:''}
            <div><span style="color:var(--muted);">Oluşturan: </span><span style="color:var(--text-hi);">@${_esc(t.createdBy||'-')}</span></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${TASK_COLS.map(c=>`
              <button onclick="moveTask('${id}','${c.id}');document.getElementById('_taskDetailModal').remove()"
                style="font-size:.78rem;padding:5px 12px;border-radius:8px;background:${c.color}22;border:1px solid ${c.color}44;color:${c.color};cursor:pointer;font-weight:700;">${c.label}</button>
            `).join('')}
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════════════
   3. ÇALIŞAN REHBERİ
   ═══════════════════════════════════════════════════════════ */
async function openEmployeeDirectory() {
  const old = document.getElementById('_empDirModal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = '_empDirModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:560px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">Çalışan Rehberi</div>
        <div onclick="m.remove()" style="margin-left:auto;cursor:pointer;color:var(--muted);font-size:1.3rem;">×</div>
      </div>
      <div style="padding:12px 18px;">
        <input id="_empSearch" type="text" placeholder="Kişi ara..." oninput="_filterEmployees(this.value)"
          style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.85rem;outline:none;">
      </div>
      <div id="_empList" style="overflow-y:auto;padding:0 18px 18px;display:flex;flex-direction:column;gap:6px;">
        <div style="color:var(--muted);padding:20px;text-align:center;font-size:.85rem;">Yükleniyor...</div>
      </div>
    </div>`;
  m.querySelector('div>div:last-child')?.addEventListener('click', ()=>m.remove());
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  _loadEmployees();
}

async function _loadEmployees(filter='') {
  const list = document.getElementById('_empList');
  if (!list) return;
  let users = {};
  try {
    if (_db) {
      const snap = await dbRef('users').once('value');
      users = snap.val() || {};
    }
  } catch(e) {}

  const entries = Object.entries(users).filter(([u])=>
    !filter || u.toLowerCase().includes(filter.toLowerCase())
  );
  if (!entries.length) {
    list.innerHTML = `<div style="color:var(--muted);padding:20px;text-align:center;font-size:.85rem;">Kullanıcı bulunamadı</div>`;
    return;
  }
  list.innerHTML = entries.map(([username, u]) => {
    const ws = u.workStatus;
    const statusEmoji = ws?.emoji || '🟢';
    const statusLabel = ws?.label || 'Müsait';
    const statusMsg   = ws?.message || '';
    const initials = username.slice(0,2).toUpperCase();
    const bg = typeof strColor==='function' ? strColor(username) : '#5b9bd5';
    const dept = u.department || u.origin || '';
    const title = u.jobTitle || '';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:var(--surface2);border:1px solid transparent;transition:border-color .15s;cursor:pointer;"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'"
        onclick="document.getElementById('_empDirModal')?.remove();openProfile('${username}')">
        <div style="position:relative;flex-shrink:0;">
          <div style="width:40px;height:40px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:900;color:#fff;">${initials}</div>
          <span style="position:absolute;bottom:-2px;right:-2px;font-size:.75rem;">${statusEmoji}</span>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.9rem;font-weight:700;color:var(--text-hi);">@${_esc(username)}</div>
          ${title?`<div style="font-size:.75rem;color:var(--muted);">${_esc(title)}${dept?` · ${_esc(dept)}`:''}</div>`:''}
          ${statusMsg?`<div style="font-size:.72rem;color:var(--muted);font-style:italic;">"${_esc(statusMsg)}"</div>`:''}
        </div>
        <div style="font-size:.72rem;color:var(--muted);">${statusLabel}</div>
      </div>`;
  }).join('');
}

function _filterEmployees(q) { _loadEmployees(q); }

/* ═══════════════════════════════════════════════════════════
   4. TAKVİM & ETKİNLİKLER
   ═══════════════════════════════════════════════════════════ */
async function openCalendar() {
  const old = document.getElementById('_calendarModal');
  if (old) old.remove();
  const now = new Date();
  const m = document.createElement('div');
  m.id = '_calendarModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';

  let events = {};
  try {
    if (_db) {
      const snap = await dbRef('events').orderByChild('ts').limitToLast(50).once('value');
      events = snap.val() || {};
    }
  } catch(e) {}

  const upcoming = Object.entries(events)
    .filter(([,e]) => e.ts >= Date.now() - 86400000)
    .sort(([,a],[,b]) => a.ts - b.ts);

  const past = Object.entries(events)
    .filter(([,e]) => e.ts < Date.now() - 86400000)
    .sort(([,a],[,b]) => b.ts - a.ts)
    .slice(0, 5);

  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:560px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.3rem;">📅</span>
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">Takvim & Etkinlikler</div>
        <button onclick="_openCreateEventModal()" style="margin-left:auto;padding:6px 14px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:.78rem;font-weight:700;cursor:pointer;">+ Etkinlik</button>
        <div onclick="document.getElementById('_calendarModal').remove()" style="cursor:pointer;color:var(--muted);font-size:1.3rem;padding:4px;">×</div>
      </div>
      <div style="overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:16px;">
        <div>
          <div style="font-size:.75rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Yaklaşan</div>
          ${upcoming.length ? upcoming.map(([id,e]) => _eventCard(id,e)).join('') : `<div style="color:var(--muted);font-size:.85rem;">Yaklaşan etkinlik yok</div>`}
        </div>
        ${past.length ? `<div>
          <div style="font-size:.75rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Geçmiş</div>
          ${past.map(([id,e]) => _eventCard(id,e,true)).join('')}
        </div>` : ''}
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
}

function _eventCard(id, e, past=false) {
  const d = new Date(e.ts);
  const dateStr = d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
  const timeStr = d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  return `
    <div style="display:flex;gap:14px;padding:12px 14px;border-radius:12px;background:var(--surface2);border-left:3px solid ${past?'var(--border)':e.color||'var(--accent)'};opacity:${past?.7:1};margin-bottom:6px;">
      <div style="text-align:center;min-width:40px;">
        <div style="font-size:1.4rem;font-weight:900;color:${past?'var(--muted)':e.color||'var(--accent)'};">${d.getDate()}</div>
        <div style="font-size:.65rem;color:var(--muted);">${d.toLocaleDateString('tr-TR',{month:'short'})}</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:.9rem;font-weight:700;color:var(--text-hi);">${_esc(e.title)}</div>
        ${e.desc?`<div style="font-size:.77rem;color:var(--muted);margin-top:2px;">${_esc(e.desc)}</div>`:''}
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px;">🕐 ${timeStr} · 👤 @${_esc(e.createdBy||'-')}</div>
      </div>
      ${_isAdmin?`<div onclick="deleteEvent('${id}')" style="cursor:pointer;color:var(--muted);font-size:.75rem;padding:2px 6px;border-radius:6px;" onmouseover="this.style.color='#e05555'" onmouseout="this.style.color='var(--muted)'">Sil</div>`:''}
    </div>`;
}

function _openCreateEventModal() {
  const old = document.getElementById('_createEventModal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = '_createEventModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:420px;overflow:hidden;">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);">
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">📅 Yeni Etkinlik</div>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px;">
        <input id="_evTitle" type="text" placeholder="Etkinlik adı..." style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.88rem;outline:none;">
        <textarea id="_evDesc" placeholder="Açıklama..." rows="2" style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.85rem;resize:none;outline:none;"></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">TARİH *</div>
            <input id="_evDate" type="date" style="width:100%;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.82rem;outline:none;">
          </div>
          <div>
            <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">SAAT</div>
            <input id="_evTime" type="time" value="09:00" style="width:100%;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.82rem;outline:none;">
          </div>
        </div>
        <div>
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">RENK</div>
          <div style="display:flex;gap:8px;">
            ${['#5b9bd5','#2ecc71','#f0c040','#e05555','#9b59b6','#e67e22'].map(c=>`
              <div data-color="${c}" onclick="_selectEvColor(this)" style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:border-color .15s;" title="${c}"></div>
            `).join('')}
          </div>
        </div>
      </div>
      <div style="padding:12px 22px 20px;display:flex;gap:10px;">
        <button onclick="document.getElementById('_createEventModal').remove()" style="flex:1;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--muted);cursor:pointer;">İptal</button>
        <button onclick="submitCreateEvent()" style="flex:1;padding:10px;background:var(--accent);border:none;border-radius:10px;color:#fff;cursor:pointer;font-weight:800;">Oluştur</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  window._selectedEvColor = '#5b9bd5';
  m.querySelector('[data-color="#5b9bd5"]').style.borderColor = '#fff';
}

function _selectEvColor(el) {
  document.querySelectorAll('[data-color]').forEach(d=>d.style.borderColor='transparent');
  el.style.borderColor = '#fff';
  window._selectedEvColor = el.dataset.color;
}

async function submitCreateEvent() {
  const title = document.getElementById('_evTitle')?.value.trim();
  const dateVal = document.getElementById('_evDate')?.value;
  if (!title || !dateVal) { if(typeof showToast==='function') showToast('Başlık ve tarih gerekli'); return; }
  const timeVal = document.getElementById('_evTime')?.value || '09:00';
  const ts = new Date(`${dateVal}T${timeVal}`).getTime();
  const event = {
    title, desc: document.getElementById('_evDesc')?.value.trim()||'',
    ts, color: window._selectedEvColor||'#5b9bd5',
    createdBy: _cu, createdAt: Date.now()
  };
  try {
    if (_db) await dbRef('events').push(event);
    if(typeof showToast==='function') showToast('📅 Etkinlik oluşturuldu');
    document.getElementById('_createEventModal')?.remove();
    openCalendar();
  } catch(e) { console.warn(e); }
}

async function deleteEvent(id) {
  if (!_isAdmin) return;
  if (!confirm('Etkinliği silmek istiyor musun?')) return;
  await dbRef(`events/${id}`).remove().catch(()=>{});
  if(typeof showToast==='function') showToast('Etkinlik silindi');
  openCalendar();
}

/* ═══════════════════════════════════════════════════════════
   5. DOSYA MERKEZİ
   ═══════════════════════════════════════════════════════════ */
async function openFileCenter() {
  const old = document.getElementById('_fileCenterModal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = '_fileCenterModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:580px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.2rem;">📁</span>
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">Dosya Merkezi</div>
        <div onclick="document.getElementById('_fileCenterModal').remove()" style="margin-left:auto;cursor:pointer;color:var(--muted);font-size:1.3rem;">×</div>
      </div>
      <div style="padding:12px 18px;">
        <input id="_fileSearch" type="text" placeholder="Dosya ara..." oninput="_filterFiles(this.value)"
          style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--text-hi);font-size:.85rem;outline:none;">
      </div>
      <div id="_fileList" style="overflow-y:auto;padding:0 18px 18px;display:flex;flex-direction:column;gap:6px;">
        <div style="color:var(--muted);padding:20px;text-align:center;font-size:.85rem;">Yükleniyor...</div>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  _loadFiles();
}

async function _loadFiles(filter='') {
  const list = document.getElementById('_fileList');
  if (!list) return;
  // Collect file links from messages
  let files = [];
  try {
    if (_db) {
      const rooms = await dbRef('rooms').once('value');
      const roomIds = Object.keys(rooms.val()||{});
      for (const rid of roomIds.slice(0,10)) {
        const msgs = await dbRef(`msgs/${rid}`).orderByChild('ts').limitToLast(200).once('value');
        const data = msgs.val()||{};
        Object.entries(data).forEach(([,msg]) => {
          if (!msg.text) return;
          const urlMatch = msg.text.match(/https?:\/\/\S+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|png|jpg|jpeg|gif|mp4|mp3|txt)/gi);
          if (urlMatch) urlMatch.forEach(url => files.push({ url, user: msg.user, ts: msg.ts, room: rid }));
          const imgMatch = msg.text.match(/https?:\/\/\S+\.(png|jpg|jpeg|gif|webp)/gi);
          if (imgMatch) imgMatch.forEach(url => { if (!files.find(f=>f.url===url)) files.push({ url, user: msg.user, ts: msg.ts, room: rid }); });
        });
      }
    }
  } catch(e) {}

  files = files.filter(f => !filter || f.url.toLowerCase().includes(filter.toLowerCase()));
  files.sort((a,b) => b.ts - a.ts);

  if (!files.length) {
    list.innerHTML = `<div style="color:var(--muted);padding:30px;text-align:center;font-size:.85rem;">Paylaşılan dosya bulunamadı</div>`;
    return;
  }
  const EXT_ICONS = { pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊', ppt:'📊', pptx:'📊', zip:'🗜️', rar:'🗜️', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', mp4:'🎬', mp3:'🎵', txt:'📄' };
  list.innerHTML = files.slice(0,50).map(f => {
    const ext = f.url.split('.').pop().toLowerCase();
    const icon = EXT_ICONS[ext] || '📎';
    const name = f.url.split('/').pop().split('?')[0];
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface2);">
        <span style="font-size:1.4rem;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.85rem;font-weight:600;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(name)}</div>
          <div style="font-size:.7rem;color:var(--muted);">@${_esc(f.user||'?')} · ${new Date(f.ts||0).toLocaleDateString('tr-TR')}</div>
        </div>
        <a href="${_esc(f.url)}" target="_blank" style="padding:5px 12px;background:rgba(91,155,213,.2);border:1px solid rgba(91,155,213,.3);border-radius:7px;color:#90caf9;font-size:.75rem;font-weight:700;text-decoration:none;">Aç</a>
      </div>`;
  }).join('');
}

function _filterFiles(q) { _loadFiles(q); }

/* ═══════════════════════════════════════════════════════════
   6. ENTEGRASYON / WEBHOOK YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
async function openIntegrations() {
  if (!_isAdmin) { if(typeof showToast==='function') showToast('⛔ Sadece adminler erişebilir'); return; }
  const old = document.getElementById('_intModal');
  if (old) old.remove();

  let webhooks = {};
  try { if(_db) { const s=await dbRef('settings/webhooks').once('value'); webhooks=s.val()||{}; } } catch(e) {}

  const m = document.createElement('div');
  m.id = '_intModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.2rem;">🔗</span>
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">Entegrasyonlar & Webhooklar</div>
        <div onclick="document.getElementById('_intModal').remove()" style="margin-left:auto;cursor:pointer;color:var(--muted);font-size:1.3rem;">×</div>
      </div>
      <div style="overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:16px;">
        <!-- Incoming Webhook -->
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;">
          <div style="font-size:.9rem;font-weight:800;color:var(--text-hi);margin-bottom:4px;">📥 Gelen Webhook</div>
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:12px;">Dış sistemlerden mesaj göndermek için webhook URL'i oluşturun</div>
          <div style="display:flex;gap:8px;">
            <input id="_whChannel" placeholder="Kanal adı (örn: genel)" style="flex:1;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.82rem;outline:none;">
            <button onclick="_createWebhook()" style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:.82rem;font-weight:700;cursor:pointer;">Oluştur</button>
          </div>
        </div>
        <!-- Existing Webhooks -->
        <div>
          <div style="font-size:.8rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Mevcut Webhooklar</div>
          ${Object.entries(webhooks).map(([id,w])=>`
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface2);margin-bottom:6px;">
              <div style="flex:1;">
                <div style="font-size:.85rem;font-weight:700;color:var(--text-hi);">#${_esc(w.channel)}</div>
                <div style="font-size:.7rem;color:var(--muted);font-family:monospace;">${w.token.slice(0,20)}...</div>
              </div>
              <button onclick="_copyWebhookUrl('${w.token}')" style="padding:4px 10px;background:rgba(91,155,213,.2);border:1px solid rgba(91,155,213,.3);border-radius:7px;color:#90caf9;font-size:.72rem;cursor:pointer;">Kopyala</button>
              <button onclick="_deleteWebhook('${id}')" style="padding:4px 10px;background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.2);border-radius:7px;color:#e05555;font-size:.72rem;cursor:pointer;">Sil</button>
            </div>
          `).join('') || `<div style="color:var(--muted);font-size:.82rem;">Henüz webhook yok</div>`}
        </div>
        <!-- Bot / API Info -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;">
          <div style="font-size:.9rem;font-weight:800;color:var(--text-hi);margin-bottom:8px;">🤖 API Kullanımı</div>
          <div style="font-size:.78rem;color:var(--muted);line-height:1.6;">Webhook ile mesaj göndermek için:<br>
            <code style="background:var(--surface);padding:8px 12px;border-radius:8px;display:block;margin-top:6px;font-size:.75rem;color:var(--accent);">
              POST /webhook/{token}<br>
              {"text": "Mesajınız", "username": "Bot Adı"}
            </code>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
}

async function _createWebhook() {
  const channel = document.getElementById('_whChannel')?.value.trim();
  if (!channel) { if(typeof showToast==='function') showToast('Kanal adı girin'); return; }
  const token = _generateToken();
  const wh = { channel, token, createdBy: _cu, createdAt: Date.now() };
  try {
    if (_db) await dbRef('settings/webhooks').push(wh);
    if(typeof showToast==='function') showToast('✅ Webhook oluşturuldu');
    openIntegrations();
  } catch(e) {}
}

function _generateToken() {
  return Array.from({length:32},()=>Math.random().toString(36)[2]).join('');
}

function _copyWebhookUrl(token) {
  const url = `${location.origin}/webhook/${token}`;
  navigator.clipboard?.writeText(url).then(()=>{ if(typeof showToast==='function') showToast('URL kopyalandı'); });
}

async function _deleteWebhook(id) {
  if (!confirm('Webhook silinsin mi?')) return;
  await dbRef(`settings/webhooks/${id}`).remove().catch(()=>{});
  openIntegrations();
}

/* ═══════════════════════════════════════════════════════════
   7. ÇALIŞMA ALANI RAPORLARI
   ═══════════════════════════════════════════════════════════ */
async function openWorkspaceReports() {
  if (!_isAdmin) { if(typeof showToast==='function') showToast('⛔ Sadece adminler erişebilir'); return; }
  const old = document.getElementById('_reportsModal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = '_reportsModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.2rem;">📊</span>
        <div style="font-size:1rem;font-weight:800;color:var(--text-hi);">Çalışma Alanı Raporları</div>
        <div onclick="document.getElementById('_reportsModal').remove()" style="margin-left:auto;cursor:pointer;color:var(--muted);font-size:1.3rem;">×</div>
      </div>
      <div id="_reportBody" style="overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:14px;">
        <div style="color:var(--muted);font-size:.85rem;">Yükleniyor...</div>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  _loadReports();
}

async function _loadReports() {
  const body = document.getElementById('_reportBody');
  if (!body) return;
  let users={}, rooms={}, totalMsgs=0, activeUsers=0;
  try {
    if (_db) {
      const now = Date.now();
      const week = now - 7*86400000;
      const [us, rs] = await Promise.all([
        dbRef('users').once('value'),
        dbRef('rooms').once('value'),
      ]);
      users = us.val()||{};
      rooms = rs.val()||{};
      activeUsers = Object.values(users).filter(u=>u.lastSeen&&u.lastSeen>week).length;
      const roomIds = Object.keys(rooms).slice(0,10);
      for (const rid of roomIds) {
        const s = await dbRef(`msgs/${rid}`).once('value');
        const msgs = s.val()||{};
        const recent = Object.values(msgs).filter(msg=>msg.ts&&msg.ts>week).length;
        totalMsgs += recent;
      }
    }
  } catch(e) {}

  const totalUsers = Object.keys(users).length;
  const totalRooms = Object.keys(rooms).length;
  const tasks = _isAdmin && _db ? await dbRef('tasks').once('value').then(s=>s.val()||{}).catch(()=>({})) : {};
  const taskCounts = { todo:0, inprogress:0, review:0, done:0 };
  Object.values(tasks).forEach(t=>{ if(taskCounts[t.status]!==undefined) taskCounts[t.status]++; });

  body.innerHTML = `
    <!-- Özet Kartlar -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      ${[
        { label:'Toplam Üye', value:totalUsers, icon:'👥', color:'#5b9bd5' },
        { label:'Aktif (7g)', value:activeUsers, icon:'🟢', color:'#2ecc71' },
        { label:'Kanallar', value:totalRooms, icon:'#', color:'#9b59b6' },
        { label:'Mesaj (7g)', value:totalMsgs, icon:'💬', color:'#f0c040' },
      ].map(s=>`
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;margin-bottom:4px;">${s.icon}</div>
          <div style="font-size:1.4rem;font-weight:900;color:${s.color};">${s.value}</div>
          <div style="font-size:.72rem;color:var(--muted);">${s.label}</div>
        </div>
      `).join('')}
    </div>
    <!-- Görev Durumu -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:.88rem;font-weight:800;color:var(--text-hi);margin-bottom:12px;">✅ Görev Durumu</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${TASK_COLS.map(col=>{
          const count = taskCounts[col.id]||0;
          const total = Object.keys(tasks).length||1;
          const pct = Math.round(count/total*100);
          return `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:100px;font-size:.78rem;color:var(--muted);">${col.label}</div>
              <div style="flex:1;height:8px;background:var(--bg2);border-radius:100px;overflow:hidden;">
                <div style="height:100%;background:${col.color};width:${pct}%;border-radius:100px;transition:width .5s;"></div>
              </div>
              <div style="width:30px;font-size:.78rem;color:var(--text-hi);text-align:right;">${count}</div>
            </div>`;
        }).join('')}
      </div>
    </div>
    <!-- Aktif Üyeler -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:.88rem;font-weight:800;color:var(--text-hi);margin-bottom:12px;">👥 Üyeler</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${Object.entries(users).slice(0,20).map(([u,data])=>{
          const bg = typeof strColor==='function' ? strColor(u) : '#5b9bd5';
          return `<div title="@${u}" style="width:32px;height:32px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:#fff;">${u.slice(0,2).toUpperCase()}</div>`;
        }).join('')}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   8. DUYURU KANALI DESTEĞI
   ═══════════════════════════════════════════════════════════ */
function isAnnouncementChannel(roomId) {
  // Check if room is marked as announcement type
  return window._announcementChannels && window._announcementChannels.includes(roomId);
}

function _checkAnnouncementPermission() {
  // If current channel is announcement, only admins can send
  if (!_cRoom) return true;
  if (isAnnouncementChannel(_cRoom) && !_isAdmin) {
    if(typeof showToast==='function') showToast('📢 Duyuru kanallarına sadece adminler yazabilir');
    return false;
  }
  return true;
}

async function loadAnnouncementChannels() {
  try {
    if (!_db) return;
    const snap = await dbRef('settings/announcementChannels').once('value');
    window._announcementChannels = snap.val() || [];
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════════════
   9. BUSINESS SIDEBAR ENHANCEMENTs
   ═══════════════════════════════════════════════════════════ */
function _injectBusinessSidebarTools() {
  const existing = document.getElementById('_bizSidebarTools');
  if (existing) return;
  const sidebar = document.getElementById('deskSidebarHeader');
  if (!sidebar) return;

  const toolBar = document.createElement('div');
  toolBar.id = '_bizSidebarTools';
  toolBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.06);';
  toolBar.innerHTML = `
    <button onclick="openTaskBoard()" title="Görev Yönetimi"
      style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(91,155,213,.12);border:1px solid rgba(91,155,213,.25);border-radius:8px;color:#90caf9;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.background='rgba(91,155,213,.25)'" onmouseout="this.style.background='rgba(91,155,213,.12)'">
      ✅ Görevler
    </button>
    <button onclick="openCalendar()" title="Takvim"
      style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(155,89,182,.12);border:1px solid rgba(155,89,182,.25);border-radius:8px;color:#ce93d8;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.background='rgba(155,89,182,.25)'" onmouseout="this.style.background='rgba(155,89,182,.12)'">
      📅 Takvim
    </button>
    <button onclick="openEmployeeDirectory()" title="Çalışan Rehberi"
      style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(46,204,113,.12);border:1px solid rgba(46,204,113,.25);border-radius:8px;color:#a5d6a7;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.background='rgba(46,204,113,.25)'" onmouseout="this.style.background='rgba(46,204,113,.12)'">
      👥 Rehber
    </button>
    <button onclick="openFileCenter()" title="Dosya Merkezi"
      style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(240,192,64,.12);border:1px solid rgba(240,192,64,.25);border-radius:8px;color:#fff59d;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.background='rgba(240,192,64,.25)'" onmouseout="this.style.background='rgba(240,192,64,.12)'">
      📁 Dosyalar
    </button>
    ${_isAdmin ? `
    <button onclick="openIntegrations()" title="Entegrasyonlar"
      style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(230,126,34,.12);border:1px solid rgba(230,126,34,.25);border-radius:8px;color:#ffcc80;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.background='rgba(230,126,34,.25)'" onmouseout="this.style.background='rgba(230,126,34,.12)'">
      🔗 Entegrasyon
    </button>
    <button onclick="openWorkspaceReports()" title="Raporlar"
      style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(224,85,85,.12);border:1px solid rgba(224,85,85,.25);border-radius:8px;color:#ef9a9a;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;"
      onmouseover="this.style.background='rgba(224,85,85,.25)'" onmouseout="this.style.background='rgba(224,85,85,.12)'">
      📊 Raporlar
    </button>` : ''}`;
  sidebar.parentNode.insertBefore(toolBar, sidebar.nextSibling);
}

/* ═══════════════════════════════════════════════════════════
   10. MOBILE BUSINESS TOOLS BAR
   ═══════════════════════════════════════════════════════════ */
function _injectMobileBusinessBar() {
  const existing = document.getElementById('_mobBizBar');
  if (existing) return;
  const rooms = document.getElementById('roomsScreen');
  if (!rooms) return;
  const bar = document.createElement('div');
  bar.id = '_mobBizBar';
  bar.style.cssText = 'display:flex;gap:8px;padding:8px 14px;overflow-x:auto;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.06);scrollbar-width:none;';
  bar.innerHTML = `
    <div onclick="openTaskBoard()" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:7px 13px;background:rgba(91,155,213,.12);border:1px solid rgba(91,155,213,.25);border-radius:100px;color:#90caf9;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">✅ Görevler</div>
    <div onclick="openCalendar()" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:7px 13px;background:rgba(155,89,182,.12);border:1px solid rgba(155,89,182,.25);border-radius:100px;color:#ce93d8;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">📅 Takvim</div>
    <div onclick="openEmployeeDirectory()" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:7px 13px;background:rgba(46,204,113,.12);border:1px solid rgba(46,204,113,.25);border-radius:100px;color:#a5d6a7;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">👥 Rehber</div>
    <div onclick="openFileCenter()" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:7px 13px;background:rgba(240,192,64,.12);border:1px solid rgba(240,192,64,.25);border-radius:100px;color:#fff59d;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">📁 Dosyalar</div>
    ${_isAdmin ? `<div onclick="openWorkspaceReports()" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:7px 13px;background:rgba(224,85,85,.12);border:1px solid rgba(224,85,85,.25);border-radius:100px;color:#ef9a9a;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">📊 Raporlar</div>` : ''}`;
  const searchRow = rooms.querySelector('.search-row') || rooms.querySelector('#roomsList');
  if (searchRow) rooms.insertBefore(bar, searchRow);
}

/* ═══════════════════════════════════════════════════════════
   YARDIMCI
   ═══════════════════════════════════════════════════════════ */
function _esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════════════
   INIT — onLoginSuccess'e bağlan
   ═══════════════════════════════════════════════════════════ */
(function() {
  const _prevLogin = typeof window.onLoginSuccess === 'function' ? window.onLoginSuccess : null;
  window.onLoginSuccess = function(...args) {
    if (_prevLogin) _prevLogin.apply(this, args);
    setTimeout(() => {
      // Load work status
      if (_cu && _db) {
        dbRef(`users/${_cu}/workStatus`).once('value').then(s=>{
          if(s.val()) _applyMyStatusBadge(s.val());
        }).catch(()=>{});
      }
      // Load announcement channels
      loadAnnouncementChannels();
      // Inject business sidebar tools (desktop)
      _injectBusinessSidebarTools();
      // Inject mobile business bar
      _injectMobileBusinessBar();
      // Update workspace title
      const titles = ['deskSidebarTitle','wsHeaderName','deskSidebarTitle'];
      titles.forEach(id => {
        const el = document.getElementById(id);
        if (el && (el.textContent==='Nature.co'||el.textContent==='Biyom')) el.textContent = 'Biyom Business';
      });
    }, 500);
  };
})();
