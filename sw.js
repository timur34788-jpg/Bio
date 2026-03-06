/* Biyom Service Worker — sw-v30 */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

/* Biyom (layla-d3710) Firebase config */
const _FB_CONFIG = {
  apiKey:"AIzaSyCHQwiv2ylnm12nYejLd2TOI1agHZ6cD6U",
  authDomain:"layla-d3710.firebaseapp.com",
  databaseURL:"https://layla-d3710-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:"layla-d3710",
  storageBucket:"layla-d3710.firebasestorage.app",
  messagingSenderId:"750610889276",
  appId:"1:750610889276:web:b414f7ed165ff7b1dda139"
};

try {
  const _fbApp = firebase.initializeApp(_FB_CONFIG, 'biyom_sw');
  const _messaging = firebase.messaging(_fbApp);
  _messaging.onBackgroundMessage(payload => handleBackgroundMessage(payload));
} catch(e) { console.warn('[SW] FCM init error:', e); }

function handleBackgroundMessage(payload) {
  const notification = payload.notification || {};
  const title = notification.title || 'Biyom';
  const body  = notification.body  || 'Yeni bir bildirim var';
  const icon  = 'icon-192.png';
  return self.registration.showNotification(title, {
    body, icon, badge: icon,
    tag: (payload.data && payload.data.type) || 'biyom',
    data: { url: '/' },
    vibrate: [100, 50, 100]
  });
}

const C = 'biyom-sw-v30';
const CACHE_URLS = ['./'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CACHE_URLS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith('http')) return;
  if (url.includes('firebase') || url.includes('gstatic') || url.includes('googleapis') ||
      url.includes('emailjs') || url.includes('giphy') || url.includes('cloudflare')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (e.request.destination === 'document') return res;
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(C).then(c => c.put(e.request, res.clone())).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) { data = {}; }
  const n   = data.notification || {};
  const title = n.title || 'Biyom';
  const body  = n.body  || 'Yeni bir bildirim var';
  const icon  = 'icon-192.png';
  e.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge: icon,
      tag: (data.data && data.data.tag) || 'biyom',
      data: { url: (data.data && data.data.url) || '/' },
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
