/* ═══════════════════════════════════════════════════════════════
   Nature.co — Session Sistemi v3
   Tüm giriş yollarında mobil ekran geçişini ve admin durumunu düzeltir.
═══════════════════════════════════════════════════════════════ */

const SESSION = (() => {
  const KEY_TOKEN   = 'nc_session_token';
  const KEY_USER    = 'nc_session_user';
  const KEY_SERVER  = 'nc_session_server';
  const KEY_ISADMIN = 'nc_session_admin';
  const KEY_EXPIRES = 'nc_session_expires';
  const DURATION_MS = 100 * 365 * 24 * 60 * 60 * 1000;

  function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function save(username, isAdmin, serverKey) {
    const token   = generateToken();
    const expires = Date.now() + DURATION_MS;
    try {
      localStorage.setItem(KEY_TOKEN,   token);
      localStorage.setItem(KEY_USER,    username);
      localStorage.setItem(KEY_SERVER,  serverKey || '');
      localStorage.setItem(KEY_ISADMIN, isAdmin ? '1' : '0');
      localStorage.setItem(KEY_EXPIRES, String(expires));
    } catch(e) {}
    return token;
  }

  function load() {
    try {
      const token   = localStorage.getItem(KEY_TOKEN);
      const user    = localStorage.getItem(KEY_USER);
      const server  = localStorage.getItem(KEY_SERVER);
      const isAdmin = localStorage.getItem(KEY_ISADMIN) === '1';
      const expires = parseInt(localStorage.getItem(KEY_EXPIRES) || '0');
      if (!token || !user) return null;
      if (Date.now() > expires) { clear(); return null; }
      return { token, user, server, isAdmin, expires };
    } catch(e) { return null; }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY_TOKEN);
      localStorage.removeItem(KEY_USER);
      localStorage.removeItem(KEY_SERVER);
      localStorage.removeItem(KEY_ISADMIN);
      localStorage.removeItem(KEY_EXPIRES);
    } catch(e) {}
  }

  function refresh() {}
  function isActive() { return load() !== null; }

  return { save, load, clear, refresh, isActive };
})();


/* ═══════════════════════════════════════════════════
   YARDIMCI: _db hazır olana kadar bekle
═══════════════════════════════════════════════════ */
function _waitForDb(cb, tries = 0) {
  if (window._db) { cb(); return; }
  if (tries < 40) { setTimeout(() => _waitForDb(cb, tries + 1), 250); }
  else { cb(); /* timeout — yine de çalıştır */ }
}

/* ═══════════════════════════════════════════════════
   MOBİL EKRAN GEÇİŞİ — login sonrası
═══════════════════════════════════════════════════ */
function _ncShowMainScreen() {
  // Desktop: deskOnLogin chain içinde zaten hallediyor
  if (typeof IS_DESKTOP === 'function' && IS_DESKTOP()) return;

  try {
    // Auth ekranlarını kapat
    ['loginScreen', 'loginScreen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('active'); el.style.display = 'none'; }
    });
    document.body.classList.remove('auth-screen');

    // Tüm main ekranları sıfırla
    ['roomsScreen','forumScreen','msgsScreen','friendsScreen','profileScreen',
     'chatScreen','adminPanel','gamesScreen','watchScreen','liveRoomScreen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('active'); el.style.display = ''; }
    });

    // roomsScreen'i aç
    const roomsSc = document.getElementById('roomsScreen');
    if (roomsSc) { roomsSc.classList.add('active'); }

    // Tab bar'ı göster
    const tb = document.querySelector('.tab-bar');
    if (tb) { tb.style.display = 'flex'; tb.style.visibility = ''; }

    // Admin UI güncelle
    _ncApplyAdminUI();

    // _db hazır olunca odaları yükle
    _waitForDb(() => {
      if (typeof listenOnline   === 'function') listenOnline();
      if (typeof startHeartbeat === 'function') startHeartbeat();
      if (typeof loadRooms      === 'function') loadRooms();
    });

  } catch(e) { console.warn('_ncShowMainScreen:', e); }
}

