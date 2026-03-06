/* Nature.co — bot.js */
/* Otomatik bölümlendi */

/* ── Nature Bot (Slash Komutları) ── */

function checkBotCommand(text){
  if(!text.startsWith('/')) return false;
  const parts=text.trim().split(' ');
  const cmd=parts[0].toLowerCase();
  const args=parts.slice(1).join(' ');
  const botCmds={
    '/yardım':()=>showBotMsg('🤖 Kullanılabilir komutlar: /hava [şehir] /saat /flip /zar /rng /anket'),
    '/saat':()=>showBotMsg('🕐 Şu an: '+new Date().toLocaleTimeString('tr-TR')),
    '/tarih':()=>showBotMsg('📅 Bugün: '+new Date().toLocaleDateString('tr-TR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})),
    '/flip':()=>showBotMsg('🪙 '+(Math.random()<.5?'YAZI ✅':'TURA ✅')),
    '/zar':()=>showBotMsg('🎲 Zar: '+Math.ceil(Math.random()*6)),
    '/rng':()=>{const n=parseInt(args)||100;showBotMsg('🎯 1-'+n+' arası: '+Math.ceil(Math.random()*n));},
    '/hava':()=>{
      if(!args){showBotMsg('📍 Kullanım: /hava [şehir]');return;}
      showBotMsg('⏳ '+args+' için hava durumu alınıyor...');
      fetch('https://wttr.in/'+encodeURIComponent(args)+'?format=3&lang=tr')
        .then(r=>r.text()).then(t=>showBotMsg('🌤️ '+t.trim()))
        .catch(()=>showBotMsg('❌ Hava durumu alınamadı.'));
    },
    '/anket':()=>{
      if(!args){showBotMsg('📊 Kullanım: /anket [soru]');return;}
      const pollModal=document.getElementById('createPollModal');
      const pollQ=document.getElementById('pollQuestion');
      if(pollModal&&pollQ){pollQ.value=args;pollModal.style.display='flex';}
      else showBotMsg('📊 Anket oluşturucu açılamadı.');
    }
  };
  const fn=botCmds[cmd];
  if(fn){fn();return true;}
  // Bilinmeyen komut
  showBotMsg('❓ Bilinmeyen komut: '+cmd+'. Yardım için /yardım yazın.');
  return true;
}
function showBotMsg(text){
  // Sisteme mesaj olarak göster (local, Firebase'e göndermez)
  const box=document.getElementById('chatMsgs');
  if(!box) return;
  const div=document.createElement('div');
  div.className='msg-sys';
  div.style.cssText='background:rgba(91,155,213,.08);border:1px solid rgba(91,155,213,.15);border-radius:10px;padding:8px 12px;margin:6px 12px;font-size:.82rem;white-space:pre-wrap;';
  div.innerHTML='<span style="color:var(--accent);font-weight:700;">🤖 NatureBot</span><br>'+text.replace(/</g,'&lt;');
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}


/* ── Slash Komut Öneri Kutusu ── */

let _slashSuggestions=false;
function checkSlashInput(val){
  const box=document.getElementById('slashSuggestBox');
  if(!val.startsWith('/')||val.includes(' ')){
    if(box) box.style.display='none';
    return;
  }
  const cmds=[
    {cmd:'/yardım',desc:'Yardım menüsü'},
    {cmd:'/hava',desc:'Hava durumu — /hava Istanbul'},
    {cmd:'/saat',desc:'Şu anki saat'},
    {cmd:'/tarih',desc:'Bugünün tarihi'},
    {cmd:'/flip',desc:'Yazı/Tura'},
    {cmd:'/zar',desc:'Rastgele zar'},
    {cmd:'/rng',desc:'Rastgele sayı — /rng 100'},
    {cmd:'/anket',desc:'Anket oluştur'},
  ];
  const filtered=cmds.filter(c=>c.cmd.startsWith(val.toLowerCase()));
  if(!filtered.length){if(box) box.style.display='none';return;}
  let suggestBox=box;
  if(!suggestBox){
    suggestBox=document.createElement('div');
    suggestBox.id='slashSuggestBox';
    suggestBox.style.cssText='position:absolute;bottom:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border);border-radius:12px 12px 0 0;overflow:hidden;z-index:500;margin-bottom:1px;max-height:200px;overflow-y:auto;';
    const inpWrap=document.getElementById('chatInputRow')||document.querySelector('.inp-wrap');
    if(inpWrap){inpWrap.style.position='relative';inpWrap.appendChild(suggestBox);}
    else return;
  }
  suggestBox.style.display='block';
  suggestBox.innerHTML=filtered.map(c=>`
    <div onclick="fillSlashCmd('${c.cmd}')" style="display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;transition:background .1s;border-bottom:1px solid var(--border);" onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background=''">
      <span style="font-size:.8rem;font-weight:700;color:var(--accent);">${c.cmd}</span>
      <span style="font-size:.75rem;color:var(--muted);">${c.desc}</span>
    </div>`).join('');
}
function fillSlashCmd(cmd){
  const inp=document.getElementById('msgInp')||document.getElementById('deskInp');
  if(inp){inp.value=cmd+' ';inp.focus();}
  const box=document.getElementById('slashSuggestBox');
  if(box) box.style.display='none';
}


/* ── Sayfa yüklenince başlat ── */

setTimeout(()=>{
  loadNotifs();
  loadFontSize();
  loadCompactMode();
  // Slash komut dinleyici
  ['msgInp','deskInp'].forEach(id=>{
    const inp=document.getElementById(id);
    if(inp) inp.addEventListener('input',e=>checkSlashInput(e.target.value));
  });
},500);

// Hook into login success



/* ── Bot CSS Enjeksiyonu ── */
(function injectBotCSS(){
  const s = document.createElement('style');
  s.textContent = `
/* ── Gövde yüzen hareket ── */

#natureBotPet .bot-body-group {
  animation: botHover 3.2s ease-in-out infinite;
  transform-origin: 32px 40px;
}
@keyframes botHover {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}
#natureBotPet.talking .bot-body-group {
  animation: botTalk 0.35s ease-in-out infinite alternate;
}
@keyframes botTalk {
  from { transform: translateY(0px) scale(1); }
  to   { transform: translateY(-3px) scale(1.03); }
}
#natureBotPet.at-home .bot-body-group {
  animation: botHoverSlow 5s ease-in-out infinite;
}
@keyframes botHoverSlow {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
}
#natureBotPet.calling .bot-body-group {
  animation: botPulse .55s ease-in-out infinite alternate;
}
@keyframes botPulse {
  from { transform: scale(1); }
  to   { transform: scale(1.09); }
}


/* ── Sol kol sallama ── */

#natureBotPet .bot-arm-left {
  transform-origin: 2px 40px;
  animation: armSwingLeft 1.6s ease-in-out infinite;
}
@keyframes armSwingLeft {
  0%,100% { transform: rotate(0deg); }
  30% { transform: rotate(-22deg); }
  60% { transform: rotate(8deg); }
}


/* ── Sağ kol sallama ── */

#natureBotPet .bot-arm-right {
  transform-origin: 62px 40px;
  animation: armSwingRight 1.6s ease-in-out infinite;
  animation-delay: -0.8s;
}
@keyframes armSwingRight {
  0%,100% { transform: rotate(0deg); }
  30% { transform: rotate(22deg); }
  60% { transform: rotate(-8deg); }
}


/* ── Sol bacak yürüyüş ── */

#natureBotPet .bot-leg-left {
  transform-origin: 24px 78px;
  animation: legWalkLeft 1.6s ease-in-out infinite;
}
@keyframes legWalkLeft {
  0%,100% { transform: rotate(0deg) translateY(0px); }
  25% { transform: rotate(-12deg) translateY(-2px); }
  75% { transform: rotate(10deg) translateY(1px); }
}


/* ── Sağ bacak yürüyüş ── */

#natureBotPet .bot-leg-right {
  transform-origin: 40px 78px;
  animation: legWalkRight 1.6s ease-in-out infinite;
  animation-delay: -0.8s;
}
@keyframes legWalkRight {
  0%,100% { transform: rotate(0deg) translateY(0px); }
  25% { transform: rotate(12deg) translateY(-2px); }
  75% { transform: rotate(-10deg) translateY(1px); }
}

/* Durduğunda (at-home) bacak/kol daha sakin */

/* ── UYANMA geçiş animasyonu ── */

#natureBotPet.waking {
  animation: botWakeUp 0.8s ease-out forwards;
}
@keyframes botWakeUp {
  0%  { transform: rotate(-8deg) scale(0.88); filter: brightness(.7); }
  40% { transform: rotate(5deg) scale(1.08); filter: brightness(1.2); }
  70% { transform: rotate(-3deg) scale(0.97); }
  100%{ transform: rotate(0deg) scale(1); filter: brightness(1); }
}


/* ── ZZZ Baloncukları ── */

#botZzzContainer {
  position: fixed;
  pointer-events: none;
  z-index: 9998;
  display: none;
}
#botZzzContainer.visible { display: block; }
.bot-zzz {
  position: absolute;
  font-size: .8rem;
  font-weight: 900;
  color: #a5d6a7;
  opacity: 0;
  animation: zzzFloat 2.5s ease-in-out infinite;
  text-shadow: 0 0 8px rgba(74,143,64,.5);
}
.bot-zzz:nth-child(1) { animation-delay: 0s;    font-size: .7rem; }
.bot-zzz:nth-child(2) { animation-delay: 0.8s;  font-size: .9rem; }
.bot-zzz:nth-child(3) { animation-delay: 1.6s;  font-size: 1.1rem; }
@keyframes zzzFloat {
  0%   { opacity: 0;   transform: translate(0, 0) scale(.8); }
  20%  { opacity: .9; }
  80%  { opacity: .6; }
  100% { opacity: 0;   transform: translate(-12px, -32px) scale(1.1); }
}


/* ── Göz kırpma ── */

#natureBotPet .bot-eye-glow {
  animation: eyeBlink 4s ease-in-out infinite;
}
@keyframes eyeBlink {
  0%,90%,100% { opacity:1; transform:scaleY(1); }
  95% { opacity:.1; transform:scaleY(.1); }
}
#natureBotPet.talking .bot-eye-glow {
  animation: eyeTalk 0.6s ease-in-out infinite alternate;
}
@keyframes eyeTalk {
  from { transform: scaleY(1); }
  to   { transform: scaleY(0.7) scaleX(1.1); }
}


/* ── Sohbet Balonu ── */

#natureBotBubble {
  position:fixed; z-index:9998;
  background:linear-gradient(135deg,#0e2b0c,#1a3d18);
  border:1px solid rgba(74,143,64,.4);
  border-radius:16px 16px 16px 4px;
  padding:10px 14px; max-width:240px; min-width:150px;
  font-size:.8rem; color:#c8e6c9;
  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 16px rgba(74,143,64,.15);
  opacity:0; transform:scale(.85) translateY(8px);
  transition:opacity .25s,transform .25s;
  pointer-events:none; line-height:1.5;
}
#natureBotBubble.visible { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }
.bot-bubble-name { font-size:.7rem;color:#6dbf67;font-weight:700;margin-bottom:5px;display:flex;align-items:center;gap:4px; }
.bot-bubble-msg { color:#dcedc8;line-height:1.5;white-space:pre-wrap;word-break:break-word; }
.bot-quick-cmds { display:flex;flex-wrap:wrap;gap:4px;margin-top:8px; }
.bot-qcmd { background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.4);border-radius:8px;padding:3px 8px;font-size:.72rem;color:#a5d6a7;cursor:pointer;transition:background .15s; }
.bot-qcmd:hover { background:rgba(74,143,64,.4); }
.bot-bubble-close { position:absolute;top:6px;right:8px;font-size:.75rem;color:#6dbf67;cursor:pointer;opacity:.7; }
.bot-bubble-close:hover{opacity:1}
.bot-speak-btn { display:inline-flex;align-items:center;gap:4px;margin-top:6px;background:rgba(74,143,64,.25);border:1px solid rgba(74,143,64,.4);border-radius:8px;padding:3px 8px;font-size:.72rem;color:#a5d6a7;cursor:pointer;transition:background .15s; }
.bot-speak-btn:hover{background:rgba(74,143,64,.5)}
.bot-speak-btn.speaking{background:rgba(74,143,64,.5);animation:speakBtnPulse .5s ease-in-out infinite alternate}
@keyframes speakBtnPulse{from{opacity:.8}to{opacity:1}}

@media (max-width:767px) {
  #natureBotBubble { max-width:200px; }
}
`;
  document.head.appendChild(s);
})();



/* ══ NatureBotPet Sınıfı ══ */

class NatureBotPet {
  constructor() {
    this.el = null;
    this.bubble = null;
    this.voiceWave = null;
    this.isCalling = false;
    this.isDragging = false;
    this.isTalking = false;
    this.bubbleTimeout = null;
    this.idleTimeout = null;
    this.wanderTimer = null;
    this.rafId = null;
    this.isAtHome = false;
    this.isSleeping = false;
    this.isWaking = false;
    this.homeCheckTimer = null;
    this.sleepTimer = null;
    this.kennelEl = null;
    this.zzzEl = null;
    this.lastInteractTime = Date.now();
    this.wanderStartTime = Date.now();
    // Süre ayarları (ms)
    this.WANDER_DURATION = (15 + Math.random() * 5) * 60 * 1000; // 15-20 dk
    this.SLEEP_DURATION  = 45 * 60 * 1000; // 45 dk
    this.x = 0; this.y = 0;
    this.targetX = 0; this.targetY = 0;
    this.init();
  }

  init() {
    const style = document.createElement('style');
    // misc.js'den sonra yüklenirse window.BOT_CSS hazır olur; yoksa boş geç
    style.textContent = (typeof BOT_CSS !== 'undefined' ? BOT_CSS : '') || window.BOT_CSS || '';
    document.head.appendChild(style);

    this.el = document.createElement('div');
    this.el.id = 'natureBotPet';
    this.el.innerHTML = BOT_SVG;
    document.body.appendChild(this.el);

    // Ses dalga göstergesi
    this.voiceWave = document.createElement('div');
    this.voiceWave.id = 'botVoiceWave';
    this.voiceWave.innerHTML = '<div class="bvw-bar"></div>'.repeat(5);
    document.body.appendChild(this.voiceWave);

    this.bubble = document.createElement('div');
    this.bubble.id = 'natureBotBubble';
    document.body.appendChild(this.bubble);

    if (IS_MOBILE()) {
      this.initMobile();
    } else {
      this.initDesktop();
    }

    // bindClick misc.js'den geliyor — misc.js henüz yüklenmediyse bekle
    if (typeof this.bindClick === 'function') {
      this.bindClick();
    } else {
      const _self = this;
      const _waitBind = setInterval(() => {
        if (typeof _self.bindClick === 'function') {
          clearInterval(_waitBind);
          _self.bindClick();
        }
      }, 50);
      setTimeout(() => clearInterval(_waitBind), 5000);
    }
    this.scheduleIdleMsg();
    this.hookCallScreen();

    // Sesler yüklenince yeniden kontrol
    if (window.SPEECH && window.SPEECH.supported) {
      speechSynthesis.onvoiceschanged = () => {};
      // Sesleri önceden yükle
      speechSynthesis.getVoices();
    }

    window.addEventListener('resize', () => {
      if (IS_MOBILE()) this.initMobile();
    });
  }

  initMobile() {
    // Robot'u header içindeki slota taşı
    const slot = document.getElementById('mobileRobotSlot');
    if (slot && !slot.contains(this.el)) {
      slot.appendChild(this.el);
    }
    // Mobilden bubble ve voiceWave'i gizle
    if (this.bubble) { this.bubble.style.display = 'none'; }
    if (this.voiceWave) { this.voiceWave.style.display = 'none'; }
    // Slot içinde relative konumlanır
    this.el.style.cssText = '';
    this.el.style.position = 'relative';
    this.el.style.left = 'auto';
    this.el.style.top = 'auto';
    this.el.style.right = 'auto';
    this.el.style.width = '44px';
    this.el.style.height = '54px';
    this.el.style.zIndex = '9997';
    this.el.style.cursor = 'pointer';
    this.el.style.display = 'block';
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.wanderTimer) clearTimeout(this.wanderTimer);
  }

  initDesktop() {
    const b = this.getSidebarBounds();
    this.x = b.x1 + Math.random() * Math.max(0, b.x2 - b.x1);
    this.y = b.y1 + Math.random() * Math.max(0, b.y2 - b.y1);
    this.targetX = this.x; this.targetY = this.y;
    this.el.style.position = 'fixed';
    this.el.style.left = Math.round(this.x) + 'px';
    this.el.style.top = Math.round(this.y) + 'px';
    this.el.style.right = 'auto';
    this.el.style.width = '44px';   // küçük
    this.el.style.height = '70px';
    this.el.style.zIndex = '100';   // sidebar içeriğinin üstünde ama modal altında
    this.el.style.pointerEvents = 'auto';
    this.createKennel();
    this.createZzz();
    this.startWanderDesktop();
    this.loop();
    this.startHomeCheck();
  }

  getSidebarBounds() {
    // Robot sidebar içinde gezinir: rail(68px) + sidebar(260px) = 328px
    const botW = 48, botH = 80, margin = 16;
    const kennelH = 86;  // kulübe (78px + margin)
    return {
      x1: 68 + margin,
      x2: 328 - botW - margin,
      y1: 80 + margin,
      y2: window.innerHeight - botH - kennelH - margin
    };
  }

  getKennelPos() {
    const kW = 96, kH = 78;
    return {
      x: 68 + 10,  // sola yakın
      y: window.innerHeight - kH - 14
    };
  }

  createKennel() {
    // Eski varsa kaldır
    const old = document.getElementById('botKennel');
    if (old) old.remove();

    const k = document.createElement('div');
    k.id = 'botKennel';
    k.className = 'hidden';
    const pos = this.getKennelPos();
    k.style.cssText = 'position:fixed;z-index:9995;pointer-events:auto;cursor:pointer;transition:opacity .6s;opacity:0;';
    k.style.left = pos.x + 'px';
    k.style.top  = pos.y + 'px';
    k.innerHTML = `
      <svg width="96" height="78" viewBox="0 0 120 98" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="kg1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#6dbf67" stop-opacity=".9"/>
            <stop offset="100%" stop-color="#2d5a20" stop-opacity=".2"/>
          </radialGradient>
          <radialGradient id="kg2" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stop-color="#4a8f40" stop-opacity=".6"/>
            <stop offset="100%" stop-color="#0a150a" stop-opacity="0"/>
          </radialGradient>
          <filter id="kglow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3a8a28"/>
            <stop offset="100%" stop-color="#1a4a12"/>
          </linearGradient>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#162416"/>
            <stop offset="100%" stop-color="#0a150a"/>
          </linearGradient>
          <linearGradient id="doorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0d1f0d"/>
            <stop offset="100%" stop-color="#050a05"/>
          </linearGradient>
          <linearGradient id="glowDoor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4a8f40" stop-opacity=".7"/>
            <stop offset="100%" stop-color="#6dbf67" stop-opacity=".1"/>
          </linearGradient>
        </defs>

        <!-- Zemin gölge -->
        <ellipse cx="60" cy="95" rx="50" ry="6" fill="rgba(0,0,0,.35)"/>

        <!-- ── DUVARLAR ── -->
        <rect x="12" y="46" width="96" height="49" rx="5" fill="url(#wallGrad)" stroke="#2a4a2a" stroke-width="1.5"/>

        <!-- Ahşap desen yatay çizgiler -->
        <line x1="13" y1="57" x2="107" y2="57" stroke="#1a3a1a" stroke-width=".7" opacity=".8"/>
        <line x1="13" y1="68" x2="107" y2="68" stroke="#1a3a1a" stroke-width=".7" opacity=".8"/>
        <line x1="13" y1="79" x2="107" y2="79" stroke="#1a3a1a" stroke-width=".7" opacity=".8"/>

        <!-- Devre izleri sol duvar -->
        <path d="M18 52 L18 62 L24 62 L24 74" stroke="#2d5a20" stroke-width=".8" fill="none" opacity=".6"/>
        <circle cx="18" cy="52" r="1.5" fill="#4a8f40" opacity=".8"/>
        <circle cx="24" cy="74" r="1.5" fill="#4a8f40" opacity=".8"/>
        <path d="M96 55 L96 65 L104 65" stroke="#2d5a20" stroke-width=".8" fill="none" opacity=".6"/>
        <circle cx="104" cy="65" r="1.5" fill="#4a8f40" opacity=".8"/>

        <!-- ── ÇATI ── -->
        <!-- Çatı alt yüzey -->
        <path d="M8 48 L60 6 L112 48 Z" fill="#1a4a12" stroke="#2d6a20" stroke-width="1.5"/>
        <!-- Çatı ana yüzey -->
        <path d="M8 48 L60 6 L112 48 Z" fill="url(#roofGrad)"/>
        <!-- Çatı parlak kenar -->
        <path d="M8 48 L60 6 L112 48" fill="none" stroke="#4a8f40" stroke-width="1.2" opacity=".8"/>
        <!-- Çatı çizgileri -->
        <line x1="60" y1="8" x2="60" y2="48" stroke="#2d5a20" stroke-width="1" opacity=".7"/>
        <line x1="34" y1="34" x2="86" y2="34" stroke="#2d5a20" stroke-width=".8" opacity=".6"/>
        <line x1="20" y1="44" x2="100" y2="44" stroke="#2d5a20" stroke-width=".7" opacity=".5"/>
        <!-- Çatı hexagon pattern -->
        <path d="M52 22 L56 18 L64 18 L68 22 L64 26 L56 26 Z" fill="none" stroke="#3a7a28" stroke-width=".7" opacity=".7"/>
        <path d="M38 34 L42 30 L50 30 L54 34 L50 38 L42 38 Z" fill="none" stroke="#3a7a28" stroke-width=".6" opacity=".5"/>
        <path d="M66 34 L70 30 L78 30 L82 34 L78 38 L70 38 Z" fill="none" stroke="#3a7a28" stroke-width=".6" opacity=".5"/>

        <!-- Çatı güneş paneli -->
        <rect x="44" y="20" width="32" height="14" rx="2" fill="#0a200a" stroke="#2d5a2d" stroke-width=".8" opacity=".9"/>
        <line x1="50" y1="20" x2="50" y2="34" stroke="#2d5a2d" stroke-width=".5"/>
        <line x1="57" y1="20" x2="57" y2="34" stroke="#2d5a2d" stroke-width=".5"/>
        <line x1="63" y1="20" x2="63" y2="34" stroke="#2d5a2d" stroke-width=".5"/>
        <line x1="70" y1="20" x2="70" y2="34" stroke="#2d5a2d" stroke-width=".5"/>
        <line x1="44" y1="27" x2="76" y2="27" stroke="#2d5a2d" stroke-width=".5"/>

        <!-- Anten -->
        <line x1="60" y1="6" x2="60" y2="-8" stroke="#3a7a28" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="60" cy="-10" r="4" fill="#2d5a20" stroke="#4a8f40" stroke-width="1"/>
        <circle cx="60" cy="-10" r="2" fill="#6dbf67" filter="url(#kglow)"/>

        <!-- ── TABELA ── -->
        <rect x="34" y="37" width="52" height="14" rx="4" fill="#0f2a0f" stroke="#4a8f40" stroke-width="1.2"/>
        <!-- Tabela devre izleri -->
        <line x1="36" y1="41" x2="40" y2="41" stroke="#2d5a20" stroke-width=".7"/>
        <line x1="80" y1="41" x2="84" y2="41" stroke="#2d5a20" stroke-width=".7"/>
        <circle cx="36" cy="41" r="1" fill="#4a8f40"/>
        <circle cx="84" cy="41" r="1" fill="#4a8f40"/>
        <text x="60" y="47.5" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#6dbf67" font-family="monospace" letter-spacing="0.5">NatureBot</text>

        <!-- ── PENCERELER ── -->
        <rect x="16" y="54" width="20" height="16" rx="3" fill="#071407" stroke="#2d5a2d" stroke-width="1"/>
        <rect x="17" y="55" width="8.5" height="7" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <rect x="26.5" y="55" width="8.5" height="7" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <rect x="17" y="63" width="8.5" height="6" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <rect x="26.5" y="63" width="8.5" height="6" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <!-- Sol pencere ışık -->
        <rect x="17" y="55" width="8.5" height="7" rx="1" fill="rgba(74,143,64,.08)" class="kennel-door-glow"/>

        <rect x="84" y="54" width="20" height="16" rx="3" fill="#071407" stroke="#2d5a2d" stroke-width="1"/>
        <rect x="85" y="55" width="8.5" height="7" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <rect x="94.5" y="55" width="8.5" height="7" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <rect x="85" y="63" width="8.5" height="6" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <rect x="94.5" y="63" width="8.5" height="6" rx="1" fill="#0a1f0a" stroke="#1a3a1a" stroke-width=".5"/>
        <!-- Sağ pencere ışık -->
        <rect x="85" y="55" width="8.5" height="7" rx="1" fill="rgba(74,143,64,.08)" class="kennel-door-glow"/>

        <!-- ── KAPI (Kemer) ── -->
        <path d="M44 95 L44 68 Q44 54 60 54 Q76 54 76 68 L76 95 Z" fill="url(#doorGrad)" class="kennel-door-frame"/>
        <!-- Kapı iç kemer çizgisi -->
        <path d="M47 95 L47 68.5 Q47 57.5 60 57.5 Q73 57.5 73 68.5 L73 95" fill="none" stroke="#1a3a1a" stroke-width=".8"/>
        <!-- Kapı LED şerit -->
        <path d="M44 68 Q44 54 60 54 Q76 54 76 68" fill="none" stroke="#4a8f40" stroke-width="1.2" class="kennel-door-frame"/>
        <!-- Kapı içinde uyuma ışığı -->
        <path d="M46 95 L46 68.5 Q46 56 60 56 Q74 56 74 68.5 L74 95 Z" fill="url(#glowDoor)" class="kennel-door-glow"/>

        <!-- LED noktalar üst köşeler -->
        <circle cx="14" cy="50" r="2" fill="#4a8f40" opacity=".6"/>
        <circle cx="106" cy="50" r="2" fill="#4a8f40" opacity=".6"/>
        <circle cx="14" cy="88" r="2" fill="#2d5a20" opacity=".5"/>
        <circle cx="106" cy="88" r="2" fill="#2d5a20" opacity=".5"/>

        <!-- Çiçek/bitki sol -->
        <line x1="10" y1="95" x2="10" y2="82" stroke="#2d5a20" stroke-width="1.2"/>
        <circle cx="10" cy="80" r="4" fill="#2d5a20"/>
        <circle cx="7"  cy="77" r="2.5" fill="#3a7a28"/>
        <circle cx="13" cy="77" r="2.5" fill="#3a7a28"/>
        <!-- Çiçek/bitki sağ -->
        <line x1="110" y1="95" x2="110" y2="82" stroke="#2d5a20" stroke-width="1.2"/>
        <circle cx="110" cy="80" r="4" fill="#2d5a20"/>
        <circle cx="107" cy="77" r="2.5" fill="#3a7a28"/>
        <circle cx="113" cy="77" r="2.5" fill="#3a7a28"/>
      </svg>`;

    // Tıklanabilir: uyurken uyandır, uyanıkken uyut
    k.title = 'NatureBot — tıkla!';
    k.addEventListener('click', () => {
      const bot = window._natureBotInstance;
      if (!bot) return;
      if (bot.isSleeping) {
        bot.wakeUp();
      } else if (!bot.isAtHome) {
        bot.goToKennel();
      }
    });

    document.body.appendChild(k);
    this.kennelEl = k;

    this._updateKennelPos();
    window.addEventListener('resize', () => this._updateKennelPos());
  }

  _updateKennelPos() {
    if (!this.kennelEl) return;
    const pos = this.getKennelPos();
    this.kennelEl.style.left = pos.x + 'px';
    this.kennelEl.style.top  = pos.y + 'px';
  }

  showKennel() {
    if (!this.kennelEl) return;
    this.kennelEl.style.opacity = '0';
    this.kennelEl.style.display = 'block';
    requestAnimationFrame(() => {
      this.kennelEl.style.transition = 'opacity .8s';
      this.kennelEl.style.opacity = '1';
    });
  }

  hideKennel() {
    if (!this.kennelEl) return;
    this.kennelEl.style.transition = 'opacity .5s';
    this.kennelEl.style.opacity = '0';
    setTimeout(() => { if(this.kennelEl) this.kennelEl.style.display = 'none'; }, 500);
  }

  createZzz() {
    const old = document.getElementById('botZzzContainer');
    if (old) old.remove();
    const z = document.createElement('div');
    z.id = 'botZzzContainer';
    z.innerHTML = '<span class="bot-zzz">z</span><span class="bot-zzz">Z</span><span class="bot-zzz">Z</span>';
    document.body.appendChild(z);
    this.zzzEl = z;
  }

  showZzz() {
    if (!this.zzzEl) return;
    const pos = this.getKennelPos();
    this.zzzEl.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;display:block;left:'+(pos.x+50)+'px;top:'+(pos.y-14)+'px;';
    Array.from(this.zzzEl.children).forEach((z,i) => {
      z.style.cssText = 'position:absolute;font-size:'+(0.65+i*0.18)+'rem;font-weight:900;color:#a5d6a7;opacity:0;animation:zzzFloat 2.5s ease-in-out infinite;animation-delay:'+(i*0.85)+'s;text-shadow:0 0 8px rgba(74,143,64,.5);left:'+(i*10)+'px;top:'+(i*-8)+'px;';
    });
  }

  hideZzz() {
    if (!this.zzzEl) return;
    this.zzzEl.style.display = 'none';
  }

  startWanderDesktop() {
    this.isAtHome = false;
    this.isSleeping = false;
    this.isWaking = false;
    this.el.classList.remove('sleeping','at-home','waking','entering-kennel','exiting-kennel');
    this.el.style.opacity = '1';
    this.el.style.pointerEvents = 'auto';
    this.hideZzz();
    this.hideKennel();
    clearTimeout(this.wanderTimer);
    clearTimeout(this.sleepTimer);
    this.wanderStartTime = Date.now();
    // Gezinme süresi: 15-20 dk sonra kulübeye çekil
    this.WANDER_DURATION = (15 + Math.random() * 5) * 60 * 1000;
    const wander = () => {
      if (this.isDragging || this.isCalling || this.isAtHome || this.isSleeping) {
        this.wanderTimer = setTimeout(wander, 800);
        return;
      }
      // Süre doldu mu?
      if (Date.now() - this.wanderStartTime >= this.WANDER_DURATION) {
        this.goToKennel();
        return;
      }
      const b = this.getSidebarBounds();
      this.targetX = b.x1 + Math.random() * Math.max(0, b.x2 - b.x1);
      this.targetY = b.y1 + Math.random() * Math.max(0, b.y2 - b.y1);
      this.wanderTimer = setTimeout(wander, 3500 + Math.random() * 5000);
    };
    this.wanderTimer = setTimeout(wander, 1500 + Math.random() * 2000);
  }

  goToKennel() {
    if (this.isSleeping || this.isAtHome) return;
    this.isAtHome = true;
    clearTimeout(this.wanderTimer);
    clearTimeout(this.sleepTimer);

    // Kulübeyi göster
    this.showKennel();
    this.hideBubble();

    // Kulübenin önüne yürü
    const kPos = this.getKennelPos();
    this.targetX = kPos.x + 26; // kapı önü
    this.targetY = kPos.y - 48;

    // 2.5 sn yürüyüş → giriş animasyonu → uyu
    this.sleepTimer = setTimeout(() => {
      this._enterKennelAnimation();
    }, 2500);
  }

  _enterKennelAnimation() {
    if (!this.isAtHome) return;
    // Kapının tam önüne snap
    const kPos = this.getKennelPos();
    this.x = kPos.x + 26;
    this.y = kPos.y - 44;
    this.el.style.left = this.x + 'px';
    this.el.style.top  = this.y + 'px';
    // Giriş animasyonu: küçülerek kapıya gir
    this.el.classList.add('entering-kennel');
    // Kulübe occupied sınıfı → kapı parlar
    setTimeout(() => {
      if (this.kennelEl) this.kennelEl.classList.add('occupied');
    }, 400);
    // Animasyon bitince uyu
    setTimeout(() => {
      this.el.classList.remove('entering-kennel');
      this.el.style.opacity = '0';
      this.el.style.pointerEvents = 'none';
      this.fallAsleep();
    }, 900);
  }

  fallAsleep() {
    if (!this.isAtHome) return;
    this.isSleeping = true;
    this.hideBubble();

    // Bot kulübenin içinde — görünmez (entering-kennel zaten gizledi)
    this.el.style.opacity = '0';
    this.el.style.pointerEvents = 'none';
    this.el.classList.remove('at-home','talking','entering-kennel');
    this.el.classList.add('sleeping');

    // ZZZ kulübenin üstünde göster
    this.showZzz();

    // Kulübe ışıkları yakık (occupied zaten eklendi)
    if (this.kennelEl) this.kennelEl.classList.add('occupied');

    // 45 dk sonra uyan
    this.sleepTimer = setTimeout(() => {
      this.wakeUp();
    }, this.SLEEP_DURATION);
  }

  wakeUp() {
    if (!this.isSleeping) return;
    this.isSleeping = false;
    this.isWaking = true;
    this.isAtHome = false;
    this.hideZzz();

    // Kulübe titreme animasyonu
    if (this.kennelEl) {
      this.kennelEl.classList.add('waking-up');
      setTimeout(() => { if(this.kennelEl) this.kennelEl.classList.remove('waking-up'); }, 600);
    }

    // Botu kapı önüne yerleştir
    const kPos = this.getKennelPos();
    this.x = kPos.x + 26;
    this.y = kPos.y - 44;
    this.el.style.left = this.x + 'px';
    this.el.style.top  = this.y + 'px';
    this.el.style.pointerEvents = 'auto';

    // Kulübeden çıkış animasyonu
    this.el.classList.remove('sleeping', 'at-home');
    this.el.classList.add('exiting-kennel');
    this.el.style.opacity = '1';

    setTimeout(() => {
      this.el.classList.remove('exiting-kennel');
      this.el.classList.add('waking');
      // Kulübe ışıklarını söndür
      if (this.kennelEl) this.kennelEl.classList.remove('occupied');
      setTimeout(() => { this.el.classList.remove('waking'); }, 900);
    }, 850);

    // Uyanma mesajı
    const msgs = ['☀️ Uyandım! Nasıl yardımcı olabilirim?', '🌿 Günaydın! Buradayım!', '😊 Dinlendim, hazırım!'];
    setTimeout(() => {
      this.showBubble(msgs[Math.floor(Math.random()*msgs.length)], true);
    }, 900);

    // Gezinmeye başla
    setTimeout(() => {
      this.isWaking = false;
      this.wanderStartTime = Date.now();
      this.WANDER_DURATION = (15 + Math.random() * 5) * 60 * 1000;
      this.startWanderDesktop();
    }, 1800);
  }

  startHomeCheck() {
    // Bu fonksiyon artık sadece eski compat için - asıl zamanlayıcı startWanderDesktop'ta
    if (this.homeCheckTimer) clearInterval(this.homeCheckTimer);
  }

  recordInteraction() {
    this.lastInteractTime = Date.now();
    if (this.isSleeping && !IS_MOBILE()) {
      // Uyurken tıklanınca uyan
      this.wakeUp();
      return;
    }
    if (this.isAtHome && !IS_MOBILE()) {
      this.isAtHome = false;
      this.el.classList.remove('at-home');
      clearTimeout(this.sleepTimer);
      this.startWanderDesktop();
    }
    // Wanderlamayı sıfırla
    this.wanderStartTime = Date.now();
  }

  showBubble(msg, autoHide = true) {
    if (IS_MOBILE()) return; // Mobilden bubble gösterme
    if (!this.bubble) return;
    clearTimeout(this.bubbleTimeout);
    this.bubble.style.display = 'block';
    this.bubble.innerHTML = `<span class="bot-bubble-close" onclick="this.parentNode.style.display='none'">✕</span><div class="bot-bubble-name">🌿 NatureBot</div><div class="bot-bubble-msg">${msg}</div>`;
    this.bubble.classList.add('visible');
    this.updateBubblePos();

    // ── Her bubble sesli okunur ──
    if (window.SPEECH && window.SPEECH.supported) {
      // Önceki sesi kes
      SPEECH.stop();
      // Temiz metin: HTML etiketlerini ve emojileri sil
      const cleanMsg = msg
        .replace(/<[^>]+>/g, ' ')
        .replace(/[🌿🤖💚🌱👋💬🌤️🎲🪙👥🔔🎨📋⏳❌📍📊🔑⚙️👤📅🕐🎯🌳✅➕📡🎉⏰🔊]/g, '')
        .replace(/\s{2,}/g, ' ').trim();
      if (cleanMsg.length > 1) {
        setTimeout(() => {
          SPEECH.speak(
            cleanMsg,
            () => { // konuşmaya başladı — waveform göster
              if (this.voiceWave) {
                this.voiceWave.style.display = 'flex';
                this.updateVoiceWavePos();
              }
            },
            () => { // konuşma bitti — waveform gizle
              if (this.voiceWave) this.voiceWave.style.display = 'none';
            }
          );
        }, 150);
      }
    }

    if (autoHide) {
      // Ses süresi + 1 sn sonra gizle
      const wordCount = msg.replace(/<[^>]+>/g,'').split(/\s+/).length;
      const speakDuration = Math.max(4000, wordCount * 420 + 1200);
      this.bubbleTimeout = setTimeout(() => this.hideBubble(), autoHide === true ? speakDuration : 5000);
    }
  }

  hideBubble() {
    if (!this.bubble) return;
    this.bubble.classList.remove('visible');
    clearTimeout(this.bubbleTimeout);
    setTimeout(() => { if (this.bubble) this.bubble.style.display = 'none'; }, 300);
  }

  updateBubblePos() {
    if (!this.bubble || this.bubble.style.display === 'none') return;
    const bRect = this.el.getBoundingClientRect();
    this.bubble.style.left = Math.round(this.x - 10) + 'px';
    this.bubble.style.top  = Math.round(this.y - this.bubble.offsetHeight - 10) + 'px';
  }

  updateVoiceWavePos() {
    if (!this.voiceWave || this.voiceWave.style.display === 'none') return;
    this.voiceWave.style.left = Math.round(this.x + 20) + 'px';
    this.voiceWave.style.top  = Math.round(this.y - 10) + 'px';
  }

  loop() {
    if (IS_MOBILE()) return;
    if (!this.isDragging) {
      const speed = this.isCalling ? 0.03 : (this.isSleeping ? 0.04 : (this.isAtHome ? 0.035 : 0.055));
      this.x += (this.targetX - this.x) * speed;
      this.y += (this.targetY - this.y) * speed;
      const b = this.getSidebarBounds();
      // Uyku veya kulübe yolunda sınır koyma — tam konuma gidebilsin
      if (!this.isSleeping && !this.isAtHome) {
        this.x = Math.max(b.x1-20, Math.min(b.x2+20, this.x));
        this.y = Math.max(b.y1, Math.min(b.y2+30, this.y));
      }
      this.el.style.left = Math.round(this.x) + 'px';
      this.el.style.top  = Math.round(this.y) + 'px';
    }
    if (this.isSleeping) {
      this.el.classList.add('sleeping');
      this.el.classList.remove('at-home');
    } else if (this.isAtHome) {
      this.el.classList.add('at-home');
      this.el.classList.remove('sleeping');
    } else {
      this.el.classList.remove('at-home', 'sleeping');
    }
    this.updateBubblePos();
    this.updateVoiceWavePos();
    this.rafId = requestAnimationFrame(() => this.loop());
  }
}

/* ── Global köprüler ── */

window._natureBotRunCmd = function(cmd) {
  window.runBotCmd && window.runBotCmd(cmd, true);
};


/* ── NatureBot Akıllı Sohbet Motoru (naturebot-brain.js ile değiştirildi) ── */

window._natureBotReplyLEGACY = function(text) {
  if (!text || !text.trim()) return;
  const bot = window._natureBotInstance;
  if (!bot) return;
  const t = text.trim();
  // Komut mu?
  if (t.startsWith('/')) { window.runBotCmd && window.runBotCmd(t, true); return; }

  const lower = t.toLowerCase();
  let reply = '';

  // ── Bilgi tabanı ──
  const kb = [
    { q:/merhaba|selam|hey|heyy|hello|hi\b/, a:['Merhaba! 🌿 Nasıl yardımcı olabilirim?','Selam! Bugün ne öğrenmek istersin?','Hey! Buradayım, ne var ne yok? 😊'] },
    { q:/nasılsın|ne haber|ne var/, a:['İyiyim teşekkürler! Seninle sohbet etmek güzel 🌱','Harika! Her zaman aktifim, yardımcı olmak için bekliyorum.','Sağolasın, gayet iyiyim! Sen nasılsın?'] },
    { q:/kimsin|nesin|ne yaparsın|hakkında/, a:['Ben NatureBot! 🤖 Nature.co\'nun yapay zeka asistanıyım. Uygulama hakkında sorular sorabilir, komutlar çalıştırabilirsin.','NatureBot — Nature.co\'nun akıllı asistanı. Sana yardımcı olmak için buradayım! /yardım ile komutlarımı görebilirsin.'] },
    { q:/teşekkür|sağ ol|eyvallah|mersi/, a:['Ne demek! Her zaman buradayım 🌿','Rica ederim! Başka bir konuda yardım istersen söyle.','Memnuniyetle! 😊'] },
    { q:/görüşürüz|hoşça kal|bay|bye/, a:['Görüşürüz! Kendine iyi bak 🌿','Güle güle! Dilediğinde geri gel.','Bay bay! 👋'] },
    { q:/hava|hava durumu/, a:['Hava durumu için /hava [şehir] komutunu kullanabilirsin! Örn: /hava istanbul'] },
    { q:/saat|zaman|kaçta/, a:['Şu anki saat için /saat komutunu kullan! ⏰'] },
    { q:/zar|zar at/, a:['Zar atmak için /zar komutunu kullan! 🎲'] },
    { q:/yazı tura|yazı mı tura mı|flip/, a:['Yazı-tura için /flip komutunu dene! 🪙'] },
    { q:/komut|ne yapabilirsin|yardım|özellik/, a:['İşte kullanabileceğin komutlar:\n/yardım — tam liste\n/hava [şehir] — hava durumu\n/saat — saat\n/zar — zar at\n/flip — yazı tura\n/anket [soru] — anket oluştur'] },
    { q:/kanal|oda|grup|oluştur/, a:['Oda oluşturmak için: Ana Sayfa → GRUPLAR → + butonu 🏠'] },
    { q:/mesaj|dm|direkt mesaj/, a:['Direkt mesaj için: Ana Sayfa → DİREKT MESAJLAR → + 💬'] },
    { q:/arkadaş|ekle|istek/, a:['Arkadaş eklemek için: Alt menü → Arkadaşlar → + 👥'] },
    { q:/profil|avatar|fotoğraf|pp/, a:['Profilini düzenlemek için sağ üstteki avatar ikonuna tıkla 👤'] },
    { q:/tema|renk|görünüm|arayüz/, a:['Tema değiştirmek için: Profil → Ayarlar → Görünüm 🎨'] },
    { q:/bildirim|zil|ses/, a:['Bildirim ayarları için sağ üstteki zil ikonuna tıkla 🔔'] },
    { q:/forum|paylaşım|konu/, a:['Forum için alt menüden "Forum" sekmesine git 📋'] },
    { q:/video|izle|yayın/, a:['"İzle" sekmesinden içeriklere erişebilirsin 📺'] },
    { q:/şifre|parola|unutt/, a:['Şifre değiştirmek için: Profil → Ayarlar → Şifreyi Değiştir 🔑'] },
    { q:/admin|yönetici|panel/, a:['Admin paneline Profil → Admin yolundan ulaşabilirsin ⚙️'] },
    { q:/ban|yasakla|engelle/, a:['Ban işlemleri için Admin panelini kullanabilirsin.'] },
    { q:/çıkış|logout|oturumu kapat/, a:['Çıkış için: Profil → Ayarlar → Çıkış Yap 🚪'] },
    { q:/doğa|nature|çevre|ekosistem/, a:['Nature.co, doğayı seven insanların buluştuğu bir topluluk platformu! 🌿🌍'] },
    { q:/güzel|harika|süper|bravo/, a:['Teşekkürler! 🌟 Başka bir şey istersen buradayım.','Çok naziksin! 😊'] },
    { q:/neden|niye|nasıl|ne zaman/, a:['Güzel soru! Daha detaylı bilgi için /yardım komutunu veya uygulama içi kılavuzu deneyebilirsin 🤔','Bunu tam olarak bilemiyorum ama yardımcı olmak için elimden geleni yaparım!'] },
  ];

  for (const item of kb) {
    if (item.q.test(lower)) {
      const pool = item.a;
      reply = pool[Math.floor(Math.random() * pool.length)];
      break;
    }
  }

  if (!reply) {
    const fallbacks = [
      `"${t}" konusunda yardımcı olmak isterim ama bu konuda bilgim yok 😅 /yardım ile neler yapabileceğimi görebilirsin!`,
      'Bunu tam anlayamadım, farklı bir şekilde sorabilir misin? 🤔',
      'Hmm, bu konuda bilgim sınırlı. /yardım ile komutlarımı listeyebilirsin! 🌿',
      'İlginç bir soru! Ama bunun cevabını bilmiyorum şu an. Uygulama hakkında bir şey sorarsan daha iyi yardım edebilirim 😊',
    ];
    reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  bot.showBubble(reply, false);
};


function startNatureBot() {
  if (document.getElementById('natureBotPet')) return;
  window._natureBotInstance = new NatureBotPet();
}

const _nbLoginObs = new MutationObserver(() => {
  const login = document.getElementById('loginScreen');
  if (login && !login.classList.contains('active')) {
    setTimeout(startNatureBot, 800);
  }
});
const _nbLoginEl = document.getElementById('loginScreen');
if (_nbLoginEl) _nbLoginObs.observe(_nbLoginEl, { attributes: true, attributeFilter: ['class','style'] });

// Birden fazla zaman aralığında dene - ağ gecikmesi varsa da başlasın
[800, 2000, 4000].forEach(delay => {
  setTimeout(() => {
    const login = document.getElementById('loginScreen');
    const isLoginVisible = login && login.classList.contains('active');
    if (!isLoginVisible && !document.getElementById('natureBotPet')) {
      startNatureBot();
    }
  }, delay);
});



/* ── Renk paleti ── */

// C ui.js'de tanımlanmışsa tekrar tanımlama (const çakışmasını önle)
if (!window.C || !window.C.em) window.C = {
  em: '#10b981', // emerald
  em2:'#34d399',
  tl: '#0d9488', // teal
  mu: 'rgba(148,200,188,0.65)', // muted
  hi: '#e8fdf8', // high
  rd: '#f87171', // red
  yw: '#fbbf24', // yellow
  bl: '#60a5fa', // blue
  pu: '#a78bfa', // purple
  or: '#fb923c', // orange
  pk: '#f472b6', // pink
  wh: 'rgba(255,255,255,0.85)',
  cy: '#67e8f9', // cyan
};



(function injectBotCSS2(){
  const s = document.createElement('style');
  s.textContent = `

/* Mevcut #botVoiceWave zaten var — bar sayısını artır, boyutu büyüt */
#botVoiceWave {
  gap: 3px !important;
  padding: 8px 16px !important;
  border-radius: 24px !important;
  background: linear-gradient(135deg, rgba(14,43,12,0.92), rgba(20,60,18,0.92)) !important;
  border: 1px solid rgba(74,143,64,0.5) !important;
  box-shadow: 0 0 24px rgba(74,143,64,0.2), 0 8px 32px rgba(0,0,0,0.5) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
}
/* Genişletilmiş waveform barları (NatureBotPet JS ile eklenir) */
.bvw-bar {
  transition: height .1s ease !important;
}
/* Bot bubble glassmorphism yükseltme */
#natureBotBubble {
  background: linear-gradient(135deg, rgba(14,43,12,0.88), rgba(22,52,20,0.88)) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(74,143,64,0.45) !important;
  box-shadow: 0 0 32px rgba(74,143,64,0.15), 0 16px 48px rgba(0,0,0,0.6) !important;
  border-radius: 18px 18px 18px 4px !important;
}
/* Listening state - bot konuştuğunda waveform göster */
#botVoiceWave.visible {
  display: flex !important;
  animation: botWaveAppear .25s cubic-bezier(.34,1.56,.64,1);
}
@keyframes botWaveAppear {
  from { transform: scale(.8) translateY(8px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

  `;
  document.head.appendChild(s);
})();


/* ── NatureBot: waveform bar sayısını artır ── */

document.addEventListener('DOMContentLoaded', () => {
  const wave = document.getElementById('botVoiceWave');
  if (wave) {
    // Mevcut 5 bar varsa, 13 tane daha ekle (toplam 18)
    const existing = wave.querySelectorAll('.bvw-bar').length;
    const target = 18;
    const heights = [10,18,28,38,48,56,62,56,48,38,28,18,10,22,40,52,44,26];
    const delays  = [0,.08,.16,.24,.32,.40,.48,.56,.40,.32,.24,.16,.08,.12,.28,.44,.36,.20];
    wave.innerHTML = '';
    for (let i = 0; i < target; i++) {
      const bar = document.createElement('div');
      bar.className = 'bvw-bar';
      bar.style.height = heights[i] + 'px';
      bar.style.animationDelay = delays[i] + 's';
      wave.appendChild(bar);
    }
  }
  // Widget toggle butonunu desktop header'a ekle
  const deskHdrRight = document.querySelector('.dsk-hdr-right, #deskChatHeaderRight, .ws-right, .c-header-right');
  if (deskHdrRight && !document.getElementById('widgetsPanelToggle')) {
    const btn = document.createElement('div');
    btn.id = 'widgetsPanelToggle';
    btn.title = 'Widget Paneli';
    btn.innerHTML = '🧩';
    btn.onclick = toggleWidgetsPanel;
    btn.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:.9rem;transition:background .15s;flex-shrink:0;';
    btn.onmouseover = () => btn.style.background = 'rgba(255,255,255,.14)';
    btn.onmouseout  = () => btn.style.background = 'rgba(255,255,255,.07)';
    deskHdrRight.appendChild(btn);
  }
});

// Dışarı tıklayınca widget panelini kapat
// _wpOpen misc.js'de tanımlı (let _wpOpen = false)
document.addEventListener('click', e => {
  const panel = document.getElementById('widgetsPanel');
  const toggle = document.getElementById('widgetsPanelToggle');
  if (_wpOpen && panel && !panel.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
    _wpOpen = false;
    panel.classList.remove('open');
  }
}, true);

/* ═══════════════════════════════════════════════════════════════
   NatureBot Moderatör Sistemi — Kural Tabanlı, AI Yok
   ═══════════════════════════════════════════════════════════════ */

(function initModeratorBot() {

  // ── Varsayılan kötü kelime listesi (Firebase'den override edilir)
  const DEFAULT_BAD_WORDS = [
    'orospu','orospu çocuğu','piç','piç kurusu','siktir','sik','göt',
    'amk','amına','bok','oç','mal','gerizekalı','salak','aptal',
    'şerefsiz','haysiyetsiz','kahpe','fahişe','götveren','ibne',
    'sürtük','kaltak','yavşak','pezevenk','bok','bok gibi','boktan',
    'fuck','shit','bitch','asshole','bastard','motherfucker'
  ];

  let _badWords = [...DEFAULT_BAD_WORDS];
  let _muteList = {}; // { username: muteExpiresAt }
  let _spamTracker = {}; // { username: [timestamps] }
  let _modSettings = {
    autoKickBadWord: false,    // küfürde kick
    autoBanBadWord: false,     // küfürde ban
    autoWarnBadWord: true,     // küfürde uyar
    deleteBadWord: true,       // küfürlü mesajı sil
    spamThreshold: 5,          // kaç mesaj
    spamWindow: 6000,          // kaç ms içinde (6sn)
    autoMuteSpam: true,        // spam'da sustur
    spamMuteDuration: 60,      // dakika
    welcomeEnabled: true,      // yeni üye karşılama
    welcomeMsg: '👋 {user} aramıza katıldı! Hoş geldin 🌿',
    logEnabled: true            // mod log
  };

  // ── Firebase'den ayarları yükle
  async function loadModSettings() {
    try {
      const s = await fbRestGet('botSettings').catch(()=>null);
      if (s) {
        if (s.modSettings) Object.assign(_modSettings, s.modSettings);
        if (s.badWords && Array.isArray(s.badWords)) _badWords = s.badWords;
      }
    } catch(e) {}
  }

  // ── Bot olarak Firebase'e mesaj gönder (belirtilen odaya)
  async function botSendToRoom(roomId, text) {
    if (!roomId || !text) return;
    try {
      if (typeof dbRef === 'function') {
        await dbRef('msgs/' + roomId).push({
          user: 'NatureBot',
          text: text,
          ts: Date.now(),
          sys: false,
          isBot: true
        });
      }
    } catch(e) {}
  }

  // ── Bot olarak sistem mesajı gönder (görsel, Firebase değil)
  function botLocalMsg(text) {
    if (typeof showBotMsg === 'function') showBotMsg(text);
  }

  // ── Mod logu — Firebase'e yaz
  async function modLog(action, target, detail, roomId) {
    if (!_modSettings.logEnabled) return;
    try {
      if (typeof dbRef === 'function') {
        await dbRef('modLogs').push({
          action, target, detail,
          room: roomId || '?',
          by: 'NatureBot',
          ts: Date.now()
        });
      }
    } catch(e) {}
  }

  // ── Admin'e DM bildirim gönder
  async function notifyAdmins(text) {
    try {
      const users = await fbRestGet('users').catch(()=>null)||{};
      const admins = Object.values(users).filter(u=>u&&u.isAdmin&&u.username);
      for (const admin of admins) {
        if (typeof dbRef === 'function') {
          await dbRef('msgs/dm_' + admin.username).push({
            user: 'NatureBot',
            text: '🚨 ' + text,
            ts: Date.now(),
            isBot: true
          });
        }
      }
    } catch(e) {}
  }

  // ── Küfür/yasaklı kelime kontrol
  function containsBadWord(text) {
    const lower = text.toLowerCase().replace(/[*@#!.]/g, '');
    return _badWords.find(w => {
      const wl = w.toLowerCase();
      return lower.includes(wl);
    }) || null;
  }

  // ── Mesajı Firebase'den sil
  async function deleteMessage(roomId, msgKey) {
    try {
      if (typeof dbRef === 'function') {
        await dbRef('msgs/' + roomId + '/' + msgKey).remove();
      }
    } catch(e) {}
  }

  // ── Kullanıcıyı mute et (Firebase'e yaz)
  async function muteUser(username, durationMin) {
    const exp = Date.now() + durationMin * 60 * 1000;
    _muteList[username] = exp;
    try {
      if (typeof dbRef === 'function') {
        await dbRef('mutes/' + username).set({ mutedAt: Date.now(), expiresAt: exp, by: 'NatureBot' });
      }
    } catch(e) {}
  }

  // ── Kullanıcıyı ban et
  async function banUser(username, reason) {
    try {
      await fbRestSet('users/' + username + '/banned', true);
      await fbRestSet('users/' + username + '/banReason', reason || 'NatureBot otomatik ban');
      await modLog('ban', username, reason, null);
      await notifyAdmins(username + ' kullanıcısı banlandı. Sebep: ' + reason);
    } catch(e) {}
  }

  // ── Spam kontrolü
  function checkSpam(username) {
    const now = Date.now();
    if (!_spamTracker[username]) _spamTracker[username] = [];
    _spamTracker[username] = _spamTracker[username].filter(t => now - t < _modSettings.spamWindow);
    _spamTracker[username].push(now);
    return _spamTracker[username].length >= _modSettings.spamThreshold;
  }

  // ── Mute kontrolü
  function isMuted(username) {
    const exp = _muteList[username];
    if (!exp) return false;
    if (Date.now() > exp) { delete _muteList[username]; return false; }
    return true;
  }

  // ══ ANA MODERASYON MANTIĞI ══
  async function moderateMessage(roomId, msgKey, msg) {
    if (!msg || !msg.user || msg.user === 'NatureBot' || msg.isBot || msg.sys) return;
    const username = msg.user;
    const text = (msg.text || '').trim();
    if (!text) return;

    // 1. Mute kontrolü
    if (isMuted(username)) {
      await deleteMessage(roomId, msgKey);
      await botSendToRoom(roomId, '🔇 ' + username + ' susturulmuş durumda, mesaj gönderemez.');
      return;
    }

    // 2. Spam kontrolü
    if (checkSpam(username)) {
      await deleteMessage(roomId, msgKey);
      if (_modSettings.autoMuteSpam) {
        await muteUser(username, _modSettings.spamMuteDuration);
        await botSendToRoom(roomId, '⚠️ ' + username + ' spam yaptığı için ' + _modSettings.spamMuteDuration + ' dakika susturuldu.');
        await modLog('mute', username, 'Spam', roomId);
        await notifyAdmins(username + ' spam nedeniyle ' + _modSettings.spamMuteDuration + ' dk susturuldu. Oda: ' + roomId);
      } else {
        await botSendToRoom(roomId, '⚠️ ' + username + ', lütfen spam yapmayın!');
      }
      return;
    }

    // 3. Küfür/yasaklı kelime kontrolü
    const badWord = containsBadWord(text);
    if (badWord) {
      if (_modSettings.deleteBadWord) await deleteMessage(roomId, msgKey);

      if (_modSettings.autoBanBadWord) {
        await banUser(username, 'Yasaklı kelime kullanımı');
        await botSendToRoom(roomId, '🚫 ' + username + ' yasaklı kelime kullandığı için banlandı.');
      } else if (_modSettings.autoKickBadWord) {
        // Kick = odadan at (mute + mesaj)
        await muteUser(username, 30);
        await botSendToRoom(roomId, '🦶 ' + username + ' uygunsuz dil kullandığı için 30 dakika uzaklaştırıldı.');
        await modLog('kick', username, 'Küfür: ' + badWord, roomId);
      } else if (_modSettings.autoWarnBadWord) {
        await botSendToRoom(roomId, '⚠️ ' + username + ', uygunsuz dil kullanmayın! Kural ihlali tespit edildi.');
        await modLog('warn', username, 'Küfür: ' + badWord, roomId);
      }
      await notifyAdmins(username + ' yasaklı kelime kullandı ("' + badWord + '") — Oda: ' + roomId);
      return;
    }
  }

  // ══ ADMIN KOMUTLARI ══
  // /mod ban @kullanıcı [sebep]
  // /mod mute @kullanıcı [dk]
  // /mod unmute @kullanıcı
  // /mod warn @kullanıcı [mesaj]
  // /mod kick @kullanıcı
  // /mod duyuru [mesaj]
  // /mod yardım

  async function handleModCommand(text, roomId) {
    if (!window._isAdmin) return false;
    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('/mod ') && lower !== '/mod') return false;

    const parts = text.trim().split(' ');
    const sub = (parts[1]||'').toLowerCase();
    const target = (parts[2]||'').replace('@','');
    const rest = parts.slice(3).join(' ');

    if (sub === 'yardım' || !sub) {
      botLocalMsg(
        '🛡 Mod Komutları:\n' +
        '/mod ban @kullanıcı [sebep] — Banla\n' +
        '/mod mute @kullanıcı [dk] — Sustur (varsayılan 60dk)\n' +
        '/mod unmute @kullanıcı — Susturmayı kaldır\n' +
        '/mod warn @kullanıcı [mesaj] — Uyar\n' +
        '/mod kick @kullanıcı — 30dk uzaklaştır\n' +
        '/mod duyuru [mesaj] — Tüm odalara duyuru\n' +
        '/mod durum @kullanıcı — Kullanıcı durumu'
      );
      return true;
    }

    if (!target) { botLocalMsg('❌ Kullanıcı adı belirtmelisin.'); return true; }

    if (sub === 'ban') {
      await banUser(target, rest || 'Admin komutu');
      await botSendToRoom(roomId, '🚫 ' + target + ' banlandı.' + (rest ? ' Sebep: ' + rest : ''));
      botLocalMsg('✅ ' + target + ' banlandı.');
    }
    else if (sub === 'mute') {
      const min = parseInt(target.replace('@','')) && !isNaN(parseInt(rest)) ? parseInt(rest) : (parseInt(parts[3])||60);
      const realTarget = target;
      await muteUser(realTarget, min);
      await botSendToRoom(roomId, '🔇 ' + realTarget + ' ' + min + ' dakika susturuldu.');
      botLocalMsg('✅ ' + realTarget + ' ' + min + ' dk susturuldu.');
    }
    else if (sub === 'unmute') {
      delete _muteList[target];
      try { if (typeof dbRef === 'function') await dbRef('mutes/' + target).remove(); } catch(e){}
      await botSendToRoom(roomId, '🔊 ' + target + ' susturması kaldırıldı.');
      botLocalMsg('✅ ' + target + ' unmute edildi.');
    }
    else if (sub === 'warn') {
      const warnMsg = rest || 'Lütfen kurallara uy.';
      await botSendToRoom(roomId, '⚠️ ' + target + ': ' + warnMsg);
      await modLog('warn', target, warnMsg, roomId);
      botLocalMsg('✅ ' + target + ' uyarıldı.');
    }
    else if (sub === 'kick') {
      await muteUser(target, 30);
      await botSendToRoom(roomId, '🦶 ' + target + ' admin kararıyla 30 dakika uzaklaştırıldı.');
      await modLog('kick', target, 'Admin komutu', roomId);
      botLocalMsg('✅ ' + target + ' kick edildi.');
    }
    else if (sub === 'duyuru') {
      const announcement = parts.slice(2).join(' ');
      if (!announcement) { botLocalMsg('❌ Duyuru metni yaz.'); return true; }
      try {
        const rooms = await fbRestGet('rooms').catch(()=>null)||{};
        const roomIds = Object.keys(rooms);
        for (const rid of roomIds) {
          await botSendToRoom(rid, '📢 DUYURU: ' + announcement);
          await new Promise(r=>setTimeout(r, 200));
        }
        botLocalMsg('✅ Duyuru ' + roomIds.length + ' odaya gönderildi.');
      } catch(e) { botLocalMsg('❌ Duyuru gönderilemedi.'); }
    }
    else if (sub === 'durum') {
      const muted = isMuted(target);
      const mutedUntil = _muteList[target] ? new Date(_muteList[target]).toLocaleTimeString('tr-TR') : '';
      const spamCount = (_spamTracker[target]||[]).length;
      botLocalMsg(
        '👤 ' + target + ' durumu:\n' +
        '🔇 Susturma: ' + (muted ? 'Evet (kadar: '+mutedUntil+')' : 'Hayır') + '\n' +
        '📨 Son spam sayısı: ' + spamCount
      );
    }

    return true;
  }

  // ══ YENİ ÜYE KARŞILAMA ══
  window._botWelcomeNewUser = async function(username) {
    if (!_modSettings.welcomeEnabled) return;
    const msg = _modSettings.welcomeMsg.replace('{user}', username);
    // Genel odaya gönder
    try {
      const rooms = await fbRestGet('rooms').catch(()=>null)||{};
      const generalRoom = Object.entries(rooms).find(([,r])=>r.type==='channel')?.[0];
      if (generalRoom) {
        await botSendToRoom(generalRoom, msg);
      }
    } catch(e) {}
  };

  // ══ MESAJ DİNLEYİCİ HOOK ══
  // sendMsg çağrıldığında moderation çalıştır
  const _origSendMsg = window.sendMsg;
  window.sendMsg = async function(...args) {
    if (_origSendMsg) await _origSendMsg.apply(this, args);
    // Gönderilen mesajı yakala
  };

  // Firebase realtime listener ile gelen mesajları moderasyona gönder
  window._startModListener = function(roomId) {
    if (!roomId || typeof dbRef !== 'function') return;
    const ref = dbRef('msgs/' + roomId);
    ref.orderByChild('ts').startAt(Date.now()).on('child_added', async (snap) => {
      const msg = snap.val();
      const key = snap.key;
      if (!msg) return;

      // Admin komut kontrolü
      if (msg.text && msg.text.startsWith('/mod')) {
        const handled = await handleModCommand(msg.text, roomId);
        if (handled && window._isAdmin) return;
      }

      await moderateMessage(roomId, key, msg);
    });
  };

  // Oda açıldığında dinleyiciyi başlat
  const _origOpenRoom = window.openRoom;
  window.openRoom = function(roomId, ...rest) {
    if (_origOpenRoom) _origOpenRoom.call(this, roomId, ...rest);
    setTimeout(() => window._startModListener && window._startModListener(roomId), 800);
  };

  // ══ ADMIN KOMUT HİT HOOK (checkBotCommand'a ekle) ══
  const _origCheckBotCommand = window.checkBotCommand;
  window.checkBotCommand = function(text) {
    if (text && text.toLowerCase().startsWith('/mod')) {
      const room = window._cRoom || window._deskRoom;
      handleModCommand(text, room);
      return true;
    }
    return _origCheckBotCommand ? _origCheckBotCommand(text) : false;
  };

  // ══ BAŞLAT — Auth hazır olduktan sonra yükle ══
  function _initModWhenReady(attempt) {
    attempt = attempt || 0;
    // _cu (current user) set olmadan Firebase'e istek atma → 401 önlemi
    if (!window._cu || !window._db) {
      if (attempt < 20) setTimeout(() => _initModWhenReady(attempt + 1), 800);
      return;
    }
    (async () => {
      await loadModSettings();
      try {
        const mutes = await fbRestGet('mutes').catch(()=>null)||{};
        Object.entries(mutes).forEach(([user, data]) => {
          if (data && data.expiresAt && Date.now() < data.expiresAt) {
            _muteList[user] = data.expiresAt;
          }
        });
      } catch(e) {}
      if (window._cRoom) window._startModListener(window._cRoom);
      if (window._deskRoom) window._startModListener(window._deskRoom);
    })();
  }
  setTimeout(() => _initModWhenReady(0), 2000);

  // Global erişim
  window._natureBotMod = {
    muteUser, banUser, notifyAdmins, botSendToRoom, modLog,
    getSettings: () => _modSettings,
    getBadWords: () => _badWords,
    getMuteList: () => _muteList,
    reload: loadModSettings
  };

})();
