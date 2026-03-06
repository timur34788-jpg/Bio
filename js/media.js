/* Nature.co — media.js */
/* Otomatik bölümlendi */

/* ══════════════════════════════════════
   📞 GROUP WebRTC — ÇOKLU KULLANICI SESLI/GÖRÜNTÜLÜ ARAMA (v2)
   Mesh mimarisi: her kullanıcı diğer tüm kullanıcılarla ayrı RTCPeerConnection
   Firebase yapısı:
     calls/{callId}/host, type, status, ts
     calls/{callId}/parts/{user} = { active, ts }
     calls/{callId}/inv/{user} = { from, status, type, ts }
     calls/{callId}/sig/{userA}__{userB}/offer|answer|ice_{user}
     callInvites/{user}/{callId} = { from, type, ts }
   ══════════════════════════════════════ */


/* ── Yardımcı fonksiyonlar ── */

function _pairKey(a, b) {
  return [a, b].sort().join('__');
}

function _attachRemoteMedia(username, stream) {
  // Ses
  let audio = document.getElementById('_rAudio_' + username);
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = '_rAudio_' + username;
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
  }
  audio.srcObject = stream;

  // Görüntü (video aramasıysa)
  const remoteVideo = document.getElementById('remoteVideo');
  if (remoteVideo && stream.getVideoTracks().length > 0) {
    remoteVideo.srcObject = stream;
    remoteVideo.play().catch(() => {});
    const videoArea = document.getElementById('callVideoArea');
    const audioArea = document.getElementById('callAudioArea');
    if (videoArea) videoArea.style.display = 'block';
    if (audioArea) audioArea.style.display = 'none';
  }

  // Status güncelle
  const statusEl = document.getElementById('callStatus');
  if (statusEl) statusEl.textContent = 'Bağlandı';
}

const STUN_SERVERS = {iceServers:[
  // STUN — bağlantı bilgisi için
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun2.l.google.com:19302'},
  {urls:'stun:stun.cloudflare.com:3478'},
  // TURN — farklı ağlar/mobil için zorunlu (open relay, ücretsiz)
  {urls:'turn:openrelay.metered.ca:80',      username:'openrelayproject', credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',     username:'openrelayproject', credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp', username:'openrelayproject', credential:'openrelayproject'},
  {urls:'turns:openrelay.metered.ca:443',    username:'openrelayproject', credential:'openrelayproject'},
]};


/* ── Per-pair WebRTC bağlantısı kur ── */

