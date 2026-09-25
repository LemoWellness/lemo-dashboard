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
  return emailOf(session) === String(task.assignedTo || '').toLowerCase();
}
function isHq(session) {
  return session.role === 'Admin' || session.taskDesk === 'hq';
}
function canSee(session, task) {
  return isHq(session) || isCreator(session, task) || isAssignee(session, task);
}
function flags(session, task) {
  const edit = session.role === 'Admin' || isCreator(session, task);
  return {
    canEdit: edit,
    canDelete: edit,
    canUpdateStatus: edit || isAssignee(session, task),
    canAddUpdate: edit || isAssignee(session, task),
  };
}

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('tasks').orderBy('timestamp', 'desc').get();
    const tasks = snap.docs
      .map((d) => {
        const t = d.data();
        return { id: d.id, ...t, ...flags(session, t) };
      })
      .filter((t) => canSee(session, t));
    return res.status(200).json({ tasks });
  }

  if (req.method === 'POST') {
    const { assignedTo, task, deadline, priority, notes } = req.body || {};
    if (!assignedTo) return res.status(400).json({ error: 'Assigned To is required.' });
    if (!task || !String(task).trim()) return res.status(400).json({ error: 'Task description is required.' });

    const firstNote = String(notes || '').trim();
    const updates = firstNote ? [{
      id: `u-${Date.now()}`,
      at: new Date().toISOString(),
      by: session.email,
      byName: session.name || session.email,
      text: firstNote,
      kind: 'note',
    }] : [];

    const docRef = await adminDb.collection('tasks').add({
      timestamp: new Date().toISOString(),
      addedBy: session.email,
      assignedTo,
      task: String(task).trim(),
      deadline: deadline || '',
      priority: priority || 'Medium',
      status: 'Not Started',
      notes: firstNote,
      updates,
      calendarEventId: '',
    });
    try {
      await notifyTaskAssigned({ taskId: docRef.id, assignedTo, taskName: String(task).trim(), dueDate: deadline || '' });
    } catch (err) {
      console.error('Assignment notification failed', err);
    }
    return res.status(200).json({ success: true, id: docRef.id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'tasks' });
