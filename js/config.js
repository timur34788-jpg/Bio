const FB_SERVERS = {
  sohbet: {
    label: 'Biyom Business',
    icon: '🌐',
    color: '#5b9bd5',
    description: 'Genel sohbet odaları',
    config: {
      apiKey:"AIzaSyCHQwiv2ylnm12nYejLd2TOI1agHZ6cD6U",
      authDomain:"layla-d3710.firebaseapp.com",
      databaseURL:"https://layla-d3710-default-rtdb.europe-west1.firebasedatabase.app",
      projectId:"layla-d3710",
      storageBucket:"layla-d3710.firebasestorage.app",
      messagingSenderId:"750610889276",
      appId:"1:750610889276:web:b414f7ed165ff7b1dda139",
      measurementId:"G-V46C4Y02WS"
    }
  }
};

/* Tek sunucu — otomatik seçildi */
let _activeServer = 'sohbet';
let FB_CONFIG = FB_SERVERS.sohbet.config;
let _FB_REST = FB_SERVERS.sohbet.config.databaseURL;

const ADMIN_USERNAME = 'admin1';

const LOCAL_USERS = {
  sohbet: {
    admin1: {
      username: 'admin1',
      passwordHash: 'fd65cf3469d1b1d461561fabcc8ef0d8ac91549f4934bf2ea777ce9d128e02e4',
      isAdmin: true,
      banned: false,
      createdAt: 1709460000000,
      email: ''
    },
    'İnci': {
      username: 'İnci',
      passwordHash: '9e68e195b6b1381d481fa4170b26bee560e4d8449855bd33ab07651f1039a074',
      isAdmin: false,
      banned: false,
      createdAt: 1234567890,
      email: 'timurhanhz3@gmail.com'
    }
  }
};

function getLocalUsers() { return LOCAL_USERS[_activeServer] || {}; }
function getLocalUser(username) { return getLocalUsers()[username] || null; }

let _customGameImages = {};
function _cgiCacheKey(){ return 'sohbet_gameImages_' + (_activeServer||''); }
function _loadCgiCache(){
  try{
    const raw = localStorage.getItem(_cgiCacheKey());
    if(raw) _customGameImages = JSON.parse(raw);
  }catch(e){ _customGameImages = {}; }
}
function _saveCgiCache(){
  try{ localStorage.setItem(_cgiCacheKey(), JSON.stringify(_customGameImages)); }catch(e){}
}
async function loadCustomGameImages(){
  _loadCgiCache();
  try{
    const data = await fbRestGet('settings/gameImages');
    if(data && typeof data==='object'){ _customGameImages=data; _saveCgiCache(); }
  }catch(e){
    try{ const s=await dbRef('settings/gameImages').once('value'); const d=s.val(); if(d&&typeof d==='object'){_customGameImages=d;_saveCgiCache();} }catch(e2){}
  }
  try{ dbRef('settings/gameImages').on('value',s=>{ const d=s.val(); if(d&&typeof d==='object'){_customGameImages=d;_saveCgiCache();} }); }catch(e){}
}


/* ── Admin tarafından eklenen oyunlar ── */

let _customGames = [];
function _cgCacheKey(){ return 'sohbet_customGames_' + (_activeServer||''); }
function _loadCgCache(){
  try{
    const raw = localStorage.getItem(_cgCacheKey());
    if(raw) _customGames = JSON.parse(raw);
  }catch(e){ _customGames = []; }
}
function _saveCgCache(){
  try{ localStorage.setItem(_cgCacheKey(), JSON.stringify(_customGames)); }catch(e){}
}
async function loadCustomGames(){
  _loadCgCache();
  try{
    const data = await fbRestGet('settings/customGames');
    if(data && typeof data === 'object'){
      _customGames = Object.entries(data).map(([id,g])=>({...g, id, _custom:true}));
      _saveCgCache();
    } else {
      _customGames = [];
    }
  }catch(e){}
}
function allGames(){
  return [...GAME_CATALOG, ..._customGames];
}

const _mainScreenIds={home:'roomsScreen',msgs:'msgsScreen',forum:'forumScreen',friends:'friendsScreen',profile:'profileScreen',games:'gamesScreen',watch:'watchScreen',liveroom:'liveRoomScreen'};
let _activeMainTab='home';

