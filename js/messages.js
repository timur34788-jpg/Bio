/* Nature.co — messages.js */
/* Otomatik bölümlendi */

/* ── Render Messages ── */

function renderMsgs(msgsObj, clearedAt){
  const box=document.getElementById('chatMsgs');if(!box)return;
  const atBot=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  let msgs=msgsObj?Object.entries(msgsObj).map(([k,v])=>({...v,_key:k})).sort((a,b)=>a.ts-b.ts):[];
  // clearedAt filtresini uygula — temizleme zamanından önceki mesajları gösterme
  if(clearedAt) msgs=msgs.filter(m=>m.ts>clearedAt);
  if(!msgs.length){
    box.innerHTML=`<div class="empty-chat"><div class="empty-ic">💬</div><div class="empty-title">Sohbet başlasın!</div><div class="empty-sub">Henüz mesaj yok. İlk mesajı sen gönder.</div></div>`;
    return;
  }
  let h='',lastDate='',lastUser='',lastTs=0;
  msgs.forEach((m)=>{
    if(m.sys){h+=`<div class="msg-sys">${esc(m.text)}</div>`;lastUser='';return;}
    const own=m.user===_cu;
    const d=new Date(m.ts);
    const ds=formatDate(d);
    if(ds!==lastDate){h+=`<div class="date-div"><span class="date-txt">${ds}</span></div>`;lastDate=ds;lastUser='';}
    const gap=m.ts-lastTs>300000;
    const first=m.user!==lastUser||gap;
    lastUser=m.user;lastTs=m.ts;
    let content='';
    if(m.file){
      if(m.file.type&&m.file.type.startsWith('image/')){content=m.file.isEmoji?`<img class="msg-emoji-img" src="${m.file.data}" style="width:48px;height:48px;border-radius:6px;vertical-align:middle;">`:`<img class="msg-img" src="${m.file.data}" onclick="zoomImg(this.src)" loading="lazy">`;}
      else if(m.file.type&&m.file.type.startsWith('video/')){content=`<video controls style="max-width:min(260px,70vw);border-radius:8px;margin-top:4px"><source src="${m.file.data}" type="${m.file.type}"></video>`;}
      else{content=`<div class="msg-file-card" onclick="event.stopPropagation();downloadDataUrl('${m.file.data}','${esc(m.file.name||'dosya')}')"><div class="msg-file-icon">📄</div><div class="msg-file-info"><div class="msg-file-name">${esc(m.file.name)}</div><div class="msg-file-size">${fmtSize(m.file.size)}</div></div><div style="margin-left:auto;font-size:1rem;color:var(--muted);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m-7-7 7 7 7-7"/></svg></div></div>`;}
    } else if(m.voice){
      const dur = m.voice.dur ? fmtDuration(m.voice.dur) : '0:00';
      content = `<div class="voice-msg-wrap">
        <button class="voice-play-btn" onclick="playVoiceMsg(this,'${m._key}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <div class="voice-waveform" id="vwf_${m._key}">${Array.from({length:20},(_,i)=>`<span style="height:${m.voice.bars?m.voice.bars[i]||4:4+Math.sin(i*0.7)*4}px"></span>`).join('')}</div>
        <span class="voice-progress" id="vpr_${m._key}">${dur}</span>
        <audio id="vau_${m._key}" src="${m.voice.data||''}" preload="none"></audio>
      </div>`;
    } else {
      let replyHtml = '';
      if(m.replyTo){
        replyHtml = `<div style="border-left:3px solid var(--accent);padding:4px 8px;margin-bottom:4px;border-radius:0 4px 4px 0;background:rgba(255,255,255,.05);font-size:.78rem;cursor:pointer;max-width:100%;overflow:hidden;" onclick="scrollToMsg('${m.replyTo.key}')">
          <span style="color:var(--accent);font-weight:700;">${esc(m.replyTo.user)}</span>
          <span style="color:var(--muted);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc((m.replyTo.text||'').slice(0,60))}</span>
        </div>`;
      }
      // Konferans/yayın daveti
      if (m.isConferenceInvite && m.confId && typeof renderConferenceInviteMsg === 'function') {
        content = renderConferenceInviteMsg(m) || (own?`<div class="ob">${replyHtml}${linkify(esc(m.text))}</div>`:`<div class="mb-text">${replyHtml}${linkify(esc(m.text))}</div>`);
      } else {
        content=own?`<div class="ob">${replyHtml}${linkify(esc(m.text))}</div>`:`<div class="mb-text">${replyHtml}${linkify(esc(m.text))}</div>`;
      }
    }
    const meta=first?`<div class="mb-meta"><div class="mb-name">${esc(own?_cu:m.user)}</div><div class="mb-ts">${fmtTime(m.ts)}${own?getMsgStatusSvg('sent'):''}</div></div>`:
    own?`<div class="mb-meta mb-meta-mini"><div class="mb-ts">${fmtTime(m.ts)}${getMsgStatusSvg('sent')}</div></div>`:'';
    const reactionsHtml = buildReactionsHtml(_cRoom, m._key, m.reactions);
     const avMenuBtn = `<button class="mb-av-menu-btn" data-room="${_cRoom}" data-key="${m._key}" data-own="${own}" data-admin="${_isAdmin}" data-text="${esc(m.text||'').replace(/"/g,'&quot;')}" onclick="showMsgMenuAtBtn(event)"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button>`;




     h+=`<div class="mb ${own?'own':''} ${first?'first':''}" data-key="${m._key}"${own?' data-ts="'+m.ts+'"':''}>
       <div class="av ${first?'':' ghost'}" style="background:${strColor(m.user)}" data-av-user="${m.user}">${initials(m.user)}</div>
       ${own ? avMenuBtn : ''}
       ${own
         ? `<div class="mb-body">${meta}${content}${reactionsHtml}</div>`
         : `<div style="display:flex;align-items:center;gap:4px;min-width:0;"><div class="mb-body">${meta}${content}${reactionsHtml}</div>${avMenuBtn}</div>`
       }
     </div>`;
  });
  box.innerHTML=h;
  // Fotoğraflı avatarları güncelle
  box.querySelectorAll('[data-av-user]').forEach(el=>{
    setAvatar(el,el.dataset.avUser);
  });
  if(atBot)scrollBottom();
  if(_cRoom){markRoomRead(_cRoom);updateMsgStatuses(_cRoom);}
}
function scrollBottom(){const b=document.getElementById('chatMsgs');if(b)b.scrollTop=b.scrollHeight;}


