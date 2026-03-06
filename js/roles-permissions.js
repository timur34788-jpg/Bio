/* ═══════════════════════════════════════════════════════════════
   ROLLER & İZİNLER SİSTEMİ — Discord benzeri
   roles-permissions.js
═══════════════════════════════════════════════════════════════ */
const PERMS = {
  VIEW_CHANNELS:1n<<0n, SEND_MESSAGES:1n<<1n, READ_HISTORY:1n<<2n,
  MANAGE_CHANNELS:1n<<3n, MANAGE_ROLES:1n<<4n, KICK_MEMBERS:1n<<5n,
  BAN_MEMBERS:1n<<6n, MENTION_EVERYONE:1n<<7n, MANAGE_MESSAGES:1n<<8n,
  EMBED_LINKS:1n<<9n, ATTACH_FILES:1n<<10n, ADD_REACTIONS:1n<<11n,
  USE_SLASH_CMDS:1n<<12n, CONNECT_VOICE:1n<<13n, SPEAK_VOICE:1n<<14n,
  MUTE_MEMBERS:1n<<15n, DEAFEN_MEMBERS:1n<<16n, MOVE_MEMBERS:1n<<17n,
  PRIORITY_SPEAKER:1n<<18n, STREAM_VIDEO:1n<<19n, CREATE_INVITES:1n<<20n,
  MANAGE_WEBHOOKS:1n<<21n, MANAGE_EMOJIS:1n<<22n, ADMINISTRATOR:1n<<30n,
};
const PERM_LABELS = {
  VIEW_CHANNELS:'Kanalları Gör', SEND_MESSAGES:'Mesaj Gönder', READ_HISTORY:'Geçmişi Oku',
  MANAGE_CHANNELS:'Kanalları Yönet', MANAGE_ROLES:'Rolleri Yönet', KICK_MEMBERS:'Üye At',
  BAN_MEMBERS:'Üye Yasakla', MENTION_EVERYONE:'@everyone Bahset', MANAGE_MESSAGES:'Mesajları Yönet',
  EMBED_LINKS:'Link Önizleme', ATTACH_FILES:'Dosya Ekle', ADD_REACTIONS:'Reaksiyon Ekle',
  USE_SLASH_CMDS:'Slash Komutları', CONNECT_VOICE:'Ses Kanalına Katıl', SPEAK_VOICE:'Konuş',
  MUTE_MEMBERS:'Üyeleri Sustur', DEAFEN_MEMBERS:'Üyeleri Sağırlaştır', MOVE_MEMBERS:'Üyeleri Taşı',
  PRIORITY_SPEAKER:'Öncelikli Konuşmacı', STREAM_VIDEO:'Video Yayını', CREATE_INVITES:'Davet Oluştur',
  MANAGE_WEBHOOKS:'Webhook Yönet', MANAGE_EMOJIS:'Emoji Yönet', ADMINISTRATOR:'Yönetici (Tüm İzinler)'
};
const DEF_MEMBER = PERMS.VIEW_CHANNELS|PERMS.SEND_MESSAGES|PERMS.READ_HISTORY|PERMS.EMBED_LINKS|PERMS.ATTACH_FILES|PERMS.ADD_REACTIONS|PERMS.USE_SLASH_CMDS|PERMS.CONNECT_VOICE|PERMS.SPEAK_VOICE|PERMS.STREAM_VIDEO|PERMS.CREATE_INVITES;
const DEF_MOD = DEF_MEMBER|PERMS.MANAGE_MESSAGES|PERMS.KICK_MEMBERS|PERMS.MUTE_MEMBERS|PERMS.DEAFEN_MEMBERS|PERMS.MOVE_MEMBERS|PERMS.MENTION_EVERYONE;
const DEF_ADMIN = BigInt('0x7FFFFFFF');

let _rolesCache = {}, _userRolesCache = {};
const _rolesSrv = () => window._currentServer || 'main';

