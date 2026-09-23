// Phase 2 Stage 1 — device registration only. Does not send push messages.
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, authedFetch } from './firebaseClient';

const DISMISS_KEY = 'lemoPushBannerDismissed';

export function vapidKey() {
  return String(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '').trim();
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function bannerDismissed() {
  try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
}

export function dismissBanner() {
  try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* ignore */ }
}

export async function getPushCapability() {
  const platform = detectPlatform();
  const standalone = isStandaloneDisplay();
  const permission = notificationPermission();
  const sw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const hasVapid = Boolean(vapidKey());
  let supported = false;
  try {
    supported = Boolean(sw && hasVapid && await isSupported());
  } catch (e) {
    supported = false;
  }
  const iosNeedsHomeScreen = platform === 'ios' && !standalone;
  return {
    platform,
    standalone,
    permission,
    supported,
    hasVapid,
    iosNeedsHomeScreen,
    canEnable: supported && !iosNeedsHomeScreen && permission !== 'denied',
  };
}

export async function listRegisteredDevices() {
  const res = await authedFetch('/api/push/subscribe');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load registered devices.');
  return data;
}

export async function registerPushDevice() {
  if (!vapidKey()) throw new Error('Device notifications are not configured yet.');
  const cap = await getPushCapability();
  if (cap.iosNeedsHomeScreen) {
    throw new Error('On iPhone, add LEMO to your Home Screen and open it from that icon first.');
  }
  if (!cap.supported) {
    throw new Error('This browser cannot register for device notifications.');
  }
  if (typeof Notification === 'undefined') {
    throw new Error('Notifications are not available in this browser.');
  }
  const perm = cap.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('Could not get a device token.');
  const res = await authedFetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      token,
      userAgent: navigator.userAgent || '',
      platform: cap.platform,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not save this device.');
  return { tokenTail: String(token).slice(-8), ...data };
}