function switchMainTab(tab){
  _activeMainTab=tab;
  // Track last mobile tab for orientation restore
  if(['home','forum','watch','msgs','friends'].includes(tab)) {
    if(typeof _lastMobileTab !== 'undefined') _lastMobileTab = tab;
  }
  if(typeof _updateURL === 'function') _updateURL(tab);
  // Hide all screens except login/chat/admin
  ['roomsScreen','forumScreen','msgsScreen','friendsScreen','profileScreen','chatScreen','adminPanel','gamesScreen','watchScreen','liveRoomScreen'].forEach(id=>{
    var el=document.getElementById(id);
    if(el){ el.classList.remove('active'); el.style.display=''; }
  });
  // Show target screen
  var targetId=_mainScreenIds[tab]||'roomsScreen';
  var el=document.getElementById(targetId);
  if(el) el.classList.add('active');
  // Update tab bar active indicator
  var tabMap={home:'tabHome',forum:'tabForum',msgs:'tabMsgs',friends:'tabFriends',profile:'tabProfile',games:'tabGames',watch:'tabWatch',liveroom:'tabLiveRoom'};
  document.querySelectorAll('.tab-bar .tab').forEach(function(t){t.classList.remove('act');});
  var atId=tabMap[tab];
  if(atId){var at=document.getElementById(atId);if(at)at.classList.add('act');}
  // Tab specific actions
  if(tab==='forum'){
    var fav=document.getElementById('forumMyAv');
    if(fav&&_cu) setAvatar(fav,_cu);
    var fAv2=document.getElementById('forumAvatar');
    if(fAv2&&_cu) setAvatar(fAv2,_cu);
    loadForum();
  }
  if(tab!=='forum'&&_forumStop){_forumStop();_forumStop=null;}
  // NatureBot ev gösterimi
  const _nbHomeZone = document.getElementById('natureBotHomeZone');
  if (_nbHomeZone) _nbHomeZone.style.display = (tab === 'watch') ? 'flex' : 'none';
  // Robot: İzle sekmesine geçince mobilde eve git, diğerlerinde başlığa dön
  if (window._natureBotInstance) {
    if (window.innerWidth < 768) {
      const bot = window._natureBotInstance;
      if (tab === 'watch') {
        // Bot'u watchScreenBody'e TAŞIMA — loadWatchPanel innerHTML'i sıfırlar ve botu yok eder
        // Bunun yerine botu overlay olarak body'de tut
        bot.el.style.position = 'fixed';
        bot.el.style.left = '50%';
        bot.el.style.top = '30%';
        bot.el.style.transform = 'translateX(-50%)';
        bot.el.style.width = '64px';
        bot.el.style.height = '80px';
        bot.el.style.zIndex = '10';
        bot.el.style.pointerEvents = 'none';
        bot.isAtHome = true;
        bot.el.classList.add('at-home');
        if (!document.body.contains(bot.el)) document.body.appendChild(bot.el);
      } else {
        // Diğer sekmelerde header slotuna geri taşı
        const slot = document.getElementById('mobileRobotSlot');
        if (slot && !slot.contains(bot.el)) {
          slot.appendChild(bot.el);
          bot.el.style.position = 'relative';
          bot.el.style.left = 'auto';
          bot.el.style.top = 'auto';
          bot.el.style.transform = 'none';
          bot.el.style.width = '44px';
          bot.el.style.height = '54px';
          bot.isAtHome = false;
          bot.el.classList.remove('at-home');
        }
      }
    }
    window._natureBotInstance.recordInteraction();
  }
  if(tab==='msgs'){
    var ds=document.getElementById('dmSearch');
    var dl=document.getElementById('dmUserList');
    if(ds) ds.value='';
    if(dl) dl.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
    if(_db&&_cu) dbRef('users').once('value').then(function(snap){
      var users=snap.val()||{};
      _allUsers=Object.keys(users).filter(function(u){if(u===_cu||users[u].banned) return false; return true;});
      if(!_allUsers.length){if(dl)dl.innerHTML='<p style="color:var(--muted);padding:16px;font-size:.85rem;text-align:center">Henüz kullanıcı yok.</p>';return;}
      renderDMUsers(_allUsers);
    });
  }
  if(tab==='friends') switchFrTab(1);
  if(tab==='games'){ applyCustomGameImages(); loadGamesPanel(); }
  if(tab==='watch') loadWatchPanel();
  if(tab==='profile'){
    var av=document.getElementById('profAvBig');
    var pn=document.getElementById('profName');
    var hl=document.getElementById('profHandleLabel');
    var bn=document.getElementById('profBanner');
    if(av&&_cu) setAvatar(av,_cu);
    if(pn&&_cu) pn.textContent=_cu;
    if(hl&&_cu) hl.textContent='@'+_cu;
    if(bn&&_cu) bn.style.background='linear-gradient(135deg,'+strColor(_cu)+'aa 0%,var(--bg2) 100%)';
    var sd=document.querySelector('#profTabBody-profile .prof-status-dot');
    if(sd) sd.style.display='block';
    // joinDate Firebase'den yükle
    if(_db&&_cu){
      dbRef('users/'+_cu+'/createdAt').once('value').then(s=>{
        const jd=document.getElementById('profJoinDate');
        if(jd&&s.val()){
          const d=new Date(s.val());
          jd.textContent=d.toLocaleDateString('tr-TR',{month:'short',year:'numeric'});
        }
      }).catch(()=>{});
    }
    setTimeout(()=>{ switchProfTab('profile'); }, 50);
  }
  setTimeout(()=>applyTabIcons(true), 0);
}

let _stopMsg=null,_stopOnl=null,_hbTimer=null,_stopReads=null;
let _passwordHash='';
let _online={},_unread={},_lastMsg={},_reads={};
let _adminTab='users';


/* ── Hash ── */

