/* Nature.co — desktop.js */
/* Otomatik bölümlendi */

/* ══════════════════════════════════════════
   DESKTOP ENGINE
══════════════════════════════════════════ */

// IS_DESKTOP: gerçek masaüstü/tablet tespiti
// Telefon yatayda döndüğünde yanlış desktop moda GEÇMESİN
// Math.min(screen.width, screen.height) → cihazın portrait genişliği
// Telefon: 320-430px → < 768 = ASLA masaüstü
// iPad/Tablet: 768px+ → masaüstü olabilir
// Desktop: her zaman >= 768
const IS_DESKTOP = () => {
  const minScreenDim = Math.min(screen.width || 0, screen.height || 0);
  // Eğer cihaz gerçekten küçükse (telefon) → her zaman mobil
  if (minScreenDim > 0 && minScreenDim < 600) return false;
  return window.innerWidth >= 768;
};

let _deskRoom = null;
let _deskNav = 'home';
let _deskMembersOpen = true;
let _deskStopMsg = null;

function initDesktop() {
  if (!IS_DESKTOP()) return;
  document.getElementById('desktopShell').style.display = 'flex';
  document.getElementById('loginScreen').style.display = 'none';
  // Redirect onLoginSuccess to desktop init
}

function deskOnLogin() {
  if (!IS_DESKTOP()) return;
  document.getElementById('desktopShell').style.display = 'flex';
  // Hide all mobile screens
  document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });

  // Kendi fotoğrafını cache'e yükle sonra avatarı set et
  if(_db && _cu){
    dbRef('users/'+_cu+'/photoURL').once('value').then(s=>{
      const url=s.val();
      if(url) _avatarCache[_cu]=url;
      const railUser=document.getElementById('deskRailUser');
      if(railUser){
        railUser.innerHTML='<div class="sdot"></div>';
        railUser.style.background=strColor(_cu);
        if(url) _applyAvatarPhoto(railUser,url);
        else railUser.insertAdjacentText('afterbegin',initials(_cu));
        if(!railUser.querySelector('.sdot')){const d=document.createElement('div');d.className='sdot';railUser.appendChild(d);}
      }
      // Sidebar header avatar
      const sideAv=document.getElementById('deskSidebarAvatar');
      if(sideAv){
        sideAv.style.background=strColor(_cu);
        if(url) _applyAvatarPhoto(sideAv,url);
        else { sideAv.insertAdjacentText('afterbegin',initials(_cu)); }
      }
    });
  }
  // rb-admin görünürlüğü onLoginSuccess._finalizeAdminStatus ile yönetiliyor

  deskNav('home');
  setTimeout(()=>applyTabIcons(true), 100);
  // Guild sistemini başlat
  if (typeof initGuildSystem === 'function') setTimeout(initGuildSystem, 300);
}

function deskNav(tab) {
  if (!IS_DESKTOP()) return;
  _deskNav = tab;
  if(typeof _updateURL === 'function') _updateURL(tab);
  closeEmoji();

  // Update rail active state
  document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('act'));
  document.querySelectorAll('.dns-btn').forEach(b => b.classList.remove('act'));
  const rbEl = document.getElementById('rb-' + tab);
  if (rbEl) rbEl.classList.add('act');
  const dnsEl = document.getElementById('dns-' + tab);
  if (dnsEl) dnsEl.classList.add('act');

  const sidebar = document.getElementById('deskSidebar');
  const sideTitle = document.getElementById('deskSidebarTitle');
  const sideSub = document.getElementById('deskSidebarSub');

  // Hide chat, show appropriate content
  document.getElementById('deskEmptyState').style.display = 'flex';
  document.getElementById('deskChatArea').style.display = 'none';
  document.getElementById('deskPanelContent').style.display = 'none';

  if (tab === 'tasks') {
    sidebar.style.display = 'flex';
    sideTitle.textContent = 'Biyom Business';
    sideSub.textContent = 'Görev Panosu';
    deskLoadRoomList();
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'none';
    // Show task board in main area
    setTimeout(() => {
      const tb = document.getElementById('taskBoardScreen');
      if (tb) { tb.style.display='flex'; tb.style.flexDirection='column'; }
      if (typeof _loadTaskBoard === 'function') _loadTaskBoard();
    }, 50);
    return;
  } else if (tab === 'home') {
    // Hide task board if visible
    const tb = document.getElementById('taskBoardScreen');
    if (tb) { tb.style.display=''; }
  }

  if (tab === 'home') {
    sidebar.style.display = 'flex';
    sideTitle.textContent = 'Biyom Business';
    sideSub.textContent = 'Kanallar & Ekipler';
    deskLoadRoomList();
    // Sidebar açık = kulübe görünür (uyuyorsa)
    if (window._natureBotInstance && window._natureBotInstance.isSleeping) {
      window._natureBotInstance.showKennel();
      window._natureBotInstance.showZzz();
    }
  } else if (tab === 'forum') {
    sidebar.style.display = 'none';
    // Sidebar gizli = kulübeyi gizle
    if (window._natureBotInstance) {
      window._natureBotInstance.hideKennel();
      window._natureBotInstance.hideZzz();
    }
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadForum();
  } else if (tab === 'friends') {
    sidebar.style.display = 'none';
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadFriendsPanel();
  } else if (tab === 'profile') {
    sidebar.style.display = 'none';
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadProfile();
  } else if (tab === 'admin') {
    sidebar.style.display = 'none';
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadAdmin();
  } else if (tab === 'games') {
    sidebar.style.display = 'none';
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadGames();
  } else if (tab === 'watch') {
    sidebar.style.display = 'none';
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadWatch();
  } else if (tab === 'liveroom') {
    sidebar.style.display = 'none';
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadLiveRoom();
  } else if (tab === 'leaderboard') {
    sidebar.style.display = 'none';
    if (window._natureBotInstance) { window._natureBotInstance.hideKennel(); window._natureBotInstance.hideZzz(); }
    document.getElementById('deskEmptyState').style.display = 'none';
    document.getElementById('deskPanelContent').style.display = 'flex';
    document.getElementById('deskPanelContent').style.flexDirection = 'column';
    deskLoadLeaderboard();
  } else if (tab === 'botHome') {
    sidebar.style.display = 'flex';
    const _bhBot = window._natureBotInstance;
    sideTitle.textContent = '🌿 Robot Evi';
    if (_bhBot) {
      if (_bhBot.isSleeping) {
        sideSub.textContent = 'NatureBot uyandırılıyor...';
        _bhBot.wakeUp();
      } else {
        sideSub.textContent = 'NatureBot yuvaya gönderildi 😴';
        _bhBot.goToKennel();
      }
    } else {
      sideSub.textContent = "NatureBot'un yaşam alanı";
    }
    const sideList = document.getElementById('deskSidebarList');
    if (sideList) sideList.innerHTML = '<div style="padding:20px 16px;color:var(--muted);font-size:.8rem;text-align:center;line-height:1.6;">🌿 Kulübeye tıklayarak<br>robotu uyandırabilirsin!</div>';
  }
  setTimeout(()=>applyTabIcons(true), 0);
}

function deskLoadRoomList(q) {
  if (!_db) return;
  dbRef('rooms').once('value').then(snap => {
    const rooms = snap.val() || {};
    const all = Object.values(rooms);
    loadRoomOrder();
    const ch = deskApplyOrder(all.filter(r => r.type === 'channel'));
    const grMember = deskApplyOrder(all.filter(r => r.type === 'group' && (r.members || []).includes(_cu)));
    const grHidden = _isAdmin ? deskApplyOrder(all.filter(r => r.type === 'group' && !(r.members || []).includes(_cu))) : [];
    const dm = deskApplyOrder(all.filter(r => r.type === 'dm' && (r.members || []).includes(_cu) && !((r.hiddenBy||[]).includes(_cu))));

    const filter = q ? q.toLowerCase() : '';
    const matchF = name => !filter || (name || '').toLowerCase().includes(filter);

    let h = '';

    if (!filter) {
      // NatureBot özel satır
      h += `<div class="dsk-sec-hdr"><span class="chev">▸</span>NatureBot</div>`;
      h += `<div class="dsk-row" onclick="if(window._natureBotInstance){window._natureBotInstance.el.click();}else{startNatureBot&&startNatureBot();}" style="position:relative;">
        <div class="dsk-row-ic" style="display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.9)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><rect x="7" y="4" width="10" height="7" rx="2"/><circle cx="9" cy="15" r="1.5" fill="rgba(16,185,129,0.9)" stroke="none"/><circle cx="15" cy="15" r="1.5" fill="rgba(16,185,129,0.9)" stroke="none"/><path d="M9.5 8H7m3.5 0h3m3.5 0H14"/></svg></div>
        <div class="dsk-row-name" style="color:var(--accent);">NatureBot</div>
        <div style="font-size:.65rem;color:rgba(16,185,129,.55);font-weight:700;margin-left:auto;padding-right:4px;letter-spacing:.05em;">AI</div>
      </div>`;

      // Channels
      if (ch.length) {
        h += `<div class="dsk-sec-hdr"><span class="chev">▸</span>Kanallar<span class="sec-add-btn" onclick="event.stopPropagation();if(_isAdmin)adminTab('rooms')" title="Kanal oluştur (Admin)">＋</span></div>`;
        ch.filter(r => matchF(r.name)).forEach(r => { h += deskRoomRow(r, false, false); });
      }

      // My groups
      const myGr = grMember.filter(r => matchF(r.name));
      const hiddenGr = grHidden.filter(r => matchF(r.name));
      if (myGr.length || hiddenGr.length || _isAdmin) {
        h += '<div class="dsk-sec-hdr"><span class="chev">▸</span>Gruplar<span class="sec-add-btn" onclick="event.stopPropagation();openCreateGroupModal()" title="Grup oluştur">＋</span></div>';
        myGr.forEach(r => { h += deskRoomRow(r, true, false); });
        hiddenGr.forEach(r => { h += deskRoomRow(r, false, true); });
      }

      // DMs
      h += '<div class="dsk-sec-hdr"><span class="chev">▸</span>Direkt Mesajlar<span class="sec-add-btn" onclick="event.stopPropagation();openDMModal()" title="Yeni DM">＋</span></div>';
      if (dm.length) {
        dm.forEach(r => { h += deskDmRow(r); });
      } else {
        h += '<div style="padding:4px 14px;font-size:.78rem;color:var(--muted)">＋ ile yeni mesaj başlat</div>';
      }
    } else {
      // Search results
      const allMatch = all.filter(r => r.type !== 'dm' && matchF(r.name));
      const dmMatch = dm.filter(r => {
        const other = (r.members || []).find(m => m !== _cu) || '';
        return matchF(other);
      });
      allMatch.forEach(r => { h += deskRoomRow(r, (r.members || []).includes(_cu), _isAdmin && !(r.members || []).includes(_cu)); });
      dmMatch.forEach(r => { h += deskDmRow(r); });
      if (!allMatch.length && !dmMatch.length) h = '<div style="padding:16px;color:var(--muted);font-size:.82rem;text-align:center">Sonuç bulunamadı</div>';
    }

    document.getElementById('deskSideList').innerHTML = h || '<div style="padding:16px;color:var(--muted);font-size:.82rem">Henüz oda yok.</div>';
    setTimeout(initDeskDnd, 50);
  });
}

function deskRoomRow(r, isMyGroup, isHiddenAdmin) {
  const unread = _unread[r.id] || 0;
  const icon = r.type === 'group' ? '👥' : '#';
  const isActive = _deskRoom === r.id;
  const last = _lastMsg[r.id] || {};
  const prevText = last.text ? (last.text.length > 42 ? last.text.slice(0,42)+'…' : last.text) : (last.file ? '📎 Dosya' : '');
  const prevUser = last.user || '';
  const onlineCount = r.type==='group'
    ? (r.members||[]).filter(m=>!!_online[m]).length
    : Object.keys(_online||{}).length;
  const popup = `<div class="room-preview-popup">
    <div class="rpp-name">${icon} ${esc(r.name||r.id)}</div>
    ${prevText ? `<div class="rpp-msg">${prevUser?`<b style="color:var(--text-hi)">${esc(prevUser)}:</b> `:''} ${esc(prevText)}</div>` : ''}
    <div class="rpp-meta"><div class="rpp-dot"></div><span>${onlineCount} çevrimiçi</span></div>
  </div>`;
  return '<div class="dsk-row' + (isActive ? ' act' : '') + '" data-id="' + r.id + '" style="position:relative" onclick="deskOpenRoom(this.dataset.id)">' +
    '<div class="dsk-drag-handle" onclick="event.stopPropagation()">⠿</div>' +
    '<div class="dsk-row-ic">' + icon + '</div>' +
    '<div class="dsk-row-name">' + esc(r.name || r.id) + '</div>' +
    (isHiddenAdmin ? '<span class="dsk-spy-tag">👁</span>' : '') +
    (unread ? '<div class="dsk-row-badge">' + unread + '</div>' : '') +
    popup +
    '</div>';
}

function deskDmRow(r) {
  const other = (r.members || []).find(m => m !== _cu) || '?';
  const on = !!_online[other];
  const unread = _unread[r.id] || 0;
  const isActive = _deskRoom === r.id;
  return '<div class="dsk-row dsk-dm-row' + (isActive ? ' act' : '') + '" data-id="' + r.id + '" onclick="deskOpenRoom(this.dataset.id)">' +
    '<div class="dsk-row-av" style="background:' + strColor(other) + '">' + initials(other) +
    '<div class="r-dot ' + (on ? 'on' : 'off') + '"></div></div>' +
    '<div class="dsk-row-name">' + esc(other) + '</div>' +
    (unread ? '<div class="dsk-row-badge">' + unread + '</div>' : '') +
    `<div class="dsk-dm-close" onclick="event.stopPropagation();closeDmConversation('${r.id}')" title="Kapat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>` +
    '</div>';
}

function deskSearch(q) {
  if (_deskNav === 'home') deskLoadRoomList(q);
  else if (_deskNav === 'friends') deskLoadFriendsList(q);
}

function deskOpenRoom(roomId) {
  if (_deskStopMsg) { _deskStopMsg(); _deskStopMsg = null; }
  _deskRoom = roomId;
  clearUnreadBadge(roomId);
  _currentMsgBox = 'deskMsgs';
  markRoomRead(roomId);
  listenReads(roomId);

  // Highlight active row
  document.querySelectorAll('.dsk-row').forEach(r => r.classList.remove('act'));
  const activeRows = document.querySelectorAll('[onclick*="' + roomId + '"]');
  activeRows.forEach(r => r.classList.add('act'));

  // Show chat area
  document.getElementById('deskEmptyState').style.display = 'none';
  document.getElementById('deskPanelContent').style.display = 'none';
  const ca = document.getElementById('deskChatArea');
  ca.style.display = 'flex';
  ca.style.flexDirection = 'column';
  ca.style.flex = '1';
  ca.style.overflow = 'hidden';

  // Also sync mobile _cRoom for sending
  _cRoom = roomId;
  listenPinBar(roomId);

  const msgs = document.getElementById('deskMsgs');
  msgs.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';

  // ── Mesajları HEMEN dinlemeye başla — oda verisini bekleme ──
  const ref = dbRef('msgs/' + roomId);
  const h = snap2 => { if (_deskRoom !== roomId) return; deskRenderMsgs(snap2.val()); };
  ref.on('value', h);
  let _deskNotifFirst = true;
  const notifRef = dbRef('msgs/' + roomId);
  const notifH = snap2 => {
    if(_deskNotifFirst){ _deskNotifFirst=false; return; }
    const msg = snap2.val();
    if(msg) checkAndNotify(roomId, msg);
  };
  notifRef.on('child_added', notifH);
  _deskStopMsg = () => { ref.off('value', h); notifRef.off('child_added', notifH); };

  // ── Oda verisi paralel yükle (header/ayarlar için) ──
  dbRef('rooms/' + roomId).once('value').then(snap => {
    const room = snap.val();
    if (!room || _deskRoom !== roomId) return;
    const isHiddenAdmin = _isAdmin && room.type === 'group' && !(room.members || []).includes(_cu);

    // Update header
    const ic = document.getElementById('deskChatHdrIcon');
    if (room.type === 'dm') {
      const other = (room.members || []).find(m => m !== _cu) || '?';
      ic.textContent = initials(other); ic.style.background = strColor(other);
      document.getElementById('deskChatHdrName').textContent = other;
      document.getElementById('deskChatHdrSub').textContent = _online[other] ? '🟢 Çevrimiçi' : 'Çevrimdışı';
      document.getElementById('deskCallAudio').style.display = 'flex';
      document.getElementById('deskCallVideo').style.display = 'flex';
      document.getElementById('deskCallScreen').style.display = (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) ? 'flex' : 'none';
      document.getElementById('deskToggleMembers').style.display = 'none';
    } else {
      ic.textContent = room.type === 'group' ? '👥' : '#';
      ic.style.background = room.type === 'group' ? 'linear-gradient(135deg,#9b72ff,#c4a7ff)' : 'var(--surface2)';
      document.getElementById('deskChatHdrName').textContent = room.name || roomId;
      document.getElementById('deskChatHdrSub').textContent = room.type === 'group' ? (room.members || []).length + ' üye' : 'Kanal';
      document.getElementById('deskCallAudio').style.display = 'none';
      document.getElementById('deskCallVideo').style.display = 'none';
      document.getElementById('deskCallScreen').style.display = 'none';
      document.getElementById('deskToggleMembers').style.display = room.type === 'group' ? 'flex' : 'none';
      const mgBtn = document.getElementById('deskManageGroup');
      if(mgBtn) mgBtn.style.display = room.type === 'group' ? 'flex' : 'none';
    }

    // Spy banner
    const spyBanner = document.getElementById('deskSpyBanner');
    const mobileSpyBanner = document.getElementById('adminSpyBanner');
    const spyContent = `<span style="font-size:.82rem;color:#f5a623;font-weight:700;">\u{1F441} G\u00f6zetleme Modu</span><button onclick="adminJoinGroup()" style="margin-left:auto;background:rgba(245,166,35,.2);border:1px solid rgba(245,166,35,.4);color:#f5a623;border-radius:6px;padding:4px 14px;font-size:.78rem;font-weight:700;cursor:pointer;">Gruba Kat\u0131l</button>`;
    if (isHiddenAdmin) {
      spyBanner.innerHTML = spyContent;
      spyBanner.style.display = 'flex';
      if (mobileSpyBanner) { mobileSpyBanner.innerHTML = spyContent; }
      document.getElementById('deskInputArea').style.display = 'none';
    } else {
      spyBanner.style.display = 'none';
      document.getElementById('deskInputArea').style.display = 'block';
      const inp = document.getElementById('deskInp');
      if (inp) inp.placeholder = (room.locked && !_isAdmin) ? '🔒 Bu oda kilitli' : 'Mesaj yaz...';
    }

    // Load members panel
    if (room.type === 'group' && _deskMembersOpen) {
      deskLoadMembers(room);
    } else {
      document.getElementById('deskMemberPanel').classList.add('hidden');
    }

    // Update placeholder for locked/muted rooms
    if (room.locked && !_isAdmin) {
      document.getElementById('deskInp').disabled = true;
      document.getElementById('deskSendBtn').disabled = true;
      document.getElementById('deskInp').placeholder = '🔒 Bu oda kilitli';
    } else if (room.muted && !_isAdmin) {
      document.getElementById('deskInp').disabled = true;
      document.getElementById('deskSendBtn').disabled = true;
      document.getElementById('deskInp').placeholder = '🔇 Bu grup susturulmuş';
    } else {
      document.getElementById('deskInp').disabled = false;
      document.getElementById('deskSendBtn').disabled = false;
      document.getElementById('deskInp').placeholder = 'Mesaj yaz...';
    }
  });
}

