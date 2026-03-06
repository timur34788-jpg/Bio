// ══════════════════════════════════════════
// FEATURES.JS — Nature.co
// Bookmarks · Saved Items · Reminders
// Status/DND · Slash Komutlar · Thread Panel
// ══════════════════════════════════════════

// ─────────────────────────────────────────
// 1. BOOKMARKS — Kanal Yer İşaretleri
// Firebase: bookmarks/{roomId}/{id}
// ─────────────────────────────────────────
async function addBookmark(roomId, label, url) {
  if (!roomId) roomId = _cRoom;
  const id = 'bm_' + Date.now();
  await dbRef('bookmarks/' + roomId + '/' + id).set({
    label: label || 'Yer İşareti', url: url || '', addedBy: _cu, addedAt: Date.now()
  });
  loadBookmarks(roomId);
}

async function loadBookmarks(roomId) {
  const bar = document.getElementById('bookmarkBar');
  if (!bar) return;
  const snap = await dbRef('bookmarks/' + roomId).once('value').catch(() => null);
  const data = snap ? snap.val() : null;
  if (!data) { bar.style.display = 'none'; return; }

  bar.style.display = 'flex';
  bar.innerHTML = Object.entries(data).map(([id, bm]) =>
    `<a class="bm-chip" href="${esc(bm.url||'#')}" target="_blank" title="${esc(bm.label||'')}">
      🔖 ${esc((bm.label||'').slice(0,20))}
      <span class="bm-del" onclick="removeBookmark('${roomId}','${id}',event)">✕</span>
    </a>`
  ).join('') +
  `<button class="bm-add-btn" onclick="promptAddBookmark('${roomId}')">+ Ekle</button>`;
}

async function removeBookmark(roomId, id, e) {
  e && e.stopPropagation();
  await dbRef('bookmarks/' + roomId + '/' + id).remove();
  loadBookmarks(roomId);
}

function promptAddBookmark(roomId) {
  const label = prompt('Yer işareti adı:');
  if (!label) return;
  const url = prompt('Link (isteğe bağlı):') || '';
  addBookmark(roomId, label, url);
}

// ─────────────────────────────────────────
// 2. SAVED ITEMS — Kaydedilenler
// Firebase: savedItems/{username}/{id}
// ─────────────────────────────────────────
async function saveMessage(roomId, msgKey, text, author) {
  if (!_cu) return;
  const id = 'sv_' + Date.now();
  await dbRef('savedItems/' + _cu + '/' + id).set({
    roomId, msgKey, text: (text||'').slice(0,300), author, savedAt: Date.now()
  });
  showToast('🔖 Kaydedildi', 'Kaydedilenler\'e eklendi');
}

async function openSavedItems() {
  const modal = document.getElementById('savedItemsModal');
  modal.style.display = 'flex';
  const body = document.getElementById('savedItemsBody');
  body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px;">Yükleniyor...</div>';

  const snap = await dbRef('savedItems/' + _cu).once('value').catch(() => null);
  const data = snap ? snap.val() : null;

  if (!data) {
    body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:36px 16px;"><div style="font-size:2rem;margin-bottom:8px;">🔖</div><div>Henüz kaydedilen mesaj yok</div></div>';
    return;
  }

  body.innerHTML = Object.entries(data)
    .sort((a,b) => (b[1].savedAt||0)-(a[1].savedAt||0))
    .map(([id, item]) => `
      <div class="saved-item">
        <div class="saved-item-author">💬 ${esc(item.author||'')}</div>
        <div class="saved-item-text">"${esc((item.text||'').slice(0,200))}"</div>
        <div class="saved-item-meta">${_timeAgo(item.savedAt)}</div>
        <button class="saved-item-del" onclick="deleteSavedItem('${id}')">Kaldır</button>
      </div>
    `).join('');
}

async function deleteSavedItem(id) {
  await dbRef('savedItems/' + _cu + '/' + id).remove();
  openSavedItems();
}

