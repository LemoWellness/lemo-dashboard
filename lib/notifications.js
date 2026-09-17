// Server-only helpers for in-app task notifications. Not used by financials or Deployment Risk.
import { adminDb } from './firebaseAdmin';

export function dueSoonDays() {
  const n = Number(process.env.TASK_DUE_SOON_DAYS);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

export function todayYmdLA(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function formatDeadline(ymd) {
  if (!ymd) return 'no due date';
  const parts = String(ymd).split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : ymd;
}

export async function createNotification({ userEmail, type, taskId, taskName, dueDate, dedupeKey, title, body }) {
  const email = String(userEmail || '').toLowerCase().trim();
  if (!email || !dedupeKey) return { created: false, reason: 'missing-target' };
  const existing = await adminDb.collection('notifications').where('dedupeKey', '==', dedupeKey).limit(1).get();
  if (!existing.empty) return { created: false, reason: 'duplicate' };
  const doc = {
    userEmail: email,
    type,
    title,
    body,
    taskId: taskId || '',
    taskName: taskName || '',
    dueDate: dueDate || '',
    createdAt: new Date().toISOString(),
    read: false,
    dedupeKey,
  };
  const ref = await adminDb.collection('notifications').add(doc);
  return { created: true, id: ref.id };
}

export async function notifyTaskAssigned({ taskId, assignedTo, taskName, dueDate }) {
  const email = String(assignedTo || '').toLowerCase().trim();
  if (!email) return { created: false };
  return createNotification({
    userEmail: email,
    type: 'assigned',
    taskId,
    taskName,
    dueDate,
    dedupeKey: `assigned:${taskId}:${email}`,
    title: 'New Task Assigned',
    body: `${taskName || 'A task'} has been assigned to you. Due ${formatDeadline(dueDate)}.`,
  });
}

export async function notifyDueToday({ taskId, assignedTo, taskName, dueDate }) {
  const email = String(assignedTo || '').toLowerCase().trim();
  if (!email || !dueDate) return { created: false };
  return createNotification({
    userEmail: email,
    type: 'dueToday',
    taskId,
    taskName,
    dueDate,
    dedupeKey: `dueToday:${taskId}:${email}:${dueDate}`,
    title: 'Task Due Today',
    body: `${taskName || 'A task'} is due today.`,
  });
}

export async function notifyDueSoon({ taskId, assignedTo, taskName, dueDate, days }) {
  const email = String(assignedTo || '').toLowerCase().trim();
  if (!email || !dueDate) return { created: false };
  const n = days == null ? dueSoonDays() : days;
  const when = n === 1 ? 'tomorrow' : `in ${n} day${n === 1 ? '' : 's'}`;
  return createNotification({
    userEmail: email,
    type: 'dueSoon',
    taskId,
    taskName,
    dueDate,
    dedupeKey: `dueSoon:${taskId}:${email}:${dueDate}`,
    title: 'Task Due Soon',
    body: `${taskName || 'A task'} is due ${when} and has not been started.`,
  });
}

export async function runDueNotificationSweep() {
  const today = todayYmdLA();
  const soon = addDaysYmd(today, dueSoonDays());
  const snap = await adminDb.collection('tasks').get();
  const results = { dueToday: 0, dueSoon: 0, skipped: 0 };
  for (const doc of snap.docs) {
    const t = doc.data() || {};
    if (t.status === 'Done') { results.skipped += 1; continue; }
    if (!t.deadline) { results.skipped += 1; continue; }
    if (t.deadline === today) {
      const r = await notifyDueToday({ taskId: doc.id, assignedTo: t.assignedTo, taskName: t.task, dueDate: t.deadline });
      if (r.created) results.dueToday += 1;
    } else if (t.deadline === soon && t.status === 'Not Started') {
      const r = await notifyDueSoon({ taskId: doc.id, assignedTo: t.assignedTo, taskName: t.task, dueDate: t.deadline });
      if (r.created) results.dueSoon += 1;
    }
  }
  return { today, soon, dueSoonDays: dueSoonDays(), ...results };
}
