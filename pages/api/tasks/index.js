import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { notifyTaskAssigned } from '../../../lib/notifications';

function emailOf(session) {
  return String(session.email || '').toLowerCase();
}
function isCreator(session, task) {
  return emailOf(session) === String(task.addedBy || '').toLowerCase();
}
function isAssignee(session, task) {
  const email = emailOf(session);
  return email === String(task.assignedTo || '').toLowerCase() || email === String(task.assignedTo2 || '').toLowerCase();
}
function isTaskAdmin(session) {
  return session.role === 'Admin' || !!session.taskAdmin;
}
function isHq(session) {
  return isTaskAdmin(session) || session.taskDesk === 'hq';
}
function canSee(session, task) {
  return isHq(session) || isCreator(session, task) || isAssignee(session, task);
}
function flags(session, task) {
  const edit = isTaskAdmin(session) || isCreator(session, task);
  const work = edit || isAssignee(session, task);
  const closed = task.status === 'Cancelled' || task.status === 'Cancel Requested';
  return {
    canEdit: edit && task.status !== 'Cancelled',
    canDelete: edit,
    canUpdateStatus: work && !closed,
    canAddUpdate: work && task.status !== 'Cancelled',
    canRequestCancel: isAssignee(session, task) && !closed,
    canDecideCancel: edit && task.status === 'Cancel Requested',
  };
}
function displayAddedBy(task) {
  if (task.addedByLabel) return task.addedByLabel;
  if (task.source === 'meeting-notes') return 'Gemini';
  return task.addedBy;
}
function cleanSecond(first, second) {
  const a = String(first || '').toLowerCase();
  const b = String(second || '').toLowerCase();
  return b && b !== a ? b : '';
}

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const col = adminDb.collection('tasks');
    let docs;
    if (isHq(session)) {
      const snap = await col.orderBy('timestamp', 'desc').get();
      docs = snap.docs;
    } else {
      const emails = [...new Set([emailOf(session), session.email].filter(Boolean))];
      const snaps = await Promise.all(emails.flatMap((e) => [
        col.where('addedBy', '==', e).get(),
        col.where('assignedTo', '==', e).get(),
        col.where('assignedTo2', '==', e).get(),
      ]));
      const byId = new Map();
      snaps.forEach((snap) => {
        snap.docs.forEach((d) => byId.set(d.id, d));
      });
      docs = [...byId.values()].sort((a, b) => String(b.data().timestamp || '').localeCompare(String(a.data().timestamp || '')));
    }
    const tasks = docs
      .map((d) => {
        const t = d.data();
        const mine = emailOf(session);
        const notes = t.privateNotes && typeof t.privateNotes === 'object' ? t.privateNotes : {};
        const isMine = mine === String(t.assignedTo || '').toLowerCase() || mine === String(t.assignedTo2 || '').toLowerCase();
        const { privateNotes, ...rest } = t;
        return {
          id: d.id,
          ...rest,
          ...flags(session, t),
          addedBy: displayAddedBy(t),
          canPrivateNote: isMine,
          privateNote: isMine ? String(notes[mine] || notes[session.email] || '') : '',
        };
      })
      .filter((t) => canSee(session, t));
    return res.status(200).json({ tasks });
  }

  if (req.method === 'POST') {
    const { assignedTo, assignedTo2, task, deadline, priority, notes } = req.body || {};
    if (!assignedTo) return res.status(400).json({ error: 'Assigned To is required.' });
    if (!task || !String(task).trim()) return res.status(400).json({ error: 'Task description is required.' });
    const second = cleanSecond(assignedTo, assignedTo2);

    const firstNote = String(notes || '').trim();
    const updates = firstNote ? [{
      id: `u-${Date.now()}`,
      at: new Date().toISOString(),
      by: session.email,
      byName: session.name || session.email,
      text: firstNote,
      kind: 'created',
    }] : [];

    const docRef = await adminDb.collection('tasks').add({
      timestamp: new Date().toISOString(),
      addedBy: session.email,
      assignedTo,
      assignedTo2: second,
      task: String(task).trim(),
      deadline: deadline || '',
      priority: priority || 'Medium',
      status: 'Not Started',
      notes: firstNote,
      updates,
      calendarEventId: '',
    });
    const name = String(task).trim();
    try {
      await notifyTaskAssigned({ taskId: docRef.id, assignedTo, taskName: name, dueDate: deadline || '' });
      if (second) await notifyTaskAssigned({ taskId: docRef.id, assignedTo: second, taskName: name, dueDate: deadline || '' });
    } catch (err) {
      console.error('Assignment notification failed', err);
    }
    return res.status(200).json({ success: true, id: docRef.id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'tasks' });
