/* Nature.co — app.js — Sınıflandırılmamış bölümler */

/* Nature.co — Ana JavaScript Dosyası */
/* Bölümler: Config → Firebase → Auth → Mesajlar → UI */

// Global değişkenler — en üstte tanımla (Safari hoisting sorunu)
var _loginAttempts = {};
var _apiCallLog = {};

(function(){
    var EMAILJS_PUBLIC_KEY  = 'k0VJPzZLwcdsOL7zc';
    var EMAILJS_SERVICE_ID  = 'service_pwyfg6j';
    var EMAILJS_TEMPLATE_ID = 'template_jvivfgc';
    window._EJS = { pub: EMAILJS_PUBLIC_KEY, svc: EMAILJS_SERVICE_ID, tpl: EMAILJS_TEMPLATE_ID };
    // emailjs async yüklendiği için hazır olana kadar bekle
    if (typeof emailjs !== 'undefined') {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    } else {
      window.addEventListener('load', function() {
        if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBLIC_KEY);
      });
    }
  })();


/* ─────────────────────────────── */


/* ─────────────────────────────── */



/* ══ GÜVENLİK: Brute Force Koruması ══ */


function recordLoginAttempt(username, success){
  if(!username || typeof _loginAttempts === 'undefined') return {allowed: true};
  const key = username.toLowerCase();
  if(!_loginAttempts[key]) _loginAttempts[key] = {count:0, lastAttempt:0, lockedUntil:0};
  const rec = _loginAttempts[key];
  if(success){
    // Başarılı girişte sıfırla
    delete _loginAttempts[key];
    return {allowed: true};
  }
  const now = Date.now();
  // 15 dakika geçtiyse sıfırla
  if(now - rec.lastAttempt > 15 * 60 * 1000) rec.count = 0;
  rec.count++;
  rec.lastAttempt = now;
  // 5 başarısız denemeden sonra kilitle
  if(rec.count >= 5){
    const lockMins = Math.min(rec.count * 2, 60); // max 60 dk
    rec.lockedUntil = now + lockMins * 60 * 1000;
    return {allowed: false, lockedUntil: rec.lockedUntil, mins: lockMins};
  }
  return {allowed: true, remaining: 5 - rec.count};
}

function checkLoginLock(username){
  if(!username) return {allowed: true};
  if(typeof _loginAttempts === 'undefined' || !_loginAttempts) return {allowed: true};
  const key = username.toLowerCase();
  const rec = _loginAttempts[key];
  if(!rec) return {allowed: true};
  if(rec.lockedUntil && Date.now() < rec.lockedUntil){
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    return {allowed: false, mins};
  }
  return {allowed: true, remaining: rec.count > 0 ? 5 - rec.count : 5};
}


/* ══ GÜVENLİK: İçerik Temizleme (XSS) ══ */

function sanitizeInput(str, maxLen=200){
  if(typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen)
    .replace(/[<>'"]/g, c => ({'<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function sanitizeMessage(str, maxLen=2000){
  if(typeof str !== 'string') return '';
  // Script taglerini tamamen çıkar
  return str.slice(0, maxLen)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/<img[^>]+onerror[^>]*>/gi, '');
}


/* ══ GÜVENLİK: Rate Limiting (API çağrıları) ══ */

function checkRateLimit(action, maxPerMin=20){
  const now = Date.now();
  if(!_apiCallLog[action]) _apiCallLog[action] = [];
  _apiCallLog[action] = _apiCallLog[action].filter(t => now - t < 60000);
  if(_apiCallLog[action].length >= maxPerMin) return false;
  _apiCallLog[action].push(now);
  return true;
}

/* Telefon OTP teyit — login ekranı */
async function submitPhoneLoginOTP() {
  const otp  = document.getElementById('loginPhoneOtp')?.value.trim() || '';
  const user = document.getElementById('loginUser')?.value.trim() || '';
  if (!otp)  { showLoginErr('Kodu girin.'); return; }
  if (!user) { showLoginErr('Kullanıcı adını girin.'); return; }
  const btn = document.getElementById('loginPhoneOtpBtn');
  if (btn) { btn.textContent = 'Doğrulanıyor...'; btn.disabled = true; }
  const ok = await verifyPhoneLoginOTP(otp, user);
  if (!ok && btn) { btn.textContent = 'Onayla →'; btn.disabled = false; }
}
window.submitPhoneLoginOTP = submitPhoneLoginOTP;


/* ── Nav ── */

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='none';});
  // callScreen'i her screen geçişinde gizle (aktif arama yoksa)
  var cs=document.getElementById('callScreen');
  if(cs && !_callId) cs.style.display='none';
  // Chat ekranında tab bar gizle (WhatsApp gibi)
  window._inChat = (id==='chatScreen');
  document.body.classList.toggle('in-chat', window._inChat);
  var tb=document.querySelector('.tab-bar');
  const _noTabScreens=['chatScreen','loginScreen','loginScreen'];
  const _isAuth = ['loginScreen','loginScreen'].includes(id);
  document.body.classList.toggle('auth-screen', _isAuth);
  if(tb) tb.style.display = (window._inChat || _noTabScreens.includes(id)) ? 'none' : (window.innerWidth>=768 ? 'none' : 'flex');
  // Chat'te NatureBot gizle
  if(window._natureBotInstance && window._natureBotInstance.el){
    window._natureBotInstance.el.style.display = (id==='chatScreen') ? 'none' : '';
  }
  // loginScreen display'ini sıfırla (onLoginSuccess'ta none yapılmış olabilir)
  const ls=document.getElementById('loginScreen');
  if(ls) ls.style.display='';
  const el=document.getElementById(id);
  if(el){ el.style.display='flex'; el.classList.add('active'); }
  if(id==='chatScreen') setTimeout(scrollBottom,100);
  // Tab active state sync
  if(Object.values(_mainScreenIds).includes(id)){
    const tab=Object.keys(_mainScreenIds).find(k=>_mainScreenIds[k]===id)||'home';
    _activeMainTab=tab;
    const tabMap={home:'tabHome',forum:'tabForum',msgs:'tabMsgs',friends:'tabFriends',profile:'tabProfile',games:'tabGames',watch:'tabWatch'};
    document.querySelectorAll('.tab-bar .tab').forEach(function(t){t.classList.remove('act');});
    const atId=tabMap[tab];
    if(atId){var at=document.getElementById(atId);if(at)at.classList.add('act');}
  }
}
function goBack(){
  if(_stopMsg){_stopMsg();_stopMsg=null;}
  clearTypingFlag();
  stopTypingListener();
  _cRoom=null;
  closeEmoji();
  closeChatMenu();
  window._inChat=false;
  document.body.classList.remove('in-chat');
  var _tb=document.querySelector('.tab-bar');
  if(_tb){_tb.style.visibility='';_tb.style.display=window.innerWidth>=768?'none':'flex';}
  document.getElementById('callAudioBtn').style.display='none';
  var _cvb=document.getElementById('callVideoBtn');
  if(_cvb)_cvb.style.display='none';
  var _csb=document.getElementById('callScreenBtn');
  if(_csb)_csb.style.display='none';
  // Son aktif sekmeye dön (home değil)
  var returnTab = (typeof _lastMobileTab !== 'undefined' && _lastMobileTab) ? _lastMobileTab : 'home';
  switchMainTab(returnTab);
  if(returnTab === 'home') loadRooms();
}

/* ── Tab ic-wrap arka planını temizle ── */
document.addEventListener('DOMContentLoaded', function(){
  // myAvatar yeniden render
  setTimeout(function(){ if(typeof renderMyAvatar==='function') renderMyAvatar(); }, 1000);
  function clearTabIcBg(){
    document.querySelectorAll('.tab-ic-wrap').forEach(function(el){
      el.style.background='none';
      el.style.backgroundColor='transparent';
      el.style.border='none';
      el.style.boxShadow='none';
    });
  }
  clearTabIcBg();
  // Tab değişiminde de temizle
  setTimeout(clearTabIcBg, 500);
  setTimeout(clearTabIcBg, 1500);
});

/* ── Klavye açılınca tab bar gizle ── */
function _updateTabBarForKeyboard(){
  if(window._inChat) return; // Chat'teyken tab bar'a dokunma
  var tb = document.querySelector('.tab-bar');
  if(!tb) return;
  var viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  var winH = window.screen.height;
  tb.style.display = (viewH < winH * 0.75) ? 'none' : 'flex';
}
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', _updateTabBarForKeyboard);
  window.visualViewport.addEventListener('scroll', _updateTabBarForKeyboard);
}
window.addEventListener('resize', _updateTabBarForKeyboard);



/* ── Chat Context Menu ── */

let _chatMenuOpen = false;

function toggleChatMenu(e){
  e.stopPropagation();
  const menu = document.getElementById('chatContextMenu');
  if(_chatMenuOpen){ closeChatMenu(); return; }
  
  const btn = document.getElementById('chatMenuBtn');
  const rect = btn.getBoundingClientRect();
  
  // Build menu items based on room type
  dbRef('rooms/'+_cRoom).once('value').then(snap=>{
    const room = snap.val()||{};
    const isDM = room.type==='dm';
    const isGroup = room.type==='group';
    const isChannel = room.type==='channel';
    const other = isDM ? (room.members||[]).find(m=>m!==_cu)||'?' : null;
    const isMember = isGroup && (room.members||[]).includes(_cu);
    
    let items = [];
    
    // Notification toggle
    const muted = JSON.parse(localStorage.getItem('sohbet_muted')||'{}');
    const isMuted = !!muted[_cRoom];
    items.push({icon: isMuted?'🔔':'🔕', label: isMuted?'Bildirimleri Aç':'Bildirimleri Kapat', action: ()=>toggleRoomMute(_cRoom)});
    
    // Search messages
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`, label:'Mesajlarda Ara', action: ()=>openMsgSearch()});

    // New features
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`, label:'Eco Belgeler', action: ()=>openCanvasPanel(_cRoom)});
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label:'Görev Listeleri', action: ()=>openListsPanel(_cRoom)});
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`, label:'Kaydedilenler', action: ()=>openSavedItems()});
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, label:'Hatırlatıcılar', action: ()=>openRemindersModal()});
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, label:'Durumumu Ayarla', action: ()=>openStatusModal()});
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, label:'Mesaj Planla', action: ()=>openSchedulePanel()});
    items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`, label:'Yer İşareti Ekle', action: ()=>promptAddBookmark(_cRoom)});

    // Separator
    items.push({sep:true});
    
    if(isDM){

items.push({sep:true});
      items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`, label:'Konuşmayı Kapat', action: ()=>closeDmConversation(_cRoom), danger:true});
    }
    
    if(isGroup && isMember){
      items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3h-2"/></svg>`, label:'Grubu Yönet', action: ()=>openGroupPanel(_cRoom)});
      items.push({sep:true});
      items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`, label:'Gruptan Ayrıl', action: ()=>leaveGroup(_cRoom, room.name||_cRoom), danger:true});
    }
    
    if(_isAdmin && !isGroup){
      items.push({sep:true});
      items.push({icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`, label:'Oda Ayarları (Admin)', action: ()=>{switchMainTab('home');openAdminPanel();adminTab('rooms');}});
    }
    
    // Render
    menu.innerHTML = items.map(item=>{
      if(item.sep) return '<div class="cm-sep"></div>';
      return `<div class="cm-item${item.danger?' danger':''}" onclick="closeChatMenu();(${item.action.toString()})()">
        <span style="width:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--muted)">${item.icon}</span>
        <span>${item.label}</span>
      </div>`;
    }).join('');
    
    // Position
    menu.style.display = 'block';
    const menuW = 210, menuH = menu.scrollHeight;
    let left = rect.right - menuW;
    let top = rect.bottom + 4;
    if(left < 8) left = 8;
    if(top + menuH > window.innerHeight - 8) top = rect.top - menuH - 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    
    _chatMenuOpen = true;
    setTimeout(()=>document.addEventListener('click', closeChatMenuOutside, true), 0);
  });
}

function closeChatMenu(){
  document.getElementById('chatContextMenu').style.display='none';
  _chatMenuOpen = false;
  document.removeEventListener('click', closeChatMenuOutside, true);
}

function closeChatMenuOutside(e){
  const menu = document.getElementById('chatContextMenu');
  if(!menu.contains(e.target)) closeChatMenu();
}

function toggleRoomMute(roomId){
  const muted = JSON.parse(localStorage.getItem('sohbet_muted')||'{}');
  if(muted[roomId]){ delete muted[roomId]; showToast('Bildirimler açıldı.'); }
  else { muted[roomId]=true; showToast('Bildirimler kapatıldı.'); }
  localStorage.setItem('sohbet_muted', JSON.stringify(muted));
}

function openMsgSearch(){
  // Mobil: native chat search bar kullan
  if(window.innerWidth < 768){
    toggleChatSearch();
    return;
  }
  // Desktop: floating search panel
  // Mevcut arama paneli varsa kapat
  const existing = document.getElementById('_msgSearchBar');
  if(existing){ existing.remove(); _clearMsgHighlights(); return; }

  const bar = document.createElement('div');
  bar.id = '_msgSearchBar';
  bar.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:500;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;padding:8px 12px;';
  bar.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input id="_msgSearchInp" placeholder="Mesajlarda ara..." autocomplete="off" autocorrect="off" style="flex:1;background:transparent;border:none;outline:none;color:var(--text-hi);font-size:.88rem;min-width:0;">
    <span id="_msgSearchCount" style="font-size:.72rem;color:var(--muted);flex-shrink:0;white-space:nowrap;"></span>
    <div id="_msgSearchPrev" onclick="_msgSearchNav(-1)" style="cursor:pointer;padding:3px 6px;border-radius:5px;background:var(--surface);color:var(--text-hi);font-size:.8rem;user-select:none;">▲</div>
    <div id="_msgSearchNext" onclick="_msgSearchNav(1)" style="cursor:pointer;padding:3px 6px;border-radius:5px;background:var(--surface);color:var(--text-hi);font-size:.8rem;user-select:none;">▼</div>
    <div onclick="document.getElementById('_msgSearchBar').remove();_clearMsgHighlights();" style="cursor:pointer;padding:4px;color:var(--muted);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </div>`;

  // Chat header'ın altına ekle
  const chatHdr = document.querySelector('#chatScreen .chat-hdr') || document.querySelector('#chatScreen .ws-header');
  const chatArea = document.getElementById('chatScreen');
  if(chatHdr) chatHdr.insertAdjacentElement('afterend', bar);
  else if(chatArea) chatArea.insertAdjacentElement('afterbegin', bar);

  const inp = document.getElementById('_msgSearchInp');
  inp.focus();
  window._msgSearchIdx = 0;
  inp.addEventListener('input', ()=>{ _runMsgSearch(inp.value); });
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter') _msgSearchNav(e.shiftKey?-1:1);
    if(e.key==='Escape'){ bar.remove(); _clearMsgHighlights(); }
  });
}

