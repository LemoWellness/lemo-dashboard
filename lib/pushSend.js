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

export async function sendPushForNotification({
  userEmail, type, title, body, taskId, notificationId, dedupeKey,
}) {
  const email = String(userEmail || '').toLowerCase().trim();
  if (!email) return { sent: 0, failed: 0, removed: 0, skipped: 'no-email' };

  let snap;
  try {
    snap = await adminDb.collection('pushSubscriptions').where('userEmail', '==', email).get();
  } catch (err) {
    console.error('Push subscription lookup failed', err);
    return { sent: 0, failed: 0, removed: 0, skipped: 'lookup-failed' };
  }
  if (snap.empty) return { sent: 0, failed: 0, removed: 0, skipped: 'no-devices' };

  const docs = snap.docs.filter((d) => String((d.data() || {}).token || '').trim());
  const tokens = docs.map((d) => String(d.data().token).trim());
  if (!tokens.length) return { sent: 0, failed: 0, removed: 0, skipped: 'no-tokens' };

  const url = clickUrl(taskId);
  const data = {
    type: String(type || ''),
    taskId: String(taskId || ''),
    title: String(title || 'LEMO'),
    body: String(body || ''),
    url,
    notificationId: String(notificationId || ''),
  };

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
    return { sent: 0, failed: tokens.length, removed: 0, skipped: 'send-failed' };
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  const batch = adminDb.batch();
  response.responses.forEach((r, i) => {
    if (r.success) {
      sent += 1;
      return;
    }
    failed += 1;
    if (isDeadTokenError(r.error)) {
      batch.delete(docs[i].ref);
      removed += 1;
    } else {
      console.error('FCM token send failed', r.error && r.error.code, r.error && r.error.message);
    }
  });
  if (removed) {
    try { await batch.commit(); } catch (err) {
      console.error('Failed to remove dead push tokens', err);
      removed = 0;
    }
  }
  return { sent, failed, removed };
}
