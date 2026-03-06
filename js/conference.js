/* ═══════════════════════════════════════════════════════════════
   Nature.co — Konferans & Yayın Sistemi
   • Zoom tarzı: Çok katılımcılı görüntülü/sesli konferans (WebRTC mesh)
   • Kick tarzı: Oyun/ekran yayını (tek yayıncı → çok izleyici)
   Firebase Realtime DB sinyalleşme için kullanılıyor.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── STUN/TURN sunucuları ── */
var CONF_ICE = CONF_ICE || {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

/* ── Durum değişkenleri ── */
let _confId       = null;   // Aktif konferans ID
let _confType     = null;   // 'conference' | 'stream'
let _confPeers    = {};     // { username: RTCPeerConnection }
let _confStreams   = {};     // { username: MediaStream }
let _confLocal    = null;   // Yerel medya akışı
let _confScreen   = null;   // Ekran paylaşım akışı
let _confMuted    = false;
let _confCamOff   = false;
let _confSharing  = false;
let _confListeners= [];     // Firebase listener temizleyicileri
let _confRole     = null;   // 'broadcaster' | 'viewer'
let _confRoom     = null;   // Bağlı olunan kanal/oda

/* ═══════════════════════════════════════
   1. KONFERANS BAŞLAT (odadaki tüm üyeleri davet et)
═══════════════════════════════════════ */
async function startConference(type = 'conference') {
  if (_confId) { showToast('Zaten aktif bir görüşme var'); return; }
  if (!_cu) { showToast('Giriş yapman gerekiyor'); return; }

  try {
    _confLocal = await navigator.mediaDevices.getUserMedia({
      video: type === 'conference',
      audio: true
    });
  } catch(e) {
    showToast('Kamera/mikrofon erişimi reddedildi');
    return;
  }

  _confId   = 'conf_' + Date.now().toString(36);
  _confType = type;
  _confRole = 'broadcaster';
  _confRoom = _cRoom;

  // Firebase'e konferans kaydı
  await fbRestSet('conferences/' + _confId, {
    host: _cu,
    type,
    room: _cRoom || null,
    startedAt: Date.now(),
    active: true
  });

  // Mevcut odaya katılımcı olarak ekle
  await fbRestSet('conferences/' + _confId + '/members/' + _cu, {
    joinedAt: Date.now(),
    role: 'host'
  });

  _showConferenceUI();
  _listenForJoiners();

  // Odadaki kişilere bildirim gönder
  if (_cRoom) {
    _notifyRoomOfConference(_confId, type);
  }
}

/* ═══════════════════════════════════════
   2. KONFERANSA KATIL
═══════════════════════════════════════ */
async function joinConference(confId, type) {
  if (_confId) { showToast('Önce mevcut görüşmeden ayrılmalısın'); return; }
  if (!_cu) { showToast('Giriş yapman gerekiyor'); return; }

  try {
    _confLocal = await navigator.mediaDevices.getUserMedia({
      video: type === 'conference',
      audio: true
    });
  } catch(e) {
    showToast('Kamera/mikrofon erişimi reddedildi');
    return;
  }

  _confId   = confId;
  _confType = type;
  _confRole = 'viewer';

  // Konferans bilgisini al
  const conf = await fbRestGet('conferences/' + confId).catch(()=>null);
  if (!conf || !conf.active) { showToast('Bu görüşme artık aktif değil'); _cleanupConf(); return; }
  _confRoom = conf.room;

  // Katılımcı olarak ekle
  await fbRestSet('conferences/' + confId + '/members/' + _cu, {
    joinedAt: Date.now(),
    role: 'member'
  });

  _showConferenceUI();
  _listenForJoiners();

  // Mevcut katılımcılara bağlan
  const members = conf.members || {};
  for (const user of Object.keys(members)) {
    if (user !== _cu) {
      await _createPeerOffer(user);
    }
  }
}

/* ═══════════════════════════════════════
   3. OYUN/EKRAN YAYINI BAŞLAT
═══════════════════════════════════════ */
async function startGameStream() {
  if (_confId) { showToast('Önce mevcut görüşmeden ayrılmalısın'); return; }
  if (!_cu) { showToast('Giriş yapman gerekiyor'); return; }

  try {
    _confScreen = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true
    });
  } catch(e) {
    showToast('Ekran paylaşımı iptal edildi');
    return;
  }

  // Mikrofon da ekle
  try {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    _confLocal = new MediaStream([
      ..._confScreen.getVideoTracks(),
      ...mic.getAudioTracks()
    ]);
  } catch(e) {
    _confLocal = _confScreen;
  }

  _confId    = 'stream_' + Date.now().toString(36);
  _confType  = 'stream';
  _confRole  = 'broadcaster';
  _confRoom  = _cRoom;
  _confSharing = true;

  await fbRestSet('conferences/' + _confId, {
    host: _cu,
    type: 'stream',
    room: _cRoom || null,
    title: (_cu + ' yayında'),
    startedAt: Date.now(),
    active: true
  });

  await fbRestSet('conferences/' + _confId + '/members/' + _cu, {
    joinedAt: Date.now(),
    role: 'broadcaster'
  });

  _showStreamBroadcastUI();
  _listenForJoiners();

  // Ekran paylaşımı bitirilirse otomatik kapat
  _confScreen.getVideoTracks()[0].onended = () => endConference();

  // Odaya bildirim
  if (_cRoom) _notifyRoomOfConference(_confId, 'stream');
}