// ── SHA-256 tabanlı güvenli hash (WebCrypto API) ──
async function hashStr(s){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
// Senkron fallback (eski hash - legacy uyumluluk için tutuldu)
function hashStrSync(s){
  let h=5381;
  for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0;
  return h.toString(16);
}


/* ── Eksik değişken tanımlamaları ── */
let _fbInitPromise = null;
let _cu = null;

/* ── Firebase Init ── */

async function fbInit(){
  // Zaten init ediliyorsa aynı promise'i döndür
  if(_fbInitPromise) return _fbInitPromise;
  _fbInitPromise = _fbInitInternal().finally(()=>{ _fbInitPromise=null; });
  return _fbInitPromise;
}
async function _fbInitInternal(){
  try{
    // Önceki app varsa önce sil, bekle
    if(firebase.apps.length){
      await Promise.all(firebase.apps.map(app=>app.delete().catch(()=>{})));
    }
    const a = firebase.initializeApp(FB_CONFIG);
    _db = firebase.database(a); window._db = _db;
    
    // Bağlantı durumunu izle
    try{ _db.ref('.info/connected').on('value',()=>{}); }catch(e){}
    return true;
  }catch(e){ console.error('fbInit hatası:', e); return false; }
}
function dbRef(p){ if(!_db) throw new Error("DB not ready"); return _db.ref(p); }
function wsPath(p){ return p; }


/* ── Sunucu Seçim Fonksiyonları ── */

function renderServerSelect(){ /* kaldırıldı — tek sunucu */ }

function selectServer(key){ /* kaldırıldı — tek sunucu */ }

/* Logout sonrası sunucu seçimine dön */
async function backToServerSelect(){ await (typeof doLogout==="function" ? doLogout() : Promise.resolve()); }

/* ── Sunucu Değiştirme Modal ── */


function goBackToServerSelect(){ if(typeof doLogout==="function") doLogout(); }
function showServerSwitchModal(){ /* tek sunucu — kaldırıldı */ }

async function _switchToServer(key){
  const modal = document.getElementById('_serverSwitchModal');
  if(modal) modal.remove();
  if(_stopMsg){_stopMsg();_stopMsg=null;}
  if(_stopOnl){_stopOnl();_stopOnl=null;}
  if(_stopFrReqs){_stopFrReqs();_stopFrReqs=null;}
  clearInterval(_hbTimer);
  if(_db&&_cu) dbRef('online/'+_cu).remove().catch(()=>{});
  _cu=null;_cRoom=null;_online={};_unread={};_isAdmin=false;
  // Firebase Auth kaldırıldı
  
  Object.values(_lastMsgListeners).forEach(s=>{try{s();}catch(e){}});
  Object.keys(_lastMsgListeners).forEach(k=>delete _lastMsgListeners[k]);
  await selectServer(key);
}

function onUsernameInput(){ hideLoginErr(); }
function showLoginErr(msg){const el=document.getElementById('loginErr');el.textContent=msg;el.classList.add('show');}
function hideLoginErr(){document.getElementById('loginErr').classList.remove('show');}

// loginNext/loginBack — tek adıma geçildi, uyumluluk için kaldı
function loginNext(){ submitLogin && submitLogin(); }
function loginBack(){ hideLoginErr && hideLoginErr(); }

/* ── Install Banners ── */

(function(){
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isDesktop = !isAndroid && !isIOS;

  function initBanners(){
    if(isDesktop) return; // masaüstünde gösterme
    const androidBanner = document.getElementById('androidInstallBanner');
    const iosBanner = document.getElementById('iosInstallBanner');
    if(isAndroid && androidBanner) androidBanner.style.display = 'block';
    if(isIOS && iosBanner) iosBanner.style.display = 'block';
  }

  // DOM hazır olunca
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initBanners);
  } else {
    initBanners();
  }
})();

function downloadAPK(){
  const btn = document.getElementById('apkDownloadBtn');
  if(!btn) return;
  btn.innerHTML = '<div style="width:12px;height:12px;border:2px solid rgba(0,26,8,0.3);border-top:2px solid #001a08;border-radius:50%;animation:spin .8s linear infinite"></div>İndiriliyor';
  btn.style.opacity = '0.8';
  btn.style.cursor = 'default';
  // APK indirmeyi başlat
  const a = document.createElement('a');
  a.href = 'https://natureco.me/app.apk';
  a.download = 'natureco.apk';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>{
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>İndirildi';
    btn.style.background = 'rgba(0,232,122,0.1)';
    btn.style.color = '#00e87a';
    btn.style.border = '1px solid rgba(0,232,122,0.25)';
    btn.style.boxShadow = 'none';
    btn.style.opacity = '1';
  }, 1500);
}

function toggleIOSSteps(){
  const steps = document.getElementById('iosSteps');
  const badges = document.getElementById('iosBadges');
  const btn = document.getElementById('iosHowBtn');
  if(!steps) return;
  const isOpen = steps.style.display !== 'none';
  steps.style.display = isOpen ? 'none' : 'block';
  if(badges) badges.style.display = isOpen ? 'flex' : 'none';
  if(btn){
    btn.textContent = isOpen ? 'Nasıl Yapılır?' : 'Kapat ✕';
    btn.style.background = isOpen ? 'linear-gradient(135deg,#5b9bd5,#3a7ab8)' : 'rgba(91,155,213,0.1)';
    btn.style.color = isOpen ? '#fff' : '#5b9bd5';
    btn.style.border = isOpen ? 'none' : '1px solid rgba(91,155,213,0.25)';
    btn.style.boxShadow = isOpen ? '0 4px 14px rgba(91,155,213,0.25)' : 'none';
  }
}

