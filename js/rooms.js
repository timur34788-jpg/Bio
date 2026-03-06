/* Nature.co — rooms.js */
/* Otomatik bölümlendi */

/* ── Online ── */

function startHeartbeat(){
  clearInterval(_hbTimer);
  const b=()=>{
    if(!_cu||!_db) return;
    dbRef('online/'+_cu).set({ts:Date.now(),user:_cu}).catch(()=>{});
    // Son görülme güncelle
    dbRef(wsPath('users/'+_cu+'/lastSeen')).set(Date.now()).catch(()=>{});
  };
  b(); _hbTimer=setInterval(b,25000);
  // Sayfa kapanınca lastSeen yaz
  window.addEventListener('beforeunload',()=>{
    if(_cu&&_db) dbRef(wsPath('users/'+_cu+'/lastSeen')).set(Date.now());
  },{once:true});
}
function listenOnline(){
  if(_stopOnl){_stopOnl();_stopOnl=null;}
  const ref=dbRef('online');
  const h=snap=>{
    const now=Date.now(),data=snap.val()||{};
    _online={};
    Object.entries(data).forEach(([k,v])=>{if(v&&now-v.ts<60000)_online[k]=true;});
    if(typeof _updateHdrOnlineFlip==='function'){
      const _cnt=Object.keys(_online).length;
      _updateHdrOnlineFlip(_cnt);
    }
    // Desktop member list'te online dotları smooth güncelle
    document.querySelectorAll('.desk-member-row .r-dot, .dsk-row-av .r-dot').forEach(dot=>{
      const av = dot.closest('[style*="background"]');
      if(!av) return;
      const nameEl = av.closest('.desk-member-row,.dsk-row')?.querySelector('.desk-m-name,.dsk-row-name');
      if(!nameEl) return;
      const uname = nameEl.textContent.trim();
      const isOn = !!_online[uname];
      dot.className = 'r-dot ' + (isOn?'on':'off');
    });
    updateChatStatus();refreshDots();
  };
  ref.on('value',h);_stopOnl=()=>ref.off('value',h);
}


/* ── Rooms ── */

function loadRooms(){
  const L=document.getElementById('roomsList');
  // Cache'den önce göster (anlık), sonra canlı güncelle
  const _roomsRef=dbRef('rooms');
  _roomsRef.once('value').then(snap=>{
    const rooms=snap.val()||{};
    renderRooms(rooms);
    // Okunmamış sayıları reads ile hesapla
    dbRef('reads/'+_cu).once('value').then(myReadsSnap=>{
      const myReads = myReadsSnap.val()||{};
      const roomList = Object.values(rooms);
      // Her oda için son mesaj zaman damgasına bak
      roomList.forEach(r=>{
        if(!r.id) return;
        const myLastRead = myReads[r.id]||0;
        dbRef('msgs/'+r.id).orderByChild('ts').startAt(myLastRead+1).limitToLast(20).once('value').then(ms=>{
          const msgs = ms.val()||{};
          const newMsgs = Object.values(msgs).filter(m=>m.user!==_cu && m.ts>myLastRead);
          if(newMsgs.length>0){
            _unread[r.id] = newMsgs.length;
            updateRoomBadge(r.id, _unread[r.id]);
          }
        }).catch(()=>{});
        // Listener başlat
        if(r.type==='channel'){ listenLastMsg(r.id); return; }
        const members = r.members||[];
        if(members.includes(_cu)){ listenLastMsg(r.id); }
      });
    }).catch(()=>{
      Object.values(rooms).forEach(r=>{
        if(!r.id) return;
        if(r.type==='channel'){ listenLastMsg(r.id); return; }
        const members = r.members||[];
        if(members.includes(_cu)){ listenLastMsg(r.id); }
      });
    });
  }).catch(()=>{
    if(L) L.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted);font-size:.85rem;">Bağlantı hatası</div>';
  });
}
function renderRooms(rooms){
  const L=document.getElementById('roomsList');
  const all=Object.values(rooms);
  const ch=all.filter(r=>r.type==='channel');
  // Admin: tüm grupları görür (üye olmasa da)
  const grMember=all.filter(r=>r.type==='group'&&(r.members&&r.members.includes(_cu)));
  const grHidden=_isAdmin?all.filter(r=>r.type==='group'&&!(r.members&&r.members.includes(_cu))):[];
  const dm=all.filter(r=>r.type==='dm'&&(r.members&&r.members.includes(_cu))&&!(r.hiddenBy&&r.hiddenBy.includes(_cu)));
  let h='';
  // ── NatureBot özel satırı (her zaman en üstte) ──
  h+=`<div class="sec-hdr" style="color:rgba(var(--accent-rgb,74,158,122),.65);letter-spacing:.1em;"><span class="chev">▾</span>NatureBot</div>`;
  h+=`<div class="r-row" data-room-id="naturebot" onclick="if(window._natureBotInstance){window._natureBotInstance.el&&window._natureBotInstance.el.click();}else{if(typeof startNatureBot==='function')startNatureBot();setTimeout(()=>{if(window._natureBotInstance)window._natureBotInstance.el&&window._natureBotInstance.el.click();},600);}" style="background:rgba(74,158,122,.05);border-left:2px solid rgba(74,158,122,.3);padding-left:14px;">
    <div class="r-icon" style="font-size:0;display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><rect x="7" y="4" width="10" height="7" rx="2"/><circle cx="9" cy="15" r="1.5" fill="var(--accent)" stroke="none"/><circle cx="15" cy="15" r="1.5" fill="var(--accent)" stroke="none"/><path d="M9.5 8H7m3.5 0h3m3.5 0H14"/></svg></div>
    <div class="r-label" style="color:var(--accent);font-weight:700;">NatureBot</div>
    <div style="font-size:.62rem;color:var(--muted);font-weight:700;letter-spacing:.05em;margin-left:auto;padding-right:4px;">AI</div>
  </div>`;
  if(ch.length){
    h+=`<div class="sec-hdr"><span class="chev">▾</span>Kanallar</div>`;
    ch.forEach(r=>{h+=chRow(r,false,false);});
  }
  const allGr=[...grMember,...grHidden];
  h+=`<div class="sec-hdr"><span class="chev">▾</span>Gruplar<span class="sec-add" onclick="openCreateGroupModal()">＋</span></div>`;
  if(allGr.length){
    grMember.forEach(r=>{h+=chRow(r,true,false);});
    grHidden.forEach(r=>{h+=chRow(r,false,true);});
  } else if(!_isAdmin) {
    h+=`<div style="padding:5px 44px;font-size:.82rem;color:rgba(255,255,255,.3)">＋ ile yeni grup oluştur</div>`;
  }
  h+=`<div class="sec-hdr"><span class="chev">▾</span>Direkt Mesajlar<span class="sec-add" onclick="openDMModal()">＋</span></div>`;
  if(dm.length){dm.forEach(r=>{h+=dmRowHTML(r);});}
  else{h+=`<div style="padding:5px 44px;font-size:.82rem;color:rgba(255,255,255,.3)">＋ ile yeni mesaj başlat</div>`;}
  L.innerHTML=h||'<div style="padding:20px 16px;font-size:.85rem;color:rgba(255,255,255,.3)">Henüz oda yok. Admin kanal oluşturabilir.</div>';
}
function chRow(r, showLeave, hiddenAdmin){
  const unread=_unread[r.id]||0;
  const cls=unread?'r-row unread':'r-row';
  const icon=r.type==='group'?'👥':'#';
  const isMember=r.members&&r.members.includes(_cu);
  const leaveBtn=(showLeave&&r.type==='group'&&isMember)?`<div class="r-leave-btn" onclick="event.stopPropagation();leaveGroup('${r.id}','${esc(r.name||r.id)}')" title="Gruptan ayrıl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>`:'';
  // Admin özel badge
  const spyBadge=hiddenAdmin?`<div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(245,166,35,.15);color:#f5a623;font-size:.6rem;font-weight:900;padding:2px 6px;border-radius:100px;letter-spacing:.04em;">👁 GİZLİ</div>`:'';
  const lockedBadge=r.locked?`<span title="Kilitli" style="margin-left:4px;font-size:.75rem;opacity:.6;">🔒</span>`:'';
  const mutedBadge=r.muted?`<span title="Susturulmuş" style="margin-left:2px;font-size:.75rem;opacity:.6;">🔇</span>`:'';
  const last = _lastMsg[r.id]||{};
  const prevText = last.text ? (last.text.length>40?last.text.slice(0,40)+'…':last.text) : (last.file?'📎 Dosya':'');
  const prevUser = last.user||'';
  const prevOnline = Object.values(_online||{}).length;
  const popup = `<div class="room-preview-popup">
    <div class="rpp-name">${r.type==='group'?'👥 ':'# '}${esc(r.name||r.id)}</div>
    ${prevText?`<div class="rpp-msg">${prevUser?`<b style="color:var(--text)">${esc(prevUser)}:</b> `:''}${esc(prevText)}</div>`:''}
    <div class="rpp-meta"><div class="rpp-dot"></div><span id="rpp-online-${r.id}">… çevrimiçi</span></div>
  </div>`;
  return `<div class="${cls}" style="position:relative;${hiddenAdmin?'opacity:.75;':''}" onclick="openRoom('${r.id}')">
    <div class="r-icon">${icon}</div>
    <div class="r-label">${esc(r.name||r.id)}${lockedBadge}${mutedBadge}</div>
    ${unread?`<div class="ubadge">${unread}</div>`:''}
    ${leaveBtn}
    ${spyBadge}
    ${popup}
  </div>`;
}
function dmRowHTML(r){
  const other=(r.members||[]).find(m=>m!==_cu)||'?';
  const on=!!_online[other];
  const col=strColor(other);
  const unread=_unread[r.id]||0;
  const cls=unread?'r-row unread':'r-row';
  return `<div class="${cls}" onclick="openRoom('${r.id}')">
    <div class="r-av" style="background:${col}">${initials(other)}<div class="r-dot ${on?'on':'off'}" id="rdot-${r.id}"></div></div>
    <div class="r-label" id="rlabel-${r.id}">${esc(other)}</div>
    ${unread?`<div class="ubadge">${unread}</div>`:''}
    <div class="dm-close-btn" onclick="event.stopPropagation();closeDmConversation('${r.id}')" title="Kapat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
  </div>`;
}
function closeDmConversation(roomId){
  if(!confirm('Bu DM konuşmasını listeden kaldırmak istiyor musunuz?\n\nMesajlar silinmez, kişiyle tekrar mesajlaşınca geri açılır.')) return;
  dbRef('rooms/'+roomId+'/hiddenBy').once('value').then(snap=>{
    const hidden = snap.val()||[];
    if(!hidden.includes(_cu)){
      dbRef('rooms/'+roomId+'/hiddenBy').set([...hidden, _cu]).then(()=>{
        if(IS_DESKTOP()){
          if(_deskRoom===roomId){_deskRoom=null;document.getElementById('deskChatArea').style.display='none';document.getElementById('deskEmptyState').style.display='flex';}
          deskLoadRoomList();
        } else {
          if(_cRoom===roomId){goBack();}
          loadRooms();
        }
      });
    }
  });
}
function refreshDots(){
  document.querySelectorAll('[id^="rdot-"]').forEach(dot=>{
    const rid=dot.id.replace('rdot-','');
    const lbl=document.getElementById('rlabel-'+rid);
    if(!lbl)return;
    dot.className='r-dot '+(!!_online[lbl.textContent]?'on':'off');
  });
}
// Aktif dinleyicileri sakla — tekrar bağlanmayı önle
const _lastMsgListeners = {};