function deskRenderMsgs(msgsObj) {
  const box = document.getElementById('deskMsgs');
  if (!box) return;
  const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
  const msgs = msgsObj ? Object.entries(msgsObj).map(([k,v]) => ({...v, _key: k})).sort((a,b) => a.ts - b.ts) : [];
  if (!msgs.length) {
    box.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:.85rem">Henüz mesaj yok. İlk mesajı gönder!</div>';
    return;
  }
  let h = '', lastDate = '', lastUser = '', lastTs = 0;
  msgs.forEach(m => {
    try {
      if (m.sys) { h += '<div class="msg-sys">' + esc(m.text) + '</div>'; lastUser = ''; return; }
      const own = m.user === _cu;
      const d = new Date(m.ts || 0);
      const ds = formatDate(d);
      if (ds !== lastDate) { h += '<div style="text-align:center;margin:12px 0 8px;"><span style="background:var(--surface2);color:var(--muted);font-size:.72rem;border-radius:100px;padding:2px 12px;font-weight:700;">' + ds + '</span></div>'; lastDate = ds; lastUser = ''; }
      const gap = (m.ts - lastTs) > 300000;
      const first = m.user !== lastUser || gap;
      lastUser = m.user; lastTs = m.ts;
      let content = '';
      if (m.file) {
        if (m.file.type && m.file.type.startsWith('image/')) content = m.file.isEmoji ? '<img src="' + m.file.data + '" style="width:48px;height:48px;border-radius:6px;vertical-align:middle;">' : '<img class="msg-img" src="' + m.file.data + '" onclick="zoomImg(this.src)" loading="lazy" style="max-width:300px;border-radius:8px;margin-top:4px;display:block;">';
        else if (m.file.type && m.file.type.startsWith('video/')) content = '<video controls style="max-width:300px;border-radius:8px;margin-top:4px"><source src="' + m.file.data + '" type="' + m.file.type + '"></video>';
        else content = '<div class="msg-file-card" onclick="downloadDataUrl(\'' + m.file.data + '\',\'' + esc(m.file.name||'dosya') + '\')"><div class="msg-file-icon">📄</div><div class="msg-file-info"><div class="msg-file-name">' + esc(m.file.name) + '</div><div class="msg-file-size">' + fmtSize(m.file.size) + '</div></div><div style="margin-left:auto;font-size:1rem;color:var(--muted);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m-7-7 7 7 7-7"/></svg></div></div>';
      } else {
        const safeText = linkify(esc(m.text || ''));
        content = own ? '<div class="ob">' + safeText + '</div>' : '<div class="mb-text">' + safeText + '</div>';
      }
      const meta = first ? '<div class="mb-meta"><div class="mb-name" style="color:' + strColor(m.user) + '">' + esc(own ? _cu : m.user) + '</div><div class="mb-ts">' + fmtTime(m.ts) + (own ? getMsgStatusSvg('sent') : '') + '</div></div>' :
        (own ? '<div class="mb-meta mb-meta-mini"><div class="mb-ts">' + fmtTime(m.ts) + getMsgStatusSvg('sent') + '</div></div>' : '');
      const reactionsHtml = buildReactionsHtml(_deskRoom, m._key, m.reactions);
       const avMenuBtnDesk = '<button class="mb-av-menu-btn" data-room="' + _deskRoom + '" data-key="' + m._key + '" data-own="' + own + '" data-admin="' + _isAdmin + '" data-text="' + esc(m.text||'').replace(/"/g,'&quot;') + '" onclick="showMsgMenuAtBtn(event)"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button>';




       h += '<div class="mb ' + (own ? 'own' : '') + ' ' + (first ? 'first' : '') + '" data-key="' + m._key + '"' + (own ? ' data-ts="' + m.ts + '"' : '') + '>' +
         '<div class="av ' + (first ? '' : 'ghost') + '" style="background:' + strColor(m.user) + '">' + initials(m.user) + '</div>' +
         (own ? avMenuBtnDesk : '') +
         (own
           ? '<div class="mb-body">' + meta + content + reactionsHtml + '</div>'
           : '<div style="display:flex;align-items:center;gap:4px;min-width:0;"><div class="mb-body">' + meta + content + reactionsHtml + '</div>' + avMenuBtnDesk + '</div>'
         ) +
         (own ? '' : '') +
         '</div>';
    } catch(e) {}
  });
  const prevKeys = new Set(Array.from(box.querySelectorAll('.mb[data-key]')).map(el=>el.dataset.key));
  box.innerHTML = h;
  if (wasAtBottom) box.scrollTop = box.scrollHeight;
  // Sadece YENİ gelen mesajlara pop animasyonu
  box.querySelectorAll('.mb[data-key]').forEach(el=>{
    if(!prevKeys.has(el.dataset.key)){
      el.classList.add('pop-in');
      setTimeout(()=>el.classList.remove('pop-in'), 400);
    }
  });
  // Hover tooltip ekle
  if (typeof window._addTimestampTooltips === 'function') {
    // tüm mesajlara ts ekle
    msgs.forEach(m => {
      const el = box.querySelector('.mb[data-key="' + m._key + '"]');
      if (el && !el.dataset.ts) el.dataset.ts = m.ts;
    });
    window._addTimestampTooltips();
  }
  if(_deskRoom){markRoomRead(_deskRoom);updateMsgStatuses(_deskRoom);}
}
function deskLoadMembers(room) {
  const panel = document.getElementById('deskMemberPanel');
  const list = document.getElementById('deskMemberList');
  panel.classList.remove('hidden');
  const members = room.members || [];
  const online = members.filter(u => _online[u]);
  const offline = members.filter(u => !_online[u]);
  let h = '';
  if (online.length) {
    h += '<div style="font-size:.65rem;font-weight:900;color:var(--muted);padding:6px 8px 2px;text-transform:uppercase;letter-spacing:.06em;">Çevrimiçi — ' + online.length + '</div>';
    online.forEach(u => { h += deskMemberRow(u, true); });
  }
  if (offline.length) {
    h += '<div style="font-size:.65rem;font-weight:900;color:var(--muted);padding:10px 8px 2px;text-transform:uppercase;letter-spacing:.06em;">Çevrimdışı — ' + offline.length + '</div>';
    offline.forEach(u => { h += deskMemberRow(u, false); });
  }
  list.innerHTML = h;
}

function deskMemberRow(u, online) {
  const isSelf = u === _cu;
  return '<div class="desk-member-row" onclick="viewUserProfile(\''+u+'\')" title="Profili görüntüle">' +
    '<div class="desk-m-av" style="background:' + strColor(u) + '">' + initials(u) +
    '<div class="r-dot ' + (online ? 'on' : 'off') + '"></div></div>' +
    '<div class="desk-m-name">' + esc(u) + (isSelf ? ' <span style="font-size:.65rem;color:var(--muted);">(Sen)</span>' : '') + '</div>' +
    (online ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0;"></div>' : '') +
    (!isSelf ? '<div onclick="event.stopPropagation();startDMWithUser(\''+u+'\')" title="Mesaj gönder" style="cursor:pointer;color:var(--muted);padding:3px;border-radius:5px;transition:color .1s;" onmouseover="this.style.color=\'var(--text-hi)\'" onmouseout="this.style.color=\'var(--muted)\'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' : '') +
    '</div>';
}

function toggleDeskMembers() {
  _deskMembersOpen = !_deskMembersOpen;
  const panel = document.getElementById('deskMemberPanel');
  panel.classList.toggle('hidden', !_deskMembersOpen);
}

function deskLoadFriendsList(q) {
  const list = document.getElementById('deskSideList');
  list.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  dbRef('users').once('value').then(snap => {
    const users = snap.val() || {};
    const filter = (q || '').toLowerCase();
    const all = Object.keys(users).filter(u => {
      if(u === _cu) return false;
      if(users[u].banned) return false;
      if(filter && !u.toLowerCase().includes(filter)) return false;
      return true;
    });
    if (!all.length) { list.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:.82rem">Kullanıcı bulunamadı</div>'; return; }
    const onlineUsers = all.filter(u => _online[u]);
    const offlineUsers = all.filter(u => !_online[u]);
    let h = '';
    if (onlineUsers.length) {
      h += '<div class="dsk-sec-hdr"><span class="chev">▸</span>Çevrimiçi — ' + onlineUsers.length + '</div>';
      onlineUsers.forEach(u => { h += deskUserRow(u, users[u], true); });
    }
    if (offlineUsers.length) {
      h += '<div class="dsk-sec-hdr"><span class="chev">▸</span>Çevrimdışı</div>';
      offlineUsers.forEach(u => { h += deskUserRow(u, users[u], false); });
    }
    list.innerHTML = h;
  });
}

function deskUserRow(u, data, online) {
  return '<div class="dsk-row" data-u="' + u + '" onclick="startDMWithUser(this.dataset.u)">' +
    '<div class="dsk-row-av" style="background:' + strColor(u) + '">' + initials(u) +
    '<div class="r-dot ' + (online ? 'on' : 'off') + '"></div></div>' +
    '<div class="dsk-row-name">' + esc(u) + (data.origin ? ' <span style="font-size:.65rem;color:var(--muted);">' + data.origin.split(' ')[0] + '</span>' : '') + '</div>' +
    '</div>';
}

function startDMWithUser(username) {
  if (!_db || !_cu) return;
  const possible = [_cu + '_dm_' + username, username + '_dm_' + _cu];
  dbRef('rooms').once('value').then(snap => {
    const rooms = snap.val() || {};
    const existing = Object.values(rooms).find(r => r.type === 'dm' && r.members && r.members.includes(_cu) && r.members.includes(username));
    if (existing) {
      // Unhide if previously hidden
      if(existing.hiddenBy && existing.hiddenBy.includes(_cu)){
        const updated = existing.hiddenBy.filter(u=>u!==_cu);
        dbRef('rooms/'+existing.id+'/hiddenBy').set(updated.length?updated:null);
      }
      deskNav('home'); setTimeout(() => deskOpenRoom(existing.id), 200); return;
    }
    const id = [_cu, username].sort().join('_dm_');
    dbRef('rooms/' + id).set({ id, type: 'dm', members: [_cu, username], ts: Date.now() }).then(() => {
      deskNav('home');
      setTimeout(() => deskOpenRoom(id), 300);
    });
  });
}

let _deskForumCat = 'hepsi';
let _deskForumStop = null;

function deskLoadForum(cat) {
  if (cat !== undefined) _deskForumCat = cat;
  const panel = document.getElementById('deskPanelContent');
  panel.style.overflowY = 'hidden';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';

  const CAT_LABELS2 = {genel:'💬 Genel',tarih:'📜 Tarih',kultur:'🎭 Kültür',spor:'⚽ Spor',muzik:'🎵 Müzik',teknoloji:'💻 Teknoloji',soru:'❓ Soru'};
  function ftab(key,label){ return `<div class="dsk-ftab${_deskForumCat===key?' act':''}" onclick="deskLoadForum('${key}')">${label}</div>`; }

  panel.innerHTML =
    '<div class="dsk-forum-wrap" id="deskForumWrap">'+
      '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'+
        '<div class="dsk-forum-topbar">'+
          ftab('hepsi','Tümü')+ftab('genel','💬 Genel')+ftab('tarih','📜 Tarih')+
          ftab('kultur','🎭 Kültür')+ftab('spor','⚽ Spor')+ftab('muzik','🎵 Müzik')+
          ftab('teknoloji','💻 Teknoloji')+ftab('soru','❓ Soru')+
        '</div>'+
        '<div class="dsk-compose">'+
          '<div style="display:flex;gap:12px;align-items:flex-start;">'+
            '<div style="width:38px;height:38px;border-radius:10px;background:'+strColor(_cu)+';display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;color:#fff;flex-shrink:0;">'+initials(_cu)+'</div>'+
            '<div style="flex:1;">'+
              '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:border-color .15s;" onfocusin="this.style.borderColor=\'var(--accent)\'" onfocusout="this.style.borderColor=\'var(--border)\'">'+
                '<div style="display:flex;flex-wrap:wrap;gap:1px;padding:5px 8px;border-bottom:1px solid var(--border);background:var(--surface2);align-items:center;">'+
                  '<button onclick="dbbWrap(\'b\')" title="Kalın" class="fmt-btn"><b>B</b></button>'+
                  '<button onclick="dbbWrap(\'i\')" title="İtalik" class="fmt-btn"><i>I</i></button>'+
                  '<button onclick="dbbWrap(\'u\')" title="Altı Çizili" class="fmt-btn"><u>U</u></button>'+
                  '<button onclick="dbbWrap(\'s\')" title="Üstü Çizili" class="fmt-btn"><s>S</s></button>'+
                  '<span style="width:1px;height:16px;background:var(--border);margin:0 3px;flex-shrink:0;"></span>'+
                  '<button onclick="dbbColor()" title="Renk" class="fmt-btn">🎨</button>'+
                  '<button onclick="dbbSize()" title="Boyut" class="fmt-btn" style="font-size:.78rem;font-weight:700;">Aa</button>'+
                  '<span style="width:1px;height:16px;background:var(--border);margin:0 3px;flex-shrink:0;"></span>'+
                  '<button onclick="dbbWrap(\'url\')" title="Link" class="fmt-btn">🔗</button>'+
                  '<button onclick="dbbWrap(\'img\')" title="Resim" class="fmt-btn">🖼️</button>'+
                  '<span style="width:1px;height:16px;background:var(--border);margin:0 3px;flex-shrink:0;"></span>'+
                  '<button onclick="dbbInsert(\'[list]\\n[*] \')" title="Liste" class="fmt-btn">• ≡</button>'+
                  '<button onclick="dbbWrap(\'quote\')" title="Alıntı" class="fmt-btn">❝</button>'+
                  '<button onclick="dbbWrap(\'code\')" title="Kod" class="fmt-btn" style="font-family:monospace;font-size:.8rem;">&lt;/&gt;</button>'+
                  '<button onclick="dbbWrap(\'spoiler\')" title="Spoiler" class="fmt-btn">👁️</button>'+
                  '<span style="width:1px;height:16px;background:var(--border);margin:0 3px;flex-shrink:0;"></span>'+
                  '<button onclick="toggleDbbPreview()" id="dbbPreviewBtn" title="Önizleme" class="fmt-btn" style="font-size:.75rem;font-weight:700;">👁 Önizle</button>'+
                '</div>'+
                '<textarea class="dsk-compose-inp" id="deskForumInp" placeholder="Düşüncelerini paylaş..." rows="3" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,300)+\'px\'"></textarea>'+
                '<div id="dbbPreviewArea" style="display:none;padding:10px 13px;min-height:50px;border-top:1px solid var(--border);font-size:.9rem;line-height:1.6;color:var(--text-hi);background:var(--bg2);word-break:break-word;"></div>'+
              '</div>'+

              '<div class="dsk-compose-footer">'+
                '<select class="dsk-cat-sel" id="deskForumCatSel">'+
                  '<option value="genel">💬 Genel</option><option value="tarih">📜 Tarih</option>'+
                  '<option value="kultur">🎭 Kültür</option><option value="spor">⚽ Spor</option>'+
                  '<option value="muzik">🎵 Müzik</option><option value="teknoloji">💻 Teknoloji</option>'+
                  '<option value="soru">❓ Soru</option>'+
                '</select>'+
                '<button class="dsk-forum-post-btn" onclick="deskSubmitForumPost()">Paylaş →</button>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="dsk-forum-feed" id="deskForumFeed"></div>'+
      '</div>';

  deskForumLoadFeed();
}

function deskForumLoadFeed() {
  if (_deskForumStop) { _deskForumStop(); _deskForumStop = null; }
  const feed = document.getElementById('deskForumFeed');
  if (!feed) return;
  const CAT_LABELS2 = {genel:'💬 Genel',tarih:'📜 Tarih',kultur:'🎭 Kültür',spor:'⚽ Spor',muzik:'🎵 Müzik',teknoloji:'💻 Teknoloji',soru:'❓ Soru'};
  let ref = dbRef('forum/posts').orderByChild('ts').limitToLast(80);
  const handler = ref.on('value', snap => {
    const feed2 = document.getElementById('deskForumFeed');
    if (!feed2) return;
    const posts = snap.val() || {};
    const arr = Object.entries(posts).map(([k,v])=>({...v,_key:k})).sort((a,b)=>b.ts-a.ts);
    const filtered = _deskForumCat==='hepsi' ? arr : arr.filter(p=>p.cat===_deskForumCat);
    feed2.innerHTML = filtered.length
      ? filtered.map(p=>deskForumEntryHTML(p)).join('')
      : '<div style="text-align:center;padding:60px 20px;color:var(--muted);"><div style="font-size:3rem;margin-bottom:12px;">📋</div><div style="font-size:1rem;font-weight:700;color:var(--text-hi);">Henüz entry yok</div><div style="margin-top:6px;font-size:.85rem;">İlk entry\'i sen yaz!</div></div>';
  });
  _deskForumStop = ()=>ref.off('value',handler);
}

function deskForumEntryHTML(p) {
  const CAT_LABELS2 = {genel:'💬 Genel',tarih:'📜 Tarih',kultur:'🎭 Kültür',spor:'⚽ Spor',muzik:'🎵 Müzik',teknoloji:'💻 Teknoloji',soru:'❓ Soru'};
  const lc=p.likes?Object.keys(p.likes).length:0, liked=!!(p.likes&&p.likes[_cu]);
  const dc=p.dislikes?Object.keys(p.dislikes).length:0, disliked=!!(p.dislikes&&p.dislikes[_cu]);
  const hc=p.hearts?Object.keys(p.hearts).length:0, hearted=!!(p.hearts&&p.hearts[_cu]);
  const comments=p.comments?Object.values(p.comments).sort((a,b)=>a.ts-b.ts):[];
  const time=new Date(p.ts||0).toLocaleString('tr-TR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const canDel=(p.user===_cu)||_isAdmin;

  let h = '<div class="dsk-entry" id="dskentry-'+p._key+'">';
  h += '<div class="dsk-entry-header">';
  h += '<div class="dsk-entry-av" style="background:'+strColor(p.user||'?')+'">'+initials(p.user||'?')+'</div>';
  h += '<div class="dsk-entry-meta">';
  h += '<div class="dsk-entry-author">'+esc(p.user||'?')+'<span class="dsk-entry-cat-badge">'+(CAT_LABELS2[p.cat]||p.cat||'')+'</span></div>';
  h += '<div class="dsk-entry-time">'+time+'</div></div>';
  h += canDel?`<button class="dsk-entry-del-btn" onclick="deskForumDeletePost('${p._key}')">🗑️</button>`:'';
  h += '</div>';
  h += '<div class="dsk-entry-body">'+(p.bbcode ? parseBBCode(p.text||'') : esc(p.text||''))+'</div>';
  h += '<div class="dsk-entry-footer">';
  h += `<button class="dsk-vote-btn${liked?' active-up':''}" onclick="forumVote('${p._key}','like')"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/></svg> ${lc}</button>`;
  h += `<button class="dsk-vote-btn${disliked?' active-down':''}" onclick="forumVote('${p._key}','dislike')"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/></svg> ${dc}</button>`;
  h += `<button class="dsk-vote-btn${hearted?' active-heart':''}" onclick="forumHeart('${p._key}')">❤️ ${hc}</button>`;
  h += `<button class="dsk-entry-reply-btn" onclick="deskToggleReply('${p._key}')"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${comments.length?comments.length+' yorum':'Yorum'}</button>`;
  h += '</div>';
  if(comments.length){
    h += '<div class="dsk-comments">';
    comments.forEach(c=>{
      const ct=new Date(c.ts||0).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
      const cDel=(c.user===_cu)||_isAdmin;
      h += '<div class="dsk-comment"><div class="dsk-comment-av" style="background:'+strColor(c.user||'?')+'">'+initials(c.user||'?')+'</div>';
      h += '<div class="dsk-comment-body"><span class="dsk-comment-author">'+esc(c.user||'?')+'</span><span class="dsk-comment-time">'+ct+'</span>';
      h += cDel?`<button onclick="deskForumDeleteComment('${p._key}','${c.key||''}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.7rem;margin-left:4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`:'';
      h += '<div class="dsk-comment-text">'+esc(c.text||'')+'</div></div></div>';
    });
    h += '</div>';
  }
  h += '<div class="dsk-reply-area" id="dsk-reply-'+p._key+'">';
  h += `<textarea class="dsk-reply-inp" id="dsk-reply-inp-${p._key}" placeholder="Yorumunu yaz..." rows="1" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();deskForumSendComment('${p._key}')}"></textarea>`;
  h += `<button class="dsk-reply-send" onclick="deskForumSendComment('${p._key}')">Gönder</button></div>`;
  h += '</div>';
  return h;
}

function deskToggleReply(k){
  const a=document.getElementById('dsk-reply-'+k);
  if(!a)return;
  a.classList.toggle('open');
  if(a.classList.contains('open')){const i=document.getElementById('dsk-reply-inp-'+k);if(i)i.focus();}
}
function deskForumSendComment(postKey){
  const inp=document.getElementById('dsk-reply-inp-'+postKey);
  if(!inp)return;
  const txt=inp.value.trim();if(!txt)return;
  const ck=dbRef('forum/posts/'+postKey+'/comments').push().key;
  dbRef('forum/posts/'+postKey+'/comments/'+ck).set({key:ck,user:_cu,text:txt,ts:Date.now()})
    .then(()=>{inp.value='';inp.style.height='auto';}).catch(()=>showToast('Hata.'));
}
function deskForumDeletePost(k){if(!confirm('Bu entry silinsin mi?'))return;dbRef('forum/posts/'+k).remove().catch(()=>showToast('Hata.'));}
function deskForumDeleteComment(pk,ck){dbRef('forum/posts/'+pk+'/comments/'+ck).remove().catch(()=>showToast('Hata.'));}
/* Desktop BBCode editör yardımcıları */
function dbbWrap(tag){
  const ta=document.getElementById('deskForumInp');
  if(!ta) return;
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e);
  let open=`[${tag}]`,close=`[/${tag}]`;
  if(tag==='url'){const href=prompt('Link URL:','https://');if(!href)return;open=`[url=${href}]`;close='[/url]';}
  ta.value=ta.value.slice(0,s)+open+sel+close+ta.value.slice(e);
  ta.selectionStart=s+open.length; ta.selectionEnd=s+open.length+sel.length;
  ta.focus(); ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,300)+'px';
  if(document.getElementById('dbbPreviewArea')?.style.display!=='none') updateDbbPreview();
}
function dbbInsert(text){
  const ta=document.getElementById('deskForumInp');
  if(!ta) return;
  const s=ta.selectionStart;
  ta.value=ta.value.slice(0,s)+text+ta.value.slice(s);
  ta.selectionStart=ta.selectionEnd=s+text.length;
  ta.focus(); ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,300)+'px';
}
function dbbColor(){
  const c=prompt('Renk (örn: red, #ff0000):','red'); if(!c) return;
  const ta=document.getElementById('deskForumInp');
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||'metin';
  const tag=`[color=${c}]${sel}[/color]`;
  ta.value=ta.value.slice(0,s)+tag+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+tag.length; ta.focus();
}
function dbbSize(){
  const sz=prompt('Yazı boyutu (8-32):','16'); if(!sz||isNaN(sz)) return;
  const ta=document.getElementById('deskForumInp');
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||'metin';
  const tag=`[size=${sz}]${sel}[/size]`;
  ta.value=ta.value.slice(0,s)+tag+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+tag.length; ta.focus();
}
function toggleDbbPreview(){
  const area=document.getElementById('dbbPreviewArea');
  const btn=document.getElementById('dbbPreviewBtn');
  const ta=document.getElementById('deskForumInp');
  if(!area) return;
  if(area.style.display==='none'){
    area.style.display='block';
    if(btn){btn.style.background='var(--accent2)';btn.style.color='var(--text-hi)';}
    updateDbbPreview();
    ta.addEventListener('input',updateDbbPreview);
  } else {
    area.style.display='none';
    if(btn){btn.style.background='';btn.style.color='';}
    ta.removeEventListener('input',updateDbbPreview);
  }
}
function updateDbbPreview(){
  const ta=document.getElementById('deskForumInp');
  const area=document.getElementById('dbbPreviewArea');
  if(!ta||!area) return;
  area.innerHTML=parseBBCode(ta.value)||'<span style="color:var(--muted);font-size:.82rem">Önizleme burada görünecek...</span>';
}

function deskSubmitForumPost(){
  const inp=document.getElementById('deskForumInp');
  const txt=inp?.value.trim();
  const cat=document.getElementById('deskForumCatSel')?.value||'genel';
  if(!txt){showToast('Bir şeyler yaz!');return;}
  const btn=document.querySelector('.dsk-forum-post-btn');
  if(btn){btn.disabled=true;btn.textContent='Paylaşılıyor...';}
  const key=dbRef('forum/posts').push().key;
  dbRef('forum/posts/'+key).set({key,user:_cu,text:txt,bbcode:true,cat,ts:Date.now(),likes:{},dislikes:{},hearts:{},comments:{}})
    .then(()=>{
      showToast('Entry paylaşıldı! ✅');
      if(inp){inp.value='';inp.style.height='auto';}
      if(btn){btn.disabled=false;btn.textContent='Paylaş →';}
    }).catch(()=>{showToast('Hata.');if(btn){btn.disabled=false;btn.textContent='Paylaş →';}});
}

function deskLoadProfile() {
  const panel = document.getElementById('deskPanelContent');
  panel.style.overflowY = 'auto';
  const isAdmin = _isAdmin;
  panel.innerHTML =
    '<div style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;height:100%;">' +
    // Tab bar
    '<div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0;padding:0 20px;margin-top:16px;">' +
    '<div id="dptab-profile" onclick="deskSwitchProfTab(\'profile\')" style="padding:10px 16px;font-size:.8rem;font-weight:700;color:#fff;border-bottom:2px solid var(--accent);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>Profil</div>' +
    '<div id="dptab-appearance" onclick="deskSwitchProfTab(\'appearance\')" style="padding:10px 16px;font-size:.8rem;font-weight:700;color:var(--muted);border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>Görünüm</div>' +
    '<div id="dptab-sounds" onclick="deskSwitchProfTab(\'sounds\')" style="padding:10px 16px;font-size:.8rem;font-weight:700;color:var(--muted);border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>Sesler</div>' +
    '<div id="dptab-account" onclick="deskSwitchProfTab(\'account\')" style="padding:10px 16px;font-size:.8rem;font-weight:700;color:var(--muted);border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Hesap</div>' +
    '</div>' +
    // Tab: Profil
    '<div id="dppanel-profile" style="padding:0;overflow-y:auto;">' +
    // Banner
    '<div id="deskProfBanner" style="height:80px;background:linear-gradient(135deg,' + strColor(_cu) + 'aa 0%,var(--bg2) 100%);border-radius:0;flex-shrink:0;"></div>' +
    '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:0 20px 20px;margin-top:-40px;">' +
    // Avatar
    '<div style="position:relative;cursor:pointer;" onclick="triggerPhotoUpload()" title="Fotoğraf değiştir">' +
    '<div id="deskProfAvBig" style="width:80px;height:80px;border-radius:20px;background:' + strColor(_cu) + ';display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;color:#fff;background-size:cover;background-position:center;border:3px solid var(--bg2);">' + initials(_cu) + '</div>' +
    '<div style="position:absolute;bottom:-4px;right:-4px;width:24px;height:24px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg2);">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
              '</div>' +
    // Online dot
    '<div style="position:absolute;bottom:2px;left:-4px;width:12px;height:12px;background:#4ade80;border-radius:50%;border:2px solid var(--bg2);"></div>' +
    '</div>' +
    // İsim + badge
    '<div style="font-size:1.1rem;font-weight:900;color:var(--text-hi);margin-top:4px;">' + esc(_cu) + (isAdmin ? ' <span style="background:var(--yellow);color:#000;font-size:.6rem;border-radius:4px;padding:2px 6px;vertical-align:middle;">Admin</span>' : '') + '</div>' +
    // İstatistik satırı
    '<div style="display:flex;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-top:10px;overflow:hidden;">' +
    '<div style="flex:1;padding:12px 8px;text-align:center;border-right:1px solid var(--border);">' +
    '<span id="deskProfMsgCount" style="display:block;font-size:1rem;font-weight:900;color:var(--text-hi);">—</span>' +
    '<span style="display:block;font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">Mesaj</span></div>' +
    '<div style="flex:1;padding:12px 8px;text-align:center;border-right:1px solid var(--border);">' +
    '<span id="deskProfJoinDate" style="display:block;font-size:1rem;font-weight:900;color:var(--text-hi);">—</span>' +
    '<span style="display:block;font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">Katılım</span></div>' +
    '<div style="flex:1;padding:12px 8px;text-align:center;">' +
    '<span style="display:block;"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#4ade80"/></svg></span>' +
    '<span style="display:block;font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">Aktif</span></div>' +
    '</div>' +
    // Bio kartı
    '<div style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-top:10px;">' +
    '<div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-1px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Hakkımda</div>' +
    '<textarea id="deskProfBioInp" placeholder="Kendinizi kısaca tanıtın..." maxlength="160" rows="3" ' +
    'oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,120)+\'px\';var c=document.getElementById(\'deskBioCharCount\');if(c)c.textContent=(this.value||\'\')+.length+\'/160\';" ' +
    'style="width:100%;background:transparent;border:none;outline:none;color:var(--text-hi);font-size:.88rem;font-family:inherit;resize:none;line-height:1.5;"></textarea>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">' +
    '<span id="deskBioCharCount" style="font-size:.68rem;color:var(--muted);">0/160</span>' +
    '<button onclick="deskSaveBio()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:5px 14px;font-size:.78rem;font-weight:700;cursor:pointer;">Kaydet</button>' +
    '</div></div>' +
    '</div></div>' +
    // Tab: Görünüm
    '<div id="dppanel-appearance" style="padding:20px;display:none;">' +
    '<div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">✨ Arayüz Stili</div>' +
    '<div id="uiStyleGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-bottom:18px;"></div>' +
    '<div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">🎯 Navigasyon İkonları</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;">' +
    '<div><div style="font-size:.85rem;font-weight:700;color:var(--text-hi);">SVG İkon Seti</div><div style="font-size:.72rem;color:var(--muted);">Vektörel ikonlar aktif</div></div>' +
    '<span style="background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.2);font-size:.68rem;font-weight:700;border-radius:100px;padding:3px 10px;">✓ Aktif</span>' +
    '</div>' +
    '<div style="margin-top:18px;"><div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">🎨 Özel Tema Oluştur</div><div style="background:var(--surface);border-radius:12px;border:1px solid var(--border);padding:14px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;"><div><div style="font-size:.67rem;color:var(--muted);margin-bottom:4px;">Ana Renk</div><input type="color" id="ct-accent" value="#5b9bd5" style="width:100%;height:34px;border-radius:8px;border:1px solid var(--border);cursor:pointer;padding:2px;background:var(--surface2);"></div><div><div style="font-size:.67rem;color:var(--muted);margin-bottom:4px;">Arka Plan</div><input type="color" id="ct-bg" value="#141618" style="width:100%;height:34px;border-radius:8px;border:1px solid var(--border);cursor:pointer;padding:2px;background:var(--surface2);"></div><div><div style="font-size:.67rem;color:var(--muted);margin-bottom:4px;">Yüzey</div><input type="color" id="ct-surface" value="#252830" style="width:100%;height:34px;border-radius:8px;border:1px solid var(--border);cursor:pointer;padding:2px;background:var(--surface2);"></div><div><div style="font-size:.67rem;color:var(--muted);margin-bottom:4px;">Mesaj Rengi</div><input type="color" id="ct-own" value="#2a4a7a" style="width:100%;height:34px;border-radius:8px;border:1px solid var(--border);cursor:pointer;padding:2px;background:var(--surface2);"></div></div><div style="display:flex;gap:8px;"><button onclick="applyCustomTheme()" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px;font-size:.79rem;font-weight:700;cursor:pointer;">✓ Uygula</button><button onclick="resetCustomTheme()" style="flex:1;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:.79rem;font-weight:700;cursor:pointer;">↺ Sıfırla</button></div></div></div>' +
    '</div>' +
    // Tab: Sesler
    '<div id="dppanel-sounds" style="padding:20px;display:none;">' +
    '<div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">📞 Arama Zil Sesi</div>' +
    '<div id="ringToneGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>' +
    '<div style="font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:16px 0 10px;">🔔 Bildirim Sesi</div>' +
    '<div id="notifToneGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>' +
    '</div>' +
    // Tab: Hesap
    '<div id="dppanel-account" style="padding:20px;display:none;">' +
    '<div style="display:flex;flex-direction:column;gap:8px;">' +
    (isAdmin ? '<div onclick="deskNav(\'admin\')" style="background:var(--surface2);border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;" onmouseover="this.style.background=\'var(--surface)\'" onmouseout="this.style.background=\'var(--surface2)\'"><div style="font-size:1.2rem;">👑</div><div style="font-size:.9rem;font-weight:700;color:var(--text-hi);">Admin Paneli</div></div>' : '') +
    '<div onclick="openChangePassword()" style="background:var(--surface2);border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;" onmouseover="this.style.background=\'var(--surface)\'" onmouseout="this.style.background=\'var(--surface2)\'"><div style="font-size:1.2rem;">🔑</div><div style="font-size:.9rem;font-weight:700;color:var(--text-hi);">Şifre Değiştir</div></div>' +
    '<div onclick="openBotPersonality()" style="background:rgba(91,155,213,.08);border:1px solid rgba(91,155,213,.2);border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;"><div style="font-size:1.2rem;">🤖</div><div style="font-size:.9rem;font-weight:700;color:var(--text-hi);">Bot Kişiliği</div></div>' +
    '<div onclick="openTimeCapsule()" style="background:rgba(156,39,176,.08);border:1px solid rgba(156,39,176,.2);border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;"><div style="font-size:1.2rem;">🧬</div><div style="font-size:.9rem;font-weight:700;color:var(--text-hi);">Zaman Kapsülü</div></div>' +
    '<div onclick="deskDoLogout()" style="background:rgba(224,30,90,.1);border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;" onmouseover="this.style.background=\'rgba(224,30,90,.2)\'" onmouseout="this.style.background=\'rgba(224,30,90,.1)\'"><div style="font-size:1.2rem;">🚪</div><div style="font-size:.9rem;font-weight:700;color:#e01e5a;">Çıkış Yap</div></div>' +
    '</div></div>' +
    '</div>';
  const deskAv = document.getElementById('deskProfAvBig');
  if(deskAv) setAvatar(deskAv, _cu);
  setTimeout(()=>{ deskSwitchProfTab('profile'); deskLoadProfileData(); }, 50);
}

async function deskSaveBio(){
  if(!_cu||!_db) return;
  const inp = document.getElementById('deskProfBioInp');
  if(!inp) return;
  const bio = (inp.value||'').slice(0,160);
  await dbRef(wsPath('users/'+_cu+'/bio')).set(bio);
  showToast('✅ Bio kaydedildi');
}

async function deskLoadProfileData(){
  if(!_cu||!_db) return;
  // Bio yükle
  try {
    const bioSnap = await dbRef(wsPath('users/'+_cu+'/bio')).once('value');
    const bio = bioSnap.val()||'';
    const bioInp = document.getElementById('deskProfBioInp');
    if(bioInp){
      bioInp.value = bio;
      bioInp.style.height='auto';
      bioInp.style.height=Math.min(bioInp.scrollHeight,120)+'px';
      const c=document.getElementById('deskBioCharCount');
      if(c) c.textContent=bio.length+'/160';
    }
  } catch(e){}
  // Katılım tarihi + mesaj sayısı
  try {
    const userSnap = await dbRef('users/'+_cu).once('value');
    const u = userSnap.val()||{};
    const joinEl = document.getElementById('deskProfJoinDate');
    if(joinEl && u.joinedAt){
      const d = new Date(u.joinedAt);
      joinEl.textContent = (d.getMonth()+1)+'/'+d.getFullYear();
    }
    const msgEl = document.getElementById('deskProfMsgCount');
    if(msgEl){
      msgEl.textContent = u.msgCount > 999 ? Math.floor(u.msgCount/1000)+'K' : (u.msgCount||'0');
    }
  } catch(e){}
  // Banner rengini ayarla
  const banner = document.getElementById('deskProfBanner');
  if(banner) banner.style.background = 'linear-gradient(135deg,'+strColor(_cu)+'aa 0%,var(--bg2) 100%)';
  // Avatar
  const av = document.getElementById('deskProfAvBig');
  if(av) setAvatar(av, _cu);
}

function deskSwitchProfTab(tab){
  ['profile','appearance','sounds','account'].forEach(t=>{
    const btn=document.getElementById('dptab-'+t);
    const panel=document.getElementById('dppanel-'+t);
    if(btn){ btn.style.color=t===tab?'var(--text-hi)':'var(--muted)'; btn.style.borderBottom=t===tab?'2px solid var(--accent)':'2px solid transparent'; }
    if(panel) panel.style.display=t===tab?'block':'none';
  });
  if(tab==='profile') setTimeout(deskLoadProfileData, 80);
  if(tab==='appearance') { renderUiStyleGrid(); }
  if(tab==='sounds') renderToneGrids();
}

function deskLoadAdmin() {
  const panel = document.getElementById('deskPanelContent');
  const tabs = [
    { key: 'users',      label: '👥 Kullanıcı' },
    { key: 'rooms',      label: '📢 Oda' },
    { key: 'msgs',       label: '💬 Mesaj' },
    { key: 'forum',      label: '📋 Forum' },
    { key: 'announce',   label: '📣 Duyuru' },
    { key: 'games',      label: '🎮 Oyunlar' },
    { key: 'health',     label: '📊 Sistem Sağlığı' },
    { key: 'security',   label: '🛡️ Güvenlik' },
    { key: 'settings',   label: '⚙️ Ayarlar' },
    { key: 'naturebot',  label: '🤖 NatureBot' },
    { key: 'create_user', label: '➕ Üye Oluştur' },
    { key: 'invite',      label: '🔗 Davet Link' },
  ];
  const tabsHTML = tabs.map(t =>
    `<div class="dsk-atab" data-key="${t.key}" onclick="deskAdminTab('${t.key}')">${t.label}</div>`
  ).join('');

  panel.innerHTML =
    `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:8px;padding:16px 20px 0;flex-shrink:0;">
        <div style="font-size:1.3rem;">👑</div>
        <div style="font-size:1.05rem;font-weight:900;color:var(--text-hi);">Admin Paneli</div>
      </div>
      <div id="deskAdminTabs" style="display:flex;gap:4px;padding:12px 16px 0;flex-shrink:0;overflow-x:auto;border-bottom:1px solid var(--border);"></div>
      <div id="adminBody" style="flex:1;overflow-y:auto;padding:16px 20px;">
        <div class="ld"><span></span><span></span><span></span></div>
      </div>
    </div>`;

  // Render tabs
  const tabBar = document.getElementById('deskAdminTabs');
  tabs.forEach(t => {
    const el = document.createElement('div');
    el.textContent = t.label;
    el.dataset.key = t.key;
    el.style.cssText = 'padding:8px 14px;border-radius:8px 8px 0 0;cursor:pointer;font-size:.82rem;font-weight:700;color:var(--muted);white-space:nowrap;transition:background .1s,color .1s;';
    el.onclick = () => deskAdminTab(t.key);
    tabBar.appendChild(el);
  });

  deskAdminTab('users');
}

function deskAdminTab(tab) {
  _adminTab = tab;
  const tabBar = document.getElementById('deskAdminTabs');
  if (tabBar) {
    tabBar.querySelectorAll('div').forEach(el => {
      const isActive = el.dataset.key === tab;
      el.style.color = isActive ? 'var(--text-hi)' : 'var(--muted)';
      el.style.background = isActive ? 'var(--surface)' : 'transparent';
      el.style.borderBottom = isActive ? '2px solid var(--blue)' : '2px solid transparent';
    });
  }
  // Also sync mobile atabs if present
  document.querySelectorAll('.atab').forEach(el => {
    el.classList.toggle('act', el.getAttribute('onclick') === `adminTab('${tab}')`);
  });
  const body = document.getElementById('adminBody');
  if (!body) return;
  body.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  if (tab === 'users') loadAdminUsers();
  else if (tab === 'rooms') loadAdminRooms();
  else if (tab === 'msgs') loadAdminMsgs();
  else if (tab === 'forum') loadAdminForum();
  else if (tab === 'announce') loadAdminAnnounce();
  else if (tab === 'games') loadAdminGames();
  else if (tab === 'health') loadAdminSystemHealth();
  else if (tab === 'stats') loadAdminStats();
  else if (tab === 'security') loadAdminSecurity();
  else if (tab === 'settings') loadAdminSettings();
  else if (tab === 'naturebot') loadAdminNatureBot();
  else if (tab === 'design') loadAdminDesign();
  else if (tab === 'ipbans') loadAdminIPBans();
  else if (tab === 'reports') { if(typeof loadAdminReports==='function') loadAdminReports(); }
  else if (tab === 'growth') { if(typeof loadAdminGrowthChart==='function') loadAdminGrowthChart(); }
  else if (tab === 'create_user') { if(typeof window._renderCreateUser==='function'){ const b=document.getElementById('adminBody'); if(b) window._renderCreateUser(b); } }
  else if (tab === 'invite') { if(typeof window._renderInviteLinks==='function'){ const b=document.getElementById('adminBody'); if(b) window._renderInviteLinks(b); } }
}


let _deskFrTab = 'friends';

function deskLoadFriendsPanel() {
  const panel = document.getElementById('deskPanelContent');
  panel.style.overflowY = 'hidden';

  const reqCount = Object.keys(_friendReqs).length;
  const badge = reqCount > 0 ? `<span style="background:var(--red);color:#fff;border-radius:100px;padding:0 7px;font-size:.65rem;font-weight:900;margin-left:5px">${reqCount}</span>` : '';

  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div style="padding:16px 20px 0;flex-shrink:0;">
        <div style="font-size:1.05rem;font-weight:900;color:var(--text-hi);margin-bottom:12px;">👥 Arkadaşlar</div>
        <div id="deskFrTabs" style="display:flex;gap:4px;border-bottom:1px solid var(--border);padding-bottom:0;">
          <div class="dsk-fr-tab" data-tab="friends" onclick="deskFriendsTab('friends')">👤 Arkadaşlar</div>
          <div class="dsk-fr-tab" data-tab="requests" onclick="deskFriendsTab('requests')">📩 İstekler${badge}</div>
          <div class="dsk-fr-tab" data-tab="add" onclick="deskFriendsTab('add')">🔍 Kişi Ekle</div>
        </div>
      </div>
      <div id="deskFrContent" style="flex:1;overflow-y:auto;padding:14px 20px;">
        <div class="ld"><span></span><span></span><span></span></div>
      </div>
    </div>`;

  // Inject CSS if not already present
  if (!document.getElementById('deskFrCSS')) {
    const s = document.createElement('style');
    s.id = 'deskFrCSS';
    s.textContent = `
      .dsk-fr-tab{padding:8px 14px;border-radius:8px 8px 0 0;cursor:pointer;font-size:.82rem;font-weight:700;color:var(--muted);white-space:nowrap;transition:background .1s,color .1s;border-bottom:2px solid transparent;}
      .dsk-fr-tab.act{color:var(--text-hi);background:var(--surface);border-bottom:2px solid var(--blue);}
      .dsk-fr-tab:hover:not(.act){color:var(--text);background:var(--surface2);}
      .dsk-fr-row{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:8px;cursor:pointer;transition:background .1s;}
      .dsk-fr-row:hover{background:var(--surface2);}
      .dsk-fr-av{width:42px;height:42px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:900;color:#fff;flex-shrink:0;position:relative;}
      .dsk-fr-av .r-dot{position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;border-radius:50%;border:2px solid var(--bg2);}
      .dsk-fr-info{flex:1;min-width:0;}
      .dsk-fr-name{font-size:.92rem;font-weight:700;color:var(--text-hi);}
      .dsk-fr-status{font-size:.72rem;color:var(--muted);}
      .dsk-fr-actions{display:flex;gap:6px;flex-shrink:0;}
      .dsk-fr-btn{padding:5px 12px;border-radius:6px;border:none;font-size:.78rem;font-weight:700;cursor:pointer;}
      .dsk-fr-btn.msg{background:var(--blue);color:#fff;}
      .dsk-fr-btn.accept{background:#2ecc71;color:#fff;}
      .dsk-fr-btn.reject{background:rgba(224,85,85,.2);color:var(--red);border:1px solid rgba(224,85,85,.3);}
      .dsk-fr-btn.add{background:var(--surface2);color:var(--text);border:1px solid var(--border);}
      .dsk-fr-empty{padding:40px 20px;text-align:center;color:var(--muted);font-size:.9rem;}
      .dsk-fr-section{font-size:.72rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:8px 8px 4px;}
    `;
    document.head.appendChild(s);
  }

  deskFriendsTab(_deskFrTab);
}

function deskFriendsTab(tab) {
  _deskFrTab = tab;
  document.querySelectorAll('.dsk-fr-tab').forEach(el => {
    el.classList.toggle('act', el.dataset.tab === tab);
  });
  const box = document.getElementById('deskFrContent');
  if (!box) return;
  box.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';

  if (tab === 'friends') deskLoadFriendsList_panel(box);
  else if (tab === 'requests') deskLoadFriendRequests_panel(box);
  else if (tab === 'add') deskLoadAddFriend_panel(box);
}

function deskLoadFriendsList_panel(box) {
  Promise.all([
    dbRef('friends/' + _cu).once('value'),
    dbRef('users').once('value')
  ]).then(([frSnap, usersSnap]) => {
    const friends = Object.keys(frSnap.val() || {});
    const users = usersSnap.val() || {};
    if (!friends.length) { box.innerHTML = `<div class="dsk-fr-empty">📭 Henüz arkadaşın yok.<br><br><button class="dsk-fr-btn add" style="margin-top:8px" onclick="deskFriendsTab('add')">+ Kişi Ekle</button></div>`; return; }
    const online = friends.filter(u => _online[u]);
    const offline = friends.filter(u => !_online[u]);
    let h = '';
    if (online.length) {
      h += '<div class="dsk-fr-section">Çevrimiçi — ' + online.length + '</div>';
      online.forEach(u => { h += deskFrRow(u, true, 'friend'); });
    }
    if (offline.length) {
      h += '<div class="dsk-fr-section">Çevrimdışı — ' + offline.length + '</div>';
      offline.forEach(u => { h += deskFrRow(u, false, 'friend'); });
    }
    box.innerHTML = h;
  });
}

function deskLoadFriendRequests_panel(box) {
  Promise.all([
    dbRef('friendRequests/' + _cu).once('value'),
    dbRef('friendRequestsSent/' + _cu).once('value')
  ]).then(([inSnap, outSnap]) => {
    const incoming = Object.keys(inSnap.val() || {});
    const outgoing = Object.keys(outSnap.val() || {});
    if (!incoming.length && !outgoing.length) { box.innerHTML = '<div class="dsk-fr-empty">📭 Bekleyen istek yok.</div>'; return; }
    let h = '';
    if (incoming.length) {
      h += '<div class="dsk-fr-section">Gelen İstekler — ' + incoming.length + '</div>';
      incoming.forEach(u => { h += deskFrRow(u, !!_online[u], 'incoming'); });
    }
    if (outgoing.length) {
      h += '<div class="dsk-fr-section" style="margin-top:12px">Gönderilen İstekler — ' + outgoing.length + '</div>';
      outgoing.forEach(u => { h += deskFrRow(u, !!_online[u], 'outgoing'); });
    }
    box.innerHTML = h;
  });
}

function deskLoadAddFriend_panel(box) {
  box.innerHTML = `
    <div style="margin-bottom:16px">
      <input id="deskFrSearch" class="admin-inp" placeholder="Kullanıcı adı ara..." oninput="deskSearchUsersToAdd(this.value)" autocorrect="off" autocapitalize="none" style="margin-bottom:0">
    </div>
    <div id="deskFrAddResults" style="display:flex;flex-direction:column;gap:4px;"></div>`;
  deskSearchUsersToAdd('');
}

function deskSearchUsersToAdd(q) {
  const res = document.getElementById('deskFrAddResults');
  if (!res) return;
  res.innerHTML = '<div class="ld"><span></span><span></span><span></span></div>';
  const filter = (q || '').toLowerCase();
  Promise.all([
    dbRef('users').once('value'),
    dbRef('friends/' + _cu).once('value'),
    dbRef('friendRequests/' + _cu).once('value'),
    dbRef('friendRequestsSent/' + _cu).once('value')
  ]).then(([usersSnap, frSnap, inSnap, outSnap]) => {
    const users = usersSnap.val() || {};
    const friends = Object.keys(frSnap.val() || {});
    const incoming = Object.keys(inSnap.val() || {});
    const outgoing = Object.keys(outSnap.val() || {});
    const all = Object.keys(users).filter(u => {
      if(u === _cu) return false;
      if(users[u].banned) return false;
      if(filter && !u.toLowerCase().includes(filter)) return false;
      return true;
    });
    if (!all.length) { res.innerHTML = '<div class="dsk-fr-empty">Kullanıcı bulunamadı.</div>'; return; }
    let h = '';
    all.forEach(u => {
      const on = !!_online[u];
      const isFriend = friends.includes(u);
      const isIncoming = incoming.includes(u);
      const isOutgoing = outgoing.includes(u);
      let actions = '';
      if (isFriend) actions = `<button class="dsk-fr-btn msg" onclick="deskFriendMsg('${u}')">💬 Mesaj</button>`;
      else if (isIncoming) actions = `<button class="dsk-fr-btn accept" onclick="deskAcceptReq('${u}')">✓ Kabul</button><button class="dsk-fr-btn reject" style="margin-left:4px" onclick="deskRejectReq('${u}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`;
      else if (isOutgoing) actions = '<button class="dsk-fr-btn add" style="opacity:.6;cursor:default">İstek Gönderildi</button>';
      else actions = `<button class="dsk-fr-btn accept" onclick="deskSendFriendReq('${u}')">+ Ekle</button>`;
      h += `<div class="dsk-fr-row">
        <div class="dsk-fr-av" style="background:${strColor(u)}">${initials(u)}<div class="r-dot ${on?'on':'off'}"></div></div>
        <div class="dsk-fr-info"><div class="dsk-fr-name">${esc(u)}</div><div class="dsk-fr-status">${on?'🟢 Çevrimiçi':'Çevrimdışı'}</div></div>
        <div class="dsk-fr-actions">${actions}</div>
      </div>`;
    });
    res.innerHTML = h;
  });
}

