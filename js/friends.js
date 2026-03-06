/* Nature.co — friends.js */
/* Otomatik bölümlendi */

/* ── DM Modal ── */

let _allUsers=[];
function openDMModal(){ switchMainTab('msgs'); }
function closeDMModal(){ switchMainTab('home'); }
function filterDMUsers(){const q=document.getElementById('dmSearch').value.toLowerCase();renderDMUsers(_allUsers.filter(u=>u.toLowerCase().includes(q)));}
function renderDMUsers(users){
  const el=document.getElementById('dmUserList');
  if(!users.length){el.innerHTML='<p style="color:var(--muted);padding:10px;font-size:.85rem">Kullanıcı bulunamadı.</p>';return;}
  // Load friends list to show proper button states
  dbRef('friends/'+_cu).once('value').then(snap=>{
    const myFriends=snap.val()||{};
    dbRef('friendRequests/'+_cu).once('value').then(rSnap=>{
      const incoming=rSnap.val()||{};
      // Also check sent requests
      dbRef('friendRequestsSent/'+_cu).once('value').then(sSnap=>{
        const sent=sSnap.val()||{};
        el.innerHTML=users.map(u=>{
          const on=!!_online[u];
          const isFriend=!!myFriends[u];
          const hasSent=!!sent[u];
          const hasIncoming=!!incoming[u];
          let btn='';
          if(isFriend) btn=`<button class="fr-btn msg" onclick="event.stopPropagation();startDM('${u}')">Mesaj</button>`;
          else if(hasSent) btn=`<button class="fr-btn pending" disabled>İstek Gönderildi</button>`;
          else if(hasIncoming) btn=`<button class="fr-btn accept" onclick="event.stopPropagation();acceptFriendRequest('${u}')">Kabul Et</button>`;
          else btn=`<button class="fr-btn add" onclick="event.stopPropagation();sendFriendRequest('${u}',this)">+ Arkadaş Ekle</button>`;
          return `<div class="dm-row"><div class="dm-av" style="background:${strColor(u)}">${initials(u)}<div class="r-dot ${on?'on':'off'}"></div></div><div style="flex:1"><div class="dm-name">${esc(u)}</div><div class="dm-status">${on?'🟢 Çevrimiçi':'Çevrimdışı'}</div></div>${btn}</div>`;
        }).join('');
      });
    });
  });
}
function startDM(other){
  const members=[_cu,other].sort();const id='dm_'+members.join('_');
  closeDMModal();
  dbRef('rooms/'+id).once('value').then(snap=>{
    if(!snap.val()){
      dbRef('rooms/'+id).set({id,name:other,type:'dm',members,ts:Date.now()},()=>{openRoom(id);showCallBtns(true);});
    } else {
      // Unhide if previously hidden by current user
      const room = snap.val();
      if(room.hiddenBy && room.hiddenBy.includes(_cu)){
        const updated = room.hiddenBy.filter(u=>u!==_cu);
        dbRef('rooms/'+id+'/hiddenBy').set(updated.length?updated:null);
      }
      openRoom(id);showCallBtns(true);
    }
  });
}
function showCallBtns(show){
  const canScreen = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  document.getElementById('callAudioBtn').style.display=show?'flex':'none';
  var _cvb=document.getElementById('callVideoBtn');if(_cvb){document.getElementById('callVideoBtn').style.display=show?'flex':'none';};
  (function(){var _b=document.getElementById('callScreenBtn');if(_b)_b.style.display=(show&&canScreen)?'flex':'none';})();
}



/* ══════════════════════════════════════
   👥 ARKADAŞ SİSTEMİ
   ══════════════════════════════════════ */

let _friends={}, _friendReqs={}, _sentReqs={};
let _frTab=1;
let _stopFrReqs=null;

