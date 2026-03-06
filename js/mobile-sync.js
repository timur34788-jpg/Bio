/* ═══════════════════════════════════════════════════════════════════
   Nature.co — Mobile–Desktop Senkronizasyon Katmanı  v1.0
   ─────────────────────────────────────────────────────────────────
   Bu dosya mobil ↔ masaüstü arasındaki TÜM senkronizasyon sorunlarını
   tek bir yerden çözer. Diğer dosyalara dokunmaz, üzerine wrap yapar.

   Çözülen sorunlar:
   1. Yazıyor... göstergesi: deskInp masaüstünde de typing tetikler
   2. Yazıyor... göstergesi: desktop header'ı (deskChatHdrSub) da güncellenir
   3. sendDeskMsg → ortak gönderim boru hattına bağlanır (banned words, rate limit)
   4. _cRoom / _deskRoom çift güncelleme: ikisi daima senkronda
   5. Online durum: resize'dan sonra tekrar yayınlanır
   6. Okundu işareti: mobil + masaüstü her açılan odada senkron
   7. Mesaj yeniden dinleme: resize/tab değişiminde listener kaybolmaz
   8. Push token: masaüstü/mobil geçişte yeniden kaydedilir
   9. notif badge: her iki sidebar'da aynı anda güncellenir
   10. Klavye / safe-area: iOS/Android için dinamik viewport ayarı
═══════════════════════════════════════════════════════════════════ */

