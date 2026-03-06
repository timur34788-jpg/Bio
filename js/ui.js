/* Nature.co — ui.js */
/* Otomatik bölümlendi */

/* ── Open/Close ── */

function openFriendsModal(){ switchMainTab('friends'); }
function closeFriendsModal(){ switchMainTab('home'); }
function openAddFriendTab(){ switchMainTab('friends'); switchFrTab(3); }


/* ── Keyboard / Back ── */

// visualViewport resize: sadece klavye kapanınca scroll et (zıplama önlendi)
window.visualViewport&&window.visualViewport.addEventListener('resize',()=>{
  var cs=document.getElementById('chatScreen');
  if(!cs||!cs.classList.contains('active'))return;
  var viewH=window.visualViewport.height;
  var winH=window.screen.height;
  var keyboardOpen=viewH<winH*0.75;
  // Sadece klavye kapanınca (büyüdüğünde) scroll et
  if(!keyboardOpen) setTimeout(scrollBottom,150);
});


/* ── CSS Enjeksiyonu ── */

(function injectGameCSS(){
  const s = document.createElement('style');
  s.textContent = `
.games-container{display:flex;flex-direction:column;height:100%;overflow:hidden;}
.games-cat-bar{display:flex;gap:6px;overflow-x:auto;padding:12px 16px 8px;flex-shrink:0;scrollbar-width:none;}
.games-cat-bar::-webkit-scrollbar{display:none;}
.games-cat-btn{flex-shrink:0;padding:6px 14px;border-radius:20px;font-size:.78rem;font-weight:700;cursor:pointer;border:1.5px solid var(--border);background:var(--surface2);color:var(--muted);transition:all .15s;}
.games-cat-btn.act{background:var(--accent);border-color:var(--accent);color:#fff;}
.games-scroll{flex:1;overflow-y:auto;padding:0 12px 16px;}
.games-section-title{font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 4px 8px;}
.games-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:4px;}
.game-item{display:flex;flex-direction:column;cursor:pointer;}
.game-item:hover .game-thumb{transform:scale(1.05);}
.game-thumb{border-radius:18px;overflow:hidden;transition:transform .18s;position:relative;aspect-ratio:1;box-shadow:0 4px 14px rgba(0,0,0,.35);}
.game-thumb-bg{position:absolute;inset:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2.8rem;z-index:1;}
.game-thumb-name{font-size:.68rem;font-weight:700;color:var(--text);margin-top:5px;text-align:center;padding:0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.game-thumb-age{position:absolute;bottom:6px;left:6px;background:#22c55e;color:#fff;font-size:.58rem;font-weight:900;border-radius:50px;padding:2px 7px;z-index:3;box-shadow:0 1px 5px rgba(0,0,0,.45);letter-spacing:.02em;}
.game-fullscreen{position:fixed;inset:0;background:#000;z-index:999999;display:flex;flex-direction:column;}
.game-fullscreen-bar{height:44px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;padding:0 14px;flex-shrink:0;}
.game-fullscreen-title{font-size:.9rem;font-weight:800;color:var(--text-hi);flex:1;}
.game-fullscreen-close{background:rgba(255,255,255,.1);border:none;border-radius:8px;color:#fff;font-size:.78rem;font-weight:700;padding:6px 12px;cursor:pointer;}
.game-fullscreen iframe{flex:1;border:none;width:100%;background:#000;}
/* Invite notif badge */
.notif-pill{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;background:#e74c3c;border-radius:8px;font-size:.62rem;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 3px;}
  `;
  document.head.appendChild(s);
})();


/* ══════════════════════════════════════════════════
   YENİ ÖZELLİKLER JS
══════════════════════════════════════════════════ */



/* ── Yazı Boyutu ── */

function setFontSize(size){
  const sizes={small:'13px',medium:'15px',large:'17px'};
  const px=sizes[size]||'15px';
  document.documentElement.style.setProperty('--base-font-size',px);
  document.getElementById('chatMsgs')&&(document.getElementById('chatMsgs').style.fontSize=px);
  document.querySelectorAll('.mb-text,.ob').forEach(el=>el.style.fontSize=px);
  ['small','medium','large'].forEach(s=>{
    const el=document.getElementById('fs-'+s);
    if(!el) return;
    if(s===size){el.style.background='var(--accent)';el.style.borderColor='var(--accent)';el.querySelector('div').style.color='#fff';}
    else{el.style.background='var(--surface)';el.style.borderColor='var(--border)';el.querySelector('div').style.color='var(--text-hi)';}
  });
  try{localStorage.setItem('fontSize',size);}catch(e){}
}
function loadFontSize(){
  try{const s=localStorage.getItem('fontSize');if(s)setFontSize(s);}catch(e){}
}


/* ── Kompakt Mod ── */

let _compactMode=false;
function toggleCompactMode(){
  _compactMode=!_compactMode;
  const toggle=document.getElementById('compactModeToggle');
  const knob=document.getElementById('compactModeKnob');
  if(toggle) toggle.style.background=_compactMode?'var(--accent)':'var(--surface2)';
  if(knob) knob.style.transform=_compactMode?'translateX(18px)':'translateX(0)';
  document.querySelectorAll('.mb.first').forEach(el=>{el.style.marginTop=_compactMode?'4px':'10px';});
  document.querySelectorAll('.mb').forEach(el=>{el.style.paddingTop=_compactMode?'1px':'3px';});
  try{localStorage.setItem('compactMode',_compactMode?'1':'0');}catch(e){}
}
function loadCompactMode(){
  try{if(localStorage.getItem('compactMode')==='1') toggleCompactMode();}catch(e){}
}


/* ══ UI STİL SİSTEMİ ══ */

const UI_STYLES = [
  {
    id: 'default',
    label: '⚙️ Varsayılan',
    desc: 'Klasik stil',
    preview: { sidebar:'#2c3038', chat:'#141618', bubbleIn:'#252830', bubbleOut:'#2a4a7a' }
  },
  {
    id: 'glass',
    label: '🌌 Glass/Aurora',
    desc: 'Uzay & Glassmorphism',
    preview: { sidebar:'#0f0c29', chat:'#0d0b20', bubbleIn:'rgba(255,255,255,.09)', bubbleOut:'rgba(108,99,255,.8)' }
  },
  {
    id: 'clean',
    label: '◻️ Clean Slate',
    desc: 'Sade profesyonel',
    preview: { sidebar:'#111418', chat:'#0e1016', bubbleIn:'#181b22', bubbleOut:'#1d2d4a' }
  },
  {
    id: 'vivid',
    label: '🔥 Vivid',
    desc: 'Enerji dolu renk',
    preview: { sidebar:'#0c0e14', chat:'#0a0c12', bubbleIn:'#161922', bubbleOut:'linear-gradient(135deg,#f97316,#ec4899)' }
  },
  {
    id: 'nature',
    label: '🌿 Doğa',
    desc: 'Mor & Yeşil Glass',
    preview: { sidebar:'#0f172a', chat:'#0b1120', bubbleIn:'rgba(255,255,255,.06)', bubbleOut:'rgba(16,185,129,.7)' }
  }
];

let _selectedUiStyle = localStorage.getItem('sohbet_ui_style') || 'glass';

function applyUiStyle(id) {
  if (id === 'default') {
    document.documentElement.removeAttribute('data-ui');
  } else {
    document.documentElement.setAttribute('data-ui', id);
  }
}

function selectUiStyle(id) {
  _selectedUiStyle = id;
  localStorage.setItem('sohbet_ui_style', id);
  applyUiStyle(id);
  renderUiStyleGrid();
}

function renderUiStyleGrid() {
  const grids = document.querySelectorAll('#uiStyleGrid');
  grids.forEach(grid => {
    if (!grid) return;
    grid.innerHTML = UI_STYLES.map(s => `
      <div onclick="selectUiStyle('${s.id}')" style="
        cursor:pointer;border-radius:12px;padding:8px 6px 10px;text-align:center;
        background:${_selectedUiStyle===s.id?'var(--surface2)':'var(--surface)'};
        border:2px solid ${_selectedUiStyle===s.id?'var(--accent)':'transparent'};
        transition:all .18s;
      ">
        <div style="width:100%;height:44px;border-radius:7px;margin-bottom:7px;overflow:hidden;display:flex;border:1px solid rgba(255,255,255,.07);">
          <div style="width:34%;background:${s.preview.sidebar};"></div>
          <div style="flex:1;background:${s.preview.chat};display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:3px;">
            <div style="height:6px;border-radius:2px;width:70%;background:${s.preview.bubbleIn};"></div>
            <div style="height:6px;border-radius:2px;width:55%;align-self:flex-end;background:${s.preview.bubbleOut};"></div>
          </div>
        </div>
        <div style="font-size:.7rem;font-weight:700;color:var(--text-hi);line-height:1.2;margin-bottom:1px;">${s.label}</div>
        <div style="font-size:.58rem;color:var(--muted);">${s.desc}</div>
      </div>`).join('');
  });
}

// Sayfa yüklenince UI stilini uygula
(function(){ applyUiStyle(_selectedUiStyle); })();


/* ══ SVG İKON SİSTEMİ ══ */

const SVG_ICONS = {
  home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  msgs: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  forum: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  friends: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
  games: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>',
  games: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M8 10v4"/><path d="M6 12h4"/><path d="M16 10h.01"/><path d="M14 12h4"/></svg>',
  watch: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/><polygon points="10 12 16 14.5 10 17"/></svg>',
  profile: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};
const EMOJI_ICONS = {home:'🏠',msgs:'💬',forum:'📋',friends:'👥',games:'🎮',watch:'📺',profile:'👤'};
let _svgIconsEnabled = true; // Her zaman açık

