/* ═══════════════════════════════════════════════════════════════
   Nature.co — Slack Benzeri Gelişmiş Özellikler
   1. Kanal Sekmeleri (Mesajlar / Canvas / Pinler / Dosyalar)
   2. Gelişmiş Mesaj Menüsü (Hatırlat, Okunmadı, Bildirim kapat)
   3. + Oluştur Menüsü (Kanal, DM, Canvas, Liste, Davet)
   4. Kanal Listesi Yönetimi (Bölümler, Filtrele/Sırala)
   5. Tercihler Paneli (Bildirimler, Görünüm, Gizlilik)
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════
   1. KANAL SEKMELERİ
   Masaüstü sohbet başlığının altına sekme çubuğu
═══════════════════════════════════════ */

if (typeof _activeChannelTab === 'undefined') var _activeChannelTab = 'messages';

function initChannelTabs(room) {
  const header = document.getElementById('deskChatHeader');
  if (!header) return;
  let bar = document.getElementById('channelTabBar');
  if (bar) bar.remove();

  bar = document.createElement('div');
  bar.id = 'channelTabBar';
  bar.style.cssText = `
    display:flex;align-items:center;gap:0;
    border-bottom:1px solid rgba(255,255,255,.07);
    background:rgba(0,0,0,.1);
    padding:0 16px;
    flex-shrink:0;
    overflow-x:auto;
    scrollbar-width:none;
  `;
  bar.innerHTML = `
    <style>
      #channelTabBar::-webkit-scrollbar{display:none}
      .ch-tab{
        display:flex;align-items:center;gap:6px;padding:9px 14px;
        font-size:.78rem;font-weight:700;color:rgba(255,255,255,.45);
        cursor:pointer;border-bottom:2px solid transparent;
        transition:all .15s;white-space:nowrap;user-select:none;
      }
      .ch-tab:hover{color:rgba(255,255,255,.75);}
      .ch-tab.act{color:var(--accent,#4a8f40);border-bottom-color:var(--accent,#4a8f40);}
    </style>
    <div class="ch-tab act" id="chtab-messages" onclick="switchChannelTab('messages','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Mesajlar
    </div>
    <div class="ch-tab" id="chtab-canvas" onclick="switchChannelTab('canvas','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      Canvas
    </div>
    <div class="ch-tab" id="chtab-pins" onclick="switchChannelTab('pins','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
      Pinler
    </div>
    <div class="ch-tab" id="chtab-files" onclick="switchChannelTab('files','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      Dosyalar
    </div>
    <div class="ch-tab" id="chtab-members" onclick="switchChannelTab('members','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
      Üyeler
    </div>
  `;

  header.insertAdjacentElement('afterend', bar);
  _activeChannelTab = 'messages';
}

function switchChannelTab(tab, room) {
  _activeChannelTab = tab;
  document.querySelectorAll('.ch-tab').forEach(t => t.classList.remove('act'));
  const el = document.getElementById('chtab-' + tab);
  if (el) el.classList.add('act');

  const chatArea = document.getElementById('deskChatArea');
  const panelExtra = document.getElementById('deskChatTabPanel');

  if (tab === 'messages') {
    if (chatArea) chatArea.style.display = 'flex';
    if (panelExtra) panelExtra.remove();
    return;
  }

  if (chatArea) chatArea.style.display = 'none';
  let panel = document.getElementById('deskChatTabPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'deskChatTabPanel';
    panel.style.cssText = 'flex:1;overflow-y:auto;background:var(--bg,#0a120a);';
    const main = document.getElementById('deskMain');
    if (main) main.appendChild(panel);
  }

  if (tab === 'canvas')   _renderCanvasTab(panel, room);
  if (tab === 'pins')     _renderPinsTab(panel, room);
  if (tab === 'files')    _renderFilesTab(panel, room);
  if (tab === 'members')  _renderMembersTab(panel, room);
}