function showLoginTab(tab){
  // Giriş formunu step1'e sıfırla
  const s1=document.getElementById('loginStep1');
  const s2=document.getElementById('loginStep2');
  if(s1) s1.style.display='block';
  if(s2) s2.style.display='none';
  const p=document.getElementById('loginPass');
  if(p) p.value='';
  const isGiris = tab==='giris';
  document.getElementById('girisForm').style.display = isGiris?'block':'none';
  document.getElementById('tabGiris').style.background = isGiris?'var(--surface2)':'transparent';
  document.getElementById('tabGiris').style.color = isGiris?'var(--text-hi)':'var(--muted)';
  document.getElementById('tabKayit').style.background = isGiris?'transparent':'var(--surface2)';
  document.getElementById('tabKayit').style.color = isGiris?'var(--muted)':'var(--text-hi)';
  hideLoginErr();
  if(!isGiris){
    // Kayıt açık mı kontrol et
    document.getElementById('kayitForm').style.display='none';
    const closedMsg = document.getElementById('regClosedMsg');
    if(closedMsg) closedMsg.style.display='none';
    fbRestGet('settings/registration').then(val=>{
      const isOpen = !val || val === 'open';
      if(isOpen){
        document.getElementById('kayitForm').style.display='block';
      } else {
        if(closedMsg){
          // Diğer sunucuları göster
          const others = Object.entries(FB_SERVERS).filter(([k])=>k!==_activeServer);
          const othersEl = document.getElementById('regClosedOtherServers');
          if(othersEl && others.length){
            othersEl.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Diğer sunuculara göz atabilirsin:</div>' +
              others.map(([k,srv])=>`
                <button onclick="goBackToServerSelect()" 
                  style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;width:100%;text-align:left;">
                  <span style="font-size:24px">${srv.icon}</span>
                  <div>
                    <div style="font-weight:700;color:var(--text-hi);font-size:13px">${srv.label}</div>
                    <div style="font-size:11px;color:var(--muted)">${srv.description||''}</div>
                  </div>
                </button>
              `).join('');
          } else if(othersEl){
            othersEl.innerHTML='';
          }
          closedMsg.style.display='block';
        }
      }
    }).catch(()=>{
      // Hata durumunda formu göster
      document.getElementById('kayitForm').style.display='block';
    });
  } else {
    document.getElementById('kayitForm').style.display='none';
    const closedMsg = document.getElementById('regClosedMsg');
    if(closedMsg) closedMsg.style.display='none';
  }
}


/* ── Firebase REST yardımcıları (WebSocket yerine HTTP fetch - mobilde çok daha güvenilir) ── */

_FB_REST = FB_CONFIG.databaseURL; // auto-set

/* ── Firebase REST Auth Token Yardımcısı ── */

// Firebase Auth kaldırıldı — token gerekmez
async function getFbAuthToken(){ return null; }

async function fbRestGet(path, retries=3){
  const wpath = wsPath(path);
  for(let i=0;i<retries;i++){
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),8000);
    try{
      const r=await fetch(_FB_REST+'/'+wpath+'.json',{signal:ctrl.signal,cache:'no-store'});
      clearTimeout(t);
      if(r.status===401||r.status===403) return null;
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }catch(e){
      clearTimeout(t);
      if(i<retries-1 && e.name==='AbortError'){
        await new Promise(res=>setTimeout(res,1500));
        continue;
      }
      throw e;
    }
  }
}
async function fbRestSet(path,val, retries=3){
  const wpath = wsPath(path);
  for(let i=0;i<retries;i++){
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),8000);
    try{
      const r=await fetch(_FB_REST+'/'+wpath+'.json',{method:'PUT',body:JSON.stringify(val),headers:{'Content-Type':'application/json'},signal:ctrl.signal});
      clearTimeout(t);
      if(r.status===401||r.status===403) return null;
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }catch(e){
      clearTimeout(t);
      if(i<retries-1 && e.name==='AbortError'){
        await new Promise(res=>setTimeout(res,1500));
        continue;
      }
      throw e;
    }
  }
}



/* ══════════════════════════════════════════════
   🎮 ADMIN: OYUN GÖRSELLERI YÖNETİMİ
══════════════════════════════════════════════ */


/* ══════════════════════════════════════════════
   🎮 OYUN GÖRSELİ YÖNETİMİ — DOSYA YÜKLEME
   Görsele tıklanınca dosya seçici açılır,
   canvas ile 300x300'e küçültülür,
   base64 olarak Firebase Realtime DB'ye kaydedilir.
   Firebase Storage gerekmez.
══════════════════════════════════════════════ */