function applyTabIcons(useSvg) {
  function resolveKey(onclick) {
    if (!onclick) return null;
    if (onclick.includes("'home'") || onclick.includes('"home"')) return 'home';
    if (onclick.includes("openDMModal") || onclick.includes("'msgs'") || onclick.includes('"msgs"')) return 'msgs';
    if (onclick.includes("'forum'") || onclick.includes('"forum"')) return 'forum';
    if (onclick.includes("openFriendsModal") || onclick.includes("'friends'") || onclick.includes('"friends"')) return 'friends';
    if (onclick.includes("'games'") || onclick.includes('"games"')) return 'games';
    if (onclick.includes("'watch'") || onclick.includes('"watch"')) return 'watch';
    if (onclick.includes("'profile'") || onclick.includes('"profile"')) return 'profile';
    return null;
  }
  // Mobile .tab-ic — tab-wrap parent onclick desteği
  document.querySelectorAll('.tab-ic').forEach(el => {
    const tab = el.closest('.tab, .tab-wrap');
    if (!tab) return;
    let onclick = tab.getAttribute('onclick') || '';
    if (!onclick && tab.classList.contains('tab')) {
      const wrap = tab.closest('.tab-wrap');
      if (wrap) onclick = wrap.getAttribute('onclick') || '';
    }
    const key = resolveKey(onclick);
    if (!key) return;
    if (useSvg) {
      el.innerHTML = SVG_ICONS[key] || el.innerHTML;
      el.style.fontSize = '0';
    } else {
      el.innerHTML = '<span style="font-size:1.3rem;line-height:1;">' + EMOJI_ICONS[key] + '</span>';
      el.style.fontSize = '';
    }
  });
  // Desktop .rail-btn-ic
  document.querySelectorAll('.rail-btn-ic').forEach(el => {
    const btn = el.closest('.rail-btn');
    if (!btn) return;
    const key = resolveKey(btn.getAttribute('onclick') || '');
    if (!key) return;
    if (useSvg) {
      el.innerHTML = SVG_ICONS[key] || el.innerHTML;
      el.style.fontSize = '0';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    } else {
      el.innerHTML = '<span style="font-size:1.2rem;line-height:1;">' + EMOJI_ICONS[key] + '</span>';
      el.style.fontSize = '';
    }
  });
  const toggle = document.getElementById('svgIconToggle');
  const knob = document.getElementById('svgIconKnob');
  if (toggle) toggle.style.background = useSvg ? 'var(--accent)' : 'var(--border)';
  if (knob) knob.style.transform = useSvg ? 'translateX(20px)' : 'translateX(0)';
}

function toggleSvgIcons() { /* SVG ikonlar kalıcı olarak aktif */ }

// Uygula
(function(){
  if (true) setTimeout(() => applyTabIcons(true), 200);
})();


/* ══════════════════════════════════════════════════════════
   🌟 YENİ ÖZELLİKLER — Kapsamlı Ekleme
══════════════════════════════════════════════════════════ */


/* 1. KULLANICI ENGELLEME */
let _blockedUsers = {};
function loadBlockedUsers(){
  if(!_db||!_cu) return;
  dbRef('users/'+_cu+'/blocked').on('value', snap=>{
    _blockedUsers = snap.val()||{};
  });
}
function blockUser(username){
  if(!username||username===_cu){ showToast('Geçersiz kullanıcı.'); return; }
  if(!confirm(username+' engellensin mi?')) return;
  dbRef('users/'+_cu+'/blocked/'+username).set(true).then(()=>{
    _blockedUsers[username]=true;
    showToast('🚫 '+username+' engellendi.');
  });
}
function unblockUser(username){
  dbRef('users/'+_cu+'/blocked/'+username).remove().then(()=>{
    delete _blockedUsers[username];
    showToast('✅ Engel kaldırıldı.');
  });
}
function isBlocked(username){ return !!_blockedUsers[username]; }

/* 2. RAPOR SİSTEMİ — kaldırıldı */
function reportMsg(){}
function reportUser(){}
function closeReportModal(){}
function submitReport(){}

/* 3. ANKET */
function openCreatePoll(){
  const wrap=document.getElementById('pollOptionsWrap');
  wrap.innerHTML='';
  document.getElementById('pollQuestion').value='';
  for(let i=0;i<2;i++){
    const inp=document.createElement('input');
    inp.className='poll-opt-inp';
    inp.style.cssText='width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text-hi);font-size:.85rem;outline:none;font-family:inherit;box-sizing:border-box;';
    inp.placeholder='Seçenek '+(i+1); inp.maxLength=80;
    wrap.appendChild(inp);
  }
  document.getElementById('createPollModal').style.display='flex';
}
function addPollOption(){
  const wrap=document.getElementById('pollOptionsWrap');
  if(wrap.querySelectorAll('.poll-opt-inp').length>=6){ showToast('En fazla 6 seçenek.'); return; }
  const inp=document.createElement('input');
  inp.className='poll-opt-inp';
  inp.style.cssText='width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text-hi);font-size:.85rem;outline:none;font-family:inherit;box-sizing:border-box;';
  inp.placeholder='Seçenek '+(wrap.querySelectorAll('.poll-opt-inp').length+1); inp.maxLength=80;
  wrap.appendChild(inp);
}
function submitPoll(){
  const q=document.getElementById('pollQuestion').value.trim();
  if(!q){ showToast('Soru girin.'); return; }
  const opts=Array.from(document.querySelectorAll('.poll-opt-inp')).map(i=>i.value.trim()).filter(Boolean);
  if(opts.length<2){ showToast('En az 2 seçenek.'); return; }
  if(!_cRoom){ showToast('Önce oda seçin.'); return; }
  _db.ref('msgs/'+_cRoom).push({user:_cu, ts:Date.now(), text:'', poll:{question:q, options:opts, votes:{}}})
    .then(()=>{ document.getElementById('createPollModal').style.display='none'; showToast('📊 Anket oluşturuldu!'); });
}
function votePoll(room, msgKey, optIdx){
  if(!_cu) return;
  _db.ref('msgs/'+room+'/'+msgKey+'/poll/votes').once('value').then(s=>{
    const votes=s.val()||{};
    const updates={};
    Object.keys(votes).forEach(i=>{ if(votes[i]&&votes[i][_cu]) updates['msgs/'+room+'/'+msgKey+'/poll/votes/'+i+'/'+_cu]=null; });
    updates['msgs/'+room+'/'+msgKey+'/poll/votes/'+optIdx+'/'+_cu]=true;
    _db.ref().update(updates);
  });
}
function buildPollHtml(room, msgKey, poll){
  if(!poll||!poll.question) return '';
  const total=Object.values(poll.votes||{}).reduce((s,v)=>s+(v?Object.keys(v).length:0),0);
  let h=`<div class="poll-wrap"><div class="poll-q">📊 ${esc(poll.question)}</div>`;
  (poll.options||[]).forEach((opt,i)=>{
    const cnt=poll.votes&&poll.votes[i]?Object.keys(poll.votes[i]).length:0;
    const pct=total?Math.round(cnt/total*100):0;
    const my=poll.votes&&poll.votes[i]&&poll.votes[i][_cu];
    h+=`<div class="poll-opt${my?' voted':''}" onclick="votePoll('${room}','${msgKey}',${i})"><div class="poll-bar" style="width:${pct}%"></div><div class="poll-opt-text"><span>${esc(opt)}</span><span>${pct}%</span></div></div>`;
  });
  return h+`<div class="poll-meta">${total} oy</div></div>`;
}

/* 4. GÜNLÜK ÖDÜL — kaldırıldı */
let _drClaimed=false;
function checkDailyReward(){}
function showDailyReward(){}
function claimDailyReward(){}

/* 5. KULLANICI PROFİLİ GÖRÜNTÜLE */
function openUserProfileModal(username){ viewUserProfile(username); }
function viewUserProfile(username){
  if(!username) return;
  const m=document.getElementById('userProfileModal'); if(!m) return;
  // Banner rengini kullanıcı rengine göre ayarla
  const banner = document.getElementById('upBanner');
  if(banner){
    const col = strColor(username);
    banner.style.background = `linear-gradient(135deg, ${col}cc 0%, var(--bg) 100%)`;
  }
  document.getElementById('upBody').innerHTML='<div style="padding:20px 0;"><div class="ld" style="display:flex;gap:5px;justify-content:center;"><span></span><span></span><span></span></div></div>';
  m.classList.add('show');
  m.style.display='flex';
  Promise.all([dbRef('users/'+username).once('value')])
    .then(([us])=>{
      const u=Object.assign({},us.val()||{});
      const online=_online&&_online[username]&&(Date.now()-(_online[username].ts||0)<90000);
      const isSelf=username===_cu;
      const col=strColor(username);

      // Sosyal linkler
      let socialHtml='';
      if(u.instagram) socialHtml+=`<a href="https://instagram.com/${esc(u.instagram)}" target="_blank" class="up-social-chip">📸 @${esc(u.instagram)}</a>`;
      if(u.twitter) socialHtml+=`<a href="https://twitter.com/${esc(u.twitter)}" target="_blank" class="up-social-chip">🐦 @${esc(u.twitter)}</a>`;
      if(u.website) socialHtml+=`<a href="${esc(u.website)}" target="_blank" class="up-social-chip">🌐 ${esc(u.website)}</a>`;

      // Aksiyon butonları
      let actionBtns='';
      if(!isSelf){
        actionBtns+=`<button class="up-btn primary" onclick="closeUserProfile();openDMWith&&openDMWith('${esc(username)}');">💬 Mesaj Gönder</button>`;
        if(isBlocked(username)){
          actionBtns+=`<button class="up-btn muted" onclick="unblockUser('${esc(username)}');closeUserProfile();">✅ Engeli Kaldır</button>`;
        } else {
          actionBtns+=`<button class="up-btn danger" onclick="blockUser('${esc(username)}');closeUserProfile();">🚫 Engelle</button>`;
        }
      }

      // Durum satırı
      const statusLine = u.statusMsg
        ? `<div style="font-size:.8rem;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:4px;justify-content:center;">${esc(u.statusEmoji||'💬')} ${esc(u.statusMsg)}</div>`
        : '';

      // Rozet
      const badgeHtml = u.badge ? `<div class="up-badge-row">${esc(u.badge)}</div>` : '';

      // Bio
      const bioHtml = u.bio ? `<div class="up-bio-box">${esc(u.bio)}</div>` : '';

      // Origin
      const originHtml = u.origin ? `<div style="font-size:.75rem;color:var(--muted);margin-bottom:6px;">${esc(u.origin)}</div>` : '';

      document.getElementById('upBody').innerHTML=`
        <div class="up-av" id="upAv" style="background:${col}">${initials(username)}</div>
        <div class="up-online-dot" style="background:${online?'#4caf50':'#888'};position:absolute;bottom:${m.querySelector('.up-av')?0:0}px;display:none;"></div>
        <div class="up-name">${esc(username)}</div>
        <div class="up-status">
          <span style="width:8px;height:8px;border-radius:50%;background:${online?'#4caf50':'var(--muted)'};display:inline-block;flex-shrink:0;transition:background .5s;"></span>
          <span style="color:${online?'var(--green)':'var(--muted)'};">${online?'Çevrimiçi':'Çevrimdışı'}</span>
        </div>
        ${badgeHtml}
        ${originHtml}
        ${statusLine}
        ${bioHtml}
        ${socialHtml?`<div class="up-social-row">${socialHtml}</div>`:''}
        ${actionBtns?`<div class="up-action-row">${actionBtns}</div>`:''}
      `;
      const avEl=document.getElementById('upAv');
      if(avEl) setTimeout(()=>setAvatar(avEl,username),50);
    }).catch(()=>{ document.getElementById('upBody').innerHTML='<div style="color:var(--muted);padding:20px;">Yüklenemedi.</div>'; });
}
function closeUserProfile(){
  const m=document.getElementById('userProfileModal');
  if(m){ m.style.display='none'; m.classList.remove('show'); }
}