function listenFriendRequests(){
  if(_stopFrReqs){_stopFrReqs();_stopFrReqs=null;}
  const ref=dbRef('friendRequests/'+_cu);
  const h=snap=>{
    _friendReqs=snap.val()||{};
    const count=Object.keys(_friendReqs).length;
    const dot=document.getElementById('frNotifDot');
    const badge=document.getElementById('frReqBadge');
    if(dot){dot.classList.toggle('show',count>0);}
    if(badge){
      badge.style.display=count>0?'inline':'none';
      badge.textContent=count;
    }
    // Desktop: update badge and refresh panel if open
    if(IS_DESKTOP()){
      deskUpdateFrBadge();
      if(_deskNav==='friends' && document.getElementById('deskFrContent')){
        deskLoadFriendsPanel();
      }
    }
  };
  ref.on('value',h);
  _stopFrReqs=()=>ref.off('value',h);
}


/* ── Tab 1: Arkadaşlar ── */

async function loadFriendsList(){
  if(_auth && !_auth.currentUser){
    try{ await _auth.signInAnonymously(); }catch(e){}
  }
  const el=document.getElementById('frContent');
  el.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';

  // Online kişileri _online'dan al (Firebase'e bağlı, anlık)
  // Arkadaş listesi yoksa da online yabancıları göster
  function renderWithFriends(friends){
    const friendList=Object.keys(friends);
    const onlineStrangers=Object.keys(_online).filter(u=>u!==_cu&&!friends[u]);
    let h='';

    if(friendList.length){
      const onlineFr=friendList.filter(u=>!!_online[u]);
      const offlineFr=friendList.filter(u=>!_online[u]);
      if(onlineFr.length){
        h+='<div class="fr-section-title">🟢 Arkadaşlar — Çevrimiçi ('+onlineFr.length+')</div>';
        onlineFr.forEach(u=>{h+=friendRow(u,true);});
      }
      if(offlineFr.length){
        h+='<div class="fr-section-title">⚫ Arkadaşlar — Çevrimdışı ('+offlineFr.length+')</div>';
        offlineFr.forEach(u=>{h+=friendRow(u,false);});
      }
    } else {
      h+='<div class="fr-empty"><div class="fr-empty-ic">👥</div><div>Henüz arkadaşın yok.</div><div style="margin-top:8px"><button class="fr-btn add" onclick="switchFrTab(3)">Arkadaş Ekle</button></div></div>';
    }

    if(onlineStrangers.length){
      h+='<div class="fr-section-title" style="margin-top:14px">🌐 Şu An Çevrimiçi ('+onlineStrangers.length+')</div>';
      onlineStrangers.forEach(function(u){
        h+='<div class="fr-row">';
        h+='<div class="fr-av" style="background:'+strColor(u)+'">'+initials(u)+'<div class="r-dot on"></div></div>';
        h+='<div class="fr-info"><div class="fr-name">'+esc(u)+'</div><div class="fr-status">🟢 Çevrimiçi</div></div>';
        h+='<div class="fr-btns"><button class="fr-btn add" onclick="sendFriendRequest(this.dataset.u,this)" data-u="'+esc(u)+'">+ Ekle</button></div>';
        h+='</div>';
      });
    }

    if(!h) h='<div class="fr-empty"><div class="fr-empty-ic">🌐</div><div>Şu an çevrimiçi kimse yok.</div></div>';
    el.innerHTML=h;
  }

  // _db ve _online hazır olana kadar bekle, sonra friends çek
  function tryLoad(attempt){
    if(!window._db){
      if(attempt<30){ setTimeout(function(){ tryLoad(attempt+1); }, 300); }
      else { renderWithFriends({}); }
      return;
    }
    // _db hazır — direkt friends + online çek (paralel)
    Promise.all([
      dbRef('friends/'+_cu).once('value'),
      dbRef('online').once('value')
    ]).then(function(results){
      var frSnap=results[0], onSnap=results[1];
      var now=Date.now(), onData=onSnap.val()||{};
      Object.entries(onData).forEach(function([k,v]){if(v&&now-v.ts<60000)_online[k]=true;});
      renderWithFriends(frSnap.val()||{});
    }).catch(function(){ renderWithFriends({}); });
  }
  tryLoad(0);
}
function friendRow(u,on){
  return `<div class="fr-row">
    <div class="fr-av" style="background:${strColor(u)}">${initials(u)}<div class="r-dot ${on?'on':'off'}"></div></div>
    <div class="fr-info">
      <div class="fr-name">${esc(u)}</div>
      <div class="fr-status">${on?'🟢 Çevrimiçi':'Çevrimdışı'}</div>
    </div>
    <div class="fr-btns">
      <button class="fr-btn msg" onclick="switchMainTab('home');startDM('${u}')">💬 Mesaj</button>
      <button class="fr-btn remove" onclick="removeFriend('${u}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
  </div>`;
}
function removeFriend(u){
  if(!confirm(u+' arkadaşlıktan çıkarılsın mı?'))return;
  Promise.all([
    dbRef('friends/'+_cu+'/'+u).remove(),
    dbRef('friends/'+u+'/'+_cu).remove()
  ]).then(()=>{showToast(u+' arkadaşlıktan çıkarıldı.');loadFriendsList();}).catch(()=>showToast('Hata oluştu.'));
}


