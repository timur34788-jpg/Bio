/* ═══════════════════════════════════════════════════════════════════
   Nature.co — Kapsamlı Düzeltmeler + Admin Paneli v2.0
   ─────────────────────────────────────────────────────────────────
   1. Tercihler Toggle'ları gerçek zamanlı güncellenmiyor  → DÜZELTİLDİ
   2. showFilterSortModal eksik                            → EKLENDİ
   3. showManageChannelsModal eksik                        → EKLENDİ
   4. showInviteModal eksik                                → EKLENDİ
   5. showCreateChannelModal eksik                         → EKLENDİ
   6. showWorkflowModal eksik                              → EKLENDİ
   7. Kanal Sekmeleri (Canvas/Pinler/Dosyalar) bozuk       → DÜZELTİLDİ
   8. Admin Paneli yeni özellikler + görsel iyileştirme    → YENİ
═══════════════════════════════════════════════════════════════════ */

(function () {
'use strict';

/* ──────────────────────────────────────────────────────────────────
   YARDIMCILAR
────────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const CE = tag => document.createElement(tag);

function _modal(content, maxW = '600px') {
  const bg = CE('div');
  bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit;backdrop-filter:blur(3px);';
  bg.innerHTML = `<div style="background:#141e14;border:1px solid rgba(74,143,64,.2);border-radius:20px;width:100%;max-width:${maxW};max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.9);">${content}</div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  return bg;
}

function _hdr(title, icon = '') {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0;">
    <div style="display:flex;align-items:center;gap:10px;">
      ${icon ? `<span style="font-size:1.3rem;">${icon}</span>` : ''}
      <span style="font-size:1.05rem;font-weight:900;color:#fff;">${title}</span>
    </div>
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:rgba(255,255,255,.5);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">✕</button>
  </div>`;
}

function _btn(label, color, onclick) {
  const c = color === 'green' ? 'rgba(74,143,64,.25);border:1px solid rgba(74,143,64,.4);color:#6dbf67'
           : color === 'red'   ? 'rgba(224,85,85,.15);border:1px solid rgba(224,85,85,.3);color:#e05555'
           : 'rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7)';
  return `<button onclick="${onclick}" style="background:${c};border-radius:10px;padding:9px 18px;font-size:.82rem;font-weight:800;cursor:pointer;font-family:inherit;">${label}</button>`;
}

/* ══════════════════════════════════════════════════════════════════
   1. TERCİHLER TOGGLE DÜZELTMESİ
   savePref sonrası modal içeriği yeniden render edilir
══════════════════════════════════════════════════════════════════ */
window.savePref = function(key, value) {
  localStorage.setItem('pref_' + key, value);
  if (typeof applyPrefs === 'function') applyPrefs();
  // Toggle görselini anında güncelle (static HTML sorunu çözümü)
  const modal = document.getElementById('prefsModal');
  if (modal) {
    // Sadece ilgili toggle'ın span'larını güncelle
    modal.querySelectorAll('input[type=checkbox]').forEach(inp => {
      const k = (inp.getAttribute('onchange') || '').match(/savePref\('([^']+)'/)?.[1];
      if (!k) return;
      const val = localStorage.getItem('pref_' + k);
      const on = val !== null ? val === 'true' : true;
      const track = inp.nextElementSibling;
      const thumb = track?.nextElementSibling;
      if (track) track.style.background = on ? 'rgba(74,143,64,.8)' : 'rgba(255,255,255,.15)';
      if (thumb) thumb.style.left = on ? '21px' : '3px';
    });
  }
};

/* ══════════════════════════════════════════════════════════════════
   2. KANAL SEKMELERİ DÜZELTMESİ
   Panel deskMain içine doğru pozisyona ekleniyor
══════════════════════════════════════════════════════════════════ */
window.switchChannelTab = function(tab, room) {
  if (typeof _activeChannelTab !== 'undefined') window._activeChannelTab = tab;
  document.querySelectorAll('.ch-tab').forEach(t => t.classList.remove('act'));
  const el = document.getElementById('chtab-' + tab);
  if (el) el.classList.add('act');

  const chatArea   = document.getElementById('deskChatArea');
  const existPanel = document.getElementById('deskChatTabPanel');
  if (existPanel) existPanel.remove();

  if (tab === 'messages') {
    if (chatArea) { chatArea.style.display = 'flex'; chatArea.style.flexDirection = 'column'; chatArea.style.flex = '1'; }
    return;
  }

  if (chatArea) chatArea.style.display = 'none';

  const panel = CE('div');
  panel.id = 'deskChatTabPanel';
  panel.style.cssText = 'flex:1;overflow-y:auto;background:var(--bg,#0a120a);padding:20px;';

  // Insert into deskMain, after channelTabBar
  const tabBar = document.getElementById('channelTabBar');
  if (tabBar && tabBar.parentNode) {
    tabBar.parentNode.insertBefore(panel, tabBar.nextSibling);
  } else {
    const main = document.getElementById('deskMain');
    if (main) main.appendChild(panel);
  }

  const r = room || window._deskRoom;
  if (tab === 'canvas')   _fixRenderCanvasTab(panel, r);
  else if (tab === 'pins')    _fixRenderPinsTab(panel, r);
  else if (tab === 'files')   _fixRenderFilesTab(panel, r);
  else if (tab === 'members') _fixRenderMembersTab(panel, r);
};

function _fixRenderCanvasTab(panel, room) {
  panel.innerHTML = `
    <div style="max-width:680px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="font-size:.95rem;font-weight:900;color:#fff;">📋 Canvas</div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:2px;">Bu kanaldaki ortak belgeler</div>
        </div>
        <button onclick="openCanvasPanel('${room}')" style="background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.35);color:#6dbf67;border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">+ Yeni Canvas</button>
      </div>
      <div id="canvasTabList" style="display:grid;gap:10px;">
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;cursor:pointer;transition:background .15s;" onclick="openCanvasPanel('${room}')" onmouseover="this.style.background='rgba(74,143,64,.07)'" onmouseout="this.style.background='rgba(255,255,255,.04)'">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:rgba(74,143,64,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">📄</div>
            <div>
              <div style="font-size:.88rem;font-weight:800;color:#fff;">Kanal Notları</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">Ortak notları buraya yaz</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function _fixRenderPinsTab(panel, room) {
  panel.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);"><div style="font-size:2rem;margin-bottom:8px;">📌</div><div style="font-weight:700;">Yükleniyor...</div></div>';
  if (!window._db || !room) return;
  dbRef('msgs/' + room).once('value').then(snap => {
    const msgs = snap.val() || {};
    const pinned = Object.entries(msgs).filter(([,m]) => m.pinned).map(([k,m]) => ({...m,_key:k}));
    if (!pinned.length) {
      panel.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--muted);">
        <div style="font-size:2.5rem;margin-bottom:12px;">📌</div>
        <div style="font-size:.9rem;font-weight:700;margin-bottom:6px;">Sabitlenmiş mesaj yok</div>
        <div style="font-size:.78rem;">Mesaja sağ tıklayarak sabitle</div>
      </div>`;
      return;
    }
    panel.innerHTML = `<div style="max-width:680px;margin:0 auto;">
      <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">${pinned.length} sabitlenmiş mesaj</div>
      ${pinned.map(m => `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,190,80,.15);border-radius:12px;padding:14px 16px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="width:22px;height:22px;border-radius:7px;background:${typeof strColor==='function'?strColor(m.user):'#4a8f40'};display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:900;color:#fff;">${typeof initials==='function'?initials(m.user):(m.user||'?').slice(0,2).toUpperCase()}</div>
            <span style="font-size:.78rem;font-weight:800;color:rgba(255,190,80,.9);">${typeof esc==='function'?esc(m.user||''):m.user||''}</span>
            <span style="font-size:.68rem;color:var(--muted);">${m.ts ? new Date(m.ts).toLocaleDateString('tr-TR') : ''}</span>
          </div>
          <div style="font-size:.84rem;color:rgba(255,255,255,.8);line-height:1.5;">${typeof esc==='function'?esc(m.text||''):m.text||''}</div>
        </div>`).join('')}
    </div>`;
  });
}