async function _setupPeer(remoteUser, isOfferer){
  if(_peers[remoteUser]){
    try{_peers[remoteUser].close();}catch(e){}
    delete _peers[remoteUser];
  }
  const pc = new RTCPeerConnection(STUN_SERVERS);
  _peers[remoteUser] = pc;

  // ★ ICE kuyruk: setRemoteDescription öncesi gelen candidate'leri biriktir
  const iceQueue = [];
  let remoteDescSet = false;
  async function flushIceQueue(){
    while(iceQueue.length){
      try{ await pc.addIceCandidate(new RTCIceCandidate(iceQueue.shift())); }catch(e){}
    }
  }

  _localStream.getTracks().forEach(t=>pc.addTrack(t,_localStream));

  const remoteStream = new MediaStream();
  _remoteStreams[remoteUser] = remoteStream;
  pc.ontrack = e=>{
    e.streams[0].getTracks().forEach(t=>{
      if(!remoteStream.getTracks().find(x=>x.id===t.id)) remoteStream.addTrack(t);
    });
    _attachRemoteMedia(remoteUser, remoteStream);
    _updateParticipantsUI();
  };

  const pair = _pairKey(_cu, remoteUser);
  const sig  = 'calls/'+_groupCallId+'/sig/'+pair;

  pc.onicecandidate = e=>{
    if(e.candidate) dbRef(sig+'/ice_'+_cu).push(e.candidate.toJSON());
  };

  // Bağlantı timeout — 20sn içinde kurulamazsa hata göster
  const _connTimeout = setTimeout(()=>{
    if(pc.connectionState !== 'connected'){
      const st = document.getElementById('callStatus');
      if(st) st.textContent = '❌ Bağlanamadı — ağ uyumsuzluğu';
      _updateCallQuality('bad');
      // 3sn sonra aramayı kapat
      setTimeout(()=>{ if(pc.connectionState !== 'connected') _peerLeft(remoteUser); }, 3000);
    }
  }, 20000);

  pc.onconnectionstatechange = ()=>{
    const s = pc.connectionState;
    if(s==='connected'){
      clearTimeout(_connTimeout);
      const st=document.getElementById('callStatus');
      if(st && !_callTimer) st.textContent='Bağlandı';
      _updateParticipantsUI();
      if(!_callTimer) startCallTimer();
      _updateCallQuality('good');
    } else if(s==='failed'){
      clearTimeout(_connTimeout);
      if(isOfferer) pc.restartIce();
      else { _peerLeft(remoteUser); }
      _updateCallQuality('bad');
    } else if(s==='disconnected'){
      _updateCallQuality('poor');
      setTimeout(()=>{ if(pc.connectionState==='disconnected') _peerLeft(remoteUser); },6000);
    } else if(s==='connecting'){
      _updateCallQuality('connecting');
    }
  };
  pc.oniceconnectionstatechange = ()=>{
    if(pc.iceConnectionState==='failed' && isOfferer) pc.restartIce();
  };

  // ★ ICE candidate'leri kuyrukla — remote desc set olunca flush et
  const iceRef = dbRef(sig+'/ice_'+remoteUser);
  const stopIce = iceRef.on('child_added', async snap=>{
    if(!snap.val()) return;
    if(remoteDescSet){
      try{ await pc.addIceCandidate(new RTCIceCandidate(snap.val())); }catch(e){}
    } else {
      iceQueue.push(snap.val());
    }
  });
  _callStopListeners.push(()=>iceRef.off('child_added',stopIce));

  if(isOfferer){
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await dbRef(sig+'/offer').set({sdp:offer.sdp,type:offer.type,from:_cu});

    const ansRef = dbRef(sig+'/answer');
    const stopAns = ansRef.on('value', async snap=>{
      if(snap.val() && !pc.currentRemoteDescription){
        try{
          await pc.setRemoteDescription(new RTCSessionDescription(snap.val()));
          remoteDescSet = true;
          await flushIceQueue();
          ansRef.off('value',stopAns);
        }catch(e){ console.warn('[WebRTC offerer]',e); }
      }
    });
    _callStopListeners.push(()=>ansRef.off('value',stopAns));

  } else {
    const offerRef = dbRef(sig+'/offer');
    const stopOff = offerRef.on('value', async snap=>{
      if(snap.val() && !pc.currentRemoteDescription){
        try{
          await pc.setRemoteDescription(new RTCSessionDescription(snap.val()));
          remoteDescSet = true;
          await flushIceQueue();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await dbRef(sig+'/answer').set({sdp:answer.sdp,type:answer.type});
          offerRef.off('value',stopOff);
        }catch(e){ console.warn('[WebRTC answerer]',e); }
      }
    });
    _callStopListeners.push(()=>offerRef.off('value',stopOff));
  }

  return pc;
}

function _peerLeft(username){
  if(_peers[username]){
    try{_peers[username].close();}catch(e){}
    delete _peers[username];
  }
  delete _remoteStreams[username];
  const a = document.getElementById('_rAudio_'+username);
  if(a) a.remove();
  _updateParticipantsUI();
  if(Object.keys(_peers).length===0) endCall();
}


/* ── Katılımcı gelince/gidince dinle ── */

function _listenParticipants(){
  const ref = dbRef('calls/'+_groupCallId+'/parts');

  const stopAdd = ref.on('child_added', async snap=>{
    const u = snap.key;
    if(u===_cu||_peers[u]) return;
    const d = snap.val();
    if(!d||!d.active) return;
    // Alphabetically küçük olan offer yapar
    await _setupPeer(u, _cu < u);
    _updateParticipantsUI();
  });
  _callStopListeners.push(()=>ref.off('child_added',stopAdd));

  const stopRem = ref.on('child_removed', snap=>{
    const u = snap.key;
    if(u!==_cu) _peerLeft(u);
  });
  _callStopListeners.push(()=>ref.off('child_removed',stopRem));

  // Arama sona erdiyse
  const sRef = dbRef('calls/'+_groupCallId+'/status');
  const stopS = sRef.on('value', snap=>{
    if(snap.val()==='ended') endCall();
  });
  _callStopListeners.push(()=>sRef.off('value',stopS));
}