async function loadRoles() {
  return new Promise(res => {
    dbRef('roles/' + _rolesSrv()).once('value', snap => {
      _rolesCache = snap.val() || {};
      if (!Object.keys(_rolesCache).length) _initDefaultRoles();
      res(_rolesCache);
    });
  });
}
async function _initDefaultRoles() {
  const d = {
    admin: { name:'Admin', color:'#e74c3c', icon:'👑', permissions:DEF_ADMIN.toString(), position:100, hoist:true, mentionable:true },
    moderator: { name:'Moderatör', color:'#e67e22', icon:'🛡️', permissions:DEF_MOD.toString(), position:50, hoist:true, mentionable:true },
    member: { name:'Üye', color:'#99aab5', icon:'👤', permissions:DEF_MEMBER.toString(), position:1, hoist:false, mentionable:false }
  };
  for (const [id, r] of Object.entries(d)) await dbRef('roles/' + _rolesSrv() + '/' + id).set(r);
  _rolesCache = d;
}
async function createRole(name, color, icon) {
  const id = 'role_' + Date.now();
  const r = { name, color:color||'#99aab5', icon:icon||'🔵', permissions:DEF_MEMBER.toString(), position:Object.keys(_rolesCache).length+1, hoist:false, mentionable:true, createdBy:_cu, createdAt:Date.now() };
  await dbRef('roles/' + _rolesSrv() + '/' + id).set(r);
  _rolesCache[id] = r; return id;
}
async function deleteRole(roleId) {
  if (['admin','moderator','member'].includes(roleId)) return showToast('Varsayılan roller silinemez');
  await dbRef('roles/' + _rolesSrv() + '/' + roleId).remove();
  delete _rolesCache[roleId]; _renderRolesList();
}
async function assignRole(userId, roleId) {
  await dbRef('userRoles/' + _rolesSrv() + '/' + userId + '/' + roleId).set(true);
  if (!_userRolesCache[userId]) _userRolesCache[userId] = {};
  _userRolesCache[userId][roleId] = true;
}
async function removeRole(userId, roleId) {
  await dbRef('userRoles/' + _rolesSrv() + '/' + userId + '/' + roleId).remove();
  if (_userRolesCache[userId]) delete _userRolesCache[userId][roleId];
}
async function getUserRoles(userId) {
  if (_userRolesCache[userId]) return _userRolesCache[userId];
  return new Promise(res => {
    dbRef('userRoles/' + _rolesSrv() + '/' + userId).once('value', snap => {
      _userRolesCache[userId] = snap.val() || { member:true };
      res(_userRolesCache[userId]);
    });
  });
}
async function getUserPerms(userId) {
  const roles = await getUserRoles(userId);
  let p = 0n;
  for (const rid of Object.keys(roles)) { const r = _rolesCache[rid]; if (r) p |= BigInt(r.permissions); }
  return p;
}
async function hasPerm(userId, perm) {
  const p = await getUserPerms(userId);
  if (p & PERMS.ADMINISTRATOR) return true;
  return !!(p & perm);
}