/* ── Tab 2: İstekler ── */

function loadFriendRequests(){
  const el=document.getElementById('frContent');
  el.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  dbRef('friendRequests/'+_cu).once('value').then(snap=>{
    const reqs=snap.val()||{};
    const list=Object.keys(reqs);
    if(!list.length){
      el.innerHTML=`<div class="fr-empty"><div class="fr-empty-ic">📭</div><div>Bekleyen arkadaşlık isteği yok.</div></div>`;
      return;
    }
    let h=`<div class="fr-section-title">Gelen İstekler — ${list.length}</div>`;
    list.forEach(from=>{
      const on=!!_online[from];
      h+=`<div class="fr-row">
        <div class="fr-av" style="background:${strColor(from)}">${initials(from)}<div class="r-dot ${on?'on':'off'}"></div></div>
        <div class="fr-info">
          <div class="fr-name">${esc(from)}</div>
          <div class="fr-status">${on?'🟢 Çevrimiçi':'Çevrimdışı'}</div>
        </div>
        <div class="fr-btns">
          <button class="fr-btn accept" onclick="acceptFriendRequest('${from}')">✓ Kabul</button>
          <button class="fr-btn reject" onclick="rejectFriendRequest('${from}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      </div>`;
    });
    el.innerHTML=h;
  });
}
function acceptFriendRequest(from){
  const now=Date.now();
  Promise.all([
    dbRef('friends/'+_cu+'/'+from).set({ts:now}),
    dbRef('friends/'+from+'/'+_cu).set({ts:now}),
    dbRef('friendRequests/'+_cu+'/'+from).remove(),
    dbRef('friendRequestsSent/'+from+'/'+_cu).remove()
  ]).then(()=>{
    showToast('🎉 '+from+' artık arkadaşın!');
    loadFriendRequests();
  }).catch(()=>showToast('Hata oluştu.'));
}
function rejectFriendRequest(from){
  Promise.all([
    dbRef('friendRequests/'+_cu+'/'+from).remove(),
    dbRef('friendRequestsSent/'+from+'/'+_cu).remove()
  ]).then(()=>{showToast('İstek reddedildi.');loadFriendRequests();}).catch(()=>showToast('Hata.'));
}


/* ── Tab 3: Kişi Ekle ── */

