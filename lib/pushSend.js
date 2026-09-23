// Server-only. Sends FCM after an in-app notification row is created.
// Never throws to the caller after logging — task/inbox writes must survive push failure.
import { adminDb, adminMessaging } from './firebaseAdmin';

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

function clickUrl(taskId) {
  return taskId ? `/tasks?task=${encodeURIComponent(String(taskId))}` : '/tasks';
}

function isDeadTokenError(err) {
  const code = err && (err.code || (err.errorInfo && err.errorInfo.code) || '');
  if (DEAD_TOKEN_CODES.has(code)) return true;
  const msg = String((err && err.message) || '').toLowerCase();
  return msg.includes('requested entity was not found') || msg.includes('not registered');
}

function tokenTail(token) {
  return String(token || '').slice(-8);
}

function logPush(event, fields) {
  console.log(`[push] ${event} ${JSON.stringify(fields)}`);
}

export async function sendPushForNotification({
  userEmail, type, title, body, taskId, notificationId, dedupeKey,
}) {
  const email = String(userEmail || '').toLowerCase().trim();
  const base = {
    notificationId: String(notificationId || ''),
    type: String(type || ''),
    taskId: String(taskId || ''),
    email,
  };
  if (!email) {
    const result = { sent: 0, failed: 0, removed: 0, skipped: 'no-email', multicastCalled: false };
    logPush('skipped', { ...base, ...result, subscriptionCount: 0, subscriptions: [] });
    return result;
  }

  let snap;
  try {
    snap = await adminDb.collection('pushSubscriptions').where('userEmail', '==', email).get();
  } catch (err) {
    console.error('Push subscription lookup failed', err);
    const result = { sent: 0, failed: 0, removed: 0, skipped: 'lookup-failed', multicastCalled: false };
    logPush('skipped', {
      ...base,
      ...result,
      subscriptionCount: 0,
      subscriptions: [],
      error: String((err && err.message) || err),
    });
    return result;
  }
  const matched = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      platform: String(data.platform || 'unknown'),
      tokenTail: tokenTail(data.token),
      hasToken: Boolean(String(data.token || '').trim()),
      ref: d.ref,
      token: String(data.token || '').trim(),
    };
  });
  if (snap.empty) {
    const result = { sent: 0, failed: 0, removed: 0, skipped: 'no-devices', multicastCalled: false };
    logPush('skipped', { ...base, ...result, subscriptionCount: 0, subscriptions: [] });
    return result;
  }

  const docs = matched.filter((d) => d.hasToken);
  const tokens = docs.map((d) => d.token);
  const publicSubs = matched.map((d) => ({ platform: d.platform, tokenTail: d.tokenTail, hasToken: d.hasToken }));
  if (!tokens.length) {
    const result = { sent: 0, failed: 0, removed: 0, skipped: 'no-tokens', multicastCalled: false };
    logPush('skipped', { ...base, ...result, subscriptionCount: matched.length, subscriptions: publicSubs });
    return result;
  }

  const url = clickUrl(taskId);
  const data = {
    type: String(type || ''),
    taskId: String(taskId || ''),
    title: String(title || 'LEMO'),
    body: String(body || ''),
    url,
    notificationId: String(notificationId || ''),
  };

  logPush('multicast-start', {
    ...base,
    subscriptionCount: matched.length,
    tokenCount: tokens.length,
    subscriptions: publicSubs,
    multicastCalled: true,
  });

  let response;
  try {
    response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: String(title || 'LEMO'),
        body: String(body || ''),
      },
      data,
      webpush: {
        fcmOptions: { link: url },
        notification: {
          title: String(title || 'LEMO'),
          body: String(body || ''),
          icon: '/icon-192.png',
        },
      },
      android: {
        collapseKey: String(dedupeKey || type || 'lemo').slice(0, 64),
      },
    });
  } catch (err) {
    console.error('FCM sendEachForMulticast failed', err);
    const result = { sent: 0, failed: tokens.length, removed: 0, skipped: 'send-failed', multicastCalled: true };
    logPush('skipped', {
      ...base,
      ...result,
      subscriptionCount: matched.length,
      subscriptions: publicSubs,
      error: String((err && err.message) || err),
      code: err && (err.code || (err.errorInfo && err.errorInfo.code)) || '',
    });
    return result;
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  const batch = adminDb.batch();
  const tokenResults = [];
  response.responses.forEach((r, i) => {
    const sub = docs[i];
    if (r.success) {
      sent += 1;
      tokenResults.push({
        platform: sub.platform,
        tokenTail: sub.tokenTail,
        success: true,
        removed: false,
      });
      return;
    }
    failed += 1;
    const code = (r.error && (r.error.code || (r.error.errorInfo && r.error.errorInfo.code))) || '';
    const message = (r.error && r.error.message) || '';
    const dead = isDeadTokenError(r.error);
    if (dead) {
      batch.delete(sub.ref);
      removed += 1;
    }
    tokenResults.push({
      platform: sub.platform,
      tokenTail: sub.tokenTail,
      success: false,
      removed: dead,
      code,
      message,
    });
    console.error('FCM token send failed', code, message, sub.platform, sub.tokenTail);
  });
  if (removed) {
    try { await batch.commit(); } catch (err) {
      console.error('Failed to remove dead push tokens', err);
      tokenResults.forEach((t) => { if (t.removed) t.removed = false; });
      removed = 0;
    }
  }
  const result = { sent, failed, removed, skipped: '', multicastCalled: true };
  logPush('complete', {
    ...base,
    ...result,
    subscriptionCount: matched.length,
    subscriptions: publicSubs,
    tokenResults,
  });
  return { sent, failed, removed };
}