let _msgSearchMatches = [];
function _clearMsgHighlights(){
  document.querySelectorAll('#chatMsgs mark.msg-hl').forEach(m=>{
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
  _msgSearchMatches = [];
}
function _runMsgSearch(q){
  _clearMsgHighlights();
  const countEl = document.getElementById('_msgSearchCount');
  if(!q||!q.trim()){ if(countEl) countEl.textContent=''; return; }
  const term = q.trim();
  const re = new RegExp('('+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
  const bubbles = document.querySelectorAll('#chatMsgs .mb-text, #chatMsgs .ob');
  bubbles.forEach(el=>{
    if(!el.textContent.toLowerCase().includes(term.toLowerCase())) return;
    el.innerHTML = el.innerHTML.replace(re,'<mark class="msg-hl" style="background:#f0c040;color:#000;border-radius:2px;padding:0 2px;">$1</mark>');
  });
  _msgSearchMatches = Array.from(document.querySelectorAll('#chatMsgs mark.msg-hl'));
  window._msgSearchIdx = 0;
  if(countEl) countEl.textContent = _msgSearchMatches.length ? '1 / '+_msgSearchMatches.length : 'Sonuç yok';
  if(_msgSearchMatches.length) _msgSearchMatches[0].scrollIntoView({behavior:'smooth',block:'center'});
}
function _msgSearchNav(dir){
  if(!_msgSearchMatches.length) return;
  _msgSearchMatches[window._msgSearchIdx]?.classList.remove('msg-hl-active');
  window._msgSearchIdx = (window._msgSearchIdx + dir + _msgSearchMatches.length) % _msgSearchMatches.length;
  const el = _msgSearchMatches[window._msgSearchIdx];
  el.classList.add('msg-hl-active');
  el.scrollIntoView({behavior:'smooth',block:'center'});
  const countEl = document.getElementById('_msgSearchCount');
  if(countEl) countEl.textContent = (window._msgSearchIdx+1)+' / '+_msgSearchMatches.length;
}

function showGroupMembers(room){
  openGroupPanel(room.id || _cRoom);
}

/* ══════════════════════════════════════════
   👥 GRUP YÖNETİM PANELİ
   - Herkes: üyeleri gör, üye davet et, ayrıl
   - Admin: kilitle, sustur, sil
   ══════════════════════════════════════════ */
function openGroupPanel(roomId) {
  const old = document.getElementById('_groupPanel');
  if(old) old.remove();

  dbRef('rooms/'+roomId).once('value').then(snap => {
    const room = snap.val();
    if(!room) return;
    const members = room.members || [];
    const isCreator = room.createdBy === _cu || room.founder === _cu;
    const canManage = _isAdmin; // yalnızca admin yönetir
    const isMember = (room.members||[]).includes(_cu);

    const modal = document.createElement('div');
    modal.id = '_groupPanel';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9900;display:flex;align-items:flex-end;justify-content:center;';

    const onlines = members.filter(u => _online[u]);
    const offlines = members.filter(u => !_online[u]);

    const memberRows = [...onlines, ...offlines].map(u => {
      const isMe = u === _cu;
      const isOwner = u === room.createdBy;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="position:relative;flex-shrink:0;">
            <div style="width:34px;height:34px;border-radius:9px;background:${strColor(u)};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;color:#fff;">${initials(u)}</div>
            ${_online[u]?'<div style="position:absolute;bottom:-1px;right:-1px;width:9px;height:9px;border-radius:50%;background:#2ecc71;border:1.5px solid var(--bg2);"></div>':''}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.85rem;font-weight:700;color:var(--text-hi);">${esc(u)}${isMe?' <span style="font-size:.65rem;color:var(--muted)">(sen)</span>':''}</div>
            ${isOwner?'<div style="font-size:.65rem;color:var(--accent);font-weight:700;display:flex;align-items:center;gap:3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M5 20V8l7-5 7 5v12"/></svg>Kurucu</div>':''}
          </div>
          ${canManage && !isMe ? `<button onclick="adminKickFromGroupPanel('${esc(roomId)}','${esc(u)}')" style="background:rgba(224,85,85,.15);border:1px solid rgba(224,85,85,.3);border-radius:7px;color:#e05555;font-size:.65rem;font-weight:700;padding:4px 9px;cursor:pointer;">Çıkar</button>` : ''}
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Handle -->
        <div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:14px auto 0;flex-shrink:0;"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding:16px 18px 12px;flex-shrink:0;">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#9b72ff,#c4a7ff);display:flex;align-items:center;justify-content:center;display:flex;align-items:center;justify-content:center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3h-2"/></svg></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:1rem;font-weight:900;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(room.name||roomId)}</div>
            <div style="font-size:.72rem;color:var(--muted);">${members.length} üye · ${onlines.length} çevrimiçi</div>
          </div>
          <div onclick="document.getElementById('_groupPanel').remove()" style="cursor:pointer;color:var(--muted);padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </div>

        <!-- Durum badge'leri -->
        ${room.locked ? '<div style="margin:0 18px 8px;background:rgba(224,85,85,.12);border:1px solid rgba(224,85,85,.25);border-radius:8px;padding:7px 12px;font-size:.75rem;color:#e05555;font-weight:700;">🔒 Bu grup kilitlidir</div>' : ''}

        <!-- Admin Kontrolleri -->
        ${canManage ? `
        <div style="margin:0 18px 10px;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">
          <button onclick="_groupAction('lock','${esc(roomId)}',${room.locked?'false':'true'})" style="flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:5px;padding:9px 8px;border-radius:10px;border:1px solid ${room.locked?'rgba(46,204,113,.3)':'rgba(224,85,85,.3)'};background:${room.locked?'rgba(46,204,113,.1)':'rgba(224,85,85,.1)'};color:${room.locked?'#2ecc71':'#e05555'};font-size:.75rem;font-weight:700;cursor:pointer;">
            ${room.locked ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Kilidi Aç' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Kilitle'}
          </button>
          <button onclick="_groupAction('mute','${esc(roomId)}',${room.muted?'false':'true'})" style="flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:5px;padding:9px 8px;border-radius:10px;border:1px solid ${room.muted?'rgba(46,204,113,.3)':'rgba(245,166,35,.3)'};background:${room.muted?'rgba(46,204,113,.1)':'rgba(245,166,35,.1)'};color:${room.muted?'#2ecc71':'#f5a623'};font-size:.75rem;font-weight:700;cursor:pointer;">
            ${room.muted ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Sesi Aç' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Sustur'}
          </button>
          <button onclick="_groupAction('delete','${esc(roomId)}',null)" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:9px 14px;border-radius:10px;border:1px solid rgba(224,85,85,.3);background:rgba(224,85,85,.1);color:#e05555;font-size:.75rem;font-weight:700;cursor:pointer;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> Sil
          </button>
        </div>` : ''}

        <!-- Üye davet (herkes yapabilir - sadece üyeyse) -->
        ${(isCreator || canManage || isMember) ? `
        <div style="margin:0 18px 10px;flex-shrink:0;">
          <button onclick="_openGroupInvite('${esc(roomId)}')" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;border:1px solid rgba(91,155,213,.3);background:rgba(91,155,213,.08);color:var(--accent);font-size:.8rem;font-weight:700;cursor:pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Üye Davet Et
          </button>
        </div>` : ''}

        <!-- Divider -->
        <div style="padding:0 18px;flex-shrink:0;">
          <div style="font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">${members.length} Üye</div>
        </div>

        <!-- Üye listesi -->
        <div style="flex:1;overflow-y:auto;padding:0 18px 8px;">
          ${memberRows}
        </div>

        <!-- Alt - ayrıl butonu -->
        <div style="padding:12px 18px;padding-bottom:max(16px,env(safe-area-inset-bottom,16px));flex-shrink:0;border-top:1px solid rgba(255,255,255,.06);">
          <button onclick="document.getElementById('_groupPanel').remove();leaveGroup('${esc(roomId)}','${esc(room.name||roomId)}')" style="width:100%;padding:11px;border-radius:10px;background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.25);color:#e05555;font-size:.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Gruptan Ayrıl
          </button>
        </div>
      </div>`;

    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  });
}

/* Grup aksiyon: kilit, sustur, sil */
async function _groupAction(action, roomId, value) {
  if(!_isAdmin) { showToast('❌ Bu işlem için admin yetkisi gerekli'); return; }

  if(action === 'delete') {
    const panel = document.getElementById('_groupPanel');
    const roomName = panel ? panel.querySelector('[style*="font-size:1rem"]')?.textContent?.trim() : roomId;
    if(!confirm(`"${roomName}" grubu kalıcı olarak silinsin mi?\nTüm mesajlar da silinecek.`)) return;
    try {
      await dbRef('rooms/'+roomId).remove();
      await dbRef('msgs/'+roomId).remove().catch(()=>{});
      panel && panel.remove();
      showToast('🗑️ Grup silindi.');
      if(_cRoom === roomId) goBack();
      loadRooms();
    } catch(e) { showToast('❌ Silme hatası.'); }
    return;
  }

  if(action === 'lock') {
    const locked = value === 'true' || value === true;
    try {
      await dbRef('rooms/'+roomId+'/locked').set(locked);
      showToast(locked ? '🔒 Grup kilitlendi.' : '🔓 Kilit açıldı.');
      document.getElementById('_groupPanel')?.remove();
      openGroupPanel(roomId);
    } catch(e) { showToast('❌ Hata.'); }
    return;
  }

  if(action === 'mute') {
    const muted = value === 'true' || value === true;
    try {
      await dbRef('rooms/'+roomId+'/muted').set(muted);
      showToast(muted ? '🔇 Grup susturuldu.' : '🔊 Susturma kaldırıldı.');
      document.getElementById('_groupPanel')?.remove();
      openGroupPanel(roomId);
    } catch(e) { showToast('❌ Hata.'); }
    return;
  }
}

/* Admin - panel üzerinden üye çıkarma */
async function adminKickFromGroupPanel(roomId, username) {
  if(!_isAdmin) { showToast('❌ Yetki yok'); return; }
  if(!confirm(`"${username}" gruptan çıkarılsın mı?`)) return;
  try {
    const snap = await dbRef('rooms/'+roomId+'/members').once('value');
    const members = (snap.val()||[]).filter(m => m !== username);
    await dbRef('rooms/'+roomId+'/members').set(members);
    showToast(`✅ ${username} gruptan çıkarıldı.`);
    document.getElementById('_groupPanel')?.remove();
    openGroupPanel(roomId);
  } catch(e) { showToast('❌ Hata.'); }
}

/* Üye davet - kurucu veya admin */
function _openGroupInvite(roomId) {
  const old = document.getElementById('_groupInvitePanel');
  if(old) old.remove();

  dbRef('rooms/'+roomId+'/members').once('value').then(snap => {
    const currentMembers = snap.val() || [];
    const currentSet = new Set(Array.isArray(currentMembers) ? currentMembers : Object.values(currentMembers));

    const modal = document.createElement('div');
    modal.id = '_groupInvitePanel';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9950;display:flex;align-items:flex-end;justify-content:center;';

    modal.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:75vh;display:flex;flex-direction:column;overflow:hidden;padding-bottom:max(16px,env(safe-area-inset-bottom,16px));">
        <div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:14px auto 0;"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px;">
          <div style="font-size:.95rem;font-weight:900;color:var(--text-hi);">👤 Üye Davet Et</div>
          <div onclick="document.getElementById('_groupInvitePanel').remove()" style="cursor:pointer;color:var(--muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </div>
        <input id="_giSearch" class="admin-inp" placeholder="Kullanıcı ara..." autocorrect="off" autocapitalize="none"
          style="margin:0 18px 10px;width:calc(100% - 36px);box-sizing:border-box;"
          oninput="_loadGIUsers(this.value,'${esc(roomId)}')">
        <div id="_giList" style="flex:1;overflow-y:auto;padding:0 18px;"></div>
      </div>`;

    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Kullanıcıları yükle
    window._giCurrentMembers = currentSet;
    window._giRoomId = roomId;
    _loadGIUsers('', roomId);
  });
}

function _loadGIUsers(q, roomId) {
  const list = document.getElementById('_giList');
  if(!list) return;
  const currentSet = window._giCurrentMembers || new Set();
  list.innerHTML = '<div style="color:var(--muted);font-size:.8rem;padding:8px;">Yükleniyor...</div>';

  dbRef('users').once('value').then(snap => {
    const users = snap.val() || {};
    const filtered = Object.keys(users).filter(u => {
      if(users[u].banned) return false;
      if(currentSet.has(u)) return false;
      if(q && !u.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });

    if(!filtered.length) {
      list.innerHTML = '<div style="color:var(--muted);font-size:.8rem;padding:8px;text-align:center;">Eklenecek kullanıcı bulunamadı</div>';
      return;
    }

    list.innerHTML = filtered.map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="position:relative;flex-shrink:0;">
          <div style="width:34px;height:34px;border-radius:9px;background:${strColor(u)};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;color:#fff;">${initials(u)}</div>
          ${_online[u]?'<div style="position:absolute;bottom:-1px;right:-1px;width:9px;height:9px;border-radius:50%;background:#2ecc71;border:1.5px solid var(--bg2);"></div>':''}
        </div>
        <div style="flex:1;font-size:.85rem;font-weight:700;color:var(--text-hi);">${esc(u)}</div>
        <button onclick="_addToGroup('${esc(roomId)}','${esc(u)}',this)" style="background:rgba(91,155,213,.15);border:1px solid rgba(91,155,213,.3);border-radius:8px;color:var(--accent);font-size:.72rem;font-weight:700;padding:5px 12px;cursor:pointer;">Ekle</button>
      </div>`).join('');
  });
}

async function _addToGroup(roomId, username, btn) {
  try {
    const snap = await dbRef('rooms/'+roomId+'/members').once('value');
    const members = snap.val() || [];
    const arr = Array.isArray(members) ? members : Object.values(members);
    if(arr.includes(username)) { showToast('Zaten üye.'); return; }
    arr.push(username);
    await dbRef('rooms/'+roomId+'/members').set(arr);
    // Bildirim gönder
    dbRef('callInvites/'+username).push({
      type:'group_invite', room: roomId, from: _cu, ts: Date.now()
    }).catch(()=>{});
    if(btn) {
      btn.textContent = '✅ Eklendi';
      btn.disabled = true;
      btn.style.opacity = '.6';
    }
    if(window._giCurrentMembers) window._giCurrentMembers.add(username);
    showToast(`✅ ${username} gruba eklendi.`);
  } catch(e) { showToast('❌ Hata.'); }
}


async function leaveGroup(roomId, roomName){
  if(!confirm('"'+roomName+'" grubundan ayrılmak istediğinize emin misiniz?'))return;
  try{
    const snap = await dbRef('rooms/'+roomId+'/members').once('value');
    const members=(snap.val()||[]).filter(m=>m!==_cu);
    await dbRef('rooms/'+roomId+'/members').set(members);
    showToast(roomName+' grubundan ayrıldınız.');
    loadRooms();
  }catch(e){showToast('Hata.');}
}


/* ════════════════════════════════════════════════════
   ✍️  YAZIYYOR GÖSTERGESİ
════════════════════════════════════════════════════ */

let _typingTimer = null;
let _isTyping = false;
let _stopTyping = null;

function setTypingFlag(){
  if(!_cRoom||!_cu) return;
  if(!_isTyping){
    _isTyping = true;
    dbRef('typing/'+_cRoom+'/'+_cu).set(true);
  }
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(clearTypingFlag, 3000);
}

function clearTypingFlag(){
  clearTimeout(_typingTimer);
  if(_isTyping && _cRoom && _cu){
    _isTyping = false;
    dbRef('typing/'+_cRoom+'/'+_cu).remove();
  }
}

function stopTypingListener(){
  if(_stopTyping){ _stopTyping(); _stopTyping=null; }
}

function listenTyping(roomId){
  stopTypingListener();
  const ref = dbRef('typing/'+roomId);
  const h = snap=>{
    const data = snap.val()||{};
    const others = Object.keys(data).filter(u=>u!==_cu&&data[u]);
    const el = document.getElementById('chatHdrSub');
    if(!el) return;
    if(others.length>0){
      const names = others.slice(0,2).map(u=>u).join(', ');
      let typingLabel;
      if(others.length===1) typingLabel = `<strong>${others[0]}</strong> yazıyor`;
      else if(others.length===2) typingLabel = `<strong>${others[0]}</strong> ve <strong>${others[1]}</strong> yazıyor`;
      else typingLabel = `<strong>${others[0]}</strong> ve <strong>${others.length-1} kişi</strong> daha yazıyor`;
      el.innerHTML = `<span style="color:var(--accent)">${typingLabel} <span class="typing-dots"><span></span><span></span><span></span></span></span>`;
    } else {
      updateChatStatus();
    }
  };
  ref.on('value',h);
  _stopTyping = ()=>ref.off('value',h);
}


/* ════════════════════════════════════════════════════
   🎙️  SESLİ MESAJ
════════════════════════════════════════════════════ */

let _mediaRec = null;
let _recChunks = [];
let _recStartTs = 0;
let _recInterval = null;
let _recDuration = 0;







/* ════════════════════════════════════════════════════
   🔍  SOHBETİÇİ ARAMA
════════════════════════════════════════════════════ */

let _searchMatches = [];
let _searchIdx = 0;

function toggleChatSearch(){
  const bar = document.getElementById('chatSearchBar');
  const inp = document.getElementById('chatSearchInp');
  if(bar.classList.contains('open')){
    bar.classList.remove('open');
    clearSearchHighlights();
    _searchMatches=[];
  } else {
    bar.classList.add('open');
    if(inp) inp.focus();
  }
}

function onChatSearch(){
  const q = (document.getElementById('chatSearchInp').value||'').trim().toLowerCase();
  clearSearchHighlights();
  _searchMatches=[];
  _searchIdx=0;
  if(q.length<2){ document.getElementById('chatSearchCount').textContent=''; return; }

  const box = document.getElementById('chatMsgs');
  if(!box) return;

  // Tüm metin elementlerini tara
  box.querySelectorAll('.mb-text,.ob').forEach(el=>{
    const orig = el.textContent;
    if(orig.toLowerCase().includes(q)){
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
      el.innerHTML = el.innerHTML.replace(regex, m=>`<mark class="search-highlight">${m}</mark>`);
      el.querySelectorAll('.search-highlight').forEach(m=>_searchMatches.push(m));
    }
  });

  const cnt = document.getElementById('chatSearchCount');
  if(cnt) cnt.textContent = _searchMatches.length ? `1/${_searchMatches.length}` : 'Yok';
  if(_searchMatches.length){ _searchMatches[0].classList.add('current'); _searchMatches[0].scrollIntoView({block:'center'}); }
}

function chatSearchNav(dir){
  if(!_searchMatches.length) return;
  _searchMatches[_searchIdx].classList.remove('current');
  _searchIdx = (_searchIdx+dir+_searchMatches.length)%_searchMatches.length;
  _searchMatches[_searchIdx].classList.add('current');
  _searchMatches[_searchIdx].scrollIntoView({block:'center',behavior:'smooth'});
  const cnt = document.getElementById('chatSearchCount');
  if(cnt) cnt.textContent = `${_searchIdx+1}/${_searchMatches.length}`;
}

function clearSearchHighlights(){
  document.querySelectorAll('.search-highlight').forEach(el=>{
    el.replaceWith(document.createTextNode(el.textContent));
  });
}

function scrollToMsg(key){
  const el = document.querySelector('[data-key="'+key+'"]');
  if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.style.background='rgba(91,155,213,.2)'; setTimeout(()=>el.style.background='',1200); }
}


/* ════════════════════════════════════════════════════
   👤  BIO & SON GÖRÜLME
════════════════════════════════════════════════════ */

function autoBioResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,120)+'px';
  const cnt = document.getElementById('bioCharCount');
  if(cnt) cnt.textContent=(el.value||'').length+'/160';
}

async function saveBio(){
  if(!_cu||!_db) return;
  const bio=(document.getElementById('profBioInp').value||'').slice(0,160);
  await dbRef(wsPath('users/'+_cu+'/bio')).set(bio);
  showToast('✅ Bio kaydedildi');
}

async function loadBio(){
  if(!_cu||!_db) return;
  const snap = await dbRef(wsPath('users/'+_cu+'/bio')).once('value');
  const bio = snap.val()||'';
  const inp = document.getElementById('profBioInp');
  if(inp){ inp.value=bio; autoBioResize(inp); }
}

/* Profil tabı açılınca bio yükle */
const _origSwitchProfTab = typeof switchProfTab==='function' ? switchProfTab : null;



/* ── Send ── */

// Rate limiting için son gönderim zamanı
let _lastMsgTs = 0;
let _msgCount = 0;
let _msgCountReset = 0;
const MSG_RATE_MS = 1200; // mesajlar arası min süre (ms)
const MSG_BURST_LIMIT = 8; // 10 saniyede max mesaj
const MSG_BURST_WINDOW = 10000;

async function sendMsg(){
  if(!checkRateLimit('sendMsg', 15)){
    showToast('⚠️ Çok hızlı mesaj gönderiyorsunuz.');
    return;
  }
  const inp=document.getElementById('msgInp');const t=inp.value.trim();
  if(!t||!_cRoom||!_cu)return;
  // ── Oda kilit/susturma kontrolü ──
  try{
    const _rSnap = await dbRef('rooms/'+_cRoom).once('value');
    const _rData = _rSnap.val()||{};
    if(_rData.locked && !_isAdmin){ showToast('🔒 Bu oda kilitli.'); return; }
    if(_rData.muted && !_isAdmin){ showToast('🔇 Bu grup susturulmuş. Mesaj gönderilemez.'); return; }
  }catch(e){}
  // Slash bot komutu kontrolü
  if(t.startsWith('/') && typeof checkBotCommand==='function' && checkBotCommand(t)){
    inp.value='';if(inp._autoResize)inp._autoResize();else{inp.style.height='';} return;
  }
  // Yeni slash komutları
  if(t.startsWith('/')){
    const handled = typeof executeSlashCmd==='function' && await executeSlashCmd(t, _cRoom);
    if(handled){ inp.value='';if(inp._autoResize)inp._autoResize();else inp.style.height=''; return; }
    // /shrug ve /me özel dönüşüm
    if(t.toLowerCase()==='/shrug'){ inp.value='¯\\_(ツ)_/¯'; }
    else if(t.toLowerCase().startsWith('/me ')){ inp.value='_' + _cu + ' ' + t.slice(4) + '_'; }
  }
  const box=document.getElementById('slashSuggestBox');if(box) box.style.display='none';
  // ── Susturma kontrolü ──
  const muteUntil = _userMutedUntil || 0;
  if(muteUntil > Date.now()){
    const rem = Math.ceil((muteUntil - Date.now()) / 60000);
    showToast('🔇 Susturuldunuz. ' + rem + ' dk kaldı.'); return;
  }

  // ── Rate limiting ──
  const now = Date.now();
  if(now - _msgCountReset > MSG_BURST_WINDOW){ _msgCount=0; _msgCountReset=now; }
  if(now - _lastMsgTs < MSG_RATE_MS){ showToast('⏱ Çok hızlı gönderiyorsunuz.'); return; }
  if(_msgCount >= MSG_BURST_LIMIT){ showToast('⏱ Çok fazla mesaj gönderildi, biraz bekleyin.'); return; }
  _lastMsgTs = now;
  _msgCount++;

  // ── Mesaj uzunluk sınırı ──
  if(t.length > 2000){ showToast('Mesaj çok uzun (max 2000 karakter).'); return; }

  // ── Yasaklı kelime filtresi ──
  let filtered = t;
  if(_bannedWordsList && _bannedWordsList.length){
    _bannedWordsList.forEach(w=>{
      if(!w) return;
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
      filtered = filtered.replace(re, '***');
    });
  }

  const msg={user:_cu,text:filtered,ts:now};
  if(inp.dataset.replyKey){
    msg.replyTo={key:inp.dataset.replyKey,user:inp.dataset.replyUser||'',text:(inp.dataset.replyText||'').slice(0,80)};
  }
  inp.value='';autoResize(inp);closeEmoji();removeReplyPreview();
  clearTypingFlag();
  dbRef('msgs/'+_cRoom).push(msg).catch(()=>showToast('Gönderilemedi'));
}

// Global değişkenler: mute & banned words
let _userMutedUntil = 0;
let _bannedWordsList = [];

// Giriş başarılı olunca kullanıcı verilerini yükle
function loadUserSecurityData(){
  if(!_cu) return;
  // Mute durumu kontrol et
  dbRef('users/'+_cu+'/mutedUntil').once('value').then(s=>{
    _userMutedUntil = s.val() || 0;
  });
  // Yasaklı kelimeleri yükle
  dbRef('settings/bannedWords').once('value').then(s=>{
    const raw = s.val() || '';
    _bannedWordsList = raw.split(',').map(w=>w.trim()).filter(Boolean);
  });
  // Canlı mute izleme
  dbRef('users/'+_cu+'/mutedUntil').on('value', s=>{
    _userMutedUntil = s.val() || 0;
  });
}
function onMsgKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();return;}
  setTypingFlag();
}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';}


/* ── File ── */

function pickFile(){
  // On desktop, also set the upload handler to use deskRoom
  document.getElementById('fileInput').click();
}
function handleFile(inp){
  const file=inp.files[0];inp.value='';if(!file)return;
  if(file.size>5*1024*1024){showToast('Max 5MB');return;}
  showToast('Yükleniyor...');
  const r=new FileReader();
  r.onload=e=>{dbRef('msgs/'+_cRoom).push({user:_cu,text:'',ts:Date.now(),file:{name:file.name,size:file.size,type:file.type,data:e.target.result}}).catch(()=>showToast('Gönderilemedi'));};
  r.readAsDataURL(file);
}


/* ── Emoji ── */

const EMOJIS={
'😀 Yüzler & İnsanlar':['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🫶','🤭','🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','🫨','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
'👋 El & Beden':['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦'],
'👨‍👩‍👧 İnsanlar':['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🧑‍⚕️','👨‍⚕️','👩‍⚕️','🧑‍🌾','👨‍🌾','👩‍🌾','🧑‍🍳','👨‍🍳','👩‍🍳','🧑‍🎓','👨‍🎓','👩‍🎓','🧑‍🎤','👨‍🎤','👩‍🎤','🧑‍🏫','👨‍🏫','👩‍🏫','🧑‍🏭','👨‍🏭','👩‍🏭','🧑‍💻','👨‍💻','👩‍💻','🧑‍💼','👨‍💼','👩‍💼','🧑‍🔧','👨‍🔧','👩‍🔧','🧑‍🔬','👨‍🔬','👩‍🔬','🧑‍🎨','👨‍🎨','👩‍🎨','🧑‍✈️','👨‍✈️','👩‍✈️','🧑‍🚀','👨‍🚀','👩‍🚀','🧑‍🚒','👨‍🚒','👩‍🚒','👰','🤵','🫅','🤴','👸','🦸','🦹','🧙','🧝','🧛','🧟','🧞','🧜','🧚','🪄','👼','🤶','🎅','🧑‍🤝‍🧑','👫','👬','👭','💏','💑','👨‍👩‍👦','👨‍👩‍👧','👨‍👩‍👧‍👦'],
'❤️ Kalpler & Duygular':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','❣️','💌','💋','🫦','😻','💯','💢','💥','💫','💦','💨','🕳️','💬','💭','💤'],
'🐶 Hayvanlar & Doğa':['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🍄','🪸','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','🌌','☀️','⛅','🌤️','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌀','🌈','🌂','☂️','☔','⛱️','⚡','🔥','💧','🌊'],
'🍎 Yiyecek & İçecek':['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🫒','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🫚','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🌮','🌯','🫔','🥙','🧆','🥚','🍜','🍝','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','🍵','☕','🫖','🍶','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧉','🍾'],
'⚽ Spor & Aktivite':['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥍','🏑','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🪗','🎸','🎹','🎺','🎻','🪕','🥁','🪘'],
'🚗 Taşıtlar & Yerler':['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🛺','🚲','🛴','🛹','🛼','🛺','🚏','🛣️','🛤️','🛞','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸','🪐','🌍','🌎','🌏','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🗾','🎑','🏞️'],
'💡 Objeler & Semboller':['💡','🔦','🕯️','🪔','🧱','💎','🔮','🪄','🧿','📿','💈','🔭','🔬','🩺','🩻','🩹','💊','🩺','🌡️','🛁','🚿','🪠','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🧽','🛒','🚪','🪑','🚽','🪤','🧸','🪆','🖼️','🧵','🪡','🧶','👓','🕶️','🥽','🧣','🧤','🧥','👘','👗','🥻','🩱','🩲','🩳','👙','👚','👛','👜','👝','🎒','🧳','👒','🎩','🧢','⛑️','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','📷','📸','📹','🎥','📽️','📺','📻','📡','🔋','🔌','💡','🔦','🕯️','🪙','💴','💵','💶','💷','💸','💳','🧾','📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️','🗃️','🗑️','🗄️','🔒','🔓','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','🔧','🔩','⚙️','🗜️','⚖️','🦯','🔗','⛓️','🪝','🧲','🔫','🪃','🏹','🛡️','🪚','🔮','💊','🩹','🩺'],
'#️⃣ Semboller':['❤️','💯','✅','❌','⭕','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔷','🔶','🔹','🔸','▪️','▫️','◾','◽','◼️','◻️','🔲','🔳','⬛','⬜','🏳️','🏴','🚩','🎌','🏁','🚀','⚡','🔥','💥','❄️','✨','🌊','💨','🌀','🌈','⚜️','🔱','📛','🔰','⭕','✅','☑️','✔️','❎','➕','➖','➗','✖️','🟰','♾️','💲','💱','〽️','⚠️','🚸','🔞','📵','🚫','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','📶','📳','📴','📵','📶','🔇','🔈','🔉','🔊','📢','📣','🔔','🔕','🎵','🎶','⚗️','🔭','🔬','🩺','⚕️','🛐','☯️','✡️','🔯','🕎','☪️','☮️','✝️','🛕','⛪','🕌','🕍']
};
function toggleEmoji(){
  if(IS_DESKTOP()){
    // Desktop: show floating emoji picker near input
    let el=document.getElementById('deskEmojiPicker');
    if(!el){
      el=document.createElement('div');
      el.id='deskEmojiPicker';
      el.style.cssText='position:absolute;bottom:70px;left:20px;right:20px;overflow:hidden;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:0;z-index:50;box-shadow:0 8px 32px rgba(0,0,0,.8);';
      document.getElementById('deskInputArea').style.position='relative';
      document.getElementById('deskInputArea').appendChild(el);
    }
    const showing=el.style.display!=='none'&&el.innerHTML.trim();
    if(showing){el.style.display='none';return;}
    el.style.display='block';
    if(!el.innerHTML.trim())buildEmojis(true);
    // Click outside to close
    setTimeout(()=>{
      function _emojiOutside(e){
        if(!el.contains(e.target)&&!e.target.closest('.dsk-inp-btn')){
          el.style.display='none';
          document.removeEventListener('click',_emojiOutside,true);
        }
      }
      document.addEventListener('click',_emojiOutside,true);
    },0);
    return;
  }
  const el=document.getElementById('emojiPicker');
  el.classList.toggle('open');
  if(el.classList.contains('open')&&!el.innerHTML.trim())buildEmojis(false);
}
function closeEmoji(){
  document.getElementById('emojiPicker').classList.remove('open');
  const de=document.getElementById('deskEmojiPicker');
  if(de)de.style.display='none';
}
function buildEmojis(isDesk){
  const target=isDesk?document.getElementById('deskEmojiPicker'):document.getElementById('emojiPicker');
  if(!target) return;
  let h='<div class="picker-tabs">';
  h+='<div class="picker-tab active" id="'+(isDesk?'desk':'mob')+'TabEmoji" onclick="switchPickerTab(\'emoji\','+(isDesk?'true':'false')+')">😊 Emoji</div>';
  h+='<div class="picker-tab" id="'+(isDesk?'desk':'mob')+'TabGif" onclick="switchPickerTab(\'gif\','+(isDesk?'true':'false')+')">🎬 GIFs</div>';
  h+='</div>';
  h+='<div id="'+(isDesk?'desk':'mob')+'EmojiBody" class="picker-body">';
  // Custom emojiler bölümü
  h+='<div id="'+(isDesk?'desk':'mob')+'CustomEmojiSection">';
  h+='<div class="ec" style="display:flex;align-items:center;justify-content:space-between;">✨ ÖZEL EMOJİLER<button class="add-emoji-btn" style="width:auto;padding:3px 10px;margin:0;font-size:.75rem;" onclick="openCeModal()">+ Emoji Ekle</button></div>';
  h+='<div class="custom-emoji-grid" id="'+(isDesk?'desk':'mob')+'CustomEmojiGrid"><div style="color:var(--muted);font-size:.78rem;">Henüz özel emoji yok.</div></div>';
  h+='</div>';
  h+='<div style="height:1px;background:var(--border);margin:8px 0;"></div>';
  // Standart emoji kategorileri
  h+='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--border);-webkit-overflow-scrolling:touch;">';
  const catIcons=Object.keys(EMOJIS).map(k=>k.split(' ')[0]);
  catIcons.forEach((ic,i)=>{h+=`<div onclick="scrollEmojiCat(${i})" style="font-size:1.2rem;padding:4px 6px;border-radius:6px;cursor:pointer;flex-shrink:0;" title="${Object.keys(EMOJIS)[i]}">${ic}</div>`;});
  h+='</div><div id="emojiGrid" class="eg">';
  Object.entries(EMOJIS).forEach(([cat,emojis],i)=>{
    h+=`<div class="ec" id="ecat-${i}">${cat}</div>`;
    emojis.forEach(e=>{h+=`<div class="eb" onclick="insertEmoji('${e}')">${e}</div>`;});
  });
  h+='</div></div>';
  h+='<div id="'+(isDesk?'desk':'mob')+'GifBody" style="display:none;flex-direction:column;overflow:hidden;height:274px;">';
  h+='<div class="gif-search-wrap"><input class="gif-search-inp" placeholder="Search GIFs on Giphy..." id="'+(isDesk?'desk':'mob')+'GifSearch" oninput="gifSearchDebounce(this.value,'+(isDesk?'true':'false')+')" /></div>';
  h+='<div style="overflow-y:scroll;-webkit-overflow-scrolling:touch;padding:6px 10px 10px;height:224px;box-sizing:border-box;"><div class="gif-grid" id="'+(isDesk?'desk':'mob')+'GifGrid"><div class="gif-loading">Yükleniyor...</div></div></div>';
  h+='</div>';
  target.innerHTML=h;
  loadCustomEmojis(isDesk);
}

function switchPickerTab(tab, isDesk){
  const pfx = isDesk?'desk':'mob';
  const emojiTab = document.getElementById(pfx+'TabEmoji');
  const gifTab = document.getElementById(pfx+'TabGif');
  const emojiBody = document.getElementById(pfx+'EmojiBody');
  const gifBody = document.getElementById(pfx+'GifBody');
  if(!emojiTab||!gifTab) return;
  if(tab==='emoji'){
    emojiTab.classList.add('active'); gifTab.classList.remove('active');
    emojiBody.style.display=''; gifBody.style.display='none';
  } else {
    gifTab.classList.add('active'); emojiTab.classList.remove('active');
    emojiBody.style.display='none'; gifBody.style.display='block';
  }
}

let _gifDebTimer = null;
let _gifApiReady = true;








// Sayfa açılırken localStorage'daki key'i yükle
(function initGifKey(){
  const saved = localStorage.getItem('sohbet_giphy_key');
  if(saved){
    try{  } catch(e){}
    _gifApiReady = true;
  }
})();

function scrollEmojiCat(i){const el=document.getElementById('ecat-'+i);if(el)el.scrollIntoView({block:'nearest'});}


/* ══ Custom Emoji Sistemi ══ */

let _ceFileData = null;
let _ceFileName = null;

function openCeModal(){
  _ceFileData = null;
  document.getElementById('ceNameInp').value = '';
  document.getElementById('cePreview').innerHTML = '<span style="color:var(--muted);font-size:.7rem;text-align:center;">Önizleme</span>';
  document.getElementById('ceFileInput').value = '';
  document.getElementById('ceModal').classList.add('open');
}
function closeCeModal(){
  document.getElementById('ceModal').classList.remove('open');
}
function cePrevFile(inp){
  const file = inp.files[0];
  if(!file) return;
  _ceFileName = file.name;
  const reader = new FileReader();
  reader.onload = function(e){
    _ceFileData = e.target.result;
    document.getElementById('cePreview').innerHTML = `<img src="${_ceFileData}" />`;
    // İsim alanını otomatik doldur (uzantısız)
    const nameInp = document.getElementById('ceNameInp');
    if(!nameInp.value){
      nameInp.value = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0,32);
    }
  };
  reader.readAsDataURL(file);
}
async function saveCustomEmoji(){
  const name = document.getElementById('ceNameInp').value.trim().replace(/[^a-zA-Z0-9_-]/g,'_').toLowerCase();
  if(!name){ showToast('Emoji adı girin'); return; }
  if(!_ceFileData){ showToast('Bir dosya seçin'); return; }
  if(!_cu){ showToast('Giriş yapmalısınız'); return; }
  // Firebase'e kaydet
  const key = name + '_' + Date.now();
  const ceData = { name, url: _ceFileData, addedBy: _cu, ts: Date.now() };
  try {
    await dbRef('customEmojis/' + key).set(ceData);
    showToast('✨ Emoji eklendi: :' + name + ':');
    closeCeModal();
    // Picker'ı yenile
    loadCustomEmojis(IS_DESKTOP());
  } catch(e) {
    showToast('Kaydedilemedi: ' + e.message);
  }
}
async function loadCustomEmojis(isDesk){
  const pfx = isDesk ? 'desk' : 'mob';
  const grid = document.getElementById(pfx + 'CustomEmojiGrid');
  if(!grid) return;
  try {
    const snap = await dbRef('customEmojis').once('value');
    const data = snap.val();
    if(!data || !Object.keys(data).length){
      grid.innerHTML = '<div style="color:var(--muted);font-size:.78rem;">Henüz özel emoji yok. + Emoji Ekle butonuna tıkla!</div>';
      return;
    }
    grid.innerHTML = Object.entries(data).map(([key, ce])=>{
      const safeUrl = (ce.url||'').replace(/'/g,"\'");
      const canDelete = ce.addedBy === _cu || _isAdmin;
      return `<div class="custom-emoji-item" title=":${ce.name}:" onclick="insertCustomEmoji('${safeUrl}')">
        <img src="${ce.url}" />
        ${canDelete ? `<div class="ce-delete" onclick="event.stopPropagation();deleteCustomEmoji('${key}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>` : ''}
      </div>`;
    }).join('');
  } catch(e) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:.78rem;">Yüklenemedi.</div>';
  }
}
function insertCustomEmoji(url){
  // Özel emoji resim olarak gönder
  closeEmoji();
  const room = IS_DESKTOP() ? _deskRoom : _cRoom;
  if(!room || !_cu) return;
  const msgData = { user: _cu, ts: Date.now(), file: { type: 'image/gif', data: url, name: 'emoji', isEmoji: true } };
  dbRef('msgs/' + room).push(msgData).catch(()=>showToast('Gönderilemedi'));
}
async function deleteCustomEmoji(key){
  if(!confirm('Bu emojiyi sil?')) return;
  await dbRef('customEmojis/' + key).remove().catch(()=>showToast('Silinemedi'));
  showToast('Emoji silindi');
  loadCustomEmojis(IS_DESKTOP());
}

function insertEmoji(e){
  const inp=IS_DESKTOP()?document.getElementById('deskInp'):document.getElementById('msgInp');
  if(!inp)return;
  const s=inp.selectionStart,end=inp.selectionEnd;
  inp.value=inp.value.slice(0,s)+e+inp.value.slice(end);
  inp.selectionStart=inp.selectionEnd=s+e.length;
  if(IS_DESKTOP())deskInpResize(inp);else autoResize(inp);
  inp.focus();
  closeEmoji();
}


/* ── Tabs ── */

function switchFrTab(n){
  _frTab=n;
  [1,2,3].forEach(i=>{
    document.getElementById('frTab'+i).classList.toggle('act',i===n);
  });
  if(n===1) loadFriendsList();
  else if(n===2) loadFriendRequests();
  else loadAddFriend();
}


/* ── Profile ── */

function openProfile(){ switchMainTab('profile'); }
function closeProfile(){ switchMainTab('home'); }


/* ── Image ── */

function zoomImg(src){document.getElementById('imgOverlayImg').src=src;document.getElementById('imgOverlay').classList.add('open');}
function closeImg(){document.getElementById('imgOverlay').classList.remove('open');document.getElementById('imgOverlayImg').src='';}
function downloadOverlayImg(){
  const img=document.getElementById('imgOverlayImg');
  if(!img||!img.src) return;
  downloadDataUrl(img.src, 'gorsel_'+Date.now()+'.jpg');
}
/* Evrensel indirme yardımcısı — data: URL'leri Blob'a çevirir (Chrome kısıtlamasını aşar) */
function downloadDataUrl(dataUrl, filename){
  try{
    fetch(dataUrl).then(r=>r.blob()).then(blob=>{
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=filename||'dosya';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 5000);
    }).catch(()=>{
      // Fallback: direkt link
      const a=document.createElement('a');
      a.href=dataUrl; a.download=filename||'dosya';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
    });
  }catch(e){
    const a=document.createElement('a');
    a.href=dataUrl; a.download=filename||'dosya';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}


/* ══════════════════════════════════════
   👑 ADMİN PANELİ
   ══════════════════════════════════════ */

let _prevScreen='roomsScreen';

/* Admin için ikincil Firebase bağlantısı */
let _adminDB = null;  // seçili sunucunun db'si
let _adminServer = null; // seçili sunucu key'i
let _adminRestUrl = ''; // seçili sunucunun REST url'i

function openAdminPanel(){
  if(!_isAdmin){showToast('Yetkisiz erişim.');return;}
  _prevScreen=document.querySelector('.screen.active')?.id||'roomsScreen';
  showScreen('adminPanel');
  _adminServer = _activeServer;
  _adminDB = _db;
  _adminRestUrl = _FB_REST;
  renderAdminSrvSwitcher();
  // Header güncellemeleri
  const srvLabel = document.getElementById('adminSrvLabel');
  if(srvLabel && typeof FB_SERVERS!=='undefined' && _activeServer)
    srvLabel.textContent = (FB_SERVERS[_activeServer]?.icon||'') + ' ' + (FB_SERVERS[_activeServer]?.label||_activeServer);
  const badge = document.getElementById('adminOnlineBadge');
  if(badge) badge.textContent = '🟢 '+Object.keys(_online||{}).length+' online';
  adminTab('users');
}

function renderAdminSrvSwitcher(){
  const el = document.getElementById('adminSrvSwitcher');
  if(!el) return;
  el.innerHTML = Object.entries(FB_SERVERS).map(([key,srv])=>`
    <button onclick="switchAdminServer('${key}')" id="adminSrvBtn_${key}"
      style="padding:5px 16px;border-radius:100px;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .15s;border:1px solid ${key===(_adminServer||_activeServer)?'rgba(155,114,255,.5)':'var(--border)'};
             background:${key===(_adminServer||_activeServer)?'rgba(155,114,255,.15)':'transparent'};
             color:${key===(_adminServer||_activeServer)?'#c4a7ff':'var(--muted)'}">>
      ${srv.icon} ${srv.label}
    </button>
  `).join('');
  // İlk açılışta aktif sunucuyu seç
  if(!_adminServer) _adminServer = _activeServer;
  _adminRestUrl = FB_SERVERS[_adminServer]?.config?.databaseURL || _FB_REST;
}

async function switchAdminServer(key){
  if(!_isAdmin){ showToast('Yetkisiz erişim.'); return; }
  if(!FB_SERVERS[key]) return;
  _adminServer = key;
  _adminRestUrl = FB_SERVERS[key].config.databaseURL;

  // Butonu güncelle
  document.querySelectorAll('[id^="adminSrvBtn_"]').forEach(b=>{
    const k = b.id.replace('adminSrvBtn_','');
    b.style.background = k===key ? 'var(--accent)' : 'var(--bg)';
    b.style.color = k===key ? '#fff' : 'var(--muted)';
  });

  // Yükleniyor göster
  const body = document.getElementById('adminBody') || document.getElementById('deskAdminBody');
  if(body) body.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted)">🔄 Sunucuya bağlanılıyor...</div>';

  // Firebase SDK bağlantısı + anonim auth — paneli açmadan ÖNCE tamamla
  try{
    const existingApp = firebase.apps.find(a=>a.name==='admin_'+key);
    const app = existingApp || firebase.initializeApp(FB_SERVERS[key].config, 'admin_'+key);
    _adminDB = firebase.database(app);

    const adminAuth = firebase.auth(app);
    // Token almadan önce oturumu kesin olarak bekle
    if(!adminAuth.currentUser){
      try{
        await adminAuth.signInAnonymously();
        // Token'ın hazır olmasını bekle
        await adminAuth.currentUser?.getIdToken(true);
      }catch(authErr){
        console.warn('Admin sunucu anonim auth hatası:', authErr.code, authErr.message);
        if(authErr.code === 'auth/operation-not-allowed'){
          if(body) body.innerHTML = '<div style="padding:20px;color:var(--red)">⚠️ Bu Firebase projesinde Anonymous Authentication kapalı.<br><br>Firebase Console → layla-70d21 → Authentication → Sign-in method → Anonymous → Etkinleştir</div>';
          showToast('⚠️ Anonymous Auth kapalı — Firebase Console kontrol et');
          return;
        }
      }
    } else {
      // Mevcut token'ı yenile
      try{ await adminAuth.currentUser.getIdToken(true); }catch(e){}
    }
  }catch(e){ console.warn('Admin DB switch:', e); }

  showToast(FB_SERVERS[key].icon+' '+FB_SERVERS[key].label+' bağlandı');
  adminTab(_adminTab||'users');
}

/* Admin panel için özel dbRef — seçili sunucuyu kullanır */
function adminDbRef(path){
  // Farklı sunucu seçildiyse _adminDB kullan, yoksa normal _db
  const db = (_adminServer && _adminServer !== _activeServer && _adminDB) ? _adminDB : _db;
  return db.ref(path);
}

/* Admin panel için REST get/set — seçili sunucunun URL'ini kullanır */
async function getAdminRestToken(){
  // Seçili admin sunucusu aktif sunucuyla aynıysa mevcut token'ı kullan
  if(!_adminServer || _adminServer === _activeServer){
    return await getFbAuthToken();
  }
  // Farklı sunucu: o sunucuya ait Firebase app'in token'ını al
  try{
    const app = firebase.apps.find(a=>a.name==='admin_'+_adminServer);
    if(app){
      const auth = firebase.auth(app);
      if(auth.currentUser) return await auth.currentUser.getIdToken(false);
      // Token yok — anonim girişi tekrar dene
      try{
        await auth.signInAnonymously();
        if(auth.currentUser) return await auth.currentUser.getIdToken(false);
      }catch(e2){ console.warn('getAdminRestToken anon retry:', e2.code); }
    }
  }catch(e){}
  return null;
}
async function adminRestGet(path){
  if(!_isAdmin){ console.warn('adminRestGet: yetkisiz erişim engellendi'); return null; }
  const url = (_adminServer ? (FB_SERVERS[_adminServer]?.config?.databaseURL||_FB_REST) : _FB_REST);
  const token = await getAdminRestToken();
  const authParam = token ? '?auth='+token : '';
  const r = await fetch(url+'/'+path+'.json'+authParam,{cache:'no-store'});
  const d = await r.json();
  return d;
}
async function adminRestSet(path, val){
  if(!_isAdmin){ console.warn('adminRestSet: yetkisiz erişim engellendi'); return; }
  const url = (_adminServer ? (FB_SERVERS[_adminServer]?.config?.databaseURL||_FB_REST) : _FB_REST);
  const token = await getAdminRestToken();
  const authParam = token ? '?auth='+token : '';
  const r = await fetch(url+'/'+path+'.json'+authParam,{method:'PUT',body:JSON.stringify(val),headers:{'Content-Type':'application/json'}});
  if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error((e&&e.error)||('HTTP '+r.status)); }
  return r.json().catch(()=>null);
}
async function adminRestDelete(path){
  if(!_isAdmin){ console.warn('adminRestDelete: yetkisiz erişim engellendi'); return; }
  const url = (_adminServer ? (FB_SERVERS[_adminServer]?.config?.databaseURL||_FB_REST) : _FB_REST);
  const token = await getAdminRestToken();
  const authParam = token ? '?auth='+token : '';
  const r = await fetch(url+'/'+path+'.json'+authParam,{method:'DELETE'});
  if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error((e&&e.error)||('HTTP '+r.status)); }
  return r.json().catch(()=>null);
}
function closeAdminPanel(){if(_prevScreen==='roomsScreen')switchMainTab('home');else showScreen(_prevScreen);}

function adminTab(tab){
  if(IS_DESKTOP()){ deskAdminTab(tab); return; }
  _adminTab=tab;
  document.querySelectorAll('.atab').forEach((el,i)=>{
    el.classList.toggle('act', el.getAttribute('onclick')===`adminTab('${tab}')`);
  });
  // Online sayısını güncelle
  const badge = document.getElementById('adminOnlineBadge');
  if(badge) badge.textContent = '🟢 '+Object.keys(_online||{}).length+' online';
  const body=document.getElementById('adminBody');
  if(!body) return;
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  if(tab==='users') loadAdminUsers();
  else if(tab==='rooms') loadAdminRooms();
  else if(tab==='msgs') loadAdminMsgs();
  else if(tab==='forum') loadAdminForum();
  else if(tab==='announce') loadAdminAnnounce();
  else if(tab==='games') loadAdminGames();
  else if(tab==='health') loadAdminSystemHealth();
  else if(tab==='stats') loadAdminStats();
  else if(tab==='security') loadAdminSecurity();
  else if(tab==='ipbans') loadAdminIPBans();
  else if(tab==='settings') loadAdminSettings();
  else if(tab==='design') loadAdminDesign();
  else if(tab==='naturebot') loadAdminNatureBot();
  else if(tab==='reports') { if(typeof loadAdminReports==='function') loadAdminReports(); else body.innerHTML='<p style="color:var(--muted);padding:20px">Yükleniyor...</p>'; }
  else if(tab==='growth') { if(typeof loadAdminGrowthChart==='function') loadAdminGrowthChart(); else body.innerHTML='<p style="color:var(--muted);padding:20px">Yükleniyor...</p>'; }
  else if(tab==='stats') { if(typeof loadAdminStats==='function') loadAdminStats(); else body.innerHTML='<p style="color:var(--muted);padding:20px">Yükleniyor...</p>'; }
  else if(tab==='activity') { if(typeof loadAdminActivityFull==='function') loadAdminActivityFull(); }
  else if(tab==='create_user') { if(typeof window._renderCreateUser==='function') window._renderCreateUser(body); }
  else if(tab==='invite') { if(typeof window._renderInviteLinks==='function') window._renderInviteLinks(body); }
}


/* ══════════════════════════════════════════════
   ➕ ÖZEL OYUN EKLEME
══════════════════════════════════════════════ */

function showAddGameModal(){
  const m = document.createElement('div');
  m.id = 'addGameModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;">
      <div style="font-size:1rem;font-weight:900;color:var(--text-hi);margin-bottom:16px;">➕ Yeni Oyun Ekle</div>

      <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Oyun Adı <span style="color:#e74c3c">*</span></div>
      <input id="ag-name" class="admin-inp" placeholder="Örn: Snake Game" style="margin-bottom:10px;">

      <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Oyun URL (iframe açılacak) <span style="color:#e74c3c">*</span></div>
      <input id="ag-url" class="admin-inp" placeholder="https://..." style="margin-bottom:10px;">

      <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Kategori</div>
      <select id="ag-cat" class="admin-inp" style="margin-bottom:10px;">
        <option value="io">🌐 .io Oyunlar</option>
        <option value="action">⚔️ Aksiyon</option>
        <option value="racing">🏎️ Yarış</option>
        <option value="strategy">♟️ Strateji</option>
      </select>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Emoji/İkon</div>
          <input id="ag-icon" class="admin-inp" placeholder="🎮" maxlength="4" style="margin-bottom:0;">
        </div>
        <div>
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Renk</div>
          <div style="display:flex;gap:6px;align-items:center;">
            <input id="ag-color" type="color" value="#8e44ad" style="width:40px;height:34px;border-radius:6px;border:1px solid var(--border);cursor:pointer;background:none;padding:2px;">
            <span id="ag-color-val" style="font-size:.72rem;color:var(--muted);">#8e44ad</span>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Kısa Açıklama</div>
          <input id="ag-desc" class="admin-inp" placeholder="Eğlenceli oyun!" style="margin-bottom:0;">
        </div>
        <div>
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">Yaş Sınırı</div>
          <select id="ag-age" class="admin-inp" style="margin-bottom:0;">
            <option value="0+">0+</option>
            <option value="6+">6+</option>
            <option value="12+" selected>12+</option>
            <option value="16+">16+</option>
            <option value="18+">18+</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="a-btn blue" style="flex:1;" onclick="saveNewGame()">✅ Kaydet</button>
        <button class="a-btn" style="flex:1;background:var(--surface2);" onclick="document.getElementById('addGameModal').remove()">İptal</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  // Renk seçici preview
  document.getElementById('ag-color').addEventListener('input', function(){ document.getElementById('ag-color-val').textContent = this.value; });
  // Dışa tıklayınca kapat
  m.addEventListener('click', function(e){ if(e.target===m) m.remove(); });
}

function saveNewGame(){
  const name  = document.getElementById('ag-name')?.value.trim();
  const url   = document.getElementById('ag-url')?.value.trim();
  const cat   = document.getElementById('ag-cat')?.value || 'io';
  const icon  = document.getElementById('ag-icon')?.value.trim() || '🎮';
  const color = document.getElementById('ag-color')?.value || '#8e44ad';
  const desc  = document.getElementById('ag-desc')?.value.trim() || '';
  const age   = document.getElementById('ag-age')?.value || '12+';

  if(!name){ showToast('❌ Oyun adı zorunlu!'); return; }
  if(!url || !url.startsWith('http')){ showToast('❌ Geçerli bir URL girin!'); return; }

  // Benzersiz id üret
  const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12) + '_' + Date.now().toString(36);
  const gameData = { name, url, cat, icon, color, desc, age };

  adminRestSet('settings/customGames/' + id, gameData).then(()=>{
    // Belleği güncelle
    _customGames.push({...gameData, id, _custom:true});
    _saveCgCache();
    showToast('✅ Oyun eklendi!');
    document.getElementById('addGameModal')?.remove();
    loadAdminGames();
  }).catch(()=>showToast('❌ Kaydetme hatası.'));
}

function deleteCustomGame(gameId){
  if(!confirm('Bu özel oyun silinsin mi?')) return;
  adminRestDelete('settings/customGames/'+gameId).then(()=>{
    // Görselini de sil
    adminRestDelete('settings/gameImages/'+gameId).catch(()=>{});
    delete _customGameImages[gameId];
    _customGames = _customGames.filter(g=>g.id!==gameId);
    _saveCgCache();
    _saveCgiCache();
    showToast('Oyun silindi.');
    loadAdminGames();
  }).catch(()=>showToast('❌ Silme hatası.'));
}


/* ══════════════════════════════════════════════════════════
   👑 GENİŞLETİLMİŞ ADMİN YETKİLERİ
══════════════════════════════════════════════════════════ */



/* ══════════════════════════════════════════════════════════
   İYİLEŞTİRİLMİŞ loadAdminUsers — Detay & Düzenle butonları
══════════════════════════════════════════════════════════ */



function triggerPhotoUpload(){
  document.getElementById('photoFileInput').click();
}

function handlePhotoUpload(e){
  const file=e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){showToast('Lütfen bir resim seçin.');return;}
  if(file.size>5*1024*1024){showToast('Resim 5MB\'dan küçük olmalı.');return;}

  const reader=new FileReader();
  reader.onload=function(ev){
    // Resmi sıkıştır
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      const MAX=256;
      let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=h*MAX/w;w=MAX;}}else{if(h>MAX){w=w*MAX/h;h=MAX;}}
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/jpeg',0.82);

      // Firebase'e kaydet
      showToast('Fotoğraf yükleniyor...');
      dbRef('users/'+_cu+'/photoURL').set(dataUrl).then(()=>{
        // Cache'i temizle ve fotoğrafı direkt uygula (Firebase'e gerek kalmadan)
        _avatarCache[_cu] = dataUrl;
        // Tüm avatar elementlerini güncelle
        ['profAvBig','deskProfAvBig','myAvatar','forumAvatar','deskRailUser','deskSidebarAvatar'].forEach(id=>{
          const el=document.getElementById(id);
          if(el){ _applyAvatarPhoto(el, dataUrl); }
        });
        // Sohbet listesindeki kendi mesaj avatarlarını güncelle
        document.querySelectorAll('[data-av-user="'+_cu+'"]').forEach(el=>_applyAvatarPhoto(el,dataUrl));
        showToast('✅ Profil fotoğrafı güncellendi!');
      }).catch(()=>showToast('Yükleme başarısız.'));
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  // Input'u sıfırla
  e.target.value='';
}

function openChangePassword(){
  let modal=document.getElementById('changePwModal');
  // Masaüstü uyumluluğu: modal body'e taşınmamışsa taşı
  if(modal && modal.parentElement !== document.body){
    document.body.appendChild(modal);
  }
  modal=document.getElementById('changePwModal');
  modal.style.display='flex';
  document.getElementById('pwOld').value='';
  document.getElementById('pwNew').value='';
  document.getElementById('pwNew2').value='';
  document.getElementById('pwChangeErr').textContent='';
  document.getElementById('pwChangeErr').classList.remove('show');
}
function closeChangePassword(){
  document.getElementById('changePwModal').style.display='none';
}
async function submitChangePassword(){
  const oldPass=document.getElementById('pwOld').value;
  const newPass=document.getElementById('pwNew').value;
  const newPass2=document.getElementById('pwNew2').value;
  const errEl=document.getElementById('pwChangeErr');
  const showErr=msg=>{errEl.textContent=msg;errEl.classList.add('show');};

  if(!oldPass){showErr('Mevcut şifreyi girin.');return;}
  if(newPass.length<6){showErr('Yeni şifre en az 6 karakter olmalı.');return;}
  if(newPass!==newPass2){showErr('Yeni şifreler eşleşmiyor.');return;}

  const oldHash=await hashStr(oldPass+_cu);
  const newHash=await hashStr(newPass+_cu);

  if(oldHash!==_passwordHash){showErr('Mevcut şifre yanlış.');return;}

  dbRef('users/'+_cu+'/passwordHash').set(newHash).then(()=>{
    _passwordHash=newHash;
    localStorage.setItem('sohbet_pass_' + _activeServer, newHash);
    closeChangePassword();
    showToast('Şifre başarıyla güncellendi! 🔑');
  }).catch(()=>showErr('Güncelleme başarısız.'));
}


/* ── Helpers ── */

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function initials(n){return String(n||'?').slice(0,2).toUpperCase();}
function strColor(s){if(!s)return '#5b9bd5';const c=['#E01E5A','#36C5F0','#2EB67D','#ECB22E','#9B72FF','#1D9BD1','#E8912D','#78D26F'];let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return c[h%c.length];}


/* ══ TARİHİ TÜRK SÖYLEM SİSTEMİ ══ */

const TURK_QUOTES = [
  // ── Kadim Türk / Göktürk ──
  {ruler:"Bilge Kağan", era:"Göktürk İmparatorluğu · 716-734", quote:"Türk milleti yok olmasın diye, milleti için gece uyumadım, gündüz oturmadım."},
  {ruler:"Bilge Kağan", era:"Göktürk İmparatorluğu · 716-734", quote:"Üstte gök çökmese, altta yer delinmese, senin ilini ve töreni kim bozabilir?"},
  {ruler:"Bilge Kağan", era:"Göktürk İmparatorluğu · 716-734", quote:"Türk budun, aç iken tok olursun; çıplak iken giyinirsin; yoksul iken zengin olursun."},
  {ruler:"Kül Tigin", era:"Göktürk İmparatorluğu · 684-731", quote:"Türk milleti, kendine ait yurdu, devleti ve töresi olduğu sürece yok olmaz."},
  {ruler:"Kül Tigin", era:"Göktürk İmparatorluğu · 684-731", quote:"Ey Türk, aç isen doyarsın; güçsüz isen güçlenirsin; birlik olursan her şeyi yenebilirsin."},
  {ruler:"Tonyukuk", era:"Göktürk Devlet Adamı · 646-726", quote:"Birliğini kaybeden millet, gücünü kaybeder."},
  {ruler:"Tonyukuk", era:"Göktürk Devlet Adamı · 646-726", quote:"Az kişiyle çok kişiyi yendim; güçlü olduğum için değil, akıl kullandığım için."},
  // ── Hun İmparatorluğu ──
  {ruler:"Mete Han", era:"Hun İmparatorluğu · MÖ 209-174", quote:"Birlik olmayan yerde kuvvet olmaz, kuvvet olmayan yerde zafer olmaz."},
  {ruler:"Mete Han", era:"Hun İmparatorluğu · MÖ 209-174", quote:"Atı olmayan er, kanadı olmayan kuş gibidir."},
  {ruler:"Mete Han", era:"Hun İmparatorluğu · MÖ 209-174", quote:"Düşmanını küçük görme, kendini büyük görme."},
  {ruler:"Attila", era:"Hun İmparatorluğu · 434-453", quote:"Nereye kılıcım yetişirse, orası vatanım olur."},
  {ruler:"Attila", era:"Hun İmparatorluğu · 434-453", quote:"Cesaretsiz bir asker, silahsız bir askerden daha tehlikelidir."},
  // ── Uygur & Avar ──
  {ruler:"Moyun Çur Kağan", era:"Uygur Kağanlığı · 747-759", quote:"Devlet, milletin huzuruna hizmet etmek için vardır."},
  {ruler:"Bayan Kağan", era:"Avar İmparatorluğu · 562-602", quote:"Güçlü olan değil, akıllı olan kazanır."},
  // ── Büyük Selçuklu ──
  {ruler:"Alparslan", era:"Büyük Selçuklu İmparatorluğu · 1063-1072", quote:"Zafer, Allah'ın yardımıyla kazanılır; kılıcın gücüyle değil."},
  {ruler:"Alparslan", era:"Büyük Selçuklu İmparatorluğu · 1063-1072", quote:"Adil ol ki milletin seni sevsin; güçlü ol ki düşmanın senden çekinsin."},
  {ruler:"Melikşah", era:"Büyük Selçuklu İmparatorluğu · 1072-1092", quote:"Milletin refahı, hükümdarın şerefidir."},
  // ── Atatürk ──
  {ruler:"Mustafa Kemal Atatürk", era:"Türkiye Cumhuriyeti Kurucusu · 1881-1938", quote:"Ne mutlu Türk'üm diyene!"},
  {ruler:"Mustafa Kemal Atatürk", era:"Türkiye Cumhuriyeti Kurucusu · 1881-1938", quote:"Yurtta sulh, cihanda sulh."},
  {ruler:"Mustafa Kemal Atatürk", era:"Türkiye Cumhuriyeti Kurucusu · 1881-1938", quote:"Türk gençliği, istikbalin teminatıdır."},
  // ── Osmanlı (az) ──
  {ruler:"Fatih Sultan Mehmed", era:"Osmanlı İmparatorluğu · 1444-1481", quote:"Bir şehri fethetmek için önce insan kalplerini fethetmek gerekir."},
  {ruler:"Kanuni Sultan Süleyman", era:"Osmanlı İmparatorluğu · 1520-1566", quote:"Adalet mülkün temelidir."},
];

let _turkQuoteIdx = 0;
let _turkQuoteTimer = null;




// Overlay'e tıklayınca kapat
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('turkQuoteOverlay').addEventListener('click', function(e) {
    if(e.target === this) closeTurkQuote();
  });
});

/* ══ TARİHİ TÜRK SÖYLEM SİSTEMİ SON ══ */




/* ══════════════════════════════════════
   FORUM SİSTEMİ
   ══════════════════════════════════════ */

let _forumFilter = 'hepsi';
let _forumStop = null;
const CAT_LABELS = {genel:'💬 Genel', tarih:'📜 Tarih', kultur:'🎭 Kültür', spor:'⚽ Spor', muzik:'🎵 Müzik', teknoloji:'💻 Teknoloji', soru:'❓ Soru'};





function filterForum(cat) {
  _forumFilter = cat;
  document.querySelectorAll('.fcat').forEach(el => {
    el.classList.toggle('act', el.dataset.cat === cat);
  });
  loadForum();
}

function loadForum() {
  const feed = document.getElementById('forumFeed');
  feed.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  if(_forumStop){ _forumStop(); }

  let ref = dbRef('forum/posts').orderByChild('ts').limitToLast(50);
  const handler = ref.on('value', snap => {
    const posts = snap.val() || {};
    const arr = Object.entries(posts).map(([k,v]) => ({...v, _key:k}));
    arr.sort((a,b) => b.ts - a.ts);
    const filtered = _forumFilter === 'hepsi' ? arr : arr.filter(p => p.cat === _forumFilter);
    if(!filtered.length) {
      feed.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:10px">📋</div><div style="font-weight:700;">Henüz paylaşım yok</div><div style="font-size:.82rem;margin-top:4px;">İlk paylaşımı sen yap!</div></div>';
      return;
    }
    feed.innerHTML = filtered.map(p => renderForumCard(p)).join('');
  });
  _forumStop = () => ref.off('value', handler);
}

function renderForumCard(p) {
  const isOwn = p.user === _cu;
  const likeCount = p.likes ? Object.keys(p.likes).length : 0;
  const liked = !!(p.likes && p.likes[_cu]);
  const dislikeCount = p.dislikes ? Object.keys(p.dislikes).length : 0;
  const disliked = !!(p.dislikes && p.dislikes[_cu]);
  const heartCount = p.hearts ? Object.keys(p.hearts).length : 0;
  const hearted = !!(p.hearts && p.hearts[_cu]);
  const commentCount = p.comments ? Object.keys(p.comments).length : 0;
  const catLabel = CAT_LABELS[p.cat] || p.cat || '💬 Genel';
  const timeStr = formatDate(new Date(p.ts)) + ' ' + fmtTime(p.ts);

  const commentsHtml = p.comments ? Object.entries(p.comments).sort((a,b)=>a[1].ts-b[1].ts).map(([cKey,c]) => {
    const cLiked = !!(c.likes && c.likes[_cu]);
    const cLikeCount = c.likes ? Object.keys(c.likes).length : 0;
    const cDisliked = !!(c.dislikes && c.dislikes[_cu]);
    const cDislikeCount = c.dislikes ? Object.keys(c.dislikes).length : 0;
    return `<div class="forum-comment" id="fcom-${p._key}-${cKey}">
      <div class="forum-comment-av" style="background:${strColor(c.user)}">${initials(c.user)}</div>
      <div class="forum-comment-body">
        <div class="forum-comment-user">${esc(c.user)}</div>
        <div class="forum-comment-text">${esc(c.text)}</div>
        <div class="forum-comment-actions">
          <div class="com-act-btn${cLiked?' liked':''}" onclick="toggleCommentReact('${p._key}','${cKey}','like',${cLiked})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> <span>${cLikeCount||''}</span></div>
          <div class="com-act-btn${cDisliked?' disliked':''}" onclick="toggleCommentReact('${p._key}','${cKey}','dislike',${cDisliked})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg> <span>${cDislikeCount||''}</span></div>
          ${(c.user===_cu||_isAdmin)?`<div class="com-act-btn" onclick="deleteForumComment('${p._key}','${cKey}')" style="cursor:pointer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg></div>`:''}
        </div>
      </div>
    </div>`;
  }).join('') : '';

  return `<div class="forum-card" id="fcard-${p._key}">
    <div class="forum-card-header">
      <div class="forum-card-av" style="background:${strColor(p.user)}">${initials(p.user)}</div>
      <div class="forum-card-meta">
        <div class="forum-card-user">${esc(p.user)}</div>
        <div class="forum-card-time">${timeStr}</div>
      </div>
      <div class="forum-card-cat">${catLabel}</div>
    </div>
    <div class="forum-card-text">${p.bbcode ? parseBBCode(p.text) : (p.html ? sanitizeForumHtml(p.html) : esc(p.text))}</div>
    <div class="forum-card-actions">
      <div class="forum-action-btn${liked?' liked':''}" onclick="toggleForumReact('${p._key}','like',${liked})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> <span>${likeCount||''}</span>
      </div>
      <div class="forum-action-btn${disliked?' disliked':''}" onclick="toggleForumReact('${p._key}','dislike',${disliked})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg> <span>${dislikeCount||''}</span>
      </div>
      <div class="forum-action-btn${hearted?' liked':''}" onclick="toggleForumHeart('${p._key}',${hearted})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> <span>${heartCount||''}</span>
      </div>
      <div class="forum-action-btn" onclick="toggleForumComments('${p._key}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <span>${commentCount||''}</span>
      </div>
      ${(isOwn||_isAdmin)?`<div class="forum-del-btn" onclick="deleteForumPost('${p._key}')">${'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>'}</div>`:''}
    </div>
    <div id="fcomments-${p._key}" style="display:none;">
      <div class="forum-comments">
        <div id="fcomlist-${p._key}">${commentsHtml}</div>
        <div class="forum-comment-inp-row">
          <input class="forum-comment-inp" id="fcinp-${p._key}" placeholder="Yorum yaz..." onkeydown="if(event.key==='Enter'){submitForumComment('${p._key}');event.preventDefault();}">
          <button class="forum-send-btn" onclick="submitForumComment('${p._key}')">↑</button>
        </div>
      </div>
    </div>
  </div>`;
}

function onForumCatChange(cat) {
  if(cat) {
    filterForum(cat);
    const sel = document.getElementById('forumCategorySelect');
    if(sel) sel.style.color = 'var(--text-hi)';
  }
}


/* ══ BBCode Editör Fonksiyonları ══ */

function parseBBCode(text){
  if(!text) return '';
  let s = text
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  s = s.replace(/\r?\n/g,'<br>');
  s = s.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
  s = s.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
  s = s.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
  s = s.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>');
  s = s.replace(/\[color=([a-zA-Z#0-9]+)\]([\s\S]*?)\[\/color\]/gi,'<span style="color:$1">$2</span>');
  s = s.replace(/\[size=(\d+)\]([\s\S]*?)\[\/size\]/gi,(m,sz,ct)=>`<span style="font-size:${Math.min(Math.max(parseInt(sz),8),32)}px">${ct}</span>`);
  s = s.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,'<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
  s = s.replace(/\[url\]([\s\S]*?)\[\/url\]/gi,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/\[img\]([\s\S]*?)\[\/img\]/gi,'<img src="$1" alt="resim" style="max-width:100%;border-radius:6px;display:block;margin:4px 0;" onerror="this.style.display=\'none\'">');
  s = s.replace(/\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\]/gi,'<blockquote><div style="font-size:.72rem;font-weight:700;margin-bottom:3px;color:var(--accent)">$1 yazdı:</div>$2</blockquote>');
  s = s.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi,'<blockquote>$1</blockquote>');
  s = s.replace(/\[code\]([\s\S]*?)\[\/code\]/gi,'<pre style="background:var(--surface2);border-radius:6px;padding:8px 12px;overflow-x:auto;font-family:monospace;font-size:.82rem;margin:4px 0;white-space:pre-wrap;">$1</pre>');
  s = s.replace(/\[c\]([\s\S]*?)\[\/c\]/gi,'<code>$1</code>');
  s = s.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi,'<span class="bb-spoiler" onclick="this.classList.toggle(\'revealed\')" title="Görmek için tıkla">$1</span>');
  s = s.replace(/\[list\]([\s\S]*?)\[\/list\]/gi,(m,inner)=>{
    const items=inner.split(/\[\*\]/).filter(x=>x.trim());
    return '<ul>'+items.map(it=>`<li>${it.replace(/<br>/g,'').trim()}</li>`).join('')+'</ul>';
  });
  return s;
}

function sanitizeForumHtml(html){
  if(!html) return '';
  // İzin verilen taglar ve özellikler
  const ALLOWED_TAGS = ['b','i','u','s','strong','em','br','p','ul','ol','li','blockquote','code','pre','h1','h2','h3','a','img','span'];
  const ALLOWED_ATTRS = { 'a': ['href','target'], 'img': ['src','alt','width','height'], 'span': ['style'] };
  // Geçici div ile parse et
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Tehlikeli elementleri temizle
  const dangerous = tmp.querySelectorAll('script,iframe,object,embed,form,input,button,link,meta,style,base,svg,math');
  dangerous.forEach(el => el.remove());
  // Tüm elementleri tara
  tmp.querySelectorAll('*').forEach(el => {
    const tag = el.tagName.toLowerCase();
    // İzin verilmeyen tag'i span'a çevir
    if(!ALLOWED_TAGS.includes(tag)){
      const span = document.createElement('span');
      span.innerHTML = el.innerHTML;
      el.replaceWith(span);
      return;
    }
    // Tüm attribute'leri tara
    [...el.attributes].forEach(attr => {
      const allowed = ALLOWED_ATTRS[tag] || [];
      if(!allowed.includes(attr.name)){
        el.removeAttribute(attr.name);
      } else {
        // href ve src'de javascript: protokolünü engelle
        if((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)){
          el.removeAttribute(attr.name);
        }
        // Harici linklere güvenli özellikler ekle
        if(attr.name === 'href') el.setAttribute('rel','noopener noreferrer');
        if(attr.name === 'target') el.setAttribute('target','_blank');
      }
    });
    // style attribute'te expression/url engellemesi
    if(el.hasAttribute('style')){
      const safe = el.getAttribute('style').replace(/expression\s*\(|url\s*\(|javascript:/gi,'');
      el.setAttribute('style', safe);
    }
  });
  return tmp.innerHTML;
}

function bbWrap(tag){
  const ta=document.getElementById('forumPostInp');
  if(!ta) return;
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e);
  let open=`[${tag}]`,close=`[/${tag}]`;
  if(tag==='url'){
    const href=prompt('Link URL:','https://');
    if(!href) return;
    open=`[url=${href}]`; close='[/url]';
  }
  ta.value=ta.value.slice(0,s)+open+sel+close+ta.value.slice(e);
  ta.selectionStart=s+open.length;
  ta.selectionEnd=s+open.length+sel.length;
  ta.focus();
  ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,200)+'px';
  if(document.getElementById('bbPreviewArea').style.display!=='none') updateBbPreview();
}

function bbInsert(text){
  const ta=document.getElementById('forumPostInp');
  if(!ta) return;
  const s=ta.selectionStart;
  ta.value=ta.value.slice(0,s)+text+ta.value.slice(s);
  ta.selectionStart=ta.selectionEnd=s+text.length;
  ta.focus();
  ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,200)+'px';
}

function bbColor(){
  const c=prompt('Renk (örn: red, #ff0000, blue):','red');
  if(!c) return;
  const ta=document.getElementById('forumPostInp');
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||'metin';
  const tag=`[color=${c}]${sel}[/color]`;
  ta.value=ta.value.slice(0,s)+tag+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+tag.length; ta.focus();
}

function bbSize(){
  const sz=prompt('Yazı boyutu (8-32):','16');
  if(!sz||isNaN(sz)) return;
  const ta=document.getElementById('forumPostInp');
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||'metin';
  const tag=`[size=${sz}]${sel}[/size]`;
  ta.value=ta.value.slice(0,s)+tag+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+tag.length; ta.focus();
}

function toggleBbPreview(){
  const area=document.getElementById('bbPreviewArea');
  const btn=document.getElementById('bbPreviewBtn');
  const ta=document.getElementById('forumPostInp');
  if(area.style.display==='none'){
    area.style.display='block';
    btn.style.background='var(--accent2)'; btn.style.color='var(--text-hi)';
    updateBbPreview();
    ta.addEventListener('input',updateBbPreview);
  } else {
    area.style.display='none';
    btn.style.background=''; btn.style.color='';
    ta.removeEventListener('input',updateBbPreview);
  }
}

function updateBbPreview(){
  const ta=document.getElementById('forumPostInp');
  const area=document.getElementById('bbPreviewArea');
  if(!ta||!area) return;
  area.innerHTML=parseBBCode(ta.value)||'<span style="color:var(--muted);font-size:.82rem">Önizleme burada görünecek...</span>';
}

function fmtDoc(){}
function fmtInsertLink(){}
function fmtInlineCode(){}
function forumEditorInput(){}
function forumEditorKeydown(){}
function updateFmtBtns(){}

function submitForumPost(){
  const inp=document.getElementById('forumPostInp');
  const bbcode=inp?inp.value.trim():'';
  const sel=document.getElementById('forumCategorySelect');
  const cat=sel?sel.value:'';
  if(!bbcode){showToast('Bir şeyler yaz!');return;}
  if(!cat){
    if(sel){sel.style.border='1px solid var(--red)';setTimeout(()=>sel.style.border='1px solid var(--border)',1500);}
    showToast('⚠️ Kategori seçmelisin!');return;
  }
  if(bbcode.length>2000){showToast('En fazla 2000 karakter!');return;}
  dbRef('forum/posts').push({user:_cu,text:bbcode,bbcode:true,cat,ts:Date.now(),likes:{},dislikes:{},hearts:{},comments:{}})
    .then(()=>{
      if(inp){inp.value='';inp.style.height='auto';}
      if(sel){sel.value='';sel.style.color='var(--muted)';}
      showToast('Paylaşıldı! 🎉');
    })
    .catch(()=>showToast('Hata oluştu.'));
}

function toggleForumReact(postKey, type, isActive) {
  const ref = dbRef('forum/posts/'+postKey+'/'+type+'s/'+_cu);
  const opposite = type==='like'?'dislikes':'likes';
  if(isActive){ ref.remove(); }
  else{ ref.set(true); dbRef('forum/posts/'+postKey+'/'+opposite+'/'+_cu).remove(); }
}

function toggleForumHeart(postKey, isHearted) {
  const ref = dbRef('forum/posts/'+postKey+'/hearts/'+_cu);
  if(isHearted) ref.remove();
  else ref.set(true);
}

// Desktop forum için alias fonksiyonlar
function forumVote(postKey, type) {
  const ref = dbRef('forum/posts/'+postKey+'/'+type+'s/'+_cu);
  const opposite = type==='like'?'dislikes':'likes';
  ref.once('value').then(s=>{
    const isActive = s.val()===true;
    if(isActive){ ref.remove(); }
    else{ ref.set(true); dbRef('forum/posts/'+postKey+'/'+opposite+'/'+_cu).remove(); }
    if(typeof deskLoadForum==='function') setTimeout(deskLoadForum,300);
  });
}
function forumHeart(postKey) {
  const ref = dbRef('forum/posts/'+postKey+'/hearts/'+_cu);
  ref.once('value').then(s=>{
    if(s.val()===true) ref.remove();
    else ref.set(true);
    if(typeof deskLoadForum==='function') setTimeout(deskLoadForum,300);
  });
}

function toggleCommentReact(postKey, commentKey, type, isActive) {
  const ref = dbRef('forum/posts/'+postKey+'/comments/'+commentKey+'/'+type+'s/'+_cu);
  const opposite = type==='like'?'dislikes':'likes';
  if(isActive){ ref.remove(); }
  else{ ref.set(true); dbRef('forum/posts/'+postKey+'/comments/'+commentKey+'/'+opposite+'/'+_cu).remove(); }
}

function toggleForumComments(postKey) {
  const el = document.getElementById('fcomments-'+postKey);
  if(!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if(!isOpen) {
    const inp = document.getElementById('fcinp-'+postKey);
    if(inp) setTimeout(()=>inp.focus(), 100);
  }
}

function submitForumComment(postKey) {
  const inp = document.getElementById('fcinp-'+postKey);
  if(!inp) return;
  const text = inp.value.trim();
  if(!text) return;
  dbRef('forum/posts/'+postKey+'/comments').push({ user:_cu, text, ts:Date.now() })
    .then(() => { inp.value=''; })
    .catch(() => showToast('Hata.'));
}

function deleteForumComment(postKey, commentKey) {
  if(!confirm('Bu yorumu sil?')) return;
  dbRef('forum/posts/'+postKey+'/comments/'+commentKey).remove().catch(()=>showToast('Hata.'));
}

function deleteForumPost(postKey) {
  if(!confirm('Bu paylaşımı sil?')) return;
  dbRef('forum/posts/'+postKey).remove()
    .then(() => showToast('Silindi.'))
    .catch(() => showToast('Hata.'));
}

/* ══ FORUM SİSTEMİ SON ══ */




/* ── State ── */

let _groupCallId = null;       // Aktif grup araması ID'si
let _callId = null;            // _groupCallId ile aynı (uyumluluk)
let _peers = {};               // { username: RTCPeerConnection }
let _remoteStreams = {};        // { username: MediaStream }
let _localStream = null;
let _screenStream = null;
let _callType = null;
let _callOther = null;         // İlk davet edilen (display için)
let _isCaller = false;
let _isMuted = false;
let _isSharingScreen = false;
let _isCameraOn = true;
let _callTimer = null;
let _callSeconds = 0;
let _callStopListeners = [];


/* ── Helpers ── */





/* ══════════════════════════
   ARAMA BAŞLAT
══════════════════════════ */



/* ══════════════════════════
   GÖRÜŞMEYE KULLANICI DAVET ET (aktif arama sırasında)
══════════════════════════ */




/* ══════════════════════════
   GELEN ARAMA DİNLE
══════════════════════════ */



/* ══════════════════════════
   ARAMAYI KABUL ET
══════════════════════════ */



/* ══════════════════════════
   ARAMAYI REDDET
══════════════════════════ */



/* ══════════════════════════
   ARAMA EKRANI GÖSTEr
══════════════════════════ */



/* ══════════════════════════
   ZAMANLAYICI
══════════════════════════ */



/* ══════════════════════════
   ARAMAYI BİTİR
══════════════════════════ */



/* ══════════════════════════
   KONTROLLER
══════════════════════════ */


/* ══════════════════════════
   MİNİMİZE / MAKSİMİZE
══════════════════════════ */



/* ══════════════════════════
   GELEN ARAMA GÖSTER
══════════════════════════ */



/* ══════════════════════════
   KONTROLLER
══════════════════════════ */


let _isSpeakerMuted=false;




/* ══════════════════════════════════════
   🔔 BİLDİRİM SİSTEMİ
   ══════════════════════════════════════ */

let _notifPermission = 'default';
let _lastNotifTs = {};

async function requestNotifPermission(){
  // Silent version — called on login, no toast
  if(!('Notification' in window)) return; // iOS Safari browser: silently skip
  if(Notification.permission==='granted'){ _notifPermission='granted'; return; }
  if(Notification.permission!=='denied'){
    const result = await Notification.requestPermission();
    _notifPermission = result;
  }
}

function showPushNotification(title, body, icon){
  if(_notifPermission!=='granted') return;
  if(document.visibilityState==='visible') return;
  try {
    const n = new Notification(title, {body, icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%232c3038"/><text y="44" x="32" text-anchor="middle" font-size="36">'+icon+'</text></svg>', badge:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%232c3038"/></svg>', vibrate:[200,100,200]});
    n.onclick=()=>{window.focus();n.close();};
    setTimeout(()=>n.close(),5000);
  } catch(e){}
}


/* ══ SES SİSTEMİ ══ */

let _audioCtx = null;
let _audioUserGestured = false;
function getAudioCtx(){
  if(!_audioUserGestured) return null;
  if(!_audioCtx) _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(_audioCtx.state==='suspended') _audioCtx.resume();
  return _audioCtx;
}




/* ══ PROFİL TAB SİSTEMİ ══ */

let _profTab = 'profile';
/* switchProfTab → ui.js */

/* ══ PROFİL TAB SON ══ */



/* ══ SES TERCİHİ ══ */

const RING_TONES = [
  { id:'classic',  label:'Klasik',    desc:'Telefon zili' },
  { id:'modern',   label:'Modern',    desc:'Dijital bip'  },
  { id:'retro',    label:'Retro',     desc:'Eski stil'    },
  { id:'soft',     label:'Yumuşak',   desc:'Sakin melodi' },
  { id:'crystal',  label:'Kristal',   desc:'Cam çıngırak' },
  { id:'nature',   label:'Doğa',      desc:'Orman sesi'   },
  { id:'alarm',    label:'Alarm',     desc:'Güçlü uyarı'  },
];
const NOTIF_TONES = [
  { id:'default',  label:'Varsayılan', desc:'Çift bip'    },
  { id:'ding',     label:'Ding',       desc:'Tek ton'     },
  { id:'pop',      label:'Pop',        desc:'Mesaj popu'  },
  { id:'chime',    label:'Chime',      desc:'Çan sesi'    },
  { id:'water',    label:'Su Damlası', desc:'Hafif tıkırtı'},
  { id:'bubble',   label:'Kabarcık',  desc:'Yumuşak bip'  },
  { id:'whistle',  label:'Islık',      desc:'Hafif ıslık' },
  { id:'wood',     label:'Tahta',      desc:'Odun vurma'  },
  { id:'silent',   label:'Sessiz',     desc:'Ses yok'     },
];

// Her okumada localStorage'dan al — böylece her sekme/her açılışta güncel
function getSelectedRing(){ return localStorage.getItem('sohbet_ring') || 'nature'; }
function getSelectedNotif(){ return localStorage.getItem('sohbet_notif') || 'bubble'; }

function renderToneGrids(){
  const ring = getSelectedRing();
  const notif = getSelectedNotif();
  // Sayfada birden fazla grid olabilir (mobil + desktop) — hepsini güncelle
  document.querySelectorAll('#ringToneGrid').forEach(rg=>{
    rg.innerHTML = RING_TONES.map(t=>`
      <div onclick="selectRingTone('${t.id}')" style="
        cursor:pointer;border-radius:10px;padding:10px 8px;text-align:center;
        background:${ring===t.id?'var(--purple)':'var(--surface)'};
        border:2px solid ${ring===t.id?'var(--accent)':'transparent'};
        transition:all .15s;
      ">
        <div style="font-size:.95rem;font-weight:700;color:var(--text-hi)">${t.label}</div>
        <div style="font-size:.68rem;color:var(--muted);margin-top:2px">${t.desc}</div>
      </div>`).join('');
  });
  document.querySelectorAll('#notifToneGrid').forEach(ng=>{
    ng.innerHTML = NOTIF_TONES.map(t=>`
      <div onclick="selectNotifTone('${t.id}')" style="
        cursor:pointer;border-radius:10px;padding:10px 8px;text-align:center;
        background:${notif===t.id?'var(--purple)':'var(--surface)'};
        border:2px solid ${notif===t.id?'var(--accent)':'transparent'};
        transition:all .15s;
      ">
        <div style="font-size:.95rem;font-weight:700;color:var(--text-hi)">${t.label}</div>
        <div style="font-size:.68rem;color:var(--muted);margin-top:2px">${t.desc}</div>
      </div>`).join('');
  });
}
function selectRingTone(id){
  localStorage.setItem('sohbet_ring', id);
  renderToneGrids();
  _playSoundById('ring', id);
}
function selectNotifTone(id){
  localStorage.setItem('sohbet_notif', id);
  renderToneGrids();
  _playSoundById('notif', id);
}

// Tek merkezi ses çalma fonksiyonu — preview ve gerçek ses aynı
function _playSoundById(type, id){
  if(id==='silent') return;
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    if(ctx.state==='suspended'){ ctx.resume().then(()=>_playSoundById(type,id)); return; }
    const mg = ctx.createGain(); mg.gain.value=1.8; mg.connect(ctx.destination);
    const t = ctx.currentTime;
    if(type==='ring'){
      if(id==='classic'){
        [[0,.18],[.22,.18],[.44,.18],[.66,.18]].forEach(([w,d])=>{
          _toneBeep(ctx,mg,t+w,800,d,'sawtooth');
          _toneBeep(ctx,mg,t+w,1200,d,'square');
        });
      } else if(id==='modern'){
        [[0,.15],[.2,.15],[.4,.15]].forEach(([w,d])=>_toneBeep(ctx,mg,t+w,880,d,'sine'));
      } else if(id==='retro'){
        [0,.1,.2,.3,.4,.5].forEach(w=>_toneBeep(ctx,mg,t+w,660,.09,'square'));
      } else if(id==='soft'){
        [[0,523,.25],[.3,659,.25],[.6,784,.25]].forEach(([w,f,d])=>_toneBeep(ctx,mg,t+w,f,d,'sine'));
      } else if(id==='crystal'){
        // Kristal çıngırak - yüksek frekans, uzun çınlama
        [[0,1047,.6],[.25,1319,.5],[.5,1568,.45]].forEach(([w,f,d])=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.type='sine'; o.frequency.setValueAtTime(f,t+w);
          g.gain.setValueAtTime(0.8,t+w); g.gain.exponentialRampToValueAtTime(0.001,t+w+d);
          o.connect(g); g.connect(mg); o.start(t+w); o.stop(t+w+d+0.05);
        });
      } else if(id==='nature'){
        // Doğa - kuş cıvıltısı gibi frekans kayması
        [0,.2,.4,.6].forEach((w,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.type='sine';
          o.frequency.setValueAtTime(800+i*120,t+w);
          o.frequency.exponentialRampToValueAtTime(1200+i*80,t+w+0.12);
          g.gain.setValueAtTime(0.5,t+w); g.gain.exponentialRampToValueAtTime(0.001,t+w+0.18);
          o.connect(g); g.connect(mg); o.start(t+w); o.stop(t+w+0.2);
        });
      } else if(id==='alarm'){
        [0,.08,.16,.24,.32,.4,.48].forEach(w=>_toneBeep(ctx,mg,t+w,1100,.07,'sawtooth'));
      }
    } else {
      if(id==='default'){
        [[0,900,.14],[.18,1200,.14]].forEach(([w,f,d])=>_toneBeep(ctx,mg,t+w,f,d,'triangle'));
      } else if(id==='ding'){
        _toneBeep(ctx,mg,t,1047,.35,'sine');
      } else if(id==='pop'){
        _toneBeep(ctx,mg,t,800,.08,'sine');
        _toneBeep(ctx,mg,t+.06,1200,.06,'sine');
      } else if(id==='chime'){
        [[0,523,.18],[.15,659,.18],[.3,784,.18],[.45,1047,.18]].forEach(([w,f,d])=>_toneBeep(ctx,mg,t+w,f,d,'sine'));
      } else if(id==='water'){
        // Su damlası - kısa ve tatlı
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';
        o.frequency.setValueAtTime(1200,t);
        o.frequency.exponentialRampToValueAtTime(400,t+0.15);
        g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
        o.connect(g); g.connect(mg); o.start(t); o.stop(t+0.22);
      } else if(id==='bubble'){
        // Kabarcık - çok yumuşak çift pop
        [[0,600,.12],[.15,800,.1]].forEach(([w,f,d])=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.type='sine'; o.frequency.setValueAtTime(f,t+w);
          o.frequency.exponentialRampToValueAtTime(f*0.6,t+w+d);
          g.gain.setValueAtTime(0.5,t+w); g.gain.exponentialRampToValueAtTime(0.001,t+w+d);
          o.connect(g); g.connect(mg); o.start(t+w); o.stop(t+w+d+0.05);
        });
      } else if(id==='whistle'){
        // Hafif ıslık
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';
        o.frequency.setValueAtTime(1800,t);
        o.frequency.linearRampToValueAtTime(2200,t+0.08);
        o.frequency.linearRampToValueAtTime(1600,t+0.2);
        g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
        o.connect(g); g.connect(mg); o.start(t); o.stop(t+0.28);
      } else if(id==='wood'){
        // Tahta vurma - düşük frekans, hızlı çürüme
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='triangle'; o.frequency.setValueAtTime(300,t);
        o.frequency.exponentialRampToValueAtTime(80,t+0.08);
        g.gain.setValueAtTime(1.2,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
        o.connect(g); g.connect(mg); o.start(t); o.stop(t+0.14);
        // İkinci vurma
        setTimeout(()=>{try{
          const ctx2=getAudioCtx(),o2=ctx2.createOscillator(),g2=ctx2.createGain(),mg2=ctx2.createGain();
          mg2.gain.value=1.8; mg2.connect(ctx2.destination);
          const t2=ctx2.currentTime;
          o2.type='triangle'; o2.frequency.setValueAtTime(280,t2);
          o2.frequency.exponentialRampToValueAtTime(70,t2+0.07);
          g2.gain.setValueAtTime(0.8,t2); g2.gain.exponentialRampToValueAtTime(0.001,t2+0.1);
          o2.connect(g2); g2.connect(mg2); o2.start(t2); o2.stop(t2+0.12);
        }catch(e){}},200);
      }
    }
  }catch(e){}
}
function _toneBeep(ctx,dest,when,freq,dur,type='sine'){
  const osc=ctx.createOscillator();
  const g=ctx.createGain();
  osc.type=type; osc.frequency.value=freq;
  g.gain.setValueAtTime(0,when);
  g.gain.linearRampToValueAtTime(1,when+0.01);
  g.gain.setValueAtTime(1,when+dur-0.02);
  g.gain.linearRampToValueAtTime(0,when+dur);
  osc.connect(g); g.connect(dest);
  osc.start(when); osc.stop(when+dur+0.05);
}

/* ══ SES TERCİHİ SON ══ */


// Kullanici ilk etkilesiminde AudioContext unlock
function _unlockAudio(){ _audioUserGestured=true; try{ if(!_audioCtx) _audioCtx = new (window.AudioContext||window.webkitAudioContext)(); if(_audioCtx.state==='suspended') _audioCtx.resume(); }catch(e){} }
document.addEventListener('click', _unlockAudio, {once:true});
document.addEventListener('touchstart', _unlockAudio, {once:true});
document.addEventListener('keydown', _unlockAudio, {once:true});

// Bildirim sesi — localStorage'dan oku, _playSoundById ile çal
function playNotifSound(){
  const id = getSelectedNotif();
  _playSoundById('notif', id);
}

// Arama zil sesi — seçilen tona göre
let _ringOscNodes = [];
let _ringInterval = null;
function playRingSound(){
  stopRingSound();
  try{ const ctx=getAudioCtx(); if(ctx && ctx.state==='suspended') ctx.resume(); }catch(e){}
  const playOnce = ()=>{
    try {
      const ctx = getAudioCtx();
      if(ctx.state==='suspended'){ ctx.resume().then(playOnce); return; }
      // localStorage'dan güncel seçimi al
      const id = getSelectedRing();
      _playSoundById('ring', id);
    } catch(e){}
  };
  playOnce();
  _ringInterval = setInterval(playOnce, 1400);
}

function stopRingSound(){
  if(_ringInterval){ clearInterval(_ringInterval); _ringInterval=null; }
  _ringOscNodes.forEach(n=>{ try{n.stop();}catch(e){} });
  _ringOscNodes = [];
}

function checkAndNotify(roomId, msg){
  if(!msg||!msg.user||msg.user===_cu||msg.sys) return;
  const isActiveRoom = (_cRoom===roomId||_deskRoom===roomId) && document.visibilityState==='visible';
  // Duplicate önleme
  const key=roomId+'_'+msg.ts;
  if(_lastNotifTs[key]) return;
  _lastNotifTs[key]=true;
  if(Object.keys(_lastNotifTs).length>50) _lastNotifTs={};
  // Susturulmuş oda kontrolü
  const muted = JSON.parse(localStorage.getItem('sohbet_muted')||'{}');
  if(muted[roomId]) return;
  dbRef('rooms/'+roomId).once('value').then(snap=>{
    const room = snap.val();
    if(!room) return;
    if(room.type==='dm'||room.type==='group'){
      const members = room.members||[];
      if(!members.includes(_cu)) return;
    }
    // Ses her zaman çal (aktif odada da)
    playNotifSound();
    if(navigator.vibrate) navigator.vibrate([100,50,100]);
    // Push bildirimi sadece arka planda
    if(!isActiveRoom){
      const text = msg.file?'📎 Dosya gönderdi':(msg.text||'').slice(0,60);
      showPushNotification('💬 '+msg.user, text, '💬');
    }
  });
}

/* ══ ARAMA & BİLDİRİM SON ══ */



/* ── Init ── */

function waitForFirebase(cb,tries=0){
  if(typeof firebase!=='undefined'&&firebase.database){cb();}
  else if(tries<60){setTimeout(()=>waitForFirebase(cb,tries+1),200);}
  else{console.warn('Firebase SDK yüklenemedi, devam ediliyor.');if(typeof cb==='function')cb();}
}
function _runAutoLogin(){
  // _activeServer, FB_CONFIG, _FB_REST zaten config.js'te set edildi
  const srv = _activeServer;
  const savedUser = localStorage.getItem('sohbet_user_' + srv);
  const savedPass = localStorage.getItem('sohbet_pass_' + srv);

  if(savedUser && savedPass){
    // Loader göster
    const loader = document.createElement('div');
    loader.id = '_autoLoginLoader';
    loader.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
    const srv_info = (typeof FB_SERVERS !== 'undefined' && FB_SERVERS[srv]) || {};
    loader.innerHTML =
      '<div style="font-size:2.5rem;">'+(srv_info.icon||'💬')+'</div>'+
      '<div style="font-size:1rem;font-weight:700;color:var(--text-hi);">'+(srv_info.label||'')+'</div>'+
      '<div class="ld"><span></span><span></span><span></span></div>'+
      '<div style="font-size:.82rem;color:var(--muted);">Oturum yükleniyor...</div>';
    document.body.appendChild(loader);
    const removeLoader = ()=>{ const l=document.getElementById('_autoLoginLoader'); if(l)l.remove(); };

    // LOCAL_USERS'dan anında doğrula
    const _localUser = (typeof getLocalUser === 'function') ? getLocalUser(savedUser) : null;
    if(_localUser && !_localUser.banned && _localUser.passwordHash === savedPass){
      _passwordHash = savedPass;
      _cu           = savedUser;
      _isAdmin      = _localUser.isAdmin === true;
      removeLoader();
      waitForFirebase(()=>{ fbInit().catch(()=>{}); });
      onLoginSuccess();
      return;
    }

    // Firebase ile dene
    waitForFirebase(async ()=>{
      try{
        if(!await fbInit()) throw new Error('fbInit failed');
        _passwordHash = savedPass;
        _cu           = savedUser;
        _isAdmin      = _localUser ? (_localUser.isAdmin === true) : false;
        removeLoader();
        onLoginSuccess();
      }catch(e){
        console.warn('Otomatik giriş başarısız:', e);
        removeLoader();
        const ls = document.getElementById('loginScreen');
        const ss = document.getElementById('loginScreen');
        if(ss) ss.classList.remove('active');
        if(ls) ls.classList.add('active');
        if(typeof startTurkQuoteTimer === 'function') startTurkQuoteTimer();
      }
    });
    return;
  }

  // Kayıtlı kullanıcı yok — login ekranını göster
  waitForFirebase(async ()=>{
    try{ await fbInit(); }catch(e){ console.warn('fbInit:', e); }
    const ls = document.getElementById('loginScreen');
    const ss = document.getElementById('loginScreen');
    if(ss) ss.classList.remove('active');
    if(ls) ls.classList.add('active');
    if(typeof startTurkQuoteTimer === 'function') startTurkQuoteTimer();
  });
}

// Sayfa zaten yüklendiyse hemen çalıştır, değilse DOMContentLoaded bekle
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', _runAutoLogin);
} else {
  _runAutoLogin();
}



/* ══ GİRİŞ ALANLARI ══ */

document.addEventListener('DOMContentLoaded', function() {
  function onEnter(id, cb) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); cb(); } });
  }
  onEnter('loginUser', loginNext);
  onEnter('loginPass', submitLogin);
  onEnter('regUser', submitRegister);
  onEnter('regPass', submitRegister);
  onEnter('regPass2', submitRegister);
  if (!CSS.supports('-webkit-text-security', 'disc')) {
    ['loginPass','regPass','regPass2'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.setAttribute('type', 'password');
    });
  }
});

/* ══ GİRİŞ ALANLARI SON ══ */




/* ══ Drag & Drop Order ══ */

let _roomOrder = {};

function loadRoomOrder() {
  try { _roomOrder = JSON.parse(localStorage.getItem('sohbet_room_order') || '{}'); } catch(e) { _roomOrder = {}; }
}
function saveRoomOrder() {
  localStorage.setItem('sohbet_room_order', JSON.stringify(_roomOrder));
}
function getRoomSortKey(id) {
  return _roomOrder[id] !== undefined ? _roomOrder[id] : 999999;
}

function deskApplyOrder(list) {
  return [...list].sort((a, b) => {
    const ka = getRoomSortKey(a.id || a);
    const kb = getRoomSortKey(b.id || b);
    return ka - kb;
  });
}

function initDeskDnd() {
  // Called after rendering sidebar list
  const rows = document.querySelectorAll('#deskSideList .dsk-row[data-id]');
  rows.forEach(row => {
    row.setAttribute('draggable', 'true');
    row.addEventListener('dragstart', onDeskDragStart);
    row.addEventListener('dragover', onDeskDragOver);
    row.addEventListener('dragleave', onDeskDragLeave);
    row.addEventListener('drop', onDeskDrop);
    row.addEventListener('dragend', onDeskDragEnd);
  });
}

let _dragSrcId = null;
let _dragSrcSection = null;

function getDeskRowSection(row) {
  // Walk up to find the section header text
  let prev = row.previousElementSibling;
  while (prev) {
    if (prev.classList.contains('dsk-sec-hdr')) return prev.textContent.trim();
    prev = prev.previousElementSibling;
  }
  return '';
}

function onDeskDragStart(e) {
  _dragSrcId = this.dataset.id;
  _dragSrcSection = getDeskRowSection(this);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _dragSrcId);
}
function onDeskDragOver(e) {
  e.preventDefault();
  if (this.dataset.id === _dragSrcId) return;
  if (getDeskRowSection(this) !== _dragSrcSection) return; // only within same section
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}
function onDeskDragLeave() { this.classList.remove('drag-over'); }
function onDeskDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const targetId = this.dataset.id;
  if (!targetId || targetId === _dragSrcId) return;
  if (getDeskRowSection(this) !== _dragSrcSection) return;

  // Collect all rows in this section
  const allRows = [...document.querySelectorAll('#deskSideList .dsk-row[data-id]')].filter(r => getDeskRowSection(r) === _dragSrcSection);
  const ids = allRows.map(r => r.dataset.id);
  const srcIdx = ids.indexOf(_dragSrcId);
  const tgtIdx = ids.indexOf(targetId);
  if (srcIdx < 0 || tgtIdx < 0) return;

  // Reorder
  ids.splice(srcIdx, 1);
  ids.splice(tgtIdx, 0, _dragSrcId);

  // Save order
  ids.forEach((id, i) => { _roomOrder[id] = i * 10; });
  saveRoomOrder();

  // Re-render
  deskLoadRoomList();
}
function onDeskDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.dsk-row.drag-over').forEach(r => r.classList.remove('drag-over'));
}

// Also support touch-based drag (mobile fallback - long press to reorder)
// Load order on init
loadRoomOrder();



/* ══════════════════════════════════════════
   MİNİ OYUNLAR SİSTEMİ
══════════════════════════════════════════ */


let _currentGameCategory = 'all';


/* ── Oyun Kataloğu ── */

const GAME_CATALOG = [
  // .io Oyunlar
  { id:'agario',    cat:'io',      name:'Agar.io',        icon:'🟢', color:'#27ae60', desc:'Hücre yut, büyü!',        url:'https://agar.io',                                    age:'12+' },
  { id:'slither',   cat:'io',      name:'Slither.io',     icon:'🐍', color:'#8e44ad', desc:'Yılan ol, rakipleri sar!', url:'https://slither.io',                                 age:'6+'  },
  { id:'diep',      cat:'io',      name:'Diep.io',        icon:'🔫', color:'#2980b9', desc:'Tank savaşı!',             url:'https://diep.io',                                    age:'12+' },
  { id:'wormate',   cat:'io',      name:'Wormate.io',     icon:'🪱', color:'#e67e22', desc:'Şeker topla, büyü!',       url:'https://wormate.io',                                 age:'6+'  },
  { id:'paper',     cat:'io',      name:'Paper.io 2',     icon:'📄', color:'#16a085', desc:'Alan kazan!',              url:'https://paper-io.com',                               age:'6+'  },
  { id:'zombsroyale',cat:'io',     name:'ZombsRoyale',    icon:'🔥', color:'#c0392b', desc:'Battle royale!',           url:'https://zombsroyale.io',                             age:'12+' },
  { id:'moomoo',    cat:'io',      name:'MooMoo.io',      icon:'🐄', color:'#27ae60', desc:'Köy kur, savaş!',          url:'https://moomoo.io',                                  age:'6+'  },
  { id:'lordz',     cat:'io',      name:'Lordz.io',       icon:'⚔️', color:'#8e44ad', desc:'Ordu topla, kaleleri al!', url:'https://www.lordz.io',                               age:'6+'  },
  { id:'wings',     cat:'io',      name:'Wings.io',       icon:'✈️', color:'#3498db', desc:'Uçak savaşı!',             url:'https://wings.io',                                   age:'6+'  },
  // Aksiyon
  { id:'surviv',    cat:'action',  name:'Surviv.io',      icon:'🎯', color:'#e74c3c', desc:'2D battle royale!',        url:'https://surviv.io',                                  age:'12+' },
  { id:'krunker',   cat:'action',  name:'Krunker.io',     icon:'🎮', color:'#e67e22', desc:'FPS aksiyon!',             url:'https://krunker.io',                                 age:'12+' },
  { id:'shellshock',cat:'action',  name:'Shell Shockers', icon:'🥚', color:'#f1c40f', desc:'Yumurta savaşı!',          url:'https://shellshock.io',                              age:'12+' },
  { id:'venge',     cat:'action',  name:'Venge.io',       icon:'🔱', color:'#c0392b', desc:'3D FPS savaş!',            url:'https://venge.io',                                   age:'12+' },
  { id:'stickman',  cat:'action',  name:'Stickman Archer',icon:'🏹', color:'#7f8c8d', desc:'Okçu dövüşü!',             url:'https://www.crazygames.com/game/stickman-archer',    age:'6+'  },
  { id:'bowmasters',cat:'action',  name:'Bowmasters',     icon:'🎯', color:'#e74c3c', desc:'Yay ile düello!',          url:'https://www.crazygames.com/game/bowmasters',         age:'12+' },
  // Yarış
  { id:'moto',      cat:'racing',  name:'Moto X3M',       icon:'🏍️', color:'#e74c3c', desc:'Motosiklet parkuru!',      url:'https://www.crazygames.com/game/moto-x3m',          age:'6+'  },
  { id:'smashkarts',cat:'racing',  name:'Smash Karts',    icon:'🏎️', color:'#8e44ad', desc:'Kart yarışı savaşı!',      url:'https://smashkarts.io',                              age:'6+'  },
  { id:'driftboss', cat:'racing',  name:'Drift Boss',     icon:'🌀', color:'#16a085', desc:'Drift yap, puan kazan!',   url:'https://www.crazygames.com/game/drift-boss',        age:'0+'  },
  { id:'roadfury',  cat:'racing',  name:'Road Fury',      icon:'💨', color:'#2980b9', desc:'Yol savaşı!',              url:'https://www.crazygames.com/game/road-fury',         age:'6+'  },
  { id:'racinggo',  cat:'racing',  name:'Racing Go',      icon:'🚗', color:'#c0392b', desc:'Araba yarışı!',            url:'https://www.crazygames.com/game/racing-go',         age:'12+' },
  // Strateji
  { id:'chess',     cat:'strategy',name:'Satranç',        icon:'♟️', color:'#2c3e50', desc:'Klasik satranç!',          url:'https://www.chess.com/play/online',                 age:'0+'  },
  { id:'ludo',      cat:'strategy',name:'Ludo',           icon:'🎲', color:'#e74c3c', desc:'Parcheesi!',               url:'https://www.crazygames.com/game/ludo-online',       age:'0+'  },
  { id:'checkers',  cat:'strategy',name:'Dama',           icon:'⚫', color:'#8e44ad', desc:'Klasik dama oyunu!',        url:'https://www.crazygames.com/game/checkers',          age:'0+'  },
  { id:'bloons',    cat:'strategy',name:'Bloons TD 5',    icon:'🎈', color:'#e74c3c', desc:'Balonları patlat!',         url:'https://www.crazygames.com/game/bloons-tower-defense-5', age:'6+' },
  { id:'warzone',   cat:'strategy',name:'Warzone',        icon:'🗺️', color:'#27ae60', desc:'Dünya hakimiyeti!',         url:'https://www.warzone.com',                           age:'0+'  },
];

const GAME_CATEGORIES = [
  { id:'all',      label:'🎮 Tümü' },
  { id:'io',       label:'🌐 .io Oyunlar' },
  { id:'action',   label:'⚔️ Aksiyon' },
  { id:'racing',   label:'🏎️ Yarış' },
  { id:'strategy', label:'♟️ Strateji' },
];





/* ── Panel Yükleme ── */

function loadGamesPanel() {
  const isDesk = IS_DESKTOP();
  const container = isDesk ? document.getElementById('deskPanelContent') : document.getElementById('gamesScreenBody');
  if (!container || !_cu) return;
  container.innerHTML = '';
  container.style.padding = '0';
  container.style.overflow = 'hidden';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  renderFullGamesPanel(container);
}
function deskLoadGames() { loadGamesPanel(); }


/* ══════════════════════════════════════════════
   📺 TV CANLI İZLE PANELİ
══════════════════════════════════════════════ */

const TV_CHANNELS = [
  // Haber
  { id:'trt_haber',  name:'TRT Haber',   cat:'Haber',  emoji:'📡', m3u8:'https://tv-trthaber.medya.trt.com.tr/master_720.m3u8' },
  { id:'ntv',        name:'NTV',          cat:'Haber',  emoji:'📡', m3u8:'https://dogus-live.daioncdn.net/ntv/ntv.m3u8' },
  { id:'haberturk',  name:'Habertürk',    cat:'Haber',  emoji:'📡', m3u8:'https://ciner-live.daioncdn.net/haberturktv/haberturktv.m3u8' },
  { id:'halktv',     name:'Halk TV',      cat:'Haber',  emoji:'📡', m3u8:'https://halktv-live.daioncdn.net/halktv/halktv.m3u8' },
  { id:'tele1',      name:'Tele1',        cat:'Haber',  emoji:'📡', m3u8:'https://tele1.blutv.com/blutv_tele1_live/live.m3u8' },
  { id:'sozcu',      name:'Sözcü TV',     cat:'Haber',  emoji:'📡', m3u8:'https://szctvdvr.blutv.com/blutv_szctv_dvr/live.m3u8' },
  { id:'tv100',      name:'TV100',        cat:'Haber',  emoji:'📡', m3u8:'https://tv100dvr.blutv.com/blutv_tv100dvr/live.m3u8' },
  // Genel
  { id:'tv8',        name:'TV8',          cat:'Genel',  emoji:'📺', m3u8:'https://mn-nl.mncdn.com/tv8/smil:tv8.smil/playlist.m3u8' },
  { id:'dream',      name:'Dream Türk',   cat:'Genel',  emoji:'📺', m3u8:'https://mn-nl.mncdn.com/blutv_dreamturk/smil:dreamturk_sd.smil/playlist.m3u8' },
  { id:'trt_world',  name:'TRT World',    cat:'Genel',  emoji:'📺', m3u8:'https://tv-trtworld.medya.trt.com.tr/master_720.m3u8' },
  // Spor
  { id:'trt_spor',   name:'TRT Spor',     cat:'Spor',   emoji:'⚽', m3u8:'https://tv-trtspor1.medya.trt.com.tr/master.m3u8' },
  { id:'trt_spor2',  name:'TRT Spor 2',   cat:'Spor',   emoji:'⚽', m3u8:'https://tv-trtspor2.medya.trt.com.tr/master.m3u8' },
  // Müzik
  { id:'kralpop',    name:'Kral Pop',     cat:'Müzik',  emoji:'🎵', m3u8:'https://dogus-live.daioncdn.net/kralpoptv/kralpoptv.m3u8' },
  { id:'powertv',    name:'Power Türk',   cat:'Müzik',  emoji:'🎵', m3u8:'https://livetv.powerapp.com.tr/powerturktv/powerturkhd.smil/playlist.m3u8' },
  // Çocuk
  { id:'trt_cocuk',  name:'TRT Çocuk',    cat:'Çocuk',  emoji:'🎈', m3u8:'https://tv-trtcocuk.medya.trt.com.tr/master_720.m3u8' },
  { id:'trt_muzik',  name:'TRT Müzik',    cat:'Müzik',  emoji:'🎵', m3u8:'https://mn-nl.mncdn.com/blutv_trtmuzik/smil:trtmuzik_hd.smil/playlist.m3u8' },
];

let _currentTvCh = null;
let _hlsInstance = null;

function _destroyHls() {
  if (_hlsInstance) { try { _hlsInstance.destroy(); } catch(e){} _hlsInstance = null; }
}

function _playHlsStream(videoEl, url) {
  _destroyHls();
  if (!videoEl) return;
  // Try native HLS (Safari/iOS)
  if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url;
    videoEl.play().catch(()=>{});
    return;
  }
  // Use hls.js
  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
    _hlsInstance = hls;
    hls.loadSource(url);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(()=>{}));
    hls.on(Hls.Events.ERROR, (e, data) => {
      if (data.fatal) {
        const errEl = videoEl.parentElement?.querySelector('.watch-stream-err');
        if (errEl) errEl.style.display = 'flex';
      }
    });
  } else {
    videoEl.src = url;
    videoEl.play().catch(()=>{});
  }
}

function loadWatchPanel() {
  const body = document.getElementById('watchScreenBody');
  if (!body) return;
  // natureBotHomeZone'u kaldır (varsa) — aksi hâlde grid'in üstünde kalır
  const homeZone = document.getElementById('natureBotHomeZone');
  if (homeZone) homeZone.style.display = 'none';

  let h = '<div class="watch-mob-grid">';
  TV_CHANNELS.forEach(ch => {
    // data-ch-id ile onclick yerine event delegation kullan (Android uyumu)
    h += `<div class="watch-mob-card" data-ch-id="${ch.id}" role="button" tabindex="0" aria-label="${ch.name}">
      <div class="wmc-logo">${ch.emoji}</div>
      <div class="wmc-name">${ch.name}</div>
      <div class="wmc-cat">${ch.cat}</div>
    </div>`;
  });
  h += '</div>';
  body.innerHTML = h;

  // Event delegation: hem click hem touchend (Android güvencesi)
  body.addEventListener('click', _watchGridDelegate, { passive: true });
  body.addEventListener('touchend', _watchGridDelegate, { passive: true });

  // hls.js'i önceden yükle (kanal açılışını hızlandır)
  _ensureHlsJs();
}

function _watchGridDelegate(e) {
  // Closest ile kart bul (alt elemanlara tıklamayı da yakala)
  const card = e.target.closest ? e.target.closest('.watch-mob-card') : null;
  if (!card) return;
  const id = card.getAttribute('data-ch-id');
  if (id) {
    // touchend'de çift tetiklenmeyi önle
    if (e.type === 'touchend') { e._watchHandled = true; }
    if (e.type === 'click' && e._watchHandled) return;
    openMobTv(id);
  }
}

function _ensureHlsJs(cb) {
  if (typeof Hls !== 'undefined') { cb && cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js';
  s.onload = () => { cb && cb(); };
  document.head.appendChild(s);
}

function openMobTv(id) {
  const ch = TV_CHANNELS.find(c => c.id === id);
  if (!ch) return;
  _destroyHls();
  let p = document.getElementById('watchMobPlayer');
  if (!p) {
    p = document.createElement('div');
    p.id = 'watchMobPlayer';
    p.className = 'watch-mob-player';
    document.body.appendChild(p);
  }
  p.innerHTML = `
    <div class="watch-mob-player-header">
      <div class="watch-mob-close" id="watchMobCloseBtn" style="touch-action:manipulation;cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
      <div style="flex:1">
        <div style="font-size:.95rem;font-weight:900;color:#fff;">${ch.name}</div>
        <div style="font-size:.7rem;color:rgba(255,255,255,.5);">${ch.cat} · Canlı Yayın</div>
      </div>
      <span class="watch-live-badge">CANLI</span>
    </div>
    <video id="watchMobVideo" style="width:100%;height:100%;object-fit:contain;background:#000;" controls playsinline webkit-playsinline x5-playsinline x5-video-player-type="h5" x5-video-player-fullscreen="false"></video>
    <div class="watch-stream-err" id="watchStreamErr" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.8);align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#fff;text-align:center;padding:20px;">
      <div style="font-size:2.5rem;">📡</div>
      <div style="font-size:.95rem;font-weight:700;">Yayın yüklenemedi</div>
      <div style="font-size:.78rem;opacity:.6;">Kanal geçici olarak erişilemez olabilir</div>
      <button onclick="closeMobTv()" style="margin-top:12px;padding:8px 20px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:#fff;font-size:.85rem;cursor:pointer;">Kapat</button>
    </div>`;
  p.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;';

  // Kapatma butonuna her iki event'i de bağla (Android güvencesi)
  const closeBtn = document.getElementById('watchMobCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobTv);
    closeBtn.addEventListener('touchend', function(e){ e.preventDefault(); closeMobTv(); });
  }

  _ensureHlsJs(() => {
    const v = document.getElementById('watchMobVideo');
    if (v) _playHlsStream(v, ch.m3u8);
  });
  // hls.js zaten yüklüyse doğrudan çal
  if (typeof Hls !== 'undefined') {
    const v = document.getElementById('watchMobVideo');
    if (v) _playHlsStream(v, ch.m3u8);
  }
}

function closeMobTv() {
  _destroyHls();
  const p = document.getElementById('watchMobPlayer');
  if (p) { p.style.display = 'none'; p.innerHTML = ''; }
}

function deskLoadWatch() {
  const panel = document.getElementById('deskPanelContent');
  if (!panel) return;
  panel.style.overflowY = 'hidden';
  panel.style.padding = '0';

  const cats = [...new Set(TV_CHANNELS.map(c => c.cat))];
  let sidebarH = '';
  cats.forEach(cat => {
    sidebarH += `<div class="watch-cat-header">${cat}</div>`;
    TV_CHANNELS.filter(c => c.cat === cat).forEach(ch => {
      sidebarH += `<div class="watch-ch-item${_currentTvCh===ch.id?' act':''}" id="wch-${ch.id}" onclick="deskPlayTv('${ch.id}')">
        <div class="watch-ch-logo">${ch.emoji}</div>
        <div class="watch-ch-info">
          <div class="watch-ch-name">${ch.name}</div>
          <div class="watch-ch-cat">${ch.cat}</div>
        </div>
      </div>`;
    });
  });

  panel.innerHTML = `
    <div class="watch-wrap">
      <div class="watch-header">
        <div>
          <div class="watch-header-title">📺 Canlı Televizyon</div>
          <div class="watch-header-sub">Türk televizyon kanallarını canlı izle</div>
        </div>
        <span class="watch-live-badge" style="margin-left:auto">CANLI</span>
      </div>
      <div class="watch-content">
        <div class="watch-sidebar">${sidebarH}</div>
        <div class="watch-player-area">
          <div class="watch-player-box" id="watchPlayerBox">
            <div class="watch-player-placeholder">
              <div class="pp-icon">📺</div>
              <div class="pp-text">Kanal seçin</div>
              <div class="pp-sub">Sol taraftan bir kanal seçerek izlemeye başlayın</div>
            </div>
          </div>
          <div class="watch-now-info" id="watchNowInfo" style="display:none">
            <div class="watch-live-badge">CANLI</div>
            <div>
              <div class="watch-now-ch" id="watchNowCh">—</div>
              <div class="watch-now-sub" id="watchNowSub">Canlı Yayın</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  _ensureHlsJs();
  if (_currentTvCh) deskPlayTv(_currentTvCh);
}

function deskPlayTv(id) {
  const ch = TV_CHANNELS.find(c => c.id === id);
  if (!ch) return;
  _currentTvCh = id;
  document.querySelectorAll('.watch-ch-item').forEach(el => el.classList.remove('act'));
  const item = document.getElementById('wch-' + id);
  if (item) item.classList.add('act');
  const box = document.getElementById('watchPlayerBox');
  if (!box) return;
  box.innerHTML = `
    <video id="watchDeskVideo" style="width:100%;height:100%;object-fit:contain;background:#000;" controls autoplay playsinline></video>
    <div class="watch-stream-err" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.8);align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#fff;text-align:center;padding:20px;">
      <div style="font-size:2.5rem;">📡</div>
      <div style="font-size:.95rem;font-weight:700;">Yayın yüklenemedi</div>
      <div style="font-size:.78rem;opacity:.6;">Kanal geçici olarak erişilemez olabilir</div>
    </div>`;
  _ensureHlsJs(() => {
    const v = document.getElementById('watchDeskVideo');
    if (v) _playHlsStream(v, ch.m3u8);
  });
  const info = document.getElementById('watchNowInfo');
  if (info) info.style.display = 'flex';
  const ch_el = document.getElementById('watchNowCh');
  if (ch_el) ch_el.textContent = ch.name;
  const sub_el = document.getElementById('watchNowSub');
  if (sub_el) sub_el.textContent = ch.cat + ' · Canlı Yayın';
}

function renderFullGamesPanel(container) {
  // Fetch invites & active games

  // Category bar
  let catHtml = '<div class="games-cat-bar">';
  GAME_CATEGORIES.forEach(c => {
    catHtml += `<div class="games-cat-btn${_currentGameCategory===c.id?' act':''}" onclick="switchGameCat('${c.id}')">${c.label}</div>`;
  });
  catHtml += '</div>';

  // Scroll area
  let scrollHtml = '<div class="games-scroll" id="gamesScrollArea">';

  // Browser games grid
  const _allG = allGames();
  const filtered = _currentGameCategory === 'all' ? _allG : _allG.filter(g=>g.cat===_currentGameCategory);

  if (filtered.length) {
    const catMap = {};
    filtered.forEach(g => {
      if (!catMap[g.cat]) catMap[g.cat] = [];
      catMap[g.cat].push(g);
    });

    if (_currentGameCategory === 'all') {
      scrollHtml += '<div class="games-section-title">🌐 Tarayıcı Oyunları</div>';
      scrollHtml += '<div class="games-grid">';
      filtered.forEach(g => {
        scrollHtml += buildGameThumb(g);
      });
      scrollHtml += '</div>';
    } else {
      const catLabel = GAME_CATEGORIES.find(c=>c.id===_currentGameCategory)?.label || '';
      scrollHtml += `<div class="games-section-title">${catLabel}</div>`;
      scrollHtml += '<div class="games-grid">';
      filtered.forEach(g => {
        scrollHtml += buildGameThumb(g);
      });
      scrollHtml += '</div>';
    }
  }

  scrollHtml += '</div>';

  container.innerHTML = `<div class="games-container">${catHtml}${scrollHtml}</div>`;
}

function buildGameThumb(g) {
  const grad = `linear-gradient(135deg, ${g.color}ee, ${g.color}99)`;
  return `<div class="game-item" onclick="openBrowserGame('${g.id}')">
    <div class="game-thumb" style="background:${grad};">
      <div class="game-thumb-bg" style="display:flex;">${g.icon}</div>
      <div class="game-thumb-age">${g.age}</div>
    </div>
    <div class="game-thumb-name">${g.name}</div>
  </div>`;
}

function switchGameCat(cat) {
  _currentGameCategory = cat;
  const isDesk = IS_DESKTOP();
  const container = isDesk ? document.getElementById('deskPanelContent') : document.getElementById('gamesScreenBody');
  if (container) renderFullGamesPanel(container);
}


/* ══ DM GÜNLÜK OTOMATİK TEMİZLİK — DEVRE DIŞI (mesajlar kalıcı olsun) ══ */

function clearDMsForToday(){ /* devre dışı — mesajlar artık kalıcı */ }
function scheduleDMClear(){ /* devre dışı — mesajlar artık kalıcı */ }



/* ─────────────────────────────── */



/* ══ UI KIT MODAL ══ */


document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    renderUiStyleGrid && renderUiStyleGrid();
    applyTabIcons(true);
    // Toggle görünümünü her zaman açık göster
    const knob = document.getElementById('svgIconKnob');
    const toggle = document.getElementById('svgIconToggle');
    if (toggle && knob) {
      toggle.style.background = 'var(--accent)';
      knob.style.transform = 'translateX(20px)';
    }
  }, 100);
});


/* ─────────────────────────────── */


function showTosTab(tab){
  const tos = document.getElementById('tosTabContent');
  const kvkk = document.getElementById('kvkkTabContent');
  const btnTos = document.getElementById('tabTos');
  const btnKvkk = document.getElementById('tabKvkk');
  if(!tos || !kvkk) return;
  if(tab === 'tos'){
    tos.style.display = 'block';
    kvkk.style.display = 'none';
    if(btnTos){ btnTos.style.background='#5b9bd5'; btnTos.style.color='#fff'; }
    if(btnKvkk){ btnKvkk.style.background='#2a2a2a'; btnKvkk.style.color='#aaa'; }
  } else {
    tos.style.display = 'none';
    kvkk.style.display = 'block';
    if(btnTos){ btnTos.style.background='#2a2a2a'; btnTos.style.color='#aaa'; }
    if(btnKvkk){ btnKvkk.style.background='#5b9bd5'; btnKvkk.style.color='#fff'; }
  }
}


/* ─────────────────────────────── */



/* ─────────────────────────────── */


/* orientation lock disabled — landscape allowed */
// (function lockOrientation(){ ... })(); — devre dışı bırakıldı



/* ── Emoji/GIF picker: boş alana tıklayınca kapat ── */

document.addEventListener('click', function(e){
  const picker = document.getElementById('emojiPicker');
  if(!picker || !picker.classList.contains('open')) return;
  // Picker içine, emoji butonuna veya input alanına tıklanmadıysa kapat
  const emojiBtn = e.target.closest('[onclick*="toggleEmoji"], .inp-btm button:first-child, button[onclick*="toggleEmoji"]');
  if(!emojiBtn && !picker.contains(e.target)){
    closeEmoji();
  }
}, true);


/* ─────────────────────────────── */



/* ══════════════════════════════════════════════
   👑 GENİŞLETİLMİŞ ADMIN PANELİ
══════════════════════════════════════════════ */

if (typeof _origDeskLoadAdmin === 'undefined') var _origDeskLoadAdmin = typeof deskLoadAdmin === 'function' ? deskLoadAdmin : null;
deskLoadAdmin = function(){
  const panel = document.getElementById('deskPanelContent');
  const tabs = [
    { key:'users',     label:'👥 Kullanıcılar' },
    { key:'rooms',     label:'📢 Odalar' },
    { key:'msgs',      label:'💬 Mesajlar' },
    { key:'forum',     label:'📋 Forum' },
    { key:'announce',  label:'📣 Duyuru' },
    { key:'broadcast', label:'📡 Yayım' },
    { key:'games',     label:'🎮 Oyunlar' },
    { key:'health',    label:'📊 Sistem' },
    { key:'security',  label:'🛡️ Güvenlik' },
    { key:'ipban',     label:'🔒 IP Ban' },
    { key:'reports',   label:'🚩 Raporlar' },
    { key:'growth',    label:'📈 Büyüme' },
    { key:'activity',  label:'🕐 Aktivite' },
    { key:'naturebot', label:'🤖 NatureBot' },
    { key:'settings',    label:'⚙️ Ayarlar' },
    { key:'design',      label:'🎨 Tasarım' },
    { key:'create_user', label:'➕ Üye Oluştur' },
    { key:'invite',      label:'🔗 Davet Link' },
  ];
  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;padding:16px 20px 0;flex-shrink:0;">
        <div style="font-size:1.3rem;">👑</div>
        <div style="font-size:1.05rem;font-weight:900;color:var(--text-hi);">Admin Paneli</div>
        <div style="margin-left:auto;font-size:.72rem;color:var(--muted);">Sunucu: <b style="color:var(--accent)">${FB_SERVERS[_activeServer]?.label||_activeServer}</b></div>
      </div>
      <div id="deskAdminTabs" style="display:flex;gap:2px;padding:10px 12px 0;flex-shrink:0;overflow-x:auto;border-bottom:1px solid var(--border);scrollbar-width:none;"></div>
      <div id="adminBody" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
    </div>`;
  const tabBar = document.getElementById('deskAdminTabs');
  tabs.forEach(t=>{
    const el = document.createElement('div');
    el.textContent = t.label;
    el.dataset.key = t.key;
    el.style.cssText = 'padding:7px 12px;border-radius:8px 8px 0 0;cursor:pointer;font-size:.78rem;font-weight:700;color:var(--muted);white-space:nowrap;transition:background .1s,color .1s;flex-shrink:0;';
    el.onclick = ()=>deskAdminTab(t.key);
    tabBar.appendChild(el);
  });
  deskAdminTab('users');
};

const _origDeskAdminTab = typeof deskAdminTab === 'function' ? deskAdminTab : null;
deskAdminTab = function(tab){
  if(tab==='create_user'){
    const b=document.getElementById('adminBody');
    if(b && typeof window._renderCreateUser==='function') window._renderCreateUser(b);
    const tabBar=document.getElementById('deskAdminTabs');
    if(tabBar) tabBar.querySelectorAll('div').forEach(el=>{
      const act=el.dataset.key===tab;
      el.style.color=act?'var(--text-hi)':'var(--muted)';
      el.style.background=act?'var(--surface)':'transparent';
      el.style.borderBottom=act?'2px solid var(--accent)':'2px solid transparent';
    });
    return;
  }
  if(tab==='invite'){
    const b=document.getElementById('adminBody');
    if(b && typeof window._renderInviteLinks==='function') window._renderInviteLinks(b);
    const tabBar=document.getElementById('deskAdminTabs');
    if(tabBar) tabBar.querySelectorAll('div').forEach(el=>{
      const act=el.dataset.key===tab;
      el.style.color=act?'var(--text-hi)':'var(--muted)';
      el.style.background=act?'var(--surface)':'transparent';
      el.style.borderBottom=act?'2px solid var(--accent)':'2px solid transparent';
    });
    return;
  }
  _adminTab = tab;
  const tabBar = document.getElementById('deskAdminTabs');
  if(tabBar) tabBar.querySelectorAll('div').forEach(el=>{
    const act = el.dataset.key===tab;
    el.style.color = act?'var(--text-hi)':'var(--muted)';
    el.style.background = act?'var(--surface)':'transparent';
    el.style.borderBottom = act?'2px solid var(--accent)':'2px solid transparent';
  });
  const body = document.getElementById('adminBody');
  if(!body) return;
  body.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center;">Yükleniyor...</div>';
  if(tab==='users') loadAdminUsers();
  else if(tab==='rooms') loadAdminRooms();
  else if(tab==='msgs') loadAdminMsgs();
  else if(tab==='forum') loadAdminForum();
  else if(tab==='announce') loadAdminAnnounce();
  else if(tab==='broadcast') { if(typeof loadAdminAnnounce==='function') loadAdminAnnounce(); }
  else if(tab==='games') loadAdminGames();
  else if(tab==='health') loadAdminSystemHealth();
  else if(tab==='stats') { if(typeof loadAdminStats==='function') loadAdminStats(); }
  else if(tab==='security') loadAdminSecurity();
  else if(tab==='ipban' || tab==='ipbans') loadAdminIPBans();
  else if(tab==='reports') { if(typeof loadAdminReports==='function') loadAdminReports(); }
  else if(tab==='growth') { if(typeof loadAdminGrowthChart==='function') loadAdminGrowthChart(); }
  else if(tab==='activity') loadAdminActivityFull();
  else if(tab==='settings') loadAdminSettings();
  else if(tab==='design') loadAdminDesign();
  else if(tab==='naturebot') loadAdminNatureBot();
};


/* ─────────────────────────────── */



/* ── 1. TEMA SMOOTH TRANSİTİON ── */


/* ── 9. SİLME SESİ ── */

function playDeleteSound(){
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.3);
    g.connect(ctx.destination);
    // Hafif inen ton
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t+0.25);
    osc.connect(g);
    osc.start(t); osc.stop(t+0.3);
    // Kısa tık
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = 800;
    g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.001, t+0.06);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(t); osc2.stop(t+0.07);
  }catch(e){}
}


/* ── 10. BİLDİRİM SESİ İYİLEŞTİRME — artık ana NOTIF_TONES içinde ── */



/* ── 11. SİLME - Flash Animasyonu ── */

(function(){
  const orig = window.deleteMsg;
  if(orig){
    window.deleteMsg = function(roomId, key){
      // Flash animasyonu
      const el = document.querySelector(`.mb[data-key="${key}"]`);
      if(el){ el.classList.add('deleting'); setTimeout(()=>el.classList.remove('deleting'),450); }
      // Ses çal
      playDeleteSound();
      orig(roomId, key);
    };
  }
})();


/* ─────────────────────────────── */


(function() {
'use strict';

// IS_MOBILE moved to config.js


/* ══ CSS ══ */

window.BOT_CSS = `
#natureBotPet {
  position: fixed;
  z-index: 9997;
  width: 60px;
  height: 96px;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  filter: drop-shadow(0 4px 16px rgba(74,143,64,.4));
  transition: filter .3s;
  will-change: transform;
}
#natureBotPet:hover { filter: drop-shadow(0 6px 24px rgba(74,143,64,.7)); }
#natureBotPet.calling { filter: drop-shadow(0 0 30px rgba(91,155,213,.9)); }

/* Mobil: robot header slotunda */
@media (max-width: 767px) {
  #natureBotPet {
    position: relative !important;
    right: auto !important;
    top: auto !important;
    left: auto !important;
    width: 40px !important;
    height: 44px !important;
    overflow: hidden !important;
  }
}


/* ── UYKU animasyonları ── */

#natureBotPet.sleeping {
  filter: drop-shadow(0 2px 8px rgba(74,143,64,.2));
}
#natureBotPet.sleeping .bot-body-group {
  animation: botSleep 3s ease-in-out infinite;
  transform-origin: center bottom;
}
@keyframes botSleep {
  0%,100% { transform: translateY(0) rotate(-8deg) scale(0.9); }
  50%      { transform: translateY(3px) rotate(-8deg) scale(0.88); }
}
#natureBotPet.sleeping .bot-arm-left  { animation: armSleepL 3s ease-in-out infinite; }
#natureBotPet.sleeping .bot-arm-right { animation: armSleepR 3s ease-in-out infinite; }
@keyframes armSleepL { 0%,100%{transform:rotate(40deg)} 50%{transform:rotate(35deg)} }
@keyframes armSleepR { 0%,100%{transform:rotate(-40deg)} 50%{transform:rotate(-35deg)} }
#natureBotPet.sleeping .bot-leg-left,
#natureBotPet.sleeping .bot-leg-right { animation: none; transform: rotate(0deg); }
#natureBotPet.sleeping .bot-eye-glow  { animation: none; opacity: 0.05; }
#natureBotPet.sleeping .bot-antenna-light { animation: sleepAntenna 3s ease-in-out infinite; }
@keyframes sleepAntenna { 0%,100%{opacity:.15} 50%{opacity:.4} }
#natureBotPet.sleeping .bot-mouth-grid { opacity: 0.3; }