/* 6. DURUM & SOSYAL */
function saveUserStatus(){
  const emoji=document.getElementById('statusEmoji')?.value||'💬';
  const msg=(document.getElementById('statusMsg')?.value||'').trim();
  _db.ref('users/'+_cu).update({statusMsg:msg,statusEmoji:emoji}).then(()=>{
    dbRef('users/'+_cu).update({statusMsg:msg,statusEmoji:emoji});
    showToast('✅ Durum güncellendi!');
  });
}
function saveSocialLinks(){
  const ig=(document.getElementById('socialInstagram')?.value||'').trim().replace('@','');
  const tw=(document.getElementById('socialTwitter')?.value||'').trim().replace('@','');
  const web=(document.getElementById('socialWebsite')?.value||'').trim();
  _db.ref('users/'+_cu).update({instagram:ig||null,twitter:tw||null,website:web||null}).then(()=>showToast('✅ Sosyal linkler kaydedildi!'));
}
function loadProfileSocialTab(){
  if(!_db||!_cu) return;
  const el=document.getElementById('profSocialTab'); if(!el) return;
  _db.ref('users/'+_cu).once('value').then(s=>{
    const u=s.val()||{};
    el.innerHTML=`<div style="width:100%;box-sizing:border-box;"><div style="margin-bottom:16px;">
      <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> Durum Mesajı</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input id="statusEmoji" style="width:56px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text-hi);font-size:1.1rem;outline:none;text-align:center;" value="${esc(u.statusEmoji||'💬')}" maxlength="2">
        <input id="statusMsg" style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text-hi);font-size:.88rem;outline:none;font-family:inherit;" value="${esc(u.statusMsg||'')}" placeholder="Durumunuzu yazın..." maxlength="60">
      </div>
      <button onclick="saveUserStatus()" style="width:100%;padding:9px;background:var(--accent);border:none;border-radius:9px;color:#fff;font-size:.82rem;font-weight:700;cursor:pointer;">Kaydet</button>
    </div>
    <div>
      <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-1px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Sosyal Bağlantılar</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-1px"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Instagram</div>
      <input id="socialInstagram" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text-hi);font-size:.88rem;outline:none;font-family:inherit;margin-bottom:8px;box-sizing:border-box;" value="${esc(u.instagram||'')}" placeholder="instagram_adi" maxlength="50">
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-1px"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg> Twitter</div>
      <input id="socialTwitter" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text-hi);font-size:.88rem;outline:none;font-family:inherit;margin-bottom:8px;box-sizing:border-box;" value="${esc(u.twitter||'')}" placeholder="twitter_adi" maxlength="50">
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-1px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Website</div>
      <input id="socialWebsite" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text-hi);font-size:.88rem;outline:none;font-family:inherit;margin-bottom:10px;box-sizing:border-box;" value="${esc(u.website||'')}" placeholder="https://..." maxlength="100">
      <button onclick="saveSocialLinks()" style="width:100%;padding:9px;background:var(--accent);border:none;border-radius:9px;color:#fff;font-size:.82rem;font-weight:700;cursor:pointer;">Kaydet</button>
    </div></div>`;
  });
}

/* 7. MENTION DETECT */
function detectMentions(text){ return (text.match(/@([a-zA-Z0-9\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc_.\-]+)/g)||[]).map(m=>m.slice(1)); }
function linkifyMentions(html){
  return html.replace(/@([a-zA-Z0-9\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc_.\-]+)/g,(match,name)=>{
    return `<span class="mention" onclick="viewUserProfile('${esc(name)}')" style="color:var(--accent);font-weight:700;cursor:pointer;">@${esc(name)}</span>`;
  });
}
function checkMentionsInMsg(text){
  if(!text||!_cu||!_db) return;
  detectMentions(text).forEach(name=>{
    if(name===_cu) return;
    _db.ref('notifications/'+name+'/'+Date.now()).set({type:'mention',from:_cu,text:text.slice(0,80),room:_cRoom,ts:Date.now(),read:false});
  });
  // Push notification
  if(Notification&&Notification.permission==='granted'){
    detectMentions(text).forEach(name=>{
      if(name!==_cu) return; // only notify self
    });
  }
}
function requestNotifPermissionFromSettings(){
  // iOS Safari tarayıcısında bildirimler sadece ana ekrana eklenen PWA'da çalışır
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  if(!('Notification' in window)){
    if(isIOS && !isStandalone){
      showToast('📱 iOS\'ta bildirimleri etkinleştirmek için uygulamayı Ana Ekrana ekleyin.');
    } else {
      showToast('Bu tarayıcı bildirimleri desteklemiyor.');
    }
    return;
  }
  if(Notification.permission === 'granted'){
    showToast('🔔 Bildirimler zaten açık!');
    return;
  }
  Notification.requestPermission().then(p => {
    if(p === 'granted'){
      _notifPermission = 'granted';
      showToast('🔔 Bildirimler açıldı!');
    } else {
      showToast('İzin reddedildi. Tarayıcı ayarlarından açabilirsiniz.');
    }
  });
}

/* 8. DÜZENLEME GEÇMİŞİ */
function showEditHistory(room, key){
  _db.ref('editHistory/'+room+'/'+key).once('value').then(s=>{
    const hist=s.val();
    const body=document.getElementById('editHistoryBody');
    if(!hist||!Object.keys(hist).length){ body.innerHTML='<div style="color:var(--muted);font-size:.82rem;text-align:center;padding:20px;">Düzenleme geçmişi yok.</div>'; }
    else {
      const arr=Object.values(hist).sort((a,b)=>b.ts-a.ts);
      body.innerHTML=arr.map(h=>`<div class="edit-history-item"><div style="color:var(--muted);font-size:.7rem;margin-bottom:4px;">${new Date(h.ts).toLocaleString('tr-TR')}</div><div>${esc(h.text)}</div></div>`).join('');
    }
    document.getElementById('editHistoryModal').style.display='flex';
  });
}

/* 9. ADMIN: RAPORLAR — kaldırıldı */
function loadAdminReports(){
  const body = document.getElementById('adminBody');
  body.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  // Son banlanan kullanıcıları ve raporları göster
  Promise.all([
    adminRestGet('users').catch(()=>({})),
    adminRestGet('bannedIPs').catch(()=>({})),
  ]).then(([usersData, ipsData])=>{
    const users = usersData||{};
    const ips = ipsData||{};
    const banned = Object.values(users).filter(u=>u&&u.banned).sort((a,b)=>(b.bannedAt||0)-(a.bannedAt||0));
    const ipList = Object.values(ips).sort((a,b)=>(b.bannedAt||0)-(a.bannedAt||0));
    let h = '<div class="admin-section"><div class="admin-sec-title">🚫 Banlı Kullanıcılar ('+banned.length+')</div><div class="admin-card">';
    if(banned.length){
      banned.forEach(u=>{
        h+=`<div class="admin-row" style="align-items:center;">
          <div style="flex:1"><div style="font-weight:700;color:var(--text-hi);">${esc(u.username||'?')}</div>
          <div style="font-size:.7rem;color:var(--muted);">${u.lastIP?'🌐 '+u.lastIP:''}</div></div>
          <button class="a-btn green" onclick="adminToggleBan('${esc(u.username)}',false)">✅ Unban</button>
        </div>`;
      });
    } else { h+='<div style="color:var(--muted);padding:12px;">Ban yok.</div>'; }
    h += '</div></div>';
    h += '<div class="admin-section"><div class="admin-sec-title">🌐 IP Banlar ('+ipList.length+')</div><div class="admin-card">';
    if(ipList.length){
      ipList.forEach(b=>{
        h+=`<div class="admin-row" style="align-items:center;">
          <div style="flex:1"><div style="font-family:monospace;font-weight:700;color:#e67e22;">${esc(b.ip||'?')}</div>
          <div style="font-size:.7rem;color:var(--muted);">${b.username?'👤 '+esc(b.username):''} ${b.bannedAt?'· '+new Date(b.bannedAt).toLocaleDateString('tr-TR'):''}</div></div>
          <button class="a-btn green" onclick="adminRestDelete('bannedIPs/'+(b.ip||'').replace(/\./g,'_')).then(()=>{showToast('\xe2\x9c\x85 Kald\xc4\xb1r\xc4\xb1ld\xc4\xb1.');loadAdminReports();})">Kald\xc4\xb1r</button>
        </div>`;
      });
    } else { h+='<div style="color:var(--muted);padding:12px;">IP ban yok.</div>'; }
    h += '</div></div>';
    body.innerHTML = h;
  }).catch(()=>{ body.innerHTML='<p style="color:var(--muted);padding:20px;">Yüklenemedi.</p>'; });
}
function resolveReport(){}

/* 10. ADMIN: IP BAN */
async function loadAdminIPBan(){
  const body=document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  try{
    const bans=await adminRestGet('bannedIPs')||{};
    let h=`<div class="admin-section"><div class="admin-sec-title">🌐 IP Ban Yönetimi</div>
      <div class="admin-card" style="padding:14px;margin-bottom:10px;">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input id="ipBanInp" class="admin-inp" placeholder="IP adresi (örn: 192.168.1.1)" style="margin-bottom:0;flex:1;">
          <input id="ipBanNote" class="admin-inp" placeholder="Not (isteğe bağlı)" style="margin-bottom:0;flex:1;">
        </div>
        <button class="a-btn red" style="width:100%;" onclick="addIPBan()">🚫 IP Banla</button>
      </div>`;
    const arr=Object.entries(bans);
    if(arr.length){
      h+='<div class="admin-card" style="padding:0;">';
      arr.sort((a,b)=>((b[1]&&b[1].bannedAt)||0)-((a[1]&&a[1].bannedAt)||0)).forEach(([key,d])=>{
        const ip=d.ip||key.replace(/_/g,'.');
        const note=d.note||''; const ts=d.bannedAt?new Date(d.bannedAt).toLocaleString('tr-TR'):(d.ts?new Date(d.ts).toLocaleString('tr-TR'):'?'); const user=d.username||d.by||'?';
        h+=`<div class="admin-row" style="align-items:center;padding:10px 14px;"><div style="flex:1"><div style="font-family:monospace;font-weight:700;color:#e67e22">${esc(ip)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">👤 ${esc(user)}${note?' · 📝 '+esc(note):''} · 🕐 ${ts}</div></div><button class="a-btn green" style="padding:5px 10px;font-size:.72rem;" onclick="removeIPBan('${key}')">✅ Kaldır</button></div>`;
      });
      h+='</div>';
    } else h+='<div class="admin-card" style="padding:18px;text-align:center;color:var(--muted);">Yasaklı IP adresi yok.</div>';
    body.innerHTML=h+'</div>';
  }catch(e){ body.innerHTML='<div class="admin-section"><p style="color:#e74c3c;padding:20px">Hata: '+e.message+'</p></div>'; }
}
async function addIPBan(){
  const ip=(document.getElementById('ipBanInp')?.value||'').trim();
  const note=(document.getElementById('ipBanNote')?.value||'').trim();
  if(!ip){ showToast('IP adresi girin.'); return; }
  try{ await adminRestSet('bannedIPs/'+ip.replace(/\./g,'_'),{ip,note,bannedAt:Date.now(),bannedBy:_cu,username:'manuel'}); showToast('🚫 IP banlandı: '+ip); loadAdminIPBan(); }
  catch(e){ showToast('❌ Hata: '+e.message); }
}
async function removeIPBan(ipKey){
  try{ await adminRestDelete('bannedIPs/'+ipKey); showToast('✅ IP ban kaldırıldı.'); loadAdminIPBan(); }
  catch(e){ showToast('❌ Hata: '+e.message); }
}

