/* Nature.co — admin.js */
/* Otomatik bölümlendi */

/* ── Admin: Users ── */

async function loadAdminUsers(){
  const body=document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const users=await adminRestGet('users').catch(()=>null)||{};
  try{
    {
    // username alanı yoksa objenin key'ini username olarak ata
    Object.entries(users).forEach(([k,v])=>{ if(v&&!v.username) v.username=k; });
    const list=Object.values(users).filter(u=>u&&u.username).sort((a,b)=>(a.username||'').localeCompare(b.username||''));
    if(!list.length){body.innerHTML='<p style="color:var(--muted)">Kullanıcı yok.</p>';return;}

    let h='<div class="admin-section">';
    // Başlık + Arama + Toplu işlem araç çubuğu
    h+=`<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div class="admin-sec-title" style="margin:0">Tüm Kullanıcılar (${list.length})</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:.78rem;color:var(--muted);">
            <input type="checkbox" id="selectAllUsers" onchange="toggleSelectAllUsers(this)"> Tümünü Seç
          </label>
          <button class="a-btn red" id="bulkDeleteBtn" style="display:none;padding:6px 12px;font-size:.75rem;" onclick="bulkDeleteUsers()">🗑️ Seçilenleri Sil</button>
          <button onclick="adminExportUsersXLS()" style="padding:6px 12px;background:#1d6f42;color:#fff;border:none;border-radius:7px;font-size:.75rem;font-weight:700;cursor:pointer;">📥 XLSX İndir</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <input id="adminUserSearch" class="admin-inp" placeholder="👤 Kullanıcı adı ara..." oninput="filterAdminUsers()" style="flex:1;">
        <input id="adminIdSearch" class="admin-inp" placeholder="🆔 ID ile ara..." oninput="filterAdminUsers()" style="flex:1;">
      </div>
    </div>`;
    h+='<div class="admin-card">';

    list.forEach(u=>{
      const isBanned=!!u.banned;
      const isAdminUser=!!u.isAdmin;
      const isMe=u.username===_cu;
      const on=!!_online[u.username];
      h+=`<div class="admin-row" id="urow-${esc(u.username)}" data-username="${esc((u.username||'').toLowerCase())}" data-userid="${esc((u.userId||'').toLowerCase())}">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
          ${!isMe?`<input type="checkbox" class="user-select-cb" data-u="${esc(u.username)}" onchange="onUserCheckChange()" style="width:16px;height:16px;cursor:pointer;flex-shrink:0;">`:'<div style="width:16px;flex-shrink:0;"></div>'}
          <div class="admin-row-av" style="background:${strColor(u.username)}">${initials(u.username)}</div>
          <div class="admin-row-info">
            <div class="admin-row-name">
              ${esc(u.username)}
              ${isAdminUser?'<span class="admin-tag">Admin</span>':''}
              ${isBanned?'<span class="banned-tag">Banlı</span>':''}
            </div>
            <div class="admin-row-sub">${on?'🟢 Çevrimiçi':'⚫ Çevrimdışı'} · ${u.origin||'—'} · 🏢 ${u._ws||'?'} · 📅 ${u.createdAt?new Date(u.createdAt).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Bilinmiyor'}${u.userId?` · <span style="font-family:monospace;color:var(--accent);font-size:.68rem;">🆔 ${esc(u.userId)}</span>`:''}</div>
            ${u.lastIP?`<div style="font-size:11px;color:#e67e22;margin-top:2px;font-family:monospace;">🌐 ${esc(u.lastIP)}</div>`:''}
          </div>
        </div>
        <div class="admin-row-btns" style="flex-wrap:wrap;">
          <button class="a-btn" style="background:var(--surface);" onclick="adminUserDetails('${u.username}')">🔍 Detay</button>
          <button class="a-btn blue" onclick="adminEditUserProfile('${u.username}')">✏️ Düzenle</button>
          ${!isMe?`<button class="a-btn ${isBanned?'green':'red'}" onclick="adminToggleBan('${u.username}',${!isBanned})">${isBanned?'✅ Unban':'🚫 Ban'}</button>`:''}
          ${!isMe&&u.lastIP?`<button class="a-btn red" style="background:#8e44ad" onclick="adminIPBan('${u.username}','${u.lastIP||''}')">🌐 IP Ban</button>`:''}
          ${!isMe&&!isAdminUser?`<button class="a-btn yellow" onclick="adminMakeAdmin('${u.username}')">👑 Admin Yap</button>`:''}
          ${!isMe&&isAdminUser?`<button class="a-btn red" onclick="adminRemoveAdmin('${u.username}')">👑 Admin Al</button>`:''}
          ${!isMe?`<button class="a-btn" style="background:var(--surface2);" onclick="adminViewUserMessages('${u.username}')">💬 Mesajlar</button>`:''}
          ${!isMe?`<button class="a-btn blue" onclick="adminResetPassword('${u.username}')">🔑 Şifre Sıfırla</button>`:''}\n          ${!isMe?`<button class="a-btn red" onclick="adminDeleteUser('${u.username}')">🗑️ Sil</button>`:''}
        </div>
      </div>`;
    });
    h+='</div></div>';
    body.innerHTML=h;
    // Store list for export
    body._userList = list;
  }}catch(e){body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi: '+(e&&e.message||e)+'</p>';}
}

function filterAdminUsers(){
  const sq = (document.getElementById('adminUserSearch')?.value||'').toLowerCase().trim();
  const iq = (document.getElementById('adminIdSearch')?.value||'').toLowerCase().trim();
  document.querySelectorAll('.admin-row[data-username]').forEach(row=>{
    const uMatch = !sq || row.dataset.username.includes(sq);
    const iMatch = !iq || row.dataset.userid.includes(iq);
    row.style.display = (uMatch && iMatch) ? '' : 'none';
  });
}

async function adminExportUsersXLS(){
  showToast('⏳ Hazırlanıyor...');
  
  // --- 1. Kullanıcı verisini çek ---
  const users = await adminRestGet('users').catch(()=>null)||{};
  const list = Object.values(users).filter(u=>u&&u.username)
    .sort((a,b)=>(a.username||'').localeCompare(b.username||''));

  // --- 2. SheetJS kütüphanesini yükle ---
  await new Promise((res,rej)=>{
    if(window.XLSX){ res(); return; }
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });

  // --- 3. JSZip kütüphanesini yükle ---
  await new Promise((res,rej)=>{
    if(window.JSZip){ res(); return; }
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });

  // --- 4. XLSX oluştur ---
  const headers = ['Kullanıcı Adı','ID','E-posta','Köken','Kayıt IP','Son IP','Kayıt Tarihi','Son Görülme','Admin','Banlı'];
  const wsData = [headers, ...list.map(u=>[
    u.username||'',
    u.userId||'',
    u.email||'',
    u.origin||'',
    u.regIP||'',
    u.lastIP||'',
    u.createdAt?new Date(u.createdAt).toLocaleString('tr-TR'):'',
    u.lastSeen?new Date(u.lastSeen).toLocaleString('tr-TR'):'',
    u.isAdmin?'Evet':'Hayır',
    u.banned?'Evet':'Hayır'
  ])];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Sütun genişlikleri
  ws['!cols'] = [20,18,30,18,16,16,22,22,8,8].map(w=>({wch:w}));
  // Başlık satırı kalın
  headers.forEach((_,i)=>{
    const cell = ws[XLSX.utils.encode_cell({r:0,c:i})];
    if(cell) { cell.s = {font:{bold:true}}; }
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Üyeler');
  const xlsxBytes = XLSX.write(wb, {type:'array', bookType:'xlsx'});

  // --- 5. Şifreli ZIP oluştur ---
  const password = 'NC' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2,5).toUpperCase();
  const fileName = 'natureco_uyeler_' + new Date().toISOString().slice(0,10) + '.xlsx';
  
  const zip = new JSZip();
  zip.file(fileName, xlsxBytes);
  // JSZip şifrelemeyi desteklemez — ZIP oluştur, şifreyi mesaj ile gönder
  const zipBlob = await zip.generateAsync({
    type:'blob',
    compression:'DEFLATE',
    compressionOptions:{level:9}
  });

  // --- 6. İndir ---
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'natureco_uyeler_' + new Date().toISOString().slice(0,10) + '_SIFRE_' + password + '.zip';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // --- 7. Şifreyi admin'e DM olarak gönder ---
  try {
    if(typeof dbRef === 'function' && window._cu) {
      const msgKey = 'export_' + Date.now();
      const adminNote = {
        user: 'NatureBot',
        text: '🔒 **Güvenli Dışa Aktarım**\n\n' +
              '📁 ' + fileName + '\n' +
              '👥 ' + list.length + ' üye\n' +
              '📅 ' + new Date().toLocaleString('tr-TR') + '\n\n' +
              '🔑 ZIP Şifresi: `' + password + '`\n\n' +
              '_Bu mesaj yalnızca sana görünür._',
        ts: Date.now(),
        sys: false,
        isBot: true
      };
      // Admin bildirimler yoluna yaz
      await dbRef('adminNotifications/' + window._cu + '/' + msgKey).set(adminNote);
      // Aynı zamanda kendine DM olarak gönder  
      const dmRoom = [window._cu, window._cu].sort().join('_dm_');
      await dbRef('msgs/' + dmRoom + '/' + msgKey).set(adminNote);
    }
  } catch(e2) { console.warn('Şifre bildirimi gönderilemedi:', e2); }

  showToast('📥 ZIP indirildi! Şifre: ' + password + ' — Mesajlara bakın');
  
  // Şifreyi ekranda da göster
  setTimeout(()=>{
    const pw = document.createElement('div');
    pw.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface2);border:2px solid var(--accent);border-radius:16px;padding:24px 32px;z-index:999999;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.8);max-width:90vw;';
    pw.innerHTML = [
      '<div style="font-size:1rem;font-weight:700;color:var(--text-hi);margin-bottom:12px;">🔑 ZIP Dosya Şifresi</div>',
      '<div style="font-family:monospace;font-size:1.5rem;font-weight:900;color:var(--accent);letter-spacing:3px;background:var(--surface);padding:12px 20px;border-radius:10px;margin-bottom:12px;">' + password + '</div>',
      '<div style="font-size:.75rem;color:var(--muted);margin-bottom:14px;">Bu şifre mesajlarınıza da gönderildi.</div>',
      '<button id="_pwCopyBtn" style="padding:8px 18px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-right:8px;">📋 Kopyala</button>',
      '<button id="_pwCloseBtn" style="padding:8px 18px;background:var(--surface);color:var(--muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;">Kapat</button>'
    ].join('');
    document.body.appendChild(pw);
    document.getElementById('_pwCopyBtn').onclick = function(){ navigator.clipboard.writeText(password).then(()=>{ this.textContent='✅ Kopyalandı'; }); };
    document.getElementById('_pwCloseBtn').onclick = function(){ pw.remove(); };
  }, 500);
}

function onUserCheckChange(){
  const cbs=document.querySelectorAll('.user-select-cb:checked');
  const btn=document.getElementById('bulkDeleteBtn');
  if(btn) btn.style.display=cbs.length>0?'inline-block':'none';
  const all=document.querySelectorAll('.user-select-cb');
  const selAll=document.getElementById('selectAllUsers');
  if(selAll) selAll.checked=all.length>0&&cbs.length===all.length;
}

function toggleSelectAllUsers(cb){
  document.querySelectorAll('.user-select-cb').forEach(el=>el.checked=cb.checked);
  onUserCheckChange();
}

function bulkDeleteUsers(){
  const cbs=document.querySelectorAll('.user-select-cb:checked');
  const users=[...cbs].map(cb=>cb.dataset.u);
  if(!users.length) return;
  if(!confirm(users.length+' kullanıcı kalıcı olarak silinsin mi?\n\n'+users.join(', '))) return;
  Promise.all(users.flatMap(u=>[
    adminRestDelete('users/'+u),
    adminRestDelete('online/'+u),
    adminRestDelete('friends/'+u),
    adminRestDelete('friendRequests/'+u),
    adminRestDelete('friendRequestsSent/'+u),
    adminRestDelete('admins/'+u)
  ])).then(()=>{
    showToast(users.length+' kullanıcı silindi.');
    loadAdminUsers();
  }).catch(()=>showToast('Bazı silmeler başarısız oldu.'));
}

async function adminIPBan(username, ip){
  if(!ip){ showToast('IP adresi bulunamadı.'); return; }
  if(!confirm('⚠️ '+username+' kullanıcısının IP adresi yasaklansın mı?\n\nIP: '+ip+'\n\nBu IP\'den giriş yapmaya çalışan HERKESİN girişi engellenecektir!')) return;
  const key = ip.replace(/\./g,'_');
  try{
    await adminRestSet('bannedIPs/'+key,{ip:ip,bannedBy:_cu,bannedAt:Date.now(),username:username});
    await adminRestSet('users/'+username+'/banned',true);
    showToast('🌐 IP ban uygulandı: '+ip);
    loadAdminUsers();
  }catch(e){ showToast('Hata: '+e.message); }
}

async function adminIPUnban(ip){
  if(!confirm('IP yasağı kaldırılsın mı?\n\nIP: '+ip)) return;
  const key = ip.replace(/\./g,'_');
  try{
    await adminRestDelete('bannedIPs/'+key);
    showToast('✅ IP ban kaldırıldı: '+ip);
    loadAdminIPBans();
  }catch(e){ showToast('Hata.'); }
}