/* ── Kulübe ── */

#botKennel {
  position: fixed;
  z-index: 9995;
  pointer-events: none;
  transition: opacity .5s, transform .5s;
}
#botKennel.visible { opacity: 1; }
#botKennel.hidden  { opacity: 0; }

/* Kulübe kapı parlaması — bot içerideyken */
#botKennel .kennel-door-glow {
  transition: opacity .8s;
  opacity: 0;
}
#botKennel.occupied .kennel-door-glow { opacity: 1; }

/* Kulübe giriş animasyonu — bot küçülerek içeri girer */
#natureBotPet.entering-kennel {
  animation: botEnterKennel 0.9s ease-in forwards;
  pointer-events: none;
}
@keyframes botEnterKennel {
  0%   { transform: scale(1) translateY(0);   opacity: 1; }
  40%  { transform: scale(0.75) translateY(8px); opacity: 1; }
  80%  { transform: scale(0.35) translateY(18px); opacity: 0.6; }
  100% { transform: scale(0.1) translateY(24px);  opacity: 0; }
}

/* Kulübeden çıkış animasyonu — bot büyüyerek çıkar */
#natureBotPet.exiting-kennel {
  animation: botExitKennel 0.85s ease-out forwards;
}
@keyframes botExitKennel {
  0%   { transform: scale(0.1) translateY(24px); opacity: 0; }
  30%  { transform: scale(0.4) translateY(16px);  opacity: 0.7; }
  70%  { transform: scale(1.12) translateY(-6px); opacity: 1; }
  100% { transform: scale(1) translateY(0);       opacity: 1; }
}