/* 11. ADMIN: BÜYÜME GRAFİĞİ + EN AKTİF ODALAR */
function loadAdminGrowthChart(){
  const body=document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  Promise.all([adminRestGet('users').catch(()=>({})), adminRestGet('msgs').catch(()=>({}))]).then(([uS,mS])=>{
    const users=uS||{}, msgs=mS||{};
    const DAYS=30, now=Date.now();
    const buckets=Array.from({length:DAYS},(_,i)=>{
      const d=new Date(now-(DAYS-1-i)*86400000);
      return {label:(d.getMonth()+1)+'/'+d.getDate(), ts:d.setHours(0,0,0,0), users:0};
    });
    Object.values(users).forEach(u=>{
      if(!u.createdAt) return;
      for(let i=buckets.length-1;i>=0;i--){
        if(u.createdAt>=buckets[i].ts){ buckets[i].users++; break; }
      }
    });
    // Room activity
    const roomCounts={};
    Object.entries(msgs).forEach(([rid,rm])=>{ if(rm) roomCounts[rid]=Object.keys(rm).length; });
    const topRooms=Object.entries(roomCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxMsg=Math.max(...topRooms.map(r=>r[1]),1);
    let h=`<div class="admin-section"><div class="admin-sec-title">📈 Son 30 Gün Kayıt</div><div class="admin-card" style="padding:16px;"><canvas id="growthCanvas" width="600" height="160" style="width:100%;max-width:100%;"></canvas></div></div>
    <div class="admin-section" style="margin-top:12px"><div class="admin-sec-title">🏆 En Aktif Odalar</div><div class="admin-card" style="padding:14px;">`;
    topRooms.forEach(([rid,cnt])=>{
      const pct=Math.round(cnt/maxMsg*100);
      h+=`<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-hi);margin-bottom:3px;"><span>#${esc(rid)}</span><span>${cnt} mesaj</span></div><div style="background:var(--surface2);border-radius:100px;height:7px;"><div style="background:linear-gradient(90deg,var(--accent),#a855f7);height:100%;width:${pct}%;border-radius:100px;"></div></div></div>`;
    });
    body.innerHTML=h+'</div></div>';
    setTimeout(()=>{
      const canvas=document.getElementById('growthCanvas'); if(!canvas) return;
      const ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height;
      ctx.clearRect(0,0,W,H);
      const vis=buckets.slice(-20);
      const maxU=Math.max(...vis.map(b=>b.users),1);
      const bw=Math.floor((W-50)/vis.length)-3;
      ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fillRect(0,0,W,H);
      vis.forEach((b,i)=>{
        const x=50+i*(bw+3);
        const barH=Math.max(2,Math.round((b.users/maxU)*(H-40)));
        const y=H-25-barH;
        const g=ctx.createLinearGradient(0,y,0,H-25);
        g.addColorStop(0,'#6c63ff'); g.addColorStop(1,'rgba(108,99,255,.3)');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,bw,barH,3):ctx.rect(x,y,bw,barH); ctx.fill();
        if(b.users>0){ ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='bold 9px sans-serif'; ctx.fillText(b.users,x+1,y-3); }
        if(i%3===0){ ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='9px sans-serif'; ctx.fillText(b.label,x,H-8); }
      });
      [0,Math.ceil(maxU/2),maxU].forEach(v=>{
        const y=H-25-Math.round((v/maxU)*(H-40));
        ctx.fillStyle='rgba(255,255,255,.3)'; ctx.font='9px sans-serif'; ctx.fillText(v,2,y+4);
        ctx.fillStyle='rgba(255,255,255,.06)'; ctx.fillRect(48,y,W-48,1);
      });
    },150);
  });
}

