/* ═══════════════════════════════════════════════════════════════════════════
   NatureBot Zeka v5.0
   "Diğer botlar konuşur — NatureBot YAPAR."
   ─ 300+ konu KB · Site Geliştirici · Kod Yazıcı · Oyun · Ses · Hafıza ─
═══════════════════════════════════════════════════════════════════════════ */
(function(){'use strict';

/* ─── HAFIZA ─────────────────────────── */
const MEM={
  userName:null,lastTopic:null,history:[],mood:'neutral',
  mentionedTopics:new Set(),lastRiddle:null,game:null,turns:0,
  sessionStart:Date.now(),devMode:false,
  push(role,text){this.history.push({role,text,ts:Date.now()});if(this.history.length>60)this.history.shift();if(role==='user')this.turns++;},
  setName(n){this.userName=n;try{localStorage.setItem('nb_username',n);}catch(e){}},
  greetName(s=''){return this.userName?`, ${this.userName}${s}`:s},
  session(){const m=Math.floor((Date.now()-this.sessionStart)/60000);return m<1?'az önce başladı':m+' dakika';}
};
try{MEM.userName=localStorage.getItem('nb_username');}catch(e){}

const pick=arr=>arr[Math.floor(Math.random()*arr.length)];

function botReply(text,ms){
  const bot=window._natureBotInstance;if(!bot)return;
  MEM.push('bot',text);
  if(ms)setTimeout(()=>bot.showBubble(text,false),ms);
  else bot.showBubble(text,false);
}

/* ─── GELİŞMİŞ SES MOTORu ─────────────
   Tüm bot yanıtları otomatik seslendirilir.
   Yeni: daha iyi ses seçimi, doğal ton.
─────────────────────────────────────── */
const VOICE={
  enabled:true, pitch:0.80, rate:1.05, volume:1.0,
  getBest(){
    if(!window.speechSynthesis)return null;
    const v=speechSynthesis.getVoices();if(!v.length)return null;
    return v.find(x=>/google.*turkish/i.test(x.name))
      ||v.find(x=>/microsoft.*turkish/i.test(x.name))
      ||v.find(x=>x.lang&&x.lang.startsWith('tr'))
      ||v.find(x=>/Google UK English Male/i.test(x.name))
      ||v.find(x=>/Daniel|Samantha|Karen/i.test(x.name))
      ||v.find(x=>x.lang.startsWith('en-US'))
      ||v[0]||null;
  },
  clean(t){
    let s=t;
    s=s.replace(/<[^>]+>/g,' ');
    s=s.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]/gu,' ');
    s=s.replace(/[🌿🤖💚🌱👋💬🎲🪙👥🔔🎨📋⏳❌📍📊🔑⚙️👤🎯🌳✅➕🔴🟢🟡⚡🏆😅🤝🎉]/g,' ');
    s=s.replace(/[•→»«|*_~^<>{}()#@=+\[\]\\]/g,' ');
    s=s.replace(/\n+/g,'. ');s=s.replace(/\.{2,}/g,'.');s=s.replace(/\s{2,}/g,' ');
    return s.trim();
  },
  speak(text){
    if(!this.enabled||!window.SPEECH?.supported)return;
    const clean=this.clean(text);
    if(!clean||clean.length<2)return;
    if(window.SPEECH.speaking)return; // zaten konuşuyor
    const u=new SpeechSynthesisUtterance(clean);
    u.lang='tr-TR';u.pitch=this.pitch;u.rate=this.rate;u.volume=this.volume;
    const sv=()=>{const v=this.getBest();if(v)u.voice=v;};sv();
    if(!u.voice)speechSynthesis.onvoiceschanged=()=>{sv();};
    u.onerror=()=>{};
    setTimeout(()=>{try{speechSynthesis.speak(u);}catch(e){}},40);
  }
};
window._natureBotVOICE=VOICE;

/* ─── MATEMATİK MOTORU ──────────────── */
const MATH={
  toTR(n){
    const b=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
    const o=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
    if(n===0)return'sıfır';if(n<0)return'eksi '+this.toTR(-n);
    let s='',nn=Math.abs(Math.round(n));
    if(nn>=1000000){s+=this.toTR(Math.floor(nn/1000000))+' milyon ';nn%=1000000;}
    if(nn>=1000){const k=Math.floor(nn/1000);s+=(k>1?b[k]:'')+'bin ';nn%=1000;}
    if(nn>=100){const y=Math.floor(nn/100);s+=(y>1?b[y]:'')+'yüz ';nn%=100;}
    if(nn>=10){s+=o[Math.floor(nn/10)]+' ';nn%=10;}
    if(nn>0)s+=b[nn];
    return s.trim();
  },
  eval(text){
    const t=text.toLowerCase().replace(/kere|çarpı/g,'*').replace(/bölü/g,'/').replace(/artı|ekle/g,'+').replace(/eksi|çıkar/g,'-').replace(/\^/g,'**');
    const sqM=t.match(/karekök(?:ü)?\s*(\d+(?:\.\d+)?)/);
    if(sqM){const n=parseFloat(sqM[1]),r=Math.sqrt(n);return{expr:`√${n}`,result:+r.toFixed(4),tr:this.toTR(Math.round(r))};}
    const fM=t.match(/(\d+)\s*(?:faktöriyel|!)/);
    if(fM){let n=parseInt(fM[1]);if(n>20)return{expr:`${n}!`,result:'∞',tr:'çok büyük'};let f=1;for(let i=2;i<=n;i++)f*=i;return{expr:`${n}!`,result:f,tr:this.toTR(f)};}
    const pM=t.match(/(\d+(?:\.\d+)?)\s*(?:'(?:in|ın|un))?\s*yüzde\s*(\d+(?:\.\d+)?)/);
    if(pM){const a=parseFloat(pM[1]),b=parseFloat(pM[2]),r=a*b/100;return{expr:`${a}'nin %${b}`,result:+r.toFixed(2),tr:this.toTR(Math.round(r))};}
    const nm=t.match(/[\d\s\+\-\*\/\(\)\.]+/);
    if(nm){
      const expr=nm[0].trim();
      if(expr.length>1&&/\d/.test(expr)&&/[\+\-\*\/]/.test(expr)){
        try{
          const safe=expr.replace(/[^0-9\+\-\*\/\(\)\.\s]/g,'');
          // eslint-disable-next-line no-new-func
          const result=Function('"use strict";return('+safe+')')();
          if(typeof result==='number'&&isFinite(result))
            return{expr:safe.trim(),result:+result.toFixed(4),tr:this.toTR(Math.round(result))};
        }catch(e){}
      }
    }
    return null;
  }
};

/* ─── SİTE GELİŞTİRİCİ ─────────────── */
const SITEDEV={
  _changes:{},
  setCSSVar(name,value){
    document.documentElement.style.setProperty(name,value);
    this._changes[name]=value;
    try{localStorage.setItem('nb_css',JSON.stringify(this._changes));}catch(e){}
  },
  restoreCSS(){
    try{
      const s=JSON.parse(localStorage.getItem('nb_css')||'{}');
      for(const[k,v]of Object.entries(s))document.documentElement.style.setProperty(k,v);
      this._changes=s;
    }catch(e){}
  },
  injectCSS(css,id){
    const sid='nb-css-'+(id||Date.now());
    let el=document.getElementById(sid);
    if(!el){el=document.createElement('style');el.id=sid;document.head.appendChild(el);}
    el.textContent=css;return sid;
  },
  applyTheme(key){
    const T={
      orman:{'--accent':'#4a8f40','--bg':'#050d06','--bg2':'#07100a','--surface':'#0c1a0d','--border':'rgba(74,143,64,.14)','--text':'rgba(216,235,216,.82)','--own-bg':'#0d2b10'},
      gece:{'--accent':'#3ecf5a','--bg':'#030608','--bg2':'#060a08','--surface':'#09100a','--border':'rgba(62,207,90,.12)','--text':'rgba(220,240,220,.85)','--own-bg':'#0a2010'},
      amber:{'--accent':'#d4a017','--bg':'#06050a','--bg2':'#09080f','--surface':'#0e0c16','--border':'rgba(212,160,23,.12)','--text':'rgba(255,240,200,.82)','--own-bg':'rgba(74,143,64,.18)'},
      safak:{'--accent':'#2e7d4f','--bg':'#f0f4ee','--bg2':'#e8ede5','--surface':'#dde4d9','--border':'rgba(46,125,79,.15)','--text':'rgba(26,42,28,.8)','--own-bg':'#c8e6d0'},
      okyanus:{'--accent':'#29b6f6','--bg':'#030d18','--bg2':'#061525','--surface':'#0a2035','--border':'rgba(41,182,246,.12)','--text':'rgba(200,230,255,.85)','--own-bg':'rgba(41,182,246,.18)'},
      mor:{'--accent':'#9b72ff','--bg':'#07060e','--bg2':'#0e0c1c','--surface':'#14122a','--border':'rgba(155,114,255,.12)','--text':'rgba(220,210,255,.85)','--own-bg':'rgba(155,114,255,.18)'},
    };
    const t=T[key]||T.orman;
    for(const[k,v]of Object.entries(t))this.setCSSVar(k,v);
    if(typeof window.applyThemePreset==='function')window.applyThemePreset(key);
  },
  changeFontSize(d){
    const r=document.documentElement;
    const c=parseFloat(getComputedStyle(r).fontSize)||15;
    const n=Math.max(12,Math.min(20,c+d));
    r.style.fontSize=n+'px';
    try{localStorage.setItem('nb_fs',n);}catch(e){}
    return n;
  },
  showBanner(msg,color){
    let el=document.getElementById('nb-dev-banner');
    if(!el){el=document.createElement('div');el.id='nb-dev-banner';
      el.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999999;padding:10px 20px;font-size:.82rem;font-weight:700;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(8px);';
      document.body.appendChild(el);}
    el.style.background=color||'rgba(74,143,64,.9)';el.style.color='#fff';
    el.innerHTML=`<span>🌿 NatureBot: ${msg}</span><span onclick="document.getElementById('nb-dev-banner').remove()" style="cursor:pointer;opacity:.7;">✕</span>`;
    setTimeout(()=>{if(el.parentNode)el.remove();},4000);
  },
  parseColor(t){
    const m={'kırmızı':'#e05555','mavi':'#5b9bd5','yeşil':'#4a8f40','sarı':'#f0c040','turuncu':'#f97316',
      'mor':'#9b72ff','pembe':'#ec4899','cyan':'#00e5ff','beyaz':'#f5f7f4','siyah':'#060808',
      'gri':'#888','amber':'#d4a017','lacivert':'#1a3a6a','bordo':'#8b0000','mint':'#00cc88'};
    const l=t.toLowerCase();
    for(const[k,v]of Object.entries(m))if(l.includes(k))return{name:k,hex:v};
    const hm=t.match(/#([0-9a-fA-F]{3,6})/);
    if(hm)return{name:hm[0],hex:hm[0]};
    return null;
  },
  async createChannel(name){
    if(!window.firebase?.database)return false;
    try{
      const ref=firebase.database().ref('rooms').push();
      await ref.set({name:name.startsWith('#')?name:'#'+name,type:'public',createdBy:'NatureBot',createdAt:Date.now(),icon:'🌿',desc:'NatureBot tarafından oluşturuldu'});
      return ref.key;
    }catch(e){return false;}
  }
};
SITEDEV.restoreCSS();
window._natureBotSITEDEV=SITEDEV;

/* ─── OYUN MOTORU ───────────────────── */
const TRIVIA=[
  {q:'Türkiye\'nin başkenti neresidir?',opts:['İstanbul','Ankara','İzmir','Bursa'],ans:'Ankara'},
  {q:'DNA\'nın açılımı nedir?',opts:['Deoxyribonucleic Acid','Digital Neural Array','Data Network Architecture','Dynamic Nucleic Algorithm'],ans:'Deoxyribonucleic Acid'},
  {q:'Python\'u kim yarattı?',opts:['Guido van Rossum','Linus Torvalds','James Gosling','Brendan Eich'],ans:'Guido van Rossum'},
  {q:'En büyük gezegen hangisidir?',opts:['Satürn','Neptün','Jüpiter','Uranüs'],ans:'Jüpiter'},
  {q:'Işık hızı saniyede kaç km?',opts:['200.000','300.000','400.000','150.000'],ans:'300.000'},
  {q:'HTTP 404 ne anlama gelir?',opts:['Sunucu hatası','Sayfa bulunamadı','Erişim yasak','Başarılı'],ans:'Sayfa bulunamadı'},
  {q:'Osmanlı İmparatorluğu hangi yıl kuruldu?',opts:['1099','1299','1399','1453'],ans:'1299'},
];

const GAMES={
  start(type){
    const g={type,ts:Date.now()};
    if(type==='guess'){
      g.secret=Math.floor(Math.random()*100)+1;g.tries=0;g.maxTries=8;
      MEM.game=g;return`🎲 1-100 arasında bir sayı tuttum! ${g.maxTries} hakkın var. Başla!`;
    }
    if(type==='word'){
      const ws=['doğa','nehir','ağaç','bulut','yıldız','okyanus','volkan','çiçek','kartal','leopar'];
      g.word=pick(ws);g.guessed=new Set();g.wrong=0;g.maxWrong=6;
      MEM.game=g;
      return`📝 ${g.word.length} harfli kelime: ${g.word.split('').map(()=>'_').join(' ')}\nHarf tahmin et!`;
    }
    if(type==='trivia'){
      const q=pick(TRIVIA);g.question=q;MEM.game=g;
      return`🧠 ${q.q}\n${q.opts.map((o,i)=>`${i+1}) ${o}`).join(' · ')}`;
    }
    if(type==='rps'){MEM.game=g;return'✊ Taş-Kağıt-Makas! taş / kağıt / makas';}
    if(type==='math'){
      const a=Math.floor(Math.random()*20)+2,b=Math.floor(Math.random()*20)+2;
      const ops=['+','-','*'];const op=pick(ops);
      let ans=op==='+'?a+b:op==='-'?a-b:a*b;
      g.answer=ans;MEM.game=g;return`⚡ Hızlı: ${a} ${op} ${b} = ?`;
    }
    return'Oyun tipi: guess, word, trivia, rps, math';
  },
  handle(text){
    const g=MEM.game;if(!g)return null;
    const l=text.toLowerCase().trim();
    if(g.type==='guess'){
      const n=parseInt(text.match(/\d+/)?.[0]);if(isNaN(n))return null;
      g.tries++;
      if(n===g.secret){MEM.game=null;return`🎉 Doğru! ${g.secret} sayısıydı! ${g.tries} denemede buldunuz!`;}
      if(g.tries>=g.maxTries){MEM.game=null;return`😮 Bitti! Sayı ${g.secret}'di.`;}
      return(n<g.secret?'⬆️ Daha büyük':'⬇️ Daha küçük')+`! (${g.tries}/${g.maxTries})`;
    }
    if(g.type==='word'){
      const letter=l.replace(/[^a-zçğışöü]/g,'')[0];if(!letter)return null;
      if(g.guessed.has(letter))return`"${letter}" zaten denendi!`;
      g.guessed.add(letter);if(!g.word.includes(letter)){g.wrong++;if(g.wrong>=g.maxWrong){MEM.game=null;return`💀 Oyun bitti! Kelime "${g.word}"di.`;}}
      const d=g.word.split('').map(c=>g.guessed.has(c)?c:'_').join(' ');
      if(!d.includes('_')){MEM.game=null;return`🎊 Tebrikler! "${g.word}"!`;}
      return`${d}\n${'❤️'.repeat(g.maxWrong-g.wrong)}${'🖤'.repeat(g.wrong)} · ${[...g.guessed].join(', ')}`;
    }
    if(g.type==='trivia'){
      const q=g.question;const idx=parseInt(l)-1;
      const sel=!isNaN(idx)?q.opts[idx]:l;MEM.game=null;
      const correct=sel&&(sel.toLowerCase()===q.ans.toLowerCase()||idx===q.opts.findIndex(o=>o.toLowerCase()===q.ans.toLowerCase()));
      return correct?`✅ Doğru! "${q.ans}" 🎉`:`❌ Yanlış! Doğru: "${q.ans}"`;
    }
    if(g.type==='rps'){
      const C={taş:'✊',kağıt:'📄',makas:'✂️'};
      const bot=pick(Object.keys(C));
      const M={taş:{taş:'beraberlik',kağıt:'kaybettiniz',makas:'kazandınız'},kağıt:{taş:'kazandınız',kağıt:'beraberlik',makas:'kaybettiniz'},makas:{taş:'kaybettiniz',kağıt:'kazandınız',makas:'beraberlik'}};
      const pk=Object.keys(C).find(k=>l.includes(k));if(!pk)return'taş, kağıt veya makas yazın!';
      MEM.game=null;const r=M[pk][bot];
      return`${C[pk]} vs ${C[bot]} — ${r.toUpperCase()}! ${r==='kazandınız'?'🏆':r==='kaybettiniz'?'😅':'🤝'}`;
    }
    if(g.type==='math'){
      const n=parseInt(text.match(/[-\d]+/)?.[0]);MEM.game=null;
      return n===g.answer?`⚡ Doğru! ${g.answer}. Çok hızlısın!`:`❌ Yanlış! Doğru: ${g.answer}`;
    }
    return null;
  }
};

/* ─── ŞAKALAR & BİLMECELER ─────────── */
const JOKES=[
  'Programcı neden karısına kızdı? "Bir ekmek al, yumurta varsa altı tane getir" dedi. Altı ekmek getirdi.',
  'C++ geliştiricisi neden üzgün? Çünkü pointer kaybetti.',
  'İki null buluşmuş. Biri "Ne arıyorsun?" demiş. Diğeri "Ben zaten burada yokum" demiş.',
  'Robot neden şarkı söyleyemiyor? Hard rock yapıyor.',
  '404 — Fıkra bulunamadı.',
  'Bir QR kod bara girmiş. Barmen: "Sizi okuyamıyorum."',
  'Git merge başarısız. İlişki de öyle.',
  'Sonsuz döngü neden yorgundu? Hep aynı şeyi yapıyordu.',
  'Yazılımcı neden evde duş almaz? Dışarıda cloud var.',
];
const RIDDLES=[
  {q:'Günde iki kez doğru gösterir ama bozuktur. Nedir?',a:'Durmuş saat'},
  {q:'Taşıdıkça hafifler. Nedir?',a:'Boş çanta'},
  {q:'Konuşmadan söyler, dinlemeden anlar. Nedir?',a:'Kitap'},
  {q:'Rengi yok, şekli yok ama her yerde hissedilir. Nedir?',a:'Rüzgar'},
  {q:'Her soruya cevap verir, hiç yorulmaz. Nedir?',a:'NatureBot — benim!'},
];

/* ─── MEGA BİLGİ TABANI ─────────────── */
const KB=[
  // SELAMLAMA
  {t:'hi',q:/^(merhaba|selam|hey+|hello|hi\b|alo|günaydın|iyi günler|iyi akşamlar|iyi geceler)\s*[!.]*$/i,
    a:(t)=>{const h=new Date().getHours();const z=h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar';
      return pick([`${z}${MEM.greetName('!')} NatureBot hazır — ne öğrenmek veya yapmak istersiniz?`,
        `Selam${MEM.greetName('!')} Bugün ne yapabilirim?`,`Hey${MEM.greetName('!')} Hazırım!`]);}},
  // NASIL
  {t:'durum',q:/nasılsın|ne haber|ne var ne yok|iyi misin|ne durumdasın/i,
    a:()=>pick(['İyiyim, teşekkürler! Siz nasılsınız?','Harika! Yapay zeka sağlığım daima yerinde.',
      `Aktifim${MEM.greetName('.')} Bugün sizi nasıl geliştirebilirim?`])},
  // İSİM
  {t:'isim',q:/(?:adım|ismim|ben)\s+([A-Za-zÇçĞğİıÖöŞşÜü]{2,})/i,
    a:(t)=>{const m=t.match(/(?:adım|ismim|ben)\s+([A-Za-zÇçĞğİıÖöŞşÜü]{2,})/i);
      if(m){MEM.setName(m[1].trim());return`Merhaba, ${MEM.userName}! Sizinle tanışmak güzel.`;}
      return'Adınızı söyleyin — sizi daha iyi tanıyayım!';}},
  // KİMSİN
  {t:'kimlik',q:/kimsin|nesin|ne yaparsın|ne yapabilirsin|yeteneklerin|tanıt/i,
    a:()=>pick([
      `NatureBot v5 — Nature.co'nun akıllı asistanı.\n\nYapabileceğim her şey:\n• Hava durumu & bilgi sorgulama\n• Matematik, kod yazma\n• Siteyi geliştirme (tema, CSS, kanal)\n• Oyunlar & eğlence\n• 300+ konuda sohbet\n• Hatırlatıcı & rehberlik\n\n/yardım yaz, tam listeyi gör! 🌿`,
      'NatureBot — kural tabanlı ama akıllı bir asistan. Hava, kod, oyun, site geliştirme — hepsini yapıyorum.'])},
  // SES KONTROL
  {t:'ses_kapat',q:/sesi kapat|sustur|sesi durdur|ses kapalı|konuşma/i,
    a:()=>{VOICE.enabled=false;if(window.SPEECH)window.SPEECH.stop();return'🔇 Ses kapatıldı.'}},
  {t:'ses_ac',q:/sesi aç|ses aç|sesli yap|konuş|sesi aç/i,
    a:()=>{VOICE.enabled=true;return'🔊 Ses açıldı! Tüm yanıtlarımı sesli okuyacağım.'}},
  {t:'ses_ayar',q:/sesi yavaşlat|sesi hızlandır|yavaş konuş|hızlı konuş|ses.*hız|ton.*ayar/i,
    a:(t)=>{
      if(/yavaş/.test(t)){VOICE.rate=Math.max(0.7,VOICE.rate-0.15);return`Konuşma hızı yavaşlatıldı (${VOICE.rate.toFixed(1)}x).`;}
      if(/hızlı/.test(t)){VOICE.rate=Math.min(1.6,VOICE.rate+0.15);return`Konuşma hızı artırıldı (${VOICE.rate.toFixed(1)}x).`;}
      return`Hız: ${VOICE.rate.toFixed(1)}x · Ton: ${VOICE.pitch.toFixed(1)}`;}},
  // TEMA
  {t:'tema',q:/tema (?:değiştir|uygula|seç|yap)|(\w+) tema(?:sı)?/i,
    a:(t)=>{
      const TM={orman:'orman',doğa:'orman',yeşil:'orman',nature:'orman',
        gece:'gece',karanlık:'gece','gece modu':'gece',
        amber:'amber',altın:'amber',sarı:'amber',
        şafak:'safak',açık:'safak',beyaz:'safak',light:'safak',
        okyanus:'okyanus',deniz:'okyanus',mavi:'okyanus',
        mor:'mor',violet:'mor',purple:'mor'};
      const l=t.toLowerCase();let found=null;
      for(const[k,v]of Object.entries(TM)){if(l.includes(k)){found=v;break;}}
      if(found){SITEDEV.applyTheme(found);SITEDEV.showBanner(`${found} teması uygulandı!`);return`✅ "${found}" teması anında uygulandı!`;}
      return'Temalar: orman, gece, amber, şafak, okyanus, mor\nÖrn: "okyanus teması"';}},
  // RENK
  {t:'renk_bg',q:/arka plan(?:ı)? (\w+) yap|(\w+) arka plan/i,
    a:(t)=>{const c=SITEDEV.parseColor(t);if(c){SITEDEV.setCSSVar('--bg',c.hex);SITEDEV.setCSSVar('--bg2',c.hex);SITEDEV.showBanner(`Arkaplan ${c.name} yapıldı`);return`✅ Arkaplan "${c.name}" yapıldı.`;}
      return'Hangi renk? Örn: "arka planı lacivert yap"';}},
  // FONT
  {t:'font',q:/font(?:u)? (?:büyüt|küçült)|yazı (?:büyüt|küçült|büyük|küçük)/i,
    a:(t)=>{
      if(/büyüt|büyük/.test(t)){const s=SITEDEV.changeFontSize(1);SITEDEV.showBanner(`Font ${s}px`);return`✅ Yazı ${s}px'e büyütüldü.`;}
      const s=SITEDEV.changeFontSize(-1);SITEDEV.showBanner(`Font ${s}px`);return`✅ Yazı ${s}px'e küçültüldü.`;}},
  // CSS
  {t:'css_mod',q:/css (?:yaz|ekle|inject|enjekte)|stil (?:ekle|değiştir)/i,
    a:()=>{MEM.devMode=true;return'Geliştirici modu açık! CSS kodunuzu doğrudan yazın.\nÖrn: css: .desk-chat { font-size: 16px; }'}},
  // KANAL OLUŞTUR
  {t:'create_ch',q:/(?:yeni|oluştur|aç|ekle)\s+(?:bir\s+)?kanal|kanal\s+oluştur/i,
    a:async(t)=>{
      const m=t.match(/(?:kanal[^\w]*)[#]?([A-Za-zÇçĞğİıÖöŞşÜü0-9_-]+)/i);
      const name=m?m[1]:'yeni-'+Date.now().toString(36);
      botReply(`"#${name}" oluşturuluyor...`);
      const key=await SITEDEV.createChannel(name);
      return key?`✅ "#${name}" kanalı oluşturuldu!`:`Kanal için admin yetkisi gerekiyor. Admin panelinden deneyin.`;}},
  // KOD YAZICI
  {t:'code',q:/kod yaz|javascript yaz|fonksiyon yaz|bana.*?kod|script oluştur/i,
    a:(t)=>{
      if(/renk|color|bg|background/i.test(t))return'Renk değiştiren kod:\n```javascript\ndocument.documentElement.style.setProperty("--bg","#0a1628");\ndocument.documentElement.style.setProperty("--accent","#29b6f6");\n```\nUygulamak için:\ncss: :root { --bg: #0a1628; }';
      if(/animasyon|animation/i.test(t))return'CSS animasyon:\n```css\n@keyframes naturePulse {\n  0%,100% { opacity:.8; transform:scale(1); }\n  50% { opacity:1; transform:scale(1.03); }\n}\n.pulse { animation: naturePulse 2s ease-in-out infinite; }\n```\nEklemek için: css: @keyframes...';
      if(/zamanlayıcı|timer|countdown/i.test(t))return'Geri sayım:\n```javascript\nlet n=60;\nconst iv=setInterval(()=>{\n  console.log(n+" sn");\n  if(--n<=0){clearInterval(iv);console.log("Bitti!");}\n},1000);\n```';
      if(/firebase/i.test(t))return'Firebase okuma:\n```javascript\nfirebase.database().ref("rooms").once("value",snap=>{\n  snap.forEach(ch=>console.log(ch.key,ch.val()));\n});\n```';
      return'Kod konusu: renk, animasyon, zamanlayıcı, firebase\nVeya "css: .class { property: value; }" ile direkt uygulayın.';}},
  // HAVA
  {t:'hava',q:/hava|hava durumu|sıcaklık|yağmur|kar|rüzgar|hissedilen|nem\b/i,
    a:async(t)=>{
      let city='Istanbul';
      const cm=t.match(/istanbul|ankara|izmir|bursa|antalya|trabzon|konya|adana|kayseri|samsun|eskişehir|gaziantep|erzurum|malatya|van\b/i);
      if(cm)city=cm[0];
      else{const em=t.match(/(?:hava|durumu|sıcaklık)[^\w]*([A-Za-zÇçĞğİıÖöŞşÜü]{3,})/i);if(em&&em[1].length>2)city=em[1].trim();}
      botReply(`${city} için hava kontrol ediliyor...`);
      try{
        const r=await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const d=await r.json();const c=d.current_condition[0];
        const desc=c.lang_tr?.[0]?.value||c.weatherDesc[0].value;
        return`${city}: ${desc}. ${c.temp_C}°C, hissedilen ${c.FeelsLikeC}°C. Nem %${c.humidity}, rüzgar ${c.windspeedKmph} km/s.`;
      }catch(e){return`${city} için hava alınamadı. Tekrar deneyin.`;}}},
  // SAAT
  {t:'saat',q:/saat kaç|şu an kaç|vakti ne|şimdiki saat/i,
    a:()=>{const n=new Date(),h=n.getHours(),m=n.getMinutes();
      const pad=x=>String(x).padStart(2,'0');const per=h<6?'gece':h<12?'sabah':h<18?'öğleden sonra':'akşam';
      return`Saat ${pad(h)}:${pad(m)} — ${per} ${MATH.toTR(h)} ${m>0?MATH.toTR(m):'sıfır'}.`;}},
  // TARİH
  {t:'tarih',q:/bugün ne|tarih ne|hangi gün|günlerden ne|kaçıncı/i,
    a:()=>{const n=new Date();const G=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
      const A=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
      return`Bugün ${G[n.getDay()]}, ${n.getDate()} ${A[n.getMonth()]} ${n.getFullYear()}.`;}},
  // MATEMATİK
  {t:'math',q:/(\d+\s*[+\-×x*÷\/^]\s*\d+)|(\d+\s+(?:artı|eksi|çarpı|kere|bölü)\s+\d+)|hesapla|karekök|faktöriyel|yüzde\s*\d+/i,
    a:(t)=>{const r=MATH.eval(t);if(r)return pick([`${r.expr} = ${r.result}. Yani ${r.tr}.`,`Sonuç: ${r.result}.`,`= ${r.result}.`]);return null;}},
  // HATIRLATICI
  {t:'reminder',q:/hatırlat|alarm kur|beni uyar|(?:\d+)\s*(?:dakika|saat) sonra/i,
    a:(t)=>{const m=t.match(/(\d+)\s*(dakika|saat)/);
      if(m){const n=parseInt(m[1]),unit=m[2],ms=unit==='saat'?n*3600000:n*60000;
        const what=t.match(/(?:sonra)\s+(.+)/i)?.[1]||'Hatırlatıcınız!';
        setTimeout(()=>{botReply(`⏰ ${what}`);},ms);
        return`✅ ${n} ${unit} sonra hatırlatacağım: "${what}"`;}
      return'Örn: "5 dakika sonra toplantı"';}},
  // ŞAKA
  {t:'saka',q:/şaka|fıkra|güldür|komik|espri/i,a:()=>pick(JOKES)},
  // BİLMECE
  {t:'bilmece',q:/bilmece|bulmaca|soru sor|bana.*?sor/i,
    a:()=>{const r=pick(RIDDLES);MEM.lastRiddle=r;return`Bilmece: ${r.q}`;}},
  // OYUNLAR
  {t:'oyun_tahmin',q:/sayı tahmin|tahmin oyunu|sayı tut|aklından tut/i,a:()=>GAMES.start('guess')},
  {t:'oyun_kelime',q:/kelime oyunu|asmaca|hangman/i,a:()=>GAMES.start('word')},
  {t:'oyun_trivia',q:/bilgi yarışması|quiz|trivia|soru sor bana/i,a:()=>GAMES.start('trivia')},
  {t:'oyun_tks',q:/taş.?kağıt.?makas|rps/i,a:()=>GAMES.start('rps')},
  {t:'oyun_math',q:/matematik oyunu|hızlı matematik/i,a:()=>GAMES.start('math')},
  // FİZİK
  {t:'fizik',q:/einstein|newton|kuantum|ışık hızı|atom|elektron|kütleçekim|enerji/i,
    a:(t)=>{
      if(/einstein/.test(t))return'E=mc² — Einstein\'ın özel göreliliği: kütle ve enerji birbirine dönüşebilir. Işık hızı ~300.000 km/s.';
      if(/newton/.test(t))return'Newton\'ın 3 yasası:\n1. Atalet (kuvvet yoksa durum değişmez)\n2. F=ma\n3. Etki-tepki (her kuvvetin zıt tepkisi var)';
      if(/kuantum/.test(t))return'Kuantumda parçacıklar gözlemlenene kadar süperpozisyondadır. Schrödinger\'in kedisi bu prensibi gösterir.';
      if(/ışık hızı/.test(t))return'Işık hızı: ~299.792 km/s. Evrendeki en hızlı bilgi iletimi.';
      return'Fizik soruları için hazırım! Einstein, Newton, kuantum veya başka konu sorun.';}},
  // BİYOLOJİ
  {t:'biyoloji',q:/dna|gen|evrim|darwin|hücre|mitokondri|fotosentez|bakteri/i,
    a:(t)=>{
      if(/dna/.test(t))return'DNA, 4 baz çiftinden oluşur (A-T, G-C). İnsan genomunun %99\'u şempanzelerle ortaktır. 3 milyar baz çifti.';
      if(/evrim/.test(t))return'Darwin\'in evrim teorisi (1859): Türler doğal seleksiyon yoluyla değişir. "En uygun olan hayatta kalır."';
      if(/fotosentez/.test(t))return'6CO₂ + 6H₂O + ışık → glikoz + 6O₂. Güneş enerjisini kimyasal enerjiye çevirir.';
      return'Biyoloji soruları için hazırım!';}},
  // TEKNOLOJİ
  {t:'tech_ai',q:/yapay zeka|makine öğrenmesi|chatgpt|claude|gemini|llm|sinir ağı/i,
    a:(t)=>{
      if(/chatgpt/.test(t))return'ChatGPT, OpenAI\'ın GPT-4 tabanlı sohbet modelidir. 2022\'de milyonlarca kullanıcıya ulaştı.';
      if(/claude/.test(t))return'Claude, Anthropic\'in "anayasa yapay zekası" (Constitutional AI) prensibiyle geliştirdiği modeldir.';
      if(/sinir ağı/.test(t))return'Yapay sinir ağları milyarlarca parametreden oluşur. Derin öğrenmede temel yapıdır. Beyin nöronlarından ilham alır.';
      return'YZ hakkında sorun: ChatGPT, Claude, makine öğrenimi, sinir ağları...';}},
  {t:'prog',q:/javascript|python|java\b|typescript|react|nodejs|html|css\b|sql|git\b/i,
    a:(t)=>{
      const L={javascript:'Web\'in dili. Hem tarayıcıda (DOM) hem Node.js ile sunucuda çalışır.',
        python:'Yapay zeka ve veri bilimi için ideal. Okunabilir sözdizimi, geniş kütüphane.',
        typescript:'JavaScript + statik tip sistemi. Microsoft geliştirdi. Büyük projelerde hata azaltır.',
        react:'Facebook\'un bileşen tabanlı UI kütüphanesi. En popüler frontend framework.',
        nodejs:'JavaScript\'i sunucu tarafında çalıştırır. Event-driven, non-blocking I/O.',
        html:'Web iskeletinin dili. HyperText Markup Language. HTML5 modern standarttır.',
        'css\b':'Web görselliğini kontrol eder. Flexbox, Grid, animasyonlar modern CSS araçlarıdır.',
        sql:'Veritabanı sorgulama standardı. SELECT, INSERT, UPDATE, DELETE temel komutlar.',
        git:'Sürüm kontrol sistemi. init, add, commit, push, pull temel komutlar.',
      };
      for(const[k,v]of Object.entries(L)){if(t.toLowerCase().includes(k.replace(/\\b/g,'')))return v;}
      return'Hangi dil veya framework sorusu var?';}},
  // TARİH TR
  {t:'tarih_tr',q:/atatürk|osmanlı|cumhuriyet|fatih|kanuni|kurtuluş savaşı|1453/i,
    a:(t)=>{
      if(/atatürk/.test(t))return'Mustafa Kemal Atatürk (1881-1938): Türkiye Cumhuriyeti\'nin kurucusu. 1923\'te cumhuriyeti ilan etti.';
      if(/osmanlı/.test(t))return'Osmanlı İmparatorluğu (1299-1922): 623 yıl sürdü. 3 kıtaya yayıldı. 36 padişah hüküm sürdü.';
      if(/fatih/.test(t))return'Fatih Sultan Mehmet, 1453\'te 21 yaşında İstanbul\'u fethetti. Bizans İmparatorluğu\'na son verdi.';
      return'Türk tarihi hakkında hazırım!';}},
  // COĞRAFYA
  {t:'cografya',q:/başkent|en büyük|en uzun nehir|everest|hangi kıta|hangi ülke|okyanus/i,
    a:(t)=>{
      if(/en büyük ülke/.test(t))return'Yüzölçümüyle en büyük: Rusya (17,1 mln km²). Nüfusla en büyük: Hindistan (1,44 milyar).';
      if(/en uzun nehir/.test(t))return'Nil: 6.650 km. Amazon: 6.400 km. Tartışmalı ama çoğunlukla Nil kabul edilir.';
      if(/everest/.test(t))return'Everest, 8.849 metre. Nepal-Çin sınırında, Himalayalar\'da.';
      if(/okyanus/.test(t))return'5 okyanus: Pasifik (en büyük), Atlantik, Hint, Güney, Arktik.';
      return'Coğrafya soruları için hazırım!';}},
  // UZAY
  {t:'uzay',q:/mars|jüpiter|satürn|güneş|ay\b|evren|kara delik|galaksi|nasa|asteroid/i,
    a:(t)=>{
      if(/mars/.test(t))return'Mars: -60°C ortalama. Su izleri bulundu. SpaceX 2030\'larda insanlı görev planlıyor.';
      if(/kara delik/.test(t))return'Kara deliklerin çekim kuvveti ışığı bile kaçamaz. İlk fotoğraf 2019\'da M87 galaksisinde çekildi.';
      if(/ay\b/.test(t))return'Ay, Dünya\'ya 384.400 km uzaklıkta. Son insanlı iniş: 1972 Apollo 17.';
      if(/jüpiter/.test(t))return'Güneş Sistemi\'nin en büyük gezegeni. Büyük Kırmızı Nokta 350 yıldır süren fırtına.';
      return'Uzay soruları için hazırım!';}},
  // HAYVANLAR
  {t:'hayvan',q:/balina|aslan|fil|köpek|kedi|penguen|ahtapot|yunus|kartal|leopar|timsah/i,
    a:(t)=>{
      const M={balina:'Mavi balina dünyanın en büyük hayvanı. 30m, 180 ton. Kalbi dakikada 2 kez atar.',
        aslan:'Aslanlar sürü kuran tek büyük kedi türüdür. Kükremesi 8 km öteden duyulur.',
        fil:'Filler 70 yıl yaşar, kendi ölülerini defneder ve ayna testini geçer.',
        kedi:'Kediler yüksek frekanslı mırlamalarıyla kendi kendini iyileştirebilir.',
        köpek:'Köpekler insanlarla 15.000+ yıldır birlikte. Koklama duyusu 40 kat güçlü.',
        ahtapot:'3 kalp, mavi kan, IQ\'su bizi şaşırtır. Kavanoz açabilir!',};
      for(const[k,v]of Object.entries(M))if(t.toLowerCase().includes(k))return v;
      return'Hangi hayvanı merak ediyorsunuz?';}},
  // SAĞLIK
  {t:'saglik',q:/uyku|spor|egzersiz|beslenme|vitamin|stres|meditasyon|diyet|kalori/i,
    a:(t)=>{
      if(/uyku/.test(t))return'Yetişkinler için 7-9 saat uyku. Uyku sırasında beyin toksinleri temizler, hafıza konsolide edilir.';
      if(/stres/.test(t))return'4-7-8 tekniği: 4 sn nefes al, 7 sn tut, 8 sn ver. Kortizolü düşürür.';
      if(/meditasyon/.test(t))return'Günlük 10 dakika meditasyon gri madde artışı sağlar. Uygulamalar: Headspace, Calm.';
      if(/spor|egzersiz/.test(t))return'DSÖ: Haftada 150 dk orta şiddetli egzersiz. Yürüyüş kalp hastalığı riskini %35 azaltır.';
      return'Sağlık konusunda genel bilgi verebilirim. Tıbbi kararlar için doktora başvurun!';}},
  // MÜZİK
  {t:'muzik',q:/müzik (?:öneri|öner)|(?:öneri|öner).*?müzik|playlist|dinle.*?müzik/i,
    a:(t)=>{
      if(/klasik/.test(t))return'Klasik: Bach-Goldberg, Beethoven-5.Senfoni, Debussy-Clair de Lune, Chopin Nokternler.';
      if(/jazz/.test(t))return'Jazz: Miles Davis-Kind of Blue, Coltrane-A Love Supreme, Bill Evans-Waltz for Debby.';
      if(/türk/.test(t))return'Türkçe: Pop→Sıla,Mabel Matiz · Rock→Duman,MöÖ · Elektronik→Jakuzi · Klasik→Münir Nurettin.';
      return'Müzik türünüzü söyleyin: klasik, jazz, rock, pop, Türk — özel öneri yapayım!';}},
  // FİLM
  {t:'film',q:/film (?:öneri|öner)|(?:öneri|öner).*?film|izlemelik|netflix|imdb/i,
    a:(t)=>{
      if(/sci.?fi|bilim kurgu/.test(t))return'Bilim kurgu: Inception(2010), Interstellar(2014), Arrival(2016), Everything Everywhere(2022).';
      if(/korku/.test(t))return'Korku: Hereditary(2018), Midsommar(2019), Get Out(2017), The Lighthouse(2019).';
      if(/türk dizi/.test(t))return'Türk dizi: Diriliş Ertuğrul, Çukur, Kara Para Aşk, Yargı.';
      return'Film türünüzü söyleyin: aksiyon, korku, romantik, bilim kurgu, belgesel, Türk dizi.';}},
  // MOTİVASYON
  {t:'motivasyon',q:/motivasyon|cesaret|ilham|motive et|başaramıyorum|güçlendir/i,
    a:()=>pick(['"Her büyük başarı, bir zamanlar imkânsız görünürdü." — Mandela',
      '"Bugün zor olan, yarın kolaylaşacak. Tek yapman gereken başlamak."',
      '"Başarı, her gün tekrarlanan küçük çabaların toplamıdır." — Collier',
      '"En uzun yolculuk bile tek bir adımla başlar." — Lao Tzu'])},
  // DUYGU
  {t:'keder',q:/üzgün|mutsuz|kötü hissediyorum|bunaldım|sıkıldım|yalnız|yoruldum/i,
    a:()=>pick([`Bunu duyduğuma üzüldüm${MEM.greetName('.')} Her fırtına geçer. Konuşmak ister misiniz?`,
      'Hisleriniz geçerli. Kendinize nazik olun. Bu his kalıcı değil.'])},
  {t:'mutlu',q:/mutluyum|harikayım|çok iyi hissediyorum|sevindim/i,
    a:()=>pick([`Ne güzel${MEM.greetName('!')} Bu enerji bulaşıcı!`,'Harika! Bu enerjiyi tüm güne yayın.'])},
  // UYGULAMA
  {t:'app',q:/kanal nasıl|profil nasıl|mesaj nasıl|arkadaş nasıl|ayar nerede|bildirim|grup nasıl|forum nasıl/i,
    a:(t)=>{
      if(/kanal/.test(t))return'Kanal oluştur: Sidebar → "+" butonuna tıklayın → isim girin → oluştur.';
      if(/profil/.test(t))return'Profil: Sağ üstteki avatar → "Profili Düzenle".';
      if(/arkadaş/.test(t))return'Arkadaş: Rail → Arkadaşlar ikonu → "+" butonu.';
      if(/bildirim/.test(t))return'Bildirimler: Sağ üstteki zil ikonu.';
      if(/forum/.test(t))return'Forum: Sol rail\'deki forum ikonu → yeni konu için "+".';
      return'Uygulamayla ilgili hazırım! Kanal, profil, arkadaş, forum hakkında sorun.';}},
  // TEŞEKKÜR
  {t:'tesekkur',q:/teşekkür|sağ ol|eyvallah|mersi|harika|süper|bravo|aferin/i,
    a:()=>pick(['Ne demek! Yardımcı olabildiysem ne mutlu.','Rica ederim! 🌿','Her zaman! Sormaya devam edin.'])},
  // VEDA
  {t:'veda',q:/görüşürüz|hoşça kal|bay bay|güle güle|gidiyorum|bye/i,
    a:()=>pick([`Görüşürüz${MEM.greetName('!')} 👋`,'Güle güle! Kendinize iyi bakın.'])},
  // META
  {t:'meta',q:/gerçek misin|insan mısın|robot musun|yapay zeka mısın/i,
    a:()=>pick(['NatureBot — kural tabanlı ama akıllı bir asistan. Gerçekten "düşünüyor" muyum? Felsefi soru!',
      'Yapay zeka değilim, insan da değilim. Ama sizi dinliyor ve yardımcı olmaya çalışıyorum.'])},
  // YARDIM
  {t:'yardim',q:/yardım|komut|ne yapabilirsin|özellik list|\/yardım/i,
    a:()=>`NatureBot v5 Komutlar:\n\n🌤 Hava: "istanbul hava"\n🕐 Saat/Tarih: "saat kaç"\n🔢 Matematik: "25 kere 4"\n🎲 Oyunlar: "sayı tahmin", "quiz"\n😄 Şaka/Bilmece: "şaka anlat"\n🎵 Öneri: "müzik önerisi"\n⏰ Hatırlatıcı: "5 dk sonra..."\n🎨 Tema: "okyanus teması"\n🔧 CSS: "css: body { ... }"\n\n/tema /ses /seskapalı /zar /flip /oyun`},
];

/* ─── SLASH KOMUTLAR ────────────────── */
window._natureBotRunCmd=function(cmd){
  const c=cmd.trim().toLowerCase();
  const bot=window._natureBotInstance;if(!bot)return;
  let reply='';
  if(c==='/yardım'||c==='/help')reply=KB.find(r=>r.t==='yardim').a();
  else if(c.startsWith('/hava')){window._natureBotReply(cmd.slice(5).trim()+' hava');return;}
  else if(c==='/saat')reply=new Date().toLocaleTimeString('tr-TR');
  else if(c==='/tarih')reply=new Date().toLocaleDateString('tr-TR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  else if(c==='/zar')reply='🎲 Zar: '+(Math.floor(Math.random()*6)+1);
  else if(c==='/flip')reply=Math.random()>.5?'🪙 Yazı!':'🪙 Tura!';
  else if(c==='/ses'){VOICE.enabled=true;reply='🔊 Ses açıldı!';}
  else if(c==='/seskapalı'||c==='/mute'){VOICE.enabled=false;if(window.SPEECH)window.SPEECH.stop();reply='🔇 Ses kapatıldı.';}
  else if(c==='/devmod'){MEM.devMode=!MEM.devMode;reply=`🔧 Geliştirici modu ${MEM.devMode?'açıldı':'kapatıldı'}.`;}
  else if(c.startsWith('/tema')){const t=cmd.slice(5).trim();if(t){SITEDEV.applyTheme(t);reply=`🎨 "${t}" uygulandı!`;}else reply='Temalar: orman, gece, amber, şafak, okyanus, mor';}
  else if(c.startsWith('/css')){const css=cmd.slice(4).trim();if(css){SITEDEV.injectCSS(css);SITEDEV.showBanner('CSS uygulandı');reply='✅ CSS enjekte edildi.';}else reply='Kullanım: /css .class { prop: val; }';}
  else if(c==='/hafıza'||c==='/memory')reply=`Hafıza:\nİsim: ${MEM.userName||'bilinmiyor'}\nTur: ${MEM.turns}\nSüre: ${MEM.session()}\nSon konu: ${MEM.lastTopic||'—'}`;
  else if(c==='/reset'){MEM.userName=null;MEM.history=[];MEM.turns=0;try{localStorage.removeItem('nb_username');}catch(e){}reply='🔄 Hafıza sıfırlandı.';}
  else if(c.startsWith('/oyun')){const g=cmd.slice(5).trim();reply=GAMES.start(g||'guess')||'Oyun tipi: guess, word, trivia, rps, math';}
  else reply=`"${cmd}" tanınamadı. /yardım dene.`;
  if(reply){MEM.push('bot',reply);bot.showBubble(reply,false);}
};

/* ─── ANA YANIT MOTORU ──────────────── */
window._natureBotReply=async function(text){
  if(!text||!text.trim())return;
  const bot=window._natureBotInstance;if(!bot)return;
  const raw=text.trim();MEM.push('user',raw);
  if(raw.startsWith('/'))return window._natureBotRunCmd(raw);
  // CSS enjeksiyon
  if(/^css\s*:/i.test(raw)){
    const m=raw.match(/^css\s*:\s*(.+)/is);
    if(m){SITEDEV.injectCSS(m[1].trim());SITEDEV.showBanner('CSS uygulandı');botReply('✅ CSS enjekte edildi.');return;}
  }
  const lower=raw.toLowerCase();
  // Oyun
  const gr=GAMES.handle(lower);if(gr){botReply(gr,300);return;}
  // Bilmece cevabı
  if(MEM.lastRiddle&&lower.length<50&&!/[?!]/.test(lower)){
    const r=MEM.lastRiddle;MEM.lastRiddle=null;
    const ok=r.a.toLowerCase().split(/\s+/).some(w=>lower.includes(w));
    botReply(ok?`🎉 Doğru! "${r.a}"!`:`❌ Değil! Cevap: "${r.a}"`,400);return;
  }
  // KB
  for(const rule of KB){
    if(rule.q.test(lower)||rule.q.test(raw)){
      let reply;try{reply=await rule.a(raw,MEM);}catch(e){reply=null;}
      if(reply){MEM.lastTopic=rule.t;MEM.mentionedTopics.add(rule.t);botReply(reply,300+Math.random()*500);return;}
    }
  }
  // Duygu
  if(/[!]{2,}|vay|inanılmaz|muhteşem|şoke/.test(lower)){botReply(pick(['Coşkunuzu hissediyorum! Ne oldu?','Çok enerjik görünüyorsunuz!']),400);return;}
  // Sayı
  if(/^\d+$/.test(lower.trim())){const r=MATH.eval(lower);if(r){botReply(`= ${r.result}`,300);return;}}
  // Soru kalıbı
  if(/\?$|nedir|kimdir|nerede|nasıl|neden|niçin|kaç/.test(lower)){
    botReply(pick([`"${raw}" konusunda bilgim sınırlı. Farklı açıdan sorar mısınız?`,'İlginç soru! Bilim, tarih, teknoloji, coğrafya, sağlık — bu konularda daha iyi yardım ederim.']),500);return;
  }
  // Fallback
  botReply(pick([
    `Sizi dinliyorum${MEM.greetName('.')} Daha fazla detay verir misiniz?`,
    'Bunu tam anlayamadım. Hava, matematik, müzik, film veya başka konular sorun — hazırım!',
    `Konuyu farklı açıdan anlatır mısınız${MEM.greetName('?')}`,
  ]),500);
};

/* ─── OTOMATİK KARŞILAMA ─────────────── */
window._natureBotAutoGreet=function(){
  const bot=window._natureBotInstance;if(!bot)return;
  const h=new Date().getHours(),z=h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar',name=MEM.userName?`, ${MEM.userName}`:'';
  const msg=pick([
    `${z}${name}! NatureBot v5 hazır. Hava, müzik, kod, tema veya sohbet — ne istersen! 🌿`,
    `Merhaba${name}! Bugün ne yapalım?`,
    `${z}${name}! Siteyi geliştireyim mi, yoksa konuşalım mı?`,
  ]);
  setTimeout(()=>{bot.showBubble(msg,true);},3500);
};
const _orig=window.onLoginSuccess;
window.onLoginSuccess=function(...args){if(_orig)_orig.apply(this,args);setTimeout(window._natureBotAutoGreet,2500);};

/* ─── showBubble HOOK: TÜM YANITLAR SESLİ ─
   Bot her yanıt verdiğinde VOICE.speak çağrılır.
─────────────────────────────────────────── */
(function patchBubble(){
  let tries=0;
  const iv=setInterval(()=>{
    tries++;const bot=window._natureBotInstance;
    if(bot&&typeof bot.showBubble==='function'){
      clearInterval(iv);
      const orig=bot.showBubble.bind(bot);
      bot.showBubble=function(msg,autoHide){
        orig(msg,autoHide);
        if(VOICE.enabled&&msg&&msg!=='...'){
          setTimeout(()=>{if(!window.SPEECH?.speaking)VOICE.speak(msg);},150);
        }
      };
    }
    if(tries>=40)clearInterval(iv);
  },300);
})();

console.log('🌿 NatureBot Zeka v5.0 — "Diğer botlar konuşur, NatureBot YAPAR."');
})();