/* Kulübe hafif titreme — uyanınca */
#botKennel.waking-up {
  animation: kennelShake .5s ease-in-out;
}
@keyframes kennelShake {
  0%,100% { transform: translateX(0); }
  20%  { transform: translateX(-3px) rotate(-.5deg); }
  40%  { transform: translateX(3px)  rotate(.5deg); }
  60%  { transform: translateX(-2px); }
  80%  { transform: translateX(2px); }
}

/* Kulübe kapı - parlayan kenar */
#botKennel .kennel-door-frame {
  filter: drop-shadow(0 0 4px rgba(74,143,64,.0));
  transition: filter 1s;
}
#botKennel.occupied .kennel-door-frame {
  filter: drop-shadow(0 0 6px rgba(74,143,64,.7));
}

#natureBotPet.at-home .bot-arm-left,
#natureBotPet.at-home .bot-arm-right {
  animation-duration: 4s;
  animation-name: armIdle;
}
@keyframes armIdle {
  0%,100% { transform: rotate(0deg); }
  50% { transform: rotate(-6deg); }
}
#natureBotPet.at-home .bot-leg-left,
#natureBotPet.at-home .bot-leg-right {
  animation-duration: 4s;
  animation-name: legIdle;
}
@keyframes legIdle {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-1px); }
}