function deskFrRow(u, online, type) {
  let actions = '';
  if (type === 'friend') {
    actions = `<button class="dsk-fr-btn msg" onclick="deskFriendMsg('${u}')">💬 Mesaj</button>`;
  } else if (type === 'incoming') {
    actions = `<button class="dsk-fr-btn accept" onclick="deskAcceptReq('${u}')">✓ Kabul</button><button class="dsk-fr-btn reject" style="margin-left:4px" onclick="deskRejectReq('${u}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`;
  } else if (type === 'outgoing') {
    actions = '<span style="font-size:.75rem;color:var(--muted)">Bekliyor...</span>';
  }
  return `<div class="dsk-fr-row">
    <div class="dsk-fr-av" style="background:${strColor(u)}">${initials(u)}<div class="r-dot ${online?'on':'off'}"></div></div>
    <div class="dsk-fr-info"><div class="dsk-fr-name">${esc(u)}</div><div class="dsk-fr-status">${online?'🟢 Çevrimiçi':'Çevrimdışı'}</div></div>
    <div class="dsk-fr-actions">${actions}</div>
  </div>`;
}

function deskFriendMsg(u) { deskNav('home'); setTimeout(() => startDMWithUser(u), 200); }

function deskAcceptReq(from) {
  acceptFriendRequest(from);
  setTimeout(() => {
    if(document.getElementById('deskFrContent')) deskFriendsTab(_deskFrTab);
    deskUpdateFrBadge();
  }, 500);
}