function loadAdminGames(){
  const body = document.getElementById('adminBody');
  body.innerHTML = '<p style="color:var(--muted);padding:20px;text-align:center;">Yükleniyor...</p>';

  Promise.all([
    adminRestGet('settings/gameImages').catch(()=>({})),
    adminRestGet('settings/customGames').catch(()=>({}))
  ]).then(([customImgsRaw, customGamesRaw]) => {
    const customImgs  = customImgsRaw  || {};
    const customGamesObj = customGamesRaw || {};
    const customGamesList = Object.entries(customGamesObj).map(([id,g])=>({...g,id}));

    const cats = [
      { id:'io',       label:'🌐 .io Oyunlar' },
      { id:'action',   label:'⚔️ Aksiyon' },
      { id:'racing',   label:'🏎️ Yarış' },
      { id:'strategy', label:'♟️ Strateji' },
    ];

    let html = '<div class="admin-section">';

    // ── Özel Oyunlar Yönetimi ──
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div class="admin-sec-title" style="margin:0">➕ Özel Oyunlarım</div>
      <button class="a-btn blue" onclick="showAddGameModal()" style="font-size:.78rem;padding:7px 14px;">+ Oyun Ekle</button>
    </div>`;

    if(customGamesList.length){
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:20px;">`;
      customGamesList.forEach(g => {
        const imgSrc = customImgs[g.id] || g.img || '';
        html += `<div class="admin-card" style="padding:12px;display:flex;gap:10px;align-items:flex-start;">
          <div style="flex-shrink:0;cursor:pointer;" onclick="document.getElementById('gfile-${g.id}').click()" title="Görsel değiştir">
            <input type="file" id="gfile-${g.id}" accept="image/*" style="display:none" onchange="uploadGameImage('${g.id}',this)">
            ${imgSrc
              ? `<img id="gimg-preview-${g.id}" src="${imgSrc}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;border:2px solid #22c55e;"
                  onerror="this.style.display='none';document.getElementById('gimg-emoji-${g.id}').style.display='flex';">
                 <div id="gimg-emoji-${g.id}" style="display:none;width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,${g.color||'#8e44ad'}cc,${g.color||'#8e44ad'}66);align-items:center;justify-content:center;font-size:1.6rem;">${g.icon||'🎮'}</div>`
              : `<img id="gimg-preview-${g.id}" style="display:none;width:56px;height:56px;border-radius:10px;object-fit:cover;">
                 <div id="gimg-emoji-${g.id}" style="display:flex;width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,${g.color||'#8e44ad'}cc,${g.color||'#8e44ad'}66);align-items:center;justify-content:center;font-size:1.6rem;">${g.icon||'🎮'}</div>`
            }
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.82rem;font-weight:800;color:var(--text-hi);">${esc(g.name)}</div>
            <div style="font-size:.68rem;color:var(--muted);margin-bottom:2px;">${esc(g.cat)} · ${esc(g.age||'0+')}</div>
            <div style="font-size:.65rem;color:var(--muted);word-break:break-all;margin-bottom:6px;">${esc(g.url)}</div>
            <button class="a-btn red" style="padding:3px 8px;font-size:.65rem;" onclick="deleteCustomGame('${g.id}')">🗑️ Sil</button>
          </div>
        </div>`;
      });
      html += `</div>`;
    } else {
      html += `<div style="background:var(--surface2);border:1px dashed var(--border);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <div style="font-size:1.8rem;margin-bottom:6px;">🎮</div>
        <div style="font-size:.8rem;color:var(--muted);">Henüz özel oyun eklenmedi.</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px;">Yukarıdaki "+ Oyun Ekle" butonunu kullanın.</div>
      </div>`;
    }

    html += `<div style="height:1px;background:var(--border);margin-bottom:20px;"></div>`;

    // ── Mevcut oyunların görsel yönetimi ──
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div class="admin-sec-title" style="margin:0">🎮 Oyun Görselleri</div>
      <div style="font-size:.75rem;color:var(--muted);">Görsele tıklayarak bilgisayarınızdan dosya yükleyin.</div>
    </div>`;

    cats.forEach(cat => {
      const games = GAME_CATALOG.filter(g => g.cat === cat.id);
      if(!games.length) return;
      html += `<div style="margin-bottom:24px;">
        <div style="font-size:.75rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">${cat.label}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">`;

      games.forEach(g => {
        const hasCustom = !!customImgs[g.id];
        const imgSrc = customImgs[g.id] || g.img || '';
        html += `<div class="admin-card" style="padding:10px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;position:relative;"
            onclick="document.getElementById('gfile-${g.id}').click()" title="Görsel yükle">
          <input type="file" id="gfile-${g.id}" accept="image/*" style="display:none" onchange="uploadGameImage('${g.id}',this)">
          <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
            ${imgSrc
              ? `<img id="gimg-preview-${g.id}" src="${imgSrc}" alt="${g.name}"
                  style="width:80px;height:80px;border-radius:14px;object-fit:cover;border:2px solid ${hasCustom?'#22c55e':'var(--border)'};"
                  onerror="this.style.display='none';document.getElementById('gimg-emoji-${g.id}').style.display='flex';">
                <div id="gimg-emoji-${g.id}" style="display:none;width:80px;height:80px;border-radius:14px;background:linear-gradient(135deg,${g.color}cc,${g.color}66);align-items:center;justify-content:center;font-size:2.2rem;">${g.icon}</div>`
              : `<img id="gimg-preview-${g.id}" style="display:none;width:80px;height:80px;border-radius:14px;object-fit:cover;">
                 <div id="gimg-emoji-${g.id}" style="display:flex;width:80px;height:80px;border-radius:14px;background:linear-gradient(135deg,${g.color}cc,${g.color}66);align-items:center;justify-content:center;font-size:2.2rem;">${g.icon}</div>`
            }
            <div id="gimg-overlay-${g.id}" style="position:absolute;inset:0;border-radius:14px;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background .15s;font-size:1.4rem;opacity:0;">📷</div>
          </div>
          <div style="font-size:.75rem;font-weight:700;color:var(--text-hi);text-align:center;line-height:1.2;">${esc(g.name)}</div>
          <div id="gimg-status-${g.id}" style="font-size:.65rem;color:${hasCustom?'#22c55e':'var(--muted)'};">${hasCustom?'✅ Özel':'Varsayılan'}</div>
          ${hasCustom ? `<button class="a-btn red" style="padding:3px 8px;font-size:.65rem;width:100%;" onclick="event.stopPropagation();resetGameImage('${g.id}')">🗑️ Sıfırla</button>` : ''}
        </div>`;
      });

      html += '</div></div>';
    });

    html += '</div>';
    html += `<div class="admin-section" style="margin-top:4px;">
      <div class="admin-card" style="padding:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi);">Tüm Özel Görselleri Sıfırla</div>
          <div style="font-size:.72rem;color:var(--muted);">Tüm oyunlar varsayılan görsellerine döner.</div>
        </div>
        <button class="a-btn red" style="flex-shrink:0;" onclick="resetAllGameImages()">🗑️ Tümünü Sıfırla</button>
      </div>
    </div>`;

    body.innerHTML = html;

    // Hover efekti
    GAME_CATALOG.forEach(g => {
      const overlay = document.getElementById('gimg-overlay-'+g.id);
      if(!overlay) return;
      const card = overlay.closest('.admin-card');
      if(!card) return;
      card.addEventListener('mouseenter', ()=>{ overlay.style.opacity='1'; overlay.style.background='rgba(0,0,0,.45)'; });
      card.addEventListener('mouseleave', ()=>{ overlay.style.opacity='0'; overlay.style.background='rgba(0,0,0,0)'; });
    });

  }).catch(()=>{ body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>'; });
}

/* Seçilen dosyayı canvas ile küçült → base64 → Firebase'e kaydet */
function uploadGameImage(gameId, input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ showToast('❌ Dosya 5MB\'dan küçük olmalı.'); input.value=''; return; }

  const statusEl = document.getElementById('gimg-status-'+gameId);
  if(statusEl){ statusEl.textContent = '⏳ Yükleniyor...'; statusEl.style.color = 'var(--muted)'; }

  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const MAX = 300;
      let w = img.width, h = img.height;
      if(w > h){ h = Math.round(h * MAX / w); w = MAX; }
      else      { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);

      const _sgimg=async()=>{ try{await adminRestSet('settings/gameImages/'+gameId,base64);}catch(e){await adminDbRef('settings/gameImages/'+gameId).set(base64);} };
      _sgimg().then(()=>{
        _customGameImages[gameId]=base64; _saveCgiCache();
        const preview=document.getElementById('gimg-preview-'+gameId);
        const emoji=document.getElementById('gimg-emoji-'+gameId);
        if(preview){preview.src=base64;preview.style.display='block';preview.style.border='2px solid #22c55e';}
        if(emoji)emoji.style.display='none';
        if(statusEl){statusEl.textContent='✅ Özel';statusEl.style.color='#22c55e';}
        showToast('✅ Görsel kaydedildi!');
      }).catch(e=>{
        showToast('❌ Kaydetme hatası: '+(e&&e.message||'İzin reddedildi'));
        if(statusEl){statusEl.textContent='Hata';statusEl.style.color='#e74c3c';}
      });
    };
    img.onerror = ()=>{ showToast('❌ Görsel okunamadı.'); if(statusEl){ statusEl.textContent='Hata'; statusEl.style.color='#e74c3c'; } };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function resetGameImage(gameId){
  if(!confirm('Bu oyunun özel görseli silinsin mi?')) return;
  adminRestDelete('settings/gameImages/'+gameId).then(()=>{
    delete _customGameImages[gameId];
    _saveCgiCache();
    showToast('Görsel sıfırlandı.');
    loadAdminGames();
  }).catch(()=>showToast('❌ Sıfırlama hatası.'));
}