/* Konuşurken kollar hızlı */
#natureBotPet.talking .bot-arm-left,
#natureBotPet.talking .bot-arm-right {
  animation-duration: 0.5s;
}
#natureBotPet.talking .bot-leg-left,
#natureBotPet.talking .bot-leg-right {
  animation-duration: 0.5s;
}


/* ── Ağız konuşma ── */

#natureBotPet .bot-mouth-grid { transition: all .15s; }
#natureBotPet.talking .bot-mouth-open { display: block !important; }
#natureBotPet.talking .bot-mouth-grid { display: none !important; }


/* ── Anten ── */

#natureBotPet .bot-antenna-light {
  animation: antennaGlow 2s ease-in-out infinite alternate;
}
@keyframes antennaGlow {
  from { opacity:.6; filter:brightness(1); }
  to   { opacity:1; filter:brightness(1.5) drop-shadow(0 0 4px #6dbf67); }
}
#natureBotPet.talking .bot-antenna-light {
  animation: antennaTalk .3s ease-in-out infinite alternate;
}
@keyframes antennaTalk {
  from { opacity:.8; r:3; }
  to   { opacity:1; r:5; fill:#a5f3a7; }
}


/* ── Arama halkaları ── */

#natureBotPet .call-ring { fill:none; stroke:rgba(91,155,213,.4); stroke-width:2; opacity:0; }
#natureBotPet.calling .call-ring { animation: callRing 1.5s ease-out infinite; }
#natureBotPet.calling .call-ring:nth-child(2) { animation-delay:.5s; }
#natureBotPet.calling .call-ring:nth-child(3) { animation-delay:1s; }
@keyframes callRing { from{r:20;opacity:.8;} to{r:50;opacity:0;} }


/* ── Damar nabız ── */

#natureBotPet .bot-vein { animation: veinPulse 3s ease-in-out infinite; }
#natureBotPet .bot-vein:nth-child(2){animation-delay:.5s}
#natureBotPet .bot-vein:nth-child(3){animation-delay:1s}
#natureBotPet .bot-vein:nth-child(4){animation-delay:1.5s}
@keyframes veinPulse { 0%,100%{stroke-opacity:.3} 50%{stroke-opacity:.9} }


/* ── Ses dalga göstergesi ── */

#botVoiceWave {
  position:fixed; z-index:9998;
  display:none; align-items:center; justify-content:center; gap:3px;
  background:rgba(14,43,12,.9); border:1px solid rgba(74,143,64,.4);
  border-radius:20px; padding:4px 10px;
  pointer-events:none;
}
#botVoiceWave.visible { display:flex; }
.bvw-bar {
  width:3px; border-radius:2px;
  background: linear-gradient(to top, #4a8f40, #6dbf67);
  animation: bvwAnim 0.6s ease-in-out infinite alternate;
}
.bvw-bar:nth-child(1){height:8px;animation-delay:0s}
.bvw-bar:nth-child(2){height:14px;animation-delay:.1s}
.bvw-bar:nth-child(3){height:20px;animation-delay:.2s}
.bvw-bar:nth-child(4){height:14px;animation-delay:.3s}
.bvw-bar:nth-child(5){height:8px;animation-delay:.4s}
@keyframes bvwAnim {
  from { transform:scaleY(.4); opacity:.6; }
  to   { transform:scaleY(1.2); opacity:1; }
}


`;
// Inject BOT_CSS styles
(function(){ const _bs = document.createElement("style"); _bs.textContent = window.BOT_CSS || BOT_CSS || ""; document.head.appendChild(_bs); })();

/* ══ Mesajlar ══ */

const GREETING_MSGS = [
  '👋 Merhaba! Nasıl yardımcı olabilirim?\n/yardım ile komutlarımı görebilirsin 🌿',
  '🌿 Selam! Sana yardım etmek için buradayım!',
  '🤖 NatureBot aktif! Ne yapmak istersin?',
  '💚 Merhaba! /hava, /flip, /zar dene!',
  '🌱 Buradayım! Uygulama hakkında ne merak ediyorsun?',
];
const IDLE_MSGS = [
  '💬 Bir oda seç ve sohbete katıl!',
  '🌤️ Hava durumu için /hava [şehir] dene',
  '🎲 Zar atmak ister misin? /zar yaz!',
  '🪙 Yazı mı tura mı? /flip ile öğren!',
  '👥 Arkadaş eklemek için Arkadaşlar sekmesine bak',
  '🔔 Bildirimlerin için zil ikonuna tıkla',
  '🎨 Temayı değiştirmek ister misin? Profil → Görünüm',
  '📋 Forumda yeni konular var, bir göz at!',
];


/* ══ Sesli Konuşma (Web Speech API) ══ */

const SPEECH = {
  supported: 'speechSynthesis' in window,
  speaking: false,
  currentUtter: null,

  getVoice() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    // 1) Google Türkçe (Chrome — en doğal kalite)
    const gTR = voices.find(v => /google.*turkish|turkish.*google/i.test(v.name));
    if (gTR) return gTR;
    // 2) Microsoft Türkçe (Edge/Windows)
    const msTR = voices.find(v => v.lang === 'tr-TR' && /microsoft/i.test(v.name));
    if (msTR) return msTR;
    // 3) Herhangi Türkçe
    const anyTR = voices.find(v => v.lang && v.lang.startsWith('tr'));
    if (anyTR) return anyTR;
    // 4) Google UK English Male — kaliteli doğal erkek
    const gUK = voices.find(v => /Google UK English Male/i.test(v.name));
    if (gUK) return gUK;
    // 5) macOS/iOS erkek sesleri
    const natM = voices.find(v => /Daniel|Alex|Tom|Fred|Bruce/i.test(v.name));
    if (natM) return natM;
    // 6) İngilizce erkek
    const enM = voices.find(v => v.lang.startsWith('en') && /male|man|guy/i.test(v.name));
    if (enM) return enM;
    // 7) İngilizce en-US
    const en = voices.find(v => v.lang.startsWith('en-US'));
    return en || voices[0] || null;
  },

  // Metni doğal, anlaşılır konuşmaya çevir
  cleanForSpeech(text) {
    let t = text;

    // Emojileri temizle
    t = t.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]/gu, ' ');
    t = t.replace(/[🌿🤖💚🌱👋💬🌤️🎲🪙👥🔔🎨📋⏳❌📍📊🔑⚙️👤📅🕐🎯🌳✅➕]/g, ' ');

    // Saat formatı: "05:30" → "saat beş otuz"
    t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => {
      const hr = parseInt(h);
      const mn = parseInt(m);
      const hrTR = ['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz',
                    'on','on bir','on iki','on üç','on dört','on beş','on altı','on yedi',
                    'on sekiz','on dokuz','yirmi','yirmi bir','yirmi iki','yirmi üç'];
      const mnTR = mn === 0 ? '' : (mn < 10 ? 'sıfır ' : '') +
        ['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz',
         'on','on bir','on iki','on üç','on dört','on beş','on altı','on yedi',
         'on sekiz','on dokuz','yirmi','yirmi bir','yirmi iki','yirmi üç','yirmi dört',
         'yirmi beş','yirmi altı','yirmi yedi','yirmi sekiz','yirmi dokuz',
         'otuz','otuz bir','otuz iki','otuz üç','otuz dört','otuz beş','otuz altı',
         'otuz yedi','otuz sekiz','otuz dokuz','kırk','kırk bir','kırk iki','kırk üç',
         'kırk dört','kırk beş','kırk altı','kırk yedi','kırk sekiz','kırk dokuz',
         'elli','elli bir','elli iki','elli üç','elli dört','elli beş','elli altı',
         'elli yedi','elli sekiz','elli dokuz'][mn];
      const suffix = hr < 12 ? 'sabah' : (hr < 18 ? 'öğleden sonra' : 'akşam');
      return 'saat ' + (hrTR[hr] || hr) + (mn > 0 ? ' ' + mnTR : '') + ' ' + suffix;
    });

    // Sayıları Türkçe oku (1-999)
    const sayiTR = (n) => {
      const birler = ['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
      const onlar = ['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
      if (n === 0) return 'sıfır';
      let s = '';
      if (n >= 100) { if(Math.floor(n/100)>1) s += birler[Math.floor(n/100)]+'yüz'; else s+='yüz'; n%=100; }
      if (n >= 10)  { s += onlar[Math.floor(n/10)]; n%=10; }
      if (n > 0)    { s += birler[n]; }
      return s.trim();
    };

    // Yıl formatı: "2026" → "iki bin yirmi altı"
    t = t.replace(/\b(20\d{2}|19\d{2})\b/g, (_, y) => {
      const yr = parseInt(y);
      const binler = Math.floor(yr/1000);
      const rest = yr % 1000;
      return sayiTR(binler) + ' bin ' + (rest > 0 ? sayiTR(rest) : '');
    });

    // Diğer sayılar: rakam rakam değil, sayı olarak oku
    t = t.replace(/\b(\d+)\b/g, (_, n) => {
      const num = parseInt(n);
      if (num > 0 && num < 1000) return sayiTR(num);
      return n;
    });

    // Noktalama ve biçimlendirme
    t = t.replace(/\n+/g, '. ');
    t = t.replace(/→/g, ', ');
    t = t.replace(/[|\/*_~^<>{}()#@=+\[\]\\]/g, ' ');
    t = t.replace(/\.{2,}/g, '.');
    t = t.replace(/\s{2,}/g, ' ');

    return t.trim();
  },

  speak(text, onStart, onEnd) {
    if (!this.supported) { onEnd && onEnd(); return; }
    this.stop();

    const clean = this.cleanForSpeech(text);
    if (!clean || clean.length < 2) { onEnd && onEnd(); return; }

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'tr-TR';
    utter.pitch = 0.78;   // doğal erkek tonu — daha derin ve akıcı
    utter.rate  = 1.08;   // hafif hızlı = daha akıcı konuşma
    utter.volume = 1.0;

    // Sesi yükle ve ata
    const setVoice = () => {
      const voice = this.getVoice();
      if (voice) utter.voice = voice;
    };
    setVoice();
    if (!utter.voice) {
      // Sesler henüz yüklenmediyse bekle
      speechSynthesis.onvoiceschanged = () => { setVoice(); };
    }

    utter.onstart = () => { this.speaking = true; onStart && onStart(); };
    utter.onend   = () => { this.speaking = false; onEnd && onEnd(); };
    utter.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') console.warn('TTS hata:', e.error);
      this.speaking = false;
      onEnd && onEnd();
    };

    this.currentUtter = utter;
    // iOS/Safari fix: küçük gecikme
    setTimeout(() => { try { speechSynthesis.speak(utter); } catch(e){} }, 50);
  },

  stop() {
    if (this.supported) {
      try { speechSynthesis.cancel(); } catch(e){}
      this.speaking = false;
    }
  }
};
window.SPEECH = SPEECH;


/* ══ Komut İşleyici ══ */

function runBotCmd(cmdText, showInBubble) {
  if (!cmdText.startsWith('/')) return false;
  const parts = cmdText.trim().split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  const respond = (text) => {
    if (showInBubble && window._natureBotInstance) {
      window._natureBotInstance.showBubble(text, false);
    }
    const box = document.getElementById('chatMsgs');
    if (box) {
      const div = document.createElement('div');
      div.className = 'msg-sys';
      div.style.cssText = 'background:rgba(74,143,64,.08);border:1px solid rgba(74,143,64,.15);border-radius:10px;padding:8px 12px;margin:6px 12px;font-size:.82rem;white-space:pre-wrap;';
      div.innerHTML = '<span style="color:var(--accent);font-weight:700;">🤖 NatureBot</span><br>' + text.replace(/</g,'&lt;');
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
  };

  const cmds = {
    '/yardım': () => respond('🤖 Komutlar:\n/hava [şehir] — Hava durumu\n/saat — Şu anki saat\n/tarih — Bugünün tarihi\n/flip — Yazı/Tura\n/zar — Rastgele zar\n/rng [sayı] — Rastgele sayı\n/anket [soru] — Anket oluştur\n\nUygulama yardımı için:\n"oda nasıl oluştururum?"\n"arkadaş nasıl eklerim?" yazabilirsin'),
    '/saat': () => {
      const now = new Date();
      const display = now.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
      respond('🕐 Şu an: ' + display);
    },
    '/tarih': () => {
      const now = new Date();
      const display = now.toLocaleDateString('tr-TR', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
      respond('📅 ' + display);
    },
    '/flip': () => respond('🪙 ' + (Math.random()<.5 ? 'YAZI ✅' : 'TURA ✅')),
    '/zar': () => respond('🎲 Zar: ' + Math.ceil(Math.random()*6)),
    '/rng': () => { const n=parseInt(args)||100; respond('🎯 1-'+n+' arası: '+Math.ceil(Math.random()*n)); },
    '/hava': () => {
      if (!args) { respond('📍 Kullanım: /hava [şehir]\nÖrnek: /hava istanbul'); return; }
      respond('⏳ ' + args + ' için hava durumu alınıyor...');
      // Önce geocoding ile koordinat al
      fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(args) + '&count=1&language=tr&format=json')
        .then(r=>r.json())
        .then(geo => {
          if (!geo.results || !geo.results.length) { respond('❌ Şehir bulunamadı: ' + args); return; }
          const { latitude, longitude, name, country } = geo.results[0];
          return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`)
            .then(r=>r.json())
            .then(w => {
              const c = w.current;
              const codes = {0:'☀️ Açık',1:'🌤️ Az bulutlu',2:'⛅ Parçalı bulutlu',3:'☁️ Bulutlu',45:'🌫️ Sisli',48:'🌫️ Kırağılı sis',51:'🌦️ Hafif çisenti',61:'🌧️ Hafif yağmur',63:'🌧️ Yağmurlu',65:'🌧️ Yoğun yağmur',71:'❄️ Hafif kar',73:'❄️ Karlı',75:'❄️ Yoğun kar',80:'🌦️ Sağanak',95:'⛈️ Fırtına'};
              const desc = codes[c.weathercode] || '🌡️';
              respond(`${desc} ${name}, ${country}\n🌡️ ${c.temperature_2m}°C | 💨 ${c.windspeed_10m} km/s`);
            });
        })
        .catch(()=>respond('❌ Hava durumu alınamadı.'));
    },
    '/anket': () => {
      if (!args) { respond('📊 Kullanım: /anket [soru]'); return; }
      const m=document.getElementById('createPollModal'), q=document.getElementById('pollQuestion');
      if(m&&q){q.value=args;m.style.display='flex';respond('📊 Anket oluşturucu açıldı!');}
      else respond('📊 Anket oluşturucu açılamadı. Önce bir odaya gir.');
    },
  };

  if (cmds[cmd]) { cmds[cmd](); return true; }

  // Akıllı uygulama yardımı
  const helpMap = [
    { keys:['oda','kanal','grup','oluştur','yarat'], reply:'➕ Oda oluşturmak için:\nAna Sayfa → GRUPLAR → + butonuna tıkla' },
    { keys:['arkadaş','ekle','davet'], reply:'👥 Arkadaş eklemek için:\nAlt menüden "Arkadaşlar" sekmesine git → +' },
    { keys:['tema','görünüm','renk','arayüz'], reply:'🎨 Tema değiştirmek için:\nProfil → Ayarlar → Görünüm' },
    { keys:['bildirim','zil','ses'], reply:'🔔 Bildirimler için sağ üstteki zil ikonuna tıkla' },
    { keys:['mesaj','dm','direkt'], reply:'💬 Direkt mesaj için:\nAna Sayfa → DİREKT MESAJLAR → +' },
    { keys:['profil','hesap','ayar'], reply:'👤 Profil için sağ üstteki avatar fotoğrafına tıkla' },
    { keys:['forum','konu','post'], reply:'📋 Forum için alt menüden "Forum" sekmesine git' },
    { keys:['izle','video','yayın'], reply:'📺 İzleme için alt menüden "İzle" sekmesine git' },
    { keys:['arama','ara','bul'], reply:'🔍 Arama için üstteki arama kutusunu kullan' },
    { keys:['çıkış','logout'], reply:'🚪 Çıkış: Profil → Ayarlar → Çıkış Yap' },
    { keys:['admin','yönet','panel'], reply:'⚙️ Admin paneli için Profil menüsünde "Admin" seç' },
    { keys:['robot','sen','kimsin'], reply:'🤖 Ben NatureBot! Nature.co uygulamasının yapay zeka asistanıyım. Sana her konuda yardımcı olurum!' },
  ];
  const lower = cmdText.toLowerCase();
  for (const h of helpMap) {
    if (h.keys.some(k => lower.includes(k))) { respond(h.reply); return true; }
  }

  respond('❓ "' + cmd + '" komutunu bilmiyorum.\n/yardım ile tüm komutları görebilirsin!');
  return true;
}
window.runBotCmd = runBotCmd;

