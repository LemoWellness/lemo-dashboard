/* LEMO Phase 2 Stage 2 — show system banners when the app is in the background or closed. */
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');
importScripts('/firebase-messaging-config.js');

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

(function initMessagingSync() {
  try {
    var config = self.__LEMO_FIREBASE_CONFIG || {};
    if (typeof config.appId === 'string') config.appId = config.appId.trim();
    if (!self.firebase.apps.length) self.firebase.initializeApp(config);
    var messaging = self.firebase.messaging();
    messaging.onBackgroundMessage(function (payload) {
      var data = (payload && payload.data) || {};
      var title = data.title || 'LEMO';
      var body = data.body || '';
      var url = data.url || '/tasks';
      return self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
          url: url,
          taskId: data.taskId || '',
          type: data.type || '',
        },
      });
    });
  } catch (err) {
    console.error('LEMO messaging SW init failed', err);
  }
}());

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var url = data.url || '/tasks';
  if (url.charAt(0) === '/') url = self.location.origin + url;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i += 1) {
        var client = list[i];
        if (client.url && 'focus' in client) {
          if (client.navigate) client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