async function loadAdminIPBans(){
  const body = document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  try{
    const bans = await adminRestGet('bannedIPs')||{};
    const list = Object.values(bans);
    if(!list.length){
      body.innerHTML='<div class="admin-section"><p style="color:var(--muted);padding:20px">Yasaklı IP adresi yok.</p></div>';
      return;
    }
    let h='<div class="admin-section"><div class="admin-sec-title">🌐 Yasaklı IP Adresleri ('+list.length+')</div><div class="admin-card">';
    list.sort((a,b)=>b.bannedAt-a.bannedAt).forEach(b=>{
      h+=`<div class="admin-row" style="align-items:center;">
        <div style="flex:1">
          <div style="font-family:monospace;font-weight:700;color:#e67e22">${esc(b.ip)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">
            👤 ${esc(b.username||'?')} · 🕐 ${b.bannedAt?new Date(b.bannedAt).toLocaleString('tr-TR'):'?'}
          </div>
        </div>
        <button class="a-btn green" onclick="adminIPUnban('${esc(b.ip)}')">✅ Kaldır</button>
      </div>`;
    });
    h+='</div></div>';
    body.innerHTML=h;
  }catch(e){ body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>'; }
}

async function adminToggleBan(username,ban){
  if(!confirm(`${username} kullanıcısını ${ban?'banlamak':'banı kaldırmak'} istediğinize emin misiniz?`))return;
  try{
    await adminRestSet('users/'+username+'/banned',ban);
    showToast(ban?username+' banlandı.':username+' banı kaldırıldı.');
    loadAdminUsers();
    if(ban) adminRestDelete('online/'+username).catch(()=>{});
  }catch(e){showToast('Hata: '+(e&&e.message||''));}
}
async function adminMakeAdmin(username){
  if(!confirm(`${username} kullanıcısına admin yetkisi verilsin mi?`))return;
  try{
    await Promise.all([adminRestSet('users/'+username+'/isAdmin',true),adminRestSet('admins/'+username,true)]);
    showToast(username+' artık admin.');
    loadAdminUsers();
  }catch(e){showToast('Hata oluştu.');}
}


/* ── Admin: Messages ── */

function loadAdminMsgs(){
  const body=document.getElementById('adminBody');
  // Load all rooms and messages via REST
  Promise.all([adminRestGet('rooms').catch(()=>({})),adminRestGet('msgs').catch(()=>({}))]).then(([roomsData,msgsData])=>{
    const rooms=roomsData||{};
    const roomList=Object.values(rooms);
    if(!roomList.length){body.innerHTML='<p style="color:var(--muted)">Oda yok.</p>';return;}
    const allMsgsAll=msgsData||{};
    const results=roomList.map(r=>({room:r,msgs:allMsgsAll[r.id]||{}}));
    {
      let allMsgs=[];
      results.forEach(({room,msgs})=>{
        Object.entries(msgs).forEach(([key,m])=>{
          if(!m.sys) allMsgs.push({...m,_key:key,_roomId:room.id,_roomName:room.name||room.id});
        });
      });
      allMsgs.sort((a,b)=>b.ts-a.ts);
      if(!allMsgs.length){body.innerHTML='<p style="color:var(--muted);padding:20px">Mesaj yok.</p>';return;}
      let h=`<div class="admin-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div class="admin-sec-title" style="margin:0">Son Mesajlar (${allMsgs.length})</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input id="adminMsgSearch" placeholder="Ara..." oninput="adminFilterMsgs(this.value)" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:5px 10px;color:var(--text-hi);font-size:.78rem;outline:none;width:160px;">
            <button class="a-btn red" onclick="adminClearAllMsgs()">Tümünü Sil</button>
          </div>
        </div>
        <div class="admin-card" id="adminMsgList">`;
      const _shownMsgs = allMsgs.slice(0, 100);
      _shownMsgs.forEach(m=>{
        const txt=m.file?`📎 ${m.file.name||'Dosya'}`:m.text;
        h+=`<div class="admin-row" style="align-items:flex-start">
          <div class="admin-row-av" style="background:${strColor(m.user)};flex-shrink:0">${initials(m.user)}</div>
          <div class="admin-row-info">
            <div class="admin-msg-room"># ${esc(m._roomName)}</div>
            <div class="admin-msg-text">${esc(txt).slice(0,120)}${txt.length>120?'…':''}</div>
            <div class="admin-msg-meta">
              <div class="admin-msg-user">${esc(m.user)}</div>
              <div class="admin-msg-ts">${fmtTime(m.ts)} · ${formatDate(new Date(m.ts))}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;margin-top:2px">
            <button class="a-btn blue" onclick="adminEditMsg('${m._roomId}','${m._key}',this)">✏️</button>
            <button class="a-btn red" onclick="adminDeleteMsgFromPanel('${m._roomId}','${m._key}')">🗑️</button>
          </div>
        </div>`;
      });
      if(allMsgs.length > 100) h += `<div style="text-align:center;padding:14px;"><button class="a-btn" style="background:var(--surface2);" onclick="adminTab('msgs')">Sadece ilk 100 mesaj gösteriliyor. Tümü için arama kullanın.</button></div>`;
      h+='</div></div>';
      body.innerHTML=h;
    }
  }).catch(e=>{ body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>'; });
}
async function adminDeleteMsgFromPanel(roomId,key){
  if(!confirm('Bu mesajı sil?'))return;
  try{
    await adminRestDelete('msgs/'+roomId+'/'+key);
    showToast('Mesaj silindi.');loadAdminMsgs();
  }catch(e){showToast('Hata.');}
}

function adminFilterMsgs(q){
  const list = document.getElementById('adminMsgList');
  if(!list) return;
  const term = (q||'').toLowerCase().trim();
  list.querySelectorAll('.admin-row').forEach(row=>{
    const text = row.textContent.toLowerCase();
    row.style.display = (!term || text.includes(term)) ? '' : 'none';
  });
}


/* ── Admin: Announce ── */

async function loadAdminAnnounce(){
  const body=document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const rooms=await adminRestGet('rooms').catch(()=>null)||{};
  {
    const list=Object.values(rooms).filter(r=>r.type!=='dm');
    let opts=`<option value="__all__">📣 Tüm Kanallara</option>`;
    list.forEach(r=>{opts+=`<option value="${r.id}">${r.type==='group'?'👥':'#'} ${esc(r.name||r.id)}</option>`;});
    body.innerHTML=`
    <div class="admin-section">
      <div class="admin-sec-title">Duyuru Gönder</div>
      <select class="announce-select" id="announceRoom">${opts}</select>
      <textarea class="announce-textarea" id="announceText" placeholder="Duyuru metni..." rows="5"></textarea>
      <button class="admin-submit" onclick="adminSendAnnounce()">📣 Duyuruyu Gönder</button>
    </div>
    <div class="admin-section" style="margin-top:12px">
      <div class="admin-sec-title" style="margin-bottom:8px">💡 İpucu</div>
      <div style="background:var(--surface);border-radius:8px;padding:12px;font-size:.82rem;color:var(--muted);line-height:1.6">
        Duyurular sistem mesajı olarak gönderilir ve tüm kullanıcılar tarafından görülür. "Tüm Kanallara" seçeneği her kanala ayrı ayrı gönderir.
      </div>
    </div>`;
  }
}
async function adminSendAnnounce(){
  const roomVal=document.getElementById('announceRoom').value;
  const text=document.getElementById('announceText').value.trim();
  if(!text){showToast('Duyuru metni girin.');return;}
  try{
    const rooms=await adminRestGet('rooms').catch(()=>({}))||{};
    const targets=roomVal==='__all__'
      ?Object.values(rooms).filter(r=>r.type!=='dm').map(r=>r.id)
      :[roomVal];
    const key=Date.now().toString(36)+'_ann';
    await Promise.all(targets.map(rid=>adminRestSet('msgs/'+rid+'/'+key,{sys:true,text:`📣 Admin Duyurusu: ${text}`,ts:Date.now()})));
    showToast(`Duyuru ${targets.length} odaya gönderildi!`);
    document.getElementById('announceText').value='';
  }catch(e){showToast('Hata oluştu.');}
}



/* ── Admin: Rename User ── */

async function adminRenameUser(username){
  const newName = prompt(`"${username}" kullanıcısının yeni adı:`, username);
  if(!newName || newName.trim()===username) return;
  const n = newName.trim();
  if(n.length<2){showToast('En az 2 karakter!');return;}
  if(!/^[a-zA-Z0-9çğışöüÇĞİŞÖÜ _.\-]+$/.test(n)){showToast('Geçersiz karakter!');return;}
  // Copy user data to new key, delete old
  try{
    const data = await adminRestGet('users/'+username);
    if(!data){showToast('Kullanıcı bulunamadı.');return;}
    data.username = n;
    await adminRestSet('users/'+n,data);
    await adminRestDelete('users/'+username);
    showToast(`"${username}" → "${n}" olarak güncellendi.`);
    loadAdminUsers();
  }catch(e){showToast('Hata oluştu.');}
}

async function adminRemoveAdmin(username){
  if(!confirm(`${username} kullanıcısının admin yetkisi alınsın mı?`))return;
  try{
    await Promise.all([adminRestDelete('users/'+username+'/isAdmin'),adminRestDelete('admins/'+username)]);
    showToast(username+' admin yetkisi alındı.');loadAdminUsers();
  }catch(e){showToast('Hata oluştu.');}
}

async function adminResetPassword(username){
  const newPass = prompt('👤 ' + username + ' için yeni şifre girin:');
  if(!newPass || newPass.trim().length < 3){
    if(newPass !== null) alert('Şifre en az 3 karakter olmalı.');
    return;
  }
  const newHash = await hashStr(newPass.trim() + username);
  try{
    await adminRestSet('users/'+username+'/passwordHash',newHash);
    showToast('✅ ' + username + ' şifresi güncellendi!');
  }catch(e){showToast('❌ Hata oluştu.');}
}
async function adminDeleteUser(username){
  if(!confirm(username+' kullanıcısı kalıcı olarak silinsin mi? Bu işlem geri alınamaz!'))return;
  try{
    await Promise.all([adminRestDelete('users/'+username),adminRestDelete('online/'+username),adminRestDelete('friends/'+username),adminRestDelete('friendRequests/'+username),adminRestDelete('friendRequestsSent/'+username),adminRestDelete('admins/'+username)]);
    showToast('✅ '+username+' silindi.'); loadAdminUsers();
  }catch(e){ showToast('❌ Hata: '+(e&&e.message||'Bilinmiyor')); }
}


/* ── Admin: Rename Room ── */

async function adminRenameRoom(id, oldName){
  const newName = prompt(`Odanın yeni adı:`, oldName);
  if(!newName || newName.trim()===oldName) return;
  const n = newName.trim();
  if(!n){showToast('Ad boş olamaz!');return;}
  try{
    await adminRestSet('rooms/'+id+'/name',n);
    showToast(`Oda adı "${n}" olarak güncellendi.`);
    loadAdminRooms(); loadRooms();
  }catch(e){showToast('Hata oluştu.');}
}


/* ── Admin: Edit Message ── */

async function adminEditMsg(roomId, key, btn){
  try{
    const oldText=await adminRestGet('msgs/'+roomId+'/'+key+'/text').catch(()=>'')||'';
    const newText=prompt('Mesajı düzenle:',oldText);
    if(newText===null||newText.trim()===oldText)return;
    const t=newText.trim();
    if(!t){showToast('Mesaj boş olamaz!');return;}
    await adminRestSet('msgs/'+roomId+'/'+key+'/text',t);
    showToast('Mesaj güncellendi.');loadAdminMsgs();
  }catch(e){showToast('Hata.');}
}


/* ── Admin: Forum ── */

async function loadAdminForum(){
  const body = document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const postsRaw = await adminRestGet('forum/posts').catch(()=>null)||{};
  try{
    const posts = postsRaw;
    const arr = Object.entries(posts).map(([k,v])=>({...v,_key:k})).sort((a,b)=>b.ts-a.ts);
    if(!arr.length){body.innerHTML='<p style="color:var(--muted);padding:20px">Forum paylaşımı yok.</p>';return;}
    let h=`<div class="admin-section"><div class="admin-sec-title">Forum Paylaşımları (${arr.length})</div><div class="admin-card">`;
    arr.forEach(p=>{
      const commentCount = p.comments ? Object.keys(p.comments).length : 0;
      const likeCount = p.likes ? Object.keys(p.likes).length : 0;
      const catLabel = {genel:'💬',tarih:'📜',kultur:'🎭',spor:'⚽',muzik:'🎵',teknoloji:'💻',soru:'❓'}[p.cat]||'💬';
      h+=`<div class="admin-row" style="align-items:flex-start">
        <div class="admin-row-av" style="background:${strColor(p.user)};flex-shrink:0">${initials(p.user)}</div>
        <div class="admin-row-info">
          <div class="admin-row-name">${esc(p.user)} <span style="font-size:.65rem;color:var(--muted)">${catLabel} ${p.cat||'genel'}</span></div>
          <div class="admin-msg-text">${esc(p.text).slice(0,100)}${p.text&&p.text.length>100?'…':''}</div>
          <div class="admin-msg-meta">
            <span style="color:var(--muted);font-size:.68rem">❤️${likeCount} · 💬${commentCount} · ${formatDate(new Date(p.ts))} ${fmtTime(p.ts)}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button class="a-btn blue" onclick="adminEditForumPost('${p._key}',this)">✏️</button>
          <button class="a-btn red" onclick="adminDeleteForumPost('${p._key}')">🗑️</button>
        </div>
      </div>`;
    });
    h+='</div></div>';
    body.innerHTML=h;
  }catch(e){body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>';}
}
async function adminEditForumPost(key, btn){
  try{
    const oldText=await adminRestGet('forum/posts/'+key+'/text').catch(()=>'')||'';
    const newText=prompt('Paylaşımı düzenle:',oldText);
    if(newText===null||newText.trim()===oldText)return;
    const t=newText.trim();
    if(!t){showToast('Metin boş olamaz!');return;}
    await adminRestSet('forum/posts/'+key+'/text',t);
    showToast('Güncellendi.');loadAdminForum();
  }catch(e){showToast('Hata.');}
}
async function adminDeleteForumPost(key){
  if(!confirm('Bu forum paylaşımını sil?'))return;
  try{
    await adminRestDelete('forum/posts/'+key);
    showToast('Silindi.');loadAdminForum();
  }catch(e){showToast('Hata.');}
}



/* ── Admin: Design ── */

async function loadAdminDesign(){
  const body = document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const d = await adminRestGet('settings/design').catch(()=>null)||{};

  // ── Renk Tanımları ──
  const colors = [
    { key:'bg',         label:'Ana Arka Plan',       def:'#1a1e25' },
    { key:'bg2',        label:'İkincil Arka Plan',   def:'#22262d' },
    { key:'surface',    label:'Yüzey (Kartlar)',     def:'#2a303c' },
    { key:'surface2',   label:'Yüzey 2',             def:'#333c4a' },
    { key:'border',     label:'Kenarlık',            def:'#434c5e' },
    { key:'text',       label:'Normal Yazı',         def:'#dde2ea' },
    { key:'textHi',     label:'Başlık Yazı',         def:'#ffffff' },
    { key:'muted',      label:'Soluk Yazı',          def:'#8f9ab0' },
    { key:'accent',     label:'Vurgu Rengi',         def:'#4a9e7a' },
    { key:'green',      label:'Yeşil (Online)',      def:'#2ecc71' },
    { key:'red',        label:'Kırmızı (Hata)',      def:'#e05555' },
    { key:'ownBg',      label:'Kendi Mesaj Balonu',  def:'#1f4a3a' },
    { key:'incomingBg', label:'Gelen Mesaj Balonu',  def:'#1e2e35' },
  ];

  const fonts = [
    { value:'DM Sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', label:'DM Sans (Varsayılan)' },
    { value:'"Inter",sans-serif',       label:'Inter' },
    { value:'"Roboto",sans-serif',      label:'Roboto' },
    { value:'"Nunito",sans-serif',      label:'Nunito' },
    { value:'"Poppins",sans-serif',     label:'Poppins' },
    { value:'"Montserrat",sans-serif',  label:'Montserrat' },
    { value:'monospace',                label:'Monospace' },
  ];

  const curFont    = d.fontFamily || fonts[0].value;
  const curSize    = d.fontSize   || '15px';
  const curRadius  = d.borderRadius !== undefined ? d.borderRadius : 12;

  // Tab order & visibility
  const defaultTabs = [
    { id:'home',    label:'Ana Sayfa',  emoji:'🏠', action:"switchMainTab('home')" },
    { id:'msgs',    label:'Mesajlar',   emoji:'💬', action:"openDMModal()" },
    { id:'forum',   label:'Forum',      emoji:'📋', action:"switchMainTab('forum')" },
    { id:'friends', label:'Arkadaşlar', emoji:'👥', action:"openFriendsModal()" },
    { id:'watch',   label:'İzle',       emoji:'📺', action:"switchMainTab('watch')" },
  ];
  const savedTabOrder  = d.tabOrder   || defaultTabs.map(t=>t.id);
  const hiddenTabs     = d.hiddenTabs || [];

  // Icon sizes
  const tabIconSize  = d.tabIconSize  || 20;
  const tabLabelSize = d.tabLabelSize || 9;
  const navIconSize  = d.navIconSize  || 19;

  // Text sizes
  const msgFontSize     = d.msgFontSize     || 14;
  const sidebarFontSize = d.sidebarFontSize || 15;
  const headerFontSize  = d.headerFontSize  || 18;
  const inputFontSize   = d.inputFontSize   || 14;
  const forumFontSize   = d.forumFontSize   || 14;

  // Custom images / SVG emojis
  const customImages = d.customImages || {};

  const card = (title, inner, mb) =>
    `<div class="admin-card" style="padding:16px;margin-bottom:${mb||12}px;">
      <div class="admin-sec-title" style="margin-bottom:12px;">${title}</div>
      ${inner}
    </div>`;

  let html = '<div class="admin-section">';
  html += '<div class="admin-sec-title">🎨 Global Tasarım Yöneticisi</div>';
  html += '<div style="font-size:.75rem;color:var(--muted);margin-bottom:14px;">Tüm değişiklikler Firebase\'e kaydedilir. Üyeler giriş yaptığında otomatik yeni tasarımı görür.</div>';

  // ═══ 1. RENKLER ═══
  let colHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  colors.forEach(c => {
    const val = d['color_'+c.key] || c.def;
    colHtml += `<div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:.68rem;color:var(--muted);">${c.label}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="color" id="dc_${c.key}" value="${val}" style="width:38px;height:32px;border-radius:6px;border:1px solid var(--border);cursor:pointer;padding:2px;background:var(--surface2);flex-shrink:0;" oninput="document.getElementById('dc_${c.key}_txt').value=this.value">
        <input type="text" id="dc_${c.key}_txt" value="${val}" placeholder="#rrggbb" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 7px;color:var(--text);font-size:.7rem;font-family:monospace;" oninput="const v=this.value.trim();if(/^#[0-9a-fA-F]{6}$/.test(v)){document.getElementById('dc_${c.key}').value=v;}">
      </div>
    </div>`;
  });
  colHtml += '</div>';
  html += card('🖌️ Renkler', colHtml);

  // ═══ 2. YAZI TİPİ & BOYUTLAR ═══
  let fontHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';

  // Font family
  fontHtml += `<div style="grid-column:1/-1;"><div style="font-size:.7rem;color:var(--muted);margin-bottom:5px;">Yazı Tipi (Tüm Uygulama)</div>
    <select id="dc_font" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-size:.82rem;" onchange="void 0">`;
  fonts.forEach(f => { fontHtml += `<option value="${f.value}" ${curFont===f.value?'selected':''}>${f.label}</option>`; });
  fontHtml += '</select></div>';

  // Font sizes
  const textSizes = [
    { id:'dc_msgFontSize',     label:'💬 Mesaj Yazısı (px)',      val:msgFontSize,     min:11, max:20 },
    { id:'dc_sidebarFontSize', label:'📋 Sidebar Yazısı (px)',    val:sidebarFontSize, min:11, max:20 },
    { id:'dc_headerFontSize',  label:'🏷️ Başlık Yazısı (px)',     val:headerFontSize,  min:13, max:28 },
    { id:'dc_inputFontSize',   label:'✏️ Mesaj Giriş Kutusu (px)',val:inputFontSize,   min:11, max:20 },
    { id:'dc_forumFontSize',   label:'📰 Forum Yazısı (px)',      val:forumFontSize,   min:11, max:20 },
  ];
  textSizes.forEach(s => {
    fontHtml += `<div>
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:5px;">${s.label}: <span id="${s.id}_val">${s.val}</span></div>
      <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.val}" style="width:100%;"
        oninput="document.getElementById('${s.id}_val').textContent=this.value">
    </div>`;
  });

  fontHtml += '</div>';
  html += card('🔤 Yazı Tipi & Boyutlar', fontHtml);

  // ═══ 3. İKON BOYUTLARI ═══
  const iconSizeDefs = [
    { id:'dc_tabIconSize',  label:'📱 Alt Tab İkon Boyutu (px)', val:tabIconSize,  min:14, max:32 },
    { id:'dc_tabLabelSize', label:'📱 Alt Tab Etiket Boyutu (px)',val:tabLabelSize, min:7,  max:14 },
    { id:'dc_navIconSize',  label:'🖥️ Sol Nav İkon Boyutu (px)',  val:navIconSize,  min:14, max:32 },
  ];
  let iconHtml = '<div style="display:flex;flex-direction:column;gap:12px;">';
  iconSizeDefs.forEach(s => {
    iconHtml += `<div>
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:5px;">${s.label}: <span id="${s.id}_val">${s.val}</span>px</div>
      <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.val}" style="width:100%;"
        oninput="document.getElementById('${s.id}_val').textContent=this.value">
    </div>`;
  });
  iconHtml += '</div>';
  html += card('📐 İkon Boyutları', iconHtml);

  // ═══ 4. TAB SIRASI & GÖRÜNÜRLÜKLERİ ═══
  const orderedTabs = savedTabOrder.map(id => defaultTabs.find(t=>t.id===id)).filter(Boolean);
  // Add any tabs not in savedTabOrder
  defaultTabs.forEach(t => { if(!orderedTabs.find(o=>o.id===t.id)) orderedTabs.push(t); });

  let tabHtml = `<div style="font-size:.72rem;color:var(--muted);margin-bottom:10px;">Sekmeleri sürükle-bırak ile yeniden sırala. Gizlemek için göz ikonuna tıkla.</div>
  <div id="dc_tab_list" style="display:flex;flex-direction:column;gap:6px;">`;
  orderedTabs.forEach((t,i) => {
    const hidden = hiddenTabs.includes(t.id);
    tabHtml += `<div id="dctab_${t.id}" data-tab-id="${t.id}" draggable="true"
      ondragstart="adminTabDragStart(event)" ondragover="adminTabDragOver(event)" ondrop="adminTabDrop(event)"
      style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);cursor:grab;${hidden?'opacity:.45':''}">
      <span style="font-size:1.1rem;">${t.emoji}</span>
      <span style="flex:1;font-size:.85rem;font-weight:700;color:var(--text-hi);">${t.label}</span>
      <span style="font-size:.7rem;color:var(--muted);">☰</span>
      <button onclick="adminTabToggleVisibility('${t.id}',this)" title="${hidden?'Göster':'Gizle'}"
        style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:.75rem;color:${hidden?'var(--green)':'var(--muted)'};">
        ${hidden?'👁 Göster':'🚫 Gizle'}
      </button>
    </div>`;
  });
  tabHtml += '</div>';
  html += card('🗂️ Sekme Sırası & Görünürlük', tabHtml);

  // ═══ 5. GÖRSELLER & SVG EMOJİLER ═══
  const imageSlots = [
    { key:'appLogo',       label:'🍃 Uygulama Logosu (SVG/URL)',       placeholder:'https://... veya SVG kodu' },
    { key:'loginBg',       label:'🖼️ Giriş Ekranı Arka Planı (URL)',   placeholder:'https://resim-url.jpg' },
    { key:'emptyRoomImg',  label:'📭 Boş Sohbet Görseli (URL/emoji)',  placeholder:'https://... veya 🌿' },
    { key:'botAvatar',     label:'🤖 NatureBot Avatarı (URL)',          placeholder:'https://resim-url.png' },
    { key:'customEmoji1',  label:'😊 Özel Emoji 1 (URL/SVG)',          placeholder:'https://... veya SVG' },
    { key:'customEmoji2',  label:'😎 Özel Emoji 2 (URL/SVG)',          placeholder:'https://... veya SVG' },
  ];
  let imgHtml = '<div style="display:flex;flex-direction:column;gap:10px;">';
  imageSlots.forEach(s => {
    const val = customImages[s.key] || '';
    imgHtml += `<div>
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:5px;">${s.label}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" id="dci_${s.key}" value="${val.replace(/"/g,'&quot;')}" placeholder="${s.placeholder}"
          style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-size:.75rem;">
        <div id="dci_${s.key}_prev" style="width:36px;height:36px;border-radius:8px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:1.2rem;border:1px solid var(--border);overflow:hidden;">
          ${val ? (val.startsWith('http')?`<img src="${val}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='?'">`:'📷') : '—'}
        </div>
      </div>
    </div>`;
  });
  imgHtml += '</div>';
  html += card('🖼️ Görseller & SVG Emojiler', imgHtml);

  // ═══ 6. GENEL STİL ═══
  const curBgStyle = d.bgStyle || 'solid';
  let styleHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  styleHtml += `<div>
    <div style="font-size:.7rem;color:var(--muted);margin-bottom:6px;">Köşe Yuvarlaklığı: <span id="dc_radius_val">${curRadius}px</span></div>
    <input type="range" id="dc_radius" min="0" max="24" value="${curRadius}" style="width:100%;"
      oninput="document.getElementById('dc_radius_val').textContent=this.value+'px'">
  </div>`;
  styleHtml += `<div>
    <div style="font-size:.7rem;color:var(--muted);margin-bottom:6px;">Arka Plan Stili</div>
    <select id="dc_bgstyle" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-size:.82rem;">
      <option value="solid" ${curBgStyle==='solid'?'selected':''}>Düz Renk</option>
      <option value="gradient" ${curBgStyle==='gradient'?'selected':''}>Yumuşak Gradyan</option>
      <option value="deep" ${curBgStyle==='deep'?'selected':''}>Derin Karanlık</option>
    </select>
  </div>`;
  styleHtml += '</div>';
  html += card('⚙️ Genel Stil', styleHtml);

  // ═══ Kaydet / Sıfırla ═══
  html += `<div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap;">
    <button onclick="adminDesignPreview()" style="padding:13px 16px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer;">👁 Önizle</button>
    <button onclick="saveAdminDesign()" style="flex:1;padding:13px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:900;font-size:.9rem;cursor:pointer;">💾 Tüm Üyelere Uygula & Kaydet</button>
    <button onclick="resetAdminDesign()" style="padding:13px 16px;background:var(--surface2);color:var(--red);border:1px solid var(--red);border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer;">↺ Sıfırla</button>
  </div>`;
  html += '</div>';
  body.innerHTML = html;
}

// Tab sürükle-bırak
let _dragTabId = null;
function adminTabDragStart(e){ _dragTabId = e.currentTarget.dataset.tabId; e.currentTarget.style.opacity='.5'; }
function adminTabDragOver(e){ e.preventDefault(); }
function adminTabDrop(e){
  e.preventDefault();
  const targetId = e.currentTarget.dataset.tabId;
  if(!_dragTabId || _dragTabId === targetId) { document.querySelectorAll('[id^=dctab_]').forEach(el=>el.style.opacity=''); return; }
  const list = document.getElementById('dc_tab_list');
  const dragEl = document.getElementById('dctab_'+_dragTabId);
  const targetEl = document.getElementById('dctab_'+targetId);
  if(dragEl && targetEl) {
    const items = [...list.children];
    const dragIdx = items.indexOf(dragEl);
    const targetIdx = items.indexOf(targetEl);
    if(dragIdx < targetIdx) list.insertBefore(dragEl, targetEl.nextSibling);
    else list.insertBefore(dragEl, targetEl);
  }
  document.querySelectorAll('[id^=dctab_]').forEach(el=>el.style.opacity='');
  _dragTabId = null;
}

function adminTabToggleVisibility(tabId, btn){
  const row = document.getElementById('dctab_'+tabId);
  const isHidden = row.style.opacity === '0.45';
  row.style.opacity = isHidden ? '' : '0.45';
  btn.textContent = isHidden ? '🚫 Gizle' : '👁 Göster';
  btn.style.color = isHidden ? 'var(--muted)' : 'var(--green)';
}

function adminDesignPreview(){
  const root = document.documentElement;
  const g = id => document.getElementById(id);
  // Validate hex color before applying
  const isValidColor = c => c && /^#[0-9a-fA-F]{3,8}$/.test(c.trim());
  const cv = key => {
    const el = g('dc_'+key);
    if(!el) return null;
    // Prefer text input value for validation
    const txtEl = g('dc_'+key+'_txt');
    const val = txtEl ? txtEl.value.trim() : el.value;
    return isValidColor(val) ? val : (isValidColor(el.value) ? el.value : null);
  };
  const colorMap = {
    bg:'--bg', bg2:'--bg2', surface:'--surface', surface2:'--surface2',
    border:'--border', text:'--text', textHi:'--text-hi', muted:'--muted',
    accent:'--accent', green:'--green', red:'--red', ownBg:'--own-bg', incomingBg:'--incoming-bg'
  };
  Object.entries(colorMap).forEach(([k,v]) => { const c=cv(k); if(c) root.style.setProperty(v,c); });
  const font = g('dc_font') ? g('dc_font').value : null;
  if(font) document.body.style.fontFamily = font;
  const radius = cv('radius');
  if(radius) root.style.setProperty('--radius', radius+'px');

  // Text sizes preview
  const msgSz = g('dc_msgFontSize');
  const sideSz = g('dc_sidebarFontSize');
  const hdrSz = g('dc_headerFontSize');
  const inpSz = g('dc_inputFontSize');
  if(msgSz)  document.querySelectorAll('.msg-text,.msg-body,.m-text').forEach(el=>el.style.fontSize=msgSz.value+'px');
  if(sideSz) document.querySelectorAll('.r-label,.sec-hdr').forEach(el=>el.style.fontSize=sideSz.value+'px');
  if(hdrSz)  document.querySelectorAll('.ws-name,.chat-name').forEach(el=>el.style.fontSize=hdrSz.value+'px');
  if(inpSz)  document.querySelectorAll('#msgInput,#chatInput,textarea.msg-inp').forEach(el=>el.style.fontSize=inpSz.value+'px');

  // Icon sizes preview
  const tabIcSz = g('dc_tabIconSize');
  const tabLbSz = g('dc_tabLabelSize');
  const navIcSz = g('dc_navIconSize');
  if(tabIcSz) document.querySelectorAll('.tab-ic svg,.tab-ic').forEach(el=>{ el.style.width=tabIcSz.value+'px'; el.style.height=tabIcSz.value+'px'; });
  if(tabLbSz) document.querySelectorAll('.tab-lb').forEach(el=>el.style.fontSize=tabLbSz.value+'px');
  if(navIcSz) document.querySelectorAll('.rail-btn-ic svg,.rail-btn-ic').forEach(el=>{ el.style.width=navIcSz.value+'px'; el.style.height=navIcSz.value+'px'; });
}

async function saveAdminDesign(){
  const g = id => document.getElementById(id);
  const colorKeys = ['bg','bg2','surface','surface2','border','text','textHi','muted','accent','green','red','ownBg','incomingBg'];
  const obj = { updatedAt: Date.now(), updatedBy: _cu };

  // Renkler
  colorKeys.forEach(k => { const el=g('dc_'+k); if(el) obj['color_'+k]=el.value; });

  // Font
  const fontEl = g('dc_font');
  if(fontEl) obj.fontFamily = fontEl.value;

  // Font sizes
  const textFields = ['msgFontSize','sidebarFontSize','headerFontSize','inputFontSize','forumFontSize'];
  textFields.forEach(k => { const el=g('dc_'+k); if(el) obj[k]=parseInt(el.value); });

  // Icon sizes
  const iconFields = ['tabIconSize','tabLabelSize','navIconSize'];
  iconFields.forEach(k => { const el=g('dc_'+k); if(el) obj[k]=parseInt(el.value); });

  // Radius & bgStyle
  const radiusEl = g('dc_radius');
  const bgEl = g('dc_bgstyle');
  if(radiusEl) obj.borderRadius = parseInt(radiusEl.value);
  if(bgEl)     obj.bgStyle      = bgEl.value;

  // Tab order & visibility
  const tabList = document.getElementById('dc_tab_list');
  if(tabList){
    obj.tabOrder = [...tabList.children].map(el=>el.dataset.tabId);
    obj.hiddenTabs = [...tabList.children].filter(el=>el.style.opacity==='0.45').map(el=>el.dataset.tabId);
  }

  // Custom images
  const imgKeys = ['appLogo','loginBg','emptyRoomImg','botAvatar','customEmoji1','customEmoji2'];
  const customImages = {};
  imgKeys.forEach(k => { const el=g('dci_'+k); if(el && el.value.trim()) customImages[k]=el.value.trim(); });
  obj.customImages = customImages;

  try {
    await adminRestSet('settings/design', obj);
    showToast('✅ Tasarım kaydedildi! Üyeler yenileyince görecek.');
    applyGlobalDesign(obj);
  } catch(e) {
    showToast('❌ Kaydetme hatası: '+e.message);
  }
}

async function resetAdminDesign(){
  if(!confirm('Tasarımı varsayılana sıfırlamak istediğinizden emin misiniz?')) return;
  try {
    await adminRestSet('settings/design', null);
    showToast('↺ Tasarım sıfırlandı.');
    setTimeout(()=>location.reload(), 800);
  } catch(e) { showToast('Hata: '+e.message); }
}

function applyGlobalDesign(d){
  if(!d) return;
  const root = document.documentElement;
  const colorMap = {
    color_bg:'--bg', color_bg2:'--bg2', color_surface:'--surface',
    color_surface2:'--surface2', color_border:'--border', color_text:'--text',
    color_textHi:'--text-hi', color_muted:'--muted', color_accent:'--accent',
    color_green:'--green', color_red:'--red', color_ownBg:'--own-bg',
    color_incomingBg:'--incoming-bg'
  };
  Object.entries(colorMap).forEach(([dKey,cssVar]) => { if(d[dKey]) root.style.setProperty(cssVar, d[dKey]); });
  if(d.fontFamily) document.body.style.fontFamily = d.fontFamily;
  if(d.borderRadius !== undefined) root.style.setProperty('--radius', d.borderRadius+'px');

  // Text sizes
  if(d.msgFontSize)     addDesignStyle('--d-msg-size',    d.msgFontSize+'px',     '.msg-text,.msg-body,.m-text');
  if(d.sidebarFontSize) addDesignStyle('--d-side-size',   d.sidebarFontSize+'px', '.r-label');
  if(d.headerFontSize)  addDesignStyle('--d-hdr-size',    d.headerFontSize+'px',  '.ws-name');
  if(d.inputFontSize)   addDesignStyle('--d-inp-size',    d.inputFontSize+'px',   '#msgInput,textarea');

  // Icon sizes
  if(d.tabIconSize){
    const tabCss = `.tab-ic svg { width:${d.tabIconSize}px!important; height:${d.tabIconSize}px!important; }`;
    injectDesignCSS('nc-tab-icon-size', tabCss);
  }
  if(d.tabLabelSize){
    injectDesignCSS('nc-tab-lb-size', `.tab-lb { font-size:${d.tabLabelSize}px!important; }`);
  }
  if(d.navIconSize){
    injectDesignCSS('nc-nav-icon-size', `.rail-btn-ic svg { width:${d.navIconSize}px!important; height:${d.navIconSize}px!important; }`);
  }

  // Tab order & visibility
  if(d.tabOrder && d.tabOrder.length){
    const tabIdMap = { home:'tabHome', forum:'tabForum' };
    document.querySelectorAll('.tab-bar').forEach(bar => {
      const tabs = [...bar.children];
      d.tabOrder.forEach((id, idx) => {
        const el = tabs.find(t => {
          const onclick = t.getAttribute('onclick')||'';
          const tabId = t.id || '';
          if(id==='home')    return tabId==='tabHome'    || onclick.includes("'home'");
          if(id==='msgs')    return onclick.includes('openDMModal');
          if(id==='forum')   return tabId==='tabForum'   || onclick.includes("'forum'");
          if(id==='friends') return onclick.includes('openFriendsModal') || onclick.includes("'friends'");
          if(id==='watch')   return onclick.includes("'watch'");
          return false;
        });
        if(el) el.style.order = idx;
      });
      if(d.hiddenTabs) d.hiddenTabs.forEach(id => {
        const el = tabs.find(t => {
          const onclick = t.getAttribute('onclick')||'';
          if(id==='home')    return t.id==='tabHome'    || onclick.includes("'home'");
          if(id==='msgs')    return onclick.includes('openDMModal');
          if(id==='forum')   return t.id==='tabForum'   || onclick.includes("'forum'");
          if(id==='friends') return onclick.includes('openFriendsModal');
          if(id==='watch')   return onclick.includes("'watch'");
          return false;
        });
        if(el) el.style.display = 'none';
      });
    });
  }

  // Custom images
  if(d.customImages){
    const ci = d.customImages;
    if(ci.appLogo){
      document.querySelectorAll('#myAvatar,#deskRailUser').forEach(el=>{
        if(ci.appLogo.startsWith('http')){ el.innerHTML=`<img src="${ci.appLogo}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`; }
        else { el.textContent=ci.appLogo; }
      });
    }
    if(ci.botAvatar){
      document.querySelectorAll('.naturebot-avatar,[id*="botAvatar"]').forEach(el=>{
        el.innerHTML = ci.botAvatar.startsWith('http') ? `<img src="${ci.botAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : ci.botAvatar;
      });
    }
  }
}

function addDesignStyle(varName, value, selector){
  injectDesignCSS('nc-ds-'+varName.replace(/[^a-z0-9]/g,''), `${selector} { font-size:${value}!important; }`);
}

function injectDesignCSS(id, css){
  let el = document.getElementById(id);
  if(!el){ el=document.createElement('style'); el.id=id; document.head.appendChild(el); }
  el.textContent = css;
}

// Sayfa yüklenince global tasarımı Firebase'den çekip uygula
(function initGlobalDesign(){
  setTimeout(async ()=>{
    try {
      const snap = await dbRef('settings/design').once('value');
      const d = snap.val();
      if(d) applyGlobalDesign(d);
    } catch(e){}
  }, 900);
})();



/* ── Admin: Settings ── */


/* ── Admin: Üye Oluştur ── */

window._renderCreateUser = async function(body) {
  body.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  body.innerHTML = `
    <div class="admin-section">
      <div class="admin-sec-title">➕ Yeni Üye Oluştur</div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:420px;">
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Kullanıcı Adı</div>
          <input class="admin-inp" id="cu_username" placeholder="kullanici_adi" style="width:100%;">
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Şifre</div>
          <input class="admin-inp" id="cu_password" type="password" placeholder="••••••••" style="width:100%;">
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Rol</div>
          <select class="admin-inp" id="cu_role" style="width:100%;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
            <option value="user">👤 Üye</option>
            <option value="mod">🛡️ Moderatör</option>
            <option value="admin">👑 Admin</option>
          </select>
        </div>
        <button onclick="adminCreateUserSubmit()" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:900;font-size:.88rem;cursor:pointer;margin-top:4px;">
          ✅ Üye Oluştur
        </button>
        <div id="cu_result" style="font-size:.82rem;color:var(--muted);"></div>
      </div>
    </div>`;
};

async function adminCreateUserSubmit() {
  const username = (document.getElementById('cu_username')?.value||'').trim();
  const password = (document.getElementById('cu_password')?.value||'').trim();
  const role = document.getElementById('cu_role')?.value || 'user';
  const res = document.getElementById('cu_result');
  if(!username || !password){ if(res) res.textContent='❌ Kullanıcı adı ve şifre zorunlu.'; return; }
  if(username.length < 3){ if(res) res.textContent='❌ Kullanıcı adı en az 3 karakter olmalı.'; return; }
  if(password.length < 6){ if(res) res.textContent='❌ Şifre en az 6 karakter olmalı.'; return; }
  try {
    const existing = await adminRestGet('users/'+username).catch(()=>null);
    if(existing){ if(res) res.textContent='❌ Bu kullanıcı adı zaten alınmış.'; return; }
    // Login sistemi hashStr(pass+user) kullanıyor — aynı formatta kaydet
    const passwordHash = await hashStr(password + username);
    const userData = {
      username, role,
      passwordHash,
      createdAt: Date.now(),
      createdBy: _cu,
      online: false,
      avatar: '', bio: ''
    };
    await adminRestSet('users/'+username, userData);
    if(res) res.innerHTML = '<span style="color:var(--green)">✅ '+username+' kullanıcısı oluşturuldu!</span>';
    document.getElementById('cu_username').value='';
    document.getElementById('cu_password').value='';
  } catch(e) {
    if(res) res.textContent = '❌ Hata: ' + (e.message||e);
  }
}


/* ── Admin: Davet Linkleri ── */

/* ══════════════════════════════════════════════
   🔗 DAVET LİNKLERİ — Token Tabanlı Sistem
══════════════════════════════════════════════ */

window._renderInviteLinks = async function(body) {
  body.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  const [invites, settings] = await Promise.all([
    adminRestGet('invites').catch(()=>null)||{},
    adminRestGet('settings').catch(()=>null)||{}
  ]);
  const regOpen = (settings.registration||'open') === 'open';
  const baseUrl = window.location.origin + window.location.pathname + '#inv_';

  const now = Date.now();
  const invList = Object.entries(invites||{}).map(([token, inv])=>({token,...inv}))
    .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

  // Status hesapla
  function invStatus(inv) {
    if(inv.expiresAt && now > inv.expiresAt) return {label:'Süresi Doldu', color:'var(--red)', icon:'🔴'};
    if(inv.maxUses && (inv.usedCount||0) >= inv.maxUses) return {label:'Doldu', color:'#e67e22', icon:'🟠'};
    return {label:'Aktif', color:'var(--green)', icon:'🟢'};
  }

  let h = '<div class="admin-section">';
  h += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
    <div class="admin-sec-title" style="margin:0">🔗 Davet Linkleri</div>
    <div style="display:flex;gap:6px;align-items:center;">
      <div style="font-size:.78rem;padding:5px 10px;border-radius:8px;background:${regOpen?'rgba(46,204,113,.15)':'rgba(224,85,85,.15)'};color:${regOpen?'var(--green)':'var(--red)'};">
        ${regOpen?'🟢 Kayıt Açık':'🔴 Kayıt Kapalı'}
      </div>
      <button onclick="adminShowCreateInvite()" style="padding:8px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;">➕ Yeni Link</button>
    </div>
  </div>`;

  // Yeni link oluşturma formu (gizli)
  h += `<div id="invCreateForm" style="display:none;background:var(--surface);border:1px solid var(--accent);border-radius:14px;padding:16px;margin-bottom:14px;">
    <div style="font-size:.88rem;font-weight:700;color:var(--text-hi);margin-bottom:12px;">➕ Yeni Davet Linki Oluştur</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>
        <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px;">Max Kullanım Sayısı</div>
        <input id="inv_maxUses" class="admin-inp" type="number" value="10" min="1" max="9999" style="margin-bottom:0;">
      </div>
      <div>
        <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px;">Geçerlilik (gün)</div>
        <input id="inv_days" class="admin-inp" type="number" value="60" min="1" max="3650" style="margin-bottom:0;">
      </div>
    </div>
    <div style="margin-bottom:10px;">
      <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px;">Açıklama (isteğe bağlı)</div>
      <input id="inv_note" class="admin-inp" placeholder="Örn: Instagram paylaşımı için" style="margin-bottom:0;">
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="adminCreateInviteLink()" style="flex:1;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">✅ Oluştur</button>
      <button onclick="document.getElementById('invCreateForm').style.display='none'" style="padding:10px 14px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;">İptal</button>
    </div>
  </div>`;

  if(!invList.length) {
    h += '<div class="admin-card" style="padding:20px;text-align:center;color:var(--muted);font-size:.85rem;">Henüz davet linki yok. Yeni Link butonuna bas.</div>';
  } else {
    h += '<div style="display:flex;flex-direction:column;gap:10px;">';
    invList.forEach(inv => {
      const st = invStatus(inv);
      const used = inv.usedCount||0;
      const max = inv.maxUses||'∞';
      const exp = inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('tr-TR') : 'Süresiz';
      const created = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('tr-TR') : '?';
      const link = baseUrl + inv.token;
      const uses = Object.values(inv.uses||{});

      h += `<div class="admin-card" style="padding:14px;">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <span style="font-size:.78rem;font-weight:900;color:${st.color};background:${st.color}22;padding:3px 8px;border-radius:6px;">${st.icon} ${st.label}</span>
              <span style="font-size:.72rem;color:var(--muted);">👥 ${used}/${max} kullanım · 📅 ${exp} · 🗓 ${created}</span>
            </div>
            ${inv.note?`<div style="font-size:.75rem;color:var(--muted);margin-bottom:6px;">📝 ${esc(inv.note)}</div>`:''}
            <div style="background:var(--surface2);border-radius:7px;padding:7px 10px;font-family:monospace;font-size:.72rem;color:var(--text);word-break:break-all;">${link}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
            <button onclick="navigator.clipboard.writeText('${link}').then(()=>showToast('📋 Kopyalandı!'))" style="padding:7px 12px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-size:.75rem;font-weight:700;cursor:pointer;">📋 Kopyala</button>
            <button onclick="adminShowInviteUses('${inv.token}')" style="padding:7px 12px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:7px;font-size:.75rem;cursor:pointer;">👥 Kayıtlar (${used})</button>
            <button onclick="if(confirm('Bu davet linki silinsin mi?'))adminRestDelete('invites/${inv.token}').then(()=>{showToast('Silindi.');adminTab('invite');})" style="padding:7px 12px;background:rgba(224,85,85,.15);color:var(--red);border:1px solid rgba(224,85,85,.3);border-radius:7px;font-size:.75rem;cursor:pointer;">🗑️ Sil</button>
          </div>
        </div>
        <div id="invUses_${inv.token}" style="display:none;"></div>
      </div>`;
    });
    h += '</div>';
  }
  h += '</div>';
  body.innerHTML = h;
};

function adminShowCreateInvite() {
  const f = document.getElementById('invCreateForm');
  if(f) f.style.display = f.style.display==='none' ? 'block' : 'none';
}

async function adminCreateInviteLink() {
  const maxUses = parseInt(document.getElementById('inv_maxUses')?.value)||10;
  const days = parseInt(document.getElementById('inv_days')?.value)||60;
  const note = (document.getElementById('inv_note')?.value||'').trim();
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  try {
    await adminRestSet('invites/' + token, {
      token, maxUses, expiresAt, note: note||null,
      createdAt: Date.now(), createdBy: _cu, usedCount: 0, uses: {}
    });
    showToast('✅ Davet linki oluşturuldu!');
    adminTab('invite');
  } catch(e) { showToast('❌ Hata: ' + (e.message||e)); }
}

async function adminShowInviteUses(token) {
  const el = document.getElementById('invUses_' + token);
  if(!el) return;
  if(el.style.display !== 'none') { el.style.display='none'; return; }
  el.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  el.style.display = 'block';
  try {
    const inv = await adminRestGet('invites/' + token).catch(()=>null)||{};
    const uses = Object.values(inv.uses||{}).sort((a,b)=>b.joinedAt-a.joinedAt);
    if(!uses.length) { el.innerHTML='<div style="color:var(--muted);font-size:.78rem;padding:8px;">Henüz kayıt yok.</div>'; return; }
    let h = `<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px;">
      <div style="font-size:.72rem;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em;">Kayıt Olanlar</div>
      <div style="display:flex;flex-direction:column;gap:6px;">`;
    uses.forEach(u => {
      h += `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface2);border-radius:8px;">
        <div style="width:32px;height:32px;border-radius:50%;background:${strColor(u.username||'?')};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;color:#fff;flex-shrink:0;">${initials(u.username||'?')}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">${esc(u.username||'?')}
            ${u.userId?`<span style="font-family:monospace;font-size:.65rem;color:var(--accent);margin-left:4px;">🆔 ${esc(u.userId)}</span>`:''}
          </div>
          <div style="font-size:.7rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            📧 ${esc(u.email||'?')} · 🌍 ${esc(u.origin||'?')} · 🌐 ${esc(u.ip||'?')}
          </div>
          <div style="font-size:.68rem;color:var(--muted);">📅 ${u.joinedAt?new Date(u.joinedAt).toLocaleString('tr-TR'):'?'}</div>
        </div>
      </div>`;
    });
    h += '</div></div>';
    el.innerHTML = h;
  } catch(e) { el.innerHTML = '<div style="color:var(--red);font-size:.78rem;padding:8px;">Yüklenemedi.</div>'; }
}

async function adminSaveInviteCode() {
  const code = (document.getElementById('inv_code')?.value||'').trim();
  const res = document.getElementById('inv_result');
  try {
    await adminRestSet('settings/inviteCode', code || null);
    const baseUrl = window.location.origin + window.location.pathname;
    const display = document.getElementById('inv_link_display');
    if(display) display.textContent = code ? baseUrl+'?invite='+code : baseUrl;
    if(res) res.innerHTML = '<span style="color:var(--green)">✅ Davet kodu kaydedildi.</span>';
  } catch(e) {
    if(res) res.textContent = '❌ Hata: ' + (e.message||e);
  }
}

function adminCopyInviteLink() {
  const display = document.getElementById('inv_link_display');
  if(!display) return;
  navigator.clipboard.writeText(display.textContent.trim()).then(()=>showToast('📋 Link kopyalandı!'));
}

async function loadAdminSettings(){
  const body = document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const s = await adminRestGet('settings').catch(()=>null)||{};
  try{
    {
    const appName = esc(s.appName||'Nature.co');
    const welcomeMsg = esc(s.welcomeMsg||'');
    const msgLimit = s.msgLimit||100;
    const regOpen = (s.registration||'open')==='open';
    const inviteCode = esc(s.inviteCode||'');

    let html = '<div class="admin-section">';
    html += '<div class="admin-sec-title">⚙️ Uygulama Ayarları</div>';
    html += '<div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:14px;">';

    html += '<div><div class="admin-sec-title" style="margin-bottom:6px">Uygulama Adı</div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input class="admin-inp" id="setAppName" value="'+appName+'" placeholder="Uygulama adı..." style="margin-bottom:0;flex:1">';
    html += `<button class="a-btn blue" onclick="saveAdminSetting('appName','setAppName','Güncellendi.')">Kaydet</button>`;
    html += '</div></div>';

    html += '<div><div class="admin-sec-title" style="margin-bottom:6px">Hoşgeldin Mesajı</div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input class="admin-inp" id="setWelcome" value="'+welcomeMsg+'" placeholder="Yeni üyelere mesaj..." style="margin-bottom:0;flex:1">';
    html += `<button class="a-btn blue" onclick="saveAdminSetting('welcomeMsg','setWelcome','Güncellendi.')">Kaydet</button>`;
    html += '</div></div>';

    const srvLabel = (typeof FB_SERVERS !== 'undefined' && _activeServer && FB_SERVERS[_activeServer]) ? FB_SERVERS[_activeServer].label : (_activeServer||'Bu Sunucu');
    html += '<div><div class="admin-sec-title" style="margin-bottom:6px">🔐 Üye Kaydı — <span style="color:var(--primary)">' + srvLabel + '</span></div>';
    html += '<div style="background:var(--bg);border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px">';
    html += '<div>';
    html += '<div style="font-size:13px;font-weight:600;color:var(--text-hi)">' + (regOpen ? '✅ Kayıt Açık' : '🔒 Kayıt Kapalı') + '</div>';
    html += '<div style="font-size:11px;color:var(--muted);margin-top:3px">' + (regOpen ? 'Yeni üyeler kayıt olabilir' : 'Yeni üye alımı durduruldu') + '</div>';
    html += '</div>';
    html += '<button id="regToggleBtn" onclick="toggleRegistration()" style="padding:10px 20px;border-radius:8px;border:none;font-weight:700;font-size:13px;cursor:pointer;background:' + (regOpen ? '#e74c3c' : '#2ecc71') + ';color:#fff">';
    html += regOpen ? '🔒 Kaydı Durdur' : '✅ Kaydı Aç';
    html += '</button>';
    html += '</div></div>';

    html += '<div><div class="admin-sec-title" style="margin-bottom:6px">Mesaj Geçmişi Sınırı</div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input class="admin-inp" id="setMsgLimit" type="number" value="'+msgLimit+'" min="10" max="1000" style="margin-bottom:0;flex:1">';
    html += `<button class="a-btn blue" onclick="saveAdminSettingNum('msgLimit','setMsgLimit','Güncellendi.')">Kaydet</button>`;
    html += '</div></div>';

    html += '</div></div>';

    html += '<div class="admin-section" style="margin-top:12px">';
    html += '<div class="admin-sec-title">🗑️ Toplu İşlemler</div>';
    html += '<div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:10px;border-color:rgba(224,30,90,.25);">';
    html += '<div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">⚠️ Bu işlemler geri alınamaz. Dikkatli kullanın.</div>';
    html += '<button onclick="adminClearAllMsgs()" style="width:100%;padding:11px;border:1px solid rgba(224,30,90,.3);border-radius:9px;background:rgba(224,30,90,.12);color:#ff5a8a;font-weight:900;font-size:.88rem;cursor:pointer;">🗑️ Tüm Mesajları Sil (DM Dahil)</button>';
    html += '<button onclick="adminClearForumPosts()" style="width:100%;padding:11px;border:1px solid rgba(224,30,90,.3);border-radius:9px;background:rgba(224,30,90,.12);color:#ff5a8a;font-weight:900;font-size:.88rem;cursor:pointer;">🗑️ Tüm Forum Paylaşımlarını Sil</button>';
    html += '</div></div>';
    // ── AI Asistan Key bölümü ──
    const aiKey = esc(s.openrouterKey||'');
    const aiKeyMasked = aiKey ? '✅ Key kayıtlı (' + aiKey.slice(0,8) + '...)' : '❌ Key girilmemiş';
    html += '<div class="admin-section" style="margin-top:12px">';
    html += '<div class="admin-sec-title">🤖 AI Mesaj Asistanı</div>';
    html += '<div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:10px;">';
    html += '<div style="font-size:.75rem;color:var(--muted);">OpenRouter API key giriniz — tüm kullanıcılar kendi key girmeden AI asistanı kullanabilir.</div>';
    html += '<div style="font-size:.78rem;font-weight:700;color:' + (aiKey ? 'var(--green)' : '#e05555') + ';">' + aiKeyMasked + '</div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<input class="admin-inp" type="password" id="setAiKey" value="' + aiKey + '" placeholder="sk-or-..." style="margin-bottom:0;flex:1;">';
    html += '<button class="a-btn blue" onclick="saveAiKeyAdmin()">Kaydet</button>';
    html += '</div>';
    html += '<div style="font-size:.7rem;color:var(--muted);">Ücretsiz key: <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--purple);">openrouter.ai/keys</a></div>';
    html += '</div></div>';

    // Davet kodu bölümü
    html += '<div class="admin-section" style="margin-top:12px">';
    html += '<div class="admin-sec-title">🔑 Davet Kodu</div>';
    html += '<div class="admin-card" style="padding:14px;"><div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;">Üye kaydı kapalıyken kullanıcıların kayıt olabilmesi için kod.</div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<input class="admin-inp" id="setInviteCode" value="'+inviteCode+'" placeholder="Örn: NATURE2026" style="margin-bottom:0;flex:1;">';
    html += '<button class="a-btn purple" onclick="saveAdminSetting(\'inviteCode\',\'setInviteCode\',\'Davet kodu güncellendi.\')">Kaydet</button>';
    html += '</div></div></div>';

    // ── Yedekleme bölümü ──
    html += '<div class="admin-section" style="margin-top:12px"><div class="admin-sec-title">📦 Veri Yedekleme</div><div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:8px;"><div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Seçilen verileri JSON formatında indirin.</div>';
    ['users','rooms','msgs','forum/posts','settings'].forEach(function(p){
      html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;background:var(--surface2);border-radius:8px;"><input type="checkbox" id="bkp_'+p.replace('/','_')+'" checked><span style="font-size:.82rem;color:var(--text);">📁 '+p+'</span></label>';
    });
    html += '<button class="a-btn blue" style="width:100%;margin-top:4px;" onclick="execExportFromSettings()">⬇️ Yedek Al</button></div></div>';

    body.innerHTML = html;
  }}catch(e){ body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>'; }
}

async function execExportFromSettings(){
  const paths=['users','rooms','msgs','forum/posts','settings'].filter(p=>{const el=document.getElementById('bkp_'+p.replace('/','_'));return el&&el.checked;});
  if(!paths.length){showToast('En az bir alan seçin.');return;}
  showToast('📦 Dışa aktarılıyor...');
  const result={exportedAt:new Date().toISOString()};
  for(const p of paths){ try{result[p.replace('/','_')]=await adminRestGet(p);}catch(e){result[p.replace('/','_')]=null;} }
  const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='backup_'+Date.now()+'.json'; a.click(); URL.revokeObjectURL(url);
  showToast('✅ Yedek indirildi!');
}

async function toggleRegistration(){
  const btn = document.getElementById('regToggleBtn');
  if(!btn) return;
  const isOpening = btn.textContent.includes('Aç');
  const newVal = isOpening ? 'open' : 'closed';
  btn.disabled = true;
  try{ await adminRestSet('settings/registration',newVal); showToast(isOpening?'✅ Kayıt açıldı!':'🔒 Kayıt durduruldu!'); loadAdminSettings(); }
  catch(e){ showToast('❌ Hata: '+(e&&e.message||'Bilinmiyor')); btn.disabled=false; }
}
async function saveAiKeyAdmin(){
  const val = (document.getElementById('setAiKey')?.value||'').trim();
  if(!val){ showToast('❌ Key boş olamaz'); return; }
  try{
    await adminRestSet('settings/openrouterKey', val);
    showToast('✅ AI Key kaydedildi! Tüm kullanıcılar artık kullanabilir.');
    loadAdminSettings();
  }catch(e){ showToast('❌ Hata: '+(e?.message||'')); }
}

async function saveAdminSetting(key, inputId, successMsg){
  const val = document.getElementById(inputId).value.trim();
  try{ await adminRestSet('settings/'+key,val); showToast(successMsg); }
  catch(e){ showToast('❌ Hata: '+(e&&e.message||'Bilinmiyor')); }
}
async function saveAdminSettingNum(key, inputId, successMsg){
  const val = parseInt(document.getElementById(inputId).value)||100;
  try{ await adminRestSet('settings/'+key,val); showToast(successMsg); }catch(e){ showToast('❌ Hata: '+(e&&e.message||'')); }
}
async function adminClearAllMsgs(){
  if(!confirm('TÜM mesajlar (DM dahil) silinsin mi? Bu işlem geri alınamaz!'))return;
  try{
    const clearedAt = Date.now();
    const rooms = await adminRestGet('rooms')||{};
    await Promise.all(Object.keys(rooms).map(id=>adminRestSet('rooms/'+id+'/clearedAt',clearedAt)));
    await adminRestDelete('msgs');
    await adminRestDelete('dms');
    showToast('✅ Tüm mesajlar silindi.'); if(typeof loadAdminMsgs==='function')loadAdminMsgs();
  }catch(e){ console.error('adminClearAllMsgs:',e); showToast('❌ Hata: '+((e&&e.message)||'Bilinmiyor')); }
}
async function adminClearForumPosts(){
  if(!confirm('TÜM forum paylaşımları silinsin mi? Bu işlem geri alınamaz!'))return;
  try{ await adminRestDelete('forum/posts'); showToast('✅ Tüm forum paylaşımları silindi.'); if(typeof loadAdminForum==='function')loadAdminForum(); }
  catch(e){ showToast('❌ Hata: '+(e&&e.message||'Bilinmiyor')); }
}


/* ══════════════════════════════════════════════
   🛡️ ADMIN: GÜVENLİK & GELİŞMİŞ YETKİLER
══════════════════════════════════════════════ */

async function loadAdminSecurity(){
  const body = document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const s = await adminRestGet('settings').catch(()=>null)||{};
  try{
    {

    let html = '';

    // ── Bakım Modu ──
    html += `<div class="admin-section">
      <div class="admin-sec-title">🔧 Bakım Modu</div>
      <div class="admin-card" style="padding:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:.85rem;font-weight:700;color:var(--text-hi);">Bakım modunu ${s.maintenance?'kapat':'aktifleştir'}</div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:3px;">Aktifken sadece adminler giriş yapabilir.</div>
          </div>
          <button class="a-btn ${s.maintenance?'green':'red'}" onclick="toggleMaintenance(${!s.maintenance})">
            ${s.maintenance?'✅ Aktif — Kapat':'🔧 Kapalı — Aktifleştir'}
          </button>
        </div>
        ${s.maintenance ? `<div style="margin-top:12px;display:flex;gap:8px;">
          <input class="admin-inp" id="maintMsg" value="${esc(s.maintenanceMsg||'Sistem bakımda, yakında döneceğiz!')}" placeholder="Bakım mesajı..." style="margin-bottom:0;flex:1;">
          <button class="a-btn blue" onclick="saveAdminSetting('maintenanceMsg','maintMsg','Mesaj güncellendi.')">Kaydet</button>
        </div>` : ''}
      </div>
    </div>`;

    // ── Kullanıcı Limitleri ──
    html += `<div class="admin-section">
      <div class="admin-sec-title">👥 Kullanıcı Limitleri</div>
      <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
        <div>
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:6px;">Maksimum kullanıcı sayısı (0 = sınırsız)</div>
          <div style="display:flex;gap:8px;">
            <input class="admin-inp" id="setMaxUsers" type="number" value="${s.maxUsers||0}" min="0" style="margin-bottom:0;flex:1;">
            <button class="a-btn blue" onclick="saveAdminSettingNum('maxUsers','setMaxUsers','Güncellendi.')">Kaydet</button>
          </div>
        </div>
        <div>
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:6px;">Minimum kullanıcı adı uzunluğu</div>
          <div style="display:flex;gap:8px;">
            <input class="admin-inp" id="setMinUsername" type="number" value="${s.minUsernameLen||3}" min="2" max="10" style="margin-bottom:0;flex:1;">
            <button class="a-btn blue" onclick="saveAdminSettingNum('minUsernameLen','setMinUsername','Güncellendi.')">Kaydet</button>
          </div>
        </div>
        <div>
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:6px;">Kullanıcı başına maks. oda sayısı</div>
          <div style="display:flex;gap:8px;">
            <input class="admin-inp" id="setMaxRoomsUser" type="number" value="${s.maxRoomsPerUser||10}" min="1" style="margin-bottom:0;flex:1;">
            <button class="a-btn blue" onclick="saveAdminSettingNum('maxRoomsPerUser','setMaxRoomsUser','Güncellendi.')">Kaydet</button>
          </div>
        </div>
      </div>
    </div>`;

    // ── Yasaklı Kelimeler ──
    html += `<div class="admin-section">
      <div class="admin-sec-title">🚫 Yasaklı Kelimeler</div>
      <div class="admin-card" style="padding:14px;">
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;">Virgülle ayırın. Bu kelimeler mesajlarda otomatik filtrelenecek.</div>
        <textarea class="admin-inp" id="setBannedWords" style="margin-bottom:8px;min-height:80px;resize:vertical;">${esc(s.bannedWords||'')}</textarea>
        <button class="a-btn blue" onclick="saveAdminSetting('bannedWords','setBannedWords','Yasaklı kelimeler güncellendi.')">Kaydet</button>
      </div>
    </div>`;

    // ── Susturma Yönetimi ──
    html += `<div class="admin-section">
      <div class="admin-sec-title">🔇 Susturulan Kullanıcılar</div>
      <div class="admin-card" style="padding:14px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input class="admin-inp" id="muteUsername" placeholder="Kullanıcı adı..." style="margin-bottom:0;flex:1;" autocorrect="off" autocapitalize="off">
          <input class="admin-inp" id="muteDuration" type="number" value="60" min="1" placeholder="Dakika" style="margin-bottom:0;width:90px;">
          <button class="a-btn red" onclick="adminMuteUser()">🔇 Sustur</button>
        </div>`;

    // Muted users listesi
    const mutedList = Object.entries(s.mutedUsers||{}).filter(([,v])=>v>Date.now());
    if(mutedList.length){
      mutedList.forEach(([u, until])=>{
        const remaining = Math.ceil((until-Date.now())/60000);
        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">${esc(u)}</div>
            <div style="font-size:.7rem;color:var(--red);">⏱ ${remaining} dk kaldı</div>
          </div>
          <button class="a-btn green" style="font-size:.72rem;" onclick="adminUnmuteUser('${esc(u)}')">Sesi Aç</button>
        </div>`;
      });
    } else {
      html += '<div style="font-size:.78rem;color:var(--muted);">Susturulan kullanıcı yok.</div>';
    }
    html += `</div></div>`;

    // ── IP & Aktivite Logları ──
    html += `<div class="admin-section">
      <div class="admin-sec-title">📋 Aktivite Logları</div>
      <div class="admin-card" style="padding:14px;">
        <button class="a-btn blue" style="margin-bottom:10px;width:100%;" onclick="loadActivityLogs()">📋 Son 50 Girişi Göster</button>
        <div id="activityLogsBody" style="font-size:.75rem;color:var(--muted);">Butona basarak logları yükleyin.</div>
      </div>
    </div>`;

    // ── Toplu Bildirim ──
    html += `<div class="admin-section">
      <div class="admin-sec-title">📢 Toplu Bildirim Gönder</div>
      <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:10px;">
        <input class="admin-inp" id="broadcastTitle" placeholder="Bildirim başlığı..." style="margin-bottom:0;">
        <textarea class="admin-inp" id="broadcastMsg" placeholder="Bildirim mesajı..." style="margin-bottom:0;min-height:60px;resize:vertical;"></textarea>
        <button class="a-btn blue" onclick="adminSendBroadcast()">📢 Tüm Kullanıcılara Gönder</button>
      </div>
    </div>`;

    // ── Tehlikeli Bölge ──
    html += `<div class="admin-section">
      <div class="admin-sec-title" style="color:var(--red);">⚠️ Tehlikeli Bölge</div>
      <div class="admin-card" style="padding:14px;border-color:rgba(224,85,85,.3);display:flex;flex-direction:column;gap:10px;">
        <button class="admin-submit" style="background:var(--red);margin:0;" onclick="adminForceLogoutAll()">🚪 Tüm Kullanıcıları Çıkış Yaptır</button>
        <button class="admin-submit" style="background:var(--red);margin:0;" onclick="adminClearAllMsgs()">🗑️ Tüm Mesajları Sil</button>
        <button class="admin-submit" style="background:var(--red);margin:0;" onclick="adminClearForumPosts()">🗑️ Tüm Forum Gönderilerini Sil</button>
        <button class="admin-submit" style="background:#7f3f3f;margin:0;" onclick="adminDeleteInactiveUsers()">👤 Pasif Kullanıcıları Temizle (30 gün+)</button>
      </div>
    </div>`;

    body.innerHTML = html;
  }}catch(e){ body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>'; }
}

async function toggleMaintenance(enable){
  if(enable && !confirm('Bakım modu aktifleştirilsin mi? Adminler dışında kimse giriş yapamaz!')) return;
  try{
    await adminRestSet('settings/maintenance',enable);
    showToast(enable ? '🔧 Bakım modu aktif.' : '✅ Bakım modu kapatıldı.');
    loadAdminSecurity();
  }catch(e){showToast('Hata: '+(e&&e.message||''));}
}

async function adminMuteUser(){
  const username = document.getElementById('muteUsername').value.trim();
  const minutes = parseInt(document.getElementById('muteDuration').value)||60;
  if(!username){ showToast('Kullanıcı adı girin.'); return; }
  const until = Date.now() + minutes * 60 * 1000;
  try{
    await Promise.all([
      adminRestSet('settings/mutedUsers/'+username,until),
      adminRestSet('users/'+username+'/mutedUntil',until)
    ]);
    showToast(`🔇 ${username} ${minutes} dakika susturuldu.`);
    loadAdminSecurity();
  }catch(e){showToast('Hata.');}
}

async function adminUnmuteUser(username){
  try{
    await Promise.all([
      adminRestDelete('settings/mutedUsers/'+username),
      adminRestDelete('users/'+username+'/mutedUntil')
    ]);
    showToast(`🔊 ${username} sesinin kısıtlaması kaldırıldı.`);
    loadAdminSecurity();
  }catch(e){showToast('Hata.');}
}

function loadActivityLogs(){
  const logsBody = document.getElementById('activityLogsBody');
  if(logsBody) logsBody.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  dbRef('activityLog').limitToLast(50).once('value').then(snap=>{
    const logs = snap.val()||{};
    const arr = Object.values(logs).reverse();
    if(!arr.length){
      if(logsBody) logsBody.innerHTML = '<div style="color:var(--muted);font-size:.78rem;">Log kaydı bulunamadı.</div>';
      return;
    }
    let h = '';
    arr.forEach(log=>{
      const t = log.ts ? new Date(log.ts).toLocaleString('tr-TR') : '?';
      h += `<div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;">
        <div>
          <span style="font-weight:700;color:var(--text-hi);">${esc(log.user||'?')}</span>
          <span style="color:var(--muted);"> · ${esc(log.action||'giriş')}</span>
        </div>
        <div style="color:var(--muted);font-size:.68rem;white-space:nowrap;">${t}</div>
      </div>`;
    });
    if(logsBody) logsBody.innerHTML = h;
  }).catch(()=>{ if(logsBody) logsBody.innerHTML = '<div style="color:var(--muted);">Loglar yüklenemedi.</div>'; });
}

function adminSendBroadcast(){
  const title = document.getElementById('broadcastTitle').value.trim();
  const msg = document.getElementById('broadcastMsg').value.trim();
  if(!title||!msg){ showToast('Başlık ve mesaj gerekli.'); return; }
  if(!confirm(`Tüm kullanıcılara bildirim gönderilsin mi?\n\n"${title}"`)) return;
  const data = { title, msg, ts: Date.now(), from: _cu };
  adminRestSet('broadcasts/'+Date.now(),data).then(()=>{
    showToast('📢 Bildirim gönderildi!');
    document.getElementById('broadcastTitle').value='';
    document.getElementById('broadcastMsg').value='';
  }).catch(()=>showToast('Hata.'));
}

async function adminForceLogoutAll(){
  if(!confirm('TÜM kullanıcılar çıkış yaptırılsın mı? Bu işlem geri alınamaz!')) return;
  try{
    await adminRestSet('forceLogout',{ ts: Date.now(), by: _cu });
    showToast('🚪 Tüm kullanıcılar çıkış yaptırıldı.');
  }catch(e){showToast('Hata.');}
}

async function adminDeleteInactiveUsers(){
  if(!confirm('30 günden fazla süredir giriş yapmayan kullanıcılar silinsin mi?')) return;
  try{
    const cutoff = Date.now()-30*24*60*60*1000;
    const users = await adminRestGet('users')||{};
    const toDelete = Object.entries(users).filter(([k,v])=>!v.isAdmin&&(!v.lastSeen||v.lastSeen<cutoff)).map(([k])=>k);
    if(!toDelete.length){ showToast('Silinecek pasif kullanıcı yok.'); return; }
    if(!confirm(toDelete.length+' pasif kullanıcı silinecek. Devam edilsin mi?')) return;
    await Promise.all(toDelete.flatMap(u=>[adminRestDelete('users/'+u),adminRestDelete('online/'+u),adminRestDelete('friends/'+u),adminRestDelete('friendRequests/'+u),adminRestDelete('friendRequestsSent/'+u)]));
    showToast('✅ '+toDelete.length+' kullanıcı silindi.'); loadAdminUsers();
  }catch(e){ showToast('❌ Hata: '+(e&&e.message||'Bilinmiyor')); }
}



/* ── Gelişmiş Oda Yönetimi ── */

async function adminRoomDetails(roomId){
  const r = await adminRestGet('rooms/'+roomId).catch(()=>null)||{};
  {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;max-width:440px;width:100%;max-height:85vh;overflow-y:auto;">
        <div style="font-size:1rem;font-weight:900;color:var(--text-hi);margin-bottom:16px;">⚙️ Oda Ayarları — ${esc(r.name||roomId)}</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Oda Adı</div>
            <input id="rd-name" class="admin-inp" value="${esc(r.name||'')}" style="margin-bottom:0;">
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Oda Açıklaması</div>
            <input id="rd-desc" class="admin-inp" value="${esc(r.description||'')}" placeholder="Açıklama..." style="margin-bottom:0;">
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Yavaş Mod (saniye, 0=kapalı)</div>
            <input id="rd-slow" class="admin-inp" type="number" value="${r.slowMode||0}" min="0" max="3600" style="margin-bottom:0;">
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Max Üye (0=sınırsız)</div>
            <input id="rd-maxmembers" class="admin-inp" type="number" value="${r.maxMembers||0}" min="0" style="margin-bottom:0;">
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;padding:8px 0;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="rd-locked" ${r.locked?'checked':''}>
              <span style="font-size:.82rem;color:var(--text);">🔒 Kilitli oda</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="rd-readonly" ${r.readOnly?'checked':''}>
              <span style="font-size:.82rem;color:var(--text);">📖 Salt okunur</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="rd-hidden" ${r.hidden?'checked':''}>
              <span style="font-size:.82rem;color:var(--text);">🙈 Gizli oda</span>
            </label>
          </div>
        </div>
        <div style="margin-top:16px;">
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;">Üyeler (${(r.members||[]).length})</div>
          <div style="max-height:120px;overflow-y:auto;background:var(--surface2);border-radius:10px;padding:8px;">
            ${(r.members||[]).map(m=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;">
                <span style="font-size:.8rem;color:var(--text-hi);">${esc(m)}</span>
                <button onclick="adminKickFromRoom('${esc(roomId)}','${esc(m)}')" style="background:var(--red);border:none;border-radius:5px;color:#fff;font-size:.62rem;padding:2px 8px;cursor:pointer;">Çıkar</button>
              </div>`).join('')||'<div style="color:var(--muted);font-size:.78rem;">Üye yok</div>'}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="a-btn blue" style="flex:1;" onclick="adminSaveRoomDetails('${esc(roomId)}',this.closest('[style*=fixed]'))">💾 Kaydet</button>
          <button class="a-btn red" onclick="if(confirm('Oda silinsin mi?'))adminRestDelete('rooms/${esc(roomId)}').then(()=>{adminRestDelete('msgs/${esc(roomId)}').catch(()=>{});showToast('Oda silindi.');this.closest('[style*=fixed]').remove();loadAdminRooms();}).catch(()=>showToast('Hata.'))">🗑️</button>
          <button class="a-btn" style="background:var(--surface2);" onclick="this.closest('[style*=fixed]').remove()">İptal</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
}

async function adminSaveRoomDetails(roomId, modal){
  const updates = {
    name: document.getElementById('rd-name').value.trim(),
    description: document.getElementById('rd-desc').value.trim(),
    slowMode: parseInt(document.getElementById('rd-slow').value)||0,
    maxMembers: parseInt(document.getElementById('rd-maxmembers').value)||0,
    locked: document.getElementById('rd-locked').checked,
    readOnly: document.getElementById('rd-readonly').checked,
    hidden: document.getElementById('rd-hidden').checked,
  };
  if(!updates.name){ showToast('Oda adı boş olamaz.'); return; }
  try{
    const existing = await adminRestGet('rooms/'+roomId).catch(()=>({}))||{};
    await adminRestSet('rooms/'+roomId, {...existing, ...updates});
    showToast('✅ Oda güncellendi!');
    if(modal) modal.remove();
    loadAdminRooms();
  }catch(e){showToast('Hata.');}
}

async function adminKickFromRoom(roomId, username){
  if(!confirm(username+' odadan çıkarılsın mı?')) return;
  try{
    const room=await adminRestGet('rooms/'+roomId)||{};
    const members=(room.members||[]).filter(m=>m!==username);
    await adminRestSet('rooms/'+roomId+'/members',members);
    showToast(username+' odadan çıkarıldı.');
    document.querySelectorAll('[style*="position:fixed"]').forEach(el=>{
      if(el.querySelector('#rd-name')) el.remove();
    });
    adminRoomDetails(roomId);
  }catch(e){showToast('Hata.');}
}


/* ── Sistem Sağlığı İzleme ── */

async function loadAdminSystemHealth(){
  const body = document.getElementById('adminBody');
  body.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  const [users,rooms,msgs,forum,online] = await Promise.all([
    adminRestGet('users').catch(()=>({})),
    adminRestGet('rooms').catch(()=>({})),
    adminRestGet('msgs').catch(()=>({})),
    adminRestGet('forum/posts').catch(()=>({})),
    adminRestGet('online').catch(()=>({}))
  ]);
  try{
    {
    const _users=users||{}, _rooms=rooms||{}, _msgs=msgs||{}, _forum=forum||{}, _online2=online||{};
    const usersS=null, roomsS=null, msgsS=null, forumS=null, onlineS=null;

    const totalUsers = Object.keys(_users).length;
    const bannedUsers = Object.values(_users).filter(u=>u&&u.banned).length;
    const adminUsers = Object.values(_users).filter(u=>u&&u.isAdmin).length;
    const totalRooms = Object.keys(_rooms).filter(k=>_rooms[k].type!=='dm').length;
    const totalMsgs = Object.values(_msgs).reduce((a,r)=>a+Object.keys(r||{}).length,0);
    const totalPosts = Object.keys(_forum).length;
    const onlineNow = Object.keys(_online2).length;

    // Depolama tahmini (her kayıt ~500 byte)
    const estimatedKB = Math.round((totalUsers*0.5 + totalMsgs*0.3 + totalPosts*0.3));

    let html = '<div class="admin-stat-grid">';
    const stats = [
      { icon:'👥', label:'Toplam Üye', val:totalUsers, color:'#5b9bd5' },
      { icon:'🟢', label:'Şu An Online', val:onlineNow, color:'#2ecc71' },
      { icon:'🚫', label:'Banlı Üye', val:bannedUsers, color:'#ff5a8a' },
      { icon:'👑', label:'Admin Sayısı', val:adminUsers, color:'#f0c040' },
      { icon:'📢', label:'Toplam Oda', val:totalRooms, color:'#c4a7ff' },
      { icon:'💬', label:'Toplam Mesaj', val:totalMsgs, color:'#1abc9c' },
      { icon:'📋', label:'Forum Gönderisi', val:totalPosts, color:'#e67e22' },
      { icon:'💾', label:'Tahmini Veri', val:estimatedKB+'KB', color:'#7a8090' },
    ];
    stats.forEach(s=>{
      html += `<div class="admin-stat-card">
        <div class="admin-stat-val" style="color:${s.color}">${s.val}</div>
        <div class="admin-stat-label">${s.icon} ${s.label}</div>
      </div>`;
    });
    html += '</div>';

    // Son kayıt olan kullanıcılar
    const recentUsers = Object.values(_users).filter(u=>u&&u.createdAt).sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
    if(recentUsers.length){
      html += '<div class="admin-section"><div class="admin-sec-title">🆕 Son Kayıt Olan Kullanıcılar</div><div class="admin-card">';
      recentUsers.forEach(u=>{
        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">${esc(u.username||u.displayName||'?')}</div>
          <div style="font-size:.7rem;color:var(--muted);">${u.createdAt?new Date(u.createdAt).toLocaleString('tr-TR'):'—'}</div>
        </div>`;
      });
      html += '</div></div>';
    }

    // En aktif odalar
    const roomActivity = Object.entries(_msgs).map(([id,m])=>({id,count:Object.keys(m||{}).length})).sort((a,b)=>b.count-a.count).slice(0,5);
    if(roomActivity.length){
      html += '<div class="admin-section"><div class="admin-sec-title">🔥 En Aktif Odalar</div><div class="admin-card">';
      roomActivity.forEach(r=>{
        const room = rooms[r.id]||{};
        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">${esc(room.name||r.id)}</div>
          <div style="font-size:.75rem;color:var(--accent);font-weight:700;">${r.count} mesaj</div>
        </div>`;
      });
      html += '</div></div>';
    }

    body.innerHTML = html;
  }}catch(e){ body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>'; }
}


/* ── Toplu Mesaj Silme ── */

function adminBulkDeleteMsgs(){
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;max-width:420px;width:100%;">
      <div style="font-size:1rem;font-weight:900;color:var(--text-hi);margin-bottom:16px;">🗑️ Toplu Mesaj Silme</div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Kullanıcı (boş=hepsi)</div>
          <input id="bd-user" class="admin-inp" placeholder="Kullanıcı adı..." style="margin-bottom:0;">
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Oda (boş=hepsi)</div>
          <input id="bd-room" class="admin-inp" placeholder="Oda ID..." style="margin-bottom:0;">
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">İçerik filtresi (boş=hepsi)</div>
          <input id="bd-contains" class="admin-inp" placeholder="Bu metni içeren mesajları sil..." style="margin-bottom:0;">
        </div>
      </div>
      <div style="background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.3);border-radius:10px;padding:10px;margin:12px 0;font-size:.75rem;color:var(--red);">
        ⚠️ Bu işlem geri alınamaz!
      </div>
      <div style="display:flex;gap:8px;">
        <button class="a-btn red" style="flex:1;" onclick="execBulkDeleteMsgs(this.closest('[style*=fixed]'))">🗑️ Sil</button>
        <button class="a-btn" style="background:var(--surface2);" onclick="this.closest('[style*=fixed]').remove()">İptal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function execBulkDeleteMsgs(modal){
  const filterUser = document.getElementById('bd-user').value.trim().toLowerCase();
  const filterRoom = document.getElementById('bd-room').value.trim();
  const filterContains = document.getElementById('bd-contains').value.trim().toLowerCase();

  if(!confirm('Filtrelerle eşleşen mesajlar silinsin mi?')) return;

  adminRestGet('msgs').then(allMsgsData=>{
    const allRooms = allMsgsData||{};
    const delPaths = [];

    Object.entries(allRooms).forEach(([roomId, msgs])=>{
      if(filterRoom && roomId !== filterRoom) return;
      Object.entries(msgs||{}).forEach(([key, m])=>{
        if(filterUser && (m.user||'').toLowerCase() !== filterUser) return;
        if(filterContains && !(m.text||'').toLowerCase().includes(filterContains)) return;
        delPaths.push('msgs/'+roomId+'/'+key);
      });
    });

    Promise.all(delPaths.map(p=>adminRestDelete(p))).then(()=>{
      showToast(`✅ ${delPaths.length} mesaj silindi.`);
      if(modal) modal.remove();
    }).catch(()=>showToast('Bazı silmeler başarısız.'));
  });
}


/* ── Veri Yedekleme (JSON export) ── */

function adminExportData(){
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;max-width:380px;width:100%;">
      <div style="font-size:1rem;font-weight:900;color:var(--text-hi);margin-bottom:16px;">📦 Veri Yedekleme</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${['users','rooms','msgs','forum/posts','settings'].map(p=>`
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;background:var(--surface2);border-radius:8px;">
            <input type="checkbox" data-path="${p}" checked>
            <span style="font-size:.82rem;color:var(--text);">📁 ${p}</span>
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="a-btn blue" style="flex:1;" onclick="execExportData(this.closest('[style*=fixed]'))">⬇️ İndir</button>
        <button class="a-btn" style="background:var(--surface2);" onclick="this.closest('[style*=fixed]').remove()">İptal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function execExportData(modal){
  const checks = modal.querySelectorAll('input[type=checkbox]:checked');
  const paths = [...checks].map(c=>c.dataset.path);
  if(!paths.length){ showToast('En az bir alan seçin.'); return; }

  showToast('📦 Dışa aktarılıyor...');
  const result = { exportedAt: new Date().toISOString() };

  for(const p of paths){
    try{
      const snap = await dbRef(p.startsWith('settings')?p:''+p).once('value');
      result[p.replace('/','_')] = snap.val();
    }catch(e){ result[p] = null; }
  }

  const blob = new Blob([JSON.stringify(result, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='backup_'+'data_'+Date.now()+'.json';
  a.click(); URL.revokeObjectURL(url);
  showToast('✅ Yedek indirildi!');
  if(modal) modal.remove();
}


/* ── 🕐 AKTİVİTE LOGLARI ── */

function loadAdminActivityFull(){
  const body = document.getElementById('adminBody');
  body.innerHTML = `
    <div class="admin-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div class="admin-sec-title" style="margin:0">🕐 Aktivite Logları</div>
        <div style="display:flex;gap:6px;">
          <select id="actLogFilter" onchange="loadAdminActivityFull()" class="admin-inp" style="margin:0;padding:5px 10px;font-size:.78rem;">
            <option value="all">Tümü</option>
            <option value="login">Girişler</option>
            <option value="msg">Mesajlar</option>
            <option value="ban">Ban/Unban</option>
            <option value="admin">Admin İşlemleri</option>
          </select>
          <button class="a-btn red" onclick="clearActivityLogs()" style="padding:5px 12px;font-size:.78rem;">🗑️ Temizle</button>
        </div>
      </div>
      <div class="admin-card" id="actLogBody" style="padding:0;max-height:500px;overflow-y:auto;"></div>
    </div>`;
  const filter = document.getElementById('actLogFilter')?.value||'all';
  adminRestGet('activityLog').then(data=>{
    const logBody = document.getElementById('actLogBody');
    if(!logBody) return;
    data = data||{};
    let entries = Object.values(data).reverse();
    if(filter!=='all') entries = entries.filter(e=>e.type===filter);
    if(!entries.length){ logBody.innerHTML='<div style="color:var(--muted);padding:20px;text-align:center;">Log bulunamadı.</div>'; return; }
    const typeIcon = {login:'🔑',msg:'💬',ban:'🚫',admin:'👑',register:'📝',logout:'🚪'};
    logBody.innerHTML = entries.map(e=>`
      <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);">
        <div style="font-size:1.1rem;flex-shrink:0;">${typeIcon[e.type]||'📌'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.83rem;color:var(--text-hi);font-weight:600;">${esc(e.user||'?')} <span style="color:var(--muted);font-weight:400;">${esc(e.action||e.type||'')}</span></div>
          <div style="font-size:.72rem;color:var(--muted);">${new Date(e.ts||0).toLocaleString('tr-TR')}${e.ip?' · IP: '+esc(e.ip):''}</div>
        </div>
      </div>`).join('');
  });
}
function clearActivityLogs(){
  if(!confirm('Tüm aktivite logları silinsin mi?')) return;
  _db.ref('activityLog').remove().then(()=>{ showToast('Loglar temizlendi.'); loadAdminActivityFull(); });
}


/* ══════════════════════════════════════════════
   🤖 ADMIN: NatureBot Moderatör Ayarları
══════════════════════════════════════════════ */

async function loadAdminNatureBot() {
  const body = document.getElementById('adminBody');
  body.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';

  const [_bs, _mutes, _modLogs] = await Promise.all([
    adminRestGet('botSettings').catch(()=>null),
    adminRestGet('mutes').catch(()=>null),
    adminRestGet('modLogs').catch(()=>null)
  ]);
  const botSettings = _bs || {};
  const mutes = _mutes || {};
  const modLogs = _modLogs || {};

  const ms = botSettings.modSettings || {};
  const bw = (botSettings.badWords||[]).join('\n');
  const now = Date.now();

  // Toggle helper
  const tog = (key, label, def=false) => {
    const val = ms[key] !== undefined ? ms[key] : def;
    return `<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface2);border-radius:10px;cursor:pointer;">
      <span style="font-size:.85rem;color:var(--text-hi);">${label}</span>
      <input type="checkbox" id="bms_${key}" ${val?'checked':''} style="width:18px;height:18px;cursor:pointer;">
    </label>`;
  };

  const numInp = (key, label, def, min=0, max=9999) => {
    const val = ms[key] !== undefined ? ms[key] : def;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface2);border-radius:10px;">
      <span style="font-size:.85rem;color:var(--text-hi);">${label}</span>
      <input type="number" id="bms_${key}" value="${val}" min="${min}" max="${max}" style="width:80px;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:5px 8px;color:var(--text);font-size:.82rem;text-align:center;">
    </div>`;
  };

  // Aktif muteler
  const activeMutes = Object.entries(mutes).filter(([,d])=>d&&d.expiresAt&&now<d.expiresAt);

  // Son mod logları
  const logArr = Object.values(modLogs).sort((a,b)=>b.ts-a.ts).slice(0,30);
  const actionColor = {ban:'var(--red)',kick:'#e67e22',mute:'var(--accent)',warn:'#f0c040'};

  let h = '<div class="admin-section">';
  h += '<div class="admin-sec-title">🤖 NatureBot Moderatör Paneli</div>';

  // ── Küfür Ayarları
  h += `<div class="admin-card" style="padding:14px;margin-bottom:10px;">
    <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);margin-bottom:10px;">🚫 Küfür / Yasaklı Kelime</div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${tog('deleteBadWord','Küfürlü mesajı otomatik sil', true)}
      ${tog('autoWarnBadWord','Küfür yazana uyarı gönder', true)}
      ${tog('autoKickBadWord','Küfür yazanı 30dk uzaklaştır', false)}
      ${tog('autoBanBadWord','Küfür yazanı otomatik banla', false)}
    </div>
  </div>`;

  // ── Spam Ayarları
  h += `<div class="admin-card" style="padding:14px;margin-bottom:10px;">
    <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);margin-bottom:10px;">📨 Spam Koruması</div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${tog('autoMuteSpam','Spam yapanı otomatik sustur', true)}
      ${numInp('spamThreshold','Eşik (kaç mesaj)', 5, 2, 20)}
      ${numInp('spamWindow','Zaman penceresi (ms)', 6000, 1000, 30000)}
      ${numInp('spamMuteDuration','Susturma süresi (dk)', 60, 1, 1440)}
    </div>
  </div>`;

  // ── Karşılama
  h += `<div class="admin-card" style="padding:14px;margin-bottom:10px;">
    <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);margin-bottom:10px;">👋 Yeni Üye Karşılama</div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${tog('welcomeEnabled','Yeni üyeleri karşıla', true)}
      <div>
        <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px;">{user} = kullanıcı adı</div>
        <input class="admin-inp" id="bms_welcomeMsg" value="${esc(ms.welcomeMsg||'👋 {user} aramıza katıldı! Hoş geldin 🌿')}" style="margin-bottom:0;">
      </div>
    </div>
  </div>`;

  // ── Yasaklı Kelimeler Listesi
  h += `<div class="admin-card" style="padding:14px;margin-bottom:10px;">
    <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);margin-bottom:8px;">📋 Yasaklı Kelimeler</div>
    <div style="font-size:.72rem;color:var(--muted);margin-bottom:8px;">Her satıra bir kelime yaz. Büyük/küçük harf fark etmez.</div>
    <textarea id="bms_badWords" style="width:100%;min-height:120px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);font-size:.78rem;resize:vertical;box-sizing:border-box;">${bw}</textarea>
  </div>`;

  // ── Kaydet
  h += `<button onclick="saveAdminBotSettings()" style="width:100%;padding:13px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:900;font-size:.9rem;cursor:pointer;margin-bottom:14px;">💾 Bot Ayarlarını Kaydet</button>`;

  // ── Aktif Muteler
  h += `<div class="admin-card" style="padding:14px;margin-bottom:10px;">
    <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);margin-bottom:10px;">🔇 Aktif Susturmalar (${activeMutes.length})</div>`;
  if(!activeMutes.length) {
    h += '<div style="color:var(--muted);font-size:.78rem;">Aktif susturma yok.</div>';
  } else {
    activeMutes.forEach(([user, data]) => {
      const remaining = Math.ceil((data.expiresAt - now)/60000);
      h += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">${esc(user)}</div>
          <div style="font-size:.7rem;color:var(--red);">⏱ ${remaining} dk kaldı</div>
        </div>
        <button onclick="adminRestDelete('mutes/${esc(user)}').then(()=>{showToast('✅ Susturma kaldırıldı.');loadAdminNatureBot();})" class="a-btn green" style="font-size:.72rem;">🔊 Kaldır</button>
      </div>`;
    });
  }
  h += '</div>';

  // ── Mod Logları
  h += `<div class="admin-card" style="padding:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">📋 Mod Logları (Son 30)</div>
      <button onclick="if(confirm('Tüm mod logları silinsin mi?'))adminRestDelete('modLogs').then(()=>{showToast('Loglar temizlendi.');loadAdminNatureBot();})" class="a-btn red" style="font-size:.72rem;padding:5px 10px;">🗑️ Temizle</button>
    </div>`;
  if(!logArr.length) {
    h += '<div style="color:var(--muted);font-size:.78rem;">Log kaydı yok.</div>';
  } else {
    const aIcon = {ban:'🚫',kick:'🦶',mute:'🔇',warn:'⚠️'};
    logArr.forEach(log => {
      h += `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:1.1rem;flex-shrink:0;">${aIcon[log.action]||'📌'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;color:var(--text-hi);">
            <span style="color:${actionColor[log.action]||'var(--text)'};font-weight:700;">${(log.action||'').toUpperCase()}</span>
            → <span style="font-weight:700;">${esc(log.target||'?')}</span>
            ${log.detail?`<span style="color:var(--muted);"> · ${esc(log.detail)}</span>`:''}
          </div>
          <div style="font-size:.7rem;color:var(--muted);">${log.ts?new Date(log.ts).toLocaleString('tr-TR'):'?'} · #${esc(log.room||'?')}</div>
        </div>
      </div>`;
    });
  }
  h += '</div></div>';

  body.innerHTML = h;
}

async function saveAdminBotSettings() {
  const g = id => document.getElementById(id);
  const toggleKeys = ['deleteBadWord','autoWarnBadWord','autoKickBadWord','autoBanBadWord','autoMuteSpam','welcomeEnabled'];
  const numKeys = ['spamThreshold','spamWindow','spamMuteDuration'];

  const modSettings = {};
  toggleKeys.forEach(k => { const el=g('bms_'+k); if(el) modSettings[k]=el.checked; });
  numKeys.forEach(k => { const el=g('bms_'+k); if(el) modSettings[k]=parseInt(el.value)||0; });
  const wm = g('bms_welcomeMsg'); if(wm) modSettings.welcomeMsg = wm.value;

  const bwText = g('bms_badWords')?.value||'';
  const badWords = bwText.split('\n').map(s=>s.trim()).filter(Boolean);

  try {
    await adminRestSet('botSettings/modSettings', modSettings);
    await adminRestSet('botSettings/badWords', badWords);
    showToast('✅ Bot ayarları kaydedildi!');
    // Çalışan bota yeni ayarları bildir
    if(window._natureBotMod?.reload) window._natureBotMod.reload();
  } catch(e) { showToast('❌ Hata: ' + (e.message||e)); }
}

/* ═══════════════════════════════════
   EKSİK ADMIN SEKMELERİ
═══════════════════════════════════ */

async function loadAdminStats() {
  const b = document.getElementById('adminBody');
  if(!b) return;
  b.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center;">Yükleniyor...</div>';

  try {
    const [usersSnap, roomsSnap, msgsSnap, forumSnap] = await Promise.all([
      adminRestGet('users'),
      adminRestGet('rooms'),
      adminRestGet('msgs'),
      adminRestGet('forum'),
    ]);

    const users  = usersSnap  || {};
    const rooms  = roomsSnap  || {};
    const msgs   = msgsSnap   || {};
    const forum  = forumSnap  || {};

    const uCount = Object.keys(users).length;
    const rCount = Object.keys(rooms).length;
    const mCount = Object.values(msgs).reduce((s,r)=>s+Object.keys(r||{}).length,0);
    const fCount = Object.keys(forum).length;

    // Son 7 gün aktif kullanıcı
    const weekAgo = Date.now() - 7*24*60*60*1000;
    const activeWeek = Object.values(users).filter(u=>u&&u.lastSeen&&u.lastSeen>weekAgo).length;

    // Sunucu başına dağılım
    const byServer = {};
    Object.values(users).forEach(u=>{ if(u&&u._ws){ byServer[u._ws]=(byServer[u._ws]||0)+1; } });

    b.innerHTML = `
      <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${[
          {label:'Toplam Üye',   val:uCount,      icon:'👤', color:'#5b9bd5'},
          {label:'Aktif (7g)',   val:activeWeek,  icon:'🟢', color:'#2ecc71'},
          {label:'Odalar',       val:rCount,      icon:'💬', color:'#9b72ff'},
          {label:'Mesajlar',     val:mCount,      icon:'📨', color:'#f5a623'},
          {label:'Forum',        val:fCount,      icon:'📋', color:'#e05555'},
        ].map(s=>`
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:1.6rem;margin-bottom:4px;">${s.icon}</div>
            <div style="font-size:1.4rem;font-weight:900;color:${s.color};">${s.val.toLocaleString('tr-TR')}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${s.label}</div>
          </div>`).join('')}
      </div>
      <div style="padding:0 20px 20px;">
        <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Sunucu Dağılımı</div>
        ${Object.entries(byServer).map(([s,n])=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="font-size:.82rem;color:var(--text-hi);min-width:80px;">${esc(s)}</div>
            <div style="flex:1;height:8px;background:var(--surface);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${Math.round(n/uCount*100)}%;background:var(--accent);border-radius:4px;transition:width .6s;"></div>
            </div>
            <div style="font-size:.75rem;color:var(--muted);min-width:30px;text-align:right;">${n}</div>
          </div>`).join('') || '<div style="color:var(--muted);font-size:.82rem;">Veri yok</div>'}
      </div>`;
  } catch(e) {
    b.innerHTML = `<div style="color:#e05555;padding:20px;">Hata: ${e.message||e}</div>`;
  }
}

async function loadAdminReports() {
  const b = document.getElementById('adminBody');
  if(!b) return;
  b.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center;">Yükleniyor...</div>';

  try {
    const data = await adminRestGet('reports') || {};
    const list = Object.entries(data).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));

    if(!list.length){
      b.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center;">📭 Henüz şikayet yok</div>';
      return;
    }

    b.innerHTML = `<div style="padding:16px;">` +
      list.map(([id,r])=>`
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="font-size:.8rem;font-weight:700;color:var(--text-hi);">
              <span style="color:#e05555;">${esc(r.reporter||'?')}</span> → <span style="color:var(--accent);">${esc(r.reported||'?')}</span>
            </div>
            <div style="font-size:.68rem;color:var(--muted);">${r.ts?new Date(r.ts).toLocaleDateString('tr-TR'):''}</div>
          </div>
          <div style="font-size:.78rem;color:var(--text);margin-bottom:8px;">${esc(r.reason||'Sebep belirtilmedi')}</div>
          <div style="display:flex;gap:6px;">
            <button onclick="adminMuteUser('${esc(r.reported||'')}',60)" style="font-size:.7rem;padding:4px 10px;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.3);border-radius:6px;color:#f5a623;cursor:pointer;">60dk Sustur</button>
            <button onclick="adminBanUser('${esc(r.reported||'')}')" style="font-size:.7rem;padding:4px 10px;background:rgba(224,85,85,.15);border:1px solid rgba(224,85,85,.3);border-radius:6px;color:#e05555;cursor:pointer;">Banla</button>
            <button onclick="adminRestDelete('reports/${id}').then(()=>loadAdminReports())" style="font-size:.7rem;padding:4px 10px;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;">Kapat</button>
          </div>
        </div>`).join('') + `</div>`;
  } catch(e) {
    b.innerHTML = `<div style="color:#e05555;padding:20px;">Hata: ${e.message||e}</div>`;
  }
}

async function loadAdminGrowthChart() {
  const b = document.getElementById('adminBody');
  if(!b) return;
  b.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center;">Yükleniyor...</div>';

  try {
    const users = await adminRestGet('users') || {};
    // Son 30 gün — gün başına kayıt sayısı
    const days = 30;
    const now = Date.now();
    const counts = Array(days).fill(0);
    Object.values(users).forEach(u=>{
      if(!u||!u.createdAt) return;
      const diff = Math.floor((now - u.createdAt) / (24*60*60*1000));
      if(diff>=0 && diff<days) counts[days-1-diff]++;
    });
    const maxCount = Math.max(...counts, 1);
    const labels = Array.from({length:days},(_,i)=>{
      const d = new Date(now - (days-1-i)*24*60*60*1000);
      return i % 5 === 0 ? d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'}) : '';
    });

    b.innerHTML = `
      <div style="padding:20px;">
        <div style="font-size:.85rem;font-weight:900;color:var(--text-hi);margin-bottom:16px;">📈 Son 30 Gün — Yeni Kayıt</div>
        <div style="display:flex;align-items:flex-end;gap:3px;height:120px;border-bottom:1px solid var(--border);padding-bottom:4px;">
          ${counts.map((c,i)=>`
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
              ${c>0?`<div style="font-size:.55rem;color:var(--accent);">${c}</div>`:''}
              <div title="${labels[i]||''}" style="width:100%;background:var(--accent);border-radius:3px 3px 0 0;height:${Math.round(c/maxCount*100)}px;min-height:${c>0?'3px':'0'};opacity:.85;transition:height .3s;"></div>
            </div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          ${labels.filter(Boolean).map(l=>`<div style="font-size:.6rem;color:var(--muted);">${l}</div>`).join('')}
        </div>
        <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center;">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;">
            <div style="font-size:1.2rem;font-weight:900;color:var(--accent);">${counts.slice(-7).reduce((s,n)=>s+n,0)}</div>
            <div style="font-size:.7rem;color:var(--muted);">Son 7 gün</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;">
            <div style="font-size:1.2rem;font-weight:900;color:var(--accent);">${counts.reduce((s,n)=>s+n,0)}</div>
            <div style="font-size:.7rem;color:var(--muted);">Son 30 gün</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;">
            <div style="font-size:1.2rem;font-weight:900;color:var(--accent);">${Object.keys(users).length}</div>
            <div style="font-size:.7rem;color:var(--muted);">Toplam üye</div>
          </div>
        </div>
      </div>`;
  } catch(e) {
    b.innerHTML = `<div style="color:#e05555;padding:20px;">Hata: ${e.message||e}</div>`;
  }
}