function resetAllGameImages(){
  if(!confirm('TÜM özel oyun görselleri silinsin mi?')) return;
  adminRestDelete('settings/gameImages').then(()=>{
    _customGameImages = {};
    _saveCgiCache();
    showToast('Tüm görseller sıfırlandı.');
    loadAdminGames();
  }).catch(()=>showToast('❌ Sıfırlama hatası.'));
}

function applyCustomGameImages(){ return Promise.resolve(); }


/* ── Hash Router ── */

(function(){
  const TAB_HASH = {
    home: '', forum: 'forum', msgs: 'mesajlar',
    friends: 'arkadaslar', profile: 'profil',
    games: 'oyunlar', watch: 'izle', admin: 'admin',
    liveroom: 'canli', botHome: 'robotevi', leaderboard: 'liderlik'
  };
  const HASH_TAB = {};
  Object.entries(TAB_HASH).forEach(([t,h])=>{ HASH_TAB[h]=t; });
  const labels = {
    home:'Ana Sayfa', forum:'Forum', msgs:'Mesajlar',
    friends:'Arkadaşlar', profile:'Profil',
    games:'Oyunlar', watch:'İzle', admin:'Admin',
    liveroom:'Canlı Sohbet Odası', botHome:'Robot Evi', leaderboard:'Liderlik'
  };
  window._updateURL = function(tab){
    try {
      const hash = TAB_HASH[tab];
      location.hash = hash ? '#' + hash : '#';
      document.title = (labels[tab]||tab) + ' — Nature.co';
    } catch(e){}
  };
  window.addEventListener('hashchange', function(){
    const hash = location.hash.replace('#','').replace('/','');
    const tab = HASH_TAB[hash] || 'home';
    if(typeof IS_DESKTOP === 'function' && IS_DESKTOP()){
      if(typeof deskNav === 'function') deskNav(tab);
    } else {
      if(typeof switchMainTab === 'function') switchMainTab(tab);
    }
  });
  window.addEventListener('DOMContentLoaded', function(){
    const hash = location.hash.replace('#','').replace('/','');
    // Davet linki token kontrolü: #inv_TOKEN
    if(hash.startsWith('inv_')) {
      window._pendingInviteToken = hash.slice(4);
      history.replaceState(null, '', location.pathname);
      // Kayıt ekranını aç
      window._pendingHashNav = null;
      if(typeof showRegForm === 'function') setTimeout(showRegForm, 500);
      else window._openRegOnLoad = true;
    } else {
      const tab = HASH_TAB[hash];
      if(tab && tab !== 'home'){
        window._pendingHashNav = tab;
      }
      if(hash && hash !== '') {
        history.replaceState(null, '', location.pathname);
      }
    }
    // Sunucu listesini ilk yüklemede doldur
    if(typeof renderServerSelect === 'function') renderServerSelect();
  });
})();



