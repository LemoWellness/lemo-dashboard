import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function canModify(session, task) {
  if (session.role === 'Admin') return true;
  const email = session.email.toLowerCase();
  return email === String(task.addedBy || '').toLowerCase() || email === String(task.assignedTo || '').toLowerCase();
}
function canDelete(session, task) {
  if (session.role === 'Admin') return true;
  return session.email.toLowerCase() === String(task.addedBy || '').toLowerCase();
}

export default withAuth(async (req, res, session) => {
  const ref = adminDb.collection('tasks').doc(String(req.query.id));
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Task not found.' });
  const task = doc.data();

  if (req.method === 'PATCH') {
    const { status, assignedTo, task: taskText, deadline, priority, notes } = req.body || {};
    if (status !== undefined) {
      if (!canModify(session, task)) {
        return res.status(403).json({ error: 'Only the person who added this task, the assignee, or an Admin can update it.' });
      }
      await ref.update({ status });
      return res.status(200).json({ success: true });
    }
    if (!canModify(session, task)) {
      return res.status(403).json({ error: 'Only the person who added this task, the assignee, or an Admin can edit it.' });
    }
    await ref.update({
      assignedTo: assignedTo ?? task.assignedTo,
      task: taskText ?? task.task,
      deadline: deadline ?? task.deadline,
      priority: priority ?? task.priority,
      notes: notes ?? task.notes,
    });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    if (!canDelete(session, task)) {
      return res.status(403).json({ error: 'Only the person who created this task (or an Admin) can delete it.' });
    }
    // TODO: also delete the linked Google Calendar event once Calendar is wired up.
    await ref.delete();
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'tasks' });