;(function(){
class _BotMethods {
/* ── Sesli konuşma — sadece butonla ── */

  speak(text) {
    if (!SPEECH.supported) return;
    // Sadece "Sesli Oku" butonuyla çalışır (mobil ve masaüstü)
    if (!this._speakRequested) return;
    this._speakRequested = false;
    SPEECH.speak(text,
      () => {
        // Başladı
        this.isTalking = true;
        this.el.classList.add('talking');
        this.voiceWave.classList.add('visible');
        this.updateVoiceWavePos();
      },
      () => {
        // Bitti
        this.isTalking = false;
        this.el.classList.remove('talking');
        this.voiceWave.classList.remove('visible');
      }
    );
  }

  stopSpeaking() {
    SPEECH.stop();
    this.isTalking = false;
    this.el.classList.remove('talking');
    this.voiceWave.classList.remove('visible');
  }

  updateVoiceWavePos() {
    if (!this.voiceWave.classList.contains('visible')) return;
    if (IS_MOBILE()) {
      this.voiceWave.style.right = '62px';
      this.voiceWave.style.top = '80px';
      this.voiceWave.style.left = 'auto';
    } else {
      this.voiceWave.style.left = (this.x + 65) + 'px';
      this.voiceWave.style.top = (this.y + 20) + 'px';
      this.voiceWave.style.right = 'auto';
    }
  }

  bindClick() {
    let touchMoved = false;
    this.el.addEventListener('touchstart', () => { touchMoved = false; }, {passive:true});
    this.el.addEventListener('touchmove', () => { touchMoved = true; }, {passive:true});
    this.el.addEventListener('touchend', (e) => {
      if (!touchMoved) { e.preventDefault(); this._onTap(); }
    });
    this.el.addEventListener('click', (e) => {
      if (!this.isDragging) { e.stopPropagation(); this._onTap(); }
    });

    // Masaüstü sürükleme
    this.el.addEventListener('mousedown', (e) => {
      if (IS_MOBILE()) return;
      this.isDragging = false;
      const sx = e.clientX, sy = e.clientY;
      const ox = e.clientX - this.x, oy = e.clientY - this.y;
      const onMove = (ev) => {
        if (!this.isDragging && (Math.abs(ev.clientX-sx)>4||Math.abs(ev.clientY-sy)>4)) this.isDragging = true;
        if (this.isDragging) {
          this.x = ev.clientX-ox; this.y = ev.clientY-oy;
          this.targetX = this.x; this.targetY = this.y;
          this.el.style.left = this.x+'px'; this.el.style.top = this.y+'px';
          this.updateBubblePos();
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        setTimeout(() => { this.isDragging = false; }, 50);
        this.recordInteraction();
        if (!IS_MOBILE()) this.startWanderDesktop();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    document.addEventListener('click', (e) => {
      if (!this.el.contains(e.target) && !this.bubble.contains(e.target)) this.hideBubble();
    });
  }

  _onTap() {
    if (this.isSleeping) {
      this.wakeUp();
      return;
    }
    this.recordInteraction();
    if (this.isTalking) {
      this.stopSpeaking();
      return;
    }
    this.showGreeting();
  }

  updateBubblePos() {
    if (!this.bubble.classList.contains('visible')) return;
    if (IS_MOBILE()) {
      const slot = document.getElementById('mobileRobotSlot');
      if (slot) {
        const r = slot.getBoundingClientRect();
        // Balonun sola açılması için
        let bLeft = r.left - 230;
        if (bLeft < 8) bLeft = 8;
        this.bubble.style.left = bLeft + 'px';
        this.bubble.style.top = (r.bottom + 6) + 'px';
        this.bubble.style.right = 'auto';
        this.bubble.style.position = 'fixed';
      }
      return;
    }
    const botW = 60;
    let bx = this.x + botW + 8;
    if (bx + 240 > window.innerWidth) bx = this.x - 248;
    this.bubble.style.left = Math.max(8, bx) + 'px';
    this.bubble.style.top  = (this.y - 10) + 'px';
    this.bubble.style.right = 'auto';
  }

  showBubble(msg, showCmds=false) {
    clearTimeout(this.bubbleTimeout);

    const speakBtn = SPEECH.supported
      ? `<span class="bot-speak-btn" id="botSpeakBtn" onclick="window._natureBotInstance && window._natureBotInstance._speakBubble(this)">🔊 Sesli Oku</span>`
      : '';

    const quickCmds = showCmds ? `<div class="bot-quick-cmds">
      <span class="bot-qcmd" onclick="window._natureBotRunCmd('/hava istanbul')">/hava</span>
      <span class="bot-qcmd" onclick="window._natureBotRunCmd('/flip')">/flip</span>
      <span class="bot-qcmd" onclick="window._natureBotRunCmd('/zar')">/zar</span>
      <span class="bot-qcmd" onclick="window._natureBotRunCmd('/saat')">/saat</span>
      <span class="bot-qcmd" onclick="window._natureBotRunCmd('/yardım')">/yardım</span>
    </div>` : '';

    this.bubble.innerHTML = `
      <div class="bot-bubble-name">
        <svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#4a8f40" opacity=".3"/><circle cx="6" cy="6" r="3" fill="#6dbf67"/></svg>
        NatureBot
      </div>
      <div class="bot-bubble-msg" id="botBubbleMsg">${msg}</div>
      ${quickCmds}
      <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">${speakBtn}</div>
      <div style="display:flex;gap:4px;margin-top:8px;">
        <input id="botChatInput" type="text" placeholder="Bir şey sor..." autocomplete="off"
          style="flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(109,191,103,.3);border-radius:8px;padding:5px 9px;color:#dcedc8;font-size:.78rem;outline:none;min-width:0;"
          onkeydown="if(event.key==='Enter'){window._natureBotReply(this.value);this.value='';event.preventDefault();}"
        />
        <button onclick="const i=document.getElementById('botChatInput');window._natureBotReply(i.value);i.value='';"
          style="background:#4a8f40;border:none;border-radius:8px;padding:5px 10px;color:#dcedc8;cursor:pointer;font-size:.82rem;">➤</button>
      </div>
      <div class="bot-bubble-close" onclick="window._natureBotInstance&&window._natureBotInstance.hideBubble()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
    `;

    if (IS_MOBILE()) {
      this.bubble.style.cssText = 'position:fixed;max-width:230px;';
    } else {
      this.updateBubblePos();
    }
    this.bubble.classList.add('visible');
    this.updateBubblePos();
    this.bubbleTimeout = setTimeout(() => this.hideBubble(), 25000);
    setTimeout(() => { try { document.getElementById('botChatInput')?.focus(); } catch(e){} }, 100);
  }

  _speakBubble(btn) {
    const msgEl = document.getElementById('botBubbleMsg');
    if (!msgEl) return;
    if (SPEECH.speaking) {
      this.stopSpeaking();
      btn.textContent = '🔊 Sesli Oku';
      btn.classList.remove('speaking');
      return;
    }
    btn.textContent = '⏹ Durdur';
    btn.classList.add('speaking');
    this._speakRequested = true;
    // onEnd callback'i doğrudan SPEECH.speak'e geçir
    const onEnd = () => {
      this.isTalking = false;
      this.el.classList.remove('talking');
      this.voiceWave.classList.remove('visible');
      btn.textContent = '🔊 Sesli Oku';
      btn.classList.remove('speaking');
    };
    const msgText = msgEl.textContent;
    // SPEECH.speak'i direkt çağır (speak() wrapper'ını bypass ederek callback ilet)
    SPEECH.speak(msgText,
      () => {
        this.isTalking = true;
        this.el.classList.add('talking');
        this.voiceWave.classList.add('visible');
        this.updateVoiceWavePos();
      },
      onEnd
    );
  }

  hideBubble() {
    this.bubble.classList.remove('visible');
    this.stopSpeaking();
  }

  showGreeting() {
    const msg = GREETING_MSGS[Math.floor(Math.random() * GREETING_MSGS.length)];
    this.showBubble(msg, true);
  }

  scheduleIdleMsg() {
    clearTimeout(this.idleTimeout);
    const delay = 35000 + Math.random() * 35000;
    this.idleTimeout = setTimeout(() => {
      // Otomatik açılmıyor — sadece zaten açıksa mesajı güncelle
      // (bubble'ı kullanıcı tıklamadan açmıyoruz)
      this.scheduleIdleMsg();
    }, delay);
  }

  hookCallScreen() {
    const check = () => {
      const cs = document.getElementById('callScreen');
      if (!cs) { setTimeout(check, 1500); return; }
      new MutationObserver(() => {
        const vis = cs.style.display !== 'none' && cs.style.display !== '';
        if (vis && !this.isCalling) this.enterCallMode();
        else if (!vis && this.isCalling) this.exitCallMode();
      }).observe(cs, { attributes:true, attributeFilter:['style'] });
    };
    check();
  }

  enterCallMode() {
    this.isCalling = true;
    this.el.classList.add('calling');
    clearTimeout(this.wanderTimer);
    if (!IS_MOBILE()) {
      const av = document.getElementById('callAvatar');
      if (av) { const r=av.getBoundingClientRect(); this.targetX=r.left+r.width/2-30; this.targetY=r.top-95; }
      else { this.targetX=window.innerWidth/2-30; this.targetY=window.innerHeight/2-120; }
    }
    const name = (document.getElementById('callName')||{}).textContent || '...';
    this.showBubble(`📞 ${name} ile bağlantı kuruluyor! 🌿`, false);
  }

  exitCallMode() {
    this.isCalling = false;
    this.el.classList.remove('calling');
    this.hideBubble();
    if (!IS_MOBILE() && !this.isSleeping) this.startWanderDesktop();
  }
}
// Copy all methods to NatureBotPet prototype
Object.getOwnPropertyNames(_BotMethods.prototype).filter(n=>n!=="constructor").forEach(n=>{NatureBotPet.prototype[n]=_BotMethods.prototype[n];});
})()


/* ─────────────────────────────── */


'use strict';


/* ═══════════════════════════════════════════════════
   1. 🌙 SİSTEM TEMASI ALGILAMA
═══════════════════════════════════════════════════ */

let _sysThemeEnabled = localStorage.getItem('nc_sysTheme') === '1';

function applySysTheme(dark) {
  if (!_sysThemeEnabled) return;
  const body = document.body;
  const targetTheme = dark ? 'dark' : 'latte';
  if (body.getAttribute('data-theme') !== targetTheme) {
    body.setAttribute('data-theme', targetTheme);
    const banner = document.getElementById('sysThemeBanner');
    if (banner) {
      banner.textContent = dark ? '🌙 Koyu tema uygulandı' : '☀️ Açık tema uygulandı';
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 2500);
    }
  }
}

function initSysTheme() {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  applySysTheme(mq.matches);
  mq.addEventListener('change', e => applySysTheme(e.matches));
}

function toggleSysTheme() {
  _sysThemeEnabled = !_sysThemeEnabled;
  localStorage.setItem('nc_sysTheme', _sysThemeEnabled ? '1' : '0');
  if (_sysThemeEnabled) {
    initSysTheme();
    showToast('🌙 Sistem teması algılama: AÇIK');
  } else {
    showToast('🎨 Manuel tema kontrolü: AÇIK');
  }
  // Update toggle UI if visible
  const btn = document.getElementById('sysThemeToggleBtn');
  if (btn) btn.querySelector('.sys-theme-badge').textContent = _sysThemeEnabled ? 'AÇIK' : 'KAPALI';
}

if (_sysThemeEnabled) {
  // Apply after a short delay so existing theme logic has run first
  setTimeout(initSysTheme, 1000);
}

// Inject system theme toggle into profile/settings area
function injectSysThemeToggle() {
  // Find theme section in profile
  const appearanceSections = document.querySelectorAll('.ui-style-card, [data-theme-section]');
  // We'll add a persistent button in settings when they open
  const settingsBtn = document.getElementById('sysThemeToggleBtn');
  if (!settingsBtn) {
    // Hook into profile screen loading
    const profTheme = document.querySelector('#profileScreen .prof-section-title');
    if (profTheme) {
      const toggleRow = document.createElement('div');
      toggleRow.style.cssText = 'padding: 4px 0 12px;';
      toggleRow.innerHTML = `
        <div class="sys-theme-toggle" id="sysThemeToggleBtn" onclick="toggleSysTheme()">
          <span>🌙</span>
          <span style="flex:1;">Sistem temasını otomatik uygula</span>
          <div class="sys-theme-badge">${_sysThemeEnabled ? 'AÇIK' : 'KAPALI'}</div>
        </div>
      `;
      profTheme.after(toggleRow);
    }
  }
}

setTimeout(injectSysThemeToggle, 3000);
window._toggleSysTheme = toggleSysTheme;



/* ═══════════════════════════════════════════════════
   6. ⏰ MESAJ ZAMANLAYICI
═══════════════════════════════════════════════════ */

let _scheduledMsgs = JSON.parse(localStorage.getItem('nc_scheduled') || '[]');
let _scheduleTimers = [];

function openSchedulePanel() {
  const panel = document.getElementById('scheduleMsgPanel');
  if (!panel) return;

  // Set min datetime to 1 min from now
  const timeInp = document.getElementById('scheduleMsgTime');
  if (timeInp) {
    const now = new Date(Date.now() + 60000);
    timeInp.min = now.toISOString().slice(0, 16);
    timeInp.value = now.toISOString().slice(0, 16);
  }

  // Pre-fill with current input
  const msgText = document.getElementById('scheduleMsgText');
  const currentInp = document.getElementById('deskInp') || document.getElementById('msgInp');
  if (msgText && currentInp) msgText.value = currentInp.value;

  renderScheduledList();
  panel.classList.add('open');
}

function closeSchedulePanel() {
  const panel = document.getElementById('scheduleMsgPanel');
  if (panel) panel.classList.remove('open');
}

function confirmScheduleMsg() {
  const text = (document.getElementById('scheduleMsgText')?.value || '').trim();
  const timeVal = document.getElementById('scheduleMsgTime')?.value;
  if (!text) { showToast('Mesaj yazın'); return; }
  if (!timeVal) { showToast('Zaman seçin'); return; }

  const scheduledFor = new Date(timeVal).getTime();
  if (scheduledFor <= Date.now()) { showToast('⚠️ Geçmiş bir zaman seçildi'); return; }

  const room = typeof _deskRoom !== 'undefined' ? (_deskRoom || (typeof _cRoom !== 'undefined' ? _cRoom : null)) : null;
  if (!room) { showToast('Önce bir odaya gir'); return; }
  if (typeof _cu === 'undefined') { showToast('Giriş yapın'); return; }

  const item = {
    id: Date.now().toString(),
    text, scheduledFor, room, user: _cu,
    createdAt: Date.now(),
  };

  _scheduledMsgs.push(item);
  localStorage.setItem('nc_scheduled', JSON.stringify(_scheduledMsgs));
  scheduleTimer(item);
  renderScheduledList();

  const d = new Date(scheduledFor);
  const fmt = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' ' +
    d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  showToast('⏰ Mesaj ' + fmt + ' için ayarlandı');

  document.getElementById('scheduleMsgText').value = '';
}

function scheduleTimer(item) {
  const delay = item.scheduledFor - Date.now();
  if (delay <= 0) { sendScheduledMsg(item); return; }
  const timer = setTimeout(() => sendScheduledMsg(item), delay);
  _scheduleTimers.push(timer);
}

function sendScheduledMsg(item) {
  if (typeof dbRef !== 'function' || !item.room) return;
  const msg = {
    user: item.user,
    text: item.text,
    ts: Date.now(),
    scheduled: true,
  };
  dbRef('msgs/' + item.room).push(msg).then(() => {
    showToast('⏰ Zamanlı mesaj gönderildi!');
  });
  // Remove from list
  _scheduledMsgs = _scheduledMsgs.filter(m => m.id !== item.id);
  localStorage.setItem('nc_scheduled', JSON.stringify(_scheduledMsgs));
  renderScheduledList();
}

function cancelScheduledMsg(id) {
  _scheduledMsgs = _scheduledMsgs.filter(m => m.id !== id);
  localStorage.setItem('nc_scheduled', JSON.stringify(_scheduledMsgs));
  renderScheduledList();
  showToast('🗑 Zamanlı mesaj iptal edildi');
}

function renderScheduledList() {
  const listEl = document.getElementById('scheduledMsgList');
  if (!listEl) return;
  const valid = _scheduledMsgs.filter(m => m.scheduledFor > Date.now());
  if (!valid.length) {
    listEl.innerHTML = '';
    return;
  }
  listEl.innerHTML = `
    <div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Zamanlanan Mesajlar</div>
    ${valid.map(m => {
      const d = new Date(m.scheduledFor);
      const fmt = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' · ' +
        d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      return `<div class="scheduled-list-item">
        <span class="sl-text">${typeof esc === 'function' ? esc(m.text) : m.text}</span>
        <span class="sl-time">⏰ ${fmt}</span>
        <span class="sl-cancel" onclick="cancelScheduledMsg('${m.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>
      </div>`;
    }).join('')}
  `;
}

// Restore timers on page load
_scheduledMsgs = _scheduledMsgs.filter(m => m.scheduledFor > Date.now());
localStorage.setItem('nc_scheduled', JSON.stringify(_scheduledMsgs));
_scheduledMsgs.forEach(item => scheduleTimer(item));

window.openSchedulePanel = openSchedulePanel;
window.closeSchedulePanel = closeSchedulePanel;
window.confirmScheduleMsg = confirmScheduleMsg;
window.cancelScheduledMsg = cancelScheduledMsg;


/* ─────────────────────────────── */



/* ── UI'da kullanılan icon shortcodes ── */

const SHORTCODES = {
  ':home:': ICONS['🏠'],
  ':chat:': ICONS['💬'],
  ':games:': ICONS['🎮'],
  ':profile:': ICONS['👤'],
  ':bell:': ICONS['🔔'],
  ':settings:': ICONS['⚙️'],
  ':search:': ICONS['🔍'],
  ':send:': ICONS['➤'],
  ':close:': ICONS['✕'],
  ':check:': ICONS['✓'],
  ':plus:': ICONS['➕'],
  ':trash:': ICONS['🗑️'],
  ':edit:': ICONS['✏️'],
  ':lock:': ICONS['🔒'],
  ':crown:': ICONS['👑'],
  ':star:': ICONS['⭐'],
  ':heart:': ICONS['❤️'],
  ':fire:': ICONS['🔥'],
  ':shield:': ICONS['🛡️'],
  ':chart:': ICONS['📊'],
  ':link:': ICONS['🔗'],
  ':mic:': ICONS['🎙️'],
  ':attach:': ICONS['📎'],
  ':emoji:': ICONS['😊'],
  ':globe:': ICONS['🌐'],
};


/* ── Attr-based icon injection ── */

function injectAttrIcons() {
  // data-icon="emoji" attributes
  document.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.getAttribute('data-icon');
    const svgStr = ICONS[key] || SHORTCODES[key];
    if (svgStr) el.innerHTML = svgStr;
  });
}


/* ── Run on DOM ready ── */

function runIconSystem() {
  injectTabIcons();
  injectRailIcons();
  injectAttrIcons();
  // Selectively replace emojis in UI elements (not message content to preserve emoji reactions)
  const uiZones = [
    '.tab-bar', '.admin-tabs', '.admin-panel-wrap',
    '.c-header', '.bs-title', '.prof-sec-title', '.dsk-sec-hdr',
    '#deskRail', '#deskSidebarHeader', '.atab', '.hdr-btn',
    '.login-title', '.login-box .login-sub',
  ];
  uiZones.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      replaceEmojisInNode(el);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runIconSystem, 200);
    // Re-run after dynamic content loads
    setTimeout(runIconSystem, 1500);
  });
} else {
  setTimeout(runIconSystem, 200);
  setTimeout(runIconSystem, 1500);
}

