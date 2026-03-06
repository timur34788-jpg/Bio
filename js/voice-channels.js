/* ═══════════════════════════════════════════════════════════════
   SES KANALLARI + SOUNDBOARD + STAGE — voice-channels.js
═══════════════════════════════════════════════════════════════ */
let _vcPeers = {}, _vcStream = null, _vcRoomId = null, _vcMuted = false, _vcDeafened = false;
let _vcPresenceRef = null, _vcAudioCtx = null, _stageMode = false;

async function joinVoiceChannel(roomId, isStage) {
  if (_vcRoomId === roomId) return;
  if (_vcRoomId) await leaveVoiceChannel();
  _stageMode = !!isStage;
  try { _vcStream = await navigator.mediaDevices.getUserMedia({ audio:true, video:false }); }
  catch(e) { showToast('Mikrofon erişimi reddedildi'); return; }
  _vcRoomId = roomId;
  _setupVoiceBar(isStage);
  _setupVAD(_vcStream);
  _vcPresenceRef = dbRef('voicePresence/' + (_currentServer||'main') + '/' + roomId + '/' + _cu);
  _vcPresenceRef.set({ uid:_cu, name:_cName||_cu, muted:false, deafened:false, speaking:false, joinedAt:Date.now() });
  _vcPresenceRef.onDisconnect().remove();
  dbRef('voicePresence/' + (_currentServer||'main') + '/' + roomId).on('value', snap => _renderVCParticipants(snap.val()||{}));
  showToast(isStage ? '🎙️ Stage kanalına bağlandınız' : '🔊 Ses kanalına bağlandınız');
}

async function leaveVoiceChannel() {
  if (!_vcRoomId) return;
  if (_vcPresenceRef) { _vcPresenceRef.remove(); _vcPresenceRef = null; }
  if (_vcStream) { _vcStream.getTracks().forEach(t => t.stop()); _vcStream = null; }
  Object.values(_vcPeers).forEach(p => p.close && p.close());
  _vcPeers = {};
  if (_vcAudioCtx) { try { _vcAudioCtx.close(); } catch(e){} _vcAudioCtx = null; }
  dbRef('voicePresence/' + (_currentServer||'main') + '/' + _vcRoomId).off();
  _vcRoomId = null;
  const bar = document.getElementById('vcBar');
  if (bar) bar.style.display = 'none';
  showToast('Ses kanalından ayrıldınız');
}

