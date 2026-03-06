/* ═══════════════════════════════════════════════════════
   Nature.co — Auth Module
   Firebase Authentication KALDIRILDI.
   Kimlik doğrulama: RTDB passwordHash tabanlı (misc.js)
═══════════════════════════════════════════════════════ */

// Stub fonksiyonlar — eski çağrılar için uyumluluk
async function loginWithEmail(email, pass, username) {
  // Firebase Auth kaldırıldı — bu fonksiyon artık çağrılmamalı
  console.warn('loginWithEmail: Firebase Auth kaldırıldı');
  return false;
}
async function sendPhoneOTP(phoneNumber) { return false; }
async function verifyPhoneOTP(otp) { return false; }
async function migrateUserToFirebaseAuth(username, email, pass) { return; }
async function showForgotPassword() {
  showLoginErr('Şifre sıfırlama için admin ile iletişime geçin.');
}
function submitPhoneLoginOTP() {}
function submitPhoneRegOTP() {}
function toggleLoginMethod() {}
function formatPhoneE164(p) { return p; }
function setupRecaptcha(id) { return null; }

console.log('✅ Auth module yüklendi — RTDB tabanlı kimlik doğrulama aktif');

/* ── Kayıt fonksiyonu ── */
async function submitRegister() {
  const inviteCode = (document.getElementById('regInviteCode')?.value || '').trim();
  const username   = (document.getElementById('regUser')?.value || '').trim();
  const email      = (document.getElementById('regEmail')?.value || '').trim();
  const pass       = document.getElementById('regPass')?.value || '';
  const pass2      = document.getElementById('regPass2')?.value || '';

  const btn = document.getElementById('regBtn');
  const setBtn = (t, dis) => { if(btn){ btn.textContent = t; btn.disabled = dis; } };

  if (!username)    { showLoginErr('Kullanıcı adı girin.'); return; }
  if (username.length < 2) { showLoginErr('Kullanıcı adı en az 2 karakter olmalı.'); return; }
  if (!pass)        { showLoginErr('Şifre girin.'); return; }
  if (pass.length < 6) { showLoginErr('Şifre en az 6 karakter olmalı.'); return; }
  if (pass !== pass2) { showLoginErr('Şifreler eşleşmiyor.'); return; }

  setBtn('Kaydediliyor...', true);

  try {
    // Kullanıcı adı dolu mu kontrol et
    const existing = await fbRestGet('users/' + username).catch(() => null);
    if (existing) { showLoginErr('Bu kullanıcı adı alınmış.'); setBtn('Kayıt Ol →', false); return; }

    // Davet kodu kontrolü (varsa)
    const regSettings = await fbRestGet('settings/registration').catch(() => null);
    const needsInvite = regSettings === 'invite';
    const needsApproval = regSettings === 'approval';

    if (needsInvite) {
      if (!inviteCode) { showLoginErr('Davet kodu gerekli.'); setBtn('Kayıt Ol →', false); return; }
      const invite = await fbRestGet('invites/' + inviteCode).catch(() => null);
      if (!invite) { showLoginErr('Geçersiz davet kodu.'); setBtn('Kayıt Ol →', false); return; }
    }

    const hash = await (async (str) => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    })(pass + username);

    const userData = {
      username,
      email: email || '',
      passwordHash: hash,
      isAdmin: false,
      banned: false,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    if (needsApproval) {
      // Onay bekleniyor
      await fbRestSet('pending/' + username, { ...userData, requestedAt: Date.now() });
      showLoginErr('✅ Kaydınız alındı, admin onayı bekleniyor.');
      setBtn('Kayıt Ol →', false);
      return;
    }

    // Direkt kaydet
    await fbRestSet('users/' + username, userData);

    // Davet kodunu kullanıldı olarak işaretle
    if (needsInvite && inviteCode) {
      await fbRestSet('invites/' + inviteCode + '/usedBy', username).catch(() => {});
    }

    showLoginErr('✅ Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
    setTimeout(() => showLoginTab('login'), 1500);

  } catch(e) {
    console.error('submitRegister hatası:', e);
    showLoginErr('Kayıt sırasında hata oluştu. Tekrar deneyin.');
  }

  setBtn('Kayıt Ol →', false);
}
window.submitRegister = submitRegister;

/* ── Admin durumunu Firebase'den doğrula ── */
async function _verifyAdminStatus(username) {
  try {
    const userData = await fbRestGet('users/' + username).catch(() => null);
    if (userData && userData.isAdmin === true) {
      window._isAdmin = true;
    } else {
      const adminNode = await fbRestGet('admins/' + username).catch(() => null);
      window._isAdmin = !!adminNode;
    }
    // Admin butonlarını göster/gizle
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.style.display = window._isAdmin ? '' : 'none';
    });
  } catch(e) {}
}
window._verifyAdminStatus = _verifyAdminStatus;