function closeSavedItems() {
  document.getElementById('savedItemsModal').style.display = 'none';
}

// ─────────────────────────────────────────
// 3. REMINDERS — Hatırlatıcılar
// Firebase: reminders/{username}/{id}
// ─────────────────────────────────────────
let _reminderTimers = [];

async function addReminder(text, timeStr, roomId, msgKey) {
  if (!_cu) return;
  const id = 'rm_' + Date.now();
  const ts = _parseReminderTime(timeStr);
  if (!ts) { showToast('⚠️ Geçersiz zaman', 'Örn: 10d, 2s, 30dk'); return; }

  await dbRef('reminders/' + _cu + '/' + id).set({
    text, ts, roomId: roomId||null, msgKey: msgKey||null,
    createdAt: Date.now(), done: false
  });
  _scheduleReminder(id, text, ts);
  showToast('⏰ Hatırlatıcı Kuruldu', _timeAgo(ts, true));
}

function _parseReminderTime(str) {
  if (!str) return null;
  const now = Date.now();
  const m = str.match(/^(\d+)(dk|s|sa|h|g|d|w)$/i);
  if (!m) {
    const d = new Date(str);
    return isNaN(d) ? null : d.getTime();
  }
  const n = parseInt(m[1]);
  const unit = m[2].toLowerCase();
  const map = { dk:60000, s:1000, sa:3600000, h:3600000, g:86400000, d:86400000, w:604800000 };
  return now + n * (map[unit]||60000);
}

function _scheduleReminder(id, text, ts) {
  const delay = ts - Date.now();
  if (delay <= 0) return;
  const t = setTimeout(async () => {
    showToast('⏰ Hatırlatıcı', text);
    await dbRef('reminders/' + _cu + '/' + id).update({ done: true });
  }, Math.min(delay, 2147483647));
  _reminderTimers.push(t);
}

async function loadReminders() {
  if (!_cu) return;
  const snap = await dbRef('reminders/' + _cu).once('value').catch(() => null);
  const data = snap ? snap.val() : null;
  if (!data) return;
  Object.entries(data).forEach(([id, r]) => {
    if (!r.done && r.ts > Date.now()) _scheduleReminder(id, r.text, r.ts);
  });
}

async function openRemindersModal() {
  const modal = document.getElementById('remindersModal');
  modal.style.display = 'flex';
  const body = document.getElementById('remindersBody');
  body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px;">Yükleniyor...</div>';

  const snap = await dbRef('reminders/' + _cu).once('value').catch(() => null);
  const data = snap ? snap.val() : null;

  if (!data) {
    body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:36px 16px;"><div style="font-size:2rem;margin-bottom:8px;">⏰</div><div>Henüz hatırlatıcı yok</div></div>';
    return;
  }

  const items = Object.entries(data)
    .filter(([,r]) => !r.done)
    .sort((a,b) => a[1].ts - b[1].ts);

  if (!items.length) {
    body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:36px 16px;"><div style="font-size:2rem;margin-bottom:8px;">✅</div><div>Tüm hatırlatıcılar tamamlandı</div></div>';
    return;
  }

  body.innerHTML = items.map(([id, r]) => `
    <div class="reminder-item">
      <div class="reminder-item-icon">⏰</div>
      <div class="reminder-item-info">
        <div class="reminder-item-text">${esc(r.text||'')}</div>
        <div class="reminder-item-time">${new Date(r.ts).toLocaleString('tr-TR')}</div>
      </div>
      <button class="reminder-item-del" onclick="deleteReminder('${id}')">✕</button>
    </div>
  `).join('');
}

async function deleteReminder(id) {
  await dbRef('reminders/' + _cu + '/' + id).remove();
  openRemindersModal();
}

function closeRemindersModal() {
  document.getElementById('remindersModal').style.display = 'none';
}