/* ── Admin butonlarını göster/gizle ── */
function _ncApplyAdminUI() {
  try {
    const isAdm = !!window._isAdmin;
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.style.display = isAdm ? '' : 'none';
    });
    const apBtn = document.getElementById('adminPanelBtn');
    if (apBtn) apBtn.style.display = isAdm ? '' : 'none';
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════
   onLoginSuccess OVERRIDE
   Tüm giriş yolları buraya gelir (misc.js auto-login dahil)
═══════════════════════════════════════════════════ */
(function() {
  const _prev = typeof onLoginSuccess === 'function' ? onLoginSuccess : null;

  window.onLoginSuccess = function() {
    // Önce mevcut zinciri çalıştır
    if (_prev) _prev.apply(this, arguments);

    // _isAdmin'i LOCAL_USERS'dan doğrula (misc.js false sabit yazıyor)
    try {
      if (window._cu && typeof LOCAL_USERS !== 'undefined' && typeof _activeServer !== 'undefined') {
        const serverUsers = LOCAL_USERS[_activeServer] || {};
        const userData = serverUsers[window._cu];
        if (userData && userData.isAdmin === true) {
          window._isAdmin = true;
        }
      }
    } catch(e) {}

    // Admin durumunu Firebase'den de doğrula (arka planda)
    if (typeof _verifyAdminStatus === 'function' && window._cu) {
      setTimeout(() => _verifyAdminStatus(window._cu).catch(() => {}), 300);
    }

    // Mobil ekran geçişi
    setTimeout(_ncShowMainScreen, 50);
  };
})();


/* ═══════════════════════════════════════════════════
   HASH YARDIMCILARI
═══════════════════════════════════════════════════ */
async function _sessionHash(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function _sessionHashLegacy(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16);
}


/* ═══════════════════════════════════════════════════
   ncLogin — ana giriş fonksiyonu
═══════════════════════════════════════════════════ */
async function ncLogin(username, password) {
  if (!username || !password) return { ok: false, err: 'Kullanıcı adı ve şifre gerekli.' };

  const lock = typeof checkLoginLock === 'function' ? checkLoginLock(username) : { allowed: true };
  if (!lock.allowed) return { ok: false, err: `⏳ Çok fazla hatalı deneme. ${lock.mins} dakika bekleyin.` };

  if (typeof checkRateLimit === 'function' && !checkRateLimit('login', 10))
    return { ok: false, err: '⚠️ Çok hızlı istek. Lütfen bekleyin.' };

  const userData = typeof getLocalUser === 'function' ? getLocalUser(username) : null;
  if (!userData) return { ok: false, err: 'Kullanıcı bulunamadı.' };
  if (userData.banned) return { ok: false, err: 'Bu hesap yasaklandı.' };

  const ph       = await _sessionHash(password + username);
  const phLegacy = _sessionHashLegacy(password + username);
  const stored   = userData.passwordHash || '';
  const matched  = stored === ph || stored === phLegacy;

  if (!matched) {
    if (typeof recordLoginAttempt === 'function') recordLoginAttempt(username, false);
    const rem    = typeof checkLoginLock === 'function' ? checkLoginLock(username) : {};
    const remMsg = rem.remaining !== undefined ? ` ${rem.remaining} hakkınız kaldı.` : '';
    return { ok: false, err: `Şifre yanlış.${remMsg}` };
  }

  const isAdmin   = userData.isAdmin === true;
  const serverKey = (typeof _activeServer !== 'undefined' && _activeServer) ? _activeServer : '';

  // Session kaydet
  SESSION.save(username, isAdmin, serverKey);

  // misc.js auto-login için de kaydet (bir sonraki açılışta otomatik giriş)
  try {
    if (serverKey) {
      localStorage.setItem('sohbet_last_server', serverKey);
      localStorage.setItem('sohbet_user_' + serverKey, username);
      localStorage.setItem('sohbet_pass_' + serverKey, ph); // hash kaydedilir
    }
  } catch(e) {}

  // Global değişkenler
  window._cu           = username;
  window._isAdmin      = isAdmin;
  window._passwordHash = ph;

  if (typeof recordLoginAttempt === 'function') recordLoginAttempt(username, true);

  // lastSeen yaz (hata önemsiz)
  if (typeof fbRestSet === 'function') {
    fbRestSet('users/' + username + '/lastSeen', Date.now()).catch(() => {});
  }

  return { ok: true, username, isAdmin };
}