function deskRejectReq(from) {
  rejectFriendRequest(from);
  setTimeout(() => {
    if(document.getElementById('deskFrContent')) deskFriendsTab(_deskFrTab);
    deskUpdateFrBadge();
  }, 500);
}

function deskSendFriendReq(to) {
  sendFriendRequest(to);
  setTimeout(() => { if(document.getElementById('deskFrAddResults')) deskSearchUsersToAdd(document.getElementById('deskFrSearch')?.value||''); }, 500);
}

function deskUpdateFrBadge() {
  const count = Object.keys(_friendReqs).length;
  // Update rail badge pill
  const pill = document.getElementById('deskFrNotif');
  if (pill) { pill.style.display = count > 0 ? 'flex' : 'none'; pill.textContent = count; }
  // Refresh panel badge if open
  if (_deskNav === 'friends' && document.getElementById('deskFrTabs')) {
    const reqTab = document.querySelector('.dsk-fr-tab[data-tab="requests"]');
    if (reqTab) {
      reqTab.innerHTML = '📩 İstekler' + (count > 0 ? `<span style="background:var(--red);color:#fff;border-radius:100px;padding:0 7px;font-size:.65rem;font-weight:900;margin-left:5px">${count}</span>` : '');
    }
  }
}

function deskDoLogout() {
  if (_deskStopMsg) { _deskStopMsg(); _deskStopMsg = null; }
  document.getElementById('desktopShell').style.display = 'none';
  doLogout();
  // After logout show login
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginScreen').classList.add('active');
}

async function sendDeskMsg() {
  if (!_db || !_cu || !_deskRoom) return;
  const inp = document.getElementById('deskInp');
  let t = inp.value.trim();
  if (!t) return;

  const roomSnap = await dbRef('rooms/' + _deskRoom).once('value');
  const roomData = roomSnap.val() || {};
  if (roomData.locked && !_isAdmin) { showToast('🔒 Bu oda kilitli.'); return; }
  if (roomData.muted && !_isAdmin) { showToast('🔇 Bu grup susturulmuş.'); return; }
  // Rate limiting (desktop)
  const _now2 = Date.now();
  const muteUntil2 = _userMutedUntil || 0;
  if(muteUntil2 > _now2){ const rem=Math.ceil((muteUntil2-_now2)/60000); showToast('🔇 Susturuldunuz. '+rem+' dk kaldı.'); return; }
  if(_now2 - _msgCountReset > MSG_BURST_WINDOW){ _msgCount=0; _msgCountReset=_now2; }
  if(_now2 - _lastMsgTs < MSG_RATE_MS){ showToast('⏱ Çok hızlı gönderiyorsunuz.'); return; }
  if(_msgCount >= MSG_BURST_LIMIT){ showToast('⏱ Çok fazla mesaj gönderildi.'); return; }
  if(t.length > 2000){ showToast('Mesaj çok uzun (max 2000 karakter).'); return; }
  // Banned words
  if(_bannedWordsList && _bannedWordsList.length){
    _bannedWordsList.forEach(w=>{ if(!w)return; const re=new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'); t=t.replace(re,'***'); });
  }
  _lastMsgTs=_now2; _msgCount++;
  if (roomData.slowMode > 0 && !_isAdmin) {
    const key = '_slowlast_' + _deskRoom;
    const last = parseInt(sessionStorage.getItem(key) || 0);
    const now = Date.now();
    if (now - last < roomData.slowMode * 1000) { showToast('Yavaş mod: ' + Math.ceil((roomData.slowMode * 1000 - (now - last)) / 1000) + 's bekle.'); return; }
    sessionStorage.setItem(key, now);
  }

  const key = dbRef('msgs/' + _deskRoom).push().key;
  const msg = { key, user: _cu, text: t, ts: Date.now() };
  inp.value = ''; inp.style.height = 'auto';
  await dbRef('msgs/' + _deskRoom + '/' + key).set(msg);
}

function onDeskMsgKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const inp = document.getElementById('deskInp');
    if (inp && inp.disabled) { showToast('🔒 Bu oda kilitli.'); return; }
    sendDeskMsg();
  }
}

function deskInpResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

// ── Wire into existing onLoginSuccess ──
// session.js'ten sonra yükleniyor olabilir — lazy capture
window._deskOrigLogin = null;
window.onLoginSuccess = (function(){
  const _prev = typeof window.onLoginSuccess === 'function' ? window.onLoginSuccess : null;
  return function() {
    if (typeof _prev === 'function') _prev.apply(this, arguments);
    if (IS_DESKTOP()) { setTimeout(deskOnLogin, 100); }
  };
})();

// On resize, switch modes — DEBOUNCED to avoid rotation glitch
let _resizeTimer = null;
let _lastWasDesktop = IS_DESKTOP();
let _lastMobileTab = 'home'; // Track last active mobile tab

window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    const nowDesktop = IS_DESKTOP();
    if (nowDesktop === _lastWasDesktop) return; // No mode change, skip
    _lastWasDesktop = nowDesktop;

    if (nowDesktop && _cu) {
      document.getElementById('desktopShell').style.display = 'flex';
      document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
      if (_deskRoom) deskOpenRoom(_deskRoom);
      else deskLoadRoomList();
    } else if (!nowDesktop) {
      // --- Mobile restore ---
      const shell = document.getElementById('desktopShell');
      if (shell) shell.style.display = 'none';

      if (_cu) {
        // Force-hide ALL screens first
        ['roomsScreen','forumScreen','msgsScreen','friendsScreen','profileScreen',
         'chatScreen','adminPanel','gamesScreen','watchScreen','liveRoomScreen'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.classList.remove('active'); el.style.display = ''; }
        });

        // Restore to a safe tab — never profile/chat/admin
        const safeTab = ['home','forum','watch','msgs','friends'].includes(_lastMobileTab)
          ? _lastMobileTab
          : 'home';
        switchMainTab(safeTab);
      } else {
        // showScreen misc.js'de tanımlı — yoksa fallback
        if(typeof showScreen === 'function') showScreen('loginScreen');
        else { const ls=document.getElementById('loginScreen'); if(ls){ls.style.display='flex';ls.classList.add('active');} }
      }
    }
  }, 200);
});

// Also update room list when online status changes
const _origListenOnline = listenOnline;
listenOnline = function() {
  _origListenOnline();
  // Refresh desktop member panel periodically
  if (IS_DESKTOP()) {
    setInterval(() => {
      if (_deskRoom && document.getElementById('deskMemberPanel') && !document.getElementById('deskMemberPanel').classList.contains('hidden')) {
        dbRef('rooms/' + _deskRoom).once('value').then(s => { if (s.val() && s.val().type === 'group') deskLoadMembers(s.val()); });
      }
    }, 30000);
  }
};



/* ── 14. DESKTop SOHBET SCROLL BUTONU ── */

(function(){
  function _initDeskScroll(){
    const deskMsgs = document.getElementById('deskMsgs'); // Düzeltildi: deskChatMsgs → deskMsgs
    const btn = document.getElementById('deskScrollToBottomBtn');
    if(!deskMsgs || !btn) return;
    deskMsgs.addEventListener('scroll', ()=>{
      const atBot = deskMsgs.scrollHeight - deskMsgs.scrollTop - deskMsgs.clientHeight < 60;
      btn.classList.toggle('visible', !atBot);
    });
  }
  window.deskScrollToBottom = function(){
    const b = document.getElementById('deskMsgs');
    if(b) b.scrollTo({top:b.scrollHeight, behavior:'smooth'});
    const btn = document.getElementById('deskScrollToBottomBtn');
    if(btn) btn.classList.remove('has-unread', 'visible');
  };
  setTimeout(_initDeskScroll, 1500);
  // Oda açılınca yeniden init
  const origDeskOpen = window.deskOpenRoom;
  if(origDeskOpen) window.deskOpenRoom = function(...args){
    origDeskOpen(...args);
    setTimeout(_initDeskScroll, 500);
  };
})();