function openRolesModal() {
  loadRoles().then(() => {
    let m = document.getElementById('rolesModal');
    if (!m) { m = document.createElement('div'); m.id = 'rolesModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
    m.innerHTML = `<div class="bb-modal" style="width:720px;max-width:96vw;height:82vh;display:flex;flex-direction:column;">
      <div class="bb-modal-header"><span>🎭 Roller & İzinler</span><button class="bb-modal-close" onclick="document.getElementById('rolesModal').style.display='none'">✕</button></div>
      <div style="display:flex;flex:1;overflow:hidden;">
        <div id="rolesSidebar" style="width:210px;border-right:1px solid var(--border);overflow-y:auto;padding:10px;flex-shrink:0;">
          <button onclick="openCreateRoleModal()" style="width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;margin-bottom:10px;font-weight:700;font-size:.82rem;">＋ Yeni Rol</button>
          <div id="rolesList"></div>
        </div>
        <div id="roleDetail" style="flex:1;overflow-y:auto;padding:16px;"><div style="color:var(--muted);text-align:center;margin-top:80px;font-size:.9rem;">← Sol taraftan bir rol seçin</div></div>
      </div>
    </div>`;
    m.style.display = 'flex';
    _renderRolesList();
  });
}
function _renderRolesList() {
  const el = document.getElementById('rolesList'); if (!el) return;
  el.innerHTML = Object.entries(_rolesCache).sort((a,b)=>(b[1].position||0)-(a[1].position||0)).map(([id,r]) =>
    `<div onclick="selectRole('${id}')" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;margin-bottom:2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
      <span style="width:12px;height:12px;border-radius:50%;background:${r.color||'#99aab5'};flex-shrink:0;"></span>
      <span style="font-size:.82rem;font-weight:600;color:var(--text-hi);">${r.icon||''} ${r.name}</span>
    </div>`).join('');
}
function selectRole(roleId) {
  const r = _rolesCache[roleId]; if (!r) return;
  const el = document.getElementById('roleDetail'); if (!el) return;
  const rp = BigInt(r.permissions || '0');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <div style="width:44px;height:44px;border-radius:50%;background:${r.color};display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${r.icon||'🔵'}</div>
      <div><div style="font-weight:800;font-size:1.1rem;color:var(--text-hi);">${r.name}</div><div style="font-size:.75rem;color:var(--muted);">Pozisyon: ${r.position}</div></div>
      ${!['admin','moderator','member'].includes(roleId)?`<button onclick="deleteRole('${roleId}')" style="margin-left:auto;padding:6px 14px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c55;border-radius:8px;cursor:pointer;font-size:.78rem;">Sil</button>`:''}
    </div>
    <div style="margin-bottom:18px;"><div style="font-weight:700;margin-bottom:8px;color:var(--text-hi);">Renk</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63','#00bcd4','#607d8b','#95a5a6'].map(c=>
        `<div onclick="setRoleColor('${roleId}','${c}')" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:${r.color===c?'3px solid #fff':'2px solid transparent'};transition:transform .15s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`).join('')}
      </div>
    </div>
    <div style="font-weight:700;margin-bottom:8px;color:var(--text-hi);">İzinler</div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${Object.entries(PERMS).map(([name,bit]) =>
        `<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface);border-radius:8px;cursor:pointer;gap:12px;">
          <span style="font-size:.82rem;color:var(--text-hi);">${PERM_LABELS[name]||name}</span>
          <input type="checkbox" ${rp&bit?'checked':''} onchange="toggleRolePerm('${roleId}','${name}',this.checked)" style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;">
        </label>`).join('')}
    </div>`;
}
async function toggleRolePerm(roleId, permName, enabled) {
  const r = _rolesCache[roleId]; if (!r) return;
  let p = BigInt(r.permissions || '0');
  if (enabled) p |= PERMS[permName]; else p &= ~PERMS[permName];
  r.permissions = p.toString();
  await dbRef('roles/' + _rolesSrv() + '/' + roleId + '/permissions').set(p.toString());
}
async function setRoleColor(roleId, color) {
  await dbRef('roles/' + _rolesSrv() + '/' + roleId + '/color').set(color);
  _rolesCache[roleId].color = color; selectRole(roleId); _renderRolesList();
}
function openCreateRoleModal() {
  const name = prompt('Rol adı:'); if (!name) return;
  createRole(name).then(id => { _renderRolesList(); selectRole(id); showToast('✅ Rol oluşturuldu!'); });
}
function openMemberRolesModal(userId, userName) {
  loadRoles().then(async () => {
    const ur = await getUserRoles(userId);
    let m = document.getElementById('memberRolesModal');
    if (!m) { m = document.createElement('div'); m.id = 'memberRolesModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
    m.innerHTML = `<div class="bb-modal" style="width:400px;">
      <div class="bb-modal-header"><span>🎭 ${userName} – Rolleri</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:6px;">
        ${Object.entries(_rolesCache).sort((a,b)=>(b[1].position||0)-(a[1].position||0)).map(([id,r]) =>
          `<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface);border-radius:8px;cursor:pointer;">
            <span style="display:flex;align-items:center;gap:8px;">
              <span style="width:12px;height:12px;border-radius:50%;background:${r.color};"></span>
              <span style="font-weight:600;font-size:.85rem;color:var(--text-hi);">${r.icon||''} ${r.name}</span>
            </span>
            <input type="checkbox" ${ur[id]?'checked':''} style="width:18px;height:18px;accent-color:var(--accent);" onchange="${ur[id]?`removeRole('${userId}','${id}')`:`assignRole('${userId}','${id}')`}">
          </label>`).join('')}
      </div>
    </div>`;
    m.style.display = 'flex';
  });
}

window.openRolesModal = openRolesModal;
window.selectRole = selectRole;
window.deleteRole = deleteRole;
window.toggleRolePerm = toggleRolePerm;
window.setRoleColor = setRoleColor;
window.openCreateRoleModal = openCreateRoleModal;
window.assignRole = assignRole;
window.removeRole = removeRole;
window.openMemberRolesModal = openMemberRolesModal;
window.hasPerm = hasPerm;
window.PERMS = PERMS;
window.loadRoles = loadRoles;