function listenLastMsg(roomId){
  // Zaten dinleniyorsa tekrar bağlama
  if(_lastMsgListeners[roomId]) return;
  const ref = dbRef('msgs/'+roomId).orderByChild('ts').limitToLast(1);
  const _listenStartTs = Date.now(); // Listener başlangıç zamanı
  let _firstFire = true; // İlk tetikleme = mevcut durum, sayma
  const handler = snap=>{
    const msgs=snap.val();
    if(msgs){
      const last=Object.values(msgs)[0];
      _lastMsg[roomId]=last;
      // İlk tetikleme: sadece son mesaj zamanını kaydet, sayma
      if(_firstFire){
        _firstFire = false;
        return; // İlk yüklemede badge artırma
      }
      if(last&&last.user!==_cu){
        checkAndNotify(roomId, last);
      }
      // Sadece gerçekten yeni mesajlar (listener başladıktan sonra gelen)
      const msgTs = last&&last.ts ? last.ts : 0;
      if(_cRoom!==roomId&&_deskRoom!==roomId&&last&&last.user!==_cu&&msgTs>_listenStartTs){
        _unread[roomId]=(_unread[roomId]||0)+1;
        updateRoomBadge(roomId, _unread[roomId]);
        // Bildirim merkezi
        if(typeof addNotif==='function'){
          const notifText=(last.text||'').slice(0,50);
          addNotif('msg', last.user + ' sana mesaj atti', notifText, function(){openChat(roomId,'','','');});
        }
        // Auto-unhide DM if we receive a new message from them
        dbRef('rooms/'+roomId+'/hiddenBy').once('value').then(s=>{
          const hidden=s.val()||[];
          if(hidden.includes(_cu)){
            const updated=hidden.filter(u=>u!==_cu);
            dbRef('rooms/'+roomId+'/hiddenBy').set(updated.length?updated:null).then(()=>{
              if(IS_DESKTOP()) deskLoadRoomList(); else loadRooms();
            });
          }
        });
      }
    }
  };
  ref.on('value', handler);
  _lastMsgListeners[roomId] = ()=>ref.off('value', handler);
}



function adminJoinGroup(){
  if(!_cRoom)return;
  dbRef('rooms/'+_cRoom+'/members').once('value').then(snap=>{
    const members=snap.val()||[];
    if(members.includes(_cu))return;
    members.push(_cu);
    dbRef('rooms/'+_cRoom+'/members').set(members).then(()=>{
      showToast('Gruba katıldınız.');
      document.getElementById('adminSpyBanner').style.display='none';
      const inp=document.getElementById('chatInputRow');
      if(inp) inp.style.display='';
      loadRooms();
    });
  });
}


/* ── Create Group Modal ── */