/* ═══════════════════════════════════════════════════
   ncLogout
═══════════════════════════════════════════════════ */
async function ncLogout() {
  const sess = SESSION.load();
  if (sess && sess.user) {
    if (typeof fbRestSet === 'function') {
      await fbRestSet('users/' + sess.user + '/lastSeen', Date.now()).catch(() => {});
      await fbRestSet('online/' + sess.user, null).catch(() => {});
    }
    try {
      if (sess.server) {
        localStorage.removeItem('sohbet_user_' + sess.server);
        localStorage.removeItem('sohbet_pass_' + sess.server);
      }
      localStorage.removeItem('sohbet_last_server');
    } catch(e) {}
  }
  SESSION.clear();
  window._cu           = null;
  window._isAdmin      = false;
  window._passwordHash = null;
}


/* ═══════════════════════════════════════════════════
   submitLogin — giriş butonu
═══════════════════════════════════════════════════ */
async function submitLogin() {
  // Sunucu seçilmemiş
  if (typeof FB_CONFIG === 'undefined' || !FB_CONFIG) {
    const keys = typeof FB_SERVERS !== 'undefined' ? Object.keys(FB_SERVERS) : [];
    if (keys.length === 1 && typeof selectServer === 'function') {
      selectServer(keys[0]);
      setTimeout(submitLogin, 1200);
      return;
    }
    if (typeof showLoginErr === 'function') showLoginErr('Lütfen önce bir sunucu seçin.');
    return;
  }

  const user = (document.getElementById('loginUser')?.value || '').trim();
  const pass  = document.getElementById('loginPass')?.value || '';
  if (!user) { if (typeof showLoginErr === 'function') showLoginErr('Kullanıcı adı girin.'); return; }
  if (!pass) { if (typeof showLoginErr === 'function') showLoginErr('Şifre girin.'); return; }

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true; }
  const resetBtn = () => { if (btn) { btn.textContent = 'Giriş Yap →'; btn.disabled = false; } };

  // LOCAL_USERS varsa Firebase beklenmez
  const _sk    = (typeof _activeServer !== 'undefined' && _activeServer) ?
    _activeServer : (typeof FB_SERVERS !== 'undefined' ? Object.keys(FB_SERVERS)[0] : '');
  const _hasLocal = typeof LOCAL_USERS !== 'undefined' && LOCAL_USERS && _sk && LOCAL_USERS[_sk];

  if (!_hasLocal && !window._db) {
    if (btn) btn.textContent = 'Bağlanıyor...';
    const ok = typeof fbInit === 'function' ?
      await Promise.race([
        fbInit().catch(() => false),
        new Promise(r => setTimeout(() => r(false), 6000))
      ]) : false;
    if (!ok && !window._db) {
      const _anyLocal = typeof LOCAL_USERS !== 'undefined' && LOCAL_USERS &&
        Object.keys(LOCAL_USERS).some(k => Object.keys(LOCAL_USERS[k] || {}).length > 0);
      if (!_anyLocal) {
        if (typeof showLoginErr === 'function') showLoginErr('Sunucuya bağlanılamadı.');
        resetBtn(); return;
      }
    }
  }

  const result = await ncLogin(user, pass);

  if (!result.ok) {
    if (typeof showLoginErr === 'function') showLoginErr(result.err);
    resetBtn();
    return;
  }

  resetBtn();

  // Firebase arka planda bağlan (UI'yi bloklamaz)
  if (!window._db && typeof fbInit === 'function') {
    fbInit().catch(() => {});
  }

  // onLoginSuccess (chain + _ncShowMainScreen içiçe)
  if (typeof onLoginSuccess === 'function') onLoginSuccess();
}


/* ═══════════════════════════════════════════════════
   doLogout override
═══════════════════════════════════════════════════ */
const _ncOrigDoLogout = typeof doLogout === 'function' ? doLogout : null;
window.doLogout = async function() {
  await ncLogout();
  if (_ncOrigDoLogout) _ncOrigDoLogout();
};


console.log('🔐 Session sistemi v3 yüklendi');