/* 12. AKTİVİTE İSTATİSTİKLERİ */
function loadProfileStats(){ return; /*kaldırıldı*/
  // REMOVED
  if(!_db||!_cu) return;
  const cont=document.getElementById('profStatsContent'); if(!cont) return;
  cont.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  Promise.all([_db.ref('users/'+_cu).once('value'), _db.ref('msgs').once('value')]).then(([uS,mS])=>{
    const u=uS.val()||{};
    const allMsgs=mS.val()||{};
    let total=0;
    Object.values(allMsgs).forEach(rm=>{ if(rm) Object.values(rm).forEach(m=>{ if(m&&m.user===_cu) total++; }); });
    const join=u.createdAt?new Date(u.createdAt).toLocaleDateString('tr-TR'):'?';
    cont.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;"><div style="font-size:1.4rem;font-weight:900;color:var(--accent);">${total}</div><div style="font-size:.68rem;color:var(--muted);">Mesaj Gönderildi</div></div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;"><div style="font-size:.85rem;font-weight:900;color:var(--text-hi);">${join}</div><div style="font-size:.68rem;color:var(--muted);">Katılım Tarihi</div></div>
    </div>`;
  });
}

/* 13. BİLDİRİM SİSTEMİ — kaldırıldı */
let _unreadNotifs=0;
function listenNotifications(){}
function openNotifications(){}
/* markAllNotifsRead → search.js */

/* 14. YENİ SEKME & ADMIN SEKME EKLEME */
function injectProfileTabs(){
  const tabBar=document.querySelector('#profileScreen > div[style*="border-bottom"]');
  if(!tabBar||tabBar.dataset.pEnhanced) return;
  tabBar.dataset.pEnhanced='1';
  // Sosyal sekmesi kaldırıldı
  const scroll=tabBar.nextElementSibling;
  if(scroll){
    const body=document.createElement('div');
    body.id='profTabBody-stats';
    body.style.cssText='padding:16px;display:none;';
    body.innerHTML='<div id="profStatsContent"><div class="ld"><span></span><span></span><span></span></div></div>';
    scroll.appendChild(body);
  }
}
function injectAdminTabs(){
  const atabs=document.querySelector('.admin-tabs');
  if(!atabs||atabs.dataset.aEnhanced) return;
  atabs.dataset.aEnhanced='1';
  [{id:'reports',label:'Raporlar'},{id:'ipban',label:'IP Ban'},{id:'growth',label:'Grafik'}].forEach(t=>{
    const d=document.createElement('div');
    d.className='atab';
    d.textContent=t.label;
    d.onclick=()=>adminTabNew(t.id);
    atabs.appendChild(d);
  });
}
function adminTabNew(tab){
  document.querySelectorAll('.atab').forEach(el=>el.classList.remove('act'));
  const active=[...document.querySelectorAll('.atab')].find(el=>{
    if(tab==='reports') return el.textContent.includes('Raporlar');
    if(tab==='ipban') return el.textContent.includes('IP Ban');
    if(tab==='growth') return el.textContent.includes('Grafik');
    return false;
  });
  if(active) active.classList.add('act');
  if(tab==='reports') loadAdminReports();
  else if(tab==='ipban') loadAdminIPBan();
  else if(tab==='growth') loadAdminGrowthChart();
}

/* 15. MESAJ MENÜSÜNE YENİ ÖĞELER */
const _origShowMsgMenu2=showMsgMenu;
/* showMsgMenu → messages.js */

/* 16. AVATAR TIKLANINCA PROFİL */
document.addEventListener('click',function(e){
  const av=e.target.closest('[data-av-user]');
  if(av&&av.dataset.avUser&&av.dataset.avUser!==_cu) viewUserProfile(av.dataset.avUser);
});

/* 17. PROFİL SEKMELERİ OVERRIDE */
const _origSwitchProfTab2=typeof switchProfTab==='function'?switchProfTab:null;
function switchProfTab(tab){
  ['profile','appearance','sounds','account'].forEach(t=>{
    const btn=document.getElementById('ptab-'+t);
    const body=document.getElementById('profTabBody-'+t);
    if(btn){btn.style.color=t===tab?'#fff':'var(--muted)';btn.style.borderBottom=t===tab?'2px solid var(--accent)':'2px solid transparent';}
    if(body) body.style.display=t===tab?(t==='profile'?'flex':'block'):'none';
  });
  const activeBtn = document.getElementById('ptab-'+tab);
  if(activeBtn) activeBtn.scrollIntoView({inline:'center', behavior:'smooth'});
  const scrollWrap = document.querySelector('#profileScreen > div[style*="overflow-y"]');
  if(scrollWrap) scrollWrap.scrollTop = 0;
  if(tab==='profile'){
    if(typeof loadBio==='function') setTimeout(loadBio, 50);
    setTimeout(()=>{
      if(typeof updateProfileFriendCount==='function') updateProfileFriendCount();
      if(window._db && window._cu){
        dbRef('users/'+_cu).once('value').then(snap=>{
          const d=snap.val()||{};
          const mc=d.msgCount||0;
          const el=document.getElementById('profMsgCount');
          if(el) el.textContent=mc>999?Math.floor(mc/1000)+'K':mc;
          if(typeof updateProfileBadges==='function') updateProfileBadges(mc);
        }).catch(()=>{});
      }
    },100);
  }
  if(tab==='appearance'){ if(typeof renderUiStyleGrid==='function') renderUiStyleGrid(); }
  if(tab==='sounds'){ if(typeof renderToneGrids==='function') renderToneGrids(); }
  if(tab==='account'){const ab=document.getElementById('adminPanelBtn');if(ab) ab.style.display=_isAdmin?'flex':'none';}
}

/* 18. BİLDİRİM BUTONU — kaldırıldı */
function addNotifBell(){}

/* 19. MENTION LİNKİFY — observer */
const _mentionObserver=new MutationObserver(()=>{
  document.querySelectorAll('.mb-text, .ob').forEach(el=>{
    if(el.dataset.mz) return;
    el.dataset.mz='1';
    el.innerHTML=linkifyMentions(el.innerHTML);
  });
});
document.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('chatMsgs');
  if(b) _mentionObserver.observe(b,{childList:true,subtree:true});
});

/* 20. INIT */
document.addEventListener('DOMContentLoaded',()=>{
  // changePwModal'ı body'e taşı — masaüstünde profileScreen gizlidir
  const pwModal = document.getElementById('changePwModal');
  if(pwModal && pwModal.parentElement !== document.body){
    document.body.appendChild(pwModal);
  }
  setTimeout(()=>{ injectProfileTabs(); injectAdminTabs(); },600);
});

// onLoginSuccess hook
const _prevOnLoginSuccess = typeof onLoginSuccess === 'function' ? onLoginSuccess : null;
onLoginSuccess = function(){
  if(_prevOnLoginSuccess) _prevOnLoginSuccess();
  setTimeout(()=>{
    loadBlockedUsers();
    injectProfileTabs();
    injectAdminTabs();
  },600);
};

// startEditMsg: save history
const _prevStartEditMsg = typeof startEditMsg === 'function' ? startEditMsg : null;
startEditMsg = function(room,key){
  if(_db) _db.ref('msgs/'+room+'/'+key).once('value').then(s=>{
    const m=s.val();
    if(m&&m.text) _db.ref('editHistory/'+room+'/'+key+'/'+Date.now()).set({text:m.text,ts:Date.now(),by:_cu});
  });
  if(_prevStartEditMsg) _prevStartEditMsg(room,key);
};


/* ══════════════════════════════════════════════════════════
   YENİ ÖZELLİKLER — Tüm arayüz iyileştirmeleri
══════════════════════════════════════════════════════════ */



/* ── 2. HOVER ZAMAN DAMGASI TOOLTIP ── */

(function(){
  // renderMsgs çağrıldıktan sonra tooltipleri ekle
  const origRender = window.renderMsgs;
  if(origRender) window.renderMsgs = function(msgsObj, clearedAt){
    origRender(msgsObj, clearedAt);
    _addTimestampTooltips();
  };
  function _addTimestampTooltips(){
    const box = document.getElementById('chatMsgs');
    if(!box) return;
    box.querySelectorAll('.mb[data-ts]').forEach(mb=>{
      if(mb.querySelector('.msg-hover-tooltip')) return;
      const ts = parseInt(mb.dataset.ts);
      if(!ts) return;
      const d = new Date(ts);
      const day = d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
      const time = d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
      const tip = document.createElement('div');
      tip.className = 'msg-hover-tooltip';
      tip.textContent = `${day} · ${time}`;
      mb.appendChild(tip);
    });
  }
  window._addTimestampTooltips = _addTimestampTooltips;
  // data-ts attribute'u own olmayan mesajlara da ekle
  const origRender2 = window.renderMsgs;
  if(origRender2) {
    const _patchedRender = origRender2;
    window.renderMsgs = function(msgsObj, clearedAt){
      _patchedRender(msgsObj, clearedAt);
      // Own olmayan mesajlara da ts ekle
      const box = document.getElementById('chatMsgs');
      if(box && msgsObj){
        const msgs = Object.entries(msgsObj).map(([k,v])=>({...v,_key:k}));
        msgs.forEach(m=>{
          const el = box.querySelector(`.mb[data-key="${m._key}"]`);
          if(el && !el.dataset.ts) el.dataset.ts = m.ts;
        });
        _addTimestampTooltips();
      }
    };
  }
})();


/* ── 7. TAB BADGE POP ANİMASYONU ── */

(function(){
  function _popBadge(el){
    if(!el) return;
    el.classList.remove('badge-pop');
    void el.offsetWidth;
    el.classList.add('badge-pop');
    setTimeout(()=>el.classList.remove('badge-pop'), 450);
  }
  // unread badge güncellemelerini izle
  const origUpdateBadge = window.updateUnreadBadge;
  if(origUpdateBadge){
    window.updateUnreadBadge = function(roomId, count){
      origUpdateBadge(roomId, count);
      setTimeout(()=>{
        // Mobil badge
        document.querySelectorAll('.ubadge').forEach(b=>{ if(parseInt(b.textContent)>0) _popBadge(b); });
        // Desktop badge
        document.querySelectorAll('.dsk-row-badge').forEach(b=>{ if(parseInt(b.textContent)>0) _popBadge(b); });
      }, 50);
    };
  }
  // updateRoomBadge'ı da izle (doğrudan çağrılanlar için)
  const origRoomBadge = window.updateRoomBadge;
  if(origRoomBadge){
    window.updateRoomBadge = function(roomId, count){
      origRoomBadge(roomId, count);
      setTimeout(()=>{
        document.querySelectorAll('.ubadge, .dsk-row-badge').forEach(b=>{ if(parseInt(b.textContent)>0) _popBadge(b); });
      }, 50);
    };
  }
  window._popBadge = _popBadge;
})();


/* ── 12. SOHBET ARKA PLAN DESENİ ── */

(function(){
  const BG_KEY = 'sohbet_chat_bg';
  const opts = [
    {id:'none',  label:'Yok'},
    {id:'dots',  label:'Nokta'},
    {id:'cross', label:'Daire'},
  ];
  function applyBg(id){
    const el = document.getElementById('chatMsgs');
    if(el){ el.dataset.bg = id==='none'?'':id; }
    // Masaüstü için de uygula
    const deskEl = document.getElementById('deskMsgs');
    if(deskEl){ deskEl.dataset.bg = id==='none'?'':id; }
    localStorage.setItem(BG_KEY, id);
  }
  function getChatBg(){ 
    const v = localStorage.getItem(BG_KEY)||'none';
    if (v === 'grid') { localStorage.setItem(BG_KEY, 'none'); return 'none'; }
    return v;
  }
  window.getChatBg = getChatBg;
  window.applyBg = applyBg;
  // Sayfa açılışında uygula
  setTimeout(()=>applyBg(getChatBg()), 800);
  // Profile Görünüm tabına arka plan seçici ekle
  const origSwitch = window.switchProfTab;
  if(origSwitch){
    window.switchProfTab = function(tab){
      origSwitch(tab);
      if(tab==='appearance'){
        setTimeout(_renderBgPicker, 50);
      }
    };
  }
  function _renderBgPicker(){
    const container = document.getElementById('themeGrid')?.parentElement;
    if(!container) return;
    if(container.querySelector('#chatBgPicker')) return;
    const cur = getChatBg();
    const wrap = document.createElement('div');
    wrap.style.cssText='margin-top:18px;';
    wrap.innerHTML=`
      <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:0 2px 10px;">💬 Sohbet Arka Planı</div>
      <div id="chatBgPicker" style="display:flex;gap:8px;flex-wrap:wrap;">
        ${opts.map(o=>`
          <div onclick="applyBg('${o.id}');document.querySelectorAll('.bg-opt').forEach(e=>e.style.borderColor='transparent');this.style.borderColor='var(--accent)';"
            class="bg-opt" style="
            flex:1;min-width:60px;padding:10px 6px;text-align:center;border-radius:10px;
            background:var(--surface);border:2px solid ${cur===o.id?'var(--accent)':'transparent'};
            cursor:pointer;font-size:.75rem;font-weight:700;color:var(--text-hi);
            transition:border-color .15s;">
            ${o.label}
          </div>`).join('')}
      </div>`;
    container.appendChild(wrap);
  }
})();


/* ══ SVG (kol/bacak grupları ayrı) ══ */

const BOT_SVG = `
<svg class="bot-svg" viewBox="-14 -18 92 118" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <radialGradient id="bgBodyGrad2" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#1a4a18"/>
      <stop offset="100%" stop-color="#0a1f09"/>
    </radialGradient>
    <radialGradient id="bgEyeGrad2" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#7dd6f5"/>
      <stop offset="100%" stop-color="#2a7ab5"/>
    </radialGradient>
    <filter id="botGlow2">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <clipPath id="leafBodyClip2">
      <path d="M32 2 C46 8 62 26 62 46 C62 66 50 78 32 78 C14 78 2 66 2 46 C2 26 18 8 32 2Z"/>
    </clipPath>
  </defs>

  <!-- Arama halkaları -->
  <circle class="call-ring" cx="32" cy="40"/>
  <circle class="call-ring" cx="32" cy="40"/>
  <circle class="call-ring" cx="32" cy="40"/>

  <!-- SOL KOL (ayrı grup, animate edilir) -->
  <g class="bot-arm-left">
    <path d="M4 42 C-7 38 -12 29 -6 25 C-2 23 4 29 4 42Z"
          fill="#0e2b0c" stroke="#3a7a34" stroke-width=".9"/>
    <line x1="4" y1="42" x2="-6" y2="25" stroke="#4a8f40" stroke-width=".5" stroke-opacity=".55"/>
    <circle cx="-6" cy="25" r="2" fill="#1a4a18" stroke="#4a8f40" stroke-width=".7"/>
  </g>

  <!-- SAĞ KOL -->
  <g class="bot-arm-right">
    <path d="M60 42 C71 38 76 29 70 25 C66 23 60 29 60 42Z"
          fill="#0e2b0c" stroke="#3a7a34" stroke-width=".9"/>
    <line x1="60" y1="42" x2="70" y2="25" stroke="#4a8f40" stroke-width=".5" stroke-opacity=".55"/>
    <circle cx="70" cy="25" r="2" fill="#1a4a18" stroke="#4a8f40" stroke-width=".7"/>
  </g>

  <!-- SOL BACAK -->
  <g class="bot-leg-left">
    <rect x="19" y="76" width="9" height="12" rx="3" fill="#0e2b0c" stroke="#3a7a34" stroke-width=".8"/>
    <ellipse cx="23.5" cy="89" rx="5" ry="3.5" fill="#1a4a18" stroke="#4a8f40" stroke-width=".8"/>
  </g>

  <!-- SAĞ BACAK -->
  <g class="bot-leg-right">
    <rect x="36" y="76" width="9" height="12" rx="3" fill="#0e2b0c" stroke="#3a7a34" stroke-width=".8"/>
    <ellipse cx="40.5" cy="89" rx="5" ry="3.5" fill="#1a4a18" stroke="#4a8f40" stroke-width=".8"/>
  </g>

  <!-- GÖVDE ANA GRUBU -->
  <g class="bot-body-group">
    <!-- Gövde: Yaprak -->
    <path d="M32 2 C46 8 62 26 62 46 C62 66 50 78 32 78 C14 78 2 66 2 46 C2 26 18 8 32 2Z"
          fill="url(#bgBodyGrad2)" stroke="#3a7a34" stroke-width="1.2"/>

    <!-- Damar/devre çizgileri -->
    <g clip-path="url(#leafBodyClip2)">
      <line class="bot-vein" x1="32" y1="2"  x2="32"  y2="78" stroke="#4a8f40" stroke-width="1"   stroke-opacity=".6"/>
      <line class="bot-vein" x1="32" y1="22" x2="14"  y2="36" stroke="#4a8f40" stroke-width=".7"  stroke-opacity=".5"/>
      <line class="bot-vein" x1="32" y1="38" x2="10"  y2="50" stroke="#4a8f40" stroke-width=".6"  stroke-opacity=".4"/>
      <line class="bot-vein" x1="32" y1="52" x2="14"  y2="62" stroke="#4a8f40" stroke-width=".5"  stroke-opacity=".35"/>
      <line class="bot-vein" x1="32" y1="22" x2="50"  y2="36" stroke="#4a8f40" stroke-width=".7"  stroke-opacity=".5"/>
      <line class="bot-vein" x1="32" y1="38" x2="54"  y2="50" stroke="#4a8f40" stroke-width=".6"  stroke-opacity=".4"/>
      <line class="bot-vein" x1="32" y1="52" x2="50"  y2="62" stroke="#4a8f40" stroke-width=".5"  stroke-opacity=".35"/>
      <circle cx="14" cy="36" r="1.2" fill="#4a8f40" fill-opacity=".7"/>
      <circle cx="10" cy="50" r="1"   fill="#4a8f40" fill-opacity=".6"/>
      <circle cx="50" cy="36" r="1.2" fill="#4a8f40" fill-opacity=".7"/>
      <circle cx="54" cy="50" r="1"   fill="#4a8f40" fill-opacity=".6"/>
    </g>

    <!-- Yüz plakası -->
    <rect x="15" y="17" width="34" height="36" rx="8"
          fill="rgba(8,28,8,.75)" stroke="rgba(74,143,64,.5)" stroke-width=".8"/>

    <!-- Sol göz -->
    <circle cx="23" cy="29" r="5.5" fill="rgba(0,0,0,.8)" stroke="#3a7a34" stroke-width=".8"/>
    <circle class="bot-eye-glow" cx="23" cy="29" r="4" fill="url(#bgEyeGrad2)" filter="url(#botGlow2)"/>
    <circle cx="24.5" cy="27.5" r="1.2" fill="rgba(255,255,255,.6)"/>

    <!-- Sağ göz -->
    <circle cx="41" cy="29" r="5.5" fill="rgba(0,0,0,.8)" stroke="#3a7a34" stroke-width=".8"/>
    <circle class="bot-eye-glow" cx="41" cy="29" r="4" fill="url(#bgEyeGrad2)" filter="url(#botGlow2)"/>
    <circle cx="42.5" cy="27.5" r="1.2" fill="rgba(255,255,255,.6)"/>

    <!-- Ağız – normal ızgara -->
    <g class="bot-mouth-grid">
      <rect x="20" y="39" width="24" height="9" rx="4"
            fill="rgba(0,0,0,.6)" stroke="rgba(74,143,64,.4)" stroke-width=".6"/>
      <line x1="24" y1="39" x2="24" y2="48" stroke="rgba(74,143,64,.3)" stroke-width=".5"/>
      <line x1="28" y1="39" x2="28" y2="48" stroke="rgba(74,143,64,.3)" stroke-width=".5"/>
      <line x1="32" y1="39" x2="32" y2="48" stroke="rgba(74,143,64,.3)" stroke-width=".5"/>
      <line x1="36" y1="39" x2="36" y2="48" stroke="rgba(74,143,64,.3)" stroke-width=".5"/>
      <line x1="40" y1="39" x2="40" y2="48" stroke="rgba(74,143,64,.3)" stroke-width=".5"/>
    </g>

    <!-- Ağız – konuşma (varsayılan gizli) -->
    <ellipse class="bot-mouth-open" cx="32" cy="43" rx="8" ry="5"
             fill="rgba(0,0,0,.8)" stroke="#4a8f40" stroke-width=".8"
             style="display:none"/>
    <ellipse class="bot-mouth-open" cx="32" cy="41" rx="5" ry="2.5"
             fill="#1a4a18" style="display:none"/>

    <!-- Anten -->
    <line x1="32" y1="2" x2="32" y2="-14" stroke="#4a8f40" stroke-width="1.6" stroke-linecap="round"/>
    <circle class="bot-antenna-light" cx="32" cy="-16" r="3.5" fill="#6dbf67" filter="url(#botGlow2)"/>
    <circle cx="32" cy="-16" r="2" fill="#a5d6a7"/>
  </g>
</svg>`;


/* ════════════════════════════════════════════════════════
   🌿 NATURE.CO SVG İKON SİSTEMİ v3.0
   Tüm emoji karakterlerini keskin SVG ikonlarla değiştirir
════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── Renk paleti (fallback: bot.js yüklenmemişse buradan al) ── */
window.C = window.C || {
  em: '#10b981', em2:'#34d399', tl: '#0d9488',
  mu: 'rgba(148,200,188,0.65)', hi: '#e8fdf8',
  rd: '#f87171', yw: '#fbbf24', bl: '#60a5fa',
  pu: '#a78bfa', or: '#fb923c', pk: '#f472b6',
  wh: 'rgba(255,255,255,0.85)', cy: '#67e8f9',
};
const C = window.C;

/* ── SVG builder ── */

const svg = (w, h, content, extra='') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-flex;vertical-align:middle;flex-shrink:0;${extra}">${content}</svg>`;

const filled = (d, color) => `<path d="${d}" fill="${color}" stroke="none"/>`;
const path   = (d, color, sw='1.75') => `<path d="${d}" stroke="${color}" stroke-width="${sw}" fill="none"/>`;
const circle = (cx,cy,r, color, fill='none') => `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${color}" fill="${fill}"/>`;
const line   = (x1,y1,x2,y2,color) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}"/>`;
const rect   = (x,y,w,h,rx, color, fill='none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" stroke="${color}" fill="${fill}"/>`;
const poly   = (pts, color, fill='none') => `<polygon points="${pts}" stroke="${color}" fill="${fill}"/>`;
const g      = (content) => `<g>${content}</g>`;


/* ── İkon Kütüphanesi ── */

const ICONS = window.ICONS = {
  // ─── Navigasyon ───
  '💬': svg(20,20, path('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', C.em)),
  '🏠': svg(20,20, path('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', C.em)+path('M9 22V12h6v10',C.em)),
  '🌿': svg(20,20, filled('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z', C.em)),
  '👤': svg(20,20, circle(12,8,4,C.em)+path('M6 20v-2a6 6 0 0 1 12 0v2',C.em)),
  '👥': svg(20,20, circle(9,7,4,C.em)+path('M3 21v-2a4 4 0 0 1 4-4h4',C.em)+circle(17,9,3,C.em2,'none')+path('M21 21v-2a3 3 0 0 0-3-3h-2',C.em2)),
  '🔔': svg(20,20, path('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9',C.em)+path('M13.73 21a2 2 0 0 1-3.46 0',C.em)),
  '🎮': svg(20,20, rect(2,6,20,12,4,C.em)+path('M6 12h4m-2-2v4',C.em)+circle(16,10,1,C.em,C.em)+circle(18,13,1,C.em,C.em)),
  '🏆': svg(20,20, path('M8 21h8m-4-4v4',C.yw)+path('M7 4H4a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4',C.yw)+path('M17 4h3a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4',C.yw)+path('M7 4h10v7a5 5 0 0 1-10 0V4z',C.yw)),
  '📢': svg(20,20, path('M11 5L6 9H2v6h4l5 4V5z',C.em)+path('M19.07 4.93a10 10 0 0 1 0 14.14',C.mu)+path('M15.54 8.46a5 5 0 0 1 0 7.07',C.em)),
  '📋': svg(20,20, rect(9,2,6,4,1,C.em)+path('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',C.em)+path('M9 12h6m-6 4h4',C.em)),
  '⚙️': svg(20,20, circle(12,12,3,C.mu)+path('M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',C.mu)),
  '🔍': svg(18,18, circle(11,11,8,C.mu)+path('M21 21l-4.35-4.35',C.mu)),
  '✕': svg(16,16, path('M18 6L6 18M6 6l12 12',C.mu,'2')),
  '✓': svg(16,16, path('M20 6L9 17l-5-5',C.em,'2.5')),
  '✓✓': svg(20,16, path('M18 6L7 17l-3-3m6 2l9-11',C.em,'2')),

  // ─── Chat & Mesaj ───
  '📎': svg(18,18, path('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',C.mu)),
  '😊': svg(20,20, circle(12,12,10,C.yw)+path('M8 14s1.5 2 4 2 4-2 4-2',C.yw)+line(9,9,9,9.01,C.yw)+line(15,9,15,9.01,C.yw)),
  '🎙️': svg(18,18, rect(9,3,6,10,3,C.em)+path('M5 11a7 7 0 0 0 14 0',C.em)+path('M12 18v3m-3 0h6',C.em)),
  '🖼️': svg(18,18, rect(3,3,18,18,2,C.mu)+circle(8.5,8.5,1.5,C.yw,C.yw)+path('M21 15l-5-5L5 21',C.mu)),
  '📷': svg(18,18, path('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z',C.mu)+circle(12,13,4,C.em)),
  '🔇': svg(18,18, path('M11 5L6 9H2v6h4l5 4V5z',C.rd)+path('M23 9l-6 6M17 9l6 6',C.rd)),
  '📞': svg(18,18, path('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12 19.79 19.79 0 0 1 1.23 3.53 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',C.em)),
  '✏️': svg(16,16, path('M12 20h9',C.mu)+path('M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',C.yw)),
  '🗑️': svg(16,16, path('M3 6h18m-2 0l-1 14H6L5 6',C.rd)+path('M8 6V4h8v2',C.rd)+line(10,11,10,17,C.rd)+line(14,11,14,17,C.rd)),
  '📌': svg(16,16, path('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z',C.rd)+circle(12,10,3,C.hi)),
  '⬆️': svg(14,14, path('M12 19V5m-7 7 7-7 7 7',C.em,'2.5')),
  '↩️': svg(16,16, path('M9 14L4 9l5-5',C.mu)+path('M20 20v-7a4 4 0 0 0-4-4H4',C.mu)),
  '➤': svg(16,16, path('M5 3l14 9-14 9V3z',C.hi,'none')+filled('M5 3l14 9-14 9V3z',C.hi)),
  '▶': svg(12,12, filled('M6 3l12 9-12 9V3z',C.em)),
  '⏸': svg(14,14, rect(6,4,4,16,1,C.em,C.em)+rect(14,4,4,16,1,C.em,C.em)),
  '⏭': svg(14,14, path('M5 4l9 8-9 8V4zm9 0l9 8-9 8V4z',C.em,C.em)+filled('M5 4l9 8-9 8V4zm9 0l9 8-9 8V4z',C.em)),

  // ─── Durum / Bildirim ───
  '🔴': svg(12,12, circle(6,6,5,C.rd,C.rd)),
  '🟢': svg(12,12, circle(6,6,5,C.em,C.em)),
  '🟡': svg(12,12, circle(6,6,5,C.yw,C.yw)),
  '🔵': svg(12,12, circle(6,6,5,C.bl,C.bl)),
  '⚡': svg(16,16, filled('M13 2L4.5 13.5H11L9 22l9.5-12H13L13 2z',C.yw)),
  '🔒': svg(16,16, rect(3,11,18,11,2,C.mu)+path('M7 11V7a5 5 0 0 1 10 0v4',C.mu)),
  '🔓': svg(16,16, rect(3,11,18,11,2,C.em)+path('M7 11V7a5 5 0 0 1 9.9-1',C.em)),
  '👑': svg(20,18, path('M12 2l2.4 7.4L22 7l-3 9H5L2 7l7.6 2.4L12 2z',C.yw,C.yw)+filled('M12 2l2.4 7.4L22 7l-3 9H5L2 7l7.6 2.4L12 2z',C.yw),`opacity:.9`),
  '🌟': svg(18,18, path('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',C.yw,C.yw)+filled('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',C.yw)),
  '⭐': svg(16,16, path('M12 2l2.4 7.4L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',C.yw)+filled('M12 2l2.4 7.4L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',C.yw)),
  '❤️': svg(18,18, path('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',C.rd)+filled('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',C.rd)),
  '💚': svg(16,16, path('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',C.em)+filled('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',C.em)),
  '👍': svg(16,16, path('M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z',C.bl)+path('M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',C.bl)),
  '👎': svg(16,16, path('M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z',C.rd)+path('M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17',C.rd)),
  '😮': svg(16,16, circle(12,12,10,C.yw)+path('M8 14s1.5-2 4-2 4 2 4 2',C.yw)+circle(9,9,1,C.yw,C.yw)+circle(15,9,1,C.yw,C.yw)),
  '😂': svg(16,16, circle(12,12,10,C.yw)+path('M8 15s1.5 2 4 2 4-2 4-2',C.yw)+path('M8 9c.5-1 1.5-1 2 0m4 0c.5-1 1.5-1 2 0',C.yw)),
  '🔥': svg(16,16, path('M12 2c0 6-5 8-5 14a5 5 0 0 0 10 0c0-5-5-8-5-14zm0 0c0 4 3 6 3 9a3 3 0 0 1-6 0c0-3 3-5 3-9z',C.or)+filled('M12 5c0 3 2 5 2 8a2 2 0 0 1-4 0c0-3 2-5 2-8z',C.yw)),

  // ─── Admin / Panel ───
  '🛡️': svg(18,18, path('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',C.bl)),
  '📊': svg(18,18, line(18,20,18,10,C.em)+line(12,20,12,4,C.em)+line(6,20,6,14,C.em)),
  '📈': svg(18,18, path('M22 12l-4-4-4 4-4-4L4 14',C.em)+path('M4 20v-6',C.mu)+path('M20 20v-8',C.mu)),
  '🗓️': svg(16,16, rect(3,4,18,18,2,C.mu)+path('M16 2v4M8 2v4M3 10h18',C.mu)+path('M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01',C.em,'2.5')),
  '📝': svg(16,16, path('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',C.mu)+path('M14 2v6h6m-4 5H8m8 4H8m2-8H8',C.em)),
  '⚠️': svg(18,18, path('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',C.yw)+line(12,9,12,13,C.yw,'2.5')+line(12,17,12.01,17,C.yw,'2.5')),
  '🌐': svg(16,16, circle(12,12,10,C.bl)+path('M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',C.bl)+path('M2 12h20',C.bl)),
  '🤖': svg(20,20, rect(3,11,18,11,2,C.em)+rect(7,4,10,7,2,C.em)+circle(9,15,1.5,C.em2,C.em2)+circle(15,15,1.5,C.em2,C.em2)+path('M9.5 8H7m3.5 0h3m3.5 0H14',C.em)),
  '💡': svg(16,16, path('M9 21h6m-3-3v-4',C.yw)+path('M12 2a7 7 0 0 1 5 11.9 7 7 0 0 1-10 0A7 7 0 0 1 12 2z',C.yw)),
  '📧': svg(16,16, rect(2,4,20,16,2,C.mu)+path('M22 7l-10 7L2 7',C.em)),
  '🔗': svg(16,16, path('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',C.bl)+path('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',C.bl)),
  '➕': svg(14,14, path('M12 5v14M5 12h14',C.em,'2.5')),
  '✖': svg(14,14, path('M18 6L6 18M6 6l12 12',C.rd,'2.5')),
  '🔄': svg(16,16, path('M1 4v6h6',C.bl)+path('M23 20v-6h-6',C.bl)+path('M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15',C.bl)),

  // ─── Doğa / Tema ───
  '🌱': svg(16,16, path('M12 22V12m0 0a6 6 0 0 1 6-6c0 3.31-2.69 6-6 6zm0 0a6 6 0 0 0-6-6c0 3.31 2.69 6 6 6z',C.em)),
  '🌙': svg(16,16, path('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',C.yw,C.yw)+filled('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',C.yw,'opacity:.8')),
  '☀️': svg(16,16, circle(12,12,5,C.yw)+path('M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',C.yw)),
  '❄️': svg(16,16, path('M2 12h20M12 2v20m-4.24-4.24 8.48-11.52m0 11.52-8.48-11.52',C.cy,'2')),
  '🎵': svg(16,16, path('M9 18V5l12-2v13',C.em)+circle(6,18,3,C.em)+circle(18,16,3,C.em)),
  '🎨': svg(16,16, path('M12 2a10 10 0 0 0 0 20c.6 0 1-.4 1-1v-1c0-.5.4-1 1-1 5.5 0 8-4 8-9A9 9 0 0 0 12 2z',C.pk)+circle(8.5,9.5,1.5,C.hi,C.hi)+circle(14,8,1.5,C.yw,C.yw)+circle(15.5,13.5,1.5,C.bl,C.bl)),
  '🕐': svg(16,16, circle(12,12,10,C.mu)+path('M12 6v6l4 2',C.em)),
  '📡': svg(18,18, path('M5.03 9.5a8.5 8.5 0 0 0 0 5m5.97-9.5a3.5 3.5 0 0 0 0 14',C.bl)+path('M1.42 2.82a19 19 0 0 0 0 18.36M22.58 2.82a19 19 0 0 0 0 18.36',C.mu)+circle(12,12,3,C.em,C.em)),

  // ─── Profil ───
  '🧬': svg(18,18, path('M12 2c-1.5 3-3 4.5-3 7s1.5 4 3 7m0-14c1.5 3 3 4.5 3 7s-1.5 4-3 7',C.pu)+line(9,7,15,7,C.mu)+line(9,17,15,17,C.mu)+line(8,12,16,12,C.em)),
  '🌿': svg(18,18, path('M6 3v12',C.em)+path('M18 9a6 6 0 0 1-6 6H6',C.em)+circle(6,9,3,C.em2)+path('M6 15v6',C.em)),
  '🏅': svg(16,16, circle(12,8,6,C.yw)+path('M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32',C.yw)),
  '🎭': svg(16,16, path('M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10S2 17.5 2 12z',C.or)+path('M7 9c.5-1 1.5-1 2 0m6 0c.5-1 1.5-1 2 0M7 15s1 2 5 2 5-2 5-2',C.or)),

  // ─── Oyunlar ───
  '🏈': svg(16,16, path('M12 2c-5.5 0-9 3.5-9 9s3.5 9 9 9 9-3.5 9-9-3.5-9-9-9z',C.or)+path('M7 7l10 10M17 7L7 17m0-5h10M12 7v10',C.wh)),
  '🎯': svg(16,16, circle(12,12,10,C.rd)+circle(12,12,6,C.wh,C.wh)+circle(12,12,2,C.rd,C.rd)),
  '🎲': svg(16,16, rect(2,2,20,20,4,C.mu)+circle(8,8,1.5,C.wh,C.wh)+circle(16,8,1.5,C.wh,C.wh)+circle(8,16,1.5,C.wh,C.wh)+circle(16,16,1.5,C.wh,C.wh)+circle(12,12,1.5,C.wh,C.wh)),
  '🏋': svg(16,16, path('M6 18l-2-2V8l2-2m12 12 2-2V8l-2-2m-5 2v12',C.em)+path('M9 6h6m-3 0v12',C.em,'2.5')),
  '💣': svg(16,16, circle(11,13,7,C.hi,C.hi)+path('M11 4c2-2 5-1 6 2m-8-2 2-2 1 1',C.mu)),

  // ─── Forum / İçerik ───
  '📰': svg(16,16, path('M4 22h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z',C.mu)+path('M10 12h6m-6 4h6m-6-8h6',C.em)),
  '🔖': svg(14,14, path('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',C.em)),
  '💬': svg(18,18, path('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',C.em)),
  '💭': svg(18,18, path('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',C.mu)+circle(9,10,1,C.em,C.em)+circle(12,10,1,C.em,C.em)+circle(15,10,1,C.em,C.em)),

  // ─── Misc ───
  '📤': svg(16,16, path('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',C.em)+path('M17 8l-5-5-5 5m5-5v12',C.em)),
  '📥': svg(16,16, path('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',C.em)+path('M7 10l5 5 5-5m-5 5V3',C.em)),
  '🚀': svg(18,18, path('M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z',C.em)+path('M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',C.em)+path('M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',C.em2)),
  '💾': svg(16,16, path('M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',C.bl)+path('M17 21v-8H7v8M7 3v5h8',C.bl)),
  '🔑': svg(16,16, circle(7.5,15.5,5.5,C.yw)+path('M10.85 12.85 19 5m-4 1 2 2',C.yw)),
  '📲': svg(16,16, rect(7,2,10,20,2,C.em)+path('M12 18h.01',C.em,'2.5')+path('M17 2l3 3-3 3m-6-3h6',C.mu)),
  '🌍': svg(16,16, circle(12,12,10,C.bl)+path('M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',C.bl)+path('M2 12h20',C.bl)),
  '🏃': svg(16,16, circle(13,4,2,C.em)+path('M7 22l4-8m-4-2l2-3m3-3l4 3m-4 5l-3 5',C.em,'2')+path('M15 9l2 2-4 3',C.em,'2')),
  '🧠': svg(16,16, path('M12 5a5 5 0 0 0-5 5c0 1.36.55 2.6 1.44 3.5H7a2 2 0 0 0-2 2v1h10v-1a2 2 0 0 0-2-2h-1.44A4.98 4.98 0 0 0 17 10a5 5 0 0 0-5-5z',C.pk)),
  '🏛': svg(16,16, rect(2,20,20,2,0,C.mu)+rect(4,8,2,12,0,C.mu)+rect(9,8,2,12,0,C.mu)+rect(14,8,2,12,0,C.mu)+rect(19,8,2,12,0,C.mu)+path('M2 8l10-6 10 6',C.em)),
  '🎓': svg(16,16, path('M22 10v6M2 10l10-5 10 5-10 5z',C.em)+path('M6 12v5c3 3 9 3 12 0v-5',C.em)),
  '💰': svg(16,16, circle(12,12,10,C.yw)+path('M14.31 8l-4.62 8M8 8h8m-1.38 5H9',C.hi)),
};


/* ── Replace text nodes with SVGs ── */

const SKIP_TAGS = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE','PRE','TITLE']);
const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{1F300}-\u{1F9FF}]/gu;

function replaceEmojisInNode(node) {
  if (node.nodeType === 3) { // TEXT_NODE
    const text = node.textContent;
    if (!EMOJI_RE.test(text)) return;
    EMOJI_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, match;
    EMOJI_RE.lastIndex = 0;
    while ((match = EMOJI_RE.exec(text)) !== null) {
      const em = match[0];
      const svgStr = ICONS[em];
      if (!svgStr) continue;
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      const span = document.createElement('span');
      span.className = 'nc-icon';
      span.innerHTML = svgStr;
      span.style.cssText = 'display:inline-flex;align-items:center;vertical-align:middle;';
      frag.appendChild(span);
      last = match.index + em.length;
    }
    if (last === 0) return;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  } else if (node.nodeType === 1) {
    if (SKIP_TAGS.has(node.tagName)) return;
    // Don't recurse into already-processed spans
    if (node.classList && node.classList.contains('nc-icon')) return;
    Array.from(node.childNodes).forEach(replaceEmojisInNode);
  }
}
window.replaceEmojisInNode = replaceEmojisInNode;


/* ── Tab bar icons (SVG replacement for tab-ic) ── */

const TAB_SVG_MAP = {
  'home':    ICONS['🏠'],
  'rooms':   ICONS['📢'],
  'chat':    ICONS['💬'],
  'forum':   ICONS['📋'],
  'profile': ICONS['👤'],
  'friends': ICONS['👥'],
  'games':   ICONS['🎮'],
  'notif':   ICONS['🔔'],
  'tv':      svg(20,20, rect(2,3,20,15,2,C.em)+path('M8 21h8m-4-3v3',C.em)),
};

function injectTabIcons() {
  document.querySelectorAll('.tab').forEach(tab => {
    const ic = tab.querySelector('.tab-ic');
    if (!ic) return;
    const t = ic.textContent.trim();
    // If it's an emoji we have an SVG for, replace it
    const svgStr = ICONS[t];
    if (svgStr) {
      ic.innerHTML = '';
      ic.insertAdjacentHTML('beforeend', svgStr);
      ic.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:0;';
    }
  });
}
window.injectTabIcons = injectTabIcons;


})();