// ─────────────────────────────────────────
// 4. STATUS / DND — Durum
// Firebase: users/{username}/status
// ─────────────────────────────────────────
const STATUS_PRESETS = [
  { emoji:'🌿', text:'Doğayla Meşgul', clear:'30dk' },
  { emoji:'🎯', text:'Odaklanıyorum', clear:'1s' },
  { emoji:'🌊', text:'Mola', clear:'15dk' },
  { emoji:'🚴', text:'Dışarıdayım', clear:'2s' },
  { emoji:'😴', text:'Rahatsız Etme', clear:'8s', dnd:true },
  { emoji:'🌙', text:'Uyku Modu', clear:'8s', dnd:true },
  { emoji:'💻', text:'Çalışıyorum', clear:null },
  { emoji:'✈️', text:'Tatilde', clear:null },
];

function openStatusModal() {
  document.getElementById('statusModal').style.display = 'flex';
  _loadCurrentStatus();
}

function closeStatusModal() {
  document.getElementById('statusModal').style.display = 'none';
}

async function _loadCurrentStatus() {
  const snap = await dbRef('users/' + _cu + '/statusObj').once('value').catch(() => null);
  const s = snap ? snap.val() : null;
  if (s) {
    document.getElementById('statusEmojiInput').value = s.emoji || '';
    document.getElementById('statusTextInput').value  = s.text  || '';
    document.getElementById('statusDndToggle').checked = !!s.dnd;
  }
}

async function setStatus(emoji, text, dnd, clearAfterMs) {
  const obj = { emoji: emoji||'', text: text||'', dnd:!!dnd, setAt: Date.now() };
  if (clearAfterMs) obj.clearAt = Date.now() + clearAfterMs;
  await dbRef('users/' + _cu + '/statusObj').set(obj);

  // DND ayrıca
  await dbRef('users/' + _cu + '/dnd').set(!!dnd);

  _applyStatusUI(emoji, text);
  if (clearAfterMs) setTimeout(() => clearStatus(), clearAfterMs);
  closeStatusModal();
  showToast(emoji||'💬', text || 'Durum güncellendi');
}

async function clearStatus() {
  await dbRef('users/' + _cu + '/statusObj').remove();
  await dbRef('users/' + _cu + '/dnd').set(false);
  _applyStatusUI('', '');
}

function _applyStatusUI(emoji, text) {
  const el = document.getElementById('myStatusBadge');
  if (!el) return;
  if (emoji || text) {
    el.style.display = 'flex';
    el.textContent   = (emoji||'') + ' ' + (text||'');
  } else {
    el.style.display = 'none';
  }
}

function applyStatusPreset(idx) {
  const p = STATUS_PRESETS[idx];
  if (!p) return;
  const clearMs = _parseReminderTime(p.clear);
  const delay   = clearMs ? clearMs - Date.now() : null;
  setStatus(p.emoji, p.text, !!p.dnd, delay);
}

async function saveCustomStatus() {
  const emoji = document.getElementById('statusEmojiInput').value.trim();
  const text  = document.getElementById('statusTextInput').value.trim();
  const dnd   = document.getElementById('statusDndToggle').checked;
  const clearVal = document.getElementById('statusClearSelect').value;
  const clearMap = { '':'', '30dk':1800000, '1s':3600000, '4s':14400000, 'bugun':86400000 };
  setStatus(emoji, text, dnd, clearMap[clearVal]||null);
}

// ─────────────────────────────────────────
// 5. THREAD PANEL — Tam Thread Görünümü
// ─────────────────────────────────────────
let _threadRoom = null;
let _threadKey  = null;
let _threadStop = null;

function openThreadPanel(roomId, msgKey, parentText, parentUser) {
  _threadRoom = roomId;
  _threadKey  = msgKey;

  document.getElementById('threadParentText').textContent = (parentText||'').slice(0,150);
  document.getElementById('threadParentUser').textContent = parentUser || '';
  document.getElementById('threadPanel').style.display = 'flex';
  document.getElementById('threadRepliesBody').innerHTML = '';

  if (_threadStop) { _threadStop(); _threadStop = null; }
  const ref = dbRef('rooms/' + roomId + '/threads/' + msgKey + '/replies');
  const fn  = ref.on('value', snap => renderThreadReplies(snap.val()));
  _threadStop = () => ref.off('value', fn);
}