// MutationObserver for dynamic UI elements
const mobserver = new MutationObserver(mutations => {
  let needsUpdate = false;
  for (const m of mutations) {
    if (m.addedNodes.length > 0) { needsUpdate = true; break; }
  }
  if (needsUpdate) setTimeout(runIconSystem, 100);
});
document.addEventListener('DOMContentLoaded', () => {
  mobserver.observe(document.body, { childList: true, subtree: true });
});


/* ── Global erişim ── */

window.NC_ICONS = ICONS;
window.nc_replaceIcons = runIconSystem;

})();

(function injectMiscCSS(){
  const s = document.createElement("style");
  s.textContent = `

/* ── 3. iOS WIDGET PANELİ ── */

#widgetsPanelToggle {
  display: flex; align-items: center; justify-content: center;
  gap: 6px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: .8rem; color: var(--text);
  transition: all .18s;
  user-select: none;
}
#widgetsPanelToggle:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(var(--glow-rgb,91,155,213),0.4);
}
#widgetsPanel {
  position: fixed;
  top: 56px; right: 16px;
  width: 280px;
  z-index: 7800;
  display: none; flex-direction: column; gap: 10px;
  padding: 4px 0;
  animation: widgetSlideIn .22s cubic-bezier(.34,1.56,.64,1);
}
#widgetsPanel.open { display: flex; }
@keyframes widgetSlideIn {
  from { opacity: 0; transform: translateY(-10px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* Widget kartları - varolan surface/border değişkenlerini kullanır */
.ios-widget {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 16px 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}
.ios-widget-label {
  font-size: .6rem; font-weight: 900;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 10px;
}
/* Saat widget */
.w-clock-time {
  font-size: 2rem; font-weight: 900;
  color: var(--text-hi); letter-spacing: -.03em; line-height: 1;
  margin-bottom: 2px;
}
.w-clock-date { font-size: .72rem; color: var(--muted); }
/* Online sayaç widget - varolan .green rengi kullanır */
.w-online-count {
  font-size: 1.8rem; font-weight: 900;
  color: var(--green);
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 6px;
}
.w-online-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 10px var(--green);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.w-online-bar {
  height: 4px; background: rgba(255,255,255,0.08);
  border-radius: 4px; overflow: hidden; margin-bottom: 6px;
}
.w-online-fill {
  height: 100%; background: var(--green);
  border-radius: 4px;
  transition: width 1s ease;
}
.w-online-sub { font-size: .7rem; color: var(--muted); }
/* Hava widget */
.w-weather-main { display: flex; align-items: center; gap: 14px; }
.w-weather-temp { font-size: 1.8rem; font-weight: 900; color: var(--text-hi); line-height: 1; }
.w-weather-desc { font-size: .75rem; color: var(--muted); margin-top: 2px; }
.w-weather-icon { font-size: 2.4rem; }
.w-weather-details { display: flex; gap: 12px; margin-top: 10px; }
.w-weather-detail { font-size: .7rem; color: var(--muted); }


/* ══════════════════════════════════════════════
   🌿 KARBON AYAK İZİ MODALİ
══════════════════════════════════════════════ */

#carbonModalOverlay {
  position: fixed; inset: 0; z-index: 9200;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(8px);
  display: none; align-items: center; justify-content: center;
  padding: 20px;
}
#carbonModalOverlay.open { display: flex; }
#carbonModal {
  width: 100%; max-width: 380px;
  background: var(--bg2);
  border: 1px solid rgba(46,204,113,.2);
  border-radius: 24px;
  padding: 28px 24px;
  box-shadow: 0 0 40px rgba(46,204,113,.1), 0 24px 60px rgba(0,0,0,.5);
  animation: cmSlide .25s cubic-bezier(.34,1.56,.64,1);
}
@keyframes cmSlide {
  from { opacity:0; transform:scale(.92) translateY(12px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
.cm-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.cm-title { font-size:1rem; font-weight:900; color:var(--text-hi); display:flex; align-items:center; gap:8px; }
.cm-close { width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.07);border:none;color:var(--muted);cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center; }
.cm-close:hover { background:rgba(255,255,255,.14); }
.cm-score-wrap {
  text-align:center; margin-bottom:20px;
  padding: 18px 0 14px;
  background: rgba(46,204,113,.06);
  border: 1px solid rgba(46,204,113,.15);
  border-radius: 16px;
}
.cm-score-num { font-size:2.2rem; font-weight:900; color:#2ecc71; line-height:1; margin-bottom:4px; }
.cm-score-lbl { font-size:.72rem; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
.cm-score-grade {
  display:inline-block; margin-top:10px;
  padding:3px 14px; border-radius:100px; font-size:.72rem; font-weight:900;
}
.cm-items { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
.cm-item {
  display:flex; align-items:center; gap:12px;
  background:var(--surface); border:1px solid var(--border);
  border-radius:12px; padding:10px 14px;
}
.cm-item-icon { font-size:1.2rem; width:32px; text-align:center; flex-shrink:0; }
.cm-item-label { flex:1; font-size:.82rem; color:var(--text); }
.cm-item-val { font-size:.82rem; font-weight:900; color:#2ecc71; }
.cm-tip {
  font-size:.75rem; color:var(--muted); line-height:1.6;
  background:rgba(46,204,113,.05); border:1px solid rgba(46,204,113,.12);
  border-radius:12px; padding:10px 14px;
}


/* ══════════════════════════════════════════════
   🎵 DOĞA SESLERİ PANELİ
══════════════════════════════════════════════ */

#ambiancePanelOverlay {
  position: fixed; inset: 0; z-index: 9200;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(8px);
  display: none; align-items: center; justify-content: center;
  padding: 20px;
}
#ambiancePanelOverlay.open { display: flex; }
#ambiancePanel {
  width: 100%; max-width: 360px;
  background: var(--bg2);
  border: 1px solid rgba(91,155,213,.2);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(0,0,0,.5);
  animation: cmSlide .25s cubic-bezier(.34,1.56,.64,1);
}
.ap-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
.ap-title { font-size:1rem; font-weight:900; color:var(--text-hi); display:flex; align-items:center; gap:8px; }
.ap-tracks { display:flex; flex-direction:column; gap:8px; margin-bottom:18px; }
.ap-track {
  display:flex; align-items:center; gap:12px;
  padding:10px 14px; border-radius:12px;
  background:var(--surface); border:1px solid var(--border);
  cursor:pointer; transition:all .18s; user-select:none;
}
.ap-track:hover { background:var(--surface2); border-color:rgba(91,155,213,.3); }
.ap-track.playing { background:rgba(91,155,213,.1); border-color:rgba(91,155,213,.4); }
.ap-track-icon { font-size:1.3rem; width:32px; text-align:center; flex-shrink:0; }
.ap-track-name { flex:1; font-size:.85rem; font-weight:700; color:var(--text-hi); }
.ap-track-state { font-size:.7rem; color:var(--muted); }
.ap-track.playing .ap-track-state { color:var(--accent); }
.ap-vol-wrap { margin-bottom:16px; }
.ap-vol-label { font-size:.68rem; font-weight:900; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
.ap-vol-row { display:flex; align-items:center; gap:10px; }
.ap-vol-slider {
  flex:1; -webkit-appearance:none; height:4px;
  background: linear-gradient(90deg, var(--accent) var(--pct,70%), rgba(255,255,255,.1) var(--pct,70%));
  border-radius:4px; outline:none; cursor:pointer;
}
.ap-vol-slider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:var(--accent); cursor:pointer; }
.ap-vol-num { font-size:.72rem; font-weight:900; color:var(--text-hi); width:28px; text-align:right; }
.ap-stop-btn {
  width:100%; padding:10px; border:none; border-radius:12px;
  background:rgba(224,85,85,.15); border:1px solid rgba(224,85,85,.25);
  color:#f07070; font-size:.82rem; font-weight:700; cursor:pointer;
  transition:all .18s;
}
.ap-stop-btn:hover { background:rgba(224,85,85,.25); }
  `;
  document.head.appendChild(s);
})();

(function injectMiscHTML(){
  const html = `
<div id="carbonModalOverlay" onclick="if(event.target===this)closeCarbonModal()">
  <div id="carbonModal">
    <div class="cm-header">
      <div class="cm-title">🌿 Karbon Ayak İzi</div>
      <button class="cm-close" onclick="closeCarbonModal()">✕</button>
    </div>
    <div class="cm-score-wrap">
      <div class="cm-score-num" id="cmScoreNum">0g</div>
      <div class="cm-score-lbl">Tahmini CO₂ Kullanımı</div>
      <div class="cm-score-grade" id="cmGrade">🌱 Mükemmel</div>
    </div>
    <div class="cm-items">
      <div class="cm-item">
        <div class="cm-item-icon">💬</div>
        <div class="cm-item-label">Gönderilen mesajlar</div>
        <div class="cm-item-val" id="cmMsgVal">—</div>
      </div>
      <div class="cm-item">
        <div class="cm-item-icon">⏱️</div>
        <div class="cm-item-label">Tahmini oturum süresi</div>
        <div class="cm-item-val" id="cmTimeVal">—</div>
      </div>
      <div class="cm-item">
        <div class="cm-item-icon">📡</div>
        <div class="cm-item-label">Veri transferi</div>
        <div class="cm-item-val" id="cmDataVal">—</div>
      </div>
    </div>
    <div class="cm-tip" id="cmTip">🌍 Doğayı korumak için mesajlarını kısa tut ve gereksiz medya paylaşımından kaçın.</div>
  </div>
</div>

<!-- Doğa Sesleri Panel HTML -->

  `;
  document.addEventListener("DOMContentLoaded", function() {
    document.body.insertAdjacentHTML("beforeend", html);
  });
})();


/* ══════════════════════════════════════════════
   🌿 KARBON AYAK İZİ
══════════════════════════════════════════════ */

let _carbonSessionStart = Date.now();
let _carbonMsgCount = 0;

// Sayfa yüklenince mesaj sayacını senkronize et
document.addEventListener('DOMContentLoaded', () => {
  const mc = document.getElementById('profMsgCount');
  if (mc && mc.textContent && mc.textContent !== '—') {
    _carbonMsgCount = parseInt(mc.textContent) || 0;
  }
});

function _calcCarbon() {
  const mins = (Date.now() - _carbonSessionStart) / 60000;
  // Tahmini: 0.2g CO₂/dk cihaz kullanımı + 0.05g/mesaj
  const sessionCO2 = mins * 0.2;
  const msgCO2 = _carbonMsgCount * 0.05;
  const total = sessionCO2 + msgCO2;
  return {
    total: total.toFixed(1),
    mins: Math.round(mins),
    msgs: _carbonMsgCount,
    dataKb: Math.round(mins * 12 + _carbonMsgCount * 2)
  };
}

function openCarbonModal() {
  const data = _calcCarbon();
  const totalNum = parseFloat(data.total);

  document.getElementById('cmScoreNum').textContent = data.total + 'g';
  document.getElementById('cmMsgVal').textContent = data.msgs + ' adet';
  document.getElementById('cmTimeVal').textContent = data.mins < 60 ? data.mins + ' dk' : Math.floor(data.mins/60) + 's ' + (data.mins%60) + 'dk';
  document.getElementById('cmDataVal').textContent = data.dataKb < 1000 ? data.dataKb + ' KB' : (data.dataKb/1000).toFixed(1) + ' MB';

  // Sınıf rengi & notu
  const grade = document.getElementById('cmGrade');
  const tips = [
    '🌍 Kısa mesajlar daha az CO₂ üretir. Harika gidiyorsun!',
    '♻️ Büyük dosya paylaşımı yerine link kullanmayı dene.',
    '💡 Cihazını düşük parlaklıkta kullanmak enerji tasarrufu sağlar.',
    '🌱 Gereksiz sekmeleri kapatmak veri transferini azaltır.',
  ];
  document.getElementById('cmTip').textContent = tips[Math.floor(Math.random() * tips.length)];

  if (totalNum < 5) {
    grade.textContent = '🌱 Mükemmel';
    grade.style.cssText = 'display:inline-block;margin-top:10px;padding:3px 14px;border-radius:100px;font-size:.72rem;font-weight:900;background:rgba(46,204,113,.15);color:#2ecc71;border:1px solid rgba(46,204,113,.3);';
  } else if (totalNum < 20) {
    grade.textContent = '🌿 İyi';
    grade.style.cssText = 'display:inline-block;margin-top:10px;padding:3px 14px;border-radius:100px;font-size:.72rem;font-weight:900;background:rgba(240,192,64,.15);color:#f0c040;border:1px solid rgba(240,192,64,.3);';
  } else {
    grade.textContent = '⚠️ Dikkat';
    grade.style.cssText = 'display:inline-block;margin-top:10px;padding:3px 14px;border-radius:100px;font-size:.72rem;font-weight:900;background:rgba(224,85,85,.15);color:#e05555;border:1px solid rgba(224,85,85,.3);';
  }

  // Widget sayaçlarını da güncelle
  ['carbonCount','deskCarbonCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = data.total + 'g CO₂';
  });

  document.getElementById('carbonModalOverlay').classList.add('open');
}
function closeCarbonModal() {
  document.getElementById('carbonModalOverlay').classList.remove('open');
}
// Her mesaj gönderilince karbon sayacını artır
(function(){
  const origSend = window.sendMsg;
  if (origSend) window.sendMsg = function(...args) {
    _carbonMsgCount++;
    return origSend(...args);
  };
  // Periyodik widget güncelleme
  setInterval(() => {
    const data = _calcCarbon();
    ['carbonCount','deskCarbonCount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = data.total + 'g CO₂';
    });
  }, 30000);
})();
window.openCarbonModal = openCarbonModal;
window.closeCarbonModal = closeCarbonModal;


/* ══════════════════════════════════════════════
   🎵 DOĞA SESLERİ
══════════════════════════════════════════════ */

const AMBIANCE_TRACKS = [
  { id:'rain',    icon:'🌧️', name:'Yağmur',       url:'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f15b567.mp3' },
  { id:'forest',  icon:'🌲', name:'Orman',         url:'https://cdn.pixabay.com/download/audio/2021/09/06/audio_6a3b0571ad.mp3' },
  { id:'ocean',   icon:'🌊', name:'Okyanus',       url:'https://cdn.pixabay.com/download/audio/2021/08/09/audio_b5b4a8d3c3.mp3' },
  { id:'fire',    icon:'🔥', name:'Şömine',        url:'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3' },
  { id:'wind',    icon:'💨', name:'Rüzgar',        url:'https://cdn.pixabay.com/download/audio/2022/02/23/audio_d1718ab41b.mp3' },
  { id:'birds',   icon:'🐦', name:'Kuş Sesleri',   url:'https://cdn.pixabay.com/download/audio/2021/09/30/audio_99bed6c8d5.mp3' },
];

let _ambiAudio = null;
let _ambiTrackId = null;
let _ambiVol = 0.7;

function renderAmbianceTracks() {
  const list = document.getElementById('apTrackList');
  if (!list) return;
  list.innerHTML = AMBIANCE_TRACKS.map(t => `
    <div class="ap-track ${_ambiTrackId === t.id ? 'playing' : ''}" onclick="playAmbiance('${t.id}')">
      <div class="ap-track-icon">${t.icon}</div>
      <div class="ap-track-name">${t.name}</div>
      <div class="ap-track-state">${_ambiTrackId === t.id ? '▶ Çalıyor' : '◼ Durduruldu'}</div>
    </div>`).join('');
}