function _fixRenderFilesTab(panel, room) {
  panel.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);">Yükleniyor...</div>';
  if (!window._db || !room) return;
  dbRef('msgs/' + room).once('value').then(snap => {
    const msgs = snap.val() || {};
    const files = Object.entries(msgs).filter(([,m]) => m.file).map(([k,m]) => ({...m,_key:k})).sort((a,b) => b.ts-a.ts);
    if (!files.length) {
      panel.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--muted);">
        <div style="font-size:2.5rem;margin-bottom:12px;">📂</div>
        <div style="font-size:.9rem;font-weight:700;margin-bottom:6px;">Paylaşılan dosya yok</div>
        <div style="font-size:.78rem;">Mesajda dosya gönderince burada görünür</div>
      </div>`;
      return;
    }
    panel.innerHTML = `<div style="max-width:680px;margin:0 auto;">
      <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">${files.length} dosya</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
        ${files.map(m => {
          const isImg = m.file.type && m.file.type.startsWith('image/');
          return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;cursor:pointer;transition:background .15s;" onclick="${isImg ? `zoomImg&&zoomImg('${m.file.data}')` : `downloadDataUrl&&downloadDataUrl('${m.file.data}','${typeof esc==='function'?esc(m.file.name||'dosya'):m.file.name||'dosya'}')`}" onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background='rgba(255,255,255,.04)'">
            ${isImg ? `<img src="${m.file.data}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;" loading="lazy">` : `<div style="height:80px;display:flex;align-items:center;justify-content:center;font-size:2rem;">📄</div>`}
            <div style="padding:8px 10px;">
              <div style="font-size:.72rem;font-weight:700;color:rgba(255,255,255,.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${typeof esc==='function'?esc(m.file.name||'Dosya'):m.file.name||'Dosya'}</div>
              <div style="font-size:.65rem;color:var(--muted);margin-top:2px;">${m.user||''} · ${m.ts ? new Date(m.ts).toLocaleDateString('tr-TR') : ''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });
}

function _fixRenderMembersTab(panel, room) {
  panel.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);">Yükleniyor...</div>';
  if (!window._db || !room) return;
  Promise.all([
    dbRef('rooms/' + room).once('value'),
    dbRef('users').once('value')
  ]).then(([rSnap, uSnap]) => {
    const r = rSnap.val() || {};
    const users = uSnap.val() || {};
    const members = (r.members || []);
    if (!members.length) { panel.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">Üye bulunamadı</div>'; return; }
    panel.innerHTML = `<div style="max-width:520px;margin:0 auto;">
      <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;">${members.length} üye</div>
      ${members.map(u => {
        const ud = users[u] || {};
        const online = !!(window._online || {})[u];
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;transition:background .12s;cursor:pointer;" onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background='transparent'" onclick="viewUserProfile&&viewUserProfile('${u}')">
          <div style="position:relative;">
            <div style="width:36px;height:36px;border-radius:11px;background:${typeof strColor==='function'?strColor(u):'#4a8f40'};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:900;color:#fff;">${typeof initials==='function'?initials(u):u.slice(0,2).toUpperCase()}</div>
            <div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:${online?'#2ecc71':'rgba(255,255,255,.2)'};border:2px solid var(--bg,#0a120a);"></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.85rem;font-weight:800;color:#fff;">${typeof esc==='function'?esc(u):u}</div>
            <div style="font-size:.7rem;color:var(--muted);">${online ? '🟢 Çevrimiçi' : 'Çevrimdışı'}</div>
          </div>
          ${u === window._cu ? '<span style="font-size:.65rem;background:rgba(74,143,64,.2);color:#6dbf67;border-radius:100px;padding:2px 8px;font-weight:800;">Sen</span>' : ''}
        </div>`;
      }).join('')}
    </div>`;
  });
}

/* ══════════════════════════════════════════════════════════════════
   3. EKSİK MODAL FONKSİYONLARI
══════════════════════════════════════════════════════════════════ */

/* ── Filtrele ve Sırala ── */
window.showFilterSortModal = function() {
  const current = localStorage.getItem('channelSort') || 'recent';
  const currentFilter = localStorage.getItem('channelFilter') || 'all';
  const m = _modal(`
    ${_hdr('Filtrele ve Sırala', '🔽')}
    <div style="padding:20px 24px 24px;">
      <div style="font-size:.78rem;font-weight:900;color:var(--muted,#666);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Sırala</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
        ${[
          {v:'recent', l:'🕐 En Son Mesaj'},
          {v:'alpha',  l:'🔤 Alfabetik'},
          {v:'unread', l:'🔴 Okunmamış Önce'},
          {v:'active', l:'🟢 En Aktif'},
        ].map(s => `
          <div onclick="localStorage.setItem('channelSort','${s.v}');document.querySelectorAll('.sort-opt').forEach(x=>x.style.borderColor='rgba(255,255,255,.1)');this.style.borderColor='rgba(74,143,64,.6)';showToast('Sıralama güncellendi')"
            class="sort-opt"
            style="padding:10px 14px;background:rgba(255,255,255,.04);border:2px solid ${current===s.v?'rgba(74,143,64,.6)':'rgba(255,255,255,.1)'};border-radius:10px;cursor:pointer;font-size:.82rem;color:rgba(255,255,255,.8);font-weight:700;transition:all .15s;">
            ${s.l}
          </div>`).join('')}
      </div>
      <div style="font-size:.78rem;font-weight:900;color:var(--muted,#666);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Filtrele</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:24px;">
        ${[
          {v:'all',     l:'Tümü'},
          {v:'unread',  l:'Okunmamış'},
          {v:'muted',   l:'Susturulmuş'},
          {v:'dm',      l:'DM\'ler'},
          {v:'group',   l:'Gruplar'},
          {v:'channel', l:'Kanallar'},
        ].map(f => `
          <div onclick="localStorage.setItem('channelFilter','${f.v}');document.querySelectorAll('.filter-opt').forEach(x=>{x.style.background='rgba(255,255,255,.04)';x.style.color='rgba(255,255,255,.6)'});this.style.background='rgba(74,143,64,.2)';this.style.color='#6dbf67';showToast('Filtre güncellendi')"
            class="filter-opt"
            style="padding:8px;background:${currentFilter===f.v?'rgba(74,143,64,.2)':'rgba(255,255,255,.04)'};border-radius:9px;cursor:pointer;font-size:.78rem;font-weight:700;color:${currentFilter===f.v?'#6dbf67':'rgba(255,255,255,.6)'};text-align:center;transition:all .15s;">
            ${f.l}
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        ${_btn('Sıfırla', 'gray', "localStorage.removeItem('channelSort');localStorage.removeItem('channelFilter');this.closest('[style*=fixed]').remove();showToast('Sıfırlandı')")}
        ${_btn('Uygula', 'green', "this.closest('[style*=fixed]').remove();showToast('✅ Uygulandı')")}
      </div>
    </div>`, '440px');
};

/* ── Kanal Listesini Yönet ── */
window.showManageChannelsModal = function() {
  const m = _modal(`
    ${_hdr('Kanal Listesini Yönet', '📋')}
    <div style="padding:20px 24px 24px;">
      <div style="font-size:.78rem;color:var(--muted);margin-bottom:16px;">Kanalları sürükleyerek sırala, bölümlere ekle veya kanalı bırak</div>
      <div id="manageChList" style="display:flex;flex-direction:column;gap:6px;min-height:60px;">
        <div style="text-align:center;padding:20px;color:var(--muted);">Yükleniyor...</div>
      </div>
      <div style="height:1px;background:rgba(255,255,255,.07);margin:16px 0;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${_btn('+ Kanal Oluştur', 'green', "this.closest('[style*=fixed]').remove();showCreateChannelModal&&showCreateChannelModal()")}
        ${_btn('+ Bölüm Oluştur', 'gray', "this.closest('[style*=fixed]').remove();showCreateSectionModal&&showCreateSectionModal()")}
      </div>
    </div>`, '500px');
  // Load channels
  if (window._db) {
    dbRef('rooms').once('value').then(snap => {
      const rooms = snap.val() || {};
      const list = document.getElementById('manageChList');
      if (!list) return;
      const myRooms = Object.entries(rooms).filter(([,r]) => r && (r.type !== 'group' || (r.members||[]).includes(window._cu)));
      if (!myRooms.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">Kanal bulunamadı</div>'; return; }
      list.innerHTML = myRooms.map(([id, r]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:10px;">
          <span style="color:var(--muted);font-size:1rem;">${r.type==='group'?'👥':'#'}</span>
          <span style="flex:1;font-size:.85rem;font-weight:700;color:rgba(255,255,255,.85);">${typeof esc==='function'?esc(r.name||id):r.name||id}</span>
          <span style="font-size:.7rem;color:var(--muted);margin-right:4px;">${(r.members||[]).length} üye</span>
          <button onclick="showToast('Bu özellik yakında!')" style="background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.2);color:#e05555;border-radius:7px;padding:4px 10px;font-size:.72rem;cursor:pointer;">Bırak</button>
        </div>`).join('');
    });
  }
};

/* ── Kanal Oluştur ── */
window.showCreateChannelModal = function() {
  const m = _modal(`
    ${_hdr('Kanal Oluştur', '#')}
    <div style="padding:20px 24px 24px;">
      <div style="font-size:.78rem;font-weight:800;color:var(--muted);margin-bottom:6px;">Kanal Adı</div>
      <input id="newChanName" type="text" placeholder="ör: genel, duyurular, proje-alpha" maxlength="40"
        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 14px;color:#fff;font-size:.9rem;outline:none;font-family:inherit;margin-bottom:16px;"
        onfocus="this.style.borderColor='rgba(74,143,64,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'">
      <div style="font-size:.78rem;font-weight:800;color:var(--muted);margin-bottom:6px;">Tür</div>
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <label style="flex:1;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:2px solid rgba(74,143,64,.4);border-radius:10px;padding:12px;cursor:pointer;">
          <input type="radio" name="chanType" value="channel" checked style="accent-color:#4a8f40;">
          <div><div style="font-size:.85rem;font-weight:800;color:#fff;"># Kanal</div><div style="font-size:.7rem;color:var(--muted);">Herkese açık</div></div>
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;cursor:pointer;">
          <input type="radio" name="chanType" value="group" style="accent-color:#4a8f40;">
          <div><div style="font-size:.85rem;font-weight:800;color:#fff;">👥 Grup</div><div style="font-size:.7rem;color:var(--muted);">Özel üyeler</div></div>
        </label>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        ${_btn('İptal', 'gray', "this.closest('[style*=fixed]').remove()")}
        ${_btn('Oluştur', 'green', `
          (async function(){
            const name = document.getElementById('newChanName').value.trim().toLowerCase().replace(/\\s+/g,'-');
            if(!name){showToast('Kanal adı boş olamaz');return;}
            if(!window._db||!window._cu){showToast('Giriş yapman gerekiyor');return;}
            const type = document.querySelector('input[name=chanType]:checked')?.value||'channel';
            const key = dbRef('rooms').push().key;
            const data = {name, type, members:[window._cu], createdBy:window._cu, createdAt:Date.now()};
            await dbRef('rooms/'+key).set(data);
            showToast('✅ #'+name+' kanalı oluşturuldu');
            if(typeof loadRooms==='function') loadRooms();
            if(typeof deskLoadRoomList==='function') deskLoadRoomList();
            document.querySelector('[style*=fixed]')?.remove();
          })()
        `)}
      </div>
    </div>`, '440px');
  setTimeout(() => document.getElementById('newChanName')?.focus(), 100);
};

/* ── İnsanları Davet Et ── */
window.showInviteModal = function() {
  const m = _modal(`
    ${_hdr('İnsanları Davet Et', '🔗')}
    <div style="padding:20px 24px 24px;">
      <div style="background:rgba(74,143,64,.08);border:1px solid rgba(74,143,64,.2);border-radius:14px;padding:16px;margin-bottom:20px;">
        <div style="font-size:.78rem;font-weight:800;color:var(--muted);margin-bottom:8px;">DAVET LİNKİ</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div id="inviteLinkDisplay" style="flex:1;background:rgba(0,0,0,.3);border-radius:8px;padding:10px 12px;font-size:.82rem;color:#6dbf67;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Yükleniyor...</div>
          <button onclick="navigator.clipboard.writeText(document.getElementById('inviteLinkDisplay').textContent);showToast('📋 Kopyalandı!')" style="background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.35);color:#6dbf67;border-radius:8px;padding:9px 14px;font-size:.8rem;font-weight:800;cursor:pointer;flex-shrink:0;">Kopyala</button>
        </div>
      </div>
      <div style="font-size:.78rem;font-weight:800;color:var(--muted);margin-bottom:8px;">E-POSTA İLE DAVET</div>
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <input id="inviteEmail" type="email" placeholder="kullanici@ornek.com"
          style="flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;color:#fff;font-size:.85rem;outline:none;font-family:inherit;"
          onfocus="this.style.borderColor='rgba(74,143,64,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'">
        <button onclick="const e=document.getElementById('inviteEmail').value.trim();if(!e){showToast('E-posta gir');return;}showToast('📧 Davet gönderildi: '+e);document.getElementById('inviteEmail').value='';" style="background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.35);color:#6dbf67;border-radius:10px;padding:10px 16px;font-size:.82rem;font-weight:800;cursor:pointer;">Gönder</button>
      </div>
      <div style="font-size:.75rem;color:var(--muted);text-align:center;">Davet linki 7 gün geçerlidir. Admin panelinden yönetebilirsin.</div>
    </div>`, '460px');

  // Load invite link
  if (window._db) {
    dbRef('settings/inviteCode').once('value').then(snap => {
      const el = document.getElementById('inviteLinkDisplay');
      if (!el) return;
      const code = snap.val();
      const base = window.location.origin + window.location.pathname;
      el.textContent = code ? `${base}?invite=${code}` : `${base}?join=${window._activeServer||'nature'}`;
    }).catch(() => {
      const el = document.getElementById('inviteLinkDisplay');
      if (el) el.textContent = window.location.href;
    });
  } else {
    const el = document.getElementById('inviteLinkDisplay');
    if (el) el.textContent = window.location.href;
  }
};

/* ── İş Akışı (stub) ── */
window.showWorkflowModal = function() {
  _modal(`
    ${_hdr('İş Akışı Oluştur', '⚡')}
    <div style="padding:20px 24px 32px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:12px;">⚡</div>
      <div style="font-size:1rem;font-weight:800;color:#fff;margin-bottom:8px;">İş Akışları</div>
      <div style="font-size:.82rem;color:var(--muted);line-height:1.6;max-width:300px;margin:0 auto;">Otomatik hatırlatıcılar, mesaj yönlendirme ve görev takibi yakında geliyor.</div>
      <div style="margin-top:20px;background:rgba(74,143,64,.08);border:1px solid rgba(74,143,64,.2);border-radius:12px;padding:14px;display:inline-block;">
        <div style="font-size:.78rem;color:#6dbf67;font-weight:800;">🚧 Geliştirme Aşamasında</div>
      </div>
    </div>`, '380px');
};

/* ══════════════════════════════════════════════════════════════════
   4. ADMIN PANELİ v2.0 — Gelişmiş + Görsel İyileştirme
══════════════════════════════════════════════════════════════════ */

// deskLoadAdmin'i override ederek yeni görünüm ver
const _origDeskLoadAdmin = window.deskLoadAdmin;
window.deskLoadAdmin = function() {
  const panel = document.getElementById('deskPanelContent');
  if (!panel) { if (_origDeskLoadAdmin) _origDeskLoadAdmin.call(this); return; }

  const tabs = [
    { key: 'dashboard',   label: '📊', title: 'Dashboard'      },
    { key: 'users',       label: '👥', title: 'Kullanıcılar'   },
    { key: 'rooms',       label: '📢', title: 'Odalar'         },
    { key: 'msgs',        label: '💬', title: 'Mesajlar'       },
    { key: 'forum',       label: '📋', title: 'Forum'          },
    { key: 'announce',    label: '📣', title: 'Duyuru'         },
    { key: 'moderation',  label: '🛡️', title: 'Moderasyon'     },
    { key: 'stats',       label: '📈', title: 'İstatistik'     },
    { key: 'health',      label: '❤️', title: 'Sistem'         },
    { key: 'naturebot',   label: '🤖', title: 'NatureBot'      },
    { key: 'design',      label: '🎨', title: 'Tasarım'        },
    { key: 'settings',    label: '⚙️', title: 'Ayarlar'        },
    { key: 'security',    label: '🔒', title: 'Güvenlik'       },
    { key: 'games',       label: '🎮', title: 'Oyunlar'        },
    { key: 'invite',      label: '🔗', title: 'Davet'          },
    { key: 'create_user', label: '➕', title: 'Üye Oluştur'    },
  ];

  panel.innerHTML = `
  <style>
    #adminShell { display:flex;flex-direction:column;height:100%;background:linear-gradient(160deg,#080f08,#0c160c); }
    #adminTopBar { display:flex;align-items:center;gap:12px;padding:14px 20px;background:rgba(0,0,0,.3);border-bottom:1px solid rgba(74,143,64,.1);flex-shrink:0; }
    #adminNavRail { display:flex;gap:2px;padding:8px 12px;overflow-x:auto;flex-shrink:0;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.06); }
    #adminNavRail::-webkit-scrollbar { display:none; }
    .adm-nav-btn {
      display:flex;align-items:center;gap:6px;padding:7px 13px;border-radius:9px;cursor:pointer;
      font-size:.76rem;font-weight:800;color:rgba(255,255,255,.45);white-space:nowrap;
      transition:all .15s;background:transparent;border:none;font-family:inherit;
    }
    .adm-nav-btn:hover { background:rgba(255,255,255,.07);color:rgba(255,255,255,.8); }
    .adm-nav-btn.act { background:rgba(74,143,64,.18);color:#6dbf67;border:1px solid rgba(74,143,64,.25); }
    #adminBody2 { flex:1;overflow-y:auto;padding:20px; }
    .adm-card { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px;transition:background .15s; }
    .adm-card:hover { background:rgba(255,255,255,.06); }
    .adm-stat { background:rgba(74,143,64,.08);border:1px solid rgba(74,143,64,.15);border-radius:14px;padding:16px 20px; }
    .adm-inp { width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:.85rem;outline:none;font-family:inherit;transition:border-color .15s; }
    .adm-inp:focus { border-color:rgba(74,143,64,.5); }
    .adm-btn-green { background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.4);color:#6dbf67;border-radius:9px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;font-family:inherit; }
    .adm-btn-red { background:rgba(224,85,85,.15);border:1px solid rgba(224,85,85,.3);color:#e05555;border-radius:9px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;font-family:inherit; }
    .adm-section-title { font-size:.7rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px; }
  </style>
  <div id="adminShell">
    <div id="adminTopBar">
      <div style="width:32px;height:32px;background:linear-gradient(135deg,#2e7d32,#4a8f40);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">👑</div>
      <div>
        <div style="font-size:.95rem;font-weight:900;color:#fff;">Admin Paneli</div>
        <div style="font-size:.68rem;color:var(--muted);">Nature.co Yönetim Merkezi</div>
      </div>
      <div id="adminOnlineBadge2" style="margin-left:auto;background:rgba(46,182,125,.1);border:1px solid rgba(46,182,125,.2);border-radius:100px;padding:4px 12px;font-size:.72rem;font-weight:800;color:#2eb67d;flex-shrink:0;"></div>
    </div>
    <div id="adminNavRail">
      ${tabs.map(t => `<button class="adm-nav-btn" id="admNav-${t.key}" onclick="adminV2Tab('${t.key}')">${t.label} ${t.title}</button>`).join('')}
    </div>
    <div id="adminBody2"></div>
  </div>`;

  // Online badge
  if (window._db) {
    dbRef('online').once('value').then(s => {
      const el = document.getElementById('adminOnlineBadge2');
      if (el) el.textContent = `🟢 ${Object.keys(s.val()||{}).length} çevrimiçi`;
    });
  }

  window.adminV2Tab('dashboard');
};

window.adminV2Tab = function(tab) {
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('act'));
  const btn = document.getElementById('admNav-' + tab);
  if (btn) btn.classList.add('act');

  // Also sync mobile admin tab if visible
  if (typeof deskAdminTab === 'function' && !['dashboard','moderation'].includes(tab)) {
    // Don't double-call, just sync mobile atabs
    document.querySelectorAll('.atab').forEach(el => {
      el.classList.toggle('act', el.getAttribute('onclick') === `adminTab('${tab}')`);
    });
  }

  const body = document.getElementById('adminBody2');
  if (!body) return;
  body.innerHTML = '<div style="display:flex;justify-content:center;padding:40px;"><div class="ld"><span></span><span></span><span></span></div></div>';

  if (tab === 'dashboard')   _adminDashboard(body);
  else if (tab === 'moderation') _adminModeration(body);
  else {
    // Delegate to existing admin functions
    const legacyBody = body;
    legacyBody.innerHTML = '<div style="display:flex;justify-content:center;padding:40px;"><div class="ld"><span></span><span></span><span></span></div></div>';
    // Map adminTab functions
    if (tab === 'users')       { if(typeof loadAdminUsers==='function')    loadAdminUsers_in(legacyBody); }
    else if (tab === 'rooms')  { if(typeof loadAdminRooms==='function')    _proxyAdmin('adminBody','adminBody2',()=>loadAdminRooms()); }
    else if (tab === 'msgs')   { _proxyAdmin('adminBody','adminBody2',()=>loadAdminMsgs()); }
    else if (tab === 'forum')  { _proxyAdmin('adminBody','adminBody2',()=>loadAdminForum()); }
    else if (tab === 'announce') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminAnnounce()); }
    else if (tab === 'stats')  { _proxyAdmin('adminBody','adminBody2',()=>loadAdminStats()); }
    else if (tab === 'health') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminSystemHealth()); }
    else if (tab === 'security') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminSecurity()); }
    else if (tab === 'settings') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminSettings()); }
    else if (tab === 'naturebot') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminNatureBot()); }
    else if (tab === 'design') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminDesign()); }
    else if (tab === 'games')  { _proxyAdmin('adminBody','adminBody2',()=>loadAdminGames()); }
    else if (tab === 'invite') { _proxyAdmin('adminBody','adminBody2',()=>{ if(typeof window._renderInviteLinks==='function') window._renderInviteLinks(legacyBody); }); }
    else if (tab === 'create_user') { _proxyAdmin('adminBody','adminBody2',()=>{ if(typeof window._renderCreateUser==='function') window._renderCreateUser(legacyBody); }); }
    else if (tab === 'ipbans') { _proxyAdmin('adminBody','adminBody2',()=>loadAdminIPBans()); }
  }
};

// Legacy admin functions use #adminBody - temporarily swap id
function _proxyAdmin(legacyId, newId, fn) {
  const newEl = document.getElementById(newId);
  if (!newEl) { fn(); return; }
  const old = document.getElementById(legacyId);
  if (old) old.id = '__adminBodyOld__';
  newEl.id = legacyId;
  try { fn(); } catch(e) { console.warn('Admin tab error:', e); }
  setTimeout(() => {
    const el2 = document.getElementById(legacyId);
    if (el2 && el2 !== newEl) el2.id = '__adminBodyOld__';
    newEl.id = newId;
    if (old) old.id = legacyId;
  }, 50);
}

/* ── Admin Dashboard ── */
async function _adminDashboard(body) {
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:20px;" id="admStatRow">
      ${['👥 Üyeler','💬 Odalar','📋 Forum','🟢 Çevrimiçi'].map(l=>`
        <div class="adm-stat">
          <div style="font-size:1.6rem;font-weight:900;color:#6dbf67;" id="admStat-${l.split(' ')[1]}">—</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:4px;">${l}</div>
        </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div class="adm-card">
        <div class="adm-section-title">Son Katılanlar</div>
        <div id="admRecentUsers" style="font-size:.82rem;color:var(--muted);">Yükleniyor...</div>
      </div>
      <div class="adm-card">
        <div class="adm-section-title">Hızlı İşlemler</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button class="adm-btn-green" onclick="adminV2Tab('announce')" style="text-align:left;">📣 Duyuru Gönder</button>
          <button class="adm-btn-green" onclick="showCreateChannelModal&&showCreateChannelModal()" style="text-align:left;">📢 Kanal Oluştur</button>
          <button class="adm-btn-green" onclick="adminV2Tab('invite')" style="text-align:left;">🔗 Davet Linki Oluştur</button>
          <button class="adm-btn-red" onclick="adminV2Tab('security')" style="text-align:left;">🛡️ Güvenlik Ayarları</button>
        </div>
      </div>
    </div>
    <div class="adm-card">
      <div class="adm-section-title">Son Aktivite</div>
      <div id="admActivityFeed" style="font-size:.82rem;color:var(--muted);">Yükleniyor...</div>
    </div>`;

  if (!window._db) return;
  try {
    const [uSnap, rSnap, fSnap, oSnap] = await Promise.all([
      dbRef('users').once('value'),
      dbRef('rooms').once('value'),
      dbRef('forum/posts').once('value'),
      dbRef('online').once('value'),
    ]);
    const uCount = Object.keys(uSnap.val()||{}).length;
    const rCount = Object.keys(rSnap.val()||{}).length;
    const fCount = Object.keys(fSnap.val()||{}).length;
    const oCount = Object.keys(oSnap.val()||{}).length;

    const setS = (key, val) => { const el = body.querySelector(`[id="admStat-${key}"]`); if(el) el.textContent = val; };
    setS('Üyeler', uCount); setS('Odalar', rCount); setS('Forum', fCount); setS('Çevrimiçi', oCount);

    // Recent users
    const recent = Object.entries(uSnap.val()||{}).sort(([,a],[,b])=>(b.joinedAt||0)-(a.joinedAt||0)).slice(0,5);
    const ruEl = body.querySelector('#admRecentUsers');
    if (ruEl) ruEl.innerHTML = recent.length
      ? recent.map(([u,d])=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:26px;height:26px;border-radius:8px;background:${typeof strColor==='function'?strColor(u):'#4a8f40'};display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:900;color:#fff;">${typeof initials==='function'?initials(u):u.slice(0,2).toUpperCase()}</div>
          <span style="font-size:.82rem;color:rgba(255,255,255,.8);flex:1;">${typeof esc==='function'?esc(u):u}</span>
          ${d.banned?'<span style="font-size:.65rem;background:rgba(224,85,85,.15);color:#e05555;border-radius:5px;padding:2px 6px;">Banlı</span>':''}
        </div>`).join('')
      : '<div style="color:var(--muted);">Henüz kullanıcı yok</div>';

    // Activity feed
    const actEl = body.querySelector('#admActivityFeed');
    if (actEl) actEl.innerHTML = `<div style="color:rgba(255,255,255,.5);font-size:.8rem;">📊 ${uCount} kullanıcı · ${rCount} oda · ${oCount} çevrimiçi · ${fCount} forum gönderisi</div>`;
  } catch(e) {}
}

/* ── Admin Moderasyon ── */
async function _adminModeration(body) {
  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:.95rem;font-weight:900;color:#fff;margin-bottom:4px;">🛡️ Moderasyon Merkezi</div>
      <div style="font-size:.78rem;color:var(--muted);">Hızlı banlama, susturma ve içerik yönetimi</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div class="adm-card">
        <div class="adm-section-title">Kullanıcı İşlemleri</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
          <input class="adm-inp" id="modUsername" placeholder="Kullanıcı adı...">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="adm-btn-red" onclick="_modAction('ban')">🚫 Banla</button>
          <button class="adm-btn-green" onclick="_modAction('unban')">✅ Ban Kaldır</button>
          <button class="adm-btn-red" onclick="_modAction('mute')">🔇 Sustur</button>
          <button class="adm-btn-green" onclick="_modAction('unmute')">🔊 Sesi Aç</button>
        </div>
      </div>
      <div class="adm-card">
        <div class="adm-section-title">Oda İşlemleri</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
          <select class="adm-inp" id="modRoom"><option value="">Oda seç...</option></select>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="adm-btn-red" onclick="_modRoomAction('lock')">🔒 Kilitle</button>
          <button class="adm-btn-green" onclick="_modRoomAction('unlock')">🔓 Kilidi Aç</button>
          <button class="adm-btn-red" onclick="_modRoomAction('clear')">🗑 Mesajları Temizle</button>
        </div>
      </div>
    </div>
    <div class="adm-card">
      <div class="adm-section-title">Banlı Kullanıcılar</div>
      <div id="modBanList" style="font-size:.82rem;color:var(--muted);">Yükleniyor...</div>
    </div>`;

  window._modAction = async function(action) {
    const u = document.getElementById('modUsername')?.value.trim();
    if (!u) { showToast('Kullanıcı adı gir'); return; }
    if (!window._db || !window._isAdmin) { showToast('Yetki yok'); return; }
    if (action === 'ban') {
      await dbRef('users/' + u + '/banned').set(true);
      await dbRef('bans/' + u).set({ by: window._cu, at: Date.now() });
      showToast('🚫 ' + u + ' banlandı');
    } else if (action === 'unban') {
      await dbRef('users/' + u + '/banned').remove();
      await dbRef('bans/' + u).remove();
      showToast('✅ ' + u + ' banı kaldırıldı');
    } else if (action === 'mute') {
      const until = Date.now() + 60 * 60 * 1000;
      await dbRef('users/' + u + '/mutedUntil').set(until);
      showToast('🔇 ' + u + ' 1 saat susturuldu');
    } else if (action === 'unmute') {
      await dbRef('users/' + u + '/mutedUntil').remove();
      showToast('🔊 ' + u + ' sesini açıldı');
    }
  };

  window._modRoomAction = async function(action) {
    const rId = document.getElementById('modRoom')?.value;
    if (!rId) { showToast('Oda seç'); return; }
    if (!window._db || !window._isAdmin) { showToast('Yetki yok'); return; }
    if (action === 'lock') { await dbRef('rooms/' + rId + '/locked').set(true); showToast('🔒 Oda kilitlendi'); }
    else if (action === 'unlock') { await dbRef('rooms/' + rId + '/locked').remove(); showToast('🔓 Kilit açıldı'); }
    else if (action === 'clear') {
      if (!confirm('Tüm mesajlar silinsin mi?')) return;
      await dbRef('msgs/' + rId).remove();
      showToast('🗑 Mesajlar temizlendi');
    }
  };

  if (!window._db) return;
  // Load rooms for select
  dbRef('rooms').once('value').then(s => {
    const sel = document.getElementById('modRoom');
    if (!sel) return;
    Object.entries(s.val()||{}).forEach(([id,r]) => {
      const opt = CE('option');
      opt.value = id; opt.textContent = r.name || id;
      sel.appendChild(opt);
    });
  });

  // Load ban list
  dbRef('bans').once('value').then(s => {
    const el = document.getElementById('modBanList');
    if (!el) return;
    const bans = s.val() || {};
    const keys = Object.keys(bans);
    if (!keys.length) { el.textContent = 'Banlı kullanıcı yok'; return; }
    el.innerHTML = keys.map(u => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <span style="flex:1;color:rgba(255,255,255,.8);">${typeof esc==='function'?esc(u):u}</span>
        <span style="font-size:.68rem;color:var(--muted);">${bans[u].by ? 'by ' + bans[u].by : ''}</span>
        <button onclick="dbRef('users/${u}/banned').remove();dbRef('bans/${u}').remove();this.closest('div').remove();showToast('Ban kaldırıldı')" class="adm-btn-green" style="padding:4px 10px;font-size:.72rem;">Kaldır</button>
      </div>`).join('');
  });
}

/* ══════════════════════════════════════════════════════════════════
   5. ADMIN TAB FONKSİYONU mobile ve desktop uyumu
══════════════════════════════════════════════════════════════════ */
const _origAdminTab = window.adminTab;
window.adminTab = function(tab) {
  // Mobile admin panel
  if (_origAdminTab) _origAdminTab.call(this, tab);
  // Sync desktop admin if open
  if (typeof adminV2Tab === 'function' && document.getElementById('admNav-' + tab)) {
    adminV2Tab(tab);
  }
};

/* ══════════════════════════════════════════════════════════════════
   6. GLOBAL EXPORTS
══════════════════════════════════════════════════════════════════ */
window.showFilterSortModal    = window.showFilterSortModal;
window.showManageChannelsModal= window.showManageChannelsModal;
window.showCreateChannelModal = window.showCreateChannelModal;
window.showInviteModal        = window.showInviteModal;
window.showWorkflowModal      = window.showWorkflowModal;
window.adminV2Tab             = window.adminV2Tab;

console.log('✅ Nature.co Fixes v2.0 yüklendi');

})();

/* ══════════════════════════════════════════════════════════════════
   7. HAZIR TEMA PRESTLERİ
══════════════════════════════════════════════════════════════════ */
const _themes = {
  nature:   { bg:'#080f08', bg2:'#0c160c', surface:'#111a11', surface2:'#182018', border:'rgba(74,143,64,.18)', accent:'#4a8f40', own:'#0f2a0f', muted:'rgba(255,255,255,.38)', name:'Nature' },
  midnight: { bg:'#060818', bg2:'#0a1228', surface:'#0e1a32', surface2:'#162040', border:'rgba(91,155,213,.18)', accent:'#5b9bd5', own:'#0d1d3a', muted:'rgba(255,255,255,.38)', name:'Gece Mavisi' },
  crimson:  { bg:'#0e0606', bg2:'#180a0a', surface:'#201010', surface2:'#2a1414', border:'rgba(224,85,85,.18)', accent:'#e05555', own:'#2a0a0a', muted:'rgba(255,255,255,.38)', name:'Kızıl' },
  amethyst: { bg:'#0c0612', bg2:'#140a24', surface:'#1a0f2e', surface2:'#22153a', border:'rgba(155,89,182,.18)', accent:'#9b59b6', own:'#1a0a2e', muted:'rgba(255,255,255,.38)', name:'Ametist' },
  amber:    { bg:'#100c02', bg2:'#1a1404', surface:'#221c06', surface2:'#2c2408', border:'rgba(240,192,64,.18)', accent:'#f0c040', own:'#261e04', muted:'rgba(255,255,255,.38)', name:'Kehribar' },
  teal:     { bg:'#040e0e', bg2:'#061818', surface:'#0a2020', surface2:'#102828', border:'rgba(26,188,156,.18)', accent:'#1abc9c', own:'#061a1a', muted:'rgba(255,255,255,.38)', name:'Turkuaz' },
};

window.applyThemePreset = function(id) {
  const t = _themes[id];
  if (!t) return;

  const r = document.documentElement;
  r.style.setProperty('--bg',      t.bg);
  r.style.setProperty('--bg2',     t.bg2);
  r.style.setProperty('--surface', t.surface);
  r.style.setProperty('--surface2',t.surface2);
  r.style.setProperty('--border',  t.border);
  r.style.setProperty('--accent',  t.accent);
  r.style.setProperty('--own',     t.own);
  r.style.setProperty('--muted',   t.muted);

  // CSS overrides for dynamic elements
  const styleId = 'nc-theme-override';
  let el = document.getElementById(styleId);
  if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
  el.textContent = `
    :root { --accent: ${t.accent}; }
    .rail-btn.act svg, .tab.act svg { stroke: ${t.accent} !important; }
    .tab.act .tab-lb { color: ${t.accent} !important; }
    .rail-btn.act { border-left-color: ${t.accent} !important; }
    .room-item.active { background: ${t.accent}22 !important; border-left-color: ${t.accent} !important; }
    .send-btn, #deskSendBtn { background: ${t.accent} !important; }
    .ch-tab.act { color: ${t.accent} !important; border-bottom-color: ${t.accent} !important; }
    .adm-nav-btn.act { background: ${t.accent}25 !important; color: ${t.accent}dd !important; border-color: ${t.accent}40 !important; }
  `;

  localStorage.setItem('nc_theme_preset', id);
  localStorage.setItem('nc_theme_data', JSON.stringify(t));

  // Update UI border highlights
  document.querySelectorAll('[id^="tp-"]').forEach(el => {
    el.style.borderColor = el.id === 'tp-' + id ? t.accent + 'aa' : 'rgba(255,255,255,.1)';
  });

  if (typeof showToast === 'function') showToast('🎨 ' + t.name + ' teması uygulandı');
};

// Restore saved theme on load
(function _restoreTheme() {
  const saved = localStorage.getItem('nc_theme_preset');
  if (saved && _themes[saved]) {
    // Small delay so CSS vars are ready
    setTimeout(() => {
      window.applyThemePreset(saved);
    }, 200);
  }
})();


/* ══════════════════════════════════════════════
   🎮 OYUN AÇMA FONKSİYONU
══════════════════════════════════════════════ */

window.openBrowserGame = function(gameId) {
  // Find game in catalog
  const game = (typeof GAME_CATALOG !== 'undefined' ? GAME_CATALOG : [])
    .concat(window._customGames || [])
    .find(g => g.id === gameId);

  if (!game) { if (typeof showToast === 'function') showToast('❌ Oyun bulunamadı'); return; }

  // Remove existing modal
  const existing = document.getElementById('gameIframeModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'gameIframeModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="width:min(98vw,1100px);height:min(92vh,720px);display:flex;flex-direction:column;background:#0a140a;border-radius:16px;overflow:hidden;border:1px solid rgba(74,143,64,.25);box-shadow:0 24px 80px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(74,143,64,.12);flex-shrink:0;">
        <span style="font-size:1.4rem;">${game.icon}</span>
        <div>
          <div style="font-size:.9rem;font-weight:800;color:#fff;">${game.name}</div>
          <div style="font-size:.7rem;color:var(--muted,#888);">${game.desc||''} · ${game.age||''}  · ${(game.cat||'').toUpperCase()}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
          <button onclick="document.getElementById('gameIframeModal').querySelector('iframe').requestFullscreen&&document.getElementById('gameIframeModal').querySelector('iframe').requestFullscreen()" style="background:rgba(74,143,64,.15);border:1px solid rgba(74,143,64,.3);color:#6dbf67;border-radius:8px;padding:5px 12px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:inherit;">⛶ Tam Ekran</button>
          <button onclick="document.getElementById('gameIframeModal').remove()" style="background:rgba(224,85,85,.15);border:1px solid rgba(224,85,85,.3);color:#e05555;border-radius:8px;padding:5px 12px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:inherit;">✕ Kapat</button>
        </div>
      </div>
      <iframe src="${game.url}" allow="fullscreen;autoplay;camera;microphone" allowfullscreen style="flex:1;border:none;background:#000;"></iframe>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};


/* ══════════════════════════════════════════════
   🔧 EKSİK FONKSİYON GÜVENLİK AĞI
══════════════════════════════════════════════ */

// Ensure these are always defined even if misc.js somehow fails
if (!window.openBotPersonality) {
  window.openBotPersonality = function() {
    if (typeof showToast === 'function') showToast('🤖 Bot Kişiliği yakında!');
  };
}
if (!window.openTimeCapsule) {
  window.openTimeCapsule = function() {
    if (typeof showToast === 'function') showToast('🧬 Zaman Kapsülü yakında!');
  };
}

// Safe wrapper for showInviteModal references before load
if (!window.showInviteModal) {
  window.showInviteModal = function() {
    // Real implementation already defined above - this is just a guard
    if (typeof showToast === 'function') showToast('Yükleniyor...');
  };
}



/* ══════════════════════════════════════════════
   LOGIN / KAYIT METOD TOGGLE (E-posta ↔ Telefon)
══════════════════════════════════════════════ */

window.toggleLoginMethod = function() {
  const method = document.querySelector('input[name="loginMethod"]:checked')?.value || 'email';
  const emailField  = document.getElementById('loginEmailField');
  const phoneField  = document.getElementById('loginPhoneField');
  const otpStep     = document.getElementById('loginPhoneOtpStep');
  const forgotRow   = document.getElementById('loginForgotRow');

  if (method === 'phone') {
    if (emailField) emailField.style.display = 'none';
    if (phoneField) phoneField.style.display = 'block';
    if (otpStep)    otpStep.style.display    = 'none';
    if (forgotRow)  forgotRow.style.display  = 'none';
  } else {
    if (emailField) emailField.style.display = 'block';
    if (phoneField) phoneField.style.display = 'none';
    if (otpStep)    otpStep.style.display    = 'none';
    if (forgotRow)  forgotRow.style.display  = 'block';
  }
};

window.toggleRegMethod = function() {
  const method = document.querySelector('input[name="regMethod"]:checked')?.value || 'email';
  const emailField = document.getElementById('regEmailField');
  const phoneField = document.getElementById('regPhoneField');
  if (method === 'phone') {
    if (emailField) emailField.style.display = 'none';
    if (phoneField) phoneField.style.display = 'block';
  } else {
    if (emailField) emailField.style.display = 'block';
    if (phoneField) phoneField.style.display = 'none';
  }
};

/* ══ Şifremi Unuttum Modal ══ */
window.showForgotPassword = function() {
  const existing = document.getElementById('forgotPwModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'forgotPwModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2,#121a12);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:16px;padding:24px;width:100%;max-width:360px;">
      <div style="font-size:1rem;font-weight:800;color:var(--text-hi,#fff);margin-bottom:6px;">🔑 Şifremi Unuttum</div>
      <div style="font-size:.78rem;color:var(--muted,#888);margin-bottom:16px;">E-posta adresini gir, şifre sıfırlama bağlantısı gönderelim.</div>
      <input id="forgotPwEmail" type="email" placeholder="ornek@mail.com" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#fff;font-size:.85rem;outline:none;font-family:inherit;margin-bottom:12px;">
      <div id="forgotPwErr" style="color:#e05555;font-size:.75rem;min-height:16px;margin-bottom:8px;"></div>
      <div style="display:flex;gap:8px;">
        <button onclick="document.getElementById('forgotPwModal').remove()" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--muted,#888);border-radius:9px;padding:9px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;">İptal</button>
        <button onclick="doForgotPassword()" style="flex:2;background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.4);color:#6dbf67;border-radius:9px;padding:9px;font-size:.8rem;font-weight:800;cursor:pointer;font-family:inherit;">📧 Gönder</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  document.getElementById('forgotPwEmail')?.focus();
};

window.doForgotPassword = async function() {
  const email = document.getElementById('forgotPwEmail')?.value.trim() || '';
  const errEl = document.getElementById('forgotPwErr');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    if (errEl) errEl.textContent = 'Geçerli bir e-posta girin.';
    return;
  }
  if (errEl) errEl.textContent = '';
  if (typeof sendPasswordReset === 'function') {
    await sendPasswordReset(email);
    document.getElementById('forgotPwModal')?.remove();
  }
};