/* ── Rail icons (desktop) ── */

function injectRailIcons() {
  document.querySelectorAll('.rail-btn').forEach(btn => {
    const ic = btn.querySelector('.rail-ic, [class*="rail-icon"]');
    if (!ic) return;
    const t = ic.textContent.trim();
    const svgStr = ICONS[t];
    if (svgStr) { ic.innerHTML = svgStr; ic.style.fontSize = '0'; }
  });
}


/* ── Liderlik Tablosu ── */
function deskLoadLeaderboard() {
  const panel = document.getElementById('deskPanelContent');
  if (!panel) return;
  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div style="padding:20px 24px 14px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:10px;">
        <svg width="22" height="20" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l2.4 7.4L22 7l-3 9H5L2 7l7.6 2.4L12 2z" fill="#f0c040" stroke="#d4a017" stroke-width="1" stroke-linejoin="round"/>
          <rect x="3" y="16" width="18" height="3" rx="1.5" fill="#d4a017"/>
        </svg>
        <div>
          <div style="font-size:1rem;font-weight:900;color:var(--text-hi);">Liderlik Tablosu</div>
          <div style="font-size:.72rem;color:var(--muted);">En aktif kullanıcılar</div>
        </div>
      </div>
      <div id="leaderboardBody" style="flex:1;overflow-y:auto;padding:12px 16px;">
        <div style="text-align:center;color:var(--muted);padding:40px;font-size:.85rem;">Yükleniyor...</div>
      </div>
    </div>
  `;

  if (!_db) { document.getElementById('leaderboardBody').innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px;">Veri tabanına bağlanılamadı.</div>'; return; }

  dbRef('users').once('value').then(snap => {
    const users = snap.val() || {};
    const body = document.getElementById('leaderboardBody');
    if (!body) return;

    const list = Object.entries(users)
      .map(([uid, u]) => ({ uid, username: u.username || uid, msgCount: u.msgCount || 0, avatar: u.avatar || null, color: u.color || '#5b9bd5' }))
      .filter(u => u.msgCount > 0)
      .sort((a, b) => b.msgCount - a.msgCount)
      .slice(0, 20);

    if (!list.length) {
      body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px;font-size:.85rem;">Henüz mesaj gönderen yok.</div>';
      return;
    }

    const medals = ['🥇','🥈','🥉'];
    body.innerHTML = list.map((u, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;margin-bottom:6px;background:var(--surface);border:1px solid var(--border);${i<3?'border-color:'+['rgba(240,192,64,.3)','rgba(180,180,180,.3)','rgba(200,120,60,.3)'][i]+';':''}" >
        <div style="width:28px;text-align:center;font-size:${i<3?'1.2rem':'.85rem'};font-weight:900;color:${i<3?['#f0c040','#b0b0b0','#c87830'][i]:'var(--muted)'};">
          ${i < 3 ? medals[i] : (i+1)}
        </div>
        <div style="width:36px;height:36px;border-radius:10px;background:${u.color}33;border:1.5px solid ${u.color}66;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;color:${u.color};flex-shrink:0;">
          ${u.username.slice(0,2).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.85rem;font-weight:700;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.username}</div>
          <div style="font-size:.68rem;color:var(--muted);">${u.msgCount.toLocaleString('tr-TR')} mesaj</div>
        </div>
        <div style="font-size:.75rem;font-weight:800;color:${i<3?['#f0c040','#b0b0b0','#c87830'][i]:'var(--muted)'};">
          #${i+1}
        </div>
      </div>
    `).join('');
  }).catch(() => {
    const body = document.getElementById('leaderboardBody');
    if (body) body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px;">Veri yüklenemedi.</div>';
  });
}



/* ══════════════════════════════════════════════
   🎥 CANLI SOHBET ODASI
══════════════════════════════════════════════ */

let _liveRoomMsgRef = null;
let _liveRoomUnsubscribe = null;

function deskLoadLiveRoom() {
  const panel = document.getElementById('deskPanelContent');
  if (!panel) return;

  panel.innerHTML = `
    <style>
      /* ── Canlı Oda Genel ── */
      #liveRoomWrap {
        display:flex;flex-direction:column;height:100%;
        background:linear-gradient(160deg,#080f08 0%,#0c1a0c 60%,#0a140a 100%);
        font-family:inherit;overflow:hidden;
      }
      /* Başlık */
      #liveRoomHeader {
        display:flex;align-items:center;justify-content:space-between;
        padding:14px 20px;flex-shrink:0;
        background:rgba(0,0,0,.35);
        border-bottom:1px solid rgba(74,143,64,.15);
        backdrop-filter:blur(10px);
      }
      .live-badge {
        display:flex;align-items:center;gap:7px;
        background:rgba(224,80,80,.12);border:1px solid rgba(224,80,80,.3);
        border-radius:100px;padding:4px 12px;font-size:.72rem;font-weight:900;
        color:#e05555;letter-spacing:.06em;text-transform:uppercase;
        opacity:0;transition:opacity .3s;
      }
      .live-badge.on { opacity:1; }
      .live-badge .dot {
        width:7px;height:7px;border-radius:50%;background:#e05555;
        animation:livepulse 1.2s ease-in-out infinite;
      }
      @keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
      .live-action-btn {
        display:flex;align-items:center;gap:7px;border:none;cursor:pointer;
        border-radius:10px;padding:8px 16px;font-size:.78rem;font-weight:800;
        font-family:inherit;transition:all .18s;
      }
      .live-action-btn.stream {
        background:rgba(224,80,80,.13);border:1.5px solid rgba(224,80,80,.35);color:#f07070;
      }
      .live-action-btn.stream:hover { background:rgba(224,80,80,.25); }
      .live-action-btn.stream.active { background:#c0392b;border-color:#c0392b;color:#fff; }
      .live-action-btn.conf {
        background:rgba(74,143,64,.13);border:1.5px solid rgba(74,143,64,.35);color:#6dbf67;
      }
      .live-action-btn.conf:hover { background:rgba(74,143,64,.25); }
      .live-action-btn.conf.active { background:#2e7d32;border-color:#2e7d32;color:#fff; }
      /* Ana alan */
      #liveRoomBody { flex:1;display:flex;overflow:hidden; }
      /* Sol: Yayın Alanı */
      #liveVideoPane {
        flex:1;display:flex;flex-direction:column;position:relative;overflow:hidden;
        background:#050d05;
      }
      #liveVideoPlaceholder {
        flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:14px;color:rgba(255,255,255,.2);user-select:none;
      }
      #liveVideoPlaceholder .big-icon {
        width:72px;height:72px;border-radius:50%;
        background:rgba(74,143,64,.08);border:1.5px solid rgba(74,143,64,.15);
        display:flex;align-items:center;justify-content:center;font-size:2rem;
      }
      #liveMainVideo {
        width:100%;height:100%;object-fit:contain;display:none;position:absolute;top:0;left:0;
      }
      #liveConfGrid {
        display:none;width:100%;height:100%;padding:12px;
        box-sizing:border-box;gap:8px;overflow:hidden;
        grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
        position:absolute;top:0;left:0;
      }
      .conf-tile {
        border-radius:14px;overflow:hidden;background:#0d1f0d;
        position:relative;border:1.5px solid rgba(74,143,64,.12);
      }
      .conf-tile video { width:100%;height:100%;object-fit:cover;display:block; }
      .conf-tile-label {
        position:absolute;bottom:8px;left:10px;
        background:rgba(0,0,0,.65);color:#fff;font-size:.68rem;
        font-weight:800;padding:3px 8px;border-radius:6px;backdrop-filter:blur(4px);
      }
      /* Yayın üst bilgi overlay */
      #liveStreamInfo {
        display:none;position:absolute;top:14px;left:14px;z-index:5;
        display:flex;align-items:center;gap:8px;
      }
      #liveStreamInfo .host-tag {
        background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
        color:#fff;font-size:.75rem;font-weight:800;padding:4px 10px;
        border-radius:8px;border:1px solid rgba(255,255,255,.1);
      }
      /* Alt kontroller */
      #liveControlBar {
        display:none;position:absolute;bottom:0;left:0;right:0;z-index:10;
        background:linear-gradient(transparent,rgba(0,0,0,.85));
        padding:28px 20px 16px;
        display:flex;align-items:center;justify-content:center;gap:10px;
        flex-direction:column;
      }
      #liveControlBar.visible { display:flex; }
      .ctrl-row { display:flex;align-items:center;gap:10px; }
      .ctrl-btn {
        width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;
        display:flex;align-items:center;justify-content:center;font-size:1rem;
        transition:all .18s;background:rgba(255,255,255,.12);color:#fff;
      }
      .ctrl-btn:hover { background:rgba(255,255,255,.22);transform:scale(1.05); }
      .ctrl-btn.muted,.ctrl-btn.off { background:rgba(224,80,80,.35);color:#ffaaaa; }
      .ctrl-btn.end {
        background:rgba(224,80,80,.85);width:52px;height:52px;font-size:1.1rem;
      }
      .ctrl-btn.end:hover { background:#c0392b; }
      .ctrl-btn.settings { background:rgba(74,143,64,.18); }
      /* Sağ: Sohbet */
      #liveChatPane {
        width:290px;flex-shrink:0;display:flex;flex-direction:column;
        background:rgba(0,0,0,.2);border-left:1px solid rgba(74,143,64,.1);
      }
      .chat-pane-hdr {
        padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);
        font-size:.8rem;font-weight:900;color:rgba(255,255,255,.7);flex-shrink:0;
        display:flex;align-items:center;gap:6px;
      }
      .chat-pane-hdr span.cnt {
        background:rgba(74,143,64,.2);color:#6dbf67;border-radius:100px;
        font-size:.65rem;padding:1px 6px;font-weight:900;
      }
      #liveChatMsgs {
        flex:1;overflow-y:auto;padding:10px 10px;display:flex;flex-direction:column;gap:5px;
        scroll-behavior:smooth;
      }
      #liveChatMsgs::-webkit-scrollbar { width:3px; }
      #liveChatMsgs::-webkit-scrollbar-track { background:transparent; }
      #liveChatMsgs::-webkit-scrollbar-thumb { background:rgba(74,143,64,.3);border-radius:4px; }
      .live-msg {
        display:flex;gap:7px;align-items:flex-start;padding:3px 0;
      }
      .live-msg .av {
        width:22px;height:22px;border-radius:7px;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;
        font-size:.6rem;font-weight:900;color:#fff;
      }
      .live-msg .body { flex:1;min-width:0; }
      .live-msg .uname { font-size:.68rem;font-weight:800;color:#6dbf67; }
      .live-msg .txt { font-size:.78rem;color:rgba(255,255,255,.75);line-height:1.4;word-break:break-word; }
      .live-msg.sys .txt { color:rgba(255,255,255,.3);font-style:italic;font-size:.72rem; }
      .live-chat-input-wrap {
        padding:10px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;
      }
      .live-chat-input-inner {
        display:flex;gap:6px;align-items:center;
        background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
        border-radius:10px;padding:6px 10px;transition:border-color .15s;
      }
      .live-chat-input-inner:focus-within { border-color:rgba(74,143,64,.5); }
      .live-chat-input-inner input {
        flex:1;background:none;border:none;color:#fff;font-size:.82rem;
        font-family:inherit;outline:none;
      }
      .live-chat-input-inner input::placeholder { color:rgba(255,255,255,.3); }
      .live-chat-send {
        width:28px;height:28px;border:none;border-radius:8px;cursor:pointer;
        background:rgba(74,143,64,.25);color:#6dbf67;display:flex;
        align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;
      }
      .live-chat-send:hover { background:rgba(74,143,64,.4); }
    </style>

    <div id="liveRoomWrap">

      <!-- Başlık -->
      <div id="liveRoomHeader">
        <div style="display:flex;align-items:center;gap:12px;">
          <div id="liveBadge" class="live-badge">
            <div class="dot"></div> CANLI
          </div>
          <div style="font-size:.92rem;font-weight:900;color:rgba(255,255,255,.85);">
            📡 Canlı Sohbet Odası
          </div>
          <span id="liveViewerCount" style="color:rgba(255,255,255,.35);font-size:.75rem;"></span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="live-action-btn stream" id="liveStreamBtn" onclick="liveStartStream()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
            Yayın Başlat
          </button>
          <button class="live-action-btn conf" id="liveConfBtn" onclick="liveStartConference()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            Konferans
          </button>
        </div>
      </div>

      <!-- Gövde -->
      <div id="liveRoomBody">

        <!-- Sol: Video / Ekran -->
        <div id="liveVideoPane">
          <div id="liveVideoPlaceholder">
            <div class="big-icon">📡</div>
            <div style="font-size:.95rem;font-weight:800;color:rgba(255,255,255,.3);">Şu an aktif yayın yok</div>
            <div style="font-size:.78rem;opacity:.5;max-width:220px;text-align:center;line-height:1.5;">
              Yayın başlatmak veya görüntülü toplantı düzenlemek için yukarıdaki butonları kullan
            </div>
          </div>

          <!-- Videolar -->
          <video id="liveMainVideo" autoplay playsinline></video>
          <div id="liveConfGrid"></div>

          <!-- Yayın bilgisi -->
          <div id="liveStreamInfo" style="display:none;">
            <div class="live-badge on" style="font-size:.65rem;padding:3px 9px;">
              <div class="dot"></div> CANLI
            </div>
            <div class="host-tag" id="liveStreamHost"></div>
          </div>

          <!-- Kontroller -->
          <div id="liveControlBar">
            <div class="ctrl-row">
              <button class="ctrl-btn" id="liveMuteBtn" onclick="liveMute()" title="Mikrofon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button class="ctrl-btn" id="liveCamBtn" onclick="liveCam()" title="Kamera" style="display:none;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </button>
              <button class="ctrl-btn settings" id="liveSettingsBtnTrigger" onclick="liveShowVideoSettings()" title="Görüntü Ayarları">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
              </button>
              <button class="ctrl-btn end" onclick="liveEnd()" title="Yayını Bitir">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Sağ: Canlı Sohbet -->
        <div id="liveChatPane">
          <div class="chat-pane-hdr">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Canlı Sohbet
            <span class="cnt" id="liveMsgCount">0</span>
          </div>
          <div id="liveChatMsgs">
            <div class="live-msg sys">
              <div class="body"><div class="txt">Sohbet başladı 👋</div></div>
            </div>
          </div>
          <div class="live-chat-input-wrap">
            <div class="live-chat-input-inner">
              <input id="liveChatInput" type="text" placeholder="Mesaj yaz..." maxlength="200"
                autocomplete="off" onkeydown="if(event.key==='Enter')liveSendMsg()">
              <button class="live-chat-send" onclick="liveSendMsg()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  _startLiveChatListener();
  _checkActiveLiveSession();
}


/* ── Canlı sohbet mesajlarını Firebase'den dinle ── */
function _startLiveChatListener() {
  if (_liveRoomUnsubscribe) { try { _liveRoomUnsubscribe(); } catch(e) {} }
  if (!_db) return;

  const ref = dbRef('liveRoom/chat');
  const handler = ref.limitToLast(100).on('child_added', (snap) => {
    const msg = snap.val();
    if (msg) _appendLiveChatMsg(msg);
  });
  _liveRoomUnsubscribe = () => ref.off('child_added', handler);
}

function _appendLiveChatMsg(msg) {
  const box = document.getElementById('liveChatMsgs');
  if (!box) return;
  const isSystem = !msg.user || msg.user.includes('Sistem');
  const isMe = msg.user === _cu;
  const div = document.createElement('div');
  div.className = 'live-msg' + (isSystem ? ' sys' : '');
  if (isSystem) {
    div.innerHTML = `<div class="body"><div class="txt">${(typeof esc==='function'?esc(msg.text||''):msg.text||'')}</div></div>`;
  } else {
    const color = typeof strColor==='function' ? strColor(msg.user) : '#4a8f40';
    const ini = typeof initials==='function' ? initials(msg.user) : (msg.user||'?').slice(0,2).toUpperCase();
    div.innerHTML = `
      <div class="av" style="background:${color}">${ini}</div>
      <div class="body">
        <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:1px;">
          <span class="uname" style="color:${isMe?'#6dbf67':'rgba(255,255,255,.7)'}">${msg.user||''}</span>
          <span style="color:rgba(255,255,255,.2);font-size:.6rem;">${_fmtLiveTime(msg.ts)}</span>
        </div>
        <div class="txt">${(typeof esc==='function'?esc(msg.text||''):msg.text||'')}</div>
      </div>`;
  }
  box.appendChild(div);
  // Mesaj sayacı güncelle
  const cnt = document.getElementById('liveMsgCount');
  if (cnt) cnt.textContent = box.querySelectorAll('.live-msg:not(.sys)').length;
  // Otomatik scroll
  if (box.scrollTop + box.clientHeight >= box.scrollHeight - 80) {
    box.scrollTop = box.scrollHeight;
  }
}

function _fmtLiveTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

/* ── Mesaj gönder ── */
async function liveSendMsg() {
  const input = document.getElementById('liveChatInput');
  if (!input || !input.value.trim() || !_cu) return;
  const text = input.value.trim();
  input.value = '';
  if (!_db) return;
  await dbRef('liveRoom/chat').push({ user: _cu, text, ts: Date.now() });
}

/* ── Aktif yayın/konferans kontrolü ── */
async function _checkActiveLiveSession() {
  if (!_db) return;
  try {
    const session = await dbRef('liveRoom/session').once('value').then(s=>s.val());
    if (session && session.active) {
      _showActiveLiveSession(session);
    }
  } catch(e) {}
  // Oturum değişimlerini izle
  dbRef('liveRoom/session').on('value', (snap) => {
    const s = snap.val();
    if (s && s.active) _showActiveLiveSession(s);
    else _clearLiveSession();
  });
}

function _showActiveLiveSession(session) {
  const dot = document.getElementById('liveStatusDot');
  const info = document.getElementById('liveStreamInfo');
  const host = document.getElementById('liveStreamHost');
  const viewers = document.getElementById('liveViewerCount');
  const placeholder = document.getElementById('liveStreamPlaceholder');
  const controlBar = document.getElementById('liveControlBar');

  if (dot) { dot.style.background = '#e05555'; dot.style.animation = 'livePulse 1.5s infinite'; }
  if (info) info.style.display = 'flex';
  if (host) host.textContent = session.host + ' yayında';
  if (viewers) viewers.textContent = '👁 ' + (session.viewers || 0) + ' izleyici';
  if (placeholder) placeholder.style.display = 'none';
  if (controlBar && session.host === _cu) { controlBar.style.display = 'flex'; }

  // Katılımcı sayısını güncelle
  if (_cu && session.host !== _cu) {
    dbRef('liveRoom/session/viewers').transaction(v => (v || 0) + 1);
  }
}

function _clearLiveSession() {
  const dot = document.getElementById('liveStatusDot');
  const info = document.getElementById('liveStreamInfo');
  const placeholder = document.getElementById('liveStreamPlaceholder');
  const video = document.getElementById('liveMainVideo');
  const controlBar = document.getElementById('liveControlBar');
  const viewers = document.getElementById('liveViewerCount');

  if (dot) { dot.style.background = 'rgba(255,255,255,.2)'; dot.style.animation = ''; }
  if (info) info.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  if (video) { video.style.display = 'none'; video.srcObject = null; }
  if (controlBar) controlBar.style.display = 'none';
  if (viewers) viewers.textContent = '';
}

/* ── Yayın başlat (ekran paylaşımı) ── */
async function liveStartStream() {
  if (!_cu) { showToast('Giriş yapman gerekiyor'); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30, width: { ideal: 1920 } },
      audio: true
    });
  } catch(e) { showToast('Ekran paylaşımı iptal edildi'); return; }

  // Yerel önizleme
  const video = document.getElementById('liveMainVideo');
  if (video) { video.srcObject = stream; video.style.display = 'block'; }
  const camBtn = document.getElementById('liveCamBtn');
  if (camBtn) camBtn.style.display = 'none';

  // Firebase'e oturum yaz
  if (_db) {
    await dbRef('liveRoom/session').set({ host: _cu, type: 'stream', active: true, startedAt: Date.now(), viewers: 0 });
    dbRef('liveRoom/chat').push({ user: '📡 Sistem', text: _cu + ' ekran yayını başlattı!', ts: Date.now() });
  }

  // Yayın bitince temizle
  stream.getVideoTracks()[0].onended = () => liveEnd();

  // WebRTC ile başka kullanıcılara yayın (conference.js gerekli)
  if (typeof startGameStream === 'function') {
    window._liveLocalStream = stream;
  }
  // UI güncellemeleri
  const badge = document.getElementById('liveBadge');
  if (badge) badge.classList.add('on');
  const info = document.getElementById('liveStreamInfo');
  if (info) { info.style.display = 'flex'; }
  const host = document.getElementById('liveStreamHost');
  if (host) host.textContent = _cu + ' yayında';
  const ctrl = document.getElementById('liveControlBar');
  if (ctrl) ctrl.classList.add('visible');
  const placeholder = document.getElementById('liveVideoPlaceholder');
  if (placeholder) placeholder.style.display = 'none';
  const streamBtn = document.getElementById('liveStreamBtn');
  if (streamBtn) { streamBtn.classList.add('active'); streamBtn.textContent = '⏹ Yayın Durdur'; streamBtn.onclick = liveEnd; }

  // Rail'de kırmızı nokta
  const notif = document.getElementById('deskLiveNotif');
  if (notif) { notif.style.display = 'flex'; notif.style.background = '#e05555'; }
}

/* ── Görüntülü konferans başlat ── */
async function liveStartConference() {
  if (!_cu) { showToast('Giriş yapman gerekiyor'); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch(e) { showToast('Kamera/mikrofon izni reddedildi'); return; }

  // Kendi karosunu göster
  const grid = document.getElementById('liveConfGrid');
  const streamArea = document.getElementById('liveStreamArea');
  if (grid) { grid.style.display = 'grid'; }
  const video = document.getElementById('liveMainVideo');
  if (video) { video.style.display = 'none'; }

  const myTile = document.createElement('div');
  myTile.id = 'liveConf-' + _cu;
  myTile.style.cssText = 'border-radius:12px;overflow:hidden;background:#1a2a1a;position:relative;min-height:160px;';
  myTile.innerHTML = `
    <video autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>
    <div style="position:absolute;bottom:7px;left:9px;background:rgba(0,0,0,.6);color:#fff;font-size:.68rem;font-weight:700;padding:2px 7px;border-radius:5px;">${_cu} (Sen)</div>
  `;
  myTile.querySelector('video').srcObject = stream;
  if (grid) grid.appendChild(myTile);

  const camBtn = document.getElementById('liveCamBtn');
  if (camBtn) camBtn.style.display = 'flex';
  const ctrl = document.getElementById('liveControlBar');
  if (ctrl) ctrl.classList.add('visible');
  const placeholder = document.getElementById('liveVideoPlaceholder');
  if (placeholder) placeholder.style.display = 'none';
  const badge = document.getElementById('liveBadge');
  if (badge) badge.classList.add('on');
  const confBtn = document.getElementById('liveConfBtn');
  if (confBtn) { confBtn.classList.add('active'); confBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> Konferans Aktif'; }

  if (_db) {
    await dbRef('liveRoom/session').set({ host: _cu, type: 'conference', active: true, startedAt: Date.now(), viewers: 0 });
    dbRef('liveRoom/chat').push({ user: '🎥 Sistem', text: _cu + ' görüntülü konferans başlattı!', ts: Date.now() });
  }

  window._liveLocalStream = stream;
  const notif = document.getElementById('deskLiveNotif');
  if (notif) { notif.style.display = 'flex'; notif.style.background = '#e05555'; }
}

/* ── Yayını bitir ── */
async function liveEnd() {
  if (window._liveLocalStream) {
    window._liveLocalStream.getTracks().forEach(t => t.stop());
    window._liveLocalStream = null;
  }
  if (_db) {
    await dbRef('liveRoom/session').set({ active: false });
    dbRef('liveRoom/chat').push({ user: '📡 Sistem', text: 'Yayın sona erdi.', ts: Date.now() });
  }
  _clearLiveSession();
  // Reset new UI
  const badge = document.getElementById('liveBadge');
  if (badge) badge.classList.remove('on');
  const ctrl = document.getElementById('liveControlBar');
  if (ctrl) ctrl.classList.remove('visible');
  const placeholder = document.getElementById('liveVideoPlaceholder');
  if (placeholder) placeholder.style.display = 'flex';
  const streamBtn = document.getElementById('liveStreamBtn');
  if (streamBtn) { streamBtn.classList.remove('active'); streamBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg> Yayın Başlat'; streamBtn.onclick = liveStartStream; }
  const confBtn = document.getElementById('liveConfBtn');
  if (confBtn) { confBtn.classList.remove('active'); confBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> Konferans'; }
  const notif = document.getElementById('deskLiveNotif');
  if (notif) notif.style.display = 'none';
}

/* ── Mikrofon toggle ── */
function liveMute() {
  if (!window._liveLocalStream) return;
  const tracks = window._liveLocalStream.getAudioTracks();
  if (!tracks.length) return;
  const muted = !tracks[0].enabled;
  tracks.forEach(t => { t.enabled = muted; });
  const btn = document.getElementById('liveMuteBtn');
  if (btn) { btn.textContent = muted ? '🎙️' : '🔇'; btn.style.background = muted ? 'rgba(255,255,255,.15)' : 'rgba(224,85,85,.4)'; }
}

/* ── Kamera toggle ── */
function liveCam() {
  if (!window._liveLocalStream) return;
  const tracks = window._liveLocalStream.getVideoTracks();
  if (!tracks.length) return;
  const off = !tracks[0].enabled;
  tracks.forEach(t => { t.enabled = off; });
  const btn = document.getElementById('liveCamBtn');
  if (btn) { btn.textContent = off ? '📹' : '📷'; btn.style.background = off ? 'rgba(255,255,255,.15)' : 'rgba(224,85,85,.4)'; }
}

/* global erişim */
window.liveSendMsg = liveSendMsg;
window.liveStartStream = liveStartStream;
window.liveStartConference = liveStartConference;
window.liveEnd = liveEnd;
window.liveMute = liveMute;
window.liveCam = liveCam;

/* ═══════════════════════════════════════════════════════════════
   CANLIYAYIN — GÖRÜNTÜ AYARLARI PANELİ
   • Çözünürlük, FPS, kamera seçimi, mikrofon seçimi
   • Ayna modu, arka plan bulanıklığı
   • Uygula butonu ile anlık değişim
═══════════════════════════════════════════════════════════════ */

async function liveShowVideoSettings() {
  // Zaten açıksa kapat
  const existing = document.getElementById('liveSettingsPanel');
  if (existing) { existing.remove(); return; }

  // Cihazları al
  let cameras = [], mics = [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameras = devices.filter(d => d.kind === 'videoinput');
    mics    = devices.filter(d => d.kind === 'audioinput');
  } catch(e) {}

  // Mevcut ayarları oku
  const st = window._liveLocalStream;
  const vt = st ? st.getVideoTracks()[0] : null;
  const at = st ? st.getAudioTracks()[0] : null;
  const curSettings = vt ? vt.getSettings() : {};

  const camOptions = cameras.map((c,i) =>
    `<option value="${c.deviceId}" ${curSettings.deviceId === c.deviceId ? 'selected' : ''}>${c.label || 'Kamera ' + (i+1)}</option>`
  ).join('');
  const micOptions = mics.map((m,i) =>
    `<option value="${m.deviceId}" ${at && at.label === m.label ? 'selected' : ''}>${m.label || 'Mikrofon ' + (i+1)}</option>`
  ).join('');

  const panel = document.createElement('div');
  panel.id = 'liveSettingsPanel';
  panel.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:#131f13;border:1px solid rgba(255,255,255,.12);
    border-radius:16px;padding:20px 22px;z-index:9999;
    width:340px;box-shadow:0 8px 40px rgba(0,0,0,.7);
    font-family:inherit;color:#fff;
  `;
  panel.innerHTML = `
    <style>
      #liveSettingsPanel label { font-size:.72rem; font-weight:700; color:rgba(255,255,255,.5); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:.05em; }
      #liveSettingsPanel select, #liveSettingsPanel input[type=range] { width:100%; background:#0d170d; border:1px solid rgba(255,255,255,.1); color:#fff; border-radius:8px; padding:7px 10px; font-size:.82rem; outline:none; margin-bottom:14px; cursor:pointer; }
      #liveSettingsPanel select:focus { border-color:rgba(74,143,64,.6); }
      #liveSettingsPanel .row { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
      #liveSettingsPanel .toggle { width:38px; height:21px; border-radius:11px; background:rgba(255,255,255,.12); border:none; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
      #liveSettingsPanel .toggle.on { background:#4a8f40; }
      #liveSettingsPanel .toggle::after { content:''; position:absolute; top:3px; left:3px; width:15px; height:15px; border-radius:50%; background:#fff; transition:transform .2s; }
      #liveSettingsPanel .toggle.on::after { transform:translateX(17px); }
      #liveSettingsPanel .apply-btn { width:100%; padding:9px; border:none; border-radius:10px; background:linear-gradient(135deg,#4a8f40,#2d6e26); color:#fff; font-weight:800; font-size:.85rem; cursor:pointer; margin-top:4px; transition:opacity .15s; }
      #liveSettingsPanel .apply-btn:hover { opacity:.85; }
      #liveSettingsPanel .fps-val { font-size:.82rem; color:#6dbf67; font-weight:800; min-width:35px; text-align:right; }
    </style>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
      <div style="font-size:.92rem;font-weight:900;color:#fff;">🎛️ Görüntü Ayarları</div>
      <div onclick="document.getElementById('liveSettingsPanel').remove()" style="cursor:pointer;color:rgba(255,255,255,.4);font-size:1.1rem;padding:0 4px;">✕</div>
    </div>

    ${cameras.length > 1 ? `
    <label>📷 Kamera</label>
    <select id="lsCamera">${camOptions}</select>
    ` : ''}

    ${mics.length > 0 ? `
    <label>🎙️ Mikrofon</label>
    <select id="lsMic">${micOptions}</select>
    ` : ''}

    <label>📐 Çözünürlük</label>
    <select id="lsResolution">
      <option value="360" ${curSettings.height <= 360 ? 'selected':''}>360p (Düşük)</option>
      <option value="480" ${curSettings.height > 360 && curSettings.height <= 480 ? 'selected':''}>480p (Orta)</option>
      <option value="720" ${curSettings.height > 480 && curSettings.height <= 720 ? 'selected':''}>720p HD</option>
      <option value="1080" ${curSettings.height > 720 ? 'selected':''}>1080p Full HD</option>
    </select>

    <label>🎞️ Kare Hızı (FPS) — <span id="lsFpsVal" class="fps-val">${curSettings.frameRate || 30} fps</span></label>
    <input type="range" id="lsFps" min="10" max="60" step="5" value="${curSettings.frameRate || 30}"
      oninput="document.getElementById('lsFpsVal').textContent=this.value+' fps'">

    <div class="row">
      <span style="font-size:.82rem;font-weight:700;">🪞 Ayna Modu</span>
      <button class="toggle ${window._liveMirror ? 'on' : ''}" id="lsMirrorToggle"
        onclick="this.classList.toggle('on');window._liveMirror=this.classList.contains('on');
          const v=document.getElementById('liveMainVideo');
          if(v) v.style.transform=window._liveMirror?'scaleX(-1)':'scaleX(1)';"></button>
    </div>

    <div class="row">
      <span style="font-size:.82rem;font-weight:700;">🌫️ Arka Plan Bulanık</span>
      <button class="toggle ${window._liveBlur ? 'on' : ''}" id="lsBlurToggle"
        onclick="this.classList.toggle('on');window._liveBlur=this.classList.contains('on');
          const v=document.getElementById('liveMainVideo');
          if(v){const bv=document.getElementById('liveBlurCanvas');if(window._liveBlur){liveStartBlur();}else{liveStopBlur();}}"></button>
    </div>

    <button class="apply-btn" onclick="liveApplyVideoSettings()">✓ Ayarları Uygula</button>
  `;

  document.body.appendChild(panel);

  // Panel dışına tıklayınca kapat
  setTimeout(() => {
    document.addEventListener('click', function _cls(e) {
      if (!document.getElementById('liveSettingsPanel')?.contains(e.target) &&
          e.target.id !== 'liveSettingsBtnTrigger') {
        document.getElementById('liveSettingsPanel')?.remove();
        document.removeEventListener('click', _cls);
      }
    });
  }, 200);
}