function _setupVoiceBar(isStage) {
  let bar = document.getElementById('vcBar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'vcBar'; document.body.appendChild(bar); }
  bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:3000;display:block;';
  bar.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--bg);border-top:2px solid #2ecc71;box-shadow:0 -4px 20px rgba(0,0,0,.3);">
    <div style="width:8px;height:8px;border-radius:50%;background:#2ecc71;animation:livepulse 1s infinite;flex-shrink:0;"></div>
    <span style="font-size:.82rem;font-weight:700;color:#2ecc71;">${isStage?'🎙️ Stage':'🔊 Ses'} • Bağlı</span>
    <div id="vcParticipantsRow" style="display:flex;gap:4px;flex:1;flex-wrap:wrap;overflow:hidden;max-height:28px;"></div>
    <button onclick="toggleVCMute()" id="vcMuteBtn" title="Mikrofon aç/kapat" style="background:var(--surface);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:.95rem;">🎤</button>
    <button onclick="toggleVCDeafen()" id="vcDeafBtn" title="Ses aç/kapat" style="background:var(--surface);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:.95rem;">🔊</button>
    <button onclick="openSoundboard()" title="Soundboard" style="background:var(--surface);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:.95rem;">🎵</button>
    ${isStage ? `<button onclick="openStageModal()" style="background:rgba(155,89,182,.2);border:1px solid rgba(155,89,182,.4);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:.8rem;color:#9b59b6;">🎙️ Stage</button>` : ''}
    <button onclick="leaveVoiceChannel()" style="background:#e74c3c22;border:1px solid #e74c3c55;color:#e74c3c;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.8rem;font-weight:700;">Ayrıl</button>
  </div>`;
}

function _renderVCParticipants(data) {
  const row = document.getElementById('vcParticipantsRow'); if (!row) return;
  row.innerHTML = Object.entries(data).map(([uid,p]) =>
    `<div style="display:flex;align-items:center;gap:4px;background:var(--surface);padding:3px 8px;border-radius:20px;${p.speaking?'border:1px solid #2ecc71;':'border:1px solid transparent;'}">
      <span style="font-size:.7rem;">${p.muted?'🔇':'🎤'}</span>
      <span style="font-size:.75rem;color:var(--text-hi);">${(p.name||uid).slice(0,12)}</span>
    </div>`).join('');
}

function toggleVCMute() {
  _vcMuted = !_vcMuted;
  if (_vcStream) _vcStream.getAudioTracks().forEach(t => t.enabled = !_vcMuted);
  const btn = document.getElementById('vcMuteBtn');
  if (btn) { btn.textContent = _vcMuted ? '🔇' : '🎤'; btn.style.background = _vcMuted ? 'rgba(231,76,60,.2)' : ''; }
  if (_vcPresenceRef) _vcPresenceRef.update({ muted:_vcMuted });
  showToast(_vcMuted ? '🔇 Mikrofon kapatıldı' : '🎤 Mikrofon açıldı');
}

function toggleVCDeafen() {
  _vcDeafened = !_vcDeafened;
  document.querySelectorAll('.vc-remote-audio').forEach(a => a.muted = _vcDeafened);
  const btn = document.getElementById('vcDeafBtn');
  if (btn) btn.textContent = _vcDeafened ? '🔕' : '🔊';
  if (_vcPresenceRef) _vcPresenceRef.update({ deafened:_vcDeafened });
  showToast(_vcDeafened ? '🔕 Ses kapatıldı' : '🔊 Ses açıldı');
}

function _setupVAD(stream) {
  try {
    _vcAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = _vcAudioCtx.createAnalyser();
    _vcAudioCtx.createMediaStreamSource(stream).connect(analyser);
    analyser.fftSize = 256;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    setInterval(() => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a,b)=>a+b) / buf.length;
      const now = avg > 20;
      if (now !== speaking) { speaking = now; if (_vcPresenceRef) _vcPresenceRef.update({ speaking }); }
    }, 200);
  } catch(e) {}
}

/* ── SOUNDBOARD ── */
function openSoundboard() {
  let m = document.getElementById('soundboardModal');
  if (!m) { m = document.createElement('div'); m.id = 'soundboardModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  dbRef('soundboard/' + (_currentServer||'main')).once('value', snap => {
    const items = snap.val() || {};
    m.innerHTML = `<div class="bb-modal" style="width:520px;">
      <div class="bb-modal-header"><span>🎵 Soundboard</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
      <div style="padding:16px;">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input id="sbName" placeholder="Ses adı..." style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          <input id="sbEmoji" placeholder="🔊" style="width:56px;padding:8px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);text-align:center;">
          <input type="file" id="sbFile" accept="audio/*" style="display:none" onchange="uploadSoundboard()">
          <button onclick="document.getElementById('sbFile').click()" style="padding:8px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">↑ Yükle</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${Object.entries(items).map(([id,s]) =>
            `<div onclick="playSoundboard('${s.url}')" style="background:var(--surface);border-radius:10px;padding:14px;text-align:center;cursor:pointer;position:relative;transition:transform .15s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
              <div style="font-size:2rem;margin-bottom:4px;">${s.emoji||'🔊'}</div>
              <div style="font-size:.78rem;font-weight:600;color:var(--text-hi);">${s.name}</div>
              <button onclick="event.stopPropagation();deleteSoundboard('${id}')" style="position:absolute;top:4px;right:6px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:.75rem;">✕</button>
            </div>`).join('')}
          ${!Object.keys(items).length ? '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px;">Henüz ses yok.<br>Yukarıdan ses yükleyin!</div>' : ''}
        </div>
      </div>
    </div>`;
    m.style.display = 'flex';
  });
}
async function uploadSoundboard() {
  const file = document.getElementById('sbFile').files[0]; if (!file) return;
  const name = document.getElementById('sbName').value || file.name;
  const emoji = document.getElementById('sbEmoji').value || '🔊';
  const reader = new FileReader();
  reader.onload = async e => {
    await dbRef('soundboard/' + (_currentServer||'main') + '/snd_' + Date.now()).set({ name, emoji, url:e.target.result, addedBy:_cu, ts:Date.now() });
    openSoundboard(); showToast('🎵 Ses eklendi!');
  };
  reader.readAsDataURL(file);
}
function playSoundboard(url) { const a = new Audio(url); a.volume = 0.8; a.play().catch(()=>{}); }
async function deleteSoundboard(id) { await dbRef('soundboard/' + (_currentServer||'main') + '/' + id).remove(); openSoundboard(); }

/* ── STAGE ── */
function openStageModal() {
  let m = document.getElementById('stageModal');
  if (!m) { m = document.createElement('div'); m.id = 'stageModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="bb-modal" style="width:500px;">
    <div class="bb-modal-header"><span>🎙️ Stage Kanalı</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;">
      <div style="background:rgba(155,89,182,.08);border:1px solid rgba(155,89,182,.2);border-radius:12px;padding:16px;margin-bottom:14px;">
        <div style="font-weight:700;color:var(--text-hi);margin-bottom:8px;">🎙️ Konuşmacılar</div>
        <div id="stageSpeakersList" style="min-height:40px;color:var(--muted);font-size:.82rem;">Yükleniyor...</div>
        <button onclick="requestSpeakStage()" style="margin-top:10px;padding:8px 16px;background:rgba(155,89,182,.2);border:1px solid rgba(155,89,182,.4);color:#9b59b6;border-radius:8px;cursor:pointer;font-size:.82rem;font-weight:600;">🙋 Konuşmak İstiyorum</button>
      </div>
      <div style="font-weight:700;color:var(--text-hi);margin-bottom:8px;">👥 Dinleyiciler</div>
      <div id="stageAudienceList" style="color:var(--muted);font-size:.82rem;">Yükleniyor...</div>
    </div>
  </div>`;
  m.style.display = 'flex';
  if (_vcRoomId) {
    dbRef('voicePresence/' + (_currentServer||'main') + '/' + _vcRoomId).once('value', snap => {
      const data = snap.val() || {};
      const speakers = Object.values(data).filter(p => p.isSpeaker);
      const audience = Object.values(data).filter(p => !p.isSpeaker);
      const sl = document.getElementById('stageSpeakersList');
      const al = document.getElementById('stageAudienceList');
      if (sl) sl.innerHTML = speakers.map(p => `<span style="background:var(--surface);padding:4px 10px;border-radius:20px;margin:2px;display:inline-flex;align-items:center;gap:4px;"><span>🎤</span><span style="font-size:.8rem;">${p.name||p.uid}</span></span>`).join('') || 'Konuşmacı yok';
      if (al) al.innerHTML = audience.map(p => `<span style="background:var(--surface);padding:4px 10px;border-radius:20px;margin:2px;display:inline-flex;align-items:center;gap:4px;"><span>👤</span><span style="font-size:.8rem;">${p.name||p.uid}</span></span>`).join('') || 'Dinleyici yok';
    });
  }
}
async function requestSpeakStage() {
  if (!_vcRoomId) return;
  await dbRef('stageRequests/' + (_currentServer||'main') + '/' + _vcRoomId + '/' + _cu).set({ name:_cName||_cu, ts:Date.now() });
  showToast('🙋 Konuşma isteği gönderildi');
}

