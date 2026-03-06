/* Nature.co — push.js */
/* Web Push / Firebase Cloud Messaging entegrasyonu */

// ── FCM VAPID Keys (sunucu bazında) ──
const FCM_VAPID_KEYS = {
  sohbet: 'BDqV62xUvhOyafHiqEV4QEXgqgwAc1AKF5jVX1yDGXAYALauSDZmYSVGtWgMP5VIl02jNamn6uXo5CQTRrVLOEk'
};

function getVapidKey(){
  return FCM_VAPID_KEYS[_activeServer] || null;
}

let _pushToken = null;

function isPushSupported(){
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    typeof firebase !== 'undefined' &&
    !!getVapidKey()
  );
}

async function requestPushPermission(){
  if(!isPushSupported()) return null;
  try{
    const permission = await Notification.requestPermission();
    if(permission !== 'granted') return null;
    return await getPushToken();
  }catch(e){ console.warn('Push izin hatasi:', e); return null; }
}

async function getPushToken(){
  if(!isPushSupported()) return null;
  try{
    const app = firebase.apps.length ? firebase.apps[0] : null;
    if(!app) return null;
    const messaging = firebase.messaging(app);
    const sw = await navigator.serviceWorker.ready;

    // SW'ye aktif Firebase config'ini gönder (arka plan bildirimi için)
    if(sw && sw.active && typeof FB_CONFIG !== 'undefined' && FB_CONFIG){
      sw.active.postMessage({ type: 'FCM_INIT', config: FB_CONFIG });
    }

    const token = await messaging.getToken({ vapidKey: getVapidKey(), serviceWorkerRegistration: sw });
    if(token){ _pushToken = token; await savePushToken(token); return token; }
    return null;
  }catch(e){ console.warn('FCM token hatasi:', e); return null; }
}

async function savePushToken(token){
  if(!token || !_cu || !_db) return;
  try{
    await _db.ref('users/'+_cu+'/pushTokens/'+_activeServer).set({ token, updatedAt: Date.now(), platform: 'web' });
  }catch(e){ console.warn('Push token kayit hatasi:', e); }
}

async function removePushToken(){
  if(!_pushToken || !_cu || !_db) return;
  try{ await _db.ref('users/'+_cu+'/pushTokens/'+_activeServer).remove(); _pushToken = null; }catch(e){}
}

async function initPushAfterLogin(){
  if(!isPushSupported()) return;
  if(Notification.permission === 'granted'){ await getPushToken(); return; }
  if(Notification.permission === 'default'){
    const dismissed = localStorage.getItem('push_dismissed');
    if(dismissed && Date.now() - parseInt(dismissed) < 7*24*60*60*1000) return;
    setTimeout(showPushPermissionPrompt, 3000);
  }
}

function showPushPermissionPrompt(){
  if(document.getElementById('pushPrompt')) return;
  if(Notification.permission !== 'default') return;
  const el = document.createElement('div');
  el.id = 'pushPrompt';
  el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0f2015;border:1px solid #2d5a28;border-radius:14px;padding:14px 18px;z-index:9000;max-width:320px;width:calc(100% - 32px);display:flex;gap:12px;align-items:center;box-shadow:0 8px 32px rgba(0,0,0,.6);';
  el.innerHTML = '<div style="font-size:22px">\uD83D\uDD14</div><div style="flex:1"><div style="font-size:13px;font-weight:700;color:#d4e8d0;margin-bottom:3px">Bildirimler</div><div style="font-size:11px;color:#4a6b46;line-height:1.5">Yeni mesaj ve isteklerden haberdar ol. Apple Watch&#39;ta da gorunur.</div></div><div style="display:flex;flex-direction:column;gap:6px"><button onclick="acceptPushPrompt()" style="padding:6px 12px;background:#2d5a28;border:none;border-radius:8px;color:#6dbf67;font-size:11px;font-weight:700;cursor:pointer">Ac</button><button onclick="dismissPushPrompt()" style="padding:6px 12px;background:transparent;border:1px solid #1a3018;border-radius:8px;color:#4a6b46;font-size:11px;cursor:pointer">Hayir</button></div>';
  document.body.appendChild(el);
}

async function acceptPushPrompt(){
  dismissPushPrompt();
  const token = await requestPushPermission();
  if(token && typeof showToast === 'function') showToast("Bildirimler acildi! Apple Watch'ta da alirsin.");
}

function dismissPushPrompt(){
  const el = document.getElementById('pushPrompt');
  if(el) el.remove();
  try{ localStorage.setItem('push_dismissed', Date.now()); }catch(e){}
}

function initForegroundPushListener(){
  if(!isPushSupported()) return;
  try{
    const app = firebase.apps.length ? firebase.apps[0] : null;
    if(!app) return;
    const messaging = firebase.messaging(app);
    messaging.onMessage(payload => {
      const title = (payload.notification && payload.notification.title) || 'Nature.co';
      const body  = (payload.notification && payload.notification.body)  || '';
      if(typeof showToast === 'function') showToast('\uD83D\uDD14 ' + (body || title));
      if(Notification.permission === 'granted'){
        new Notification(title, { body, icon:'data:image/svg+xml,<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 14 C76 22 98 44 98 68 C98 92 81 108 60 108 C39 108 22 92 22 68 C22 44 44 22 60 14Z" fill="%230e2b0c" stroke="%234a8f40" stroke-width="1.2"/>\u003c/svg>', tag:'natureco' });
      }
    });
  }catch(e){ console.warn('FCM foreground listener hatasi:', e); }
}