function _renderCanvasTab(panel, room) {
  panel.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding:28px 24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <div style="font-size:1.1rem;font-weight:900;color:var(--text-hi,#fff);">📋 Canvas</div>
          <div style="font-size:.78rem;color:var(--muted,#666);margin-top:3px;">Bu kanalın ortak not defteri</div>
        </div>
        <button onclick="saveCanvasContent('${room}')"
          style="background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.4);color:#6dbf67;
                 border-radius:10px;padding:7px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">
          💾 Kaydet
        </button>
      </div>
      <div id="canvasEditor" contenteditable="true" spellcheck="false"
        style="min-height:400px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
               border-radius:14px;padding:20px;color:var(--text-hi,#fff);font-size:.9rem;line-height:1.7;
               outline:none;transition:border .2s;"
        onfocus="this.style.borderColor='rgba(74,143,64,.4)'"
        onblur="this.style.borderColor='rgba(255,255,255,.08)'"
        placeholder="Buraya not yaz...">Yükleniyor...</div>
      <div style="margin-top:8px;font-size:.72rem;color:rgba(255,255,255,.2);text-align:right;" id="canvasSaveStatus"></div>
    </div>`;
  _loadCanvas(room);
}

async function _loadCanvas(room) {
  const el = document.getElementById('canvasEditor');
  if (!el || !_db) return;
  try {
    const snap = await dbRef('canvases/' + room + '/content').once('value');
    el.innerHTML = snap.val() || '<p style="color:rgba(255,255,255,.3);">Henüz bir şey yazılmamış. Yazmaya başla...</p>';
  } catch(e) {}
}

async function saveCanvasContent(room) {
  const el = document.getElementById('canvasEditor');
  if (!el || !_db) return;
  await dbRef('canvases/' + room).set({ content: el.innerHTML, updatedBy: _cu, updatedAt: Date.now() });
  const status = document.getElementById('canvasSaveStatus');
  if (status) { status.textContent = '✓ Kaydedildi'; setTimeout(() => { status.textContent = ''; }, 2000); }
}

function _renderPinsTab(panel, room) {
  panel.innerHTML = `<div style="padding:20px 24px;"><div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">📌 Sabitlenmiş Mesajlar</div><div id="pinsTabList" style="display:flex;flex-direction:column;gap:10px;"><div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Yükleniyor...</div></div></div>`;
  if (!_db) return;
  dbRef('pinned/' + room).once('value').then(snap => {
    const list = document.getElementById('pinsTabList');
    if (!list) return;
    const data = snap.val();
    if (!data) { list.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Henüz sabitlenmiş mesaj yok.</div>'; return; }
    list.innerHTML = Object.entries(data).map(([k, v]) => `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:24px;height:24px;border-radius:50%;background:${strColor(v.user||'')};display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:900;color:#fff;">${initials(v.user||'')}</div>
          <span style="font-weight:800;font-size:.8rem;color:var(--text-hi,#fff);">${esc(v.user||'')}</span>
          <span style="font-size:.72rem;color:var(--muted);">${v.ts ? new Date(v.ts).toLocaleDateString('tr-TR') : ''}</span>
        </div>
        <div style="font-size:.85rem;color:rgba(255,255,255,.8);line-height:1.5;">${esc(v.text||'')}</div>
      </div>`).join('');
  });
}

function _renderFilesTab(panel, room) {
  panel.innerHTML = `<div style="padding:20px 24px;"><div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">📁 Dosyalar</div><div id="filesTabList" style="display:flex;flex-direction:column;gap:8px;"><div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Yükleniyor...</div></div></div>`;
  if (!_db) return;
  dbRef('msgs/' + room).orderByChild('ts').limitToLast(200).once('value').then(snap => {
    const list = document.getElementById('filesTabList');
    if (!list) return;
    const msgs = snap.val() || {};
    const files = Object.values(msgs).filter(m => m.file);
    if (!files.length) { list.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Bu kanalda henüz dosya paylaşılmamış.</div>'; return; }
    list.innerHTML = files.reverse().map(m => `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;cursor:pointer;" onclick="zoomImg&&m.file.type?.startsWith('image/')&&zoomImg('${m.file.data}')">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(74,143,64,.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">${m.file.type?.startsWith('image/') ? '🖼️' : m.file.type?.startsWith('video/') ? '🎬' : '📄'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(m.file.name||'Dosya')}</div>
          <div style="font-size:.7rem;color:var(--muted);">${esc(m.user||'')} · ${m.ts ? new Date(m.ts).toLocaleDateString('tr-TR') : ''}</div>
        </div>
        <div style="font-size:.7rem;color:var(--muted);">${m.file.size ? Math.round(m.file.size/1024)+'KB' : ''}</div>
      </div>`).join('');
  });
}

function _renderMembersTab(panel, room) {
  panel.innerHTML = `<div style="padding:20px 24px;"><div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">👥 Üyeler</div><div id="membersTabList" style="display:flex;flex-direction:column;gap:6px;"></div></div>`;
  if (!_db) return;
  dbRef('online').once('value').then(snap => {
    const list = document.getElementById('membersTabList');
    if (!list) return;
    const online = snap.val() || {};
    list.innerHTML = Object.keys(online).map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background='transparent'" onclick="openDM&&openDM('${u}')">
        <div style="position:relative;">
          <div style="width:32px;height:32px;border-radius:50%;background:${strColor(u)};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:#fff;">${initials(u)}</div>
          <div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#2ecc71;border:2px solid var(--bg,#0a120a);"></div>
        </div>
        <div>
          <div style="font-size:.85rem;font-weight:700;color:var(--text-hi,#fff);">${esc(u)}</div>
          <div style="font-size:.7rem;color:#2ecc71;">Çevrimiçi</div>
        </div>
      </div>`).join('');
  });
}

/* ═══════════════════════════════════════
   2. GELİŞMİŞ MESAJ MENÜSÜ - Mevcut menüyü genişlet
═══════════════════════════════════════ */

// Orijinal fonksiyonu kaydedip genişletiyoruz
const _origShowMsgMenu = window.showMsgMenuAtBtn;
window.showMsgMenuAtBtn = function(e) {
  e.stopPropagation();
  e.preventDefault();
  document.removeEventListener('click', window._closeCtx);

  const btn = e.currentTarget || e.target.closest('button') || e.target;
  const room = btn.dataset.room;
  const key  = btn.dataset.key;
  const own  = btn.dataset.own === 'true';
  const text = btn.dataset.text || '';

  let menu = document.getElementById('msgCtxMenu');
  if (!menu) { menu = document.createElement('div'); menu.id = 'msgCtxMenu'; }
  document.body.appendChild(menu);

  const sep = `<div style="height:1px;background:var(--border,rgba(255,255,255,.08));margin:4px 6px;"></div>`;

  let html = `
    <div class="ctx-item" onclick="event.stopPropagation();showReactMenu(event,'${room}','${key}')">
      <span class="ctx-ic">😀</span> Tepki Ekle
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();replyToMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></span> Yanıtla
    </div>
    ${sep}
    <div class="ctx-item" onclick="event.stopPropagation();slackMarkUnread('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span> Okunmadı İşaretle
      <span class="ctx-kbd">U</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();slackRemindMe('${room}','${key}',${JSON.stringify(text.slice(0,80))});_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></span> Hatırlat
      <span class="ctx-ic" style="margin-left:auto;opacity:.5;font-size:.7rem;">›</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();slackMuteThread('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="2" y1="2" x2="22" y2="22"/></svg></span> Yanıt Bildirimlerini Kapat
    </div>
    ${sep}
    <div class="ctx-item" onclick="event.stopPropagation();slackCopyMsgLink('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> Mesaj Linkini Kopyala
      <span class="ctx-kbd">L</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();copyMsgText(${JSON.stringify(text)});_closeCtx()">
      <span class="ctx-ic">T</span> Mesajı Kopyala
      <span class="ctx-kbd">⌘C</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();pinMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg></span> Sabitle
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();saveMessage&&saveMessage('${room}','${key}',${JSON.stringify(text.slice(0,200))},_cu||'');_closeCtx()">
      <span class="ctx-ic">🔖</span> Kaydet
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();openThreadPanel&&openThreadPanel('${room}','${key}',${JSON.stringify(text.slice(0,100))},_cu||'');_closeCtx()">
      <span class="ctx-ic">💬</span> Konu Aç (Thread)
    </div>`;

  if (own) {
    html += `${sep}
    <div class="ctx-item" onclick="event.stopPropagation();startEditMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Mesajı Düzenle
      <span class="ctx-kbd">E</span>
    </div>`;
  }

  if (own || _isAdmin) {
    html += `${sep}
    <div class="ctx-item danger" onclick="event.stopPropagation();deleteMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></span> Mesajı Sil...
      <span class="ctx-kbd">delete</span>
    </div>`;
  }

  menu.innerHTML = `<style>
    .ctx-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:.82rem;color:rgba(255,255,255,.82);transition:background .12s;white-space:nowrap;}
    .ctx-item:hover{background:rgba(255,255,255,.08);}
    .ctx-item.danger{color:#e05555;}
    .ctx-item.danger:hover{background:rgba(224,85,85,.12);}
    .ctx-ic{width:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.85rem;}
    .ctx-kbd{margin-left:auto;font-size:.68rem;color:rgba(255,255,255,.3);font-family:monospace;padding-left:12px;}
  </style>` + html;

  const rect = btn.getBoundingClientRect();
  const menuW = 240;
  let x = rect.right + 8;
  let y = rect.top;
  if (x + menuW > window.innerWidth) x = rect.left - menuW - 8;
  if (x < 8) x = 8;
  const menuH = menu.querySelectorAll('.ctx-item').length * 36 + 30;
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
  if (y < 8) y = 8;

  menu.style.cssText = `display:block;position:fixed;left:${x}px;top:${y}px;
    background:var(--surface2,#1e2428);border:1px solid rgba(255,255,255,.1);
    border-radius:14px;padding:6px;z-index:9999999;
    box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:220px;`;

  setTimeout(() => document.addEventListener('click', window._closeCtx, { once: true }), 200);
};

/* Yeni mesaj menüsü aksiyonları */
function slackMarkUnread(room, key) {
  if (!_db || !_cu) return;
  dbRef('reads/' + _cu + '/' + room).remove();
  showToast('📬 Okunmadı olarak işaretlendi');
}

function slackCopyMsgLink(room, key) {
  const link = `${location.origin}${location.pathname}#room=${room}&msg=${key}`;
  navigator.clipboard.writeText(link).then(() => showToast('🔗 Link kopyalandı!'));
}

function slackRemindMe(room, key, text) {
  const opts = [
    { label: '20 dakika sonra', ms: 20 * 60000 },
    { label: '1 saat sonra',    ms: 60 * 60000 },
    { label: '3 saat sonra',    ms: 3 * 60 * 60000 },
    { label: 'Yarın sabah',     ms: _nextMorningMs() },
    { label: 'Gelecek hafta',   ms: 7 * 24 * 60 * 60000 },
  ];
  const menu = document.createElement('div');
  menu.style.cssText = `position:fixed;z-index:99999999;background:var(--surface2,#1e2428);
    border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:6px;
    box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:200px;`;
  menu.innerHTML = `<div style="padding:6px 12px 8px;font-size:.75rem;font-weight:800;color:rgba(255,255,255,.4);letter-spacing:.05em;">HATIRLATICI EKLE</div>` +
    opts.map(o => `<div class="ctx-item" onclick="this.closest('div[style]').remove();_saveReminder('${room}','${key}',${JSON.stringify(text)},${Date.now() + o.ms})"
      style="display:flex;align-items:center;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:.82rem;color:rgba(255,255,255,.82);transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background='transparent'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      ${o.label}</div>`).join('');
  // Konumlandır
  menu.style.top = '50%'; menu.style.left = '50%';
  menu.style.transform = 'translate(-50%,-50%)';
  document.body.appendChild(menu);
  setTimeout(() => { const close = () => menu.remove(); document.addEventListener('click', close, { once: true }); }, 200);
}

function _nextMorningMs() {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow - now;
}

async function _saveReminder(room, key, text, ts) {
  if (!_db || !_cu) return;
  await dbRef('reminders/' + _cu).push({ room, key, text: text.slice(0, 100), ts, createdAt: Date.now() });
  showToast('⏰ Hatırlatıcı ayarlandı!');
}

function slackMuteThread(room, key) {
  if (!_db || !_cu) return;
  dbRef('mutedThreads/' + _cu + '/' + room + '/' + key).set(true);
  showToast('🔕 Bu konunun bildirimleri kapatıldı');
}

/* ═══════════════════════════════════════
   3. + OLUŞTUR MENÜSÜ
═══════════════════════════════════════ */

function showCreateMenu(anchorEl) {
  const existing = document.getElementById('createMenuPopup');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'createMenuPopup';
  popup.style.cssText = `
    position:fixed;z-index:999999;
    background:var(--surface2,#1e2428);
    border:1px solid rgba(255,255,255,.1);
    border-radius:16px;padding:8px;
    box-shadow:0 16px 48px rgba(0,0,0,.8);
    min-width:280px;font-family:inherit;
  `;

  const items = [
    { icon: '💬', color: '#7b68ee', label: 'Mesaj', desc: 'DM veya kanalda konuşma başlat', action: `openGlobalSearch&&openGlobalSearch()` },
    { icon: '#', color: '#4a8f40', label: 'Kanal', desc: 'Konu bazlı grup konuşması', action: `showCreateChannelModal&&showCreateChannelModal()` },
    { icon: '🎧', color: '#2ecc71', label: 'Huddle (Sesli)', desc: 'Hızlı sesli/görüntülü sohbet', action: `liveStartConference&&liveStartConference()` },
    { icon: '📋', color: '#3498db', label: 'Canvas', desc: 'Ortak içerik oluştur ve paylaş', action: `deskNav&&deskNav('home')` },
    { icon: '📋', color: '#e67e22', label: 'Liste', desc: 'Proje yönet ve takip et', action: `deskNav&&deskNav('home')` },
    { icon: '⚡', color: '#e05555', label: 'İş Akışı', desc: 'Günlük görevleri otomatize et', action: `showWorkflowModal&&showWorkflowModal()` },
  ];

  popup.innerHTML = `
    <div style="padding:6px 12px 10px;font-size:.82rem;font-weight:900;color:rgba(255,255,255,.9);">Oluştur</div>
    ${items.map(it => `
      <div onclick="${it.action};document.getElementById('createMenuPopup')?.remove()"
        style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
        onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
        <div style="width:38px;height:38px;border-radius:10px;background:${it.color}22;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:900;color:${it.color};flex-shrink:0;">${it.icon}</div>
        <div>
          <div style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">${it.label}</div>
          <div style="font-size:.72rem;color:var(--muted,#666);margin-top:1px;">${it.desc}</div>
        </div>
      </div>`).join('')}
    <div style="height:1px;background:rgba(255,255,255,.07);margin:6px 8px;"></div>
    <div onclick="showInviteModal&&showInviteModal();document.getElementById('createMenuPopup')?.remove()"
      style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
      <span style="font-size:.85rem;color:rgba(255,255,255,.7);font-weight:700;">İnsanları Davet Et</span>
    </div>`;

  // Konumlandır — viewport taşmasını önle
  document.body.appendChild(popup);

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const ph = popup.offsetHeight || 380;
    const pw = popup.offsetWidth  || 288;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove >= ph + 8 || spaceAbove > spaceBelow) {
      const bVal = Math.max(window.innerHeight - rect.top + 8, 8);
      popup.style.bottom = bVal + 'px';
      popup.style.top = 'auto';
    } else {
      popup.style.top  = (rect.bottom + 8) + 'px';
      popup.style.bottom = 'auto';
    }

    const leftVal = Math.min(rect.left, window.innerWidth - pw - 12);
    popup.style.left = Math.max(8, leftVal) + 'px';
  } else {
    popup.style.top = '50%'; popup.style.left = '50%';
    popup.style.transform = 'translate(-50%,-50%)';
  }

  requestAnimationFrame(() => {
    const pr = popup.getBoundingClientRect();
    if (pr.top < 8) popup.style.top = '8px';
    if (pr.bottom > window.innerHeight - 8) { popup.style.bottom = '8px'; popup.style.top = 'auto'; }
    if (pr.right > window.innerWidth - 8) popup.style.left = (window.innerWidth - pr.width - 8) + 'px';
  });

  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 200);
}

/* ═══════════════════════════════════════
   4. KANAL LİSTESİ YÖNETİMİ
   Sidebar başlığına yönetim butonu
═══════════════════════════════════════ */

function showChannelListMenu(anchorEl) {
  const existing = document.getElementById('chanListMenu');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'chanListMenu';
  popup.style.cssText = `
    position:fixed;z-index:999999;background:var(--surface2,#1e2428);
    border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:8px;
    box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:290px;font-family:inherit;
  `;

  popup.innerHTML = `
    <div onclick="showFilterSortModal();document.getElementById('chanListMenu')?.remove()"
      style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <span style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">Filtrele ve Sırala</span>
      <span style="font-size:.75rem;color:var(--muted);">Özel ›</span>
    </div>
    <div style="height:1px;background:rgba(255,255,255,.07);margin:4px 6px;"></div>
    <div onclick="showCreateSectionModal();document.getElementById('chanListMenu')?.remove()"
      style="padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">Bölüm Oluştur</span>
      </div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:3px;padding-left:23px;">Konuşmaları konuya göre düzenle</div>
    </div>
    <div onclick="showManageChannelsModal();document.getElementById('chanListMenu')?.remove()"
      style="padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <div style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">Kanal Listesini Yönet</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:3px;">Sırala, bölümler ekle, kanalları bırak</div>
    </div>
    <div style="height:1px;background:rgba(255,255,255,.07);margin:4px 6px;"></div>
    <div style="padding:6px 12px;font-size:.7rem;color:var(--muted);font-weight:700;letter-spacing:.05em;">HIZLI İPUÇLARI</div>
    <div onclick="toggleMutedChannels();document.getElementById('chanListMenu')?.remove()"
      style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3"/></svg>
      <span style="font-size:.82rem;color:rgba(255,255,255,.75);">Susturulan Konuşmaları Göster</span>
    </div>
    <div onclick="showPreferencesModal();document.getElementById('chanListMenu')?.remove()"
      style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
      <span style="font-size:.82rem;color:rgba(255,255,255,.75);">Varsayılanları Düzenle</span>
    </div>`;

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    popup.style.top = rect.bottom + 6 + 'px';
    popup.style.left = rect.left + 'px';
  }
  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 200);
}

/* Susturulan kanalları göster/gizle */
let _showMuted = false;
function toggleMutedChannels() {
  _showMuted = !_showMuted;
  document.querySelectorAll('.room-item.muted').forEach(el => {
    el.style.display = _showMuted ? '' : 'none';
  });
  showToast(_showMuted ? '👁 Susturulanlar gösteriliyor' : '🔕 Susturulanlar gizlendi');
}

/* Bölüm oluştur */
function showCreateSectionModal() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--surface2,#1e2428);border-radius:18px;padding:24px;width:340px;box-shadow:0 20px 60px rgba(0,0,0,.8);">
      <div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">Bölüm Oluştur</div>
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;">Bölüm adı</div>
      <input id="sectionNameInput" type="text" placeholder="ör: Projeler, Takım..."
        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
               border-radius:10px;padding:10px 14px;color:var(--text-hi,#fff);font-size:.88rem;outline:none;font-family:inherit;"
        onfocus="this.style.borderColor='rgba(74,143,64,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'">
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.7);padding:8px 16px;border-radius:9px;cursor:pointer;font-size:.82rem;font-weight:700;">İptal</button>
        <button onclick="createSection(document.getElementById('sectionNameInput').value);this.closest('[style*=fixed]').remove()"
          style="background:rgba(74,143,64,.3);border:1px solid rgba(74,143,64,.5);color:#6dbf67;padding:8px 18px;border-radius:9px;cursor:pointer;font-size:.82rem;font-weight:800;">Oluştur</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  setTimeout(() => document.getElementById('sectionNameInput')?.focus(), 100);
}

async function createSection(name) {
  if (!name?.trim() || !_db || !_cu) return;
  await dbRef('sections/' + _cu).push({ name: name.trim(), createdAt: Date.now() });
  showToast('📂 "' + name + '" bölümü oluşturuldu');
}

/* ═══════════════════════════════════════
   5. TERCİHLER PANELİ
═══════════════════════════════════════ */

let _prefTab = 'notifications';

function showPreferencesModal() {
  const existing = document.getElementById('prefsModal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'prefsModal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999999;
    display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit;
  `;

  modal.innerHTML = `
    <div style="background:var(--surface2,#1e2428);border-radius:20px;width:100%;max-width:700px;max-height:85vh;display:flex;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.9);">
      <!-- Sol menü -->
      <div style="width:200px;flex-shrink:0;background:rgba(0,0,0,.2);padding:16px 8px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.07);">
        <div style="font-size:.95rem;font-weight:900;color:var(--text-hi,#fff);padding:6px 12px 14px;">Tercihler</div>
        ${[
          { id: 'notifications', label: 'Bildirimler', icon: '🔔' },
          { id: 'appearance',    label: 'Görünüm',     icon: '🎨' },
          { id: 'messages',      label: 'Mesajlar & Medya', icon: '💬' },
          { id: 'privacy',       label: 'Gizlilik',    icon: '🔒' },
          { id: 'audio',         label: 'Ses & Video', icon: '🎧' },
          { id: 'accessibility', label: 'Erişilebilirlik', icon: '♿' },
          { id: 'advanced',      label: 'Gelişmiş',    icon: '⚙️' },
        ].map(t => `
          <div class="pref-tab-btn" id="ptab-${t.id}" onclick="switchPrefTab('${t.id}')"
            style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:.82rem;font-weight:700;color:rgba(255,255,255,.6);transition:all .12s;margin-bottom:2px;${t.id === _prefTab ? 'background:rgba(74,143,64,.2);color:#6dbf67;' : ''}">
            <span>${t.icon}</span>${t.label}
          </div>`).join('')}
      </div>
      <!-- Sağ içerik -->
      <div style="flex:1;overflow-y:auto;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div id="prefTitle" style="font-size:1.1rem;font-weight:900;color:var(--text-hi,#fff);">Bildirimler</div>
          <div onclick="document.getElementById('prefsModal').remove()"
            style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.5);font-size:1.2rem;transition:background .12s;"
            onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='transparent'">✕</div>
        </div>
        <div id="prefContent"></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  switchPrefTab(_prefTab);
}

function switchPrefTab(tab) {
  _prefTab = tab;
  document.querySelectorAll('.pref-tab-btn').forEach(b => {
    b.style.background = 'transparent'; b.style.color = 'rgba(255,255,255,.6)';
  });
  const active = document.getElementById('ptab-' + tab);
  if (active) { active.style.background = 'rgba(74,143,64,.2)'; active.style.color = '#6dbf67'; }

  const titles = { notifications: 'Bildirimler', appearance: 'Görünüm', messages: 'Mesajlar & Medya', privacy: 'Gizlilik', audio: 'Ses & Video', accessibility: 'Erişilebilirlik', advanced: 'Gelişmiş' };
  const titleEl = document.getElementById('prefTitle');
  if (titleEl) titleEl.textContent = titles[tab] || tab;

  const content = document.getElementById('prefContent');
  if (!content) return;

  if (tab === 'notifications') content.innerHTML = _prefNotificationsHTML();
  else if (tab === 'appearance') content.innerHTML = _prefAppearanceHTML();
  else if (tab === 'messages') content.innerHTML = _prefMessagesHTML();
  else if (tab === 'privacy') content.innerHTML = _prefPrivacyHTML();
  else if (tab === 'audio') content.innerHTML = _prefAudioHTML();
  else if (tab === 'accessibility') content.innerHTML = _prefAccessibilityHTML();
  else if (tab === 'advanced') content.innerHTML = _prefAdvancedHTML();
}

function _prefSection(title, desc = '') {
  return `<div style="margin-bottom:6px;"><div style="font-size:.88rem;font-weight:800;color:var(--text-hi,#fff);">${title}</div>${desc ? `<div style="font-size:.75rem;color:var(--muted);margin-top:3px;">${desc}</div>` : ''}</div>`;
}

function _prefToggle(label, key, defaultVal = true) {
  const stored = localStorage.getItem('pref_' + key);
  const checked = stored !== null ? stored === 'true' : defaultVal;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <span style="font-size:.83rem;color:rgba(255,255,255,.8);">${label}</span>
      <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="savePref('${key}',this.checked)"
          style="opacity:0;width:0;height:0;position:absolute;">
        <span style="position:absolute;inset:0;background:${checked ? 'rgba(74,143,64,.7)' : 'rgba(255,255,255,.15)'};border-radius:22px;transition:all .2s;"></span>
        <span style="position:absolute;width:16px;height:16px;background:#fff;border-radius:50%;top:3px;transition:.2s;left:${checked ? '21px' : '3px'};"></span>
      </label>
    </div>`;
}

function savePref(key, value) {
  localStorage.setItem('pref_' + key, value);
  applyPrefs();
}

function applyPrefs() {
  // Mesaj sesi
  if (localStorage.getItem('pref_msgSound') === 'false') {
    window._prefNoMsgSound = true;
  } else {
    window._prefNoMsgSound = false;
  }
  // Kompakt mod
  if (localStorage.getItem('pref_compactMode') === 'true') {
    document.body.classList.add('compact-mode');
  } else {
    document.body.classList.remove('compact-mode');
  }
  // Link önizlemesi
  window._prefNoLinkPreview = localStorage.getItem('pref_linkPreview') === 'false';
}

function _prefNotificationsHTML() {
  return `
    ${_prefSection('Bildirim Yöntemi', 'Masaüstü ve mobil cihazlarda bildirim görünümü')}
    ${_prefToggle('Masaüstü bildirimleri', 'desktopNotif', true)}
    ${_prefToggle('Mobil bildirimler', 'mobileNotif', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Ne Hakkında Bildirim Al')}
    ${_prefToggle('Tüm yeni mesajlar', 'notifAll', true)}
    ${_prefToggle('Bahsetmeler (@kullanıcı)', 'notifMention', true)}
    ${_prefToggle('Konu yanıtları (thread)', 'notifThread', true)}
    ${_prefToggle('Yeni sesli/görüntülü davetler', 'notifCall', true)}
    ${_prefToggle('Arkadaşlık istekleri', 'notifFriend', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Ses')}
    ${_prefToggle('Yeni mesaj sesi', 'msgSound', true)}
    ${_prefToggle('Arama sesi', 'callSound', true)}`;
}

function _prefAppearanceHTML() {
  return `
    ${_prefSection('Tema')}
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      ${[
        { id: 'dark', label: '🌙 Koyu', bg: '#0a0f0a' },
        { id: 'darker', label: '⬛ Siyah', bg: '#050505' },
        { id: 'forest', label: '🌲 Orman', bg: '#0a150a' },
        { id: 'midnight', label: '🌌 Gece', bg: '#080818' },
      ].map(t => `
        <div onclick="applyTheme('${t.id}')"
          style="flex:1;min-width:100px;padding:12px;border-radius:12px;cursor:pointer;background:${t.bg};
                 border:2px solid ${localStorage.getItem('theme') === t.id ? '#4a8f40' : 'rgba(255,255,255,.1)'};
                 text-align:center;font-size:.78rem;color:#fff;transition:all .15s;">
          ${t.label}
        </div>`).join('')}
    </div>
    ${_prefSection('Mesaj Yoğunluğu')}
    ${_prefToggle('Kompakt mod (mesajlar arası boşluğu azalt)', 'compactMode', false)}
    ${_prefToggle('Avatar göster', 'showAvatars', true)}
    ${_prefToggle('Zaman damgası göster', 'showTimestamps', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Yazı Tipi')}
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
      <span style="font-size:.8rem;color:rgba(255,255,255,.6);">A</span>
      <input type="range" min="12" max="18" value="${parseInt(localStorage.getItem('pref_fontSize') || '14')}"
        oninput="changeFontSize(this.value)"
        style="flex:1;accent-color:#4a8f40;">
      <span style="font-size:1rem;color:rgba(255,255,255,.6);">A</span>
    </div>`;
}

function applyTheme(themeId) {
  localStorage.setItem('theme', themeId);
  const themes = { dark: '#0a0f0a', darker: '#050505', forest: '#0a150a', midnight: '#080818' };
  document.documentElement.style.setProperty('--bg', themes[themeId] || '#0a0f0a');
  showToast('🎨 Tema uygulandı');
}

function changeFontSize(size) {
  localStorage.setItem('pref_fontSize', size);
  document.documentElement.style.setProperty('--chat-font-size', size + 'px');
}

function _prefMessagesHTML() {
  return `
    ${_prefSection('Mesaj Gösterimi')}
    ${_prefToggle('Link önizlemesi göster', 'linkPreview', true)}
    ${_prefToggle('Görselleri otomatik göster', 'autoImages', true)}
    ${_prefToggle('Gif otomatik oynat', 'autoGif', true)}
    ${_prefToggle('Emoji büyüt (tek emoji mesajlarda)', 'bigEmoji', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Mesaj Yazma')}
    ${_prefToggle('Enter ile gönder (Shift+Enter yeni satır)', 'enterSend', true)}
    ${_prefToggle('Yazılıyor... göstergesi aktif', 'typingIndicator', true)}
    ${_prefToggle('Mesaj okundu bildirimi', 'readReceipts', true)}`;
}

function _prefPrivacyHTML() {
  return `
    ${_prefSection('Profil Gizliliği')}
    ${_prefToggle('Çevrimiçi durumunu göster', 'showOnline', true)}
    ${_prefToggle('Son görülme zamanını göster', 'showLastSeen', true)}
    ${_prefToggle('Profil fotoğrafını herkese göster', 'publicPhoto', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('İletişim')}
    ${_prefToggle('Sadece arkadaşlardan mesaj al', 'friendsOnlyDM', false)}
    ${_prefToggle('Grup davetlerini engelle', 'blockGroupInvites', false)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Veri & Güvenlik')}
    <div style="padding:12px 0;">
      <button onclick="exportMyData()"
        style="background:rgba(91,155,213,.15);border:1px solid rgba(91,155,213,.3);color:#90caf9;
               border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;margin-right:8px;">
        📤 Verilerimi İndir
      </button>
      <button onclick="confirmDeleteAccount()"
        style="background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.3);color:#e05555;
               border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">
        🗑 Hesabı Sil
      </button>
    </div>`;
}

function _prefAudioHTML() {
  return `
    ${_prefSection('Ses Ayarları')}
    ${_prefToggle('Giriş sesi çal', 'loginSound', false)}
    ${_prefToggle('Çıkış sesi çal', 'logoutSound', false)}
    ${_prefToggle('Bildirim sesi çal', 'notifSound', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Ses Seviyesi')}
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
      <span style="font-size:1rem;">🔈</span>
      <input type="range" min="0" max="100" value="${parseInt(localStorage.getItem('pref_volume') || '80')}"
        oninput="localStorage.setItem('pref_volume',this.value)"
        style="flex:1;accent-color:#4a8f40;">
      <span style="font-size:1rem;">🔊</span>
    </div>
    <div style="margin-top:16px;"></div>
    ${_prefSection('Video')}
    ${_prefToggle('Konferansta kamerayı varsayılan aç', 'cameraDefault', true)}
    ${_prefToggle('Konferansta mikrofonu varsayılan aç', 'micDefault', true)}
    ${_prefToggle('Gürültü engelleme', 'noiseCancellation', false)}`;
}

function _prefAccessibilityHTML() {
  return `
    ${_prefSection('Görsel')}
    ${_prefToggle('Yüksek kontrast modu', 'highContrast', false)}
    ${_prefToggle('Animasyonları azalt', 'reduceMotion', false)}
    ${_prefToggle('Büyük yazı tipi', 'largeText', false)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Klavye Kısayolları')}
    <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">
      ${[
        ['⌘K', 'Global arama'],['⌘N', 'Yeni mesaj'],['⌘/', 'Kısayolları göster'],
        ['Esc', 'Modalı kapat'],['Enter', 'Gönder'],['Shift+Enter', 'Yeni satır'],
      ].map(([k, d]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <span style="font-size:.82rem;color:rgba(255,255,255,.7);">${d}</span>
          <kbd style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:2px 8px;font-size:.72rem;color:rgba(255,255,255,.6);font-family:monospace;">${k}</kbd>
        </div>`).join('')}
    </div>`;
}

function _prefAdvancedHTML() {
  return `
    ${_prefSection('Geliştirici')}
    ${_prefToggle('Hata ayıklama mesajlarını göster', 'debugMode', false)}
    ${_prefToggle('Performans istatistikleri', 'perfStats', false)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Önbellek')}
    <div style="padding:10px 0;">
      <button onclick="clearAppCache()"
        style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);
               border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">
        🗑 Önbelleği Temizle
      </button>
    </div>
    <div style="margin-top:16px;"></div>
    ${_prefSection('Uygulama Hakkında')}
    <div style="font-size:.8rem;color:var(--muted);line-height:1.8;">
      <div>Nature.co — Doğa Temalı Sosyal Platform</div>
      <div>Sürüm: 2.0.0</div>
      <div>Firebase Realtime DB entegrasyonu</div>
    </div>`;
}

function clearAppCache() {
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
  showToast('🗑 Önbellek temizlendi');
}

function exportMyData() {
  if (!_cu) return;
  showToast('📤 Veri hazırlanıyor...');
}

function confirmDeleteAccount() {
  if (confirm('Hesabını silmek istediğine emin misin? Bu işlem geri alınamaz.')) {
    showToast('Hesap silme işlemi için destek ile iletişime geç.');
  }
}

/* ═══════════════════════════════════════
   6. SIDEBAR'A BUTONLARI EKLE
═══════════════════════════════════════ */

function injectSidebarButtons() {
  // Butonlar HTML'de mevcut - gerekirse applyPrefs çağır
  applyPrefs();
  return;
  const header = document.getElementById('deskSidebarHeader');
  if (!header || document.getElementById('sidebarExtraBtns')) return;

  const btns = document.createElement('div');
  btns.id = 'sidebarExtraBtns';
  btns.style.cssText = 'display:flex;align-items:center;gap:4px;padding:6px 12px 2px;flex-shrink:0;';
  btns.innerHTML = `
    <!-- Oluştur butonu -->
    <button onclick="showCreateMenu(this)" title="Oluştur"
      style="display:flex;align-items:center;gap:6px;background:rgba(74,143,64,.15);border:1px solid rgba(74,143,64,.3);
             color:#6dbf67;border-radius:9px;padding:5px 12px;font-size:.75rem;font-weight:800;cursor:pointer;transition:all .15s;flex:1;"
      onmouseover="this.style.background='rgba(74,143,64,.25)'" onmouseout="this.style.background='rgba(74,143,64,.15)'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Oluştur
    </button>
    <!-- Liste yönet -->
    <button onclick="showChannelListMenu(this)" title="Kanal Listesini Yönet"
      style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;
             border:1px solid rgba(255,255,255,.1);border-radius:9px;color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;flex-shrink:0;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    </button>
    <!-- Tercihler -->
    <button onclick="showPreferencesModal()" title="Tercihler"
      style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;
             border:1px solid rgba(255,255,255,.1);border-radius:9px;color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;flex-shrink:0;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
    </button>`;

  header.insertAdjacentElement('afterend', btns);
}

/* ═══════════════════════════════════════
   7. SOHBET ODASI DEĞİŞİNCE SEKMELERİ BAŞLAT
═══════════════════════════════════════ */

const _origDeskOpenRoom2 = window.deskOpenRoom;
window.deskOpenRoom = function(room) {
  if (_origDeskOpenRoom2) _origDeskOpenRoom2.apply(this, arguments);
  const r = room || window._deskRoom;
  if (r) setTimeout(() => initChannelTabs(r), 150);
};

// Mevcut açık oda için de - birden fazla deneme (DOM geç yüklenebilir)
function _tryInjectSidebar(attempt) {
  const header = document.getElementById('deskSidebarHeader');
  if (header) {
    injectSidebarButtons();
    if (window._deskRoom) initChannelTabs(window._deskRoom);
    applyPrefs();
  } else if (attempt < 10) {
    setTimeout(() => _tryInjectSidebar(attempt + 1), 500);
  }
}
setTimeout(() => _tryInjectSidebar(0), 800);

// deskNav hook - sidebar her göründüğünde inject et
const _origDeskNavSF = window.deskNav;
window.deskNav = function(tab) {
  if (_origDeskNavSF) _origDeskNavSF.apply(this, arguments);
  if (tab === 'home') {
    setTimeout(injectSidebarButtons, 300);
  }
};

/* ── Global erişim ── */
window.showPreferencesModal  = showPreferencesModal;
window.switchPrefTab         = switchPrefTab;
window.showCreateMenu        = showCreateMenu;
window.showChannelListMenu   = showChannelListMenu;
window.switchChannelTab      = switchChannelTab;
window.initChannelTabs       = initChannelTabs;
window.saveCanvasContent     = saveCanvasContent;
window.slackMarkUnread       = slackMarkUnread;
window.slackCopyMsgLink      = slackCopyMsgLink;
window.slackRemindMe         = slackRemindMe;
window.slackMuteThread       = slackMuteThread;
window.createSection         = createSection;
window.toggleMutedChannels   = toggleMutedChannels;
window.applyTheme            = applyTheme;
window.changeFontSize        = changeFontSize;
window.savePref              = savePref;
window.clearAppCache         = clearAppCache;