/* ═══════════════════════════════════════
   4. YAYINI İZLE
═══════════════════════════════════════ */
async function watchStream(confId) {
  if (_confId) { showToast('Önce mevcut görüşmeden ayrılmalısın'); return; }
  if (!_cu) { showToast('Giriş yapman gerekiyor'); return; }

  const conf = await fbRestGet('conferences/' + confId).catch(()=>null);
  if (!conf || !conf.active) { showToast('Yayın sona ermiş'); return; }

  _confId   = confId;
  _confType = 'stream';
  _confRole = 'viewer';
  _confRoom = conf.room;

  // Sadece ses al (izleyici kamerası kapalı)
  try {
    _confLocal = await navigator.mediaDevices.getUserMedia({ audio: false, video: false });
  } catch(e) { _confLocal = new MediaStream(); }

  await fbRestSet('conferences/' + confId + '/members/' + _cu, {
    joinedAt: Date.now(),
    role: 'viewer'
  });

  _showStreamViewerUI(conf);
  _listenForJoiners();

  // Yayıncıya bağlan
  const members = conf.members || {};
  const broadcaster = Object.entries(members).find(([u, m]) => m.role === 'broadcaster');
  if (broadcaster) {
    await _createPeerOffer(broadcaster[0]);
  }
}

/* ═══════════════════════════════════════
   5. WebRTC — PEER BAĞLANTISI OLUŞTUR (TEKLİF GÖNDER)
═══════════════════════════════════════ */
async function _createPeerOffer(remoteUser) {
  if (_confPeers[remoteUser]) return;

  const pc = new RTCPeerConnection(CONF_ICE);
  _confPeers[remoteUser] = pc;

  // Yerel stream'i ekle
  if (_confLocal) {
    _confLocal.getTracks().forEach(t => pc.addTrack(t, _confLocal));
  }

  // ICE adayları
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      fbRestSet('conferences/' + _confId + '/signals/' + _cu + '/' + remoteUser + '/ice_' + Date.now(), {
        type: 'ice',
        candidate: JSON.stringify(e.candidate)
      });
    }
  };

  // Uzak stream gelince göster
  pc.ontrack = (e) => {
    if (!_confStreams[remoteUser]) _confStreams[remoteUser] = new MediaStream();
    _confStreams[remoteUser].addTrack(e.track);
    _updateParticipantVideo(remoteUser, _confStreams[remoteUser]);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      _removePeer(remoteUser);
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await fbRestSet('conferences/' + _confId + '/signals/' + _cu + '/' + remoteUser + '/offer', {
    type: 'offer',
    sdp: offer.sdp
  });

  // Cevap dinle
  _listenForAnswer(remoteUser, pc);
}

/* ═══════════════════════════════════════
   6. WebRTC — TEKLİF AL, CEVAP GÖNDER
═══════════════════════════════════════ */
async function _handleOffer(fromUser, offerData) {
  if (_confPeers[fromUser]) return;

  const pc = new RTCPeerConnection(CONF_ICE);
  _confPeers[fromUser] = pc;

  if (_confLocal) {
    _confLocal.getTracks().forEach(t => pc.addTrack(t, _confLocal));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      fbRestSet('conferences/' + _confId + '/signals/' + _cu + '/' + fromUser + '/ice_' + Date.now(), {
        type: 'ice',
        candidate: JSON.stringify(e.candidate)
      });
    }
  };

  pc.ontrack = (e) => {
    if (!_confStreams[fromUser]) _confStreams[fromUser] = new MediaStream();
    _confStreams[fromUser].addTrack(e.track);
    _updateParticipantVideo(fromUser, _confStreams[fromUser]);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      _removePeer(fromUser);
    }
  };

  await pc.setRemoteDescription({ type: 'offer', sdp: offerData.sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await fbRestSet('conferences/' + _confId + '/signals/' + _cu + '/' + fromUser + '/answer', {
    type: 'answer',
    sdp: answer.sdp
  });

  // ICE adaylarını dinle
  _listenForIceCandidates(fromUser, pc);
}

/* ═══════════════════════════════════════
   7. CEVAP DİNLE
═══════════════════════════════════════ */
function _listenForAnswer(remoteUser, pc) {
  const path = 'conferences/' + _confId + '/signals/' + remoteUser + '/' + _cu;
  const ref = dbRef(path + '/answer');
  const off = ref.on('value', async (snap) => {
    const data = snap.val();
    if (data && data.sdp && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp }).catch(()=>{});
      _listenForIceCandidates(remoteUser, pc);
    }
  });
  _confListeners.push(() => ref.off('value', off));
}

