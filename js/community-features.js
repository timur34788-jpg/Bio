/* ═══════════════════════════════════════════════════════════════
   TOPLULUK ÖZELLİKLERİ
   community-features.js — Discord + Teams + Rocket.Chat + Flock
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════
   1. ETKİNLİKLER (Discord Events)
══════════════════════════ */
function openEventsModal(){
  dbRef('events/'+(_currentServer||'main')).orderByChild('startAt').once('value',snap=>{
    const events=snap.val()||{};
    let m=document.getElementById('eventsModal');
    if(!m){m=document.createElement('div');m.id='eventsModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
    m.innerHTML=`<div class="bb-modal" style="width:660px;max-height:86vh;display:flex;flex-direction:column;">
      <div class="bb-modal-header"><span>📅 Etkinlikler</span>
        <div style="display:flex;gap:8px;">
          <button onclick="openCreateEvent()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">＋ Etkinlik</button>
          <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">
        ${Object.entries(events).sort((a,b)=>a[1].startAt-b[1].startAt).map(([id,e])=>{
          const started=Date.now()>=e.startAt; const ended=e.endAt&&Date.now()>e.endAt;
          const interested=e.interested?.[_cu];
          return`<div style="background:var(--surface);border-radius:14px;overflow:hidden;border:1px solid var(--border);">
            <div style="height:72px;background:${e.color||'var(--accent)'};display:flex;align-items:center;justify-content:center;font-size:2.5rem;">${e.icon||'📅'}</div>
            <div style="padding:14px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <div>
                  <div style="font-weight:800;font-size:1rem;color:var(--text-hi);">${e.title}</div>
                  <div style="font-size:.78rem;color:var(--muted);margin-top:2px;">${new Date(e.startAt).toLocaleString('tr')}${e.endAt?' → '+new Date(e.endAt).toLocaleTimeString('tr',{hour:'2-digit',minute:'2-digit'}):''}</div>
                </div>
                <span style="padding:3px 10px;border-radius:20px;font-size:.72rem;font-weight:700;background:${ended?'var(--border)':started?'rgba(46,204,113,.2)':'rgba(52,152,219,.15)'};color:${ended?'var(--muted)':started?'#2ecc71':'#3498db'};white-space:nowrap;">${ended?'Bitti':started?'🔴 Canlı':'Yakında'}</span>
              </div>
              ${e.desc?`<div style="font-size:.82rem;color:var(--muted);margin-bottom:10px;">${e.desc}</div>`:''}
              <div style="display:flex;align-items:center;gap:8px;">
                <button onclick="toggleEventInterest('${id}')" style="padding:6px 14px;background:${interested?'var(--accent)':'var(--bg)'};color:${interested?'#fff':'var(--text-hi)'};border:1px solid ${interested?'var(--accent)':'var(--border)'};border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:600;transition:all .15s;">${interested?'✅ İlgileniyorum':'⭐ İlgileniyorum'}</button>
                <span style="font-size:.75rem;color:var(--muted);">${Object.keys(e.interested||{}).length} kişi</span>
                ${started&&!ended?`<button onclick="e.vcId&&joinVoiceChannel&&joinVoiceChannel('${id}',false)" style="padding:6px 14px;background:rgba(46,204,113,.15);border:1px solid rgba(46,204,113,.3);color:#2ecc71;border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:600;margin-left:auto;">Katıl ▶</button>`:''}
              </div>
            </div>
          </div>`;}).join('')||'<div style="text-align:center;padding:60px;color:var(--muted);">Etkinlik yok. ＋ ile ekleyin!</div>'}
      </div>
    </div>`;
    m.style.display='flex';
  });
}
function openCreateEvent(){
  let m=document.getElementById('createEventModal');
  if(!m){m=document.createElement('div');m.id='createEventModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:500px;">
    <div class="bb-modal-header"><span>📅 Etkinlik Oluştur</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <div id="evtIconPrev" style="width:56px;height:56px;border-radius:12px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:2rem;cursor:pointer;" onclick="this.textContent=prompt('İkon seç (emoji):',this.textContent)||this.textContent">📅</div>
        <input id="evtTitle" placeholder="Etkinlik adı..." style="flex:1;padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.95rem;font-weight:600;">
      </div>
      <textarea id="evtDesc" rows="2" placeholder="Açıklama..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;"></textarea>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label style="font-size:.75rem;color:var(--muted);">BAŞLANGIÇ</label><input type="datetime-local" id="evtStart" style="display:block;width:100%;margin-top:3px;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);"></div>
        <div style="flex:1;"><label style="font-size:.75rem;color:var(--muted);">BİTİŞ</label><input type="datetime-local" id="evtEnd" style="display:block;width:100%;margin-top:3px;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);"></div>
      </div>
      <div><label style="font-size:.75rem;color:var(--muted);">KART RENGİ</label>
        <div style="display:flex;gap:6px;margin-top:4px;">
          ${['#3498db','#9b59b6','#2ecc71','#e74c3c','#f39c12','#1abc9c'].map(c=>`<div onclick="document.getElementById('evtColor').value='${c}'" style="width:26px;height:26px;border-radius:6px;background:${c};cursor:pointer;"></div>`).join('')}
          <input type="color" id="evtColor" value="#3498db" style="width:30px;height:30px;padding:2px;border:none;cursor:pointer;border-radius:6px;">
        </div>
      </div>
      <button onclick="createEvent()" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">📅 Etkinlik Oluştur</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function createEvent(){
  const title=document.getElementById('evtTitle').value.trim(); const startAt=document.getElementById('evtStart').value;
  if(!title||!startAt) return showToast('Başlık ve başlangıç tarihi gerekli');
  await dbRef('events/'+(_currentServer||'main')+'/evt_'+Date.now()).set({ title, desc:document.getElementById('evtDesc').value, startAt:new Date(startAt).getTime(), endAt:document.getElementById('evtEnd').value?new Date(document.getElementById('evtEnd').value).getTime():null, color:document.getElementById('evtColor').value, icon:document.getElementById('evtIconPrev').textContent, interested:{}, by:_cu, at:Date.now() });
  document.getElementById('createEventModal').style.display='none'; openEventsModal(); showToast('📅 Etkinlik oluşturuldu!');
}
async function toggleEventInterest(id){const r=dbRef('events/'+(_currentServer||'main')+'/'+id+'/interested/'+_cu);const s=await r.once('value');if(s.val())await r.remove();else await r.set(true);openEventsModal();}

/* ══════════════════════════
   2. ÖVGÜ / TAKDİR (Teams Praise)
══════════════════════════ */
const BADGES=[
  {id:'star',e:'⭐',n:'Yıldız'},{id:'fire',e:'🔥',n:'Ateş'},{id:'heart',e:'💙',n:'Teşekkür'},
  {id:'brain',e:'🧠',n:'Beyin'},{id:'team',e:'🤝',n:'Takım'},{id:'creative',e:'🎨',n:'Yaratıcı'},
  {id:'speed',e:'⚡',n:'Hız'},{id:'mentor',e:'🎓',n:'Mentor'},{id:'rocket',e:'🚀',n:'Etki'},
  {id:'trophy',e:'🏆',n:'Şampiyon'}
];
function openPraiseModal(targetUser){
  let m=document.getElementById('praiseModal');
  if(!m){m=document.createElement('div');m.id='praiseModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:500px;">
    <div class="bb-modal-header"><span>🌟 Övgü Gönder</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <input id="praiseToUser" value="${targetUser||''}" placeholder="Kime? (kullanıcı adı)..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">ROZET</label>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:6px;">
          ${BADGES.map(b=>`<div onclick="[...this.parentNode.children].forEach(d=>{d.style.border='1px solid var(--border)';d.style.background='var(--surface)'});this.style.border='2px solid var(--accent)';this.style.background='var(--accent)22';document.getElementById('praiseBadge').value='${b.id}'" style="padding:8px;border-radius:10px;border:1px solid var(--border);cursor:pointer;text-align:center;background:var(--surface);transition:all .15s;">
            <div style="font-size:1.6rem;">${b.e}</div>
            <div style="font-size:.68rem;color:var(--muted);margin-top:2px;">${b.n}</div>
          </div>`).join('')}
        </div>
        <input type="hidden" id="praiseBadge">
      </div>
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">MESAJ</label>
        <textarea id="praiseMsg" rows="3" placeholder="Ne söylemek istersiniz?" style="display:block;width:100%;margin-top:4px;padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;font-size:.85rem;"></textarea>
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="praisePublic" checked style="accent-color:var(--accent);"><span style="font-size:.83rem;color:var(--text-hi);">Herkese açık paylaş</span></label>
      <button onclick="sendPraise()" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:.95rem;">🌟 Övgü Gönder</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function sendPraise(){
  const toUser=document.getElementById('praiseToUser').value.trim(); const bId=document.getElementById('praiseBadge').value;
  if(!toUser||!bId) return showToast('Kullanıcı ve rozet seçin');
  const badge=BADGES.find(b=>b.id===bId);
  const id='praise_'+Date.now();
  const isPublic=document.getElementById('praisePublic').checked;
  await dbRef('praise/'+(_currentServer||'main')+'/'+id).set({from:_cu,fromName:_cName||_cu,toUser,badge,msg:document.getElementById('praiseMsg').value,public:isPublic,at:Date.now()});
  if(isPublic){const rid=window._deskRoom||window._cRoom;if(rid)await dbRef('msgs/'+rid).push({user:_cu,name:_cName||_cu,praiseCard:{id,fromName:_cName||_cu,toUser,badge,msg:document.getElementById('praiseMsg').value},ts:Date.now()});}
  document.getElementById('praiseModal').style.display='none'; showToast(`${badge.e} Övgü ${toUser}'ya gönderildi!`);
}
async function openPraiseWall(){
  const snap=await dbRef('praise/'+(_currentServer||'main')).orderByChild('at').limitToLast(30).once('value'); const praises=snap.val()||{};
  let m=document.getElementById('praiseWallModal');
  if(!m){m=document.createElement('div');m.id='praiseWallModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:600px;max-height:86vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>🌟 Övgü Duvarı</span>
      <div style="display:flex;gap:8px;"><button onclick="openPraiseModal()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">＋ Övgü</button>
      <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">
      ${Object.values(praises).reverse().map(p=>`<div style="background:var(--surface);border-radius:14px;padding:16px;border:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="font-size:2.5rem;">${p.badge?.e||'⭐'}</div>
          <div><div style="font-weight:700;color:var(--text-hi);">${p.badge?.n}</div><div style="font-size:.78rem;color:var(--muted);">${p.fromName} → ${p.toUser}</div></div>
          <div style="margin-left:auto;font-size:.72rem;color:var(--muted);">${new Date(p.at).toLocaleDateString('tr')}</div>
        </div>
        ${p.msg?`<div style="font-size:.88rem;color:var(--text-hi);font-style:italic;background:var(--bg);padding:10px;border-radius:8px;">"${p.msg}"</div>`:''}
      </div>`).join('')||'<div style="text-align:center;padding:60px;color:var(--muted);">Henüz övgü yok</div>'}
    </div>
  </div>`;
  m.style.display='flex';
}
function renderPraiseCard(c){
  return`<div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid #f1c40f;border-radius:12px;padding:14px;margin:4px 0;max-width:420px;"><div style="display:flex;align-items:center;gap:10px;"><div style="font-size:2rem;">${c.badge?.e||'⭐'}</div><div><div style="font-weight:700;color:var(--text-hi);">${c.badge?.n} — ${c.toUser}</div><div style="font-size:.78rem;color:var(--muted);">${c.fromName} tarafından</div></div></div>${c.msg?`<div style="font-size:.85rem;color:var(--text-hi);margin-top:8px;font-style:italic;">"${c.msg}"</div>`:''}</div>`;
}

/* ══════════════════════════
   3. AUTOMOD
══════════════════════════ */
const AUTOMOD_PRESETS=[
  {id:'spam',n:'Spam Engelle',d:'Kısa sürede çok mesaj'},
  {id:'links',n:'Link Engelle',d:'Onaysız URL\'leri engelle'},
  {id:'caps',n:'Büyük Harf Sınırla',d:'%70+ büyük harf mesajları'},
  {id:'profanity',n:'Küfür Filtresi',d:'Uygunsuz kelimeler'},
  {id:'invites',n:'Davet Engelle',d:'Sunucu davetleri'},
  {id:'flood',n:'Karakter Tekrarı',d:'Aynı karakter tekrarı'},
];
async function openAutoModModal(){
  const snap=await dbRef('automod/'+(_currentServer||'main')).once('value'); const rules=snap.val()||{};
  let m=document.getElementById('automodModal');
  if(!m){m=document.createElement('div');m.id='automodModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:620px;max-height:86vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>🤖 AutoMod</span>
      <div style="display:flex;gap:8px;"><button onclick="openCreateAutomodRule()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">＋ Kural</button>
      <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      <div style="background:rgba(52,152,219,.08);border:1px solid rgba(52,152,219,.2);border-radius:12px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:700;color:#3498db;margin-bottom:10px;">🔵 Hazır Kurallar</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${AUTOMOD_PRESETS.map(p=>`<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg);border-radius:8px;cursor:pointer;">
            <span><span style="font-weight:600;color:var(--text-hi);font-size:.85rem;">${p.n}</span><span style="display:block;font-size:.72rem;color:var(--muted);">${p.d}</span></span>
            <div onclick="toggleAutomodPreset('${p.id}')" style="width:36px;height:20px;background:${rules['preset_'+p.id]?.enabled?'var(--accent)':'var(--border)'};border-radius:10px;position:relative;cursor:pointer;flex-shrink:0;transition:background .2s;"><div style="position:absolute;top:2px;${rules['preset_'+p.id]?.enabled?'right:2px':'left:2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s;"></div></div>
          </label>`).join('')}
        </div>
      </div>
      <div style="font-size:.8rem;color:var(--muted);font-weight:700;margin-bottom:8px;">ÖZEL KURALLAR</div>
      ${Object.entries(rules).filter(([id])=>!id.startsWith('preset_')).map(([id,r])=>`<div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;"><div style="font-weight:600;color:var(--text-hi);font-size:.85rem;">${r.name}</div><div style="font-size:.72rem;color:var(--muted);">${r.type}: ${r.pattern} → ${r.action}</div></div>
        <div onclick="toggleAutomodRule('${id}')" style="width:36px;height:20px;background:${r.enabled?'var(--accent)':'var(--border)'};border-radius:10px;position:relative;cursor:pointer;flex-shrink:0;"><div style="position:absolute;top:2px;${r.enabled?'right:2px':'left:2px'};width:16px;height:16px;background:#fff;border-radius:50%;"></div></div>
        <button onclick="deleteAutomodRule('${id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;">🗑️</button>
      </div>`).join('')||'<div style="color:var(--muted);font-size:.82rem;padding:4px 0;">Özel kural yok</div>'}
    </div>
  </div>`;
  m.style.display='flex';
}
async function toggleAutomodPreset(pid){const r=dbRef('automod/'+(_currentServer||'main')+'/preset_'+pid);const s=await r.once('value');await r.set({enabled:!s.val()?.enabled,type:'preset',pid});openAutoModModal();}
async function toggleAutomodRule(id){const r=dbRef('automod/'+(_currentServer||'main')+'/'+id+'/enabled');const s=await r.once('value');await r.set(!s.val());openAutoModModal();}
async function deleteAutomodRule(id){await dbRef('automod/'+(_currentServer||'main')+'/'+id).remove();openAutoModModal();}
function openCreateAutomodRule(){
  let m=document.getElementById('createAutomodModal');
  if(!m){m=document.createElement('div');m.id='createAutomodModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:460px;">
    <div class="bb-modal-header"><span>🤖 Yeni AutoMod Kuralı</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:10px;">
      <input id="amName" placeholder="Kural adı..." style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <select id="amType" style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <option value="keyword">Anahtar kelime içeriyorsa</option>
        <option value="regex">Regex eşleşmesi</option>
        <option value="link">Link içeriyorsa</option>
        <option value="mention_count">Bahsetme sayısı aşıldıysa</option>
      </select>
      <input id="amPattern" placeholder="Kelime, pattern veya limit..." style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <select id="amAction" style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <option value="delete">Mesajı sil</option>
        <option value="warn">Kullanıcıyı uyar</option>
        <option value="timeout">Geçici sustur</option>
        <option value="notify_mod">Moderatörü bildir</option>
        <option value="block">Gönderimi engelle</option>
      </select>
      <button onclick="createAutomodRule()" style="padding:10px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">Kural Oluştur</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function createAutomodRule(){
  const name=document.getElementById('amName').value.trim(); if(!name) return showToast('Kural adı gerekli');
  await dbRef('automod/'+(_currentServer||'main')+'/rule_'+Date.now()).set({name,type:document.getElementById('amType').value,pattern:document.getElementById('amPattern').value,action:document.getElementById('amAction').value,enabled:true,by:_cu});
  document.getElementById('createAutomodModal').style.display='none'; openAutoModModal(); showToast('🤖 AutoMod kuralı oluşturuldu!');
}
async function checkAutomod(text,roomId){
  const snap=await dbRef('automod/'+(_currentServer||'main')).once('value'); const rules=snap.val()||{};
  for(const[id,r]of Object.entries(rules)){
    if(!r.enabled) continue; let match=false;
    if(r.type==='preset'){
      if(r.pid==='caps'&&text.length>10){const caps=(text.match(/[A-Z]/g)||[]).length;match=caps/text.length>0.7;}
      if(r.pid==='links')match=/https?:\/\//i.test(text);
      if(r.pid==='flood')match=/(.)\1{9,}/.test(text);
      if(r.pid==='invites')match=/discord\.gg\/|t\.me\//i.test(text);
    }else if(r.type==='keyword')match=text.toLowerCase().includes(r.pattern.toLowerCase());
    else if(r.type==='regex'){try{match=new RegExp(r.pattern,'i').test(text);}catch(e){}}
    else if(r.type==='mention_count'){match=(text.match(/@/g)||[]).length>parseInt(r.pattern);}
    if(match) return{blocked:true,rule:r,action:r.action};
  }
  return{blocked:false};
}

/* ══════════════════════════
   4. YAVAŞ MOD (Slowmode)
══════════════════════════ */
const _slowTimers={};
async function setSlowMode(channelId,seconds){
  await dbRef('rooms/'+(_currentServer||'main')+'/'+channelId+'/slowMode').set(seconds);
  showToast(seconds>0?`⏱️ Yavaş mod: ${seconds}sn`:'⏱️ Yavaş mod kapatıldı');
}
async function checkSlowMode(channelId){
  const snap=await dbRef('rooms/'+(_currentServer||'main')+'/'+channelId+'/slowMode').once('value');
  const sec=snap.val()||0; if(!sec) return true;
  const last=_slowTimers[channelId+_cu]||0;
  const elapsed=(Date.now()-last)/1000;
  if(elapsed<sec){showToast(`⏱️ ${Math.ceil(sec-elapsed)} saniye bekleyin`);return false;}
  _slowTimers[channelId+_cu]=Date.now(); return true;
}
function openSlowModeModal(channelId){
  const sec=prompt('Kaç saniye? (0=kapat):','0'); if(sec===null) return;
  setSlowMode(channelId,parseInt(sec)||0);
}

/* ══════════════════════════
   5. ÇALIŞAN DİZİNİ (Slack Atlas / Teams)
══════════════════════════ */
async function openEmployeeDirectory(){
  const snap=await dbRef('users').once('value').catch(()=>({val:()=>({})})); const users=snap.val()||{};
  let m=document.getElementById('employeeDirModal');
  if(!m){m=document.createElement('div');m.id='employeeDirModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:700px;max-height:88vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>👥 Çalışan Dizini</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
      <input id="empSearch" placeholder="🔍 İsim, departman, rol ara..." oninput="_filterEmployees(this.value)" style="width:100%;padding:9px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
    </div>
    <div id="empList" style="flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
      ${Object.entries(users).map(([uid,u])=>_empCard(uid,u)).join('')||'<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px;">Kullanıcı bulunamadı</div>'}
    </div>
  </div>`;
  m.style.display='flex';
}
function _empCard(uid,u){
  return`<div id="emp_${uid}" style="background:var(--surface);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border .15s;border:1px solid var(--border);" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="openUserProfile&&openUserProfile('${uid}')">
    <div style="width:46px;height:46px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:1.1rem;flex-shrink:0;">${(u.name||uid).slice(0,2).toUpperCase()}</div>
    <div style="overflow:hidden;">
      <div style="font-weight:700;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name||uid}</div>
      ${u.title?`<div style="font-size:.78rem;color:var(--muted);">${u.title}</div>`:''}
      ${u.department?`<div style="font-size:.72rem;color:var(--accent);">${u.department}</div>`:''}
    </div>
  </div>`;
}
function _filterEmployees(q){
  const items=document.querySelectorAll('#empList>div[id^="emp_"]');
  items.forEach(el=>{const text=el.textContent.toLowerCase();el.style.display=text.includes(q.toLowerCase())?'':'none';});
}
async function updateMyProfile(updates){
  await dbRef('users/'+_cu).update(updates); showToast('✅ Profil güncellendi!');
}

/* ══════════════════════════
   6. SUNUCU ONBOARDING
══════════════════════════ */
async function showOnboardingIfNeeded(){
  if(!_cu) return;
  const snap=await dbRef('onboarding/'+(_currentServer||'main')+'/completed/'+_cu).once('value');
  if(snap.val()) return;
  openOnboarding();
}
async function openOnboarding(){
  const cfgSnap=await dbRef('onboarding/'+(_currentServer||'main')+'/config').once('value');
  const cfg=cfgSnap.val();
  if(!cfg?.enabled) return;
  let m=document.getElementById('onboardingModal');
  if(!m){m=document.createElement('div');m.id='onboardingModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:520px;">
    <div style="padding:30px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:12px;">👋</div>
      <div style="font-size:1.3rem;font-weight:800;color:var(--text-hi);margin-bottom:8px;">Hoş geldiniz!</div>
      <div style="font-size:.9rem;color:var(--muted);margin-bottom:20px;">${cfg.welcomeMsg||'Sunucumuza hoş geldiniz!'}</div>
      ${(cfg.channels||[]).length?`<div style="text-align:left;margin-bottom:16px;"><div style="font-weight:700;color:var(--text-hi);margin-bottom:8px;">📢 Önerilen Kanallar</div><div style="display:flex;flex-direction:column;gap:4px;">${cfg.channels.map(c=>`<div style="padding:8px 12px;background:var(--surface);border-radius:8px;font-size:.85rem;color:var(--text-hi);">＃ ${c}</div>`).join('')}</div></div>`:''}
      <button onclick="completeOnboarding()" style="padding:12px 30px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:.95rem;">🚀 Başlayalım!</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function completeOnboarding(){
  await dbRef('onboarding/'+(_currentServer||'main')+'/completed/'+_cu).set(true);
  document.getElementById('onboardingModal').style.display='none';
}
async function openOnboardingConfig(){
  let m=document.getElementById('onboardingConfigModal');
  if(!m){m=document.createElement('div');m.id='onboardingConfigModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:500px;">
    <div class="bb-modal-header"><span>🚀 Onboarding Ayarları</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">KARŞILAMA MESAJI</label><textarea id="obWelcomeMsg" rows="3" style="display:block;width:100%;margin-top:4px;padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;"></textarea></div>
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">ÖNERİLEN KANALLAR (virgülle ayır)</label><input id="obChannels" placeholder="genel, duyurular, destek..." style="display:block;width:100%;margin-top:4px;padding:9px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);"></div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="obEnabled" style="accent-color:var(--accent);"><span style="font-size:.83rem;color:var(--text-hi);">Onboarding aktif</span></label>
      <button onclick="saveOnboardingConfig()" style="padding:10px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">💾 Kaydet</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function saveOnboardingConfig(){
  await dbRef('onboarding/'+(_currentServer||'main')+'/config').set({welcomeMsg:document.getElementById('obWelcomeMsg').value,channels:document.getElementById('obChannels').value.split(',').map(s=>s.trim()).filter(Boolean),enabled:document.getElementById('obEnabled').checked});
  document.getElementById('onboardingConfigModal').style.display='none'; showToast('✅ Onboarding ayarlandı!');
}

/* ══════════════════════════
   7. ÜYELERI YÖNET / BAN / TIMEOUT
══════════════════════════ */
async function openMemberMgmt(){
  const snap=await dbRef('members/'+(_currentServer||'main')).once('value').catch(()=>({val:()=>({})})); const members=snap.val()||{};
  let m=document.getElementById('memberMgmtModal');
  if(!m){m=document.createElement('div');m.id='memberMgmtModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:640px;max-height:86vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>👥 Üye Yönetimi</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:6px;">
      ${Object.entries(members).map(([uid,u])=>`<div style="background:var(--surface);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.9rem;flex-shrink:0;">${(u.name||uid).slice(0,2).toUpperCase()}</div>
        <div style="flex:1;"><div style="font-weight:700;color:var(--text-hi);">${u.name||uid}</div><div style="font-size:.72rem;color:${u.banned?'#e74c3c':u.timeout?'#f39c12':'var(--muted)'};">${u.banned?'🚫 Yasaklı':u.timeout?'⏱️ Susturulmuş':'✅ Aktif'}</div></div>
        <div style="display:flex;gap:6px;">
          <button onclick="openMemberRolesModal&&openMemberRolesModal('${uid}','${u.name||uid}')" style="padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:.72rem;color:var(--text-hi);">🎭 Rol</button>
          <button onclick="kickMember('${uid}')" style="padding:4px 8px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:6px;cursor:pointer;font-size:.72rem;">At</button>
          <button onclick="banMember('${uid}')" style="padding:4px 8px;background:rgba(231,76,60,.2);border:1px solid rgba(231,76,60,.4);color:#e74c3c;border-radius:6px;cursor:pointer;font-size:.72rem;">Yasakla</button>
          <button onclick="timeoutMember('${uid}')" style="padding:4px 8px;background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.3);color:#f39c12;border-radius:6px;cursor:pointer;font-size:.72rem;">Sustur</button>
        </div>
      </div>`).join('')||'<div style="text-align:center;padding:40px;color:var(--muted);">Üye bulunamadı</div>'}
    </div>
  </div>`;
  m.style.display='flex';
}
async function kickMember(uid){if(!confirm('Üyeyi atmak istiyor musunuz?'))return;await dbRef('members/'+(_currentServer||'main')+'/'+uid).remove();openMemberMgmt();showToast('👢 Üye atıldı');}
async function banMember(uid){if(!confirm('Üyeyi yasaklamak istiyor musunuz?'))return;await dbRef('members/'+(_currentServer||'main')+'/'+uid+'/banned').set(true);openMemberMgmt();showToast('🚫 Üye yasaklandı');}
async function timeoutMember(uid){const min=parseInt(prompt('Kaç dakika susturulsun?','5'));if(!min)return;const until=Date.now()+min*60000;await dbRef('members/'+(_currentServer||'main')+'/'+uid+'/timeout').set(until);openMemberMgmt();showToast(`⏱️ ${min} dakika susturuldu`);}

window.openEventsModal = openEventsModal;
window.openCreateEvent = openCreateEvent;
window.createEvent = createEvent;
window.toggleEventInterest = toggleEventInterest;
window.openPraiseModal = openPraiseModal;
window.sendPraise = sendPraise;
window.openPraiseWall = openPraiseWall;
window.renderPraiseCard = renderPraiseCard;
window.openAutoModModal = openAutoModModal;
window.toggleAutomodPreset = toggleAutomodPreset;
window.toggleAutomodRule = toggleAutomodRule;
window.deleteAutomodRule = deleteAutomodRule;
window.openCreateAutomodRule = openCreateAutomodRule;
window.createAutomodRule = createAutomodRule;
window.checkAutomod = checkAutomod;
window.setSlowMode = setSlowMode;
window.checkSlowMode = checkSlowMode;
window.openSlowModeModal = openSlowModeModal;
window.openEmployeeDirectory = openEmployeeDirectory;
window.updateMyProfile = updateMyProfile;
window.openOnboarding = openOnboarding;
window.completeOnboarding = completeOnboarding;
window.openOnboardingConfig = openOnboardingConfig;
window.saveOnboardingConfig = saveOnboardingConfig;
window.showOnboardingIfNeeded = showOnboardingIfNeeded;
window.openMemberMgmt = openMemberMgmt;
window.kickMember = kickMember;
window.banMember = banMember;
window.timeoutMember = timeoutMember;