function playAmbiance(id) {
  const track = AMBIANCE_TRACKS.find(t => t.id === id);
  if (!track) return;

  // Aynı track'e tıklanırsa durdur
  if (_ambiTrackId === id && _ambiAudio && !_ambiAudio.paused) {
    _ambiAudio.pause();
    _ambiTrackId = null;
    renderAmbianceTracks();
    return;
  }

  if (_ambiAudio) { _ambiAudio.pause(); _ambiAudio = null; }
  _ambiTrackId = id;

  _ambiAudio = new Audio(track.url);
  _ambiAudio.loop = true;
  _ambiAudio.volume = _ambiVol;
  _ambiAudio.play().catch(() => {
    const fn = window.showToast || ((m) => console.warn(m));
    fn('🎵 Ses yüklenemedi, bağlantıyı kontrol et.');
    _ambiTrackId = null;
  });
  renderAmbianceTracks();
}

function stopAmbiance() {
  if (_ambiAudio) { _ambiAudio.pause(); _ambiAudio = null; }
  _ambiTrackId = null;
  renderAmbianceTracks();
}

function setAmbianceVolume(val) {
  _ambiVol = val / 100;
  if (_ambiAudio) _ambiAudio.volume = _ambiVol;
  const num = document.getElementById('apVolNum');
  if (num) num.textContent = val + '%';
  const slider = document.getElementById('apVolSlider');
  if (slider) slider.style.setProperty('--pct', val + '%');
}

function openAmbiancePanel() {
  renderAmbianceTracks();
  // Slider değerini güncelle
  const slider = document.getElementById('apVolSlider');
  if (slider) {
    slider.value = Math.round(_ambiVol * 100);
    slider.style.setProperty('--pct', Math.round(_ambiVol * 100) + '%');
  }
  const num = document.getElementById('apVolNum');
  if (num) num.textContent = Math.round(_ambiVol * 100) + '%';
  document.getElementById('ambiancePanelOverlay').classList.add('open');
}
function closeAmbiancePanel() {
  document.getElementById('ambiancePanelOverlay').classList.remove('open');
}

window.openAmbiancePanel = openAmbiancePanel;
window.closeAmbiancePanel = closeAmbiancePanel;
window.playAmbiance = playAmbiance;
window.stopAmbiance = stopAmbiance;
window.setAmbianceVolume = setAmbianceVolume;


/* ── Eksik fonksiyon stub'ları ── */

window.openBotPersonality = function() {
  if (typeof showToast === 'function') showToast('🤖 Bot Kişiliği yakında gelecek!');
};
window.openTimeCapsule = function() {
  if (typeof showToast === 'function') showToast('🧬 Zaman Kapsülü yakında gelecek!');
};


/* ─────────────────────────────── */


function openProfileDrawer() {
  switchMainTab('profile');
}
function closeProfileDrawer() {
  document.getElementById('profileDrawer').classList.remove('open');
  document.getElementById('profileDrawerOverlay').classList.remove('open');
}
window.openProfileDrawer = openProfileDrawer;
window.closeProfileDrawer = closeProfileDrawer;

// Mobil avatar tıklamasını drawer'a bağla (varsa)
document.addEventListener('DOMContentLoaded', () => {
  const mobileAv = document.getElementById('myAvatar');
  if (mobileAv) {
    mobileAv.onclick = null;
    mobileAv.addEventListener('click', openProfile);
  }
  // Desktop sidebar avatar
  const deskAv = document.getElementById('deskSidebarAvatar');
  if (deskAv) {
    deskAv.onclick = null;
    deskAv.addEventListener('click', openProfile);
  }
  // Rail user
  const railUser = document.getElementById('deskRailUser');
  if (railUser) {
    railUser.onclick = null;
    railUser.addEventListener('click', openProfile);
  }
});


/* ── iOS Widget Paneli ── */

// _wpOpen moved to config.js
function toggleWidgetsPanel() {
  _wpOpen = !_wpOpen;
  document.getElementById('widgetsPanel').classList.toggle('open', _wpOpen);
  updateWidgetData();
}
function updateWidgetData() {
  // Saat
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const el = document.getElementById('wpClock');
  if (el) el.textContent = h + ':' + m;
  const DAYS = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const de = document.getElementById('wpDate');
  if (de) de.textContent = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  // Online sayısı — varolan değişkenden al
  const online = typeof _onlineCount !== 'undefined' ? _onlineCount :
                 (typeof _allOnline !== 'undefined' ? _allOnline : null);
  const oe = document.getElementById('wpOnlineCount');
  if (oe && online !== null) oe.textContent = online.toLocaleString('tr-TR');
  const ob = document.getElementById('wpOnlineBar');
  if (ob && online !== null) ob.style.width = Math.min(100, (online / 5000) * 100) + '%';
}
// Saat her dakika güncelle
setInterval(() => {
  if (_wpOpen) updateWidgetData();
  // Clock always update even if closed for when it opens
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const el = document.getElementById('wpClock');
  if (el && _wpOpen) el.textContent = h + ':' + m;
}, 30000);
// Hava durumu bot komutunu dinle — /hava sonucunu widget'a yansıt
const _origShowBotMsg = window.showBotMsg;
window.showBotMsg = function(msg) {
  if (_origShowBotMsg) _origShowBotMsg(msg);
  // Hava regex: "İstanbul: 23°C, Güneşli" pattern
  const m = msg && msg.match(/(\d+)°C.*?(\d+)%.*?(\d+)\s*km/i);
  if (m) {
    const t = document.getElementById('wpTemp'); if(t) t.textContent = m[1]+'°C';
    const d = document.getElementById('wpWeatherDesc'); if(d) d.textContent = msg.split('\n')[0] || '';
    const h = document.getElementById('wpHumidity'); if(h) h.textContent = '💧 '+m[2]+'%';
    const w = document.getElementById('wpWind'); if(w) w.textContent = '💨 '+m[3]+' km/s';
  }
};
window.toggleWidgetsPanel = toggleWidgetsPanel;

/* ══════════════════════════════════════════════════════════
   🎙️ SES KAYDI (Voice Message)
   ══════════════════════════════════════════════════════════ */
_mediaRec = null; _recChunks = []; _recStream = null; _recInterval = null;

function fmtDuration(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return m+':'+(s<10?'0':'')+s;
}

async function startVoiceRecord() {
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('❌ Ses kaydı bu tarayıcıda desteklenmiyor');
    return;
  }
  try {
    _recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _recChunks = [];
    _mediaRec = new MediaRecorder(_recStream);
    _mediaRec.ondataavailable = e => { if(e.data.size>0) _recChunks.push(e.data); };
    _mediaRec.onstop = () => {
      const blob = new Blob(_recChunks, { type:'audio/webm' });
      const url = URL.createObjectURL(blob);
      sendVoiceMsg(blob, url);
      _recStream.getTracks().forEach(t=>t.stop());
    };
    _mediaRec.start();
    let sec = 0;
    const timer = document.getElementById('recTimer');
    if(timer) { timer.style.display='inline'; timer.textContent='0:00'; }
    const btn = document.getElementById('voiceRecBtn');
    if(btn) btn.style.color='var(--red)';
    _recInterval = setInterval(() => {
      sec++;
      if(timer) timer.textContent = fmtDuration(sec);
      if(sec >= 120) stopVoiceRecord(); // max 2 dk
    }, 1000);
  } catch(e) {
    showToast('❌ Mikrofon erişimi reddedildi');
  }
}

function stopVoiceRecord() {
  if(_mediaRec && _mediaRec.state !== 'inactive') _mediaRec.stop();
  clearInterval(_recInterval);
  const timer = document.getElementById('recTimer');
  if(timer) timer.style.display='none';
  const btn = document.getElementById('voiceRecBtn');
  if(btn) btn.style.color='';
}

function toggleVoiceRecord() {
  if(_mediaRec && _mediaRec.state === 'recording') {
    stopVoiceRecord();
  } else {
    startVoiceRecord();
  }
}

async function sendVoiceMsg(blob, url) {
  if(!_cRoom || !_cu) return;
  // Ses dosyasını base64'e çevir (Firebase'e küçük ses için)
  const reader = new FileReader();
  reader.onload = async () => {
    const b64 = reader.result;
    const msgRef = dbRef('msgs/'+_cRoom).push();
    await msgRef.set({
      user: _cu, ts: Date.now(), type:'voice',
      audioData: b64, duration: Math.round(blob.size/8000)
    });
  };
  reader.readAsDataURL(blob);
}

function playVoiceMsg(b64, btnEl) {
  try {
    const audio = new Audio(b64);
    if(btnEl) btnEl.textContent = '⏸';
    audio.play();
    audio.onended = () => { if(btnEl) btnEl.textContent = '▶'; };
  } catch(e) { showToast('Ses oynatılamadı'); }
}

/* ══════════════════════════════════════════════════════════
   📞 SESLI ARAMA (WebRTC)
   ══════════════════════════════════════════════════════════ */
_callId = null; _callType = null; _callTimer = null; _callSec = 0;
_localStream = null; _peers = {}; _callMin = false;

async function startCall(type) {
  if(!_cu || !_cRoom) { showToast('Önce bir odaya gir'); return; }
  if(_callId) { showToast('Zaten aktif bir arama var'); return; }
  // iOS/HTTP'de mediaDevices yok
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('❌ Tarayıcınız ses/video aramayı desteklemiyor. HTTPS gereklidir.');
    return;
  }
  _callType = type;
  _callId = _cRoom + '_' + Date.now();
  _groupCallId = _callId;
  try {
    const constraints = type === 'video'
      ? { audio: true, video: true }
      : type === 'audio'
      ? { audio: true, video: false }
      : { audio: true, video: false }; // screen share: audio only from mic
    _localStream = await navigator.mediaDevices.getUserMedia(constraints);
    if(type === 'screen') {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.getTracks().forEach(t => _localStream.addTrack(t));
      } catch(e) { /* screen share cancelled */ }
    }
    await dbRef('calls/'+_callId).set({
      host: _cu, type, status:'ringing', ts: Date.now(), room: _cRoom
    });
    await dbRef('calls/'+_callId+'/parts/'+_cu).set({ active:true, ts:Date.now() });
    showCallScreen(type);
    _listenParticipants && _listenParticipants();
    // Arama reddedilirse veya sona ererse ring'i durdur
    dbRef('calls/'+_callId+'/status').on('value', snap => {
      if(snap.val() === 'ended') endCall();
    });
    dbRef('calls/'+_callId+'/rejected').on('child_added', () => {
      stopRingSound && stopRingSound();
      const statusEl = document.getElementById('callStatus');
      if(statusEl) statusEl.textContent = 'Reddedildi';
      setTimeout(() => endCall(), 1500);
    });
    // Oda üyelerine davet bildirimi
    inviteToCall(_callId, type);
  } catch(e) {
    const msg = e.name === 'NotAllowedError' ? '❌ Mikrofon/kamera izni reddedildi' :
                e.name === 'NotFoundError'   ? '❌ Mikrofon/kamera bulunamadı' :
                '❌ Medya erişimi hatası: ' + (e.message||'');
    showToast(msg);
    _callId = null;
    _groupCallId = null;
    _callType = null;
  }
}

function inviteToCall(callId, type) {
  const room = _cRoom || _deskRoom;
  if(!room || !_cu) return;
  dbRef('rooms/'+room).once('value').then(snap=>{
    const roomData = snap.val() || {};
    const raw = roomData.members;
    // members array veya object olabilir
    let members = [];
    if(Array.isArray(raw)) members = raw;
    else if(raw && typeof raw === 'object') members = Object.keys(raw);
    members.filter(u => u !== _cu).forEach(user => {
      dbRef('callInvites/'+user).push({
        callId, type, from:_cu, room, ts:Date.now()
      });
    });
  });
}

async function acceptCall(callId, type) {
  stopRingSound && stopRingSound();
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('❌ Tarayıcınız aramayı desteklemiyor (HTTPS gerekli)');
    return;
  }
  _callId = callId;
  _groupCallId = callId;
  _callType = type;
  try {
    _localStream = await navigator.mediaDevices.getUserMedia(
      type==='video' ? {audio:true,video:true} : {audio:true,video:false}
    );
    await dbRef('calls/'+callId+'/parts/'+_cu).set({active:true,ts:Date.now()});
    showCallScreen(type);
    _listenParticipants && _listenParticipants();
  } catch(e) {
    const msg = e.name === 'NotAllowedError' ? '❌ Mikrofon izni reddedildi' :
                e.name === 'NotFoundError'   ? '❌ Mikrofon bulunamadı' :
                '❌ Arama başlatılamadı: ' + (e.message||'');
    showToast(msg);
    _callId = null;
    _groupCallId = null;
    _callType = null;
  }
}

function rejectCall(callId) {
  stopRingSound && stopRingSound();
  dbRef('callInvites/'+_cu).orderByChild('callId').equalTo(callId).once('value', snap => {
    snap.forEach(child => child.ref.remove());
  });
  // Reddettiğimizi karşı tarafa bildir
  dbRef('calls/'+callId+'/rejected/'+_cu).set(true);
  showToast('📞 Arama reddedildi');
}

function showCallScreen(type) {
  const el = document.getElementById('callScreen');
  if(!el) return;
  el.style.display = 'flex';

  // Katılımcı adını göster — DM'de karşı tarafın adı, grupta oda adı
  const nameEl = document.getElementById('callName');
  const avatarEl = document.getElementById('callAvatar');
  if(nameEl) {
    const room = _cRoom || _deskRoom;
    if(room) {
      dbRef('rooms/'+room).once('value').then(snap => {
        const r = snap.val();
        if(!r) return;
        if(r.type === 'dm') {
          const other = (r.members||[]).find(m => m !== _cu) || room;
          nameEl.textContent = other;
          if(avatarEl) { avatarEl.textContent = initials(other); avatarEl.style.background = strColor(other); }
        } else {
          nameEl.textContent = r.name || room;
          if(avatarEl) { avatarEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3h-2"/></svg>'; avatarEl.style.cssText = 'background:linear-gradient(135deg,#9b72ff,#c4a7ff);display:flex;align-items:center;justify-content:center;'; }
        }
      });
    } else {
      nameEl.textContent = 'Arama';
    }
  }

  const typeEl = document.getElementById('callScreenType');
  if(typeEl) typeEl.textContent = type === 'video' ? '📹 Görüntülü' : type === 'screen' ? '🖥️ Ekran Paylaşımı' : '📞 Sesli Arama';
  startCallTimer();
  if(type === 'video' && _localStream) {
    const vid = document.getElementById('localVideo');
    if(vid) { vid.srcObject = _localStream; vid.play().catch(()=>{}); }
  }
}

function _updateCallQuality(level) {
  const qi = document.getElementById('callQualityIndicator');
  if(!qi) return;
  qi.style.display = 'flex';
  const colors = { good:'#2ecc71', poor:'#f5a623', bad:'#e74c3c', connecting:'rgba(255,255,255,.3)' };
  const bars = { good:3, poor:2, bad:1, connecting:0 };
  const col = colors[level] || colors.connecting;
  const filled = bars[level] ?? 0;
  for(let i=1;i<=4;i++){
    const el = document.getElementById('cqi'+i);
    if(el) el.style.background = i <= filled ? col : 'rgba(255,255,255,.18)';
  }
  const st = document.getElementById('callStatus');
  if(st && level !== 'good') {
    const labels = { poor:'Bağlantı zayıf...', bad:'Bağlantı kesildi', connecting:'Bağlanıyor...' };
    if(labels[level]) st.textContent = labels[level];
  }
}

function startCallTimer() {
  _callSec = 0;
  clearInterval(_callTimer);
  _callTimer = setInterval(() => {
    _callSec++;
    const elapsed = fmtDuration(_callSec);
    const el = document.getElementById('callTimerDisplay');
    if(el) { el.textContent = elapsed; el.style.display = 'block'; }
    const minStatus = document.getElementById('callMinBar_status');
    if(minStatus) minStatus.textContent = elapsed;
  }, 1000);
}

function endCall() {
  stopRingSound && stopRingSound();
  clearInterval(_callTimer); _callTimer = null;
  // Firebase temizle
  if(_callId) {
    dbRef('calls/'+_callId+'/parts/'+_cu).remove();
    dbRef('calls/'+_callId+'/status').set('ended');
  }
  // Stream kapat
  if(_localStream) { _localStream.getTracks().forEach(t=>t.stop()); _localStream=null; }
  // Peer bağlantıları kapat
  Object.values(_peers||{}).forEach(pc => { try{pc.close();}catch(e){} });
  _peers = {};
  // Listener'ları temizle
  if(typeof _callStopListeners !== 'undefined') {
    _callStopListeners.forEach(fn => { try{fn();}catch(e){} });
    _callStopListeners = [];
  }
  // Remote ses elementlerini temizle
  document.querySelectorAll('[id^="_rAudio_"]').forEach(el => el.remove());
  // Remote stream'leri temizle
  if(typeof _remoteStreams !== 'undefined') _remoteStreams = {};
  // ID'leri sıfırla
  _callId = null;
  _groupCallId = null;
  _callType = null;
  // Ekranı gizle
  const el = document.getElementById('callScreen');
  if(el) el.style.display = 'none';
  const bar = document.getElementById('callMinimizedBar');
  if(bar) bar.style.display = 'none';
  const pill = document.getElementById('callPill');
  if(pill) pill.remove();
  // Video alanlarını sıfırla
  const remoteVideo = document.getElementById('remoteVideo');
  if(remoteVideo) { remoteVideo.srcObject = null; }
  const localVideo = document.getElementById('localVideo');
  if(localVideo) { localVideo.srcObject = null; }
  const videoArea = document.getElementById('callVideoArea');
  const audioArea = document.getElementById('callAudioArea');
  if(videoArea) videoArea.style.display = 'none';
  if(audioArea) audioArea.style.display = 'flex';
  showToast('📞 Arama sonlandırıldı');
}

function minimizeCallScreen() {
  _callMin = true;
  const el = document.getElementById('callScreen');
  if(el) { el.style.display='none'; }
  // callMinimizedBar göster
  const bar = document.getElementById('callMinimizedBar');
  if(bar) {
    const room = _cRoom || _deskRoom;
    const nameEl = document.getElementById('callMinBar_name');
    if(nameEl && room) {
      dbRef('rooms/'+room).once('value').then(snap => {
        const r = snap.val();
        if(!r) return;
        nameEl.textContent = r.type === 'dm'
          ? (r.members||[]).find(m => m !== _cu) || room
          : (r.name || room);
      });
    }
    bar.style.display = 'flex';
  }
}
function maximizeCallScreen() {
  _callMin = false;
  const el = document.getElementById('callScreen');
  if(el) { el.style.display='flex'; }
  const bar = document.getElementById('callMinimizedBar');
  if(bar) bar.style.display = 'none';
  const pill = document.getElementById('callPill');
  if(pill) pill.style.display = 'none';
}


function toggleMute() {
  if(!_localStream) return;
  const audioTrack = _localStream.getAudioTracks()[0];
  if(audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    const btn = document.getElementById('callMuteBtn');
    if(btn) btn.textContent = audioTrack.enabled ? '🎙️' : '🔇';
  }
}
function toggleCamera() {
  if(!_localStream) return;
  const videoTrack = _localStream.getVideoTracks()[0];
  if(videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    const btn = document.getElementById('callCamBtn');
    if(btn) btn.textContent = videoTrack.enabled ? '📹' : '📵';
  }
}

function openCallInviteDialog() {
  if(!_callId && !_groupCallId) { showToast('Aktif arama yok'); return; }
  const callId = _callId || _groupCallId;
  // Oda üyelerini getir ve davet et
  const room = _cRoom || _deskRoom;
  if(!room) return;
  dbRef('rooms/'+room+'/members').once('value').then(snap => {
    const members = snap.val() || {};
    const others = Object.keys(members).filter(u => u !== _cu && !_peers[u]);
    if(others.length === 0) { showToast('Eklenecek başka üye yok'); return; }
    others.forEach(user => {
      dbRef('callInvites/'+user).push({
        callId, type: _callType || 'audio', from: _cu, room, ts: Date.now()
      });
    });
    showToast('✅ ' + others.length + ' kişi davet edildi');
  });
}

// Gelen arama dinle (login sonrası çağrılır)
function listenIncomingCalls() {
  if(!_cu || !_db) return;
  dbRef('callInvites/'+_cu).on('child_added', snap => {
    const inv = snap.val();
    if(!inv) return;
    snap.ref.remove();

    // incomingCallScreen banner'ı doldur ve göster
    const banner = document.getElementById('incomingCallScreen');
    if(banner) {
      const av = document.getElementById('incomingCallAv');
      const nm = document.getElementById('incomingCallName');
      const tp = document.getElementById('incomingCallType');
      if(av) { av.textContent = initials(inv.from); av.style.background = strColor(inv.from); }
      if(nm) nm.textContent = inv.from;
      if(tp) {
        const vidSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
        const phSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
        tp.innerHTML = (inv.type === 'video' ? vidSvg + ' Görüntülü Arama' : phSvg + ' Sesli Arama');
        tp.style.cssText = 'display:flex;align-items:center;gap:6px;';
      }
      // Butonlara doğru callId bağla
      const rejectBtn = banner.querySelector('.inc-reject');
      const acceptBtn = banner.querySelector('.inc-accept');
      if(rejectBtn) rejectBtn.onclick = function() {
        rejectCall(inv.callId);
        banner.style.display = 'none';
      };
      if(acceptBtn) acceptBtn.onclick = function() {
        stopRingSound && stopRingSound();
        acceptCall(inv.callId, inv.type);
        banner.style.display = 'none';
      };
      banner.style.display = 'flex';
      setTimeout(() => { if(banner.style.display !== 'none') banner.style.display = 'none'; }, 30000);
    }

    playRingSound && playRingSound();
  });
}

/* ══════════════════════════════════════════════════════════
   🎨 UIKit (Simge Galerisi)
   ══════════════════════════════════════════════════════════ */
function openUIKit() {
  const el = document.getElementById('uiKitModal');
  if(!el) return;
  el.style.display = 'block';
  const content = document.getElementById('uiKitContent');
  if(!content) return;
  const icons = [
    {icon:'🏠',name:'Ana Sayfa'}, {icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,name:'Mesaj'}, {icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3h-2"/></svg>`,name:'Arkadaşlar'},
    {icon:'📰',name:'Forum'}, {icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,name:'Bildirim'}, {icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,name:'Ayarlar'},
    {icon:'🌿',name:'Doğa'}, {icon:'📊',name:'İstatistik'}, {icon:'🎵',name:'Müzik'},
    {icon:'📸',name:'Galeri'}, {icon:'🗺️',name:'Harita'}, {icon:'🤖',name:'Bot'},
    {icon:'🌙',name:'Gece'}, {icon:'☀️',name:'Gündüz'}, {icon:'🔒',name:'Güvenlik'},
    {icon:'📎',name:'Dosya'}, {icon:'🎮',name:'Oyun'}, {icon:'📺',name:'İzle'},
    {icon:'🌍',name:'Dünya'}, {icon:'💡',name:'Fikir'}, {icon:'🎯',name:'Hedef'},
    {icon:'📅',name:'Takvim'}, {icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,name:'Ara'}, {icon:'❤️',name:'Favori'},
  ];
  content.innerHTML = icons.map(({icon,name}) =>
    `<div onclick="insertEmoji('${icon}');closeUIKit();" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:10px;cursor:pointer;background:var(--surface);border:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='var(--surface)'">
      <span style="font-size:1.5rem;">${icon}</span>
      <span style="font-size:.6rem;color:var(--muted);white-space:nowrap;">${name}</span>
    </div>`
  ).join('');
}
function closeUIKit() {
  const el = document.getElementById('uiKitModal');
  if(el) el.style.display = 'none';
}

/* ══════════════════════════════════════
   🔧 MOBİL EKSİK FONKSİYON YAMALARI
   ══════════════════════════════════════ */

// logout alias (doLogout'un kısayolu)
function logout() { if(typeof doLogout === 'function') doLogout(); }

// Türk alıntı sistemi
function closeTurkQuote() {
  var el = document.getElementById('turkQuoteOverlay');
  if(el) el.style.display = 'none';
  if(window._turkQuoteTimer) { clearTimeout(window._turkQuoteTimer); window._turkQuoteTimer = null; }
}

// Özel tema
function applyCustomTheme() {
  var accent  = document.getElementById('ct-accent')  ? document.getElementById('ct-accent').value  : null;
  var bg      = document.getElementById('ct-bg')      ? document.getElementById('ct-bg').value      : null;
  var surface = document.getElementById('ct-surface') ? document.getElementById('ct-surface').value : null;
  var own     = document.getElementById('ct-own')     ? document.getElementById('ct-own').value     : null;
  var root = document.documentElement;
  if(accent)  { root.style.setProperty('--accent', accent); root.style.setProperty('--blue', accent); }
  if(bg)      { root.style.setProperty('--bg', bg); root.style.setProperty('--bg2', bg); }
  if(surface) { root.style.setProperty('--surface', surface); root.style.setProperty('--surface2', surface); }
  if(own)     { root.style.setProperty('--own-bg', own); }
  try { localStorage.setItem('nature_custom_theme', JSON.stringify({accent,bg,surface,own})); } catch(e){}
  showToast('🎨 Tema uygulandı');
}

function resetCustomTheme() {
  var root = document.documentElement;
  ['--accent','--blue','--bg','--bg2','--surface','--surface2','--own-bg'].forEach(function(v){ root.style.removeProperty(v); });
  try { localStorage.removeItem('nature_custom_theme'); } catch(e){}
  showToast('🎨 Tema sıfırlandı');
}

// Uygulama başlangıcında kayıtlı tema uygula
(function _restoreCustomTheme(){
  try {
    var saved = localStorage.getItem('nature_custom_theme');
    if(!saved) return;
    var t = JSON.parse(saved);
    var root = document.documentElement;
    if(t.accent)  { root.style.setProperty('--accent', t.accent); root.style.setProperty('--blue', t.accent); }
    if(t.bg)      { root.style.setProperty('--bg', t.bg); root.style.setProperty('--bg2', t.bg); }
    if(t.surface) { root.style.setProperty('--surface', t.surface); root.style.setProperty('--surface2', t.surface); }
    if(t.own)     { root.style.setProperty('--own-bg', t.own); }
  } catch(e){}
})();

// Ekran paylaşımı toggle
async function toggleScreenShare() {
  if(!_isSharingScreen) {
    try {
      var screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      _screenStream = screenStream;
      _isSharingScreen = true;
      // Mevcut peer bağlantılarına video track ekle
      var videoTrack = screenStream.getVideoTracks()[0];
      Object.values(_peers || {}).forEach(function(pc) {
        var sender = pc.getSenders ? pc.getSenders().find(function(s){ return s.track && s.track.kind === 'video'; }) : null;
        if(sender) sender.replaceTrack(videoTrack).catch(function(){});
      });
      var badge = document.getElementById('callScreenBadge');
      if(badge) badge.style.display = 'block';
      var btn = document.getElementById('callShareScreenBtn');
      if(btn) btn.classList.add('active');
      screenStream.getVideoTracks()[0].addEventListener('ended', function(){ toggleScreenShare(); });
      showToast('🖥️ Ekran paylaşımı başladı');
    } catch(e) {
      if(e.name !== 'NotAllowedError') showToast('❌ Ekran paylaşımı başlatılamadı');
    }
  } else {
    if(_screenStream) { _screenStream.getTracks().forEach(function(t){ t.stop(); }); _screenStream = null; }
    _isSharingScreen = false;
    // Kameraya geri dön
    if(_localStream) {
      var camTrack = _localStream.getVideoTracks()[0];
      Object.values(_peers || {}).forEach(function(pc) {
        var sender = pc.getSenders ? pc.getSenders().find(function(s){ return s.track && s.track.kind === 'video'; }) : null;
        if(sender && camTrack) sender.replaceTrack(camTrack).catch(function(){});
      });
    }
    var badge = document.getElementById('callScreenBadge');
    if(badge) badge.style.display = 'none';
    var btn = document.getElementById('callShareScreenBtn');
    if(btn) btn.classList.remove('active');
    showToast('🖥️ Ekran paylaşımı durduruldu');
  }
}

// Hoparlör toggle (iOS için)
function toggleSpeaker() {
  _isSpeakerMuted = !_isSpeakerMuted;
  // Tüm remote ses elementlerini mute/unmute
  document.querySelectorAll('[id^="_rAudio_"]').forEach(function(a) {
    a.muted = _isSpeakerMuted;
  });
  var btn = document.getElementById('callSpeakerBtn');
  if(btn) btn.classList.toggle('active', _isSpeakerMuted);
  showToast(_isSpeakerMuted ? '🔇 Hoparlör kapalı' : '🔊 Hoparlör açık');
}

// toggleMute için SVG güncellemesi (emoji yerine)
var _origToggleMute = toggleMute;
toggleMute = function() {
  if(!_localStream) return;
  var audioTrack = _localStream.getAudioTracks()[0];
  if(!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
  _isMuted = !audioTrack.enabled;
  var btn = document.getElementById('callMuteBtn');
  if(btn) btn.classList.toggle('active', _isMuted);
  showToast(_isMuted ? '🔇 Mikrofon kapalı' : '🎙️ Mikrofon açık');
};

// toggleCamera için düzeltme
var _origToggleCamera = toggleCamera;
toggleCamera = function() {
  if(!_localStream) return;
  var videoTrack = _localStream.getVideoTracks()[0];
  if(!videoTrack) return;
  videoTrack.enabled = !videoTrack.enabled;
  _isCameraOn = videoTrack.enabled;
  var btn = document.getElementById('callCamBtn');
  if(btn) btn.classList.toggle('active', !_isCameraOn);
  showToast(_isCameraOn ? '📹 Kamera açık' : '📵 Kamera kapalı');
};