/* ═══════════════════════════════════════════════════
   🎨 UI UPGRADE PACK
   1. Profil Glass Drawer
   2. NatureBot Voice Widget Enhancement
   3. iOS Widget Panel
   4. Forum Card Glassmorphism
═══════════════════════════════════════════════════ */



/* ── 1. PROFİL GLASS DRAWER ── */

/* ── UI Upgrade Pack CSS + HTML Enjeksiyonu ── */
(function injectUIUpgradePack(){
  const s = document.createElement('style');
  s.textContent = `
#profileDrawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 300px; max-width: 92vw;
  background: rgba(20,22,28,0.75);
  backdrop-filter: blur(28px) saturate(1.4);
  -webkit-backdrop-filter: blur(28px) saturate(1.4);
  border-left: 1px solid rgba(255,255,255,0.1);
  box-shadow: -16px 0 48px rgba(0,0,0,0.5);
  z-index: 8500;
  display: flex; flex-direction: column;
  padding: 0 0 24px;
  transform: translateX(105%);
  transition: transform .32s cubic-bezier(.4,0,.2,1);
  overflow-y: auto;
  overflow-x: hidden;
}
#profileDrawer.open { transform: translateX(0); }
#profileDrawerOverlay {
  position: fixed; inset: 0; z-index: 8499;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  opacity: 0; pointer-events: none;
  transition: opacity .3s;
}
#profileDrawerOverlay.open { opacity: 1; pointer-events: auto; }
.pdr-header { padding: 20px 20px 0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.pdr-close { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; font-size: .85rem; transition: background .15s; }
.pdr-close:hover { background: rgba(255,255,255,0.14); }
.prof-av-ring.neon-glow { box-shadow: none; }
.pdr-nav { padding: 0 12px; }
.pdr-nav .prof-act { border-radius: 12px; }
.pdr-nav .prof-act:hover { background: rgba(255,255,255,0.07); }
.pdr-divider { height: 1px; background: var(--border); margin: 8px 20px; }
.forum-card { background: rgba(255,255,255,0.045) !important; backdrop-filter: blur(16px) saturate(1.2) !important; -webkit-backdrop-filter: blur(16px) !important; border: 1px solid rgba(255,255,255,0.09) !important; border-radius: 16px !important; transition: all .22s cubic-bezier(.4,0,.2,1) !important; box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
.forum-card:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(var(--glow-rgb,91,155,213),0.3) !important; box-shadow: 0 8px 40px rgba(0,0,0,0.4), 0 0 30px rgba(var(--glow-rgb,91,155,213),0.06) !important; transform: translateY(-2px); }
.forum-card-img { width: calc(100% + 28px); margin: -14px -14px 12px; height: 160px; object-fit: cover; border-radius: 14px 14px 0 0; display: block; }
.forum-card-img-emoji { width: calc(100% + 28px); margin: -14px -14px 12px; height: 120px; display: flex; align-items: center; justify-content: center; font-size: 2.8rem; border-radius: 14px 14px 0 0; }
.forum-card-cat { background: rgba(var(--glow-rgb,91,155,213),0.12) !important; border-color: rgba(var(--glow-rgb,91,155,213),0.25) !important; color: var(--accent) !important; }
  `;
  document.head.appendChild(s);

  // HTML enjeksiyonu
  const html = `
<div id="profileDrawerOverlay" onclick="closeProfileDrawer()"></div>
<div id="profileDrawer">
  <div class="pdr-header">
    <div style="font-size:.7rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;">Profilim</div>
    <div class="pdr-close" onclick="closeProfileDrawer()">✕</div>
  </div>
  <div style="padding:20px 20px 16px;text-align:center;">
    <div class="prof-av-wrap" style="display:inline-block;cursor:pointer;position:relative;" onclick="triggerPhotoUpload()">
      <div class="prof-av-ring" id="drawerAvatar" style="width:80px;height:80px;border-radius:20px;font-size:2rem;margin:0 auto;"></div>
      <div class="prof-status-dot"></div>
    </div>
    <div class="prof-display-name" id="drawerName" style="margin-top:10px;"></div>
    <div class="prof-handle" id="drawerHandle"></div>
  </div>
  <div class="prof-stat-row" style="margin:0 16px 16px;">
    <div class="prof-stat"><span class="prof-stat-num" id="drawerMsgCount">—</span><span class="prof-stat-lbl">Mesaj</span></div>
    <div class="prof-stat"><span class="prof-stat-num" id="drawerFriendCount">—</span><span class="prof-stat-lbl">Arkadaş</span></div>
    <div class="prof-stat"><span class="prof-stat-num" id="drawerJoinDate">—</span><span class="prof-stat-lbl">Katılım</span></div>
  </div>
  <div class="pdr-divider"></div>
  <nav class="pdr-nav" style="padding:8px 12px;">
    <div class="prof-act" onclick="closeProfileDrawer();switchMainTab&&switchMainTab('profile')"><div class="prof-act-ic">👤</div><div class="prof-act-lb">Profil Sayfam</div></div>
    <div class="prof-act" onclick="closeProfileDrawer();switchProfTab&&switchProfTab('appearance')"><div class="prof-act-ic">🎨</div><div class="prof-act-lb">Görünüm & Tema</div></div>
    <div class="prof-act" onclick="closeProfileDrawer();switchProfTab&&switchProfTab('sounds')"><div class="prof-act-ic">🔔</div><div class="prof-act-lb">Bildirimler & Sesler</div></div>
    <div class="prof-act" onclick="closeProfileDrawer();switchMainTab&&switchMainTab('games')"><div class="prof-act-ic">🎮</div><div class="prof-act-lb">Oyunlarım</div></div>
    <div class="prof-act" onclick="closeProfileDrawer();switchProfTab&&switchProfTab('account')"><div class="prof-act-ic">⚙️</div><div class="prof-act-lb">Hesap Ayarları</div></div>
  </nav>
  <div class="pdr-divider"></div>
  <div class="pdr-nav" style="padding:8px 12px;">
    <div class="prof-act danger" onclick="closeProfileDrawer();typeof logout==='function'&&logout()"><div class="prof-act-ic">🚪</div><div class="prof-act-lb">Çıkış Yap</div></div>
  </div>
</div>
<div id="widgetsPanel">
  <div class="ios-widget"><div class="ios-widget-label">⏰ Saat</div><div class="w-clock-time" id="wpClock">--:--</div><div class="w-clock-date" id="wpDate"></div></div>
  <div class="ios-widget"><div class="ios-widget-label">👥 Aktif Kullanıcılar</div><div class="w-online-count"><div class="w-online-dot"></div><span id="wpOnlineCount">—</span></div><div class="w-online-bar"><div class="w-online-fill" id="wpOnlineBar" style="width:0%"></div></div><div class="w-online-sub">Şu an çevrimiçi</div></div>
  <div class="ios-widget"><div class="ios-widget-label">☁️ Hava Durumu</div><div class="w-weather-main"><div class="w-weather-icon">🌤️</div><div><div class="w-weather-temp" id="wpTemp">—°</div><div class="w-weather-desc" id="wpWeatherDesc">/hava [şehir] yazarak sorgula</div></div></div><div class="w-weather-details"><div class="w-weather-detail" id="wpHumidity">💧 —%</div><div class="w-weather-detail" id="wpWind">💨 — km/s</div></div></div>
</div>`;
  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', html);
  });
})();