function closeThreadPanel() {
  document.getElementById('threadPanel').style.display = 'none';
  if (_threadStop) { _threadStop(); _threadStop = null; }
  _threadRoom = null; _threadKey = null;
}

function renderThreadReplies(data) {
  const body = document.getElementById('threadRepliesBody');
  if (!data) {
    body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px;font-size:.8rem;">İlk cevabı sen yaz</div>';
    return;
  }
  body.innerHTML = Object.entries(data)
    .sort((a,b) => (a[1].ts||0)-(b[1].ts||0))
    .map(([id, r]) => `
      <div class="thread-reply">
        <div class="thread-reply-av" style="background:${_strColor(r.user||'')}">
          ${(r.user||'?')[0].toUpperCase()}
        </div>
        <div class="thread-reply-body">
          <div class="thread-reply-header">
            <span class="thread-reply-user">${esc(r.user||'')}</span>
            <span class="thread-reply-time">${_timeAgo(r.ts)}</span>
          </div>
          <div class="thread-reply-text">${esc(r.text||'')}</div>
        </div>
      </div>
    `).join('');
  body.scrollTop = body.scrollHeight;
}

async function sendThreadReply() {
  const inp  = document.getElementById('threadInput');
  const text = inp.value.trim();
  if (!text || !_threadRoom || !_threadKey) return;

  await dbRef('rooms/' + _threadRoom + '/threads/' + _threadKey + '/replies').push({
    text, user: _cu, ts: Date.now()
  });
  // Thread sayısını güncelle
  const countRef = dbRef('rooms/' + _threadRoom + '/threads/' + _threadKey + '/count');
  const snap = await countRef.once('value');
  await countRef.set((snap.val()||0) + 1);

  inp.value = '';
}

function _strColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return `hsl(${h % 360},50%,45%)`;
}

// ─────────────────────────────────────────
// 6. SLASH KOMUTLARI
// ─────────────────────────────────────────
const SLASH_CMDS = [
  { cmd:'/remind',  desc:'Hatırlatıcı kur',   example:'/remind 10dk toplantı' },
  { cmd:'/status',  desc:'Durumunu ayarla',   example:'/status 🎯 Odaklanıyorum' },
  { cmd:'/poll',    desc:'Anket oluştur',      example:'/poll Soru? Seçenek1 Seçenek2' },
  { cmd:'/canvas',  desc:'Belge aç',           example:'/canvas Proje Notları' },
  { cmd:'/list',    desc:'Görev listesi aç',   example:'/list Haftalık Görevler' },
  { cmd:'/save',    desc:'Mesaj kaydet',        example:'/save [mesaj id]' },
  { cmd:'/dnd',     desc:'Rahatsız etme modu', example:'/dnd 2s' },
  { cmd:'/clear',   desc:'Durumu temizle',      example:'/clear' },
  { cmd:'/me',      desc:'Eylem mesajı',        example:'/me ağaç dikti' },
  { cmd:'/eco',     desc:'CO₂ bilgisi paylaş', example:'/eco' },
  { cmd:'/giphy',   desc:'GIF gönder',          example:'/giphy doğa' },
  { cmd:'/shrug',   desc:'¯\\_(ツ)_/¯',          example:'/shrug' },
];

function handleSlashInput(val, inputId) {
  const box = document.getElementById('slashSuggestBox');
  if (!val.startsWith('/') || val.includes(' ')) {
    if (box) box.style.display = 'none';
    return;
  }
  const q = val.toLowerCase();
  const matches = SLASH_CMDS.filter(c => c.cmd.startsWith(q));
  if (!matches.length) { if (box) box.style.display='none'; return; }

  if (!box) return;
  box.style.display = 'block';
  box.innerHTML = matches.map((c,i) => `
    <div class="slash-item" onclick="selectSlashCmd('${c.cmd}','${inputId||'msgInput'}')" tabindex="0">
      <span class="slash-cmd">${c.cmd}</span>
      <span class="slash-desc">${c.desc}</span>
      <span class="slash-example">${c.example}</span>
    </div>
  `).join('');
}