function loadAddFriend(){
  const el=document.getElementById('frContent');
  el.innerHTML=`
    <div style="margin-bottom:14px">
      <input class="bs-search" type="text" id="addFriendInp" placeholder="Kullanıcı adı ara..." oninput="searchFriendUsers()" autocorrect="off" autocapitalize="none">
    </div>
    <div id="addFriendResults"><div class="fr-empty"><div class="fr-empty-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div><div>Kullanıcı adı yazarak ara</div></div></div>`;
  document.getElementById('addFriendInp').focus();
}
async function searchFriendUsers(){
  // Auth token yoksa önce anonim giriş yap
  if(_auth && !_auth.currentUser){
    try{ await _auth.signInAnonymously(); }catch(e){}
  }
  const q=document.getElementById('addFriendInp').value.trim().toLowerCase();
  const el=document.getElementById('addFriendResults');
  if(!q){el.innerHTML='<div class="fr-empty"><div class="fr-empty-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div><div>Kullanıcı adı yazarak ara</div></div>';return;}
  el.innerHTML='<div class="ld"><span></span><span></span><span></span></div>';
  Promise.all([
    dbRef('users').once('value'),
    dbRef('friends/'+_cu).once('value'),
    dbRef('friendRequestsSent/'+_cu).once('value'),
    dbRef('friendRequests/'+_cu).once('value')
  ]).then(([uSnap,fSnap,sSnap,rSnap])=>{
    const users=uSnap.val()||{};
    const myFriends=fSnap.val()||{};
    const sent=sSnap.val()||{};
    const incoming=rSnap.val()||{};
      // Sadece bu workspace'e ait kullanıcıları göster
    const results=Object.keys(users).filter(u=>{
      if(u===_cu) return false;
      if(users[u].banned) return false;
      if(!u.toLowerCase().includes(q)) return false;
      return true;
    });
    if(!results.length){el.innerHTML='<div class="fr-empty"><div class="fr-empty-ic">😕</div><div>Kullanıcı bulunamadı.</div></div>';return;}
    let h='';
    results.forEach(u=>{
      const on=!!_online[u];
      const isFriend=!!myFriends[u];
      const hasSent=!!sent[u];
      const hasIncoming=!!incoming[u];
      let btn='';
      if(isFriend) btn=`<button class="fr-btn msg" onclick="switchMainTab('home');startDM('${u}')">💬 Mesaj</button>`;
      else if(hasSent) btn=`<button class="fr-btn pending" disabled>İstek Gönderildi</button>`;
      else if(hasIncoming) btn=`<button class="fr-btn accept" onclick="acceptFriendRequest('${u}');searchFriendUsers()">✓ Kabul Et</button>`;
      else btn=`<button class="fr-btn add" onclick="sendFriendRequest('${u}',this)">+ Arkadaş Ekle</button>`;
      h+=`<div class="fr-row">
        <div class="fr-av" style="background:${strColor(u)}">${initials(u)}<div class="r-dot ${on?'on':'off'}"></div></div>
        <div class="fr-info"><div class="fr-name">${esc(u)}</div><div class="fr-status">${on?'🟢 Çevrimiçi':'Çevrimdışı'}</div></div>
        <div class="fr-btns">${btn}</div>
      </div>`;
    });
    el.innerHTML=h;
  });
}


/* ── Send Request ── */

function sendFriendRequest(to, btn){
  if(btn){btn.textContent='Gönderiliyor...';btn.disabled=true;}
  Promise.all([
    dbRef('friendRequests/'+to+'/'+_cu).set({from:_cu,ts:Date.now()}),
    dbRef('friendRequestsSent/'+_cu+'/'+to).set({to,ts:Date.now()})
  ]).then(()=>{
    showToast('Arkadaşlık isteği gönderildi! 🤝');
    if(btn){btn.textContent='İstek Gönderildi';btn.className='fr-btn pending';}
  }).catch(()=>{showToast('Hata oluştu.');if(btn){btn.textContent='+ Arkadaş Ekle';btn.disabled=false;}});
}


/* ── Profil Arkadaş Sayısı ── */

function updateProfileFriendCount(){
  const el=document.getElementById('profFriendCount');
  if(!el||!_cu||!_db) return;
  dbRef('friends/'+_cu).once('value').then(snap=>{
    const fr=snap.val()||{};
    const accepted=Object.values(fr).filter(f=>f&&f.status==='accepted').length;
    el.textContent=accepted;
  }).catch(()=>{el.textContent='—';});
}