/* ── Ses Kanalı Yönetimi ── */
async function createVoiceChannel(name, isStage) {
  const id = 'vc_' + Date.now();
  await dbRef('rooms/' + (_currentServer||'main') + '/' + id).set({ name, type:isStage?'stage':'voice', createdBy:_cu, createdAt:Date.now() });
  showToast(`${isStage?'🎙️ Stage':'🔊 Ses'} kanalı oluşturuldu: #${name}`);
  return id;
}

function openVoiceChannelCreator() {
  const name = prompt('Kanal adı:'); if (!name) return;
  const isStage = confirm('Stage kanalı mı? (Tamam=Stage, İptal=Normal Ses)');
  createVoiceChannel(name, isStage);
}

window.joinVoiceChannel = joinVoiceChannel;
window.leaveVoiceChannel = leaveVoiceChannel;
window.toggleVCMute = toggleVCMute;
window.toggleVCDeafen = toggleVCDeafen;
window.openSoundboard = openSoundboard;
window.uploadSoundboard = uploadSoundboard;
window.playSoundboard = playSoundboard;
window.deleteSoundboard = deleteSoundboard;
window.openStageModal = openStageModal;
window.requestSpeakStage = requestSpeakStage;
window.createVoiceChannel = createVoiceChannel;
window.openVoiceChannelCreator = openVoiceChannelCreator;
