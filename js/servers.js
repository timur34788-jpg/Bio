/* ═══════════════════════════════════════════════════════════════════
   Nature.co — servers.js
   Discord/Slack tarzı Sunucu (Guild) Sistemi
   ─────────────────────────────────────────────────────────────────
   Firebase Veri Yapısı:
   ┌─ guilds/{guildId}
   │    name, description, icon (emoji), color, isPublic
   │    ownerId, createdAt, memberCount, inviteCode
   │
   ├─ guilds/{guildId}/channels/{channelId}
   │    name, type (text|announce), topic, position, slowMode
   │    createdBy, createdAt, isReadOnly
   │
   ├─ guilds/{guildId}/members/{username}
   │    role (owner|admin|moderator|member), joinedAt, nickname
   │
   ├─ guilds/{guildId}/roles/{roleId}
   │    name, color, position, permissions: {
   │      manageChannels, manageRoles, kickMembers,
   │      banMembers, sendMessages, manageMessages
   │    }
   │
   ├─ guildMsgs/{guildId}/{channelId}/{msgId}
   │    user, text, ts, edited, editedAt, replyTo
   │
   ├─ guildReads/{username}/{guildId}/{channelId}  → timestamp
   │
   └─ userGuilds/{username}/{guildId} → true  (hızlı üyelik bakışı)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Durum Değişkenleri ────────────────────────────────────────── */
let _activeGuild   = null;   // Aktif sunucu ID
let _activeChannel = null;   // Aktif kanal ID
let _guildCache    = {};     // Sunucu verileri önbelleği
let _channelCache  = {};     // Kanal listesi önbelleği
let _memberCache   = {};     // Üye listesi önbelleği
let _guildMsgStop  = null;   // Mesaj dinleyici temizleyici
let _guildUnread   = {};     // {guildId: {channelId: count}}
let _myGuilds      = [];     // Kullanıcının üye olduğu sunucular
let _myGuildRole   = {};     // {guildId: role}

/* ── İzin Tanımları ────────────────────────────────────────────── */
const ROLES = { owner: 5, admin: 4, moderator: 3, member: 1 };
const PERM = {
  MANAGE_CHANNELS : 'manageChannels',
  MANAGE_ROLES    : 'manageRoles',
  KICK_MEMBERS    : 'kickMembers',
  BAN_MEMBERS     : 'banMembers',
  SEND_MESSAGES   : 'sendMessages',
  MANAGE_MESSAGES : 'manageMessages'
};