function openCreateGroupModal(){
  document.getElementById('createGroupModal').style.display='flex';
  document.getElementById('cgName').value='';
  document.getElementById('cgSearch').value='';
  document.getElementById('cgUserList').innerHTML='';
  document.getElementById('cgSelectedList').innerHTML='<div style="color:var(--muted);font-size:.78rem">Henüz kimse seçilmedi</div>';
  _cgSelected=new Set();
  loadCGUsers('');
}
function closeCGModal(){document.getElementById('createGroupModal').style.display='none';}
let _cgSelected=new Set();
function loadCGUsers(q){
  const el=document.getElementById('cgUserList');
  dbRef('users').once('value').then(snap=>{
    const rawUsers=snap.val()||{}; const users=Object.keys(rawUsers).filter(u=>{if(u===_cu||rawUsers[u].banned) return false; if(q&&!u.toLowerCase().includes(q)) return false; return true;});
    if(!users.length){el.innerHTML='<div style="color:var(--muted);font-size:.78rem;padding:8px">Kullanıcı bulunamadı</div>';return;}
    el.innerHTML=users.map(u=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;" onclick="toggleCGUser('${u}')">
        <input type="checkbox" id="cgcb-${u}" ${_cgSelected.has(u)?'checked':''} style="width:15px;height:15px;">
        <div style="width:30px;height:30px;border-radius:7px;background:${strColor(u)};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:#fff;">${initials(u)}</div>
        <div style="font-size:.85rem;color:var(--text-hi);">${esc(u)}</div>
        <div style="font-size:.7rem;color:var(--muted);margin-left:auto;">${_online[u]?'🟢':''}</div>
      </div>`).join('');
  });
}
function toggleCGUser(u){
  if(_cgSelected.has(u))_cgSelected.delete(u);
  else _cgSelected.add(u);
  const cb=document.getElementById('cgcb-'+u);
  if(cb)cb.checked=_cgSelected.has(u);
  const selEl=document.getElementById('cgSelectedList');
  if(_cgSelected.size===0){selEl.innerHTML='<div style="color:var(--muted);font-size:.78rem">Henüz kimse seçilmedi</div>';return;}
  selEl.innerHTML=[..._cgSelected].map(s=>`<div style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border-radius:100px;padding:3px 10px 3px 6px;font-size:.75rem;margin:2px;">
    <div style="width:18px;height:18px;border-radius:4px;background:${strColor(s)};display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:900;color:#fff;">${initials(s)}</div>
    ${esc(s)}
    <span onclick="toggleCGUser('${s}')" style="cursor:pointer;color:var(--muted);margin-left:2px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>
  </div>`).join('');
}
function submitCreateGroup(){
  const name=document.getElementById('cgName').value.trim();
  if(!name){showToast('Grup adı girin.');return;}
  const members=[_cu,..._cgSelected];
  const id='group_'+name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')+'_'+Date.now();
  const data={id,name,type:'group',members,createdBy:_cu,founder:_cu,ts:Date.now()};
  dbRef('rooms/'+id).set(data).then(()=>{
    showToast('"'+name+'" grubu oluşturuldu!');
    closeCGModal();
    loadRooms();
    setTimeout(()=>openRoom(id),300);
  }).catch(()=>showToast('Hata oluştu.'));
}


/* ── Open Room ── */

function openRoom(roomId){
  if(_stopMsg){_stopMsg();_stopMsg=null;}
  stopTypingListener();
  _cRoom=roomId;clearUnreadBadge(roomId);closeEmoji();
  _currentMsgBox='chatMsgs';
  markRoomRead(roomId);
  listenReads(roomId);
  listenTyping(roomId);
  listenPinBar(roomId);
  if(typeof loadBookmarks==='function') loadBookmarks(roomId);
  document.getElementById('chatMsgs').innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  dbRef('rooms/'+roomId).once('value').then(snap=>{
    const room=snap.val();if(!room)return;
    if(room.type==='dm'){
      const other=(room.members||[]).find(m=>m!==_cu)||'?';
      const ic=document.getElementById('chatHdrIcon');
      ic.textContent=initials(other);ic.style.background=strColor(other);
      document.getElementById('chatHdrName').textContent=other;
      updateChatStatus();
      showCallBtns(true);
    } else {
      showCallBtns(false);
      const ic=document.getElementById('chatHdrIcon');
      ic.textContent=room.type==='group'?'👥':'#';
      ic.style.background=room.type==='group'?'linear-gradient(135deg,#9b72ff,#c4a7ff)':'var(--surface2)';
      document.getElementById('chatHdrName').textContent=room.name||roomId;
      const isHiddenAdmin=_isAdmin&&room.type==='group'&&!(room.members||[]).includes(_cu);
      const subEl=document.getElementById('chatHdrSub');
      if(isHiddenAdmin){
        subEl.textContent='\u{1F441} \u00d6zel mod \u2014 '+(room.members||[]).length+' \u00fcye';
        subEl.className='c-hdr-sub';
        subEl.style.color='#f5a623';
        // Mesaj gönderim alanını gizle
        const inp=document.getElementById('chatInputRow');
        if(inp) inp.style.display='none';
        document.getElementById('adminSpyBanner').style.display='flex';
      } else {
        // Online sayısını flip animasyonla göster
        const _memberCount = (room.members||[]).length;
        const _onlineCount = (room.members||[]).filter(m=>!!(_online||{})[m]).length;
        if(room.type==='group'){
          subEl.innerHTML = `${_memberCount} üye &nbsp;·&nbsp; <span id="hdrOnlineCount" style="color:var(--green);">${_onlineCount} çevrimiçi</span>`;
        } else {
          // Kanal — tüm online kullanıcılar
          const _allOnline = Object.keys(_online||{}).length;
          subEl.innerHTML = `Kanal &nbsp;·&nbsp; <span id="hdrOnlineCount" style="color:var(--green);">${_allOnline} çevrimiçi</span>`;
        }
        subEl.className='c-hdr-sub';
        subEl.style.color='';
        const inp=document.getElementById('chatInputRow');
        if(inp) inp.style.display='';
        document.getElementById('adminSpyBanner').style.display='none';
        // Kilit / susturma kontrolü
        const msgInp = document.getElementById('msgInp');
        const sendBtn = document.getElementById('sendBtn');
        if(room.locked && !_isAdmin){
          if(msgInp){ msgInp.disabled=true; msgInp.placeholder='🔒 Bu oda kilitli'; }
          if(sendBtn) sendBtn.disabled=true;
        } else if(room.muted && !_isAdmin){
          if(msgInp){ msgInp.disabled=true; msgInp.placeholder='🔇 Bu grup susturulmuş'; }
          if(sendBtn) sendBtn.disabled=true;
        } else {
          if(msgInp){ msgInp.disabled=false; msgInp.placeholder='Mesaj yaz...'; }
          if(sendBtn) sendBtn.disabled=false;
        }
      }
    }
  });
  showScreen('chatScreen');
  // clearedAt bilgisini ONCE al, SONRA listener başlat (race condition fix)
  const ref=dbRef('msgs/'+roomId);
  dbRef('rooms/'+roomId+'/clearedAt').once('value').then(cs=>{
    const _clearedAt=cs.val()||0;
    if(_cRoom!==roomId)return;
    const h=snap=>{if(_cRoom!==roomId)return;renderMsgs(snap.val(),_clearedAt);};
    ref.on('value',h);_stopMsg=()=>ref.off('value',h);
  }).catch(()=>{
    const h=snap=>{if(_cRoom!==roomId)return;renderMsgs(snap.val(),0);};
    ref.on('value',h);_stopMsg=()=>ref.off('value',h);
  });
}
function updateChatStatus(){
  const roomId = _deskRoom || _cRoom;
  if(!roomId) return;
  dbRef('rooms/'+roomId).once('value').then(snap=>{
    const room=snap.val();if(!room||room.type!=='dm')return;
    const other=(room.members||[]).find(m=>m!==_cu)||'?';
    const on=!!_online[other];
    // Mobil header
    const el=document.getElementById('chatHdrSub');
    if(el){
      if(on){ el.className='c-hdr-sub on'; el.innerHTML='🟢 Çevrimiçi'; }
      else {
        dbRef(wsPath('users/'+other+'/lastSeen')).once('value').then(ls=>{
          const ts=ls.val(); el.className='c-hdr-sub';
          el.textContent = ts ? 'Son görülme: '+fmtLastSeen(ts) : 'Çevrimdışı';
        });
      }
    }
    // Desktop header
    const deskSub = document.getElementById('deskChatHdrSub');
    if(deskSub && _deskRoom){
      if(on){ deskSub.textContent='🟢 Çevrimiçi'; }
      else {
        dbRef(wsPath('users/'+other+'/lastSeen')).once('value').then(ls=>{
          const ts=ls.val();
          deskSub.textContent = ts ? 'Son görülme: '+fmtLastSeen(ts) : 'Çevrimdışı';
        });
      }
    }
  });
}

function fmtLastSeen(ts){
  const diff = Date.now()-ts;
  const m = Math.floor(diff/60000);
  if(m<1) return 'az önce';
  if(m<60) return m+' dakika önce';
  const h=Math.floor(m/60);
  if(h<24) return h+' saat önce';
  const d=Math.floor(h/24);
  return d+' gün önce';
}


/* ── Admin: Rooms ── */

let _newRoomType='channel';
async function loadAdminRooms(){
  const body=document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  const rooms=await adminRestGet('rooms').catch(()=>null)||{};
  try{
    {
    const list=Object.values(rooms).filter(r=>r.type!=='dm').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const dmList=Object.values(rooms).filter(r=>r.type==='dm').sort((a,b)=>(a.ts||0)-(b.ts||0));
    let h='<div class="admin-section"><div class="admin-sec-title">Yeni Oda Oluştur</div>';
    h+=`<div class="admin-radio-group"><div class="admin-radio sel" id="rtChannel" onclick="selectRoomType('channel')">📢 Kanal</div><div class="admin-radio" id="rtGroup" onclick="selectRoomType('group')">👥 Grup</div></div>`;
    h+='<input class="admin-inp" id="newRoomName" placeholder="Oda adı..." autocorrect="off">';
    h+='<button class="admin-submit" onclick="adminCreateRoom()">✚ Oluştur</button></div>';
    h+='<div class="admin-section"><div class="admin-sec-title">Mevcut Odalar ('+list.length+')</div><div class="admin-card">';
    if(!list.length){h+='<div style="padding:14px;color:var(--muted);font-size:.85rem">Henüz kanal/grup yok.</div>';}
    list.forEach(r=>{
      const memberCount=(r.members||[]).length;
      const locked=!!r.locked;
      const slowMode=r.slowMode||0;
      const pinned=r.pinnedMsg||'';
      h+='<div class="admin-row" style="flex-wrap:wrap;gap:8px;">';
      h+='<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">';
      h+='<div style="font-size:1.3rem;width:36px;text-align:center;flex-shrink:0">'+(r.type==='group'?'👥':'#')+'</div>';
      h+='<div class="admin-row-info"><div class="admin-row-name">'+esc(r.name||r.id)+(locked?' 🔒':'')+'</div>';
      h+='<div class="admin-row-sub">'+(r.type==='channel'?'Kanal':'Grup')+' · '+memberCount+' üye'+(r.createdBy?' · '+esc(r.createdBy):'')+(slowMode?' · ⏱'+slowMode+'s':'')+'</div></div></div>';
      h+='<div class="admin-row-btns" style="flex-wrap:wrap;">';
      h+='<button class="a-btn blue" data-id="'+r.id+'" data-name="'+esc(r.name||r.id)+'" onclick="adminRenameRoom(this.dataset.id,this.dataset.name)">✏️ Yeniden Adlandır</button>';
      h+=`<button class="a-btn ${locked?'green':'yellow'}" onclick="adminToggleLockRoom('${r.id}',${!locked})">${locked?'🔓 Kilidi Aç':'🔒 Kilitle'}</button>`;
      h+='<button class="a-btn" style="background:var(--surface);" data-id="'+r.id+'" onclick="adminRoomDetails(this.dataset.id)">⚙️ Detay</button>';
      h+='<button class="a-btn blue" data-id="'+r.id+'" data-sm="'+slowMode+'" onclick="adminSetSlowMode(this.dataset.id,parseInt(this.dataset.sm))">⏱ Yavaş Mod</button>';
      if(r.type==='group') h+='<button class="a-btn blue" data-id="'+r.id+'" data-name="'+esc(r.name||r.id)+'" onclick="adminManageMembers(this.dataset.id,this.dataset.name)">👥 Üyeler</button>';
      h+='<button class="a-btn red" data-id="'+r.id+'" data-name="'+esc(r.name||r.id)+'" onclick="adminClearRoomMsgs(this.dataset.id,this.dataset.name)">🗑️ Mesajları Temizle</button>';
      h+='<button class="a-btn red" data-id="'+r.id+'" data-name="'+esc(r.name||r.id)+'" onclick="adminDeleteRoom(this.dataset.id,this.dataset.name)">✕ Odayı Sil</button>';
      h+='</div></div>';
    });
    h+='</div></div>';

    // DM Konuşmaları bölümü
    if(dmList.length){
      h+='<div class="admin-section"><div class="admin-sec-title">💬 DM Konuşmaları ('+dmList.length+')</div><div class="admin-card">';
      dmList.forEach(r=>{
        const members=(r.members||[]).filter(m=>m!=='admin');
        const label = members.length>=2 ? members[0]+' ↔ '+members[1] : (members[0]||r.id);
        h+='<div class="admin-row">';
        h+='<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;"><div style="font-size:1.2rem;width:36px;text-align:center;">💬</div>';
        h+='<div class="admin-row-info"><div class="admin-row-name">'+esc(label)+'</div></div></div>';
        h+='<div class="admin-row-btns">';
        h+='<button class="a-btn red" data-id="'+r.id+'" data-name="'+esc(label)+'" onclick="adminClearRoomMsgs(this.dataset.id,this.dataset.name)">🗑️ Mesajları Temizle</button>';
        h+='<button class="a-btn red" data-id="'+r.id+'" data-name="'+esc(label)+'" onclick="adminDeleteRoom(this.dataset.id,this.dataset.name)">✕ Sil</button>';
        h+='</div></div>';
      });
      h+='</div></div>';
    }

    body.innerHTML=h;
  }}catch(e){body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>';}
}

async function adminToggleLockRoom(id, lock){
  try{
    await adminRestSet('rooms/'+id+'/locked',lock);
    showToast(lock?'Oda kilitlendi. Sadece adminler mesaj atabilir.':'Oda kilidi açıldı.');
    loadAdminRooms(); loadRooms();
  }catch(e){showToast('Hata: '+(e&&e.message||''));}
}
async function adminSetSlowMode(id, current){
  const val=prompt('Yavaş mod (saniye, 0=kapalı):', current);
  if(val===null)return;
  const n=parseInt(val)||0;
  try{
    await adminRestSet('rooms/'+id+'/slowMode',n);
    showToast('Yavaş mod: '+(n?n+'s':'Kapalı'));loadAdminRooms();
  }catch(e){showToast('Hata.');}
}
async function adminClearRoomMsgs(id, name){
  if(!confirm('"'+name+'" odasındaki tüm mesajlar silinsin mi?'))return;
  const clearedAt = Date.now();
  try{
    await adminRestDelete('msgs/'+id);
    await adminRestSet('rooms/'+id+'/clearedAt',clearedAt);
    showToast('Mesajlar temizlendi. ✅');loadAdminRooms();
  }catch(e){showToast('Hata.');}
}
async function adminManageMembers(roomId, roomName){
  const room=await adminRestGet('rooms/'+roomId).catch(()=>null);
  if(!room)return;
  const allUsersData=await adminRestGet('users').catch(()=>({})) || {};
  {
    const allUsers=Object.keys(allUsersData).filter(u=>!allUsersData[u].banned);
    const members=room.members||[];
      let html='<div style="max-height:400px;overflow-y:auto;margin-top:12px;">';
      html+='<div style="font-size:.8rem;font-weight:700;color:var(--muted);margin-bottom:8px;">ÜYE LİSTESİ — '+esc(roomName)+'</div>';
      allUsers.forEach(u=>{
        const isMember=members.includes(u);
        html+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">';
        html+='<div style="width:30px;height:30px;border-radius:7px;background:'+strColor(u)+';display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:#fff;">'+initials(u)+'</div>';
        html+='<div style="flex:1;font-size:.85rem;color:var(--text-hi);">'+esc(u)+'</div>';
        if(isMember){
          html+='<button data-rid="'+roomId+'" data-u="'+u+'" onclick="adminKickFromGroup(this.dataset.rid,this.dataset.u,this.parentElement)" style="background:rgba(224,30,90,.15);color:#e01e5a;border:none;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;">Çıkar</button>';
        } else {
          html+='<button data-rid="'+roomId+'" data-u="'+u+'" onclick="adminAddToGroup(this.dataset.rid,this.dataset.u,this)" style="background:rgba(29,155,209,.15);color:#5b9bd5;border:none;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;">Ekle</button>';
        }
        html+='</div>';
      });
      html+='</div>';
      const body=document.getElementById('adminBody');
      const existing=document.getElementById('memberMgmtPanel');
      if(existing)existing.remove();
      const panel=document.createElement('div');
      panel.id='memberMgmtPanel';
      panel.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
      panel.innerHTML='<div style="background:var(--bg2);border-radius:14px;padding:18px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-weight:900;color:var(--text-hi);">👥 Üye Yönetimi</div><div onclick="document.getElementById(\'memberMgmtPanel\').remove()" style="cursor:pointer;color:var(--muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div></div>'+
        html+'</div>';
      document.body.appendChild(panel);
  }
}
async function adminKickFromGroup(roomId, username, rowEl){
  try{
    const room=await adminRestGet('rooms/'+roomId)||{};
    const members=(room.members||[]).filter(m=>m!==username);
    await adminRestSet('rooms/'+roomId+'/members',members);
    showToast(username+' gruptan çıkarıldı.');
    if(rowEl) rowEl.querySelector('button').textContent='Ekle';
    if(rowEl) rowEl.querySelector('button').onclick=function(){adminAddToGroup(roomId,username,this);};
    if(rowEl) rowEl.querySelector('button').style.cssText='background:rgba(29,155,209,.15);color:#5b9bd5;border:none;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;';
  }catch(e){showToast('Hata.');}
}
async function adminAddToGroup(roomId, username, btn){
  try{
    const room=await adminRestGet('rooms/'+roomId)||{};
    const members=room.members||[];
    if(members.includes(username))return;
    members.push(username);
    await adminRestSet('rooms/'+roomId+'/members',members);
    showToast(username+' gruba eklendi.');
    if(btn){btn.textContent='Çıkar';btn.style.cssText='background:rgba(224,30,90,.15);color:#e01e5a;border:none;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;';btn.onclick=function(){adminKickFromGroup(roomId,username,btn.closest('div[style]'));};}
  }catch(e){showToast('Hata.');}
}
function selectRoomType(type){
  _newRoomType=type;
  document.getElementById('rtChannel').classList.toggle('sel',type==='channel');
  document.getElementById('rtGroup').classList.toggle('sel',type==='group');
}
async function adminCreateRoom(){
  const name=document.getElementById('newRoomName').value.trim();
  if(!name){showToast('Oda adı girin.');return;}
  const id=_newRoomType+'_'+name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')+'_'+Date.now();
  const data={id,name,type:_newRoomType,members:[_cu],ts:Date.now()};
  try{
    await adminRestSet('rooms/'+id,data);
    showToast(name+' oluşturuldu!');
    document.getElementById('newRoomName').value='';
    loadAdminRooms();loadRooms();
  }catch(e){showToast('Hata oluştu.');}
}
async function adminDeleteRoom(id,name){
  if(!confirm(`"${name}" odası silinsin mi? Tüm mesajlar da silinecek.`))return;
  try{
    await Promise.all([adminRestDelete('rooms/'+id),adminRestDelete('msgs/'+id)]);
    showToast(name+' silindi.');loadAdminRooms();loadRooms();
  }catch(e){showToast('Hata oluştu.');}
}


async function loadAdminStats(){
  const body=document.getElementById('adminBody');
  body.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  try{
  const [users,rooms,posts,online]=await Promise.all([
    adminRestGet('users').catch(()=>({})),
    adminRestGet('rooms').catch(()=>({})),
    adminRestGet('forum/posts').catch(()=>({})),
    adminRestGet('online').catch(()=>({}))
  ]);
  {
    const _users=users||{};
    const _rooms=rooms||{};
    const _posts=posts||{};
    const _online=online||{};
    const now=Date.now();
    const totalUsers=Object.keys(_users).length;
    const bannedUsers=Object.values(_users).filter(u=>u&&u.banned).length;
    const adminUsers=Object.values(_users).filter(u=>u&&u.isAdmin).length;
    const onlineNow=Object.values(_online).filter(v=>v&&now-v.ts<60000).length;
    const channels=Object.values(_rooms).filter(r=>r.type==='channel').length;
    const groups=Object.values(_rooms).filter(r=>r.type==='group').length;
    const forumPosts=Object.keys(_posts).length;
    // Origin dağılımı
    const origins={};
    Object.values(_users).forEach(u=>{if(u&&u.origin)origins[u.origin]=(origins[u.origin]||0)+1;});
    const topOrigins=Object.entries(origins).sort((a,b)=>b[1]-a[1]).slice(0,8);

    const card=(title,val,color)=>`<div style="background:var(--surface2);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;"><div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">${title}</div><div style="font-size:1.6rem;font-weight:900;color:${color||'var(--text-hi)'};">${val}</div></div>`;
    let h='<div class="admin-section"><div class="admin-sec-title">📊 Anlık İstatistikler</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;">';
    h+=card('Toplam Üye',totalUsers);
    h+=card('Şu An Online',onlineNow,'#4caf50');
    h+=card('Banlı Üye',bannedUsers,'#e01e5a');
    h+=card('Admin',adminUsers,'#f5a623');
    h+=card('Kanal',channels,'#5b9bd5');
    h+=card('Grup',groups,'#9b59b6');
    h+=card('Forum Paylaşımı',forumPosts,'#1abc9c');
    h+='</div>';
    if(topOrigins.length){
      h+='<div class="admin-sec-title" style="margin-top:4px;">🌍 Köken Dağılımı</div>';
      h+='<div class="admin-card" style="padding:12px;">';
      topOrigins.forEach(([origin,count])=>{
        const pct=Math.round(count/totalUsers*100);
        h+=`<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-hi);margin-bottom:3px;"><span>${origin}</span><span>${count} üye (${pct}%)</span></div>
          <div style="background:var(--surface2);border-radius:100px;height:6px;overflow:hidden;"><div style="background:var(--blue);height:100%;width:${pct}%;border-radius:100px;transition:width .4s;"></div></div>
        </div>`;
      });
      h+='</div>';
    }
    h+='</div>';
    body.innerHTML=h;
  }
}catch(e){body.innerHTML='<p style="color:var(--muted);padding:20px">Yüklenemedi.</p>';}
}


/* ── 📡 YAYIM (Broadcast) ── */

function loadAdminNatureBot() {
  const body = document.getElementById('adminBody');
  if (!body) return;

  const bot = window._natureBotInstance;
  const isActive = !!bot;
  const state = !bot ? 'Başlatılmamış'
    : bot.isSleeping ? '😴 Uyuyor'
    : bot.isAtHome   ? '🏠 Yuvada'
    : bot.isCalling  ? '📞 Arıyor'
    : bot.isTalking  ? '💬 Konuşuyor'
    : '🚶 Dolaşıyor';

  const wanderMin = bot ? Math.round(bot.WANDER_DURATION / 60000) : 15;
  const sleepMin  = bot ? Math.round(bot.SLEEP_DURATION  / 60000) : 45;

  body.innerHTML = `
  <div class="admin-section">
    <div class="admin-sec-title">🤖 NatureBot Durumu</div>
    <div class="admin-card" style="padding:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
      <div style="text-align:center;min-width:80px;">
        <div style="font-size:2.5rem;">🤖</div>
        <div style="font-size:.7rem;font-weight:800;margin-top:4px;color:${isActive ? 'var(--green)' : 'var(--muted)'};">
          ${isActive ? '● AKTİF' : '○ PASİF'}
        </div>
      </div>
      <div style="flex:1;min-width:160px;">
        <div style="font-size:1rem;font-weight:900;color:var(--text-hi);margin-bottom:4px;">NatureBot</div>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:8px;">Durum: <b style="color:var(--text)">${state}</b></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="a-btn blue" onclick="adminBotAction('start')" ${isActive ? 'disabled style="opacity:.5"' : ''}>▶ Başlat</button>
          <button class="a-btn red"  onclick="adminBotAction('stop')"  ${!isActive ? 'disabled style="opacity:.5"' : ''}>■ Durdur</button>
          <button class="a-btn"      onclick="adminBotAction('reload')" ${!isActive ? 'disabled style="opacity:.5"' : ''}>🔄 Yeniden Başlat</button>
        </div>
      </div>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">🎮 Anlık Kontroller</div>
    <div class="admin-card" style="padding:14px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="a-btn blue"  onclick="adminBotAction('wake')"   ${!isActive ? 'disabled style="opacity:.5"' : ''}>☀ Uyandır</button>
      <button class="a-btn"       onclick="adminBotAction('sleep')"  ${!isActive ? 'disabled style="opacity:.5"' : ''}>😴 Uyut</button>
      <button class="a-btn"       onclick="adminBotAction('home')"   ${!isActive ? 'disabled style="opacity:.5"' : ''}>🏠 Eve Gönder</button>
      <button class="a-btn blue"  onclick="adminBotAction('wander')" ${!isActive ? 'disabled style="opacity:.5"' : ''}>🚶 Dolaştır</button>
      <button class="a-btn"       onclick="adminBotAction('greet')"  ${!isActive ? 'disabled style="opacity:.5"' : ''}>👋 Selamlat</button>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">⏱ Süre Ayarları</div>
    <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <label style="font-size:.8rem;color:var(--muted);min-width:140px;">🚶 Dolaşma Süresi (dk)</label>
        <input id="botWanderMin" type="number" min="1" max="120" value="${wanderMin}"
          style="width:80px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-hi);font-size:.85rem;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
        <span style="font-size:.75rem;color:var(--muted);">dk sonra uyku denemeleri başlar</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <label style="font-size:.8rem;color:var(--muted);min-width:140px;">😴 Uyku Süresi (dk)</label>
        <input id="botSleepMin" type="number" min="1" max="300" value="${sleepMin}"
          style="width:80px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-hi);font-size:.85rem;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
        <span style="font-size:.75rem;color:var(--muted);">dk hareketsizlik sonrası uyuyor</span>
      </div>
      <button class="a-btn blue" onclick="adminBotSaveTiming()" style="align-self:flex-start;padding:8px 18px;">💾 Süreleri Kaydet</button>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">💬 Karşılama Mesajları</div>
    <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Bot ilk açıldığında bu mesajlardan birini söyler. Her satır bir mesaj.</div>
      <textarea id="botGreetMsgs" rows="6"
        style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-hi);font-size:.82rem;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none;line-height:1.6;"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
        >${window.GREETING_MSGS ? window.GREETING_MSGS.join('\n') : ''}</textarea>
      <button class="a-btn blue" onclick="adminBotSaveMsgs('greet')" style="align-self:flex-start;padding:8px 18px;">💾 Kaydet</button>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">🌀 Boşta Mesajları</div>
    <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">Bot dolaşırken rastgele bu mesajları gösterir.</div>
      <textarea id="botIdleMsgs" rows="8"
        style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-hi);font-size:.82rem;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none;line-height:1.6;"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
        >${window.IDLE_MSGS ? window.IDLE_MSGS.join('\n') : ''}</textarea>
      <button class="a-btn blue" onclick="adminBotSaveMsgs('idle')" style="align-self:flex-start;padding:8px 18px;">💾 Kaydet</button>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">⌨ Özel Mesaj Gönder</div>
    <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:10px;">
      <div style="font-size:.75rem;color:var(--muted);">Bota istediğin bir mesajı söylet (baloncukta gösterilir).</div>
      <div style="display:flex;gap:8px;">
        <input id="botCustomMsg" type="text" placeholder="Mesaj yaz..."
          style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-hi);font-size:.85rem;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
          onkeydown="if(event.key==='Enter')adminBotSendCustomMsg()"/>
        <button class="a-btn blue" onclick="adminBotSendCustomMsg()" style="padding:8px 16px;">📤 Söyle</button>
      </div>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">🛡 Moderatör Ayarları</div>
    <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:12px;">

      <div style="font-size:.78rem;font-weight:700;color:var(--text-hi);margin-bottom:2px;">⚙️ Otomatik İşlemler</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.82rem;">
        <input type="checkbox" id="mod_autoWarn" onchange="botSaveModSettings()" checked>
        ⚠️ Küfür tespitinde otomatik uyar
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.82rem;">
        <input type="checkbox" id="mod_deleteMsg" onchange="botSaveModSettings()" checked>
        🗑 Küfürlü mesajları sil
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.82rem;">
        <input type="checkbox" id="mod_autoKick" onchange="botSaveModSettings()">
        🦶 Küfürde 30dk uzaklaştır
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.82rem;">
        <input type="checkbox" id="mod_autoBan" onchange="botSaveModSettings()">
        🚫 Küfürde otomatik ban
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.82rem;">
        <input type="checkbox" id="mod_autoMuteSpam" onchange="botSaveModSettings()" checked>
        🔇 Spam tespitinde otomatik sustur
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.82rem;">
        <input type="checkbox" id="mod_welcome" onchange="botSaveModSettings()" checked>
        👋 Yeni üye karşılama mesajı
      </label>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
        <div>
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:3px;">Spam eşiği (mesaj sayısı)</div>
          <input id="mod_spamThreshold" type="number" min="2" max="20" value="5" class="admin-inp" onchange="botSaveModSettings()">
        </div>
        <div>
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:3px;">Spam penceresi (saniye)</div>
          <input id="mod_spamWindow" type="number" min="2" max="60" value="6" class="admin-inp" onchange="botSaveModSettings()">
        </div>
        <div>
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:3px;">Spam mute süresi (dk)</div>
          <input id="mod_muteDuration" type="number" min="1" max="1440" value="60" class="admin-inp" onchange="botSaveModSettings()">
        </div>
      </div>

      <div style="margin-top:4px;">
        <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px;">👋 Karşılama mesajı ({user} = kullanıcı adı)</div>
        <input id="mod_welcomeMsg" class="admin-inp" value="👋 {user} aramıza katıldı! Hoş geldin 🌿" style="width:100%;" onchange="botSaveModSettings()">
      </div>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">🚫 Yasaklı Kelimeler</div>
    <div class="admin-card" style="padding:14px;display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:.75rem;color:var(--muted);">Her satıra bir kelime. Büyük/küçük harf fark etmez.</div>
      <textarea id="mod_badWords" rows="8"
        style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-hi);font-size:.82rem;font-family:monospace;resize:vertical;box-sizing:border-box;outline:none;line-height:1.6;"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
      <button class="a-btn blue" onclick="botSaveBadWords()" style="align-self:flex-start;padding:8px 18px;">💾 Kelimeleri Kaydet</button>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">📋 Mod Logları</div>
    <div class="admin-card" style="padding:14px;" id="modLogContainer">
      <button class="a-btn blue" onclick="loadModLogs()" style="padding:8px 16px;">🔄 Logları Yükle</button>
    </div>
  </div>

  <div class="admin-section" style="margin-top:12px;">
    <div class="admin-sec-title">🔇 Susturulanlar</div>
    <div class="admin-card" style="padding:14px;" id="muteListContainer">
      <button class="a-btn blue" onclick="loadMuteList()" style="padding:8px 16px;">🔄 Listeyi Yükle</button>
    </div>
  </div>`;

  // Ayarları doldur
  setTimeout(() => {
    const s = window._natureBotMod?.getSettings() || {};
    const bw = window._natureBotMod?.getBadWords() || [];
    const el = id => document.getElementById(id);
    if(el('mod_autoWarn')) el('mod_autoWarn').checked = s.autoWarnBadWord !== false;
    if(el('mod_deleteMsg')) el('mod_deleteMsg').checked = s.deleteBadWord !== false;
    if(el('mod_autoKick')) el('mod_autoKick').checked = !!s.autoKickBadWord;
    if(el('mod_autoBan')) el('mod_autoBan').checked = !!s.autoBanBadWord;
    if(el('mod_autoMuteSpam')) el('mod_autoMuteSpam').checked = s.autoMuteSpam !== false;
    if(el('mod_welcome')) el('mod_welcome').checked = s.welcomeEnabled !== false;
    if(el('mod_spamThreshold')) el('mod_spamThreshold').value = s.spamThreshold || 5;
    if(el('mod_spamWindow')) el('mod_spamWindow').value = Math.round((s.spamWindow||6000)/1000);
    if(el('mod_muteDuration')) el('mod_muteDuration').value = s.spamMuteDuration || 60;
    if(el('mod_welcomeMsg')) el('mod_welcomeMsg').value = s.welcomeMsg || '👋 {user} aramıza katıldı! Hoş geldin 🌿';
    if(el('mod_badWords')) el('mod_badWords').value = bw.join('\n');
  }, 500);
}

function adminBotAction(action) {
  const bot = window._natureBotInstance;
  if (action === 'start') {
    if (typeof startNatureBot === 'function') startNatureBot();
    showToast('🤖 NatureBot başlatılıyor...');
    setTimeout(loadAdminNatureBot, 1000);
    return;
  }
  if (action === 'stop') {
    if (bot) {
      clearTimeout(bot.wanderTimer); clearTimeout(bot.sleepTimer);
      clearTimeout(bot.idleTimeout); clearTimeout(bot.homeCheckTimer);
      if (bot.el) bot.el.remove();
      if (bot.bubble) bot.bubble.remove();
      if (bot.kennelEl) bot.kennelEl.remove();
      if (bot.zzzEl) bot.zzzEl.remove();
      window._natureBotInstance = null;
    }
    showToast('🔴 NatureBot durduruldu.');
    loadAdminNatureBot(); return;
  }
  if (action === 'reload') {
    adminBotAction('stop');
    setTimeout(() => { adminBotAction('start'); }, 600);
    return;
  }
  if (!bot) { showToast('⚠ NatureBot aktif değil.'); return; }
  if (action === 'wake')   { bot.wakeUp();      showToast('☀ Bot uyandırıldı!'); }
  if (action === 'sleep')  { if(bot.isAtHome){ bot.fallAsleep(); } else { bot.goToKennel(); } showToast('😴 Bot uyutulmaya gönderildi!'); }
  if (action === 'home')   { bot.goToKennel(); showToast('🏠 Bot evine gönderildi!'); }
  if (action === 'wander') { bot.startWander && bot.startWander(); showToast('🚶 Bot dolaşmaya başladı!'); }
  if (action === 'greet')  {
    const msg = window.GREETING_MSGS ? window.GREETING_MSGS[Math.floor(Math.random()*window.GREETING_MSGS.length)] : '👋 Merhaba!';
    bot.say && bot.say(msg); showToast('👋 Bot selamlama yaptı!');
  }
  setTimeout(loadAdminNatureBot, 400);
}

function adminBotSaveTiming() {
  const bot = window._natureBotInstance;
  const wMin = parseInt(document.getElementById('botWanderMin')?.value || 15);
  const sMin = parseInt(document.getElementById('botSleepMin')?.value || 45);
  if (isNaN(wMin) || isNaN(sMin) || wMin < 1 || sMin < 1) { showToast('⚠ Geçersiz değer!'); return; }
  if (bot) {
    bot.WANDER_DURATION = wMin * 60 * 1000;
    bot.SLEEP_DURATION  = sMin * 60 * 1000;
  }
  try { localStorage.setItem('naturebot_wander_min', wMin); localStorage.setItem('naturebot_sleep_min', sMin); } catch {}
  showToast('✅ Süreler kaydedildi!');
}

function adminBotSaveMsgs(type) {
  if (type === 'greet') {
    const lines = document.getElementById('botGreetMsgs')?.value.split('\n').map(s=>s.trim()).filter(Boolean);
    if (lines && lines.length) { window.GREETING_MSGS = lines; showToast('✅ Karşılama mesajları güncellendi! (' + lines.length + ' adet)'); }
    else showToast('⚠ En az bir mesaj gir!');
  }
  if (type === 'idle') {
    const lines = document.getElementById('botIdleMsgs')?.value.split('\n').map(s=>s.trim()).filter(Boolean);
    if (lines && lines.length) { window.IDLE_MSGS = lines; showToast('✅ Boşta mesajları güncellendi! (' + lines.length + ' adet)'); }
    else showToast('⚠ En az bir mesaj gir!');
  }
}

function adminBotSendCustomMsg() {
  const bot = window._natureBotInstance;
  const inp = document.getElementById('botCustomMsg');
  const msg = inp?.value.trim();
  if (!msg) { showToast('⚠ Mesaj boş!'); return; }
  if (!bot) { showToast('⚠ NatureBot aktif değil.'); return; }
  bot.say && bot.say(msg);
  if (inp) inp.value = '';
  showToast('📤 Mesaj gönderildi!');
}

async function botSaveModSettings() {
  const el = id => document.getElementById(id);
  const settings = {
    autoWarnBadWord: el('mod_autoWarn')?.checked !== false,
    deleteBadWord:   el('mod_deleteMsg')?.checked !== false,
    autoKickBadWord: !!el('mod_autoKick')?.checked,
    autoBanBadWord:  !!el('mod_autoBan')?.checked,
    autoMuteSpam:    el('mod_autoMuteSpam')?.checked !== false,
    welcomeEnabled:  el('mod_welcome')?.checked !== false,
    spamThreshold:   parseInt(el('mod_spamThreshold')?.value)||5,
    spamWindow:      (parseInt(el('mod_spamWindow')?.value)||6)*1000,
    spamMuteDuration:parseInt(el('mod_muteDuration')?.value)||60,
    welcomeMsg:      el('mod_welcomeMsg')?.value||'👋 {user} aramıza katıldı! Hoş geldin 🌿',
    logEnabled:      true
  };
  try {
    await adminRestSet('botSettings/modSettings', settings);
    if (window._natureBotMod) Object.assign(window._natureBotMod.getSettings(), settings);
    showToast('✅ Moderatör ayarları kaydedildi!');
  } catch(e) { showToast('❌ Kaydedilemedi: '+(e.message||e)); }
}

async function botSaveBadWords() {
  const ta = document.getElementById('mod_badWords');
  if (!ta) return;
  const words = ta.value.split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if (!words.length) { showToast('⚠ En az bir kelime gir!'); return; }
  try {
    await adminRestSet('botSettings/badWords', words);
    if (window._natureBotMod) window._natureBotMod.getBadWords().splice(0, 9999, ...words);
    showToast('✅ '+ words.length +' yasaklı kelime kaydedildi!');
  } catch(e) { showToast('❌ Kaydedilemedi: '+(e.message||e)); }
}

async function loadModLogs() {
  const container = document.getElementById('modLogContainer');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--muted);font-size:.8rem;">Yükleniyor...</div>';
  try {
    const logs = await adminRestGet('modLogs').catch(()=>null)||{};
    const list = Object.values(logs).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,50);
    if (!list.length) { container.innerHTML = '<div style="color:var(--muted);font-size:.8rem;">Henüz log yok.</div>'; return; }
    const actionColors = { ban:'var(--red)', kick:'#e67e22', mute:'#8e44ad', warn:'#f0c040', unmute:'var(--green)' };
    container.innerHTML = list.map(l=>`
      <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);font-size:.75rem;flex-wrap:wrap;">
        <span style="background:${actionColors[l.action]||'var(--surface2)'};color:#fff;border-radius:5px;padding:2px 7px;font-weight:700;white-space:nowrap;">${(l.action||'?').toUpperCase()}</span>
        <span style="color:var(--text-hi);font-weight:600;">@${esc(l.target||'?')}</span>
        <span style="color:var(--muted);">${esc(l.detail||'')}</span>
        <span style="color:var(--muted);margin-left:auto;white-space:nowrap;">${l.ts?new Date(l.ts).toLocaleString('tr-TR'):''}</span>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div style="color:var(--red);font-size:.8rem;">Yüklenemedi.</div>'; }
}

async function loadMuteList() {
  const container = document.getElementById('muteListContainer');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--muted);font-size:.8rem;">Yükleniyor...</div>';
  try {
    const mutes = await adminRestGet('mutes').catch(()=>null)||{};
    const active = Object.entries(mutes).filter(([,d])=>d&&d.expiresAt&&Date.now()<d.expiresAt);
    if (!active.length) { container.innerHTML = '<div style="color:var(--muted);font-size:.8rem;">Susturulan kullanıcı yok.</div>'; return; }
    container.innerHTML = active.map(([user, d])=>`
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:.78rem;flex-wrap:wrap;">
        <span style="font-weight:700;color:var(--text-hi);">🔇 @${esc(user)}</span>
        <span style="color:var(--muted);">Bitiş: ${new Date(d.expiresAt).toLocaleString('tr-TR')}</span>
        <button onclick="adminUnmuteUser('${esc(user)}')" style="margin-left:auto;padding:3px 10px;background:var(--green);color:#fff;border:none;border-radius:6px;font-size:.72rem;cursor:pointer;">🔊 Kaldır</button>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div style="color:var(--red);font-size:.8rem;">Yüklenemedi.</div>'; }
}

async function adminUnmuteUser(username) {
  try {
    await adminRestSet('mutes/'+username, null);
    if (window._natureBotMod) delete window._natureBotMod.getMuteList()[username];
    showToast('🔊 '+username+' susturması kaldırıldı.');
    loadMuteList();
  } catch(e) { showToast('❌ Hata: '+(e.message||e)); }
}

function loadAdminBroadcast(){
  const body = document.getElementById('adminBody');
  body.innerHTML = `
    <div class="admin-section">
      <div class="admin-sec-title">📡 Toplu Yayım Mesajı</div>
      <div class="admin-card" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:.78rem;color:var(--muted);">Tüm kanallara veya seçili bir kanala sistem mesajı gönder.</div>
        <div><div class="admin-sec-title" style="margin-bottom:6px;">Hedef Kanal</div>
          <select class="admin-inp" id="bcastRoom" style="margin-bottom:0;"></select></div>
        <div><div class="admin-sec-title" style="margin-bottom:6px;">Mesaj</div>
          <textarea id="bcastMsg" placeholder="Yayım mesajını yazın..." style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text-hi);font-size:.88rem;font-family:inherit;resize:vertical;min-height:90px;box-sizing:border-box;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea></div>
        <div style="display:flex;gap:8px;">
          <button class="a-btn blue" onclick="sendAdminBroadcast(false)" style="flex:1;padding:11px;">📢 Seçili Kanala</button>
          <button class="a-btn red" onclick="sendAdminBroadcast(true)" style="flex:1;padding:11px;">📡 Tüm Kanallara</button>
        </div>
      </div>
    </div>
    <div class="admin-section" style="margin-top:14px;">
      <div class="admin-sec-title">📋 Son Yayımlar</div>
      <div class="admin-card" id="bcastHistory" style="padding:12px;font-size:.82rem;color:var(--muted);">Yükleniyor...</div>
    </div>`;

  adminRestGet('rooms').then(roomsData=>{
    const rooms = Object.values(roomsData||{}).filter(r=>r.type==='channel');
    const sel = document.getElementById('bcastRoom');
    if(sel) sel.innerHTML = rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  }).catch(()=>{});
  adminRestGet('adminBroadcasts').then(data=>{
    const hist = document.getElementById('bcastHistory');
    if(!hist) return;
    if(!data){ hist.innerHTML='<div style="color:var(--muted);">Henüz yayım yok.</div>'; return; }
    hist.innerHTML = Object.values(data).reverse().map(b=>`
      <div style="border-bottom:1px solid var(--border);padding:8px 0;">
        <div style="color:var(--text-hi);margin-bottom:2px;font-size:.83rem;">${esc(b.text||'')}</div>
        <div style="font-size:.72rem;color:var(--muted);">${b.room==='all'?'📡 Tüm kanallar':'📢 '+esc(b.roomName||b.room)} · ${new Date(b.ts||0).toLocaleString('tr-TR')}</div>
      </div>`).join('');
  }).catch(()=>{});
}
function sendAdminBroadcast(allRooms){
  const msg = (document.getElementById('bcastMsg')?.value||'').trim();
  if(!msg){ showToast('Mesaj boş olamaz.'); return; }
  if(!confirm(allRooms?'Tüm kanallara mesaj gönderilsin mi?':'Seçili kanala mesaj gönderilsin mi?')) return;
  const ts = Date.now();
  async function sendToRoom(roomId, roomName){
    const key = ts.toString(36)+'_bc'+Math.random().toString(36).slice(2,6);
    await adminRestSet('msgs/'+roomId+'/'+key, {user:'📡 Admin Yayımı', text:'📡 '+msg, ts, system:true, _key:key});
    await adminRestSet('adminBroadcasts/'+key, {text:msg, room:roomId, roomName, ts, by:_cu});
  }
  if(allRooms){
    adminRestGet('rooms').then(async roomsData=>{
      const chans = Object.values(roomsData||{}).filter(r=>r.type==='channel');
      await Promise.all(chans.map(r=>sendToRoom(r.id, r.name)));
      showToast('✅ Tüm kanallara gönderildi!');
      document.getElementById('bcastMsg').value='';
      loadAdminBroadcast();
    }).catch(()=>showToast('Hata.'));
  } else {
    const sel = document.getElementById('bcastRoom');
    if(!sel?.value){ showToast('Kanal seçin.'); return; }
    sendToRoom(sel.value, sel.options[sel.selectedIndex]?.text||sel.value).then(()=>{
      showToast('✅ Gönderildi!');
      document.getElementById('bcastMsg').value='';
      loadAdminBroadcast();
    }).catch(()=>showToast('Hata.'));
  }
}


/* ── Pull-to-Refresh ── */

(function(){
  let _ptrY0=null, _ptrPulling=false;
  const THRESH=60;

  function _ptrStart(e){
    const list=document.getElementById('roomsList');
    if(!list||list.scrollTop>0) return; // sadece en tepedeyken
    _ptrY0=e.touches?e.touches[0].clientY:e.clientY;
  }
  function _ptrMove(e){
    if(_ptrY0===null) return;
    const y=e.touches?e.touches[0].clientY:e.clientY;
    const dy=y-_ptrY0;
    if(dy<0){_ptrY0=null;return;}
    const list=document.getElementById('roomsList');
    const ind=document.getElementById('ptr-indicator');
    if(!_ptrPulling && dy>20){
      _ptrPulling=true;
      if(ind){ind.classList.add('ptr-visible');}
      if(list){list.style.transform='translateY(46px)';}
    }
  }
  function _ptrEnd(){
    if(!_ptrPulling){_ptrY0=null;return;}
    const ind=document.getElementById('ptr-indicator');
    const list=document.getElementById('roomsList');
    if(ind){ind.classList.add('ptr-spinning');}
    // Firebase'den yenile
    if(typeof loadRooms==='function') loadRooms();
    setTimeout(()=>{
      if(ind){ind.classList.remove('ptr-visible','ptr-spinning');}
      if(list){list.style.transform='';}
      _ptrPulling=false; _ptrY0=null;
    },1200);
  }

  const screen=document.getElementById('roomsScreen');
  if(screen){
    screen.addEventListener('touchstart',_ptrStart,{passive:true});
    screen.addEventListener('touchmove',_ptrMove,{passive:true});
    screen.addEventListener('touchend',_ptrEnd);
  }
})();


/* ── Online Flip Sayaç Güncelle ── */

function _updateHdrOnlineFlip(newCount){
  const el = document.getElementById('hdrOnlineCount');
  if(!el) return;
  const oldCount = parseInt(el.textContent)||0;
  if(oldCount === newCount) return;
  // Flip animasyonu
  el.style.transition = 'none';
  el.style.transform = 'translateY(0)';
  el.style.opacity = '1';
  el.style.display = 'inline-block';
  el.animate([
    {transform:'translateY(0)',opacity:1},
    {transform:'translateY(-8px)',opacity:0}
  ],{duration:150,easing:'ease-in',fill:'forwards'}).onfinish = () => {
    el.textContent = newCount + ' çevrimiçi';
    el.animate([
      {transform:'translateY(8px)',opacity:0},
      {transform:'translateY(0)',opacity:1}
    ],{duration:200,easing:'cubic-bezier(.34,1.56,.64,1)',fill:'forwards'});
  };
}

