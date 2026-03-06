/* Nature.co — profile.js */
/* Otomatik bölümlendi */

/* ── Avatar ── */

function renderMyAvatar(){
  // Tüm kendi avatar elementlerini güncelle
  const ids = ['myAvatar','forumAvatar'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el||!_cu) return;
    el.innerHTML='<div class="sdot"></div>';
    setAvatar(el,_cu);
    if(!el.querySelector('.sdot')){const d=document.createElement('div');d.className='sdot';el.appendChild(d);}
  });
  // Desktop rail user
  const railUser=document.getElementById('deskRailUser');
  if(railUser&&_cu){
    railUser.innerHTML='<div class="sdot"></div>';
    setAvatar(railUser,_cu);
    if(!railUser.querySelector('.sdot')){const d=document.createElement('div');d.className='sdot';railUser.appendChild(d);}
  }
}


/* ── Kullanıcı Profil Düzenleme ── */

async function adminEditUserProfile(username) {
  const u = await adminRestGet('users/'+username).catch(()=>null)||{};
  {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;max-width:420px;width:100%;max-height:85vh;overflow-y:auto;">
        <div style="font-size:1rem;font-weight:900;color:var(--text-hi);margin-bottom:16px;">✏️ Profil Düzenle — ${esc(username)}</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Görünen Ad</div>
            <input id="ep-displayName" class="admin-inp" value="${esc(u.displayName||username)}" style="margin-bottom:0;">
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Biyografi</div>
            <textarea id="ep-bio" class="admin-inp" style="margin-bottom:0;min-height:60px;resize:vertical;">${esc(u.bio||'')}</textarea>
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Rozet / Unvan</div>
            <input id="ep-badge" class="admin-inp" value="${esc(u.badge||'')}" placeholder="örn: ⭐ VIP" style="margin-bottom:0;">
          </div>
          <div>
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Yeni Şifre (boş = değiştirme)</div>
            <input id="ep-password" class="admin-inp" type="password" placeholder="Yeni şifre..." style="margin-bottom:0;">
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="ep-verified" ${u.verified?'checked':''}>
              <span style="font-size:.82rem;color:var(--text);">✅ Doğrulanmış hesap</span>
            </label>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="ep-vip" ${u.isVip?'checked':''}>
              <span style="font-size:.82rem;color:var(--text);">👑 VIP kullanıcı</span>
            </label>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:18px;">
          <button class="a-btn blue" style="flex:1;" onclick="adminSaveUserProfile('${esc(username)}',this.closest('[style*=fixed]'))">💾 Kaydet</button>
          <button class="a-btn" style="flex:1;background:var(--surface2);" onclick="this.closest('[style*=fixed]').remove()">İptal</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
}

async function adminSaveUserProfile(username, modal) {
  const displayName = document.getElementById('ep-displayName').value.trim();
  const bio = document.getElementById('ep-bio').value.trim();
  const badge = document.getElementById('ep-badge').value.trim();
  const newPass = document.getElementById('ep-password').value.trim();
  const verified = document.getElementById('ep-verified').checked;
  const isVip = document.getElementById('ep-vip').checked;

  const updates = { displayName: displayName||username, bio, badge, verified, isVip };

  if(newPass){
    if(newPass.length < 6){ showToast('Şifre min 6 karakter.'); return; }
    updates.passwordHash = await hashStr(username + ':' + newPass);
  }

  try{
    // update: get existing and merge
    const existing = await adminRestGet('users/'+username).catch(()=>({}))||{};
    await adminRestSet('users/'+username, {...existing, ...updates});
    showToast('✅ Profil güncellendi!');
    if(modal) modal.remove();
    loadAdminUsers();
  }catch(e){showToast('Hata oluştu.');}
}


/* ── Kullanıcı Mesaj Geçmişi ── */

function adminViewUserMessages(username){
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;max-width:500px;width:100%;max-height:80vh;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-size:.95rem;font-weight:900;color:var(--text-hi);">💬 ${esc(username)} — Mesaj Geçmişi</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.3rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div id="userMsgHistory" style="flex:1;overflow-y:auto;font-size:.8rem;">
        <div class="ld"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Tüm odalardaki mesajları tara
  adminRestGet('msgs').then(msgsData=>{
    const allRooms = msgsData||{};
    const userMsgs = [];
    Object.entries(allRooms).forEach(([roomId, msgs])=>{
      Object.entries(msgs||{}).forEach(([key, m])=>{
        if(m.user === username) userMsgs.push({...m, roomId, key});
      });
    });
    userMsgs.sort((a,b)=>b.ts-a.ts);
    const el = document.getElementById('userMsgHistory');
    if(!el) return;
    if(!userMsgs.length){ el.innerHTML='<div style="color:var(--muted);text-align:center;padding:20px;">Mesaj bulunamadı.</div>'; return; }
    el.innerHTML = userMsgs.slice(0,100).map(m=>`
      <div style="padding:8px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-size:.7rem;color:var(--accent);margin-bottom:2px;">#${esc(m.roomId)}</div>
          <div style="color:var(--text);">${esc(m.text||'[dosya/gif]').slice(0,200)}</div>
        </div>
        <div style="flex-shrink:0;text-align:right;">
          <div style="font-size:.65rem;color:var(--muted);">${new Date(m.ts||0).toLocaleString('tr-TR')}</div>
          <button onclick="adminRestDelete('msgs/'+this.dataset.room+'/'+this.dataset.key).then(()=>{this.closest('div[style*=padding]').remove();showToast('Silindi.');}).catch(()=>showToast('Hata.'))"
            data-room="${esc(m.roomId)}" data-key="${esc(m.key)}"
            style="margin-top:4px;background:var(--red);border:none;border-radius:5px;color:#fff;font-size:.62rem;padding:2px 7px;cursor:pointer;">Sil</button>
        </div>
      </div>`).join('');
  });
}


/* ── Kullanıcı Detay Popup ── */

async function adminUserDetails(username){
  const u = await adminRestGet('users/'+username).catch(()=>null)||{};
  {
    const isOnline = !!_online[username];
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;max-width:400px;width:100%;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
          <div style="width:56px;height:56px;border-radius:14px;background:${strColor(username)};display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:900;color:#fff;">${username.slice(0,2).toUpperCase()}</div>
          <div>
            <div style="font-size:1rem;font-weight:900;color:var(--text-hi);">${esc(u.displayName||username)}</div>
            <div style="font-size:.75rem;color:${isOnline?'#2ecc71':'var(--muted)'};">${isOnline?'🟢 Çevrimiçi':'⚫ Çevrimdışı'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.78rem;margin-bottom:16px;">
          <div style="background:var(--surface2);border-radius:10px;padding:10px;">
            <div style="color:var(--muted);margin-bottom:2px;">Kayıt Tarihi</div>
            <div style="color:var(--text-hi);font-weight:700;">${u.createdAt?new Date(u.createdAt).toLocaleDateString('tr-TR'):'Bilinmiyor'}</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:10px;">
            <div style="color:var(--muted);margin-bottom:2px;">Son Giriş</div>
            <div style="color:var(--text-hi);font-weight:700;">${u.lastSeen?new Date(u.lastSeen).toLocaleDateString('tr-TR'):'Bilinmiyor'}</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:10px;">
            <div style="color:var(--muted);margin-bottom:2px;">Workspace</div>
            <div style="color:var(--text-hi);font-weight:700;">${esc(u.workspace||'—')}</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:10px;">
            <div style="color:var(--muted);margin-bottom:2px;">Kayıt Kaynağı</div>
            <div style="color:var(--text-hi);font-weight:700;">${esc(u.origin||'—')}</div>
          </div>
          ${u.bio?`<div style="background:var(--surface2);border-radius:10px;padding:10px;grid-column:1/-1;">
            <div style="color:var(--muted);margin-bottom:2px;">Biyografi</div>
            <div style="color:var(--text-hi);">${esc(u.bio)}</div>
          </div>`:''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button class="a-btn blue" onclick="adminEditUserProfile('${esc(username)}');this.closest('[style*=fixed]').remove()">✏️ Düzenle</button>
          <button class="a-btn" style="background:var(--surface2);" onclick="adminViewUserMessages('${esc(username)}');this.closest('[style*=fixed]').remove()">💬 Mesajlar</button>
          <button class="a-btn" style="background:var(--surface2);" onclick="this.closest('[style*=fixed]').remove()">Kapat</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
}


/* ── Avatar Cache & Helper ── */

const _avatarCache={};
function setAvatar(el,username,size){
  if(!el||!username) return;
  // Default initials
  el.textContent=initials(username);
  el.style.background=strColor(username);
  el.style.backgroundImage='';
  el.style.backgroundSize='';
  el.style.color='';
  // Check cache
  if(_avatarCache[username]){
    _applyAvatarPhoto(el,_avatarCache[username]);
    return;
  }
  // Fetch from Firebase
  if(_db) dbRef('users/'+username+'/photoURL').once('value').then(s=>{
    const url=s.val();
    if(url){_avatarCache[username]=url;_applyAvatarPhoto(el,url);}
  }).catch(()=>{});
}
function _applyAvatarPhoto(el,url){
  el.textContent='';
  el.style.backgroundImage='url('+url+')';
  el.style.backgroundSize='cover';
  el.style.backgroundPosition='center';
  el.style.color='transparent';
}
function invalidateAvatarCache(username){delete _avatarCache[username];}

function fmtTime(ts){const d=new Date(ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}
function formatDate(d){const now=new Date();if(d.toDateString()===now.toDateString())return 'Bugün';const y=new Date(now);y.setDate(now.getDate()-1);if(d.toDateString()===y.toDateString())return 'Dün';return d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'});}
function fmtSize(b){if(b>1024*1024)return(b/1024/1024).toFixed(1)+' MB';if(b>1024)return(b/1024).toFixed(0)+' KB';return b+' B';}
function getYTId(url){
  const m=url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?m[1]:null;
}
function getSpotifyEmbed(url){
  const m=url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  return m?`https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`:null;
}
function getSoundCloudEmbed(url){
  return url.includes('soundcloud.com')?`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%235b9bd5&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`:null;
}
function linkify(s){
  return s.replace(/(https?:\/\/[^\s<>"']+)/g, function(url){ url=url.replace(/[<>"']/g,''); if(!/^https?:\/\//i.test(url)) return esc(url);
    // YouTube — sadece embed göster, link gösterme
    const ytId = getYTId(url);
    if(ytId){
      return `<div class="media-embed"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy"></iframe></div>`;
    }
    // Spotify — sadece embed göster
    const spUrl = getSpotifyEmbed(url);
    if(spUrl){
      return `<div class="media-embed"><iframe src="${spUrl}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:10px;height:152px;"></iframe></div>`;
    }
    // SoundCloud — sadece embed göster
    const scUrl = getSoundCloudEmbed(url);
    if(scUrl){
      return `<div class="media-embed"><iframe src="${scUrl}" style="height:120px;" allow="autoplay" loading="lazy"></iframe></div>`;
    }
    // Normal link
    return `<a href="${url}" target="_blank">${url}</a>`;
  });
}


/* ── Profil Rozet Sistemi ── */

function updateProfileBadges(msgCount){
  const box=document.getElementById('profBadgesRow');
  if(!box) return;
  const badges=[];
  if(msgCount>=1) badges.push({icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,label:'İlk Mesaj',color:'rgba(245,158,11,.2)',border:'rgba(245,158,11,.4)',text:'#f59e0b'});
  if(msgCount>=100) badges.push({icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,label:'100 Mesaj',color:'rgba(91,155,213,.2)',border:'rgba(91,155,213,.4)',text:'#5b9bd5'});
  if(msgCount>=500) badges.push({icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 0 1-7 7 7 7 0 0 1-7-7c0-1.53.4-2.97 1-4.17C6 10 6.5 11 7 12.5c.5 1.5.5 2.5 1.5 2z"/></svg>`,label:'500 Mesaj',color:'rgba(239,68,68,.2)',border:'rgba(239,68,68,.4)',text:'#ef4444'});
  if(_isAdmin) badges.push({icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M5 20V8l7-5 7 5v12"/><path d="M12 3v5M5 8l7 4 7-4"/></svg>`,label:'Admin',color:'rgba(245,158,11,.2)',border:'rgba(245,158,11,.5)',text:'#f59e0b'});
  box.innerHTML=badges.map(b=>`<span title="${b.label}" style="background:${b.color};border:1px solid ${b.border};color:${b.text};font-size:.65rem;font-weight:700;padding:3px 9px;border-radius:100px;display:flex;align-items:center;gap:3px;">${b.icon} ${b.label}</span>`).join('');
}


/* ── 13. PROFİL SAYFASI — kullanıcı adı label ── */

/* Profile init — artık config.js switchMainTab içinde yönetiliyor */