/* ─────────────────────────────────────────────────────────────────
   YARDIMCI FONKSİYONLAR
───────────────────────────────────────────────────────────────── */
function _guildId()  { return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function _chanId()   { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function _roleId()   { return 'r' + Date.now().toString(36); }

function hasGuildPerm(guildId, perm) {
  const role = _myGuildRole[guildId];
  if (!role) return false;
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'moderator' && [PERM.KICK_MEMBERS, PERM.MANAGE_MESSAGES].includes(perm)) return true;
  if (perm === PERM.SEND_MESSAGES) return true;
  return false;
}

function isGuildOwner(guildId) { return _myGuildRole[guildId] === 'owner'; }
function isGuildAdmin(guildId) { return ['owner','admin'].includes(_myGuildRole[guildId]); }

/* ─────────────────────────────────────────────────────────────────
   1. SUNUCU YÜKLEMESİ — Kullanıcının sunucuları
───────────────────────────────────────────────────────────────── */
async function loadMyGuilds() {
  // Auth guard: Firebase token hazır olana kadar bekleme
  if (!_db || !_cu) return;
  // Firebase auth token kontrolü — 401 önlemi
  try { await new Promise((res, rej) => {
    const u = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null;
    if (u) res(); else setTimeout(res, 500); // token yoksa 500ms bekle
  }); } catch(e) {}
  try {
    const data = (await fbRestGet('userGuilds/' + _cu).catch(()=>null)) || {};
    _myGuilds = Object.keys(data);

    // Her sunucunun meta verisini yükle
    await Promise.all(_myGuilds.map(async gid => {
      try {
        const g = await fbRestGet('guilds/' + gid).catch(()=>null);
        if (g) {
          _guildCache[gid] = g;
          const m = await fbRestGet('guilds/' + gid + '/members/' + _cu).catch(()=>null);
          if (m) _myGuildRole[gid] = m.role || 'member';
        }
      } catch(e) {}
    }));

    renderGuildRail();
  } catch(e) { console.error('loadMyGuilds:', e); }
}

/* ─────────────────────────────────────────────────────────────────
   2. SUNUCU RAIL — Sol kenar sunucu ikonları (Discord tarzı)
───────────────────────────────────────────────────────────────── */
function renderGuildRail() {
  // Devre dışı — deskRail kullanılıyor
  const old = document.getElementById('guildRail');
  if (old) old.remove();
  document.body.style.paddingLeft = '';
}

/* ─────────────────────────────────────────────────────────────────
   3. SUNUCU OLUŞTURMA
───────────────────────────────────────────────────────────────── */
function showCreateGuildModal() {
  const emojis = ['🌿','🌊','🏔️','🦋','🌸','🔥','⚡','🎮','🎵','🚀','💎','🌙','☀️','🦅','🐉'];
  _removeModal('createGuildModal');

  const modal = document.createElement('div');
  modal.id = 'createGuildModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2,#1a1f2e);border:1px solid var(--border,rgba(255,255,255,.1));
         border-radius:20px;padding:28px 24px;width:100%;max-width:420px;
         box-shadow:0 20px 60px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-size:1.1rem;font-weight:900;color:var(--text-hi,#fff);">Sunucu Oluştur</div>
        <div onclick="_removeModal('createGuildModal')" style="cursor:pointer;color:var(--muted,#666);padding:4px 8px;">✕</div>
      </div>

      <!-- İkon Seçimi -->
      <div style="margin-bottom:16px;">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Sunucu İkonu</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${emojis.map((e,i) => `
            <div class="guild-emoji-opt" data-emoji="${e}" onclick="selectGuildEmoji(this,'${e}')"
                 style="width:40px;height:40px;border-radius:10px;display:flex;align-items:center;
                        justify-content:center;font-size:1.3rem;cursor:pointer;
                        background:${i===0?'var(--accent,#4a8f40)22':'var(--surface,#0d1117)'};
                        border:2px solid ${i===0?'var(--accent,#4a8f40)':'var(--border,rgba(255,255,255,.1))'};
                        transition:all .15s;">
              ${e}
            </div>`).join('')}
        </div>
        <input type="hidden" id="guildIconInput" value="${emojis[0]}">
      </div>

      <!-- Renk -->
      <div style="margin-bottom:16px;">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Renk</div>
        <div style="display:flex;gap:8px;">
          ${['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63'].map((c,i) => `
            <div onclick="selectGuildColor(this,'${c}')"
                 style="width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;
                        border:3px solid ${i===3?'#fff':'transparent'};transition:border-color .15s;"
                 data-color="${c}"></div>`).join('')}
        </div>
        <input type="hidden" id="guildColorInput" value="#2ecc71">
      </div>

      <!-- Sunucu Adı -->
      <div style="margin-bottom:12px;">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Sunucu Adı *</div>
        <input id="guildNameInput" type="text" maxlength="50" placeholder="Sunucunun adı..."
               autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
               style="width:100%;background:var(--surface,#0d1117);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               onfocus="this.style.borderColor='var(--accent,#4a8f40)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>

      <!-- Açıklama -->
      <div style="margin-bottom:16px;">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Açıklama</div>
        <textarea id="guildDescInput" maxlength="200" placeholder="Sunucunuz hakkında kısa bir bilgi..."
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;
                      resize:none;height:70px;"
               onfocus="this.style.borderColor='var(--accent,#4a8f40)'"
               onblur="this.style.borderColor='var(--border)'"></textarea>
      </div>

      <!-- Gizlilik -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  background:var(--surface);border-radius:10px;padding:12px 14px;margin-bottom:20px;">
        <div>
          <div style="font-size:.85rem;font-weight:700;color:var(--text-hi);">Herkese Açık</div>
          <div style="font-size:.72rem;color:var(--muted);">Sunucu keşif listesinde görünsün</div>
        </div>
        <div onclick="this.classList.toggle('on');document.getElementById('guildPublicInput').value=this.classList.contains('on')?'true':'false';"
             style="width:44px;height:24px;border-radius:12px;background:var(--surface2);
                    cursor:pointer;position:relative;transition:background .2s;"
             id="guildPublicToggle">
          <div style="position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;
                      background:#fff;transition:transform .2s;"></div>
        </div>
        <input type="hidden" id="guildPublicInput" value="false">
      </div>

      <div id="createGuildErr" style="color:#e05555;font-size:.8rem;margin-bottom:10px;min-height:18px;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="_removeModal('createGuildModal')"
                style="flex:1;padding:12px;background:var(--surface);border:1px solid var(--border);
                       border-radius:12px;color:var(--text);font-size:.9rem;font-weight:700;cursor:pointer;">
          İptal
        </button>
        <button onclick="doCreateGuild()" id="createGuildBtn"
                style="flex:2;padding:12px;background:var(--accent,#4a8f40);border:none;
                       border-radius:12px;color:#fff;font-size:.9rem;font-weight:900;cursor:pointer;">
          Sunucu Oluştur →
        </button>
      </div>
    </div>`;

  // CSS toggle animasyonu
  const style = document.createElement('style');
  style.textContent = `
    #guildPublicToggle.on { background: var(--accent, #4a8f40) !important; }
    #guildPublicToggle.on div { transform: translateX(20px); }
  `;
  modal.appendChild(style);
  modal.addEventListener('click', e => { if (e.target === modal) _removeModal('createGuildModal'); });
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('guildNameInput')?.focus(), 100);
}

function selectGuildEmoji(el, emoji) {
  document.querySelectorAll('.guild-emoji-opt').forEach(e => {
    e.style.background = 'var(--surface,#0d1117)';
    e.style.borderColor = 'var(--border,rgba(255,255,255,.1))';
  });
  el.style.background = 'var(--accent,#4a8f40)22';
  el.style.borderColor = 'var(--accent,#4a8f40)';
  document.getElementById('guildIconInput').value = emoji;
}

function selectGuildColor(el, color) {
  document.querySelectorAll('[data-color]').forEach(e => e.style.borderColor = 'transparent');
  el.style.borderColor = '#fff';
  document.getElementById('guildColorInput').value = color;
}

async function doCreateGuild() {
  const name    = (document.getElementById('guildNameInput')?.value || '').trim();
  const desc    = (document.getElementById('guildDescInput')?.value || '').trim();
  const icon    = document.getElementById('guildIconInput')?.value || '🌿';
  const color   = document.getElementById('guildColorInput')?.value || '#2ecc71';
  const isPublic = document.getElementById('guildPublicInput')?.value === 'true';
  const errEl   = document.getElementById('createGuildErr');
  const btn     = document.getElementById('createGuildBtn');

  if (!name) { if(errEl) errEl.textContent = 'Sunucu adı girin.'; return; }
  if (name.length < 2) { if(errEl) errEl.textContent = 'Ad en az 2 karakter olmalı.'; return; }

  btn.textContent = 'Oluşturuluyor...'; btn.disabled = true;
  if(errEl) errEl.textContent = '';

  const gid = _guildId();
  const now = Date.now();
  // Otomatik davet kodu
  const inviteCode = Math.random().toString(36).slice(2, 9).toUpperCase();

  // Varsayılan kanallar
  const genel = _chanId();
  const duyuru = _chanId();

  const guildData = {
    name, description: desc, icon, color,
    isPublic, ownerId: _cu, createdAt: now,
    memberCount: 1, inviteCode
  };

  const channels = {
    [genel]:  { name: 'genel',    type: 'text',     position: 0, createdBy: _cu, createdAt: now },
    [duyuru]: { name: 'duyurular', type: 'announce', position: 1, createdBy: _cu, createdAt: now, isReadOnly: true }
  };

  const members = {
    [_cu]: { role: 'owner', joinedAt: now }
  };

  try {
    // Toplu yazma
    const updates = {};
    updates[`guilds/${gid}`]                    = guildData;
    updates[`guilds/${gid}/channels`]           = channels;
    updates[`guilds/${gid}/members`]            = members;
    updates[`userGuilds/${_cu}/${gid}`]         = true;

    for (const [p, v] of Object.entries(updates)) { await fbRestSet(p, v); }

    _guildCache[gid]   = { ...guildData, channels, members };
    _myGuildRole[gid]  = 'owner';
    _myGuilds.push(gid);

    _removeModal('createGuildModal');
    showToast('✅ Sunucu oluşturuldu!');
    await openGuild(gid);
  } catch(e) {
    if(errEl) errEl.textContent = 'Hata: ' + (e.message || 'Bilinmeyen hata');
    btn.textContent = 'Sunucu Oluştur →'; btn.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────────────────
   4. SUNUCUYA KATILMA (Davet Kodu ile)
───────────────────────────────────────────────────────────────── */
function showJoinGuildModal(prefillCode = '') {
  _removeModal('joinGuildModal');
  const modal = document.createElement('div');
  modal.id = 'joinGuildModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);
         border-radius:20px;padding:28px 24px;width:100%;max-width:400px;
         box-shadow:0 20px 60px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-size:1.1rem;font-weight:900;color:var(--text-hi);">Sunucuya Katıl</div>
        <div onclick="_removeModal('joinGuildModal')" style="cursor:pointer;color:var(--muted);padding:4px 8px;">✕</div>
      </div>
      <div style="font-size:.85rem;color:var(--muted);margin-bottom:16px;line-height:1.5;">
        Arkadaşından aldığın davet kodunu veya linki gir.
      </div>
      <input id="joinCodeInput" type="text" maxlength="30" placeholder="Davet kodu (ör: A3K9Z7F) veya link..."
             value="${esc(prefillCode)}" autocomplete="off" autocorrect="off" autocapitalize="characters"
             spellcheck="false"
             style="width:100%;background:var(--surface);border:1px solid var(--border);
                    border-radius:10px;padding:12px 14px;color:var(--text-hi);
                    font-size:.95rem;font-family:inherit;box-sizing:border-box;outline:none;
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;"
             onfocus="this.style.borderColor='var(--accent,#4a8f40)'"
             onblur="this.style.borderColor='var(--border)'"
             onkeydown="if(event.key==='Enter')doJoinGuild()">
      <div id="joinGuildPreview" style="margin-bottom:12px;min-height:60px;"></div>
      <div id="joinGuildErr" style="color:#e05555;font-size:.8rem;margin-bottom:10px;min-height:18px;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="_removeModal('joinGuildModal')"
                style="flex:1;padding:12px;background:var(--surface);border:1px solid var(--border);
                       border-radius:12px;color:var(--text);font-size:.9rem;font-weight:700;cursor:pointer;">
          İptal
        </button>
        <button onclick="doJoinGuild()" id="joinGuildBtn"
                style="flex:2;padding:12px;background:var(--accent,#4a8f40);border:none;
                       border-radius:12px;color:#fff;font-size:.9rem;font-weight:900;cursor:pointer;">
          Katıl →
        </button>
      </div>
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) _removeModal('joinGuildModal'); });
  document.body.appendChild(modal);

  const input = document.getElementById('joinCodeInput');
  if (input) {
    input.addEventListener('input', _debounce(() => previewJoinGuild(input.value.trim()), 600));
    if (prefillCode) previewJoinGuild(prefillCode);
    setTimeout(() => input.focus(), 100);
  }
}

async function previewJoinGuild(code) {
  if (!code || code.length < 4) return;
  const preview = document.getElementById('joinGuildPreview');
  if (!preview) return;
  preview.innerHTML = '<div style="color:var(--muted);font-size:.8rem;">Kontrol ediliyor...</div>';

  const cleanCode = code.includes('/') ? code.split('/').pop() : code;
  try {
    // Query by inviteCode via REST
    const allGuilds = await fbRestGet('guilds').catch(()=>null);
    const data = allGuilds ? Object.fromEntries(
      Object.entries(allGuilds).filter(([,g])=>g.inviteCode===cleanCode.toUpperCase()).slice(0,1)
    ) : null;
    if (!data) { preview.innerHTML = '<div style="color:#e05555;font-size:.8rem;">❌ Geçersiz davet kodu.</div>'; return; }
    const [gid, g] = Object.entries(data)[0];
    preview.innerHTML = `
      <div style="background:var(--surface);border-radius:12px;padding:14px;
                  display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;border-radius:14px;background:${g.color||'#4a8f40'}22;
                    border:2px solid ${g.color||'#4a8f40'}55;display:flex;align-items:center;
                    justify-content:center;font-size:1.6rem;flex-shrink:0;">${g.icon||'🌿'}</div>
        <div>
          <div style="font-weight:800;color:var(--text-hi);font-size:.95rem;">${esc(g.name)}</div>
          <div style="font-size:.72rem;color:var(--muted);">${g.memberCount||1} üye • ${g.isPublic?'Herkese açık':'Özel'}</div>
          ${g.description ? `<div style="font-size:.75rem;color:var(--muted);margin-top:2px;">${esc(g.description)}</div>` : ''}
        </div>
      </div>`;
  } catch(e) { preview.innerHTML = ''; }
}

async function doJoinGuild() {
  const rawCode = (document.getElementById('joinCodeInput')?.value || '').trim();
  const code    = rawCode.includes('/') ? rawCode.split('/').pop().toUpperCase() : rawCode.toUpperCase();
  const errEl   = document.getElementById('joinGuildErr');
  const btn     = document.getElementById('joinGuildBtn');

  if (!code) { if(errEl) errEl.textContent = 'Davet kodu girin.'; return; }
  btn.textContent = 'Katılıyor...'; btn.disabled = true;
  if(errEl) errEl.textContent = '';

  try {
    const allGuilds2 = await fbRestGet('guilds').catch(()=>null);
    const data = allGuilds2 ? Object.fromEntries(
      Object.entries(allGuilds2).filter(([,g])=>g.inviteCode===code).slice(0,1)
    ) : null;
    if (!data) {
      if(errEl) errEl.textContent = '❌ Geçersiz davet kodu.';
      btn.textContent = 'Katıl →'; btn.disabled = false; return;
    }
    const [gid, g] = Object.entries(data)[0];

    if (_myGuilds.includes(gid)) {
      _removeModal('joinGuildModal');
      await openGuild(gid);
      return;
    }

    const now = Date.now();
    const updates = {};
    updates[`guilds/${gid}/members/${_cu}`]   = { role: 'member', joinedAt: now };
    updates[`guilds/${gid}/memberCount`]      = (g.memberCount || 1) + 1;
    updates[`userGuilds/${_cu}/${gid}`]       = true;

    for (const [p, v] of Object.entries(updates)) { await fbRestSet(p, v); }

    _guildCache[gid]  = g;
    _myGuildRole[gid] = 'member';
    _myGuilds.push(gid);

    _removeModal('joinGuildModal');
    showToast('✅ ' + g.name + ' sunucusuna katıldın!');
    await openGuild(gid);
  } catch(e) {
    if(errEl) errEl.textContent = 'Hata: ' + (e.message || 'Bağlantı hatası');
    btn.textContent = 'Katıl →'; btn.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────────────────
   5. SUNUCU KEŞFİ
───────────────────────────────────────────────────────────────── */
async function showDiscoverGuilds() {
  _removeModal('discoverModal');
  const modal = document.createElement('div');
  modal.id = 'discoverModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);
         border-radius:20px;width:100%;max-width:520px;max-height:85vh;
         display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.7);overflow:hidden;">
      <div style="padding:20px 24px 16px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:1.1rem;font-weight:900;color:var(--text-hi);">🔍 Sunucu Keşfet</div>
          <div onclick="_removeModal('discoverModal')" style="cursor:pointer;color:var(--muted);padding:4px 8px;">✕</div>
        </div>
        <input id="discoverSearch" type="text" placeholder="Sunucu ara..."
               autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:10px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               oninput="filterDiscoverList(this.value)"
               onfocus="this.style.borderColor='var(--accent,#4a8f40)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>
      <div id="discoverList" style="flex:1;overflow-y:auto;padding:12px 16px;">
        <div style="color:var(--muted);text-align:center;padding:30px;font-size:.85rem;">Yükleniyor...</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);flex-shrink:0;">
        <button onclick="_removeModal('discoverModal');showJoinGuildModal()"
                style="width:100%;padding:11px;background:var(--surface);border:1px solid var(--border);
                       border-radius:12px;color:var(--text);font-size:.88rem;font-weight:700;cursor:pointer;">
          🔗 Davet Koduyla Katıl
        </button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) _removeModal('discoverModal'); });
  document.body.appendChild(modal);

  // Public sunucuları yükle
  try {
    const allGuilds3 = await fbRestGet('guilds').catch(()=>null);
    const data = allGuilds3 ? Object.fromEntries(
      Object.entries(allGuilds3).filter(([,g])=>g.isPublic).slice(0,30)
    ) : {};
    window._discoverAll = Object.entries(data).map(([id, g]) => ({ id, ...g }));
    renderDiscoverList(window._discoverAll);
  } catch(e) {
    const list = document.getElementById('discoverList');
    if(list) list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;">Yüklenemedi.</div>';
  }
}

function filterDiscoverList(q) {
  if (!window._discoverAll) return;
  const filtered = q ? window._discoverAll.filter(g =>
    g.name?.toLowerCase().includes(q.toLowerCase()) ||
    g.description?.toLowerCase().includes(q.toLowerCase())
  ) : window._discoverAll;
  renderDiscoverList(filtered);
}

function renderDiscoverList(guilds) {
  const list = document.getElementById('discoverList');
  if (!list) return;
  if (!guilds.length) {
    list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px;font-size:.85rem;">Sunucu bulunamadı.</div>';
    return;
  }
  list.innerHTML = guilds.map(g => {
    const isMember = _myGuilds.includes(g.id);
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface);
                  border-radius:14px;margin-bottom:8px;border:1px solid var(--border);">
        <div style="width:52px;height:52px;border-radius:14px;background:${g.color||'#4a8f40'}22;
                    border:2px solid ${g.color||'#4a8f40'}55;display:flex;align-items:center;
                    justify-content:center;font-size:1.8rem;flex-shrink:0;">${g.icon||'🌿'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;color:var(--text-hi);font-size:.92rem;">${esc(g.name)}</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:1px;">${g.memberCount||1} üye</div>
          ${g.description ? `<div style="font-size:.75rem;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(g.description)}</div>` : ''}
        </div>
        ${isMember
          ? `<button onclick="_removeModal('discoverModal');openGuild('${g.id}')"
                     style="padding:8px 14px;background:var(--surface2);border:1px solid var(--border);
                            border-radius:10px;color:var(--text);font-size:.8rem;font-weight:700;cursor:pointer;flex-shrink:0;">
               Aç
             </button>`
          : `<button onclick="_removeModal('discoverModal');doJoinByGuildId('${g.id}')"
                     style="padding:8px 14px;background:var(--accent,#4a8f40);border:none;
                            border-radius:10px;color:#fff;font-size:.8rem;font-weight:800;cursor:pointer;flex-shrink:0;">
               Katıl
             </button>`}
      </div>`;
  }).join('');
}

async function doJoinByGuildId(gid) {
  try {
    const g = await fbRestGet('guilds/' + gid).catch(()=>null);
    if (!g) { showToast('Sunucu bulunamadı.'); return; }
    if (_myGuilds.includes(gid)) { await openGuild(gid); return; }

    const now = Date.now();
    await fbRestSet(`guilds/${gid}/members/${_cu}`, { role: 'member', joinedAt: now });
    await fbRestSet(`guilds/${gid}/memberCount`, (g.memberCount || 1) + 1);
    await fbRestSet(`userGuilds/${_cu}/${gid}`, true);
    _guildCache[gid]  = g;
    _myGuildRole[gid] = 'member';
    _myGuilds.push(gid);
    showToast('✅ ' + g.name + ' sunucusuna katıldın!');
    await openGuild(gid);
  } catch(e) { showToast('Hata: ' + e.message); }
}

/* ─────────────────────────────────────────────────────────────────
   6. SUNUCU AÇMA — Ana görünüm
───────────────────────────────────────────────────────────────── */
async function openGuild(gid) {
  _activeGuild = gid;
  renderGuildRail();

  // Sunucu verisini yükle
  let g = _guildCache[gid];
  if (!g) {
    try {
      g = await fbRestGet('guilds/' + gid);
      if (!g) { showToast('Sunucu bulunamadı.'); return; }
      _guildCache[gid] = g;
    } catch(e) { showToast('Bağlantı hatası.'); return; }
  }

  // Kanalları yükle
  let channels = {};
  try {
    channels = (await fbRestGet('guilds/' + gid + '/channels').catch(()=>null)) || {};
    _channelCache[gid] = channels;
  } catch(e) {}

  // Üye rolümü kontrol et
  try {
    const m = await fbRestGet('guilds/' + gid + '/members/' + _cu).catch(()=>null);
    if (m) _myGuildRole[gid] = m.role || 'member';
  } catch(e) {}

  // Guild görünümünü oluştur
  _renderGuildView(gid, g, channels);
}

function closeGuildView() {
  _activeGuild   = null;
  _activeChannel = null;
  if (_guildMsgStop) { _guildMsgStop(); _guildMsgStop = null; }
  renderGuildRail();

  const view = document.getElementById('guildView');
  if (view) view.remove();
}

function _renderGuildView(gid, g, channels) {
  const old = document.getElementById('guildView');
  if (old) old.remove();

  const view = document.createElement('div');
  view.id = 'guildView';
  view.style.cssText = `
    position: fixed; left: 68px; top: 0; right: 0; bottom: 0;
    background: var(--bg, #070d1a); display: flex; z-index: 190;
    font-family: inherit;
  `;

  // Kanal listesini oluştur
  const chanList = _buildChannelListHTML(gid, g, channels);
  // İlk kanal
  const firstChan = Object.entries(channels).sort((a,b) => (a[1].position||0) - (b[1].position||0))[0];

  view.innerHTML = `
    <style>
      #guildView { color: var(--text, #ccc); }
      .guild-sidebar {
        width: 240px; flex-shrink: 0; background: var(--surface, #1a1f2e);
        border-right: 1px solid var(--border, rgba(255,255,255,.08));
        display: flex; flex-direction: column; overflow: hidden;
      }
      .guild-header {
        padding: 14px 16px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between;
        font-weight: 900; font-size: .95rem; color: var(--text-hi, #fff);
        cursor: pointer; flex-shrink: 0; gap: 8px;
      }
      .guild-header:hover { background: rgba(255,255,255,.04); }
      .chan-list { flex: 1; overflow-y: auto; padding: 8px 0; }
      .chan-list::-webkit-scrollbar { width: 4px; }
      .chan-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 2px; }
      .chan-cat { padding: 16px 12px 4px; font-size: .68rem; font-weight: 900;
                  color: var(--muted, #666); text-transform: uppercase; letter-spacing: .06em;
                  display: flex; align-items: center; justify-content: space-between; }
      .chan-row {
        display: flex; align-items: center; gap: 8px; padding: 6px 12px;
        cursor: pointer; border-radius: 6px; margin: 1px 8px;
        color: var(--muted); font-size: .9rem; transition: background .12s, color .12s;
        user-select: none; position: relative;
      }
      .chan-row:hover { background: rgba(255,255,255,.06); color: var(--text, #ccc); }
      .chan-row.act { background: rgba(255,255,255,.1); color: var(--text-hi, #fff); }
      .chan-row .chan-unread {
        margin-left: auto; background: #e74c3c; color: #fff;
        font-size: .6rem; font-weight: 900; border-radius: 8px;
        padding: 2px 5px; min-width: 16px; text-align: center;
      }
      .guild-my-bar {
        padding: 10px 12px; border-top: 1px solid var(--border);
        display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        background: rgba(0,0,0,.2);
      }
      .guild-chat-area {
        flex: 1; display: flex; flex-direction: column; overflow: hidden;
        background: var(--bg, #070d1a);
      }
      .guild-chat-hdr {
        padding: 0 16px; height: 48px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        background: var(--bg, #070d1a);
      }
      .guild-chat-hdr .chan-name { font-weight: 800; font-size: .95rem; color: var(--text-hi); }
      .guild-chat-hdr .chan-topic { font-size: .78rem; color: var(--muted); margin-left: 6px; }
      .guild-msgs { flex: 1; overflow-y: auto; padding: 16px; }
      .guild-msgs::-webkit-scrollbar { width: 4px; }
      .guild-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 2px; }
      .guild-input-bar {
        padding: 12px 16px; border-top: 1px solid var(--border); flex-shrink: 0;
        display: flex; align-items: center; gap: 8px;
      }
      .guild-input {
        flex: 1; background: var(--surface, #1a1f2e); border: 1px solid var(--border);
        border-radius: 10px; padding: 10px 14px; color: var(--text-hi);
        font-size: .9rem; font-family: inherit; outline: none; resize: none;
        max-height: 120px; line-height: 1.4;
      }
      .guild-input:focus { border-color: var(--accent, #4a8f40); }
      .guild-send-btn {
        width: 40px; height: 40px; border-radius: 10px; border: none;
        background: var(--accent, #4a8f40); color: #fff; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: opacity .15s; flex-shrink: 0;
      }
      .guild-send-btn:hover { opacity: .85; }
      .guild-msg { padding: 4px 0 4px 48px; position: relative; }
      .guild-msg.first { margin-top: 12px; }
      .guild-msg .msg-av {
        position: absolute; left: 0; top: 2px; width: 36px; height: 36px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-size: .85rem; font-weight: 700; color: #fff;
      }
      .guild-msg .msg-hdr { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
      .guild-msg .msg-user { font-weight: 700; font-size: .88rem; color: var(--text-hi); }
      .guild-msg .msg-time { font-size: .7rem; color: var(--muted); }
      .guild-msg .msg-body { font-size: .9rem; line-height: 1.45; color: var(--text); word-break: break-word; }
      .guild-members {
        width: 220px; flex-shrink: 0; background: var(--surface, #1a1f2e);
        border-left: 1px solid var(--border); overflow-y: auto; padding: 12px 0;
      }
      .guild-members::-webkit-scrollbar { width: 4px; }
      .guild-members::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 2px; }
      .member-group { padding: 12px 12px 4px; font-size: .68rem; font-weight: 900;
                      color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
      .member-row { display: flex; align-items: center; gap: 8px; padding: 5px 10px;
                    border-radius: 6px; margin: 1px 6px; cursor: pointer; }
      .member-row:hover { background: rgba(255,255,255,.06); }
      .m-av { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
               display: flex; align-items: center; justify-content: center;
               font-size: .8rem; font-weight: 700; color: #fff; position: relative; }
      .m-dot { position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px;
               border-radius: 50%; border: 2px solid var(--surface); }
      .m-name { font-size: .85rem; color: var(--text); white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis; }
      .m-role-badge { font-size: .62rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-left: auto; }

      /* Mobil responsive */
      @media (max-width: 768px) {
        #guildView { left: 0; }
        .guild-sidebar { width: 200px; }
        .guild-members { display: none; }
      }
      @media (max-width: 500px) {
        .guild-sidebar { position: absolute; left: 0; top: 0; bottom: 0; z-index: 10;
                         transform: translateX(-100%); transition: transform .25s; }
        .guild-sidebar.open { transform: translateX(0); }
        #guildView { left: 0; }
      }
    </style>

    <!-- Sidebar -->
    <div class="guild-sidebar">
      <div class="guild-header" onclick="showGuildSettingsModal('${gid}')">
        <span>${esc(g.name)}</span>
        ${isGuildAdmin(gid) ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` : ''}
      </div>
      <div class="chan-list" id="guildChanList">
        ${chanList}
      </div>
      <div class="guild-my-bar">
        <div style="width:32px;height:32px;border-radius:50%;background:${strColor(_cu)};
                    display:flex;align-items:center;justify-content:center;
                    font-size:.8rem;font-weight:700;color:#fff;flex-shrink:0;">
          ${initials(_cu)}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(_cu)}</div>
          <div style="font-size:.68rem;color:${_guildRoleColor(_myGuildRole[gid])};">${_guildRoleLabel(_myGuildRole[gid])}</div>
        </div>
        <div onclick="leaveGuildConfirm('${gid}')" title="Sunucudan Ayrıl"
             style="cursor:pointer;color:var(--muted);padding:4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </div>
      </div>
    </div>

    <!-- Chat Alanı -->
    <div class="guild-chat-area">
      <div class="guild-chat-hdr" id="guildChatHdr">
        <span style="font-size:1.1rem;color:var(--muted);">#</span>
        <span class="chan-name" id="guildChanName">Kanal seçin</span>
        <span class="chan-topic" id="guildChanTopic"></span>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <div onclick="toggleGuildMembers()" title="Üyeler" style="cursor:pointer;color:var(--muted);padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3h-2"/></svg>
          </div>
          <div onclick="closeGuildView()" title="Kapat" style="cursor:pointer;color:var(--muted);padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>
      </div>
      <div class="guild-msgs" id="guildMsgs">
        <div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:.9rem;">
          👈 Sol taraftan bir kanal seçin
        </div>
      </div>
      <div class="guild-input-bar" id="guildInputBar" style="display:none;">
        <textarea class="guild-input" id="guildMsgInput" placeholder="Mesaj yaz..."
                  rows="1" maxlength="2000"
                  onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendGuildMsg();}"
                  oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
        <button class="guild-send-btn" onclick="sendGuildMsg()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <!-- Üye Listesi -->
    <div class="guild-members" id="guildMemberList">
      <div style="color:var(--muted);text-align:center;padding:20px;font-size:.8rem;">Yükleniyor...</div>
    </div>`;

  document.body.appendChild(view);

  // Üye listesini yükle
  _loadGuildMembers(gid);

  // İlk kanalı aç
  if (firstChan) openGuildChannel(gid, firstChan[0], firstChan[1]);
}

function _buildChannelListHTML(gid, g, channels) {
  const sorted = Object.entries(channels).sort((a,b) => (a[1].position||0) - (b[1].position||0));
  const textChans   = sorted.filter(([,c]) => c.type === 'text');
  const announceChans = sorted.filter(([,c]) => c.type === 'announce');

  let html = '';

  if (announceChans.length) {
    html += `<div class="chan-cat">
      <span>Duyurular</span>
      ${isGuildAdmin(gid) ? `<span onclick="showAddChannelModal('${gid}','announce')" style="cursor:pointer;font-size:1rem;">+</span>` : ''}
    </div>`;
    announceChans.forEach(([cid, c]) => {
      html += `<div class="chan-row" id="cr-${cid}" onclick="openGuildChannel('${gid}','${cid}',null)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        ${esc(c.name)}
      </div>`;
    });
  }

  html += `<div class="chan-cat">
    <span>Kanallar</span>
    ${isGuildAdmin(gid) ? `<span onclick="showAddChannelModal('${gid}','text')" style="cursor:pointer;font-size:1rem;">+</span>` : ''}
  </div>`;
  textChans.forEach(([cid, c]) => {
    html += `<div class="chan-row" id="cr-${cid}" onclick="openGuildChannel('${gid}','${cid}',null)">
      <span style="font-size:1rem;color:var(--muted)">#</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.name)}</span>
      ${isGuildAdmin(gid) ? `<span onclick="event.stopPropagation();showChannelSettings('${gid}','${cid}')"
            style="opacity:0;transition:opacity .15s;font-size:.8rem;padding:2px 4px;"
            onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">⚙️</span>` : ''}
    </div>`;
  });

  return html;
}

/* ─────────────────────────────────────────────────────────────────
   7. KANAL AÇMA & MESAJLAR
───────────────────────────────────────────────────────────────── */
async function openGuildChannel(gid, cid, chanData) {
  // Önceki dinleyiciyi durdur
  if (_guildMsgStop) { _guildMsgStop(); _guildMsgStop = null; }
  _activeChannel = cid;

  // Kanal verisini al
  let chan = chanData;
  if (!chan) {
    try {
      chan = (await fbRestGet('guilds/' + gid + '/channels/' + cid).catch(()=>null)) || {};
    } catch(e) { chan = {}; }
  }

  // UI güncelle
  const nameEl  = document.getElementById('guildChanName');
  const topicEl = document.getElementById('guildChanTopic');
  const inputBar = document.getElementById('guildInputBar');
  const msgsEl  = document.getElementById('guildMsgs');

  if (nameEl)  nameEl.textContent  = chan.name || cid;
  if (topicEl) topicEl.textContent = chan.topic ? '— ' + chan.topic : '';

  // Kanal satırlarını güncelle
  document.querySelectorAll('.chan-row').forEach(r => r.classList.remove('act'));
  const cr = document.getElementById('cr-' + cid);
  if (cr) cr.classList.add('act');

  // Mesaj gönderme (salt okunur kanal kontrolü)
  const canSend = !chan.isReadOnly || isGuildAdmin(gid);
  if (inputBar) {
    inputBar.style.display = canSend ? 'flex' : 'none';
  }

  if (msgsEl) msgsEl.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:.8rem;">Yükleniyor...</div>';

  // Okunmamışları sıfırla
  if (_guildUnread[gid]) delete _guildUnread[gid][cid];
  const crEl = document.getElementById('cr-' + cid);
  if (crEl) { const badge = crEl.querySelector('.chan-unread'); if (badge) badge.remove(); }

  // Son okuma zamanını kaydet
  fbRestSet('guildReads/' + _cu + '/' + gid + '/' + cid, Date.now()).catch(() => {});

  // Mesajları yükle & dinle
  const msgRef = dbRef('guildMsgs/' + gid + '/' + cid).orderByChild('ts').limitToLast(50);
  let firstLoad = true;

  const handler = snap => {
    const data = snap.val() || {};
    const msgs = Object.entries(data).map(([id, m]) => ({ id, ...m })).sort((a,b) => a.ts - b.ts);

    if (firstLoad) {
      firstLoad = false;
      _renderGuildMsgs(msgs, msgsEl, gid, cid);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    } else {
      // Yeni mesaj geldi — sadece son mesajı ekle
      const last = msgs[msgs.length - 1];
      if (last) _appendGuildMsg(last, msgsEl, gid, cid);
    }
  };

  msgRef.on('value', handler);
  _guildMsgStop = () => msgRef.off('value', handler);
}

function _renderGuildMsgs(msgs, container, gid, cid) {
  if (!container) return;
  if (!msgs.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--muted);">
        <div style="font-size:2.5rem;margin-bottom:12px;">#</div>
        <div style="font-weight:800;color:var(--text-hi);font-size:1rem;margin-bottom:6px;">Bu kanalın başlangıcı</div>
        <div style="font-size:.82rem;">Henüz mesaj yok. İlk mesajı sen gönder!</div>
      </div>`;
    return;
  }

  let html = '';
  let prevUser = null;
  msgs.forEach(m => {
    const isFirst = m.user !== prevUser;
    prevUser = m.user;
    html += _guildMsgHTML(m, isFirst, gid, cid);
  });
  container.innerHTML = html;
}

function _appendGuildMsg(m, container, gid, cid) {
  if (!container) return;
  const existing = container.querySelector(`[data-mid="${m.id}"]`);
  if (existing) return; // Zaten var

  const lastMsg = container.querySelector('.guild-msg:last-child');
  const isFirst = !lastMsg || lastMsg.dataset.user !== m.user;

  const div = document.createElement('div');
  div.innerHTML = _guildMsgHTML(m, isFirst, gid, cid);
  container.appendChild(div.firstElementChild);
  container.scrollTop = container.scrollHeight;
}

function _guildMsgHTML(m, isFirst, gid, cid) {
  const time = new Date(m.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const canDel = m.user === _cu || isGuildAdmin(gid);

  return `
    <div class="guild-msg ${isFirst ? 'first' : ''}" data-mid="${m.id}" data-user="${esc(m.user)}">
      ${isFirst ? `<div class="msg-av" style="background:${strColor(m.user)};">${initials(m.user)}</div>` : ''}
      ${isFirst ? `<div class="msg-hdr">
        <span class="msg-user" style="color:${strColor(m.user)};">${esc(m.user)}</span>
        <span class="msg-time">${time}</span>
      </div>` : ''}
      <div class="msg-body" style="${!isFirst ? 'padding-left:4px;' : ''}">
        ${esc(m.text).replace(/\n/g,'<br>')}
        ${m.edited ? '<span style="font-size:.65rem;color:var(--muted);margin-left:4px;">(düzenlendi)</span>' : ''}
        ${canDel ? `<span onclick="deleteGuildMsg('${gid}','${cid}','${m.id}')"
             style="opacity:0;cursor:pointer;margin-left:6px;color:var(--muted);font-size:.75rem;transition:opacity .15s;"
             onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">🗑️</span>` : ''}
      </div>
    </div>`;
}

async function sendGuildMsg() {
  const input = document.getElementById('guildMsgInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !_activeGuild || !_activeChannel || !_cu) return;

  // Yetki kontrolü
  const chan = (await fbRestGet('guilds/' + _activeGuild + '/channels/' + _activeChannel).catch(()=>null)) || {};
  if (chan.isReadOnly && !isGuildAdmin(_activeGuild)) {
    showToast('Bu kanala mesaj gönderemezsiniz.'); return;
  }

  input.value = '';
  input.style.height = 'auto';

  try {
    const _msgKey = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    await fbRestSet('guildMsgs/' + _activeGuild + '/' + _activeChannel + '/' + _msgKey, {
      user: _cu, text: sanitizeMessage(text), ts: Date.now()
    });
    // Son mesaj zamanını güncelle (okunmamış sayımı için)
    fbRestSet('guilds/' + _activeGuild + '/channels/' + _activeChannel + '/lastMsgTs', Date.now()).catch(() => {});
  } catch(e) { showToast('Gönderilemedi: ' + e.message); }
}

async function deleteGuildMsg(gid, cid, mid) {
  try {
    await fbRestSet('guildMsgs/' + gid + '/' + cid + '/' + mid, null);
    const el = document.querySelector(`[data-mid="${mid}"]`);
    if (el) el.remove();
  } catch(e) { showToast('Silinemedi.'); }
}

/* ─────────────────────────────────────────────────────────────────
   8. ÜYE LİSTESİ
───────────────────────────────────────────────────────────────── */
async function _loadGuildMembers(gid) {
  const container = document.getElementById('guildMemberList');
  if (!container) return;
  try {
    const members = (await fbRestGet('guilds/' + gid + '/members').catch(()=>null)) || {};
    _memberCache[gid] = members;

    const groups = { owner: [], admin: [], moderator: [], member: [] };
    Object.entries(members).forEach(([uname, m]) => {
      const role = m.role || 'member';
      if (groups[role]) groups[role].push({ uname, ...m });
    });

    let html = '';
    const groupLabels = { owner: 'Sahip', admin: 'Yönetici', moderator: 'Moderatör', member: 'Üyeler' };
    Object.entries(groups).forEach(([role, list]) => {
      if (!list.length) return;
      html += `<div class="member-group">${groupLabels[role]} — ${list.length}</div>`;
      list.forEach(m => {
        const isOnline = !!_online?.[m.uname];
        html += `
          <div class="member-row" onclick="showMemberCtxMenu(event,'${gid}','${m.uname}','${role}')">
            <div class="m-av" style="background:${strColor(m.uname)};">
              ${initials(m.uname)}
              <div class="m-dot" style="background:${isOnline?'#2ecc71':'#666'};"></div>
            </div>
            <span class="m-name">${esc(m.uname)}</span>
            ${role !== 'member' ? `<span class="m-role-badge" style="background:${_guildRoleColor(role)}22;color:${_guildRoleColor(role)};">${groupLabels[role]}</span>` : ''}
          </div>`;
      });
    });
    container.innerHTML = html || '<div style="color:var(--muted);text-align:center;padding:20px;font-size:.8rem;">Üye yok</div>';
  } catch(e) { container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:.8rem;">Yüklenemedi</div>'; }
}

function toggleGuildMembers() {
  const ml = document.getElementById('guildMemberList');
  if (ml) ml.style.display = ml.style.display === 'none' ? '' : 'none';
}

/* Üye Bağlam Menüsü */
function showMemberCtxMenu(e, gid, uname, memberRole) {
  e.stopPropagation();
  const old = document.getElementById('_memberCtx');
  if (old) old.remove();

  const ctx = document.createElement('div');
  ctx.id = '_memberCtx';
  ctx.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;
    background:var(--surface2);border:1px solid var(--border);border-radius:12px;
    padding:6px;min-width:180px;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.6);`;

  const items = [];

  if (uname !== _cu) {
    items.push({ label: '💬 DM Gönder', action: () => { if(typeof openDM==='function') openDM(uname); } });
  }

  if (isGuildAdmin(gid) && uname !== _cu && memberRole !== 'owner') {
    if (memberRole === 'member') {
      items.push({ label: '🛡️ Moderatör Yap', action: () => changeGuildRole(gid, uname, 'moderator') });
    }
    if (['member','moderator'].includes(memberRole) && isGuildOwner(gid)) {
      items.push({ label: '⭐ Admin Yap', action: () => changeGuildRole(gid, uname, 'admin') });
    }
    if (memberRole !== 'member') {
      items.push({ label: '👤 Üye Yap', action: () => changeGuildRole(gid, uname, 'member') });
    }
    items.push({ label: '👢 Sunucudan At', danger: true, action: () => kickGuildMember(gid, uname) });
  }

  if (!items.length) {
    ctx.innerHTML = `<div style="padding:10px;color:var(--muted);font-size:.82rem;">Eylem yok</div>`;
  } else {
    ctx.innerHTML = items.map(i => `
      <div onclick="this.closest('#_memberCtx').remove();(${i.action.toString()})()"
           style="padding:9px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;
                  color:${i.danger ? '#e74c3c' : 'var(--text)'};
                  transition:background .12s;"
           onmouseover="this.style.background='rgba(255,255,255,.07)'"
           onmouseout="this.style.background='transparent'">
        ${i.label}
      </div>`).join('');
  }

  document.body.appendChild(ctx);
  setTimeout(() => document.addEventListener('click', () => ctx.remove(), { once: true }), 10);
}

async function changeGuildRole(gid, uname, newRole) {
  try {
    await fbRestSet('guilds/' + gid + '/members/' + uname + '/role', newRole);
    if (_memberCache[gid]?.[uname]) _memberCache[gid][uname].role = newRole;
    _loadGuildMembers(gid);
    showToast(`✅ ${uname} → ${newRole}`);
  } catch(e) { showToast('Hata: ' + e.message); }
}

async function kickGuildMember(gid, uname) {
  if (!confirm(`${uname} sunucudan atılsın mı?`)) return;
  try {
    await fbRestSet('guilds/' + gid + '/members/' + uname, null);
    await fbRestSet('userGuilds/' + uname + '/' + gid, null);
    const cnt = (await fbRestGet('guilds/' + gid + '/memberCount').catch(()=>1)) || 1;
    if (cnt > 1) await fbRestSet('guilds/' + gid + '/memberCount', cnt - 1);
    _loadGuildMembers(gid);
    showToast(`✅ ${uname} sunucudan atıldı.`);
  } catch(e) { showToast('Hata: ' + e.message); }
}

/* ─────────────────────────────────────────────────────────────────
   9. KANAL YÖNETİMİ
───────────────────────────────────────────────────────────────── */
function showAddChannelModal(gid, defaultType = 'text') {
  _removeModal('addChanModal');
  const modal = document.createElement('div');
  modal.id = 'addChanModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);
         border-radius:18px;padding:24px;width:100%;max-width:380px;
         box-shadow:0 20px 60px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div style="font-size:1rem;font-weight:900;color:var(--text-hi);">Kanal Oluştur</div>
        <div onclick="_removeModal('addChanModal')" style="cursor:pointer;color:var(--muted);padding:4px 8px;">✕</div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Kanal Türü</div>
        <div style="display:flex;gap:8px;">
          <div onclick="document.getElementById('newChanType').value='text';this.style.borderColor='var(--accent)';this.nextElementSibling.style.borderColor='var(--border)'"
               style="flex:1;padding:10px;border-radius:10px;cursor:pointer;border:2px solid ${defaultType==='text'?'var(--accent)':'var(--border)'};background:var(--surface);text-align:center;">
            <div style="font-size:1.2rem;">💬</div>
            <div style="font-size:.78rem;font-weight:700;color:var(--text-hi);">Metin</div>
          </div>
          <div onclick="document.getElementById('newChanType').value='announce';this.style.borderColor='var(--accent)';this.previousElementSibling.style.borderColor='var(--border)'"
               style="flex:1;padding:10px;border-radius:10px;cursor:pointer;border:2px solid ${defaultType==='announce'?'var(--accent)':'var(--border)'};background:var(--surface);text-align:center;">
            <div style="font-size:1.2rem;">📢</div>
            <div style="font-size:.78rem;font-weight:700;color:var(--text-hi);">Duyuru</div>
          </div>
        </div>
        <input type="hidden" id="newChanType" value="${defaultType}">
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Kanal Adı</div>
        <input id="newChanName" type="text" maxlength="40" placeholder="kanal-adı"
               autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'"
               onkeydown="if(event.key==='Enter')doAddChannel('${gid}')">
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Konu (isteğe bağlı)</div>
        <input id="newChanTopic" type="text" maxlength="100" placeholder="Bu kanal hakkında kısa açıklama..."
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>

      <div id="addChanErr" style="color:#e05555;font-size:.8rem;margin-bottom:10px;min-height:16px;"></div>
      <div style="display:flex;gap:8px;">
        <button onclick="_removeModal('addChanModal')"
                style="flex:1;padding:11px;background:var(--surface);border:1px solid var(--border);
                       border-radius:10px;color:var(--text);font-size:.88rem;font-weight:700;cursor:pointer;">
          İptal
        </button>
        <button onclick="doAddChannel('${gid}')" id="addChanBtn"
                style="flex:2;padding:11px;background:var(--accent,#4a8f40);border:none;
                       border-radius:10px;color:#fff;font-size:.88rem;font-weight:900;cursor:pointer;">
          Oluştur
        </button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) _removeModal('addChanModal'); });
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('newChanName')?.focus(), 100);
}

async function doAddChannel(gid) {
  let name  = (document.getElementById('newChanName')?.value || '').trim().toLowerCase().replace(/\s+/g, '-');
  const topic = (document.getElementById('newChanTopic')?.value || '').trim();
  const type  = document.getElementById('newChanType')?.value || 'text';
  const errEl = document.getElementById('addChanErr');
  const btn   = document.getElementById('addChanBtn');

  if (!name) { if(errEl) errEl.textContent = 'Kanal adı girin.'; return; }

  btn.textContent = 'Oluşturuluyor...'; btn.disabled = true;

  const cid = _chanId();
  // Mevcut kanalları say → pozisyon
  const existing = (await fbRestGet('guilds/' + gid + '/channels').catch(()=>null)) || {};
  const position = Object.keys(existing).length;

  const chanData = { name, type, topic, position, createdBy: _cu, createdAt: Date.now() };
  if (type === 'announce') chanData.isReadOnly = true;

  try {
    await fbRestSet('guilds/' + gid + '/channels/' + cid, chanData);
    _removeModal('addChanModal');
    showToast('✅ #' + name + ' kanalı oluşturuldu!');
    // Kanal listesini yenile
    const g = _guildCache[gid];
    if (!_channelCache[gid]) _channelCache[gid] = {};
    _channelCache[gid][cid] = chanData;
    const chanListEl = document.getElementById('guildChanList');
    if (chanListEl) chanListEl.innerHTML = _buildChannelListHTML(gid, g, _channelCache[gid]);
    openGuildChannel(gid, cid, chanData);
  } catch(e) {
    if(errEl) errEl.textContent = 'Hata: ' + e.message;
    btn.textContent = 'Oluştur'; btn.disabled = false;
  }
}

function showChannelSettings(gid, cid) {
  const chan = _channelCache[gid]?.[cid] || {};
  _removeModal('chanSettingsModal');
  const modal = document.createElement('div');
  modal.id = 'chanSettingsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);
         border-radius:18px;padding:24px;width:100%;max-width:380px;
         box-shadow:0 20px 60px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div style="font-size:1rem;font-weight:900;color:var(--text-hi);">#${esc(chan.name)} Ayarları</div>
        <div onclick="_removeModal('chanSettingsModal')" style="cursor:pointer;color:var(--muted);padding:4px 8px;">✕</div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Kanal Adı</div>
        <input id="editChanName" type="text" value="${esc(chan.name)}" maxlength="40"
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Konu</div>
        <input id="editChanTopic" type="text" value="${esc(chan.topic||'')}" maxlength="100"
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button onclick="_removeModal('chanSettingsModal')"
                style="flex:1;padding:11px;background:var(--surface);border:1px solid var(--border);
                       border-radius:10px;color:var(--text);font-size:.88rem;font-weight:700;cursor:pointer;">
          İptal
        </button>
        <button onclick="doEditChannel('${gid}','${cid}')"
                style="flex:2;padding:11px;background:var(--accent,#4a8f40);border:none;
                       border-radius:10px;color:#fff;font-size:.88rem;font-weight:900;cursor:pointer;">
          Kaydet
        </button>
      </div>
      <button onclick="doDeleteChannel('${gid}','${cid}')"
              style="width:100%;padding:10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);
                     border-radius:10px;color:#e74c3c;font-size:.85rem;font-weight:700;cursor:pointer;">
        🗑️ Kanalı Sil
      </button>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) _removeModal('chanSettingsModal'); });
  document.body.appendChild(modal);
}

async function doEditChannel(gid, cid) {
  const name  = (document.getElementById('editChanName')?.value || '').trim().toLowerCase().replace(/\s+/g, '-');
  const topic = (document.getElementById('editChanTopic')?.value || '').trim();
  if (!name) return;
  try {
    const existing_chan = (await fbRestGet('guilds/' + gid + '/channels/' + cid).catch(()=>{})) || {};
    await fbRestSet('guilds/' + gid + '/channels/' + cid, {...existing_chan, name, topic});
    if (_channelCache[gid]?.[cid]) { _channelCache[gid][cid].name = name; _channelCache[gid][cid].topic = topic; }
    _removeModal('chanSettingsModal');
    showToast('✅ Kanal güncellendi.');
    // Kanalı yeniden yükle
    const g = _guildCache[gid];
    const chanListEl = document.getElementById('guildChanList');
    if (chanListEl) chanListEl.innerHTML = _buildChannelListHTML(gid, g, _channelCache[gid]);
    const nameEl = document.getElementById('guildChanName');
    if (nameEl && _activeChannel === cid) nameEl.textContent = name;
  } catch(e) { showToast('Hata: ' + e.message); }
}

async function doDeleteChannel(gid, cid) {
  if (!confirm('Bu kanal ve tüm mesajları silinsin mi?')) return;
  _removeModal('chanSettingsModal');
  try {
    await fbRestSet('guilds/' + gid + '/channels/' + cid, null);
    await fbRestSet('guildMsgs/' + gid + '/' + cid, null);
    if (_channelCache[gid]) delete _channelCache[gid][cid];
    showToast('Kanal silindi.');
    if (_activeChannel === cid) {
      _activeChannel = null;
      if (_guildMsgStop) { _guildMsgStop(); _guildMsgStop = null; }
      const msgsEl = document.getElementById('guildMsgs');
      if (msgsEl) msgsEl.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px;font-size:.85rem;">👈 Kanal seçin</div>';
      document.getElementById('guildInputBar')?.style && (document.getElementById('guildInputBar').style.display = 'none');
    }
    const g = _guildCache[gid];
    const chanListEl = document.getElementById('guildChanList');
    if (chanListEl) chanListEl.innerHTML = _buildChannelListHTML(gid, g, _channelCache[gid]);
  } catch(e) { showToast('Silinemedi.'); }
}

/* ─────────────────────────────────────────────────────────────────
   10. SUNUCU AYARLARI (Ad, Davet Linki, Silme)
───────────────────────────────────────────────────────────────── */
function showGuildSettingsModal(gid) {
  if (!isGuildAdmin(gid)) { showToast('Bu işlem için yetkiniz yok.'); return; }
  const g = _guildCache[gid] || {};
  _removeModal('guildSettingsModal');

  const inviteLink = location.origin + location.pathname + '#guild-inv-' + (g.inviteCode || '');

  const modal = document.createElement('div');
  modal.id = 'guildSettingsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
  modal.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);
         border-radius:20px;padding:28px 24px;width:100%;max-width:440px;
         box-shadow:0 20px 60px rgba(0,0,0,.7);margin:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-size:1.05rem;font-weight:900;color:var(--text-hi);">⚙️ Sunucu Ayarları</div>
        <div onclick="_removeModal('guildSettingsModal')" style="cursor:pointer;color:var(--muted);padding:4px 8px;">✕</div>
      </div>

      <!-- Sunucu Adı -->
      <div style="margin-bottom:14px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Sunucu Adı</div>
        <input id="editGuildName" type="text" value="${esc(g.name)}" maxlength="50"
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>

      <!-- Açıklama -->
      <div style="margin-bottom:14px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Açıklama</div>
        <textarea id="editGuildDesc" maxlength="200"
               style="width:100%;background:var(--surface);border:1px solid var(--border);
                      border-radius:10px;padding:11px 14px;color:var(--text-hi);
                      font-size:.9rem;font-family:inherit;box-sizing:border-box;outline:none;
                      resize:none;height:70px;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">${esc(g.description||'')}</textarea>
      </div>

      <!-- Davet Linki -->
      <div style="margin-bottom:20px;">
        <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Davet Linki</div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;
                      padding:10px 14px;font-size:.8rem;color:var(--muted);overflow:hidden;
                      text-overflow:ellipsis;white-space:nowrap;">
            ${esc(g.inviteCode || '—')}
          </div>
          <button onclick="copyGuildInvite('${gid}')"
                  style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);
                         border-radius:10px;color:var(--text);font-size:.82rem;font-weight:700;cursor:pointer;flex-shrink:0;">
            📋 Kopyala
          </button>
          <button onclick="regenerateInviteCode('${gid}')"
                  style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);
                         border-radius:10px;color:var(--text);font-size:.82rem;font-weight:700;cursor:pointer;flex-shrink:0;">
            🔄
          </button>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button onclick="_removeModal('guildSettingsModal')"
                style="flex:1;padding:11px;background:var(--surface);border:1px solid var(--border);
                       border-radius:10px;color:var(--text);font-size:.88rem;font-weight:700;cursor:pointer;">
          İptal
        </button>
        <button onclick="doSaveGuildSettings('${gid}')"
                style="flex:2;padding:11px;background:var(--accent,#4a8f40);border:none;
                       border-radius:10px;color:#fff;font-size:.88rem;font-weight:900;cursor:pointer;">
          Kaydet
        </button>
      </div>

      ${isGuildOwner(gid) ? `
      <button onclick="confirmDeleteGuild('${gid}')"
              style="width:100%;padding:10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);
                     border-radius:10px;color:#e74c3c;font-size:.85rem;font-weight:700;cursor:pointer;">
        🗑️ Sunucuyu Sil
      </button>` : `
      <button onclick="leaveGuildConfirm('${gid}')"
              style="width:100%;padding:10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);
                     border-radius:10px;color:#e74c3c;font-size:.85rem;font-weight:700;cursor:pointer;">
        👋 Sunucudan Ayrıl
      </button>`}
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) _removeModal('guildSettingsModal'); });
  document.body.appendChild(modal);
}

async function doSaveGuildSettings(gid) {
  const name = (document.getElementById('editGuildName')?.value || '').trim();
  const desc = (document.getElementById('editGuildDesc')?.value || '').trim();
  if (!name) { showToast('Sunucu adı boş olamaz.'); return; }
  try {
    const g_curr = (await fbRestGet('guilds/' + gid).catch(()=>{})) || {};
    await fbRestSet('guilds/' + gid, {...g_curr, name, description: desc});
    if (_guildCache[gid]) { _guildCache[gid].name = name; _guildCache[gid].description = desc; }
    _removeModal('guildSettingsModal');
    showToast('✅ Ayarlar kaydedildi.');
    renderGuildRail();
    const hdr = document.querySelector('.guild-header span');
    if (hdr) hdr.textContent = name;
  } catch(e) { showToast('Hata: ' + e.message); }
}

async function copyGuildInvite(gid) {
  const g = _guildCache[gid] || {};
  const code = g.inviteCode || '';
  const link = location.origin + location.pathname + '?inv=' + code;
  try {
    await navigator.clipboard.writeText(link);
    showToast('✅ Davet linki kopyalandı!');
  } catch(e) {
    showToast('Kod: ' + code);
  }
}

async function regenerateInviteCode(gid) {
  if (!confirm('Davet kodu yenilensin mi? Eski linkler çalışmaz.')) return;
  const newCode = Math.random().toString(36).slice(2, 9).toUpperCase();
  try {
    await fbRestSet('guilds/' + gid + '/inviteCode', newCode);
    if (_guildCache[gid]) _guildCache[gid].inviteCode = newCode;
    showToast('✅ Yeni kod: ' + newCode);
    _removeModal('guildSettingsModal');
    showGuildSettingsModal(gid);
  } catch(e) { showToast('Hata.'); }
}

async function confirmDeleteGuild(gid) {
  const g = _guildCache[gid] || {};
  const confirm1 = confirm(`"${g.name}" sunucusunu SİLMEK istediğinizden emin misiniz?\nBu işlem geri alınamaz!`);
  if (!confirm1) return;
  _removeModal('guildSettingsModal');
  try {
    // Üyelerin userGuilds kaydını sil
    const members = (await fbRestGet('guilds/' + gid + '/members').catch(()=>null)) || {};
    const updates = {};
    Object.keys(members).forEach(u => { updates['userGuilds/' + u + '/' + gid] = null; });
    updates['guilds/' + gid] = null;
    updates['guildMsgs/' + gid] = null;
    for (const [p, v] of Object.entries(updates)) { await fbRestSet(p, v); }

    _myGuilds = _myGuilds.filter(id => id !== gid);
    delete _guildCache[gid];
    delete _myGuildRole[gid];
    closeGuildView();
    showToast('Sunucu silindi.');
  } catch(e) { showToast('Hata: ' + e.message); }
}

async function leaveGuildConfirm(gid) {
  const g = _guildCache[gid] || {};
  if (!confirm(`"${g.name}" sunucusundan ayrılmak istediğinizden emin misiniz?`)) return;
  _removeModal('guildSettingsModal');
  try {
    await fbRestSet('guilds/' + gid + '/members/' + _cu, null);
    await fbRestSet('userGuilds/' + _cu + '/' + gid, null);
    const cnt = (await fbRestGet('guilds/' + gid + '/memberCount').catch(()=>1)) || 1;
    if (cnt > 1) await fbRestSet('guilds/' + gid + '/memberCount', cnt - 1);

    _myGuilds = _myGuilds.filter(id => id !== gid);
    delete _guildCache[gid];
    delete _myGuildRole[gid];
    closeGuildView();
    showToast('Sunucudan ayrıldın.');
  } catch(e) { showToast('Hata: ' + e.message); }
}

/* ─────────────────────────────────────────────────────────────────
   11. ROL SİSTEMİ (Görsel Yardımcılar)
───────────────────────────────────────────────────────────────── */
function _guildRoleLabel(role) {
  return { owner: '👑 Sahip', admin: '⭐ Yönetici', moderator: '🛡️ Moderatör', member: '👤 Üye' }[role] || '👤 Üye';
}
function _guildRoleColor(role) {
  return { owner: '#f1c40f', admin: '#e74c3c', moderator: '#3498db', member: '#95a5a6' }[role] || '#95a5a6';
}

/* ─────────────────────────────────────────────────────────────────
   12. DAVET LİNKİ KARŞILAMA (URL Params)
───────────────────────────────────────────────────────────────── */
function _checkGuildInviteURL() {
  const params = new URLSearchParams(location.search);
  const inv = params.get('inv');
  if (inv) {
    history.replaceState(null, '', location.pathname);
    // Login sonrasına ertele
    window._pendingGuildInvite = inv;
  }
  // Hash ile de kontrol et
  const hash = location.hash;
  if (hash.startsWith('#guild-inv-')) {
    const code = hash.slice('#guild-inv-'.length);
    history.replaceState(null, '', location.pathname);
    window._pendingGuildInvite = code;
  }
}

function _processPendingGuildInvite() {
  if (window._pendingGuildInvite && _cu) {
    const code = window._pendingGuildInvite;
    window._pendingGuildInvite = null;
    showJoinGuildModal(code);
  }
}

/* ─────────────────────────────────────────────────────────────────
   13. YARDIMCI / GENEL
───────────────────────────────────────────────────────────────── */
function _removeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function _debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ─────────────────────────────────────────────────────────────────
   14. BAŞLATMA — onLoginSuccess'tan çağrılır
───────────────────────────────────────────────────────────────── */
function initGuildSystem() {
  _checkGuildInviteURL();
  loadMyGuilds().then(() => {
    _processPendingGuildInvite();
  });
}

/* Firebase güvenlik kurallarına eklenmesi gereken yapı:
   (Firebase Console → Realtime Database → Rules)

{
  "rules": {
    "guilds": {
      "$guildId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('ownerId').val() === root.child('users').child(auth.uid).child('username').val()
        )",
        "members": {
          "$username": {
            ".write": "auth != null"
          }
        }
      }
    },
    "guildMsgs": {
      "$guildId": {
        "$channelId": {
          ".read": "auth != null",
          "$msgId": {
            ".write": "auth != null"
          }
        }
      }
    },
    "userGuilds": {
      "$username": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "guildReads": {
      "$username": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
*/