function selectSlashCmd(cmd, inputId) {
  const inp = document.getElementById(inputId || 'msgInput');
  if (inp) { inp.value = cmd + ' '; inp.focus(); }
  const box = document.getElementById('slashSuggestBox');
  if (box) box.style.display = 'none';
}

async function executeSlashCmd(text, roomId) {
  const parts = text.trim().split(/\s+/);
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1).join(' ');

  switch (cmd) {
    case '/remind': {
      const m = args.match(/^(\S+)\s+(.+)$/);
      if (m) await addReminder(m[2], m[1], roomId);
      else showToast('⚠️','Kullanım: /remind 10dk mesaj');
      return true;
    }
    case '/status': {
      const m = args.match(/^(\S+)\s*(.*)$/);
      if (m) await setStatus(m[1], m[2]||'', false, null);
      else await setStatus('', args, false, null);
      return true;
    }
    case '/dnd': {
      const clearMs = _parseReminderTime(args) ? _parseReminderTime(args) - Date.now() : 3600000;
      await setStatus('😴','Rahatsız Etme', true, clearMs);
      return true;
    }
    case '/clear': {
      await clearStatus();
      return true;
    }
    case '/canvas': {
      openCanvasPanel(roomId);
      if (args) document.getElementById('canvasTitleInput') && (document.getElementById('canvasTitleInput').value = args);
      return true;
    }
    case '/list': {
      openListsPanel(roomId);
      return true;
    }
    case '/poll': {
      const m = args.match(/^(.+?)\s+(.+)$/);
      if (m) {
        const q = m[1].replace(/\?$/,'');
        const opts = m[2].split(/\s+/);
        if (typeof openPollModal === 'function') openPollModal(q, opts);
      }
      return true;
    }
    case '/shrug': {
      return false; // özel text, caller halleder: '¯\\_(ツ)_/¯'
    }
    case '/me': {
      return false; // caller: '* ' + _cu + ' ' + args
    }
    case '/eco': {
      return false; // caller: CO₂ bilgisi mesajı
    }
    default:
      return false;
  }
}