/* ── PWA SW ── */

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(reg => {
      // Yeni sürüm varsa hemen aktifleştir
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if(nw) nw.addEventListener('statechange', () => {
          if(nw.state === 'installed' && navigator.serviceWorker.controller){
            // Eski cache temizlendi, sayfa yenilenebilir
          }
        });
      });
    })
    .catch(() => {});
}


/* ══════════════════════════════════════════════
   🌿 SUNUCU GEÇİŞİ — Kullanıcı Adı & Şifre İste
══════════════════════════════════════════════ */

function showServerSwitchWithLogin(){
  const others = Object.entries(FB_SERVERS).filter(([k])=>k!==_activeServer);
  if(!others.length){ showToast('Başka sunucu yok.'); return; }

  const old = document.getElementById('_sswModal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = '_sswModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:18px;padding:26px 22px;width:100%;max-width:370px;box-shadow:0 20px 60px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:1.05rem;font-weight:900;color:var(--text-hi);">🔀 Sunucu Geçişi</div>
        <div onclick="document.getElementById('_sswModal').remove()" style="cursor:pointer;color:var(--muted);font-size:1.3rem;line-height:1;padding:4px 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
      </div>
      <div style="font-size:.78rem;color:var(--muted);margin-bottom:16px;">Şu an: <b style="color:var(--text-hi)">${FB_SERVERS[_activeServer]?.label||_activeServer}</b></div>

      <div id="_sswStep1">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Sunucu Seç</div>
        ${others.map(([k,s])=>`
          <div onclick="_sswSelectServer('${k}')" style="display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px 15px;cursor:pointer;margin-bottom:9px;transition:border-color .2s,background .2s;"
            onmouseover="this.style.borderColor='${s.color}';this.style.background='var(--surface2)'"
            onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--surface)'">
            <div style="width:40px;height:40px;border-radius:10px;background:${s.color}22;border:1px solid ${s.color}44;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">${s.icon}</div>
            <div style="flex:1;">
              <div style="font-weight:700;color:var(--text-hi);font-size:.9rem;">${s.label}</div>
              <div style="font-size:.72rem;color:var(--muted);">${s.description}</div>
            </div>
            <div style="color:${s.color};font-size:1.2rem;">›</div>
          </div>
        `).join('')}
      </div>

      <div id="_sswStep2" style="display:none;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
          <div id="_sswSrvIcon" style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 120 120" width="32" height="32" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="lcswi"><path d="M60 14 C76 22 98 44 98 68 C98 92 81 108 60 108 C39 108 22 92 22 68 C22 44 44 22 60 14Z"/></clipPath></defs><path d="M60 14 C76 22 98 44 98 68 C98 92 81 108 60 108 C39 108 22 92 22 68 C22 44 44 22 60 14Z" fill="#0e2b0c"/><g clip-path="url(#lcswi)"><line x1="60" y1="14" x2="60" y2="108" stroke="#4a8f40" stroke-width="1.2"/><line x1="60" y1="35" x2="78" y2="55" stroke="#4a8f40" stroke-width=".7"/><line x1="60" y1="35" x2="42" y2="55" stroke="#4a8f40" stroke-width=".7"/><line x1="60" y1="52" x2="82" y2="68" stroke="#4a8f40" stroke-width=".6"/><line x1="60" y1="52" x2="38" y2="68" stroke="#4a8f40" stroke-width=".6"/><line x1="60" y1="68" x2="78" y2="82" stroke="#4a8f40" stroke-width=".5"/><line x1="60" y1="68" x2="42" y2="82" stroke="#4a8f40" stroke-width=".5"/></g><path d="M60 14 C76 22 98 44 98 68 C98 92 81 108 60 108 C39 108 22 92 22 68 C22 44 44 22 60 14Z" fill="none" stroke="#4a8f40" stroke-width="1.2"/></svg></div>
          <div>
            <div id="_sswSrvName" style="font-weight:900;color:var(--text-hi);font-size:.95rem;"></div>
            <div style="font-size:.72rem;color:var(--muted);">Bu sunucuya giriş yapın</div>
          </div>
        </div>
        <input id="_sswUser" type="text" placeholder="Kullanıcı adı..." autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
          style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text-hi);font-size:.9rem;font-family:inherit;margin-bottom:10px;box-sizing:border-box;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        <input id="_sswPass" type="password" placeholder="Şifre..." autocomplete="new-password"
          style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text-hi);font-size:.9rem;font-family:inherit;margin-bottom:6px;box-sizing:border-box;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
          onkeydown="if(event.key==='Enter')_sswDoLogin()">
        <div id="_sswErr" style="color:#e05555;font-size:.78rem;margin-bottom:10px;min-height:18px;"></div>
        <div style="display:flex;gap:8px;">
          <button onclick="_sswBack()" style="flex:1;padding:11px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:.88rem;font-weight:700;cursor:pointer;">‹ Geri</button>
          <button onclick="_sswDoLogin()" id="_sswLoginBtn" style="flex:2;padding:11px;background:var(--accent);border:none;border-radius:10px;color:#fff;font-size:.88rem;font-weight:900;cursor:pointer;">Giriş Yap →</button>
        </div>
      </div>
    </div>
  `;
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

let _sswTargetKey = null;
function _sswSelectServer(key){
  _sswTargetKey = key;
  const s = FB_SERVERS[key];
  document.getElementById('_sswStep1').style.display = 'none';
  document.getElementById('_sswStep2').style.display = 'block';
  document.getElementById('_sswSrvIcon').textContent = s.icon;
  document.getElementById('_sswSrvIcon').style.background = s.color+'22';
  document.getElementById('_sswSrvName').textContent = s.label;
  setTimeout(()=>{ const u=document.getElementById('_sswUser'); if(u) u.focus(); }, 100);
}
function _sswBack(){
  document.getElementById('_sswStep1').style.display = 'block';
  document.getElementById('_sswStep2').style.display = 'none';
  document.getElementById('_sswErr').textContent = '';
}
async function _sswDoLogin(){
  const username = (document.getElementById('_sswUser').value||'').trim();
  const pass = document.getElementById('_sswPass').value||'';
  const errEl = document.getElementById('_sswErr');
  if(!username){ errEl.textContent='Kullanıcı adı girin.'; return; }
  if(!pass){ errEl.textContent='Şifre girin.'; return; }
  const btn = document.getElementById('_sswLoginBtn');
  btn.textContent = 'Kontrol ediliyor...'; btn.disabled = true;
  errEl.textContent = '';

  try{
    const targetSrv = FB_SERVERS[_sswTargetKey];
    const tempApp = firebase.initializeApp(targetSrv.config, '_sswTemp_'+Date.now());
    const tempDb = firebase.database(tempApp);
    const snap = await tempDb.ref('users/'+username).once('value');
    const u = snap.val();
    await tempApp.delete().catch(()=>{});

    if(!u){ errEl.textContent='Kullanıcı bulunamadı.'; btn.textContent='Giriş Yap →'; btn.disabled=false; return; }
    const ph = await hashStr(pass + username);
    const phLegacy = hashStrSync(pass + username);
    if(u.passwordHash !== ph && u.passwordHash !== phLegacy){ errEl.textContent='Şifre hatalı.'; btn.textContent='Giriş Yap →'; btn.disabled=false; return; }
    if(u.banned){ errEl.textContent='Bu hesap banlı.'; btn.textContent='Giriş Yap →'; btn.disabled=false; return; }

    document.getElementById('_sswModal').remove();
    await _switchToServer(_sswTargetKey);
    setTimeout(async ()=>{
      _cu = username;
      const ok = await fbInit();
      if(!ok){ showToast('Firebase bağlanamadı.'); return; }
      _passwordHash = ph;
      onLoginSuccess();
    }, 800);
  }catch(e){
    errEl.textContent='Bağlantı hatası: '+e.message;
    btn.textContent='Giriş Yap →'; btn.disabled=false;
  }
}


// ── Shared globals (used by multiple modules) ──
const IS_MOBILE = () => window.innerWidth < 768;
let _wpOpen = false;


// ── SPEECH stub (gerçek tanım misc.js'de, bot.js erken yükleniyor) ──
window.SPEECH = window.SPEECH || {
  supported: 'speechSynthesis' in window,
  speaking: false,
  currentUtter: null,
  speak() {},
  stop() {},
  getVoice() { return null; }
};