async function liveApplyVideoSettings() {
  const resolution = document.getElementById('lsResolution')?.value || '720';
  const fps        = parseInt(document.getElementById('lsFps')?.value) || 30;
  const camId      = document.getElementById('lsCamera')?.value;
  const micId      = document.getElementById('lsMic')?.value;

  showToast('Ayarlar uygulanıyor...');

  try {
    // Mevcut stream'i durdur
    if (window._liveLocalStream) {
      window._liveLocalStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: {
        width:     { ideal: resolution === '1080' ? 1920 : resolution === '720' ? 1280 : resolution === '480' ? 854 : 640 },
        height:    { ideal: parseInt(resolution) },
        frameRate: { ideal: fps }
      },
      audio: true
    };
    if (camId) constraints.video.deviceId = { exact: camId };
    if (micId) constraints.audio = { deviceId: { exact: micId } };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    window._liveLocalStream = newStream;

    // Önizlemeyi güncelle
    const video = document.getElementById('liveMainVideo');
    if (video && video.style.display !== 'none') {
      video.srcObject = newStream;
    }
    // Konferans grid'indeki kendi video'sunu güncelle
    const myTile = document.getElementById('liveConf-' + _cu);
    if (myTile) {
      const myVid = myTile.querySelector('video');
      if (myVid) myVid.srcObject = newStream;
    }

    // Ayna modu koru
    if (window._liveMirror && video) video.style.transform = 'scaleX(-1)';

    document.getElementById('liveSettingsPanel')?.remove();
    showToast('✓ Ayarlar uygulandı — ' + resolution + 'p @ ' + fps + 'fps');
  } catch(e) {
    showToast('Ayar uygulanamadı: ' + (e.message || 'izin reddedildi'));
  }
}