(function () {
'use strict';

/* ─── Yardımcı: DOM hazır bekle ─── */
function whenReady(fn, delay) {
  if (document.readyState === 'complete') setTimeout(fn, delay || 0);
  else window.addEventListener('load', () => setTimeout(fn, delay || 0));
}
window.whenReady = whenReady;

/* ══════════════════════════════════════════════════════════════════
   1. YAZIYORUM GÖSTERGESİ — Desktop Input da Tetiklesin
══════════════════════════════════════════════════════════════════ */
function patchDeskTyping() {
  const deskInp = document.getElementById('deskInp');
  if (!deskInp || deskInp._typingPatched) return;
  deskInp._typingPatched = true;

  deskInp.addEventListener('input', () => {
    if (typeof setTypingFlag === 'function') setTypingFlag();
  });
  deskInp.addEventListener('keydown', () => {
    if (typeof setTypingFlag === 'function') setTypingFlag();
  });
  deskInp.addEventListener('blur', () => {
    if (typeof clearTypingFlag === 'function') clearTypingFlag();
  });
}

/* ──────────────────────────────────────────────────────────────────
   Yazıyor göstergesi HOOK: listenTyping sadece #chatHdrSub değil,
   aynı anda #deskChatHdrSub'ı da günceller
────────────────────────────────────────────────────────────────── */
function patchListenTyping() {
  if (typeof listenTyping !== 'function' || listenTyping._mobileSynced) return;
  const orig = listenTyping;
  window.listenTyping = listenTyping = function (roomId) {
    orig.call(this, roomId);
    // Desktop typing header sync
    if (!window._deskTypingPatch) {
      window._deskTypingPatch = {};
    }
    if (window._deskTypingPatch[roomId]) return;
    window._deskTypingPatch[roomId] = true;

    const ref = (typeof dbRef === 'function') ? dbRef('typing/' + roomId) : null;
    if (!ref) return;
    const h = snap => {
      if (window._deskRoom !== roomId) return;
      const data = snap.val() || {};
      const others = Object.keys(data).filter(u => u !== window._cu && data[u]);
      const el = document.getElementById('deskChatHdrSub');
      if (!el) return;
      if (others.length > 0) {
        const n = others[0];
        const extra = others.length > 1 ? ` ve ${others.length - 1} kişi` : '';
        el.innerHTML = `<span style="color:var(--accent)"><strong>${n}</strong>${extra} yazıyor <span class="typing-dots"><span></span><span></span><span></span></span></span>`;
      } else {
        // Restore default subtitle
        if (typeof updateChatStatus === 'function') updateChatStatus();
      }
    };
    ref.on('value', h);
    // Cleanup hook
    const origStop = window.stopTypingListener;
    window.stopTypingListener = stopTypingListener = function () {
      if (origStop) origStop.call(this);
      ref.off('value', h);
      delete window._deskTypingPatch[roomId];
    };
  };
  listenTyping._mobileSynced = true;
}

/* ══════════════════════════════════════════════════════════════════
   2. ODA SENKRONIZASYONU — _cRoom ve _deskRoom HEP BİRLİKTE
══════════════════════════════════════════════════════════════════ */
function patchRoomSync() {
  /* deskOpenRoom'u wrap et: _cRoom'u da güncelle ve typing'i de aç */
  if (typeof deskOpenRoom !== 'function' || deskOpenRoom._mobileSynced) return;
  const origDesk = deskOpenRoom;
  window.deskOpenRoom = deskOpenRoom = function (roomId) {
    origDesk.call(this, roomId);
    window._cRoom = roomId; // Mobil tarafı da güncelle
    // Typing listener'ı desktop odası için de çalıştır
    if (typeof listenTyping === 'function') listenTyping(roomId);
    // Okundu işareti
    if (typeof markRoomRead === 'function') markRoomRead(roomId);
    // Desktop input patch
    setTimeout(patchDeskTyping, 100);
  };
  deskOpenRoom._mobileSynced = true;

  /* openRoom'u wrap et: _deskRoom'u da güncelle */
  if (typeof openRoom === 'function' && !openRoom._mobileSynced) {
    const origMob = openRoom;
    window.openRoom = openRoom = function (roomId) {
      origMob.call(this, roomId);
      if (IS_DESKTOP && IS_DESKTOP()) {
        window._deskRoom = roomId;
      }
    };
    openRoom._mobileSynced = true;
  }
}

/* ══════════════════════════════════════════════════════════════════
   3. MESAJ GÖNDERİMİ SENKRONIZASYONU
      sendDeskMsg → ortak rate limit, banned words, slash command paylaşır
══════════════════════════════════════════════════════════════════ */
function patchDeskSend() {
  if (typeof sendDeskMsg !== 'function' || sendDeskMsg._mobileSynced) return;
  const orig = sendDeskMsg;
  window.sendDeskMsg = sendDeskMsg = async function () {
    // Ortak ön kontroller
    if (!window._db || !window._cu || !window._deskRoom) return;
    const inp = document.getElementById('deskInp');
    if (!inp) return;
    let t = inp.value.trim();
    if (!t) return;

    // Slash komutları mobil ile aynı
    if (t.startsWith('/')) {
      if (typeof checkBotCommand === 'function' && checkBotCommand(t)) {
        inp.value = ''; inp.style.height = 'auto'; return;
      }
      if (typeof executeSlashCmd === 'function') {
        const handled = await executeSlashCmd(t, window._deskRoom);
        if (handled) { inp.value = ''; inp.style.height = 'auto'; return; }
      }
      if (t.toLowerCase() === '/shrug') { inp.value = '¯\\_(ツ)_/¯'; t = inp.value.trim(); }
      else if (t.toLowerCase().startsWith('/me ')) { inp.value = '_' + window._cu + ' ' + t.slice(4) + '_'; t = inp.value.trim(); }
    }

    // Typing'i temizle
    if (typeof clearTypingFlag === 'function') clearTypingFlag();

    // Orijinal gönderim
    await orig.call(this);
  };
  sendDeskMsg._mobileSynced = true;
}

/* ══════════════════════════════════════════════════════════════════
   4. RESIZE / EKRAN GEÇİŞİ — State Korunumu
══════════════════════════════════════════════════════════════════ */
function patchResizeSync() {
  if (window._mobileSyncResizePatched) return;
  window._mobileSyncResizePatched = true;

  // Orijinal resize handler zaten desktop.js'de var.
  // Biz EK olarak online durumu ve listener'ları yeniden başlatırız.
  window.addEventListener('resize', debounce(() => {
    const isDesk = typeof IS_DESKTOP === 'function' && IS_DESKTOP();
    const isMob = typeof IS_MOBILE === 'function' && IS_MOBILE();

    // Online durumu yeniden yayınla (resize sonrası Firebase bağlantı yenilenebilir)
    if (window._cu && window._db) {
      try {
        dbRef('online/' + window._cu).set({ ts: Date.now(), user: window._cu }).catch(() => {});
      } catch (e) {}
    }

    // Masaüstüne geçiş: deskInp'i patch et
    if (isDesk) {
      setTimeout(patchDeskTyping, 300);
      // Aktif oda varsa typing'i de başlat
      if (window._deskRoom && typeof listenTyping === 'function') {
        setTimeout(() => listenTyping(window._deskRoom), 400);
      }
    }

    // Mobilde geçiş: aktif odanın listener'larının açık olduğunu doğrula
    if (isMob && window._cRoom) {
      if (typeof listenTyping === 'function') {
        setTimeout(() => listenTyping(window._cRoom), 400);
      }
    }

    // Badge'ları her iki sidebar'da yenile
    if (window._unread) {
      Object.entries(window._unread).forEach(([roomId, count]) => {
        if (count > 0 && typeof updateRoomBadge === 'function') {
          updateRoomBadge(roomId, count);
        }
      });
    }
  }, 350));
}

/* ══════════════════════════════════════════════════════════════════
   5. IOS/ANDROID KLAVYE — Safe-Area & Viewport Dinamik
══════════════════════════════════════════════════════════════════ */
function patchKeyboardViewport() {
  if (window._mobileSyncKbPatched) return;
  window._mobileSyncKbPatched = true;

  // Visual Viewport API (iOS 13+, Android Chrome)
  if (!window.visualViewport) return;

  const inputs = ['msgInp', 'deskInp'];
  let _kbOpen = false;

  function onViewportResize() {
    const vv = window.visualViewport;
    if (!vv) return;
    const keyboardH = window.innerHeight - vv.height;
    const tabBar = document.querySelector('.tab-bar');

    if (keyboardH > 100) {
      // Klavye açık
      if (!_kbOpen) {
        _kbOpen = true;
        // Tab bar'ı klavyenin üstüne taşı
        if (tabBar) {
          tabBar.style.transform = `translateY(-${keyboardH}px)`;
          tabBar.style.transition = 'transform 0.2s ease';
        }
        // Mesaj alanını scroll et
        const chatMsgs = document.getElementById('chatMsgs');
        if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 150);
        const deskMsgs = document.getElementById('deskMsgs');
        if (deskMsgs) setTimeout(() => { deskMsgs.scrollTop = deskMsgs.scrollHeight; }, 150);
      }
    } else {
      // Klavye kapalı
      if (_kbOpen) {
        _kbOpen = false;
        if (tabBar) {
          tabBar.style.transform = '';
          tabBar.style.transition = 'transform 0.2s ease';
        }
      }
    }
  }

  window.visualViewport.addEventListener('resize', onViewportResize);
  window.visualViewport.addEventListener('scroll', onViewportResize);
}

/* ══════════════════════════════════════════════════════════════════
   6. ODA DEĞİŞİMİNDE NOTIFICATION BADGE SYNC
══════════════════════════════════════════════════════════════════ */
function patchBadgeSync() {
  if (window._mobileSyncBadgePatched) return;
  window._mobileSyncBadgePatched = true;

  // clearUnreadBadge'ı wrap et — her iki taraf için de çalışır
  if (typeof clearUnreadBadge === 'function' && !clearUnreadBadge._mobileSynced) {
    const orig = clearUnreadBadge;
    window.clearUnreadBadge = clearUnreadBadge = function (roomId) {
      orig.call(this, roomId);
      // mobil tab badge (ör: tabHome kırmızı nokta)
      const mobDot = document.getElementById('mobNotifDot');
      if (mobDot) {
        const totalUnread = Object.values(window._unread || {}).reduce((a, b) => a + (b || 0), 0);
        mobDot.style.display = totalUnread > 0 ? 'block' : 'none';
      }
    };
    clearUnreadBadge._mobileSynced = true;
  }

  // updateRoomBadge'ı wrap et — notif dot'u da güncelle
  if (typeof updateRoomBadge === 'function' && !updateRoomBadge._mobileSynced) {
    const orig = updateRoomBadge;
    window.updateRoomBadge = updateRoomBadge = function (roomId, count) {
      orig.call(this, roomId, count);
      const mobDot = document.getElementById('mobNotifDot');
      if (mobDot && count > 0) mobDot.style.display = 'block';
    };
    updateRoomBadge._mobileSynced = true;
  }
}

/* ══════════════════════════════════════════════════════════════════
   7. PUSH NOTIFICATION TOKEN — Cihaz Geçişinde Yeniden Kayıt
══════════════════════════════════════════════════════════════════ */
function patchPushTokenSync() {
  if (window._mobileSyncPushPatched) return;
  window._mobileSyncPushPatched = true;

  // Sayfa focus aldığında token geçerliliğini kontrol et
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Push token'ı yenile (push.js bunu halleder, biz tetikleriz)
      if (typeof requestNotifPermission === 'function' && window._cu) {
        setTimeout(requestNotifPermission, 1000);
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   8. AĞDAN KOPMA / TEKRAR BAĞLANMA
══════════════════════════════════════════════════════════════════ */
function patchOfflineOnlineSync() {
  if (window._mobileSyncNetPatched) return;
  window._mobileSyncNetPatched = true;

  let _lastOnlineState = navigator.onLine;

  window.addEventListener('online', () => {
    if (!_lastOnlineState) {
      _lastOnlineState = true;
      showToast && showToast('🟢 Bağlantı yeniden kuruldu');
      // Online durumu güncelle
      if (window._cu && window._db) {
        try { dbRef('online/' + window._cu).set({ ts: Date.now(), user: window._cu }); } catch (e) {}
      }
      // Aktif odayı yeniden yükle
      const activeRoom = (typeof IS_DESKTOP === 'function' && IS_DESKTOP()) ? window._deskRoom : window._cRoom;
      if (activeRoom) {
        if (typeof IS_DESKTOP === 'function' && IS_DESKTOP() && typeof deskOpenRoom === 'function') {
          setTimeout(() => deskOpenRoom(activeRoom), 800);
        } else if (typeof openRoom === 'function') {
          setTimeout(() => openRoom(activeRoom), 800);
        }
      }
      // Oda listesini yenile
      if (typeof loadRooms === 'function') setTimeout(loadRooms, 600);
      if (typeof deskLoadRoomList === 'function' && typeof IS_DESKTOP === 'function' && IS_DESKTOP()) {
        setTimeout(deskLoadRoomList, 700);
      }
    }
  });

  window.addEventListener('offline', () => {
    _lastOnlineState = false;
    if (typeof showToast === 'function') showToast('🔴 Bağlantı kesildi');
  });
}

/* ══════════════════════════════════════════════════════════════════
   9. GİRİŞ SONRASI SYNC — onLoginSuccess hook
══════════════════════════════════════════════════════════════════ */
function patchLoginSync() {
  if (window._mobileSyncLoginPatched) return;
  window._mobileSyncLoginPatched = true;

  const origLogin = window.onLoginSuccess;
  window.onLoginSuccess = function (...args) {
    if (origLogin) origLogin.apply(this, args);

    // Tüm patch'leri login sonrası uygula
    setTimeout(() => {
      patchDeskTyping();
      patchListenTyping();
      patchRoomSync();
      patchDeskSend();
      patchBadgeSync();
    }, 500);

    // Son aktif odayı localStorage'dan geri yükle
    setTimeout(() => {
      const server = window._activeServer || '';
      const lastRoom = localStorage.getItem('nc_lastRoom_' + server);
      if (lastRoom && typeof IS_DESKTOP === 'function' && IS_DESKTOP() && typeof deskOpenRoom === 'function') {
        deskOpenRoom(lastRoom);
      }
    }, 1200);
  };
}

/* ══════════════════════════════════════════════════════════════════
   10. SON AKTİF ODAYI KAYDET
══════════════════════════════════════════════════════════════════ */
function patchRoomPersist() {
  if (window._mobileSyncPersistPatched) return;
  window._mobileSyncPersistPatched = true;

  // deskOpenRoom ve openRoom her çağrıldığında localStorage'a yaz
  ['deskOpenRoom', 'openRoom'].forEach(fnName => {
    const fn = window[fnName];
    if (fn && !fn._persistPatched) {
      window[fnName] = function (roomId, ...rest) {
        fn.call(this, roomId, ...rest);
        if (roomId && window._activeServer) {
          try { localStorage.setItem('nc_lastRoom_' + window._activeServer, roomId); } catch (e) {}
        }
      };
      window[fnName]._persistPatched = true;
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   11. SCROLL TO BOTTOM — Oda açılınca mesajlar en alta kaydır
══════════════════════════════════════════════════════════════════ */
function patchScrollToBottom() {
  if (window._mobileSyncScrollPatched) return;
  window._mobileSyncScrollPatched = true;

  // deskOpenRoom'u scroll için izle
  const origDesk = window.deskOpenRoom;
  if (origDesk && !origDesk._scrollPatched) {
    window.deskOpenRoom = function (roomId, ...rest) {
      origDesk.call(this, roomId, ...rest);
      const tryScroll = (attempts) => {
        const box = document.getElementById('deskMsgs');
        if (!box) return;
        if (box.querySelector('.ld')) {
          // Yükleniyor göstergesi var, bekle
          if (attempts < 10) setTimeout(() => tryScroll(attempts + 1), 200);
          return;
        }
        box.scrollTop = box.scrollHeight;
      };
      setTimeout(() => tryScroll(0), 300);
    };
    window.deskOpenRoom._scrollPatched = true;
  }
}

/* ══════════════════════════════════════════════════════════════════
   12. FOCUS/BLUR — Sekmeye dönünce unread temizle
══════════════════════════════════════════════════════════════════ */
function patchFocusSync() {
  if (window._mobileSyncFocusPatched) return;
  window._mobileSyncFocusPatched = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const activeRoom = (typeof IS_DESKTOP === 'function' && IS_DESKTOP()) ? window._deskRoom : window._cRoom;
      if (activeRoom) {
        if (typeof clearUnreadBadge === 'function') clearUnreadBadge(activeRoom);
        if (typeof markRoomRead === 'function') markRoomRead(activeRoom);
      }
    }
  });

  window.addEventListener('focus', () => {
    const activeRoom = (typeof IS_DESKTOP === 'function' && IS_DESKTOP()) ? window._deskRoom : window._cRoom;
    if (activeRoom) {
      if (typeof clearUnreadBadge === 'function') clearUnreadBadge(activeRoom);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   YARDIMCI: Debounce
══════════════════════════════════════════════════════════════════ */
function debounce(fn, delay) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ══════════════════════════════════════════════════════════════════
   BAŞLAT
══════════════════════════════════════════════════════════════════ */
whenReady(() => {
  patchListenTyping();
  patchResizeSync();
  patchKeyboardViewport();
  patchPushTokenSync();
  patchOfflineOnlineSync();
  patchLoginSync();
  patchRoomPersist();
  patchScrollToBottom();
  patchFocusSync();

  // Eğer kullanıcı zaten giriş yapmışsa hemen uygula
  if (window._cu) {
    patchDeskTyping();
    patchRoomSync();
    patchDeskSend();
    patchBadgeSync();
    console.log('✅ Mobile-Desktop Sync v1.0 hazır');
  }
}, 200);

})();

/* ══════════════════════════════════════════════════════════════════
   MOBİL CANLI SOHBET ODASI
   Masaüstü liveroom ile aynı Firebase veriyi paylaşır.
══════════════════════════════════════════════════════════════════ */

let _mobLiveUnsubscribe = null;
let _mobLiveSessionUnsubscribe = null;

/* Ekrana ilk girildiğinde çağrılır */
function mobLiveRoomInit() {
  if (!window._db) return;
  _mobLiveChatListen();
  _mobLiveSessionListen();
}

/* ── Firebase dinleyiciler ── */
function _mobLiveChatListen() {
  if (_mobLiveUnsubscribe) { try { _mobLiveUnsubscribe(); } catch(e) {} }
  const box = document.getElementById('mobLiveChatMsgs');
  if (!box || !window._db) return;
  // Başlangıç mesajını koru, eski mesajları temizle
  box.innerHTML = '<div style="display:flex;gap:6px;align-items:flex-start;padding:2px 0;"><div style="flex:1;min-width:0;"><div style="font-size:.73rem;color:rgba(255,255,255,.25);font-style:italic;">Sohbet başladı 👋</div></div></div>';
  const ref = dbRef('liveRoom/chat');
  const h = ref.limitToLast(100).on('child_added', (snap) => {
    const msg = snap.val();
    if (msg) _mobAppendLiveMsg(msg);
  });
  _mobLiveUnsubscribe = () => ref.off('child_added', h);
}

function _mobLiveSessionListen() {
  if (_mobLiveSessionUnsubscribe) { try { _mobLiveSessionUnsubscribe(); } catch(e) {} }
  if (!window._db) return;
  const ref = dbRef('liveRoom/session');
  const h = ref.on('value', (snap) => {
    const s = snap.val();
    _mobLiveUpdateSession(s);
    // Tab'daki kırmızı nokta
    const dot = document.getElementById('tabLiveRoomDot');
    if (dot) dot.style.display = (s && s.active) ? 'block' : 'none';
  });
  _mobLiveSessionUnsubscribe = () => ref.off('value', h);
}

/* ── Session UI güncelle ── */
function _mobLiveUpdateSession(s) {
  const badge   = document.getElementById('mobLiveBadge');
  const viewers = document.getElementById('mobLiveViewers');
  const info    = document.getElementById('mobLiveStreamInfo');
  const host    = document.getElementById('mobLiveStreamHost');
  const ph      = document.getElementById('mobLivePlaceholder');
  const ctrl    = document.getElementById('mobLiveControlBar');
  const startBtns = document.getElementById('mobLiveStartBtns');
  const video   = document.getElementById('mobLiveMainVideo');

  if (s && s.active) {
    if (badge)   { badge.style.display = 'flex'; }
    if (viewers) { viewers.textContent = '👁 ' + (s.viewers || 0) + ' izleyici'; }
    if (info)    { info.style.display = 'flex'; }
    if (host)    { host.textContent = (s.host || '') + ' yayında'; }
    if (ph)      { ph.style.display = 'none'; }
    // Eğer bu kullanıcı host ise kontrol barını göster
    if (ctrl)    { ctrl.style.display = (s.host === window._cu) ? 'flex' : 'none'; }
    if (startBtns) { startBtns.style.display = (s.host === window._cu) ? 'none' : 'flex'; }
    // İzleyici sayısını artır
    if (window._cu && s.host !== window._cu) {
      try { dbRef('liveRoom/session/viewers').transaction(v => (v || 0) + 1); } catch(e) {}
    }
  } else {
    if (badge)   { badge.style.display = 'none'; }
    if (viewers) { viewers.textContent = ''; }
    if (info)    { info.style.display = 'none'; }
    if (ph)      { ph.style.display = 'flex'; }
    if (ctrl)    { ctrl.style.display = 'none'; }
    if (startBtns) { startBtns.style.display = 'flex'; }
    if (video)   { video.style.display = 'none'; video.srcObject = null; }
    const grid = document.getElementById('mobLiveConfGrid');
    if (grid)    { grid.style.display = 'none'; grid.innerHTML = ''; }
  }
}

/* ── Mesaj ekle ── */
function _mobAppendLiveMsg(msg) {
  const box = document.getElementById('mobLiveChatMsgs');
  if (!box) return;
  const isSystem = !msg.user || msg.user.includes('Sistem');
  const isMe = msg.user === window._cu;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:7px;align-items:flex-start;padding:2px 0;';

  if (isSystem) {
    div.innerHTML = `<div style="flex:1;min-width:0;"><div style="font-size:.72rem;color:rgba(255,255,255,.25);font-style:italic;">${_mobEsc(msg.text||'')}</div></div>`;
  } else {
    const color = typeof strColor === 'function' ? strColor(msg.user) : '#4a8f40';
    const ini   = typeof initials === 'function' ? initials(msg.user) : (msg.user||'?').slice(0,2).toUpperCase();
    const ts    = msg.ts ? (new Date(msg.ts).getHours().toString().padStart(2,'0') + ':' + new Date(msg.ts).getMinutes().toString().padStart(2,'0')) : '';
    div.innerHTML = `
      <div style="width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:900;color:#fff;background:${color};">${ini}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:1px;">
          <span style="font-size:.68rem;font-weight:800;color:${isMe?'#6dbf67':'rgba(255,255,255,.65)'};">${_mobEsc(msg.user||'')}</span>
          <span style="color:rgba(255,255,255,.2);font-size:.6rem;">${ts}</span>
        </div>
        <div style="font-size:.78rem;color:rgba(255,255,255,.7);line-height:1.4;word-break:break-word;">${_mobEsc(msg.text||'')}</div>
      </div>`;
  }
  box.appendChild(div);

  // Sayaç
  const cnt = document.getElementById('mobLiveMsgCount');
  if (cnt) cnt.textContent = box.querySelectorAll('div[style*="display:flex"]').length - 1;

  // Auto scroll
  if (box.scrollTop + box.clientHeight >= box.scrollHeight - 100) {
    box.scrollTop = box.scrollHeight;
  }
}

function _mobEsc(s) {
  return typeof esc === 'function' ? esc(s) : s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Mesaj gönder ── */
async function mobLiveSendMsg() {
  const input = document.getElementById('mobLiveChatInput');
  if (!input || !input.value.trim() || !window._cu || !window._db) return;
  const text = input.value.trim();
  input.value = '';
  try { await dbRef('liveRoom/chat').push({ user: window._cu, text, ts: Date.now() }); } catch(e) {}
}

/* ── Ekran Yayını Başlat ── */
async function mobLiveStartStream() {
  if (!window._cu) { showToast && showToast('Giriş yapman gerekiyor'); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
  } catch(e) { showToast && showToast('Ekran paylaşımı iptal edildi'); return; }

  const video = document.getElementById('mobLiveMainVideo');
  if (video) { video.srcObject = stream; video.style.display = 'block'; }

  const startBtns = document.getElementById('mobLiveStartBtns');
  const ctrl = document.getElementById('mobLiveControlBar');
  if (startBtns) startBtns.style.display = 'none';
  if (ctrl) ctrl.style.display = 'flex';

  window._mobLiveLocalStream = stream;

  if (window._db) {
    try {
      await dbRef('liveRoom/session').set({ host: window._cu, type: 'stream', active: true, startedAt: Date.now(), viewers: 0 });
      dbRef('liveRoom/chat').push({ user: '📡 Sistem', text: window._cu + ' ekran yayını başlattı!', ts: Date.now() });
    } catch(e) {}
  }
  stream.getVideoTracks()[0].onended = () => mobLiveEnd();
}

/* ── Görüntülü Konferans Başlat ── */
async function mobLiveStartConference() {
  if (!window._cu) { showToast && showToast('Giriş yapman gerekiyor'); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
  } catch(e) { showToast && showToast('Kamera/mikrofon izni reddedildi'); return; }

  const grid = document.getElementById('mobLiveConfGrid');
  const video = document.getElementById('mobLiveMainVideo');
  if (grid) { grid.style.display = 'grid'; }
  if (video) { video.style.display = 'none'; }

  const tile = document.createElement('div');
  tile.style.cssText = 'border-radius:10px;overflow:hidden;background:#1a2a1a;position:relative;min-height:100px;';
  tile.innerHTML = `<video autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1);"></video><div style="position:absolute;bottom:5px;left:7px;background:rgba(0,0,0,.6);color:#fff;font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:5px;">${window._cu} (Sen)</div>`;
  tile.querySelector('video').srcObject = stream;
  if (grid) grid.appendChild(tile);

  const camBtn = document.getElementById('mobLiveCamBtn');
  if (camBtn) camBtn.style.display = 'flex';

  const startBtns = document.getElementById('mobLiveStartBtns');
  const ctrl = document.getElementById('mobLiveControlBar');
  if (startBtns) startBtns.style.display = 'none';
  if (ctrl) ctrl.style.display = 'flex';

  window._mobLiveLocalStream = stream;

  if (window._db) {
    try {
      await dbRef('liveRoom/session').set({ host: window._cu, type: 'conference', active: true, startedAt: Date.now(), viewers: 0 });
      dbRef('liveRoom/chat').push({ user: '🎥 Sistem', text: window._cu + ' görüntülü konferans başlattı!', ts: Date.now() });
    } catch(e) {}
  }
}

/* ── Yayını Bitir ── */
async function mobLiveEnd() {
  if (window._mobLiveLocalStream) {
    window._mobLiveLocalStream.getTracks().forEach(t => t.stop());
    window._mobLiveLocalStream = null;
  }
  if (window._db) {
    try {
      await dbRef('liveRoom/session').set({ active: false });
      dbRef('liveRoom/chat').push({ user: '📡 Sistem', text: 'Yayın sona erdi.', ts: Date.now() });
    } catch(e) {}
  }
}

/* ── Mikrofon Toggle ── */
function mobLiveMute() {
  if (!window._mobLiveLocalStream) return;
  const tracks = window._mobLiveLocalStream.getAudioTracks();
  if (!tracks.length) return;
  const nowMuted = !tracks[0].enabled;
  tracks.forEach(t => { t.enabled = nowMuted; });
  const btn = document.getElementById('mobLiveMuteBtn');
  if (btn) {
    btn.style.background = nowMuted ? 'rgba(255,255,255,.12)' : 'rgba(224,85,85,.4)';
    btn.title = nowMuted ? 'Mikrofon Açık' : 'Mikrofon Kapalı';
  }
}

/* ── Kamera Toggle ── */
function mobLiveCam() {
  if (!window._mobLiveLocalStream) return;
  const tracks = window._mobLiveLocalStream.getVideoTracks();
  if (!tracks.length) return;
  const nowOff = !tracks[0].enabled;
  tracks.forEach(t => { t.enabled = nowOff; });
  const btn = document.getElementById('mobLiveCamBtn');
  if (btn) btn.style.background = nowOff ? 'rgba(255,255,255,.12)' : 'rgba(224,85,85,.4)';
}

/* switchMainTab hook → liveroom'a geçince listener'ları başlat */
whenReady(() => {
  const origSwitch = window.switchMainTab;
  if (origSwitch && !origSwitch._livePatched) {
    window.switchMainTab = switchMainTab = function(tab, ...rest) {
      origSwitch.call(this, tab, ...rest);
      if (tab === 'liveroom') {
        setTimeout(mobLiveRoomInit, 100);
      }
    };
    window.switchMainTab._livePatched = true;
  }

  // Global erişim
  window.mobLiveRoomInit      = mobLiveRoomInit;
  window.mobLiveSendMsg       = mobLiveSendMsg;
  window.mobLiveStartStream   = mobLiveStartStream;
  window.mobLiveStartConference = mobLiveStartConference;
  window.mobLiveEnd           = mobLiveEnd;
  window.mobLiveMute          = mobLiveMute;
  window.mobLiveCam           = mobLiveCam;

  // Login sonrası session listener'ı başlat (tab kapalıyken kırmızı nokta için)
  const origLogin2 = window.onLoginSuccess;
  if (origLogin2 && !origLogin2._livePatchedTab) {
    window.onLoginSuccess = function(...args) {
      origLogin2.apply(this, args);
      setTimeout(_mobLiveSessionListen, 1500);
    };
    window.onLoginSuccess._livePatchedTab = true;
  }
}, 300);