// ─────────────────────────────────────────
// CSS — tüm yeni özellikler
// ─────────────────────────────────────────
(function injectFeaturesCSS() {
  const s = document.createElement('style');
  s.textContent = `
/* ── Bookmarks ── */
#bookmarkBar {
  display:none;flex-wrap:nowrap;overflow-x:auto;gap:6px;
  padding:5px 12px;border-bottom:1px solid var(--border);
  background:var(--bg2);flex-shrink:0;
}
#bookmarkBar::-webkit-scrollbar{display:none}
.bm-chip {
  display:inline-flex;align-items:center;gap:4px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:100px;padding:3px 10px;font-size:.68rem;
  color:var(--text);text-decoration:none;white-space:nowrap;
  cursor:pointer;transition:border-color .15s;flex-shrink:0;
}
.bm-chip:hover{border-color:var(--accent);}
.bm-del{color:var(--muted);margin-left:2px;cursor:pointer;font-size:.6rem;}
.bm-del:hover{color:var(--red);}
.bm-add-btn{background:transparent;border:1px dashed var(--border);border-radius:100px;padding:3px 10px;font-size:.68rem;color:var(--muted);cursor:pointer;white-space:nowrap;flex-shrink:0;}
.bm-add-btn:hover{border-color:var(--accent);color:var(--accent);}

/* ── Saved Items ── */
#savedItemsModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:4500;align-items:flex-end;justify-content:center;}
.saved-sheet{background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-width:640px;max-height:85dvh;display:flex;flex-direction:column;border:1px solid var(--border);}
.saved-header{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);gap:10px;flex-shrink:0;}
.saved-header-title{font-size:.95rem;font-weight:800;color:var(--text-hi);flex:1;}
#savedItemsBody{flex:1;overflow-y:auto;padding:10px;}
.saved-item{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;}
.saved-item-author{font-size:.7rem;font-weight:700;color:var(--accent);margin-bottom:4px;}
.saved-item-text{font-size:.8rem;color:var(--text);line-height:1.5;margin-bottom:6px;}
.saved-item-meta{font-size:.65rem;color:var(--muted);}
.saved-item-del{background:transparent;border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:.68rem;color:var(--muted);cursor:pointer;margin-top:8px;}
.saved-item-del:hover{color:var(--red);border-color:var(--red);}

/* ── Reminders ── */
#remindersModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:4500;align-items:flex-end;justify-content:center;}
.reminders-sheet{background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-width:640px;max-height:85dvh;display:flex;flex-direction:column;border:1px solid var(--border);}
.reminders-header{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);gap:10px;flex-shrink:0;}
.reminders-title{font-size:.95rem;font-weight:800;color:var(--text-hi);flex:1;}
.reminders-add-row{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);flex-shrink:0;}
.reminders-inp{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:.8rem;color:var(--text);outline:none;font-family:inherit;}
.reminders-time{width:80px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 10px;font-size:.78rem;color:var(--text);outline:none;}
.reminders-add-btn{background:var(--accent);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:.78rem;font-weight:700;cursor:pointer;}
#remindersBody{flex:1;overflow-y:auto;padding:10px;}
.reminder-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:8px;}
.reminder-item-icon{font-size:1.3rem;flex-shrink:0;}
.reminder-item-info{flex:1;min-width:0;}
.reminder-item-text{font-size:.82rem;color:var(--text-hi);font-weight:600;}
.reminder-item-time{font-size:.68rem;color:var(--muted);margin-top:2px;}
.reminder-item-del{background:transparent;border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.72rem;color:var(--muted);cursor:pointer;flex-shrink:0;}
.reminder-item-del:hover{color:var(--red);}

/* ── Status Modal ── */
#statusModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:4500;align-items:flex-end;justify-content:center;}
.status-sheet{background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-width:640px;max-height:92dvh;display:flex;flex-direction:column;border:1px solid var(--border);}
.status-header{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);gap:10px;flex-shrink:0;}
.status-title{font-size:.95rem;font-weight:800;color:var(--text-hi);flex:1;}
.status-body{flex:1;overflow-y:auto;padding:14px;}
.status-presets{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
.status-preset{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 12px;cursor:pointer;transition:border-color .15s;display:flex;align-items:center;gap:8px;}
.status-preset:hover{border-color:var(--accent);}
.status-preset-emoji{font-size:1.2rem;}
.status-preset-info{}
.status-preset-text{font-size:.78rem;font-weight:700;color:var(--text-hi);}
.status-preset-clear{font-size:.62rem;color:var(--muted);}
.status-custom-section{border-top:1px solid var(--border);padding-top:14px;margin-top:4px;}
.status-custom-label{font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}
.status-custom-row{display:flex;gap:8px;margin-bottom:10px;}
.status-emoji-inp{width:52px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px;font-size:1.1rem;text-align:center;outline:none;}
.status-text-inp{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:.82rem;color:var(--text);outline:none;font-family:inherit;}
.status-dnd-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);margin-bottom:10px;}
.status-dnd-label{font-size:.82rem;color:var(--text);font-weight:600;}
.status-save-btn{width:100%;background:var(--accent);color:#fff;border:none;border-radius:12px;padding:12px;font-size:.88rem;font-weight:700;cursor:pointer;margin-top:8px;}
.status-clear-btn{width:100%;background:transparent;border:1px solid var(--border);border-radius:12px;padding:10px;font-size:.82rem;color:var(--muted);cursor:pointer;margin-top:8px;}
.status-clear-sel{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:.78rem;color:var(--text);outline:none;width:100%;margin-bottom:8px;}

/* ── Thread Panel ── */
#threadPanel{display:none;position:fixed;top:0;right:0;bottom:0;width:100%;max-width:400px;background:var(--bg2);border-left:1px solid var(--border);z-index:3500;flex-direction:column;overflow:hidden;}
.thread-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;}
.thread-header-title{font-size:.92rem;font-weight:800;color:var(--text-hi);flex:1;}
.thread-close{width:30px;height:30px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.9rem;color:var(--muted);border:none;}
.thread-parent{padding:12px 14px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0;}
.thread-parent-user{font-size:.7rem;font-weight:700;color:var(--accent);margin-bottom:3px;}
.thread-parent-text{font-size:.82rem;color:var(--text);line-height:1.5;}
#threadRepliesBody{flex:1;overflow-y:auto;padding:10px;}
.thread-reply{display:flex;gap:10px;margin-bottom:14px;}
.thread-reply-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;color:#fff;flex-shrink:0;}
.thread-reply-body{flex:1;min-width:0;}
.thread-reply-header{display:flex;align-items:center;gap:6px;margin-bottom:2px;}
.thread-reply-user{font-size:.78rem;font-weight:700;color:var(--text-hi);}
.thread-reply-time{font-size:.65rem;color:var(--muted);}
.thread-reply-text{font-size:.82rem;color:var(--text);line-height:1.5;}
.thread-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border);flex-shrink:0;}
.thread-inp{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:.82rem;color:var(--text);outline:none;font-family:inherit;}
.thread-inp:focus{border-color:var(--accent);}
.thread-send-btn{background:var(--accent);color:#fff;border:none;border-radius:10px;padding:9px 14px;font-size:.82rem;font-weight:700;cursor:pointer;}

/* ── Slash Komutlar ── */
#slashSuggestBox{display:none;position:absolute;bottom:calc(100% + 4px);left:0;right:0;background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;max-height:260px;overflow-y:auto;z-index:100;box-shadow:0 8px 32px rgba(0,0,0,.4);}
.slash-item{display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;transition:background .12s;border-bottom:1px solid var(--border);}
.slash-item:last-child{border-bottom:none;}
.slash-item:hover{background:var(--surface);}
.slash-cmd{font-size:.82rem;font-weight:800;color:var(--accent);min-width:80px;flex-shrink:0;}
.slash-desc{font-size:.78rem;color:var(--text);flex:1;}
.slash-example{font-size:.65rem;color:var(--muted);font-family:monospace;}

/* ── Status Badge ── */
#myStatusBadge{display:none;align-items:center;gap:4px;font-size:.65rem;color:var(--muted);padding:2px 8px;background:var(--surface2);border-radius:100px;margin-top:2px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
`;
  document.head.appendChild(s);
})();

// ── Exports ──────────────────────────────
window.addBookmark       = addBookmark;
window.loadBookmarks     = loadBookmarks;
window.removeBookmark    = removeBookmark;
window.promptAddBookmark = promptAddBookmark;
window.saveMessage       = saveMessage;
window.openSavedItems    = openSavedItems;
window.closeSavedItems   = closeSavedItems;
window.deleteSavedItem   = deleteSavedItem;
window.addReminder       = addReminder;
window.loadReminders     = loadReminders;
window.openRemindersModal = openRemindersModal;
window.closeRemindersModal = closeRemindersModal;
window.deleteReminder    = deleteReminder;
window.openStatusModal   = openStatusModal;
window.closeStatusModal  = closeStatusModal;
window.saveCustomStatus  = saveCustomStatus;
window.applyStatusPreset = applyStatusPreset;
window.clearStatus       = clearStatus;
window.openThreadPanel   = openThreadPanel;
window.closeThreadPanel  = closeThreadPanel;
window.sendThreadReply   = sendThreadReply;
window.handleSlashInput  = handleSlashInput;
window.selectSlashCmd    = selectSlashCmd;
window.executeSlashCmd   = executeSlashCmd;