function liveStartBlur() {
  // Canvas tabanlı basit arka plan bulanıklığı
  const video = document.getElementById('liveMainVideo');
  if (!video) return;
  let canvas = document.getElementById('liveBlurCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'liveBlurCanvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    video.parentElement?.insertBefore(canvas, video);
  }
  canvas.style.display = 'block';
  video.style.display = 'none';
  const ctx = canvas.getContext('2d');
  window._liveBlurAnim = setInterval(() => {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    ctx.filter = 'blur(12px)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    // Ortadaki yüz bölgesini net bırak (yaklaşık)
    const cx = canvas.width / 2, cy = canvas.height * .35;
    const r = Math.min(canvas.width, canvas.height) * .28;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.filter = 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, 33);
}

function liveStopBlur() {
  clearInterval(window._liveBlurAnim);
  const canvas = document.getElementById('liveBlurCanvas');
  if (canvas) canvas.style.display = 'none';
  const video = document.getElementById('liveMainVideo');
  if (video) video.style.display = 'block';
}

window.liveShowVideoSettings = liveShowVideoSettings;
window.liveApplyVideoSettings = liveApplyVideoSettings;
window.liveStartBlur = liveStartBlur;
window.liveStopBlur = liveStopBlur;


/* ═══ CONFERENCE.JS (merged) ═══ */
/* ═══════════════════════════════════════════════════════════════
   Nature.co — Konferans & Yayın Sistemi
   • Zoom tarzı: Çok katılımcılı görüntülü/sesli konferans (WebRTC mesh)
   • Kick tarzı: Oyun/ekran yayını (tek yayıncı → çok izleyici)
   Firebase Realtime DB sinyalleşme için kullanılıyor.
═══════════════════════════════════════════════════════════════ */


/* ── STUN/TURN sunucuları ── */
// CONF_ICE conference.js'de tanımlı, burada sadece kullanılıyor
var CONF_ICE = CONF_ICE || {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

/* ── Durum değişkenleri conference.js'de tanımlı ── */

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
// _confTimerInterval ve _confSeconds conference.js'de tanımlı

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
// _origDeskOpenRoom conference.js'de tanımlı
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


/* ═══ SLACK-FEATURES.JS (merged) ═══ */
/* ═══════════════════════════════════════════════════════════════
   Nature.co — Slack Benzeri Gelişmiş Özellikler
   1. Kanal Sekmeleri (Mesajlar / Canvas / Pinler / Dosyalar)
   2. Gelişmiş Mesaj Menüsü (Hatırlat, Okunmadı, Bildirim kapat)
   3. + Oluştur Menüsü (Kanal, DM, Canvas, Liste, Davet)
   4. Kanal Listesi Yönetimi (Bölümler, Filtrele/Sırala)
   5. Tercihler Paneli (Bildirimler, Görünüm, Gizlilik)
═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════
   1. KANAL SEKMELERİ
   Masaüstü sohbet başlığının altına sekme çubuğu
═══════════════════════════════════════ */

let _activeChannelTab = 'messages';

function initChannelTabs(room) {
  const header = document.getElementById('deskChatHeader');
  if (!header) return;
  let bar = document.getElementById('channelTabBar');
  if (bar) bar.remove();

  bar = document.createElement('div');
  bar.id = 'channelTabBar';
  bar.style.cssText = `
    display:flex;align-items:center;gap:0;
    border-bottom:1px solid rgba(255,255,255,.07);
    background:rgba(0,0,0,.1);
    padding:0 16px;
    flex-shrink:0;
    overflow-x:auto;
    scrollbar-width:none;
  `;
  bar.innerHTML = `
    <style>
      #channelTabBar::-webkit-scrollbar{display:none}
      .ch-tab{
        display:flex;align-items:center;gap:6px;padding:9px 14px;
        font-size:.78rem;font-weight:700;color:rgba(255,255,255,.45);
        cursor:pointer;border-bottom:2px solid transparent;
        transition:all .15s;white-space:nowrap;user-select:none;
      }
      .ch-tab:hover{color:rgba(255,255,255,.75);}
      .ch-tab.act{color:var(--accent,#4a8f40);border-bottom-color:var(--accent,#4a8f40);}
    </style>
    <div class="ch-tab act" id="chtab-messages" onclick="switchChannelTab('messages','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Mesajlar
    </div>
    <div class="ch-tab" id="chtab-canvas" onclick="switchChannelTab('canvas','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      Canvas
    </div>
    <div class="ch-tab" id="chtab-pins" onclick="switchChannelTab('pins','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
      Pinler
    </div>
    <div class="ch-tab" id="chtab-files" onclick="switchChannelTab('files','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      Dosyalar
    </div>
    <div class="ch-tab" id="chtab-members" onclick="switchChannelTab('members','${room}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
      Üyeler
    </div>
  `;

  header.insertAdjacentElement('afterend', bar);
  _activeChannelTab = 'messages';
}

function switchChannelTab(tab, room) {
  _activeChannelTab = tab;
  document.querySelectorAll('.ch-tab').forEach(t => t.classList.remove('act'));
  const el = document.getElementById('chtab-' + tab);
  if (el) el.classList.add('act');

  const chatArea = document.getElementById('deskChatArea');
  const panelExtra = document.getElementById('deskChatTabPanel');

  if (tab === 'messages') {
    if (chatArea) chatArea.style.display = 'flex';
    if (panelExtra) panelExtra.remove();
    return;
  }

  if (chatArea) chatArea.style.display = 'none';
  let panel = document.getElementById('deskChatTabPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'deskChatTabPanel';
    panel.style.cssText = 'flex:1;overflow-y:auto;background:var(--bg,#0a120a);';
    const main = document.getElementById('deskMain');
    if (main) main.appendChild(panel);
  }

  if (tab === 'canvas')   _renderCanvasTab(panel, room);
  if (tab === 'pins')     _renderPinsTab(panel, room);
  if (tab === 'files')    _renderFilesTab(panel, room);
  if (tab === 'members')  _renderMembersTab(panel, room);
}

function _renderCanvasTab(panel, room) {
  panel.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding:28px 24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <div style="font-size:1.1rem;font-weight:900;color:var(--text-hi,#fff);">📋 Canvas</div>
          <div style="font-size:.78rem;color:var(--muted,#666);margin-top:3px;">Bu kanalın ortak not defteri</div>
        </div>
        <button onclick="saveCanvasContent('${room}')"
          style="background:rgba(74,143,64,.2);border:1px solid rgba(74,143,64,.4);color:#6dbf67;
                 border-radius:10px;padding:7px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">
          💾 Kaydet
        </button>
      </div>
      <div id="canvasEditor" contenteditable="true" spellcheck="false"
        style="min-height:400px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
               border-radius:14px;padding:20px;color:var(--text-hi,#fff);font-size:.9rem;line-height:1.7;
               outline:none;transition:border .2s;"
        onfocus="this.style.borderColor='rgba(74,143,64,.4)'"
        onblur="this.style.borderColor='rgba(255,255,255,.08)'"
        placeholder="Buraya not yaz...">Yükleniyor...</div>
      <div style="margin-top:8px;font-size:.72rem;color:rgba(255,255,255,.2);text-align:right;" id="canvasSaveStatus"></div>
    </div>`;
  _loadCanvas(room);
}

async function _loadCanvas(room) {
  const el = document.getElementById('canvasEditor');
  if (!el || !_db) return;
  try {
    const snap = await dbRef('canvases/' + room + '/content').once('value');
    el.innerHTML = snap.val() || '<p style="color:rgba(255,255,255,.3);">Henüz bir şey yazılmamış. Yazmaya başla...</p>';
  } catch(e) {}
}

async function saveCanvasContent(room) {
  const el = document.getElementById('canvasEditor');
  if (!el || !_db) return;
  await dbRef('canvases/' + room).set({ content: el.innerHTML, updatedBy: _cu, updatedAt: Date.now() });
  const status = document.getElementById('canvasSaveStatus');
  if (status) { status.textContent = '✓ Kaydedildi'; setTimeout(() => { status.textContent = ''; }, 2000); }
}

function _renderPinsTab(panel, room) {
  panel.innerHTML = `<div style="padding:20px 24px;"><div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">📌 Sabitlenmiş Mesajlar</div><div id="pinsTabList" style="display:flex;flex-direction:column;gap:10px;"><div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Yükleniyor...</div></div></div>`;
  if (!_db) return;
  dbRef('pinned/' + room).once('value').then(snap => {
    const list = document.getElementById('pinsTabList');
    if (!list) return;
    const data = snap.val();
    if (!data) { list.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Henüz sabitlenmiş mesaj yok.</div>'; return; }
    list.innerHTML = Object.entries(data).map(([k, v]) => `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:24px;height:24px;border-radius:50%;background:${strColor(v.user||'')};display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:900;color:#fff;">${initials(v.user||'')}</div>
          <span style="font-weight:800;font-size:.8rem;color:var(--text-hi,#fff);">${esc(v.user||'')}</span>
          <span style="font-size:.72rem;color:var(--muted);">${v.ts ? new Date(v.ts).toLocaleDateString('tr-TR') : ''}</span>
        </div>
        <div style="font-size:.85rem;color:rgba(255,255,255,.8);line-height:1.5;">${esc(v.text||'')}</div>
      </div>`).join('');
  });
}

function _renderFilesTab(panel, room) {
  panel.innerHTML = `<div style="padding:20px 24px;"><div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">📁 Dosyalar</div><div id="filesTabList" style="display:flex;flex-direction:column;gap:8px;"><div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Yükleniyor...</div></div></div>`;
  if (!_db) return;
  dbRef('msgs/' + room).orderByChild('ts').limitToLast(200).once('value').then(snap => {
    const list = document.getElementById('filesTabList');
    if (!list) return;
    const msgs = snap.val() || {};
    const files = Object.values(msgs).filter(m => m.file);
    if (!files.length) { list.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:20px 0;">Bu kanalda henüz dosya paylaşılmamış.</div>'; return; }
    list.innerHTML = files.reverse().map(m => `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;cursor:pointer;" onclick="zoomImg&&m.file.type?.startsWith('image/')&&zoomImg('${m.file.data}')">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(74,143,64,.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">${m.file.type?.startsWith('image/') ? '🖼️' : m.file.type?.startsWith('video/') ? '🎬' : '📄'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-hi,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(m.file.name||'Dosya')}</div>
          <div style="font-size:.7rem;color:var(--muted);">${esc(m.user||'')} · ${m.ts ? new Date(m.ts).toLocaleDateString('tr-TR') : ''}</div>
        </div>
        <div style="font-size:.7rem;color:var(--muted);">${m.file.size ? Math.round(m.file.size/1024)+'KB' : ''}</div>
      </div>`).join('');
  });
}

function _renderMembersTab(panel, room) {
  panel.innerHTML = `<div style="padding:20px 24px;"><div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">👥 Üyeler</div><div id="membersTabList" style="display:flex;flex-direction:column;gap:6px;"></div></div>`;
  if (!_db) return;
  dbRef('online').once('value').then(snap => {
    const list = document.getElementById('membersTabList');
    if (!list) return;
    const online = snap.val() || {};
    list.innerHTML = Object.keys(online).map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background='transparent'" onclick="openDM&&openDM('${u}')">
        <div style="position:relative;">
          <div style="width:32px;height:32px;border-radius:50%;background:${strColor(u)};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:#fff;">${initials(u)}</div>
          <div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#2ecc71;border:2px solid var(--bg,#0a120a);"></div>
        </div>
        <div>
          <div style="font-size:.85rem;font-weight:700;color:var(--text-hi,#fff);">${esc(u)}</div>
          <div style="font-size:.7rem;color:#2ecc71;">Çevrimiçi</div>
        </div>
      </div>`).join('');
  });
}

/* ═══════════════════════════════════════
   2. GELİŞMİŞ MESAJ MENÜSÜ - Mevcut menüyü genişlet
═══════════════════════════════════════ */

// Orijinal fonksiyonu kaydedip genişletiyoruz
// _origShowMsgMenu slack-features.js'de tanımlı - burada window'dan al
window._origShowMsgMenuDesk = window.showMsgMenuAtBtn;
window.showMsgMenuAtBtn = function(e) {
  e.stopPropagation();
  e.preventDefault();
  document.removeEventListener('click', window._closeCtx);

  const btn = e.currentTarget || e.target.closest('button') || e.target;
  const room = btn.dataset.room;
  const key  = btn.dataset.key;
  const own  = btn.dataset.own === 'true';
  const text = btn.dataset.text || '';

  let menu = document.getElementById('msgCtxMenu');
  if (!menu) { menu = document.createElement('div'); menu.id = 'msgCtxMenu'; }
  document.body.appendChild(menu);

  const sep = `<div style="height:1px;background:var(--border,rgba(255,255,255,.08));margin:4px 6px;"></div>`;

  let html = `
    <div class="ctx-item" onclick="event.stopPropagation();showReactMenu(event,'${room}','${key}')">
      <span class="ctx-ic">😀</span> Tepki Ekle
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();replyToMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></span> Yanıtla
    </div>
    ${sep}
    <div class="ctx-item" onclick="event.stopPropagation();slackMarkUnread('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span> Okunmadı İşaretle
      <span class="ctx-kbd">U</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();slackRemindMe('${room}','${key}',${JSON.stringify(text.slice(0,80))});_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></span> Hatırlat
      <span class="ctx-ic" style="margin-left:auto;opacity:.5;font-size:.7rem;">›</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();slackMuteThread('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="2" y1="2" x2="22" y2="22"/></svg></span> Yanıt Bildirimlerini Kapat
    </div>
    ${sep}
    <div class="ctx-item" onclick="event.stopPropagation();slackCopyMsgLink('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> Mesaj Linkini Kopyala
      <span class="ctx-kbd">L</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();copyMsgText(${JSON.stringify(text)});_closeCtx()">
      <span class="ctx-ic">T</span> Mesajı Kopyala
      <span class="ctx-kbd">⌘C</span>
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();pinMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg></span> Sabitle
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();saveMessage&&saveMessage('${room}','${key}',${JSON.stringify(text.slice(0,200))},_cu||'');_closeCtx()">
      <span class="ctx-ic">🔖</span> Kaydet
    </div>
    <div class="ctx-item" onclick="event.stopPropagation();openThreadPanel&&openThreadPanel('${room}','${key}',${JSON.stringify(text.slice(0,100))},_cu||'');_closeCtx()">
      <span class="ctx-ic">💬</span> Konu Aç (Thread)
    </div>`;

  if (own) {
    html += `${sep}
    <div class="ctx-item" onclick="event.stopPropagation();startEditMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Mesajı Düzenle
      <span class="ctx-kbd">E</span>
    </div>`;
  }

  if (own || _isAdmin) {
    html += `${sep}
    <div class="ctx-item danger" onclick="event.stopPropagation();deleteMsg('${room}','${key}');_closeCtx()">
      <span class="ctx-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></span> Mesajı Sil...
      <span class="ctx-kbd">delete</span>
    </div>`;
  }

  menu.innerHTML = `<style>
    .ctx-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:.82rem;color:rgba(255,255,255,.82);transition:background .12s;white-space:nowrap;}
    .ctx-item:hover{background:rgba(255,255,255,.08);}
    .ctx-item.danger{color:#e05555;}
    .ctx-item.danger:hover{background:rgba(224,85,85,.12);}
    .ctx-ic{width:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.85rem;}
    .ctx-kbd{margin-left:auto;font-size:.68rem;color:rgba(255,255,255,.3);font-family:monospace;padding-left:12px;}
  </style>` + html;

  const rect = btn.getBoundingClientRect();
  const menuW = 240;
  let x = rect.right + 8;
  let y = rect.top;
  if (x + menuW > window.innerWidth) x = rect.left - menuW - 8;
  if (x < 8) x = 8;
  const menuH = menu.querySelectorAll('.ctx-item').length * 36 + 30;
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
  if (y < 8) y = 8;

  menu.style.cssText = `display:block;position:fixed;left:${x}px;top:${y}px;
    background:var(--surface2,#1e2428);border:1px solid rgba(255,255,255,.1);
    border-radius:14px;padding:6px;z-index:9999999;
    box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:220px;`;

  setTimeout(() => document.addEventListener('click', window._closeCtx, { once: true }), 200);
};

/* Yeni mesaj menüsü aksiyonları */
function slackMarkUnread(room, key) {
  if (!_db || !_cu) return;
  dbRef('reads/' + _cu + '/' + room).remove();
  showToast('📬 Okunmadı olarak işaretlendi');
}

function slackCopyMsgLink(room, key) {
  const link = `${location.origin}${location.pathname}#room=${room}&msg=${key}`;
  navigator.clipboard.writeText(link).then(() => showToast('🔗 Link kopyalandı!'));
}

function slackRemindMe(room, key, text) {
  const opts = [
    { label: '20 dakika sonra', ms: 20 * 60000 },
    { label: '1 saat sonra',    ms: 60 * 60000 },
    { label: '3 saat sonra',    ms: 3 * 60 * 60000 },
    { label: 'Yarın sabah',     ms: _nextMorningMs() },
    { label: 'Gelecek hafta',   ms: 7 * 24 * 60 * 60000 },
  ];
  const menu = document.createElement('div');
  menu.style.cssText = `position:fixed;z-index:99999999;background:var(--surface2,#1e2428);
    border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:6px;
    box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:200px;`;
  menu.innerHTML = `<div style="padding:6px 12px 8px;font-size:.75rem;font-weight:800;color:rgba(255,255,255,.4);letter-spacing:.05em;">HATIRLATICI EKLE</div>` +
    opts.map(o => `<div class="ctx-item" onclick="this.closest('div[style]').remove();_saveReminder('${room}','${key}',${JSON.stringify(text)},${Date.now() + o.ms})"
      style="display:flex;align-items:center;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:.82rem;color:rgba(255,255,255,.82);transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background='transparent'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      ${o.label}</div>`).join('');
  // Konumlandır
  menu.style.top = '50%'; menu.style.left = '50%';
  menu.style.transform = 'translate(-50%,-50%)';
  document.body.appendChild(menu);
  setTimeout(() => { const close = () => menu.remove(); document.addEventListener('click', close, { once: true }); }, 200);
}

function _nextMorningMs() {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow - now;
}

async function _saveReminder(room, key, text, ts) {
  if (!_db || !_cu) return;
  await dbRef('reminders/' + _cu).push({ room, key, text: text.slice(0, 100), ts, createdAt: Date.now() });
  showToast('⏰ Hatırlatıcı ayarlandı!');
}

function slackMuteThread(room, key) {
  if (!_db || !_cu) return;
  dbRef('mutedThreads/' + _cu + '/' + room + '/' + key).set(true);
  showToast('🔕 Bu konunun bildirimleri kapatıldı');
}

/* ═══════════════════════════════════════
   3. + OLUŞTUR MENÜSÜ
═══════════════════════════════════════ */

function showCreateMenu(anchorEl) {
  const existing = document.getElementById('createMenuPopup');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'createMenuPopup';
  popup.style.cssText = `
    position:fixed;z-index:999999;
    background:var(--surface2,#1e2428);
    border:1px solid rgba(255,255,255,.1);
    border-radius:16px;padding:8px;
    box-shadow:0 16px 48px rgba(0,0,0,.8);
    min-width:280px;font-family:inherit;
  `;

  const items = [
    { icon: '💬', color: '#7b68ee', label: 'Mesaj', desc: 'DM veya kanalda konuşma başlat', action: `openGlobalSearch&&openGlobalSearch()` },
    { icon: '#', color: '#4a8f40', label: 'Kanal', desc: 'Konu bazlı grup konuşması', action: `showCreateChannelModal&&showCreateChannelModal()` },
    { icon: '🎧', color: '#2ecc71', label: 'Huddle (Sesli)', desc: 'Hızlı sesli/görüntülü sohbet', action: `liveStartConference&&liveStartConference()` },
    { icon: '📋', color: '#3498db', label: 'Canvas', desc: 'Ortak içerik oluştur ve paylaş', action: `deskNav&&deskNav('home')` },
    { icon: '📋', color: '#e67e22', label: 'Liste', desc: 'Proje yönet ve takip et', action: `deskNav&&deskNav('home')` },
    { icon: '⚡', color: '#e05555', label: 'İş Akışı', desc: 'Günlük görevleri otomatize et', action: `showWorkflowModal&&showWorkflowModal()` },
  ];

  popup.innerHTML = `
    <div style="padding:6px 12px 10px;font-size:.82rem;font-weight:900;color:rgba(255,255,255,.9);">Oluştur</div>
    ${items.map(it => `
      <div onclick="${it.action};document.getElementById('createMenuPopup')?.remove()"
        style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
        onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
        <div style="width:38px;height:38px;border-radius:10px;background:${it.color}22;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:900;color:${it.color};flex-shrink:0;">${it.icon}</div>
        <div>
          <div style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">${it.label}</div>
          <div style="font-size:.72rem;color:var(--muted,#666);margin-top:1px;">${it.desc}</div>
        </div>
      </div>`).join('')}
    <div style="height:1px;background:rgba(255,255,255,.07);margin:6px 8px;"></div>
    <div onclick="showInviteModal&&showInviteModal();document.getElementById('createMenuPopup')?.remove()"
      style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
      <span style="font-size:.85rem;color:rgba(255,255,255,.7);font-weight:700;">İnsanları Davet Et</span>
    </div>`;

  // Konumlandır — viewport taşmasını önle
  document.body.appendChild(popup);

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const ph = popup.offsetHeight || 380;   // gerçek yükseklik
    const pw = popup.offsetWidth  || 288;

    // Yukarı mı aşağı mı açılsın?
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove >= ph + 8 || spaceAbove > spaceBelow) {
      // Yukarı aç — butona dayalı, ekran üstüne taşmasın
      const bVal = Math.max(window.innerHeight - rect.top + 8, 8);
      popup.style.bottom = bVal + 'px';
      popup.style.top = 'auto';
    } else {
      // Aşağı aç
      popup.style.top  = (rect.bottom + 8) + 'px';
      popup.style.bottom = 'auto';
    }

    // Yatay — ekran sağına taşmasın
    const leftVal = Math.min(rect.left, window.innerWidth - pw - 12);
    popup.style.left = Math.max(8, leftVal) + 'px';
  } else {
    popup.style.top = '50%'; popup.style.left = '50%';
    popup.style.transform = 'translate(-50%,-50%)';
  }

  // Ekran dışına çıkıyor mu? Son güvenlik kontrolü
  requestAnimationFrame(() => {
    const pr = popup.getBoundingClientRect();
    if (pr.top < 8) popup.style.top = '8px';
    if (pr.bottom > window.innerHeight - 8) {
      popup.style.bottom = '8px';
      popup.style.top = 'auto';
    }
    if (pr.right > window.innerWidth - 8) popup.style.left = (window.innerWidth - pr.width - 8) + 'px';
  });

  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 200);
}

/* ═══════════════════════════════════════
   4. KANAL LİSTESİ YÖNETİMİ
   Sidebar başlığına yönetim butonu
═══════════════════════════════════════ */

function showChannelListMenu(anchorEl) {
  const existing = document.getElementById('chanListMenu');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'chanListMenu';
  popup.style.cssText = `
    position:fixed;z-index:999999;background:var(--surface2,#1e2428);
    border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:8px;
    box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:290px;font-family:inherit;
  `;

  popup.innerHTML = `
    <div onclick="showFilterSortModal();document.getElementById('chanListMenu')?.remove()"
      style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <span style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">Filtrele ve Sırala</span>
      <span style="font-size:.75rem;color:var(--muted);">Özel ›</span>
    </div>
    <div style="height:1px;background:rgba(255,255,255,.07);margin:4px 6px;"></div>
    <div onclick="showCreateSectionModal();document.getElementById('chanListMenu')?.remove()"
      style="padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">Bölüm Oluştur</span>
      </div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:3px;padding-left:23px;">Konuşmaları konuya göre düzenle</div>
    </div>
    <div onclick="showManageChannelsModal();document.getElementById('chanListMenu')?.remove()"
      style="padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <div style="font-size:.85rem;font-weight:800;color:var(--text-hi,#fff);">Kanal Listesini Yönet</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:3px;">Sırala, bölümler ekle, kanalları bırak</div>
    </div>
    <div style="height:1px;background:rgba(255,255,255,.07);margin:4px 6px;"></div>
    <div style="padding:6px 12px;font-size:.7rem;color:var(--muted);font-weight:700;letter-spacing:.05em;">HIZLI İPUÇLARI</div>
    <div onclick="toggleMutedChannels();document.getElementById('chanListMenu')?.remove()"
      style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3"/></svg>
      <span style="font-size:.82rem;color:rgba(255,255,255,.75);">Susturulan Konuşmaları Göster</span>
    </div>
    <div onclick="showPreferencesModal();document.getElementById('chanListMenu')?.remove()"
      style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;transition:background .12s;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
      <span style="font-size:.82rem;color:rgba(255,255,255,.75);">Varsayılanları Düzenle</span>
    </div>`;

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    popup.style.top = rect.bottom + 6 + 'px';
    popup.style.left = rect.left + 'px';
  }
  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 200);
}

/* Susturulan kanalları göster/gizle */
// _showMuted slack-features.js'de tanımlı
function toggleMutedChannels() {
  _showMuted = !_showMuted;
  document.querySelectorAll('.room-item.muted').forEach(el => {
    el.style.display = _showMuted ? '' : 'none';
  });
  showToast(_showMuted ? '👁 Susturulanlar gösteriliyor' : '🔕 Susturulanlar gizlendi');
}

/* Bölüm oluştur */
function showCreateSectionModal() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--surface2,#1e2428);border-radius:18px;padding:24px;width:340px;box-shadow:0 20px 60px rgba(0,0,0,.8);">
      <div style="font-size:1rem;font-weight:900;color:var(--text-hi,#fff);margin-bottom:16px;">Bölüm Oluştur</div>
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;">Bölüm adı</div>
      <input id="sectionNameInput" type="text" placeholder="ör: Projeler, Takım..."
        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
               border-radius:10px;padding:10px 14px;color:var(--text-hi,#fff);font-size:.88rem;outline:none;font-family:inherit;"
        onfocus="this.style.borderColor='rgba(74,143,64,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'">
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.7);padding:8px 16px;border-radius:9px;cursor:pointer;font-size:.82rem;font-weight:700;">İptal</button>
        <button onclick="createSection(document.getElementById('sectionNameInput').value);this.closest('[style*=fixed]').remove()"
          style="background:rgba(74,143,64,.3);border:1px solid rgba(74,143,64,.5);color:#6dbf67;padding:8px 18px;border-radius:9px;cursor:pointer;font-size:.82rem;font-weight:800;">Oluştur</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  setTimeout(() => document.getElementById('sectionNameInput')?.focus(), 100);
}

async function createSection(name) {
  if (!name?.trim() || !_db || !_cu) return;
  await dbRef('sections/' + _cu).push({ name: name.trim(), createdAt: Date.now() });
  showToast('📂 "' + name + '" bölümü oluşturuldu');
}

/* ═══════════════════════════════════════
   5. TERCİHLER PANELİ
═══════════════════════════════════════ */

// _prefTab slack-features.js'de tanımlı

function showPreferencesModal() {
  const existing = document.getElementById('prefsModal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'prefsModal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999999;
    display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit;
  `;

  modal.innerHTML = `
    <div style="background:var(--surface2,#1e2428);border-radius:20px;width:100%;max-width:700px;max-height:85vh;display:flex;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.9);">
      <!-- Sol menü -->
      <div style="width:200px;flex-shrink:0;background:rgba(0,0,0,.2);padding:16px 8px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.07);">
        <div style="font-size:.95rem;font-weight:900;color:var(--text-hi,#fff);padding:6px 12px 14px;">Tercihler</div>
        ${[
          { id: 'notifications', label: 'Bildirimler', icon: '🔔' },
          { id: 'appearance',    label: 'Görünüm',     icon: '🎨' },
          { id: 'messages',      label: 'Mesajlar & Medya', icon: '💬' },
          { id: 'privacy',       label: 'Gizlilik',    icon: '🔒' },
          { id: 'audio',         label: 'Ses & Video', icon: '🎧' },
          { id: 'accessibility', label: 'Erişilebilirlik', icon: '♿' },
          { id: 'advanced',      label: 'Gelişmiş',    icon: '⚙️' },
        ].map(t => `
          <div class="pref-tab-btn" id="ptab-${t.id}" onclick="switchPrefTab('${t.id}')"
            style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:.82rem;font-weight:700;color:rgba(255,255,255,.6);transition:all .12s;margin-bottom:2px;${t.id === _prefTab ? 'background:rgba(74,143,64,.2);color:#6dbf67;' : ''}">
            <span>${t.icon}</span>${t.label}
          </div>`).join('')}
      </div>
      <!-- Sağ içerik -->
      <div style="flex:1;overflow-y:auto;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div id="prefTitle" style="font-size:1.1rem;font-weight:900;color:var(--text-hi,#fff);">Bildirimler</div>
          <div onclick="document.getElementById('prefsModal').remove()"
            style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.5);font-size:1.2rem;transition:background .12s;"
            onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='transparent'">✕</div>
        </div>
        <div id="prefContent"></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  switchPrefTab(_prefTab);
}

function switchPrefTab(tab) {
  _prefTab = tab;
  document.querySelectorAll('.pref-tab-btn').forEach(b => {
    b.style.background = 'transparent'; b.style.color = 'rgba(255,255,255,.6)';
  });
  const active = document.getElementById('ptab-' + tab);
  if (active) { active.style.background = 'rgba(74,143,64,.2)'; active.style.color = '#6dbf67'; }

  const titles = { notifications: 'Bildirimler', appearance: 'Görünüm', messages: 'Mesajlar & Medya', privacy: 'Gizlilik', audio: 'Ses & Video', accessibility: 'Erişilebilirlik', advanced: 'Gelişmiş' };
  const titleEl = document.getElementById('prefTitle');
  if (titleEl) titleEl.textContent = titles[tab] || tab;

  const content = document.getElementById('prefContent');
  if (!content) return;

  if (tab === 'notifications') content.innerHTML = _prefNotificationsHTML();
  else if (tab === 'appearance') content.innerHTML = _prefAppearanceHTML();
  else if (tab === 'messages') content.innerHTML = _prefMessagesHTML();
  else if (tab === 'privacy') content.innerHTML = _prefPrivacyHTML();
  else if (tab === 'audio') content.innerHTML = _prefAudioHTML();
  else if (tab === 'accessibility') content.innerHTML = _prefAccessibilityHTML();
  else if (tab === 'advanced') content.innerHTML = _prefAdvancedHTML();
}

function _prefSection(title, desc = '') {
  return `<div style="margin-bottom:6px;"><div style="font-size:.88rem;font-weight:800;color:var(--text-hi,#fff);">${title}</div>${desc ? `<div style="font-size:.75rem;color:var(--muted);margin-top:3px;">${desc}</div>` : ''}</div>`;
}

function _prefToggle(label, key, defaultVal = true) {
  const stored = localStorage.getItem('pref_' + key);
  const checked = stored !== null ? stored === 'true' : defaultVal;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <span style="font-size:.83rem;color:rgba(255,255,255,.8);">${label}</span>
      <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="savePref('${key}',this.checked)"
          style="opacity:0;width:0;height:0;position:absolute;">
        <span style="position:absolute;inset:0;background:${checked ? 'rgba(74,143,64,.7)' : 'rgba(255,255,255,.15)'};border-radius:22px;transition:all .2s;"></span>
        <span style="position:absolute;width:16px;height:16px;background:#fff;border-radius:50%;top:3px;transition:.2s;left:${checked ? '21px' : '3px'};"></span>
      </label>
    </div>`;
}

function savePref(key, value) {
  localStorage.setItem('pref_' + key, value);
  applyPrefs();
}

function applyPrefs() {
  // Mesaj sesi
  if (localStorage.getItem('pref_msgSound') === 'false') {
    window._prefNoMsgSound = true;
  } else {
    window._prefNoMsgSound = false;
  }
  // Kompakt mod
  if (localStorage.getItem('pref_compactMode') === 'true') {
    document.body.classList.add('compact-mode');
  } else {
    document.body.classList.remove('compact-mode');
  }
  // Link önizlemesi
  window._prefNoLinkPreview = localStorage.getItem('pref_linkPreview') === 'false';
}

function _prefNotificationsHTML() {
  return `
    ${_prefSection('Bildirim Yöntemi', 'Masaüstü ve mobil cihazlarda bildirim görünümü')}
    ${_prefToggle('Masaüstü bildirimleri', 'desktopNotif', true)}
    ${_prefToggle('Mobil bildirimler', 'mobileNotif', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Ne Hakkında Bildirim Al')}
    ${_prefToggle('Tüm yeni mesajlar', 'notifAll', true)}
    ${_prefToggle('Bahsetmeler (@kullanıcı)', 'notifMention', true)}
    ${_prefToggle('Konu yanıtları (thread)', 'notifThread', true)}
    ${_prefToggle('Yeni sesli/görüntülü davetler', 'notifCall', true)}
    ${_prefToggle('Arkadaşlık istekleri', 'notifFriend', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Ses')}
    ${_prefToggle('Yeni mesaj sesi', 'msgSound', true)}
    ${_prefToggle('Arama sesi', 'callSound', true)}`;
}

function _prefAppearanceHTML() {
  return `
    ${_prefSection('Tema')}
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      ${[
        { id: 'dark', label: '🌙 Koyu', bg: '#0a0f0a' },
        { id: 'darker', label: '⬛ Siyah', bg: '#050505' },
        { id: 'forest', label: '🌲 Orman', bg: '#0a150a' },
        { id: 'midnight', label: '🌌 Gece', bg: '#080818' },
      ].map(t => `
        <div onclick="applyTheme('${t.id}')"
          style="flex:1;min-width:100px;padding:12px;border-radius:12px;cursor:pointer;background:${t.bg};
                 border:2px solid ${localStorage.getItem('theme') === t.id ? '#4a8f40' : 'rgba(255,255,255,.1)'};
                 text-align:center;font-size:.78rem;color:#fff;transition:all .15s;">
          ${t.label}
        </div>`).join('')}
    </div>
    ${_prefSection('Mesaj Yoğunluğu')}
    ${_prefToggle('Kompakt mod (mesajlar arası boşluğu azalt)', 'compactMode', false)}
    ${_prefToggle('Avatar göster', 'showAvatars', true)}
    ${_prefToggle('Zaman damgası göster', 'showTimestamps', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Yazı Tipi')}
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
      <span style="font-size:.8rem;color:rgba(255,255,255,.6);">A</span>
      <input type="range" min="12" max="18" value="${parseInt(localStorage.getItem('pref_fontSize') || '14')}"
        oninput="changeFontSize(this.value)"
        style="flex:1;accent-color:#4a8f40;">
      <span style="font-size:1rem;color:rgba(255,255,255,.6);">A</span>
    </div>`;
}

function applyTheme(themeId) {
  localStorage.setItem('theme', themeId);
  const themes = { dark: '#0a0f0a', darker: '#050505', forest: '#0a150a', midnight: '#080818' };
  document.documentElement.style.setProperty('--bg', themes[themeId] || '#0a0f0a');
  showToast('🎨 Tema uygulandı');
}

function changeFontSize(size) {
  localStorage.setItem('pref_fontSize', size);
  document.documentElement.style.setProperty('--chat-font-size', size + 'px');
}

function _prefMessagesHTML() {
  return `
    ${_prefSection('Mesaj Gösterimi')}
    ${_prefToggle('Link önizlemesi göster', 'linkPreview', true)}
    ${_prefToggle('Görselleri otomatik göster', 'autoImages', true)}
    ${_prefToggle('Gif otomatik oynat', 'autoGif', true)}
    ${_prefToggle('Emoji büyüt (tek emoji mesajlarda)', 'bigEmoji', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Mesaj Yazma')}
    ${_prefToggle('Enter ile gönder (Shift+Enter yeni satır)', 'enterSend', true)}
    ${_prefToggle('Yazılıyor... göstergesi aktif', 'typingIndicator', true)}
    ${_prefToggle('Mesaj okundu bildirimi', 'readReceipts', true)}`;
}

function _prefPrivacyHTML() {
  return `
    ${_prefSection('Profil Gizliliği')}
    ${_prefToggle('Çevrimiçi durumunu göster', 'showOnline', true)}
    ${_prefToggle('Son görülme zamanını göster', 'showLastSeen', true)}
    ${_prefToggle('Profil fotoğrafını herkese göster', 'publicPhoto', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('İletişim')}
    ${_prefToggle('Sadece arkadaşlardan mesaj al', 'friendsOnlyDM', false)}
    ${_prefToggle('Grup davetlerini engelle', 'blockGroupInvites', false)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Veri & Güvenlik')}
    <div style="padding:12px 0;">
      <button onclick="exportMyData()"
        style="background:rgba(91,155,213,.15);border:1px solid rgba(91,155,213,.3);color:#90caf9;
               border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;margin-right:8px;">
        📤 Verilerimi İndir
      </button>
      <button onclick="confirmDeleteAccount()"
        style="background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.3);color:#e05555;
               border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">
        🗑 Hesabı Sil
      </button>
    </div>`;
}

function _prefAudioHTML() {
  return `
    ${_prefSection('Ses Ayarları')}
    ${_prefToggle('Giriş sesi çal', 'loginSound', false)}
    ${_prefToggle('Çıkış sesi çal', 'logoutSound', false)}
    ${_prefToggle('Bildirim sesi çal', 'notifSound', true)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Ses Seviyesi')}
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
      <span style="font-size:1rem;">🔈</span>
      <input type="range" min="0" max="100" value="${parseInt(localStorage.getItem('pref_volume') || '80')}"
        oninput="localStorage.setItem('pref_volume',this.value)"
        style="flex:1;accent-color:#4a8f40;">
      <span style="font-size:1rem;">🔊</span>
    </div>
    <div style="margin-top:16px;"></div>
    ${_prefSection('Video')}
    ${_prefToggle('Konferansta kamerayı varsayılan aç', 'cameraDefault', true)}
    ${_prefToggle('Konferansta mikrofonu varsayılan aç', 'micDefault', true)}
    ${_prefToggle('Gürültü engelleme', 'noiseCancellation', false)}`;
}

function _prefAccessibilityHTML() {
  return `
    ${_prefSection('Görsel')}
    ${_prefToggle('Yüksek kontrast modu', 'highContrast', false)}
    ${_prefToggle('Animasyonları azalt', 'reduceMotion', false)}
    ${_prefToggle('Büyük yazı tipi', 'largeText', false)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Klavye Kısayolları')}
    <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">
      ${[
        ['⌘K', 'Global arama'],['⌘N', 'Yeni mesaj'],['⌘/', 'Kısayolları göster'],
        ['Esc', 'Modalı kapat'],['Enter', 'Gönder'],['Shift+Enter', 'Yeni satır'],
      ].map(([k, d]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <span style="font-size:.82rem;color:rgba(255,255,255,.7);">${d}</span>
          <kbd style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:2px 8px;font-size:.72rem;color:rgba(255,255,255,.6);font-family:monospace;">${k}</kbd>
        </div>`).join('')}
    </div>`;
}

function _prefAdvancedHTML() {
  return `
    ${_prefSection('Geliştirici')}
    ${_prefToggle('Hata ayıklama mesajlarını göster', 'debugMode', false)}
    ${_prefToggle('Performans istatistikleri', 'perfStats', false)}
    <div style="margin-top:16px;"></div>
    ${_prefSection('Önbellek')}
    <div style="padding:10px 0;">
      <button onclick="clearAppCache()"
        style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);
               border-radius:10px;padding:8px 16px;font-size:.8rem;font-weight:800;cursor:pointer;">
        🗑 Önbelleği Temizle
      </button>
    </div>
    <div style="margin-top:16px;"></div>
    ${_prefSection('Uygulama Hakkında')}
    <div style="font-size:.8rem;color:var(--muted);line-height:1.8;">
      <div>Nature.co — Doğa Temalı Sosyal Platform</div>
      <div>Sürüm: 2.0.0</div>
      <div>Firebase Realtime DB entegrasyonu</div>
    </div>`;
}

function clearAppCache() {
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
  showToast('🗑 Önbellek temizlendi');
}

function exportMyData() {
  if (!_cu) return;
  showToast('📤 Veri hazırlanıyor...');
}

function confirmDeleteAccount() {
  if (confirm('Hesabını silmek istediğine emin misin? Bu işlem geri alınamaz.')) {
    showToast('Hesap silme işlemi için destek ile iletişime geç.');
  }
}

/* ═══════════════════════════════════════
   6. SIDEBAR'A BUTONLARI EKLE
═══════════════════════════════════════ */

function injectSidebarButtons() {
  // Butonlar artık doğrudan HTML'de mevcut - bu fonksiyon artık gerekli değil
  return;
  const header = document.getElementById('deskSidebarHeader');
  if (!header || document.getElementById('sidebarExtraBtns')) return;

  const btns = document.createElement('div');
  btns.id = 'sidebarExtraBtns';
  btns.style.cssText = 'display:flex;align-items:center;gap:4px;padding:6px 12px 2px;flex-shrink:0;';
  btns.innerHTML = `
    <!-- Oluştur butonu -->
    <button onclick="showCreateMenu(this)" title="Oluştur"
      style="display:flex;align-items:center;gap:6px;background:rgba(74,143,64,.15);border:1px solid rgba(74,143,64,.3);
             color:#6dbf67;border-radius:9px;padding:5px 12px;font-size:.75rem;font-weight:800;cursor:pointer;transition:all .15s;flex:1;"
      onmouseover="this.style.background='rgba(74,143,64,.25)'" onmouseout="this.style.background='rgba(74,143,64,.15)'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Oluştur
    </button>
    <!-- Liste yönet -->
    <button onclick="showChannelListMenu(this)" title="Kanal Listesini Yönet"
      style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;
             border:1px solid rgba(255,255,255,.1);border-radius:9px;color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;flex-shrink:0;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    </button>
    <!-- Tercihler -->
    <button onclick="showPreferencesModal()" title="Tercihler"
      style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;
             border:1px solid rgba(255,255,255,.1);border-radius:9px;color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;flex-shrink:0;"
      onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='transparent'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
    </button>`;

  header.insertAdjacentElement('afterend', btns);
}

/* ═══════════════════════════════════════
   7. SOHBET ODASI DEĞİŞİNCE SEKMELERİ BAŞLAT
═══════════════════════════════════════ */

window._origDeskOpenRoom2Desk = window.deskOpenRoom;
window.deskOpenRoom = function(room) {
  if (_origDeskOpenRoom2Desk) _origDeskOpenRoom2Desk.apply(this, arguments);
  const r = room || window._deskRoom;
  if (r) setTimeout(() => initChannelTabs(r), 150);
};

// Mevcut açık oda için de - birden fazla deneme (DOM geç yüklenebilir)
function _tryInjectSidebar(attempt) {
  const header = document.getElementById('deskSidebarHeader');
  if (header) {
    injectSidebarButtons();
    if (window._deskRoom) initChannelTabs(window._deskRoom);
    applyPrefs();
  } else if (attempt < 10) {
    setTimeout(() => _tryInjectSidebar(attempt + 1), 500);
  }
}
setTimeout(() => _tryInjectSidebar(0), 800);

// deskNav hook - sidebar her göründüğünde inject et
window._origDeskNavSFDesk = window.deskNav;
window.deskNav = function(tab) {
  if (_origDeskNavSFDesk) _origDeskNavSFDesk.apply(this, arguments);
  if (tab === 'home') {
    setTimeout(injectSidebarButtons, 300);
  }
};

/* ── Global erişim ── */
window.showPreferencesModal  = showPreferencesModal;
window.switchPrefTab         = switchPrefTab;
window.showCreateMenu        = showCreateMenu;
window.showChannelListMenu   = showChannelListMenu;
window.switchChannelTab      = switchChannelTab;
window.initChannelTabs       = initChannelTabs;
window.saveCanvasContent     = saveCanvasContent;
window.slackMarkUnread       = slackMarkUnread;
window.slackCopyMsgLink      = slackCopyMsgLink;
window.slackRemindMe         = slackRemindMe;
window.slackMuteThread       = slackMuteThread;
window.createSection         = createSection;
window.toggleMutedChannels   = toggleMutedChannels;
window.applyTheme            = applyTheme;
window.changeFontSize        = changeFontSize;
window.savePref              = savePref;
window.clearAppCache         = clearAppCache;
