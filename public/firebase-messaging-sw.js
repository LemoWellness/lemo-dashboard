/* LEMO Phase 2 Stage 1 — device registration only. Does not display or send push banners. */
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

function initMessaging() {
  return fetch('/api/push/public-config')
    .then(function (res) {
      if (!res.ok) throw new Error('public-config failed');
      return res.json();
    })
    .then(function (config) {
      if (!self.firebase.apps.length) self.firebase.initializeApp(config);
      self.firebase.messaging();
    })
    .catch(function (err) {
      console.error('LEMO messaging SW init failed', err);
    });
}

initMessaging();