/* ── Read Receipts ── */

function markRoomRead(roomId){
  if(!_cu||!roomId)return;
  const now = Date.now();
  dbRef('reads/'+roomId+'/'+_cu).set(now); // eski format (uyumluluk)
  dbRef('reads/'+_cu+'/'+roomId).set(now); // yeni format (hızlı okuma)
}
function listenReads(roomId){
  if(_stopReads){_stopReads();_stopReads=null;}
  const ref=dbRef('reads/'+roomId);
  const h=snap=>{_reads[roomId]=snap.val()||{};updateMsgStatuses(roomId);};
  ref.on('value',h);
  _stopReads=()=>ref.off('value',h);
}
function getMsgStatusSvg(type){
  // type: 'sent' | 'delivered' | 'read'
  if(type==='sent'){
    return `<span class="msg-status"><svg viewBox="0 0 14 9"><polyline points="1,5 5,9 13,1"/></svg></span>`;
  }
  // double tick
  const cls=type==='read'?'read':'delivered';
  return `<span class="msg-status ${cls}"><svg viewBox="0 0 20 10"><polyline points="1,5 5,9 13,1"/><polyline points="7,5 11,9 19,1"/></svg></span>`;
}
function updateMsgStatuses(roomId){
  if(!roomId)return;
  const box=document.getElementById(_currentMsgBox||'chatMsgs');
  if(!box)return;
  const reads=_reads[roomId]||{};
  box.querySelectorAll('.mb.own[data-key]').forEach(el=>{
    const ts=parseInt(el.dataset.ts||'0');
    const statusEl=el.querySelector('.msg-status');
    if(!statusEl||!ts)return;
    const others=Object.entries(reads).filter(([u])=>u!==_cu);
    const anyRead=others.some(([,t])=>t>=ts);
    const anyDelivered=others.length>0;
    const cls = anyRead?'read':anyDelivered?'delivered':'';
    statusEl.className='msg-status '+(cls||'');
    // SVG güncelle — tek tik: sent, çift tik: delivered/read
    const isSingle = !anyDelivered && !anyRead;
    statusEl.innerHTML = isSingle
      ? `<svg viewBox="0 0 14 9"><polyline points="1,5 5,9 13,1"/></svg>`
      : `<svg viewBox="0 0 20 10"><polyline points="1,5 5,9 13,1"/><polyline points="7,5 11,9 19,1"/></svg>`;
  });
}
let _currentMsgBox='chatMsgs';
function updateRoomBadge(roomId, count){
  document.querySelectorAll('.r-row').forEach(row=>{
    const oc=row.getAttribute('onclick')||'';
    if(!oc.includes("'"+roomId+"'")) return;
    row.classList.add('unread');
    let b=row.querySelector('.ubadge');
    if(!b){b=document.createElement('div');b.className='ubadge';row.appendChild(b);}
    b.textContent=count>99?'99+':count;
  });
  document.querySelectorAll('.dsk-row').forEach(row=>{
    if((row.dataset.id||'')!==roomId) return;
    let b=row.querySelector('.dsk-row-badge');
    if(!b){b=document.createElement('div');b.className='dsk-row-badge';row.appendChild(b);}
    b.textContent=count>99?'99+':count;
  });
}
function clearUnreadBadge(roomId){
  _unread[roomId]=0;
  // Bildirim merkezindeki bu odaya ait bildirimleri okundu işaretle
  if(typeof _notifs !== 'undefined'){
    _notifs.forEach(n=>{ if(n.action && String(n.action).includes(roomId)) n.read=true; });
    if(typeof updateNotifBadge==='function') updateNotifBadge();
    try{localStorage.setItem(typeof _notifKey==='function'?_notifKey():'notifs', JSON.stringify(_notifs.slice(0,20)));}catch(e){}
  }
  document.querySelectorAll('.r-row').forEach(row=>{
    const oc=row.getAttribute('onclick')||'';
    if(oc.includes("'"+roomId+"'")){
      row.classList.remove('unread');
      const b=row.querySelector('.ubadge');if(b)b.remove();
    }
  });
  document.querySelectorAll('.dsk-row').forEach(row=>{
    if((row.dataset.id||'')===(roomId)){
      const b=row.querySelector('.dsk-row-badge');if(b)b.remove();
    }
  });
}
function deleteMsg(roomId,key){
  if(typeof _closeCtx==='function') _closeCtx();
  dbRef('msgs/'+roomId+'/'+key).remove().catch(()=>showToast('Silinemedi'));
}


