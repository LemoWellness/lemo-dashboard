import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function canModify(session, task) {
  if (session.role === 'Admin') return true;
  const email = session.email.toLowerCase();
  return email === String(task.addedBy || '').toLowerCase() || email === String(task.assignedTo || '').toLowerCase();
}

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('tasks').orderBy('timestamp', 'desc').get();
    const tasks = snap.docs.map((d) => {
      const t = d.data();
      return { id: d.id, ...t, canEdit: canModify(session, t), canDelete: canModify(session, t) };
    });
    return res.status(200).json({ tasks });
  }

  if (req.method === 'POST') {
    const { assignedTo, task, deadline, priority, notes } = req.body || {};
    if (!assignedTo) return res.status(400).json({ error: 'Assigned To is required.' });
    if (!task || !String(task).trim()) return res.status(400).json({ error: 'Task description is required.' });

    // TODO: Google Calendar invite on deadline (was CalendarApp in the old
    // Code.gs). Needs a service account with Calendar API access — see
    // .env.local.example. Left out of this first pass on purpose.
    const docRef = await adminDb.collection('tasks').add({
      timestamp: new Date().toISOString(),
      addedBy: session.email,
      assignedTo,
      task,
      deadline: deadline || '',
      priority: priority || 'Medium',
      status: 'Not Started',
      notes: notes || '',
      calendarEventId: '',
    });
    return res.status(200).json({ success: true, id: docRef.id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'tasks' });