/* ── getDMOther ── */

function getDMOther(){
  const room = (IS_DESKTOP()&&_deskRoom)?_deskRoom:_cRoom;
  if(!room) return null;
  if(room.startsWith('dm_')){
    const rest=room.slice(3);
    const parts=rest.split('_');
    for(let i=1;i<parts.length;i++){
      const a=parts.slice(0,i).join('_');
      const b=parts.slice(i).join('_');
      if(a===_cu) return b;
      if(b===_cu) return a;
    }
    return parts.find(p=>p!==_cu)||null;
  }
  return null;
}

async function getDMOtherFromDB(){
  const room = (IS_DESKTOP()&&_deskRoom)?_deskRoom:_cRoom;
  if(!room) return null;
  const snap = await dbRef('rooms/'+room).once('value');
  const data = snap.val();
  if(!data||data.type!=='dm') return null;
  return (data.members||[]).find(m=>m!==_cu)||null;
}


/* ══════════════════════════
   KATILIMCI ARAYÜZÜ
══════════════════════════ */

function _updateParticipantsUI(){
  const container = document.getElementById('callParticipants');
  if(!container) return;

  const connected = Object.keys(_peers).filter(u=>{
    const pc=_peers[u];
    return pc&&(pc.connectionState==='connected'||pc.connectionState==='connecting'||pc.connectionState==='new');
  });

  container.innerHTML = '';

  // Kendi avatarı
  const self = document.createElement('div');
  self.className = 'call-part-av';
  self.textContent = initials(_cu);
  self.style.cssText = 'background:'+strColor(_cu)+';'+((_isMuted)?'outline:2px solid #e05555;':'outline:2px solid #2ecc71;');
  self.title = _cu+' (Sen)';
  container.appendChild(self);

  connected.forEach(u=>{
    const d = document.createElement('div');
    d.className = 'call-part-av';
    d.textContent = initials(u);
    d.style.cssText = 'background:'+strColor(u)+';outline:2px solid #2ecc71;';
    d.title = u;
    container.appendChild(d);
  });

  // Status güncelle
  const total = connected.length+1;
  const nameEl = document.getElementById('callName');
  if(nameEl && total>2) nameEl.textContent = total+' kişi görüşüyor';
}


/* ── Local video PiP drag ── */

function initLocalVideoDrag(){
  const v = document.getElementById('localVideo');
  if(!v) return;
  let dragging=false, ox=0, oy=0, sx=0, sy=0;
  v.addEventListener('mousedown', e=>{
    dragging=true; ox=v.offsetLeft; oy=v.offsetTop; sx=e.clientX; sy=e.clientY;
    v.style.transition='none'; e.preventDefault();
  });
  document.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    const parent=v.parentElement;
    const maxX=parent.clientWidth-v.clientWidth;
    const maxY=parent.clientHeight-v.clientHeight;
    v.style.left=Math.max(0,Math.min(maxX,ox+dx))+'px';
    v.style.top=Math.max(0,Math.min(maxY,oy+dy))+'px';
    v.style.right='auto'; v.style.bottom='auto';
  });
  document.addEventListener('mouseup', ()=>{ dragging=false; });

  // Touch support
  v.addEventListener('touchstart', e=>{
    const t=e.touches[0]; dragging=true; ox=v.offsetLeft; oy=v.offsetTop; sx=t.clientX; sy=t.clientY;
    v.style.transition='none'; e.preventDefault();
  },{passive:false});
  document.addEventListener('touchmove', e=>{
    if(!dragging) return;
    const t=e.touches[0]; const dx=t.clientX-sx, dy=t.clientY-sy;
    const parent=v.parentElement;
    const maxX=parent.clientWidth-v.clientWidth;
    const maxY=parent.clientHeight-v.clientHeight;
    v.style.left=Math.max(0,Math.min(maxX,ox+dx))+'px';
    v.style.top=Math.max(0,Math.min(maxY,oy+dy))+'px';
    v.style.right='auto'; v.style.bottom='auto';
  });
  document.addEventListener('touchend', ()=>{ dragging=false; });
}