/* ═══════════════════════════════════════
   8. ICE ADAYLARINI DİNLE
═══════════════════════════════════════ */
function _listenForIceCandidates(remoteUser, pc) {
  const path = 'conferences/' + _confId + '/signals/' + remoteUser + '/' + _cu;
  const ref = dbRef(path);
  const off = ref.on('child_added', (snap) => {
    const data = snap.val();
    if (data && data.type === 'ice') {
      try {
        const cand = JSON.parse(data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch(()=>{});
      } catch(e) {}
    }
  });
  _confListeners.push(() => ref.off('child_added', off));
}

/* ═══════════════════════════════════════
   9. YENİ KATILIMCILARI DİNLE
═══════════════════════════════════════ */
function _listenForJoiners() {
  // Sinyalleri dinle
  const sigRef = dbRef('conferences/' + _confId + '/signals');
  const off = sigRef.on('child_added', (snap) => {
    const fromUser = snap.key;
    if (fromUser === _cu) return;
    const signals = snap.val() || {};
    const mySignals = signals[_cu] || {};
    if (mySignals.offer && !_confPeers[fromUser]) {
      _handleOffer(fromUser, mySignals.offer);
    }
  });
  _confListeners.push(() => sigRef.off('child_added', off));

  // Katılımcı listesini izle
  const memRef = dbRef('conferences/' + _confId + '/members');
  const off2 = memRef.on('value', (snap) => {
    const members = snap.val() || {};
    _updateParticipantList(members);
  });
  _confListeners.push(() => memRef.off('value', off2));

  // Konferans kapandı mı?
  const activeRef = dbRef('conferences/' + _confId + '/active');
  const off3 = activeRef.on('value', (snap) => {
    if (snap.val() === false) { endConference(true); }
  });
  _confListeners.push(() => activeRef.off('value', off3));
}

/* ═══════════════════════════════════════
   10. KONFERANSI BİTİR
═══════════════════════════════════════ */
async function endConference(remote = false) {
  if (!_confId) return;

  const wasId = _confId;

  // Host ise konferansı kapat
  if (_confRole === 'broadcaster' || _confRole === 'host') {
    await fbRestSet('conferences/' + wasId + '/active', false).catch(()=>{});
  } else {
    // Üye olarak ayrıl
    await fbRestSet('conferences/' + wasId + '/members/' + _cu, null).catch(()=>{});
  }

  _cleanupConf();
  _removeConferenceUI();
  if (!remote) showToast('Görüşme sonlandırıldı');
}

function _cleanupConf() {
  // Peer bağlantılarını kapat
  Object.values(_confPeers).forEach(pc => { try { pc.close(); } catch(e) {} });
  _confPeers = {};
  _confStreams = {};

  // Medya akışlarını durdur
  if (_confLocal) { _confLocal.getTracks().forEach(t => t.stop()); _confLocal = null; }
  if (_confScreen) { _confScreen.getTracks().forEach(t => t.stop()); _confScreen = null; }

  // Firebase dinleyicileri kaldır
  _confListeners.forEach(fn => { try { fn(); } catch(e) {} });
  _confListeners = [];

  _confId = _confType = _confRole = _confRoom = null;
  _confMuted = _confCamOff = _confSharing = false;
}

function _removePeer(username) {
  if (_confPeers[username]) {
    try { _confPeers[username].close(); } catch(e) {}
    delete _confPeers[username];
  }
  delete _confStreams[username];
  const tile = document.getElementById('conf-tile-' + username);
  if (tile) tile.remove();
  _reLayoutTiles();
}

/* ═══════════════════════════════════════
   11. KONFERANS UI
═══════════════════════════════════════ */
function _showConferenceUI() {
  _removeConferenceUI();

  const ui = document.createElement('div');
  ui.id = 'confOverlay';
  ui.style.cssText = `
    position:fixed;inset:0;background:#0a0f0a;z-index:50000;
    display:flex;flex-direction:column;font-family:inherit;
  `;

  const isHost = _confRole === 'host' || _confRole === 'broadcaster';

  ui.innerHTML = `
    <!-- Başlık çubuğu -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 20px;background:rgba(0,0,0,.4);flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.08);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#e05555;animation:pulse 1.5s infinite;"></div>
        <span style="color:#fff;font-weight:800;font-size:.95rem;">
          ${_confType === 'conference' ? '🎥 Görüntülü Konferans' : '📡 Sesli Toplantı'}
        </span>
        <span id="confTimer" style="color:rgba(255,255,255,.5);font-size:.8rem;font-family:monospace;">00:00</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span id="confCount" style="color:rgba(255,255,255,.6);font-size:.8rem;">1 katılımcı</span>
        ${isHost ? `<button onclick="inviteToConference()" style="background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.4);color:#6dbf67;border-radius:8px;padding:5px 12px;font-size:.78rem;cursor:pointer;font-weight:700;">+ Davet Et</button>` : ''}
      </div>
    </div>

    <!-- Video grid -->
    <div id="confGrid" style="flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
                               gap:8px;padding:12px;overflow-y:auto;align-content:start;"></div>

    <!-- Kontroller -->
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                padding:16px 20px;background:rgba(0,0,0,.5);flex-shrink:0;">
      <button id="confMuteBtn" onclick="confToggleMute()" title="Mikrofon" style="
        width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
        display:flex;align-items:center;justify-content:center;transition:all .15s;
        background:rgba(255,255,255,.12);color:#fff;font-size:1.3rem;">🎙️</button>

      ${_confType === 'conference' ? `
      <button id="confCamBtn" onclick="confToggleCamera()" title="Kamera" style="
        width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
        display:flex;align-items:center;justify-content:center;transition:all .15s;
        background:rgba(255,255,255,.12);color:#fff;font-size:1.3rem;">📹</button>` : ''}

      <button id="confShareBtn" onclick="confToggleScreen()" title="Ekran Paylaş" style="
        width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
        display:flex;align-items:center;justify-content:center;transition:all .15s;
        background:rgba(255,255,255,.12);color:#fff;font-size:1.3rem;">🖥️</button>

      <button onclick="endConference()" style="
        width:64px;height:52px;border-radius:26px;border:none;cursor:pointer;
        background:#e05555;color:#fff;font-size:1.1rem;font-weight:800;
        display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s;">
        ✕
      </button>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      .conf-tile { border-radius:14px;overflow:hidden;background:#1a2a1a;position:relative;min-height:200px; }
      .conf-tile video { width:100%;height:100%;object-fit:cover;display:block; }
      .conf-tile-label { position:absolute;bottom:8px;left:10px;background:rgba(0,0,0,.6);
                         color:#fff;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:6px; }
      .conf-tile-avatar { width:80px;height:80px;border-radius:50%;display:flex;align-items:center;
                          justify-content:center;font-size:2rem;font-weight:900;color:#fff;
                          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%); }
    </style>
  `;

  document.body.appendChild(ui);

  // Kendi video karosunu ekle
  _addLocalTile();

  // Zamanlayıcı başlat
  _startConfTimer();
}

/* ═══════════════════════════════════════
   12. STREAM YAYINCI UI
═══════════════════════════════════════ */
function _showStreamBroadcastUI() {
  _removeConferenceUI();

  const ui = document.createElement('div');
  ui.id = 'confOverlay';
  ui.style.cssText = `
    position:fixed;inset:0;background:#0a0f0a;z-index:50000;
    display:flex;flex-direction:column;font-family:inherit;
  `;

  ui.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 20px;background:rgba(0,0,0,.5);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="background:#e05555;color:#fff;font-size:.7rem;font-weight:900;padding:3px 8px;border-radius:4px;letter-spacing:.05em;">● CANLI</div>
        <span style="color:#fff;font-weight:800;">🎮 ${_cu} yayında</span>
        <span id="confTimer" style="color:rgba(255,255,255,.5);font-size:.8rem;font-family:monospace;">00:00</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="confCount" style="color:rgba(255,255,255,.6);font-size:.85rem;">👁 0 izleyici</span>
        <button onclick="endConference()" style="background:#e05555;border:none;color:#fff;padding:7px 16px;border-radius:8px;cursor:pointer;font-weight:800;">Yayını Bitir</button>
      </div>
    </div>

    <!-- Ana ekran önizlemesi -->
    <div style="flex:1;display:flex;gap:12px;padding:12px;overflow:hidden;">
      <div style="flex:1;border-radius:14px;overflow:hidden;background:#111;position:relative;">
        <video id="streamPreview" autoplay muted playsinline style="width:100%;height:100%;object-fit:contain;"></video>
        <div style="position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,.7);color:#fff;padding:4px 10px;border-radius:6px;font-size:.75rem;">Ekranın</div>
      </div>

      <!-- Sohbet paneli -->
      <div style="width:280px;display:flex;flex-direction:column;background:rgba(255,255,255,.04);border-radius:14px;border:1px solid rgba(255,255,255,.08);overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:800;color:#fff;font-size:.85rem;">💬 Canlı Sohbet</div>
        <div id="streamChat" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;"></div>
        <div style="padding:8px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:6px;">
          <input id="streamMsgInput" type="text" placeholder="Mesaj gönder..." maxlength="200"
                 style="flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;
                        padding:7px 10px;color:#fff;font-size:.82rem;font-family:inherit;outline:none;"
                 onkeydown="if(event.key==='Enter')sendStreamMsg()">
          <button onclick="sendStreamMsg()" style="background:rgba(74,143,64,.3);border:1px solid rgba(74,143,64,.5);color:#6dbf67;border-radius:8px;padding:7px 12px;cursor:pointer;font-weight:700;">↵</button>
        </div>
      </div>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    </style>
  `;

  document.body.appendChild(ui);

  // Ekran önizlemesi
  const preview = document.getElementById('streamPreview');
  if (preview && _confLocal) preview.srcObject = _confLocal;

  _startConfTimer();
  _listenStreamChat();
}

/* ═══════════════════════════════════════
   13. STREAM İZLEYİCİ UI
═══════════════════════════════════════ */
function _showStreamViewerUI(conf) {
  _removeConferenceUI();

  const ui = document.createElement('div');
  ui.id = 'confOverlay';
  ui.style.cssText = `
    position:fixed;inset:0;background:#0a0f0a;z-index:50000;
    display:flex;flex-direction:column;font-family:inherit;
  `;

  ui.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 20px;background:rgba(0,0,0,.5);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="background:#e05555;color:#fff;font-size:.7rem;font-weight:900;padding:3px 8px;border-radius:4px;">● CANLI</div>
        <span style="color:#fff;font-weight:800;">🎮 ${conf.host || ''} yayını</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="confCount" style="color:rgba(255,255,255,.6);font-size:.85rem;">👁 1 izleyici</span>
        <button onclick="endConference()" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;">Çık</button>
      </div>
    </div>

    <div style="flex:1;display:flex;gap:12px;padding:12px;overflow:hidden;">
      <!-- Yayın ekranı -->
      <div style="flex:1;border-radius:14px;overflow:hidden;background:#111;position:relative;">
        <video id="streamView" autoplay playsinline style="width:100%;height:100%;object-fit:contain;">
        </video>
        <div id="streamLoading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:rgba(255,255,255,.5);">
          <div style="font-size:2rem;">📡</div>
          <div style="font-size:.85rem;">Yayına bağlanılıyor...</div>
        </div>
      </div>

      <!-- Sohbet -->
      <div style="width:280px;display:flex;flex-direction:column;background:rgba(255,255,255,.04);border-radius:14px;border:1px solid rgba(255,255,255,.08);overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:800;color:#fff;font-size:.85rem;">💬 Canlı Sohbet</div>
        <div id="streamChat" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;"></div>
        <div style="padding:8px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:6px;">
          <input id="streamMsgInput" type="text" placeholder="Mesaj gönder..." maxlength="200"
                 style="flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;
                        padding:7px 10px;color:#fff;font-size:.82rem;font-family:inherit;outline:none;"
                 onkeydown="if(event.key==='Enter')sendStreamMsg()">
          <button onclick="sendStreamMsg()" style="background:rgba(74,143,64,.3);border:1px solid rgba(74,143,64,.5);color:#6dbf67;border-radius:8px;padding:7px 12px;cursor:pointer;font-weight:700;">↵</button>
        </div>
      </div>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    </style>
  `;

  document.body.appendChild(ui);
  _listenStreamChat();
}

/* ═══════════════════════════════════════
   14. YEREL VIDEO KAROSI EKLE
═══════════════════════════════════════ */
function _addLocalTile() {
  const grid = document.getElementById('confGrid');
  if (!grid) return;

  const tile = document.createElement('div');
  tile.className = 'conf-tile';
  tile.id = 'conf-tile-' + _cu;
  tile.innerHTML = `
    <video autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;min-height:200px;"></video>
    <div class="conf-tile-label">🎙 ${_cu} (Sen)</div>
    <div class="conf-tile-avatar" style="background:${strColor(_cu)};display:none;">${initials(_cu)}</div>
  `;

  const video = tile.querySelector('video');
  if (_confLocal && _confLocal.getVideoTracks().length > 0) {
    video.srcObject = _confLocal;
  } else {
    video.style.display = 'none';
    tile.querySelector('.conf-tile-avatar').style.display = 'flex';
  }

  grid.appendChild(tile);
  _reLayoutTiles();
}

/* ═══════════════════════════════════════
   15. UZAK KATILIMCI VIDEO KAROSI GÜNCELLE
═══════════════════════════════════════ */
function _updateParticipantVideo(username, stream) {
  const grid = document.getElementById('confGrid');
  const streamView = document.getElementById('streamView');

  // Stream izleyici UI'si için
  if (streamView && _confType === 'stream' && _confRole === 'viewer') {
    streamView.srcObject = stream;
    streamView.play().catch(()=>{});
    const loading = document.getElementById('streamLoading');
    if (loading) loading.style.display = 'none';
    return;
  }

  if (!grid) return;

  let tile = document.getElementById('conf-tile-' + username);
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'conf-tile';
    tile.id = 'conf-tile-' + username;
    tile.innerHTML = `
      <video autoplay playsinline style="width:100%;height:100%;object-fit:cover;min-height:200px;"></video>
      <div class="conf-tile-label">🎙 ${username}</div>
      <div class="conf-tile-avatar" style="background:${strColor(username)};display:none;">${initials(username)}</div>
    `;
    grid.appendChild(tile);
  }

  const video = tile.querySelector('video');
  if (stream && stream.getVideoTracks().length > 0) {
    video.srcObject = stream;
    video.style.display = 'block';
    tile.querySelector('.conf-tile-avatar').style.display = 'none';
  } else {
    video.style.display = 'none';
    tile.querySelector('.conf-tile-avatar').style.display = 'flex';
  }

  _reLayoutTiles();
}

/* ═══════════════════════════════════════
   16. KATILIMCIları GÜNCELLE
═══════════════════════════════════════ */
function _updateParticipantList(members) {
  const count = Object.keys(members).length;
  const el = document.getElementById('confCount');
  if (el) {
    if (_confType === 'stream') {
      el.textContent = '👁 ' + (count - 1) + ' izleyici';
    } else {
      el.textContent = count + ' katılımcı';
    }
  }

  // Ayrılan kullanıcıları temizle
  Object.keys(_confPeers).forEach(user => {
    if (!members[user]) _removePeer(user);
  });
}

/* ═══════════════════════════════════════
   17. LAYOUT YENİDEN DÜZENLE
═══════════════════════════════════════ */
function _reLayoutTiles() {
  const grid = document.getElementById('confGrid');
  if (!grid) return;
  const count = grid.children.length;
  if (count <= 1) grid.style.gridTemplateColumns = '1fr';
  else if (count <= 2) grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  else if (count <= 4) grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  else if (count <= 6) grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  else grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
}

/* ═══════════════════════════════════════
   18. ZAMANLAYICI
═══════════════════════════════════════ */
let _confTimerInterval = null;
let _confSeconds = 0;

function _startConfTimer() {
  _confSeconds = 0;
  _confTimerInterval = setInterval(() => {
    _confSeconds++;
    const m = String(Math.floor(_confSeconds / 60)).padStart(2, '0');
    const s = String(_confSeconds % 60).padStart(2, '0');
    const el = document.getElementById('confTimer');
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

/* ═══════════════════════════════════════
   19. KONTROLLER
═══════════════════════════════════════ */
function confToggleMute() {
  if (!_confLocal) return;
  _confMuted = !_confMuted;
  _confLocal.getAudioTracks().forEach(t => { t.enabled = !_confMuted; });
  const btn = document.getElementById('confMuteBtn');
  if (btn) {
    btn.textContent = _confMuted ? '🔇' : '🎙️';
    btn.style.background = _confMuted ? 'rgba(224,85,85,.4)' : 'rgba(255,255,255,.12)';
  }
}

function confToggleCamera() {
  if (!_confLocal) return;
  _confCamOff = !_confCamOff;
  _confLocal.getVideoTracks().forEach(t => { t.enabled = !_confCamOff; });
  const btn = document.getElementById('confCamBtn');
  if (btn) {
    btn.textContent = _confCamOff ? '📷' : '📹';
    btn.style.background = _confCamOff ? 'rgba(224,85,85,.4)' : 'rgba(255,255,255,.12)';
  }
  // Kendi karosunu güncelle
  const myTile = document.getElementById('conf-tile-' + _cu);
  if (myTile) {
    const video = myTile.querySelector('video');
    const avatar = myTile.querySelector('.conf-tile-avatar');
    if (video) video.style.display = _confCamOff ? 'none' : 'block';
    if (avatar) avatar.style.display = _confCamOff ? 'flex' : 'none';
  }
}

async function confToggleScreen() {
  if (_confSharing) {
    // Ekran paylaşımını durdur
    if (_confScreen) { _confScreen.getTracks().forEach(t => t.stop()); _confScreen = null; }
    _confSharing = false;
    const btn = document.getElementById('confShareBtn');
    if (btn) { btn.style.background = 'rgba(255,255,255,.12)'; }
    // Kameraya geri dön
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: _confType === 'conference', audio: true });
      _replaceLocalStream(newStream);
    } catch(e) {}
  } else {
    try {
      _confScreen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      _confSharing = true;
      _replaceLocalStream(_confScreen);
      const btn = document.getElementById('confShareBtn');
      if (btn) { btn.style.background = 'rgba(74,143,64,.4)'; }
      _confScreen.getVideoTracks()[0].onended = () => confToggleScreen();
    } catch(e) {
      showToast('Ekran paylaşımı iptal edildi');
    }
  }
}

function _replaceLocalStream(newStream) {
  _confLocal = newStream;
  // Tüm peer bağlantılarında track'leri değiştir
  Object.values(_confPeers).forEach(pc => {
    const senders = pc.getSenders();
    newStream.getTracks().forEach(track => {
      const sender = senders.find(s => s.track && s.track.kind === track.kind);
      if (sender) sender.replaceTrack(track).catch(()=>{});
      else pc.addTrack(track, newStream);
    });
  });
  // Kendi önizlemesini güncelle
  const myVideo = document.querySelector('#conf-tile-' + _cu + ' video');
  if (myVideo) myVideo.srcObject = newStream;
  const preview = document.getElementById('streamPreview');
  if (preview) preview.srcObject = newStream;
}

/* ═══════════════════════════════════════
   20. CANLI SOHBET
═══════════════════════════════════════ */
function _listenStreamChat() {
  if (!_confId) return;
  const ref = dbRef('conferences/' + _confId + '/chat');
  const off = ref.limitToLast(50).on('child_added', (snap) => {
    const msg = snap.val();
    if (!msg) return;
    _appendStreamMsg(msg);
  });
  _confListeners.push(() => ref.off('child_added', off));
}

function _appendStreamMsg(msg) {
  const chat = document.getElementById('streamChat');
  if (!chat) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;align-items:flex-start;';
  const isMe = msg.user === _cu;
  div.innerHTML = `
    <div style="width:22px;height:22px;border-radius:50%;background:${strColor(msg.user)};
                display:flex;align-items:center;justify-content:center;font-size:.6rem;
                font-weight:900;color:#fff;flex-shrink:0;">${initials(msg.user)}</div>
    <div style="flex:1;min-width:0;">
      <span style="color:${isMe?'#6dbf67':'rgba(255,255,255,.7)'};font-size:.72rem;font-weight:700;">${msg.user}</span>
      <div style="color:rgba(255,255,255,.85);font-size:.8rem;word-break:break-word;margin-top:1px;">${esc(msg.text)}</div>
    </div>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendStreamMsg() {
  const input = document.getElementById('streamMsgInput');
  if (!input || !input.value.trim() || !_confId) return;
  const text = input.value.trim();
  input.value = '';
  await dbRef('conferences/' + _confId + '/chat').push({
    user: _cu,
    text,
    ts: Date.now()
  });
}

/* ═══════════════════════════════════════
   21. ODA BİLDİRİMİ
═══════════════════════════════════════ */
function _notifyRoomOfConference(confId, type) {
  if (!_cRoom || !_db) return;
  dbRef('msgs/' + _cRoom).push({
    user: _cu,
    confId,
    confType: type,
    text: type === 'stream'
      ? `🎮 ${_cu} oyun yayını başlattı! [İzle]`
      : `🎥 ${_cu} bir ${type === 'conference' ? 'görüntülü' : 'sesli'} konferans başlattı! [Katıl]`,
    ts: Date.now(),
    isConferenceInvite: true
  });
}

/* ═══════════════════════════════════════
   22. KONFERANS DAVET ET
═══════════════════════════════════════ */
function inviteToConference() {
  if (!_confId) return;
  const link = location.origin + location.pathname + '#conf=' + _confId;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => showToast('Davet linki kopyalandı!'));
  } else {
    showToast('Davet ID: ' + _confId);
  }
}

/* ═══════════════════════════════════════
   23. UI KALDIR
═══════════════════════════════════════ */
function _removeConferenceUI() {
  const ui = document.getElementById('confOverlay');
  if (ui) ui.remove();
  if (_confTimerInterval) { clearInterval(_confTimerInterval); _confTimerInterval = null; }
}

/* ═══════════════════════════════════════
   24. MESAJLARDA KONFERANS BUTONLARINI RENDER ET
═══════════════════════════════════════ */
function renderConferenceInviteMsg(msg) {
  if (!msg.isConferenceInvite || !msg.confId) return null;
  const isStream = msg.confType === 'stream';
  return `
    <div style="background:${isStream ? 'rgba(224,85,85,.1)' : 'rgba(74,143,64,.1)'};
                border:1px solid ${isStream ? 'rgba(224,85,85,.3)' : 'rgba(74,143,64,.3)'};
                border-radius:12px;padding:10px 14px;margin:4px 0;cursor:pointer;transition:all .15s;"
         onclick="${isStream ? `watchStream('${msg.confId}')` : `joinConference('${msg.confId}','${msg.confType||'conference'}')`}"
         onmouseover="this.style.background='${isStream ? 'rgba(224,85,85,.2)' : 'rgba(74,143,64,.2)'}'"
         onmouseout="this.style.background='${isStream ? 'rgba(224,85,85,.1)' : 'rgba(74,143,64,.1)'}'">
      <div style="display:flex;align-items:center;gap:8px;color:#fff;font-weight:700;font-size:.85rem;">
        <span>${isStream ? '🎮' : '🎥'}</span>
        <span>${esc(msg.text.replace(' [İzle]','').replace(' [Katıl]',''))}</span>
      </div>
      <div style="margin-top:6px;">
        <span style="background:${isStream ? '#e05555' : '#4a8f40'};color:#fff;font-size:.72rem;
                     font-weight:800;padding:3px 10px;border-radius:6px;">
          ${isStream ? '▶ Yayını İzle' : '📞 Katıl'}
        </span>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════
   25. MASAÜSTÜ SOHBET BAŞLIĞINA BUTONLAR EKLE
═══════════════════════════════════════ */
function _addConfButtonsToChatHeader() {
  // Butonlar HTML'de sabit mevcut - yeniden eklemeye gerek yok
  return;
  const hdr = document.getElementById('deskChatHeader');
  if (!hdr || document.getElementById('confHeaderBtns')) return;

  const btns = document.createElement('div');
  btns.id = 'confHeaderBtns';
  btns.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0;';
  btns.innerHTML = `
    <div onclick="startConference('audio')" title="Sesli Toplantı"
         style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;
                cursor:pointer;color:rgba(255,255,255,.7);transition:all .15s;"
         onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='transparent'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </div>
    <div onclick="startConference('conference')" title="Görüntülü Konferans"
         style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;
                cursor:pointer;color:rgba(255,255,255,.7);transition:all .15s;"
         onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='transparent'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
      </svg>
    </div>
    <div onclick="startGameStream()" title="Oyun Yayını Başlat"
         style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;
                cursor:pointer;color:rgba(255,255,255,.7);transition:all .15s;"
         onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='transparent'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>
        <path d="M7 10h2m-1-1v2m5-1h2m-1-1v2" stroke-width="1.5"/>
      </svg>
    </div>
  `;

  // Mevcut butonların önüne ekle
  const endBtn = hdr.querySelector('[id*="Call"],[id*="call"]');
  if (endBtn) hdr.insertBefore(btns, endBtn);
  else hdr.appendChild(btns);
}

/* ═══════════════════════════════════════
   26. SOHBET BAŞLIĞI GÜNCELLENINCE BUTONLARI EKLE
═══════════════════════════════════════ */
const _origDeskOpenRoom = window.deskOpenRoom;
window.deskOpenRoom = function() {
  if (_origDeskOpenRoom) _origDeskOpenRoom.apply(this, arguments);
  setTimeout(_addConfButtonsToChatHeader, 100);
};

// Başlangıçta mevcut chat header varsa ekle
setTimeout(_addConfButtonsToChatHeader, 2000);

/* Global erişim */
window.startConference   = startConference;
window.joinConference    = joinConference;
window.startGameStream   = startGameStream;
window.watchStream       = watchStream;
window.endConference     = endConference;
window.confToggleMute    = confToggleMute;
window.confToggleCamera  = confToggleCamera;
window.confToggleScreen  = confToggleScreen;
window.inviteToConference= inviteToConference;
window.sendStreamMsg     = sendStreamMsg;
window.renderConferenceInviteMsg = renderConferenceInviteMsg;