/* ── Mesaj Menüsü (3 nokta) — Slack tarzı ── */

function showMsgMenu(e, room, key, own, isAdmin, text){
  e.stopPropagation();
  e.preventDefault();
  // Önceki listener'ı temizle
  document.removeEventListener('click', _closeCtx);
  const menu = document.getElementById('msgCtxMenu');
  if(!menu) return;
  let html = '';
  html += `<div class="ctx-item" onclick="event.stopPropagation();showReactMenu(event,'${room}','${key}')"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span> Tepki Ekle</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();replyToMsg('${room}','${key}');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></span> Cevapla</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();pinMsg('${room}','${key}');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg></span> Sabitle</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();copyMsgText(${JSON.stringify(text)});_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Kopyala</div>`;

  html += `<div class="ctx-item" onclick="event.stopPropagation();if(typeof saveMessage==='function')saveMessage('${room}','${key}',${JSON.stringify((text||'').slice(0,200))},window._cu||'');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;">🔖</span> Kaydet</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();if(typeof openThreadPanel==='function')openThreadPanel('${room}','${key}',${JSON.stringify((text||'').slice(0,100))},window._cu||'');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;">💬</span> Konu Aç</div>`;
  if(own) html += `<div class="ctx-item" onclick="event.stopPropagation();startEditMsg('${room}','${key}');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Düzenle</div>`;
  if(own||isAdmin){
    html += `<div style="height:1px;background:var(--border);margin:3px 4px;"></div>`;
    html += `<div class="ctx-item danger" onclick=\"event.stopPropagation();deleteMsg('${room}','${key}');_closeCtx()\"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span> Sil</div>`;
  }
  menu.innerHTML = html;
  const menuW = 200;
  const menuH = (html.match(/ctx-item/g)||[]).length * 42 + 16;
  let x = e.clientX, y = e.clientY;
  if(x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
  if(y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
  if(y < 8) y = 8;
  menu.style.cssText = `display:block;position:fixed;left:${x}px;top:${y}px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:5px;z-index:999999;box-shadow:0 8px 32px rgba(0,0,0,.7);min-width:200px;`;
  // Kapat listener'ı 300ms sonra ekle (tıklama bitmeden ekleme)
  setTimeout(()=>document.addEventListener('click', _closeCtx, {once:true}), 300);
}
function _closeCtx(){ 
  const m=document.getElementById('msgCtxMenu'); 
  if(m){ m.style.display='none'; m.classList.remove('show'); }
  document.removeEventListener('click', _closeCtx);
}

function showMsgMenuAtBtn(e){
  e.stopPropagation();
  e.preventDefault();
  document.removeEventListener('click', _closeCtx);

  // data attribute'lardan parametreleri oku
  const btn = e.currentTarget || e.target.closest('button') || e.target;
  const room = btn.dataset.room;
  const key = btn.dataset.key;
  const own = btn.dataset.own === 'true';
  // DOM'dan admin durumu okuma — manipülasyona açık. Gerçek değişkeni kullan.
  const isAdmin = _isAdmin;
  const text = btn.dataset.text || '';

  // Menüyü body'e taşı — z-index sorunlarını önlemek için
  let menu = document.getElementById('msgCtxMenu');
  if(!menu){ menu = document.createElement('div'); menu.id='msgCtxMenu'; }
  document.body.appendChild(menu);

  let html = '';
  html += `<div class="ctx-item" onclick="event.stopPropagation();showReactMenu(event,'${room}','${key}')"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span> Tepki Ekle</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();replyToMsg('${room}','${key}');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></span> Cevapla</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();pinMsg('${room}','${key}');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg></span> Sabitle</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();copyMsgText(${JSON.stringify(text)});_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Kopyala</div>`;

  html += `<div class="ctx-item" onclick="event.stopPropagation();if(typeof saveMessage==='function')saveMessage('${room}','${key}',${JSON.stringify((text||'').slice(0,200))},window._cu||'');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;">🔖</span> Kaydet</div>`;
  html += `<div class="ctx-item" onclick="event.stopPropagation();if(typeof openThreadPanel==='function')openThreadPanel('${room}','${key}',${JSON.stringify((text||'').slice(0,100))},window._cu||'');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;">💬</span> Konu Aç</div>`;
  if(own) html += `<div class="ctx-item" onclick="event.stopPropagation();startEditMsg('${room}','${key}');_closeCtx()"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Düzenle</div>`;
  if(own||isAdmin){
    html += `<div style="height:1px;background:var(--border);margin:3px 4px;"></div>`;
    html += `<div class="ctx-item danger" onclick=\"event.stopPropagation();deleteMsg('${room}','${key}');_closeCtx()\"><span style="width:22px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span> Sil</div>`;
  }
  menu.innerHTML = html;

  // Butona göre konumlandır
  const rect = btn.getBoundingClientRect();
  const menuW = 210;
  const menuH = menu.querySelectorAll('.ctx-item').length * 42 + 20;
  let x = rect.right + 8;
  let y = rect.top;
  if(x + menuW > window.innerWidth) x = rect.left - menuW - 8;
  if(x < 8) x = 8;
  if(y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
  if(y < 8) y = 8;

  menu.style.cssText = 'display:block;position:fixed;left:'+x+'px;top:'+y+'px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:5px;z-index:9999999;box-shadow:0 8px 32px rgba(0,0,0,.7);min-width:200px;';
  setTimeout(()=>document.addEventListener('click', _closeCtx, {once:true}), 300);
}

function copyMsgText(text){
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=>showToast('📋 Kopyalandı!')).catch(()=>{
    const ta=document.createElement('textarea'); ta.value=text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('📋 Kopyalandı!');
  });
}

function replyToMsg(room, key){
  if(!_db) return;
  dbRef('msgs/'+room+'/'+key).once('value').then(s=>{
    const msg = s.val(); if(!msg) return;
    const inp = document.getElementById('msgInp') || document.getElementById('deskInp');
    if(inp){
      inp.dataset.replyKey = key;
      inp.dataset.replyUser = msg.user||'';
      inp.dataset.replyText = (msg.text||'').slice(0,80);
      showReplyPreview(msg.user||'', msg.text||'');
      inp.focus();
    }
  });
}

function showReplyPreview(user, text){
  removeReplyPreview();
  const inpWrap = document.querySelector('#chatScreen .inp-wrap') || document.getElementById('deskInpWrap');
  if(!inpWrap) return;
  const div = document.createElement('div');
  div.id = 'replyPreview';
  div.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--surface);border-left:3px solid var(--blue);border-radius:0 6px 6px 0;padding:6px 10px;font-size:.8rem;flex-shrink:0;';
  div.innerHTML = '<span style="color:var(--blue);font-weight:700;flex-shrink:0;">'+esc(user)+'</span><span style="color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(text)+'</span><span onclick="cancelReply()" style="cursor:pointer;color:var(--muted);font-size:1rem;padding:0 4px;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>';
  inpWrap.insertBefore(div, inpWrap.firstChild);
}
function removeReplyPreview(){
  const old = document.getElementById('replyPreview'); if(old) old.remove();
  const inp = document.getElementById('msgInp') || document.getElementById('deskInp');
  if(inp){ delete inp.dataset.replyKey; delete inp.dataset.replyUser; delete inp.dataset.replyText; }
}
function cancelReply(){ removeReplyPreview(); }


/* ── Tepki seçici ── */

const QUICK_REACTS = ['👍','❤️','😂','😮','😢','🔥','👏','🎉','😍','💯'];
function showReactMenu(e, room, key){
  e.stopPropagation();
  const menu = document.getElementById('msgCtxMenu');
  let html = `<div style="padding:6px 8px 4px;font-size:.68rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">Tepki Seç</div>`;
  html += `<div style="display:flex;flex-wrap:wrap;gap:2px;padding:4px 6px;">`;
  QUICK_REACTS.forEach(em => {
    html += `<span onclick="addReaction(event,'${room}','${key}','${em}')" style="font-size:1.3rem;padding:4px 6px;cursor:pointer;border-radius:6px;transition:background .1s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background=''">${em}</span>`;
  });
  html += `</div>`;
  menu.innerHTML = html;
  let x = e.clientX, y = e.clientY;
  if(x + 200 > window.innerWidth) x = window.innerWidth - 210;
  if(y + 120 > window.innerHeight) y = window.innerHeight - 130;
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:4px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.6);min-width:200px;`;
  menu.classList.add('show');
  setTimeout(()=>document.addEventListener('click', _closeCtx, {once:true}), 10);
}


/* ── Emoji Tepkiler ── */

function addReaction(e, room, key, emoji){
  e.stopPropagation();
  document.getElementById('msgCtxMenu').classList.remove('show');
  if(!_cu) return;
  const ref = dbRef('msgs/'+room+'/'+key+'/reactions/'+emoji+'/'+_cu);
  ref.once('value').then(snap=>{
    if(snap.exists()) ref.remove();
    else ref.set(true);
  });
}
function buildReactionsHtml(room, key, reactions){
  if(!reactions) return '';
  let html = '<div class="msg-reactions">';
  Object.entries(reactions).forEach(([emoji, users])=>{
    const count = Object.keys(users).length;
    if(!count) return;
    const mine = _cu && users[_cu] ? 'mine' : '';
    html += `<div class="react-pill ${mine}" onclick="addReaction(event,'${room}','${key}','${emoji}')"><span>${emoji}</span><span class="react-count">${count}</span></div>`;
  });
  html += '</div>';
  return html;
}


/* ── Mesaj Düzenleme ── */

function startEditMsg(room, key){
  document.getElementById('msgCtxMenu').classList.remove('show');
  const msgEl = document.querySelector(`.mb[data-key="${key}"]`);
  if(!msgEl) return;
  const bodyEl = msgEl.querySelector('.mb-body');
  const textEl = bodyEl.querySelector('.ob, .mb-text');
  if(!textEl) return;
  const origText = textEl.innerText.trim();
  const editId = 'edit_'+key;
  textEl.style.display='none';
  const wrap = document.createElement('div');
  wrap.className='msg-edit-wrap';
  wrap.id=editId;
  wrap.innerHTML=`<textarea class="msg-edit-inp" rows="2">${origText}</textarea><div class="msg-edit-btns"><button class="msg-edit-ok" onclick="saveEditMsg('${room}','${key}','${editId}')">Kaydet</button><button class="msg-edit-cancel" onclick="cancelEditMsg('${editId}')">İptal</button></div>`;
  textEl.after(wrap);
  wrap.querySelector('textarea').focus();
}
function saveEditMsg(room, key, editId){
  const wrap = document.getElementById(editId);
  if(!wrap) return;
  const newText = wrap.querySelector('textarea').value.trim();
  if(!newText){showToast('Boş mesaj kaydedilemez');return;}
  dbRef('msgs/'+room+'/'+key).update({text:newText,edited:true}).then(()=>{
    cancelEditMsg(editId);
  }).catch(()=>showToast('Düzenlenemedi'));
}
function cancelEditMsg(editId){
  const wrap = document.getElementById(editId);
  if(!wrap) return;
  const msgEl = wrap.closest('.mb');
  const textEl = msgEl.querySelector('.ob, .mb-text');
  if(textEl) textEl.style.display='';
  wrap.remove();
}


/* ── Mesaj Sabitleme ── */

function pinMsg(room, key){
  document.getElementById('msgCtxMenu').classList.remove('show');
  dbRef('msgs/'+room+'/'+key).once('value').then(snap=>{
    const msg = snap.val();
    if(!msg) return;
    dbRef('pinned/'+room).set({key, text:msg.text||'', user:msg.user, ts:msg.ts});
    showToast('📌 Mesaj sabitlendi');
  });
}
function unpinMsg(){
  const room = _cRoom || _deskRoom;
  if(!room) return;
  dbRef('pinned/'+room).remove();
}
function listenPinBar(room){
  dbRef('pinned/'+room).on('value', snap=>{
    const data = snap.val();
    const text = data && data.text ? (data.user?data.user+': ':'')+data.text : null;
    // Mobile pinBar
    const bar = document.getElementById('pinBar');
    if(bar){
      if(text){ bar.classList.add('show'); document.getElementById('pinBarText').textContent=text; }
      else bar.classList.remove('show');
    }
    // Desktop pinBar
    const dbar = document.getElementById('deskPinBar');
    if(dbar){
      if(text){ dbar.style.display='flex'; document.getElementById('deskPinBarText').textContent=text; }
      else dbar.style.display='none';
    }
  });
}


/* ══ SWIPE GERİ ANİMASYON ══ */

document.addEventListener('DOMContentLoaded',function(){
  var sx=0,sy=0,dragging=false,confirmed=false;
  var W=window.innerWidth;

  function getActive(){
    var a=document.querySelector('.screen.active');
    if(!a) return null;
    if(a.id==='loginScreen'||a.id==='roomsScreen') return null;
    return a;
  }

  function doGoBack(el){
    if(el.id==='chatScreen') goBack();
    else switchMainTab('home');
  }

  function snapBack(el){
    el.style.transition='transform .25s cubic-bezier(.4,0,.2,1)';
    el.style.transform='translateX(0)';
    setTimeout(function(){ el.style.transition=''; el.style.transform=''; },260);
  }

  function snapComplete(el){
    el.style.transition='transform .22s cubic-bezier(.4,0,.2,1)';
    el.style.transform='translateX('+W+'px)';
    setTimeout(function(){
      el.style.transition='';
      el.style.transform='';
      doGoBack(el);
    },220);
  }

  document.addEventListener('touchstart',function(e){
    W=window.innerWidth;
    var a=getActive(); if(!a) return;
    sx=e.touches[0].clientX;
    sy=e.touches[0].clientY;
    dragging=false; confirmed=false;
  },{passive:true});

  document.addEventListener('touchmove',function(e){
    var a=getActive(); if(!a) return;
    var cx=e.touches[0].clientX;
    var cy=e.touches[0].clientY;
    var dx=cx-sx;
    var dy=Math.abs(cy-sy);
    if(!dragging){
      if(dy>12&&dy>Math.abs(dx)){ return; } // dikey scroll
      if(dx>10){ dragging=true; }
      else return;
    }
    if(dx<0) dx=0;
    a.style.transition='none';
    a.style.transform='translateX('+dx+'px)';
    // Eşiği geçtiyse işaretle
    confirmed=(dx>W*0.38);
  },{passive:true});

  document.addEventListener('touchend',function(e){
    var a=getActive(); if(!a||!dragging){ dragging=false; return; }
    dragging=false;
    var ex=e.changedTouches[0].clientX;
    var dx=ex-sx;
    if(confirmed||dx>W*0.38){ snapComplete(a); }
    else { snapBack(a); }
  },{passive:true});

  document.addEventListener('touchcancel',function(){
    var a=getActive(); if(!a) return;
    snapBack(a);
    dragging=false;
  },{passive:true});
});


/* ── 3. MESAJ POP ANİMASYONU ── */

(function(){
  const origAppend = window.appendMsg;
  // renderMsgs sonrası son mesaja pop animasyonu ekle
  const origRenderMsgs = window.renderMsgs;
  if(origRenderMsgs){
    window.renderMsgs = function(msgsObj, clearedAt){
      const box = document.getElementById('chatMsgs');
      const prevCount = box ? box.querySelectorAll('.mb').length : 0;
      origRenderMsgs(msgsObj, clearedAt);
      if(box){
        const newMsgs = box.querySelectorAll('.mb');
        const newCount = newMsgs.length;
        if(newCount > prevCount){
          // Sadece yeni gelen mesaja animasyon
          for(let i = newCount - (newCount - prevCount); i < newCount; i++){
            if(newMsgs[i]){
              newMsgs[i].classList.add('pop-in');
              setTimeout(()=>newMsgs[i].classList.remove('pop-in'), 400);
            }
          }
        }
      }
    };
  }
})();


/* ── 4. SCROLL-TO-BOTTOM BUTONU ── */

(function(){
  let _unreadCount = 0;
  function _initScrollBtn(){
    const chatMsgs = document.getElementById('chatMsgs');
    const btn = document.getElementById('scrollToBottomBtn');
    if(!chatMsgs || !btn) return;
    chatMsgs.addEventListener('scroll', ()=>{
      const atBot = chatMsgs.scrollHeight - chatMsgs.scrollTop - chatMsgs.clientHeight < 60;
      btn.classList.toggle('visible', !atBot);
      if(atBot){ _unreadCount = 0; btn.classList.remove('has-unread'); }
    });
  }
  window.scrollToBottomSmooth = function(){
    const b = document.getElementById('chatMsgs');
    if(b){ b.scrollTo({top:b.scrollHeight, behavior:'smooth'}); }
    _unreadCount = 0;
    const btn = document.getElementById('scrollToBottomBtn');
    if(btn) btn.classList.remove('has-unread','visible');
  };
  // Sayfa hazır olduğunda init et
  document.addEventListener('DOMContentLoaded', _initScrollBtn);
  setTimeout(_initScrollBtn, 1500);
  // Oda değişince yeniden init
  const origOpenRoom = window.openRoom;
  if(origOpenRoom) window.openRoom = function(...args){
    origOpenRoom(...args);
    setTimeout(_initScrollBtn, 500);
  };
})();


/* ── 5. SÜRÜKLE-BIRAK DOSYA ── */

(function(){
  function _attachDrag(container, overlay, inputId){
    if(!container || !overlay) return;
    let dragCount = 0;
    container.addEventListener('dragenter', e=>{
      if(!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault(); dragCount++;
      overlay.classList.add('active');
    });
    container.addEventListener('dragleave', e=>{
      dragCount--;
      if(dragCount<=0){ dragCount=0; overlay.classList.remove('active'); }
    });
    container.addEventListener('dragover', e=>{ if(e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
    container.addEventListener('drop', e=>{
      if(!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault(); dragCount=0;
      overlay.classList.remove('active');
      const files = e.dataTransfer.files;
      if(files && files[0]){
        const fakeInput = document.getElementById(inputId);
        if(fakeInput){
          const dt = new DataTransfer();
          dt.items.add(files[0]);
          fakeInput.files = dt.files;
          fakeInput.dispatchEvent(new Event('change'));
        }
      }
    });
    overlay.addEventListener('click', ()=>overlay.classList.remove('active'));
  }
  function _initDrop(){
    // Mobil chat screen
    const mobileScreen = document.getElementById('chatScreen');
    const mobileOverlay = document.getElementById('dropOverlay');
    _attachDrag(mobileScreen, mobileOverlay, 'fileInput');
    // Desktop chat area — ayrı overlay kullan
    const deskArea = document.getElementById('deskChatArea');
    const deskOverlay = document.getElementById('deskDropOverlay');
    _attachDrag(deskArea, deskOverlay, 'fileInput');
  }
  document.addEventListener('DOMContentLoaded', _initDrop);
  setTimeout(_initDrop, 1500);
})();


/* ── 6. SWIPE-TO-REPLY (Mobil) ── */

(function(){
  let _swipeStartX = null, _swipeEl = null, _swipeTriggered = false;

  function _onTouchStart(e){
    if(e.touches.length !== 1) return;
    const mb = e.target.closest('.mb');
    if(!mb) return;
    _swipeStartX = e.touches[0].clientX;
    _swipeEl = mb;
    _swipeTriggered = false;
  }
  function _onTouchMove(e){
    if(!_swipeEl || _swipeStartX===null) return;
    const dx = e.touches[0].clientX - _swipeStartX;
    if(dx > 0 && !_swipeEl.classList.contains('own')){
      // Sola yaslanmış mesaj - sağa kaydırma
      if(!_swipeEl.querySelector('.swipe-reply-hint')){
        const h = document.createElement('div');
        h.className = 'swipe-reply-hint'; h.textContent = '↩';
        _swipeEl.appendChild(h);
      }
      if(dx > 40 && !_swipeTriggered){
        _swipeTriggered = true;
        _swipeEl.classList.add('swiping-right');
        if(navigator.vibrate) navigator.vibrate(30);
      }
    }
  }
  function _onTouchEnd(){
    if(_swipeEl && _swipeTriggered){
      // Reply modunu tetikle
      const key = _swipeEl.dataset.key;
      const room = window._cRoom;
      if(key && room && window.replyToMsg) window.replyToMsg(room, key);
      setTimeout(()=>{
        if(_swipeEl) _swipeEl.classList.remove('swiping-right');
        _swipeEl = null; _swipeStartX = null; _swipeTriggered = false;
      }, 300);
    } else {
      if(_swipeEl) _swipeEl.classList.remove('swiping-right');
      _swipeEl = null; _swipeStartX = null; _swipeTriggered = false;
    }
  }

  document.addEventListener('touchstart', _onTouchStart, {passive:true});
  document.addEventListener('touchmove', _onTouchMove, {passive:true});
  document.addEventListener('touchend', _onTouchEnd);
})();


/* ── 8. TEPKİ BOUNCE + GÖNDER SQUISH ── */

(function(){
  // Tepki pill tıklaması (mevcut tepkiler)
  document.addEventListener('click', e=>{
    const pill = e.target.closest('.react-pill');
    if(pill){
      pill.classList.remove('bouncing');
      void pill.offsetWidth;
      pill.classList.add('bouncing');
      setTimeout(()=>pill.classList.remove('bouncing'), 400);
    }
    // Hızlı emoji butonu bounce (üst emoji bar)
    const qs = e.target.closest('.mb-react-quick span');
    if(qs){
      qs.classList.remove('emoji-bounce');
      void qs.offsetWidth;
      qs.classList.add('emoji-bounce');
      setTimeout(()=>qs.classList.remove('emoji-bounce'), 400);
    }
  });
  // Gönder butonu squish — mobil + masaüstü
  function _squishSendBtn(){
    ['sendBtn','deskSendBtn'].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn){ btn.classList.add('squish'); setTimeout(()=>btn.classList.remove('squish'),300); }
    });
  }
  const origSend = window.sendMsg;
  if(origSend){
    window.sendMsg = function(...args){
      _squishSendBtn();
      return origSend(...args);
    };
  }
  const origDeskSend = window.sendDeskMsg;
  if(origDeskSend){
    window.sendDeskMsg = function(...args){
      _squishSendBtn();
      return origDeskSend(...args);
    };
  }
})();

