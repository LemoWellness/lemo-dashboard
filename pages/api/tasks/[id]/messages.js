import { adminDb } from '../../../../lib/firebaseAdmin';
import { withAuth } from '../../../../lib/auth';
import { notifyPrivateMessage } from '../../../../lib/notifications';

function emailOf(session) {
  return String(session.email || '').toLowerCase().trim();
}
function pairKey(taskId, a, b) {
  return [String(taskId), ...[a, b].sort()].join('|');
}
function associated(task) {
  return [...new Set([task.addedBy, task.assignedTo, task.assignedTo2].map((v) => String(v || '').toLowerCase().trim()).filter(Boolean))];
}
function publicMessage(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    from: data.from || '',
    to: data.to || '',
    text: data.text || '',
    at: data.at || '',
    readAt: data.readAt || '',
    nudged: !!data.nudged,
  };
}

export default withAuth(async (req, res, session) => {
  const me = emailOf(session);
  if (!me) return res.status(401).json({ error: 'Unauthorized.' });
  const taskId = String(req.query.id || '');
  const taskSnap = await adminDb.collection('tasks').doc(taskId).get();
  if (!taskSnap.exists) return res.status(404).json({ error: 'Task not found.' });
  const task = taskSnap.data() || {};
  const people = associated(task);
  const others = people.filter((p) => p !== me);

  if (req.method === 'GET') {
    const other = String(req.query.with || '').toLowerCase().trim();
    if (!other || other === me) return res.status(200).json({ messages: [], frozen: false, people: others });
    const key = pairKey(taskId, me, other);
    const snap = await adminDb.collection('taskMessages').where('pairKey', '==', key).get();
    const mine = snap.docs.filter((doc) => (doc.data().participants || []).includes(me));
    if (!mine.length && !people.includes(me)) return res.status(403).json({ error: 'You cannot view this conversation.' });
    const now = new Date().toISOString();
    const batch = adminDb.batch();
    let marked = 0;
    mine.forEach((doc) => {
      const data = doc.data() || {};
      if (data.to === me && !data.readAt) {
        batch.update(doc.ref, { readAt: now });
        marked += 1;
      }
    });
    if (marked) await batch.commit();
    const messages = mine
      .map((doc) => {
        const row = publicMessage(doc);
        if (row.to === me && !row.readAt) row.readAt = now;
        return row;
      })
      .sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return res.status(200).json({ messages, frozen: !people.includes(me) || !people.includes(other), people: others });
  }

  if (req.method === 'POST') {
    if (!people.includes(me)) return res.status(403).json({ error: 'Only people currently on this task can send a message.' });
    const body = req.body || {};
    if (body.nudgeId) {
      const ref = adminDb.collection('taskMessages').doc(String(body.nudgeId));
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Message not found.' });
      const data = doc.data() || {};
      if (data.from !== me || !(data.participants || []).includes(me)) return res.status(403).json({ error: 'You cannot nudge this message.' });
      if (!people.includes(data.to)) return res.status(400).json({ error: 'This conversation is frozen.' });
      if (data.readAt) return res.status(400).json({ error: 'This message has already been read.' });
      if (data.nudged) return res.status(400).json({ error: 'This message was already nudged.' });
      await ref.update({ nudged: true });
      try {
        await notifyPrivateMessage({ taskId, recipientEmail: data.to, senderName: session.name || session.email, taskName: task.task, messageId: doc.id, nudge: true });
      } catch (err) {
        console.error('Private nudge failed', err);
      }
      return res.status(200).json({ success: true });
    }
    const to = String(body.to || '').toLowerCase().trim();
    const text = String(body.text || '').trim();
    if (!to || to === me || !people.includes(to)) return res.status(400).json({ error: 'Choose a person already on this task.' });
    if (!text) return res.status(400).json({ error: 'Message text is required.' });
    const at = new Date().toISOString();
    const ref = await adminDb.collection('taskMessages').add({
      taskId,
      pairKey: pairKey(taskId, me, to),
      participants: [me, to].sort(),
      from: me,
      to,
      text,
      at,
      readAt: '',
      nudged: false,
    });
    try {
      await notifyPrivateMessage({ taskId, recipientEmail: to, senderName: session.name || session.email, taskName: task.task, messageId: ref.id, nudge: false });
    } catch (err) {
      console.error('Private message notification failed', err);
    }
    return res.status(200).json({ success: true, id: ref.id });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'tasks' });
