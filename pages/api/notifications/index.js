import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  const email = String(session.email || '').toLowerCase();

  if (req.method === 'GET') {
    const snap = await adminDb.collection('notifications').where('userEmail', '==', email).get();
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return res.status(200).json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  }

  if (req.method === 'PATCH') {
    const { id, all } = req.body || {};
    if (all) {
      const snap = await adminDb.collection('notifications').where('userEmail', '==', email).get();
      const batch = adminDb.batch();
      snap.docs.forEach((d) => {
        if (!d.data().read) batch.update(d.ref, { read: true });
      });
      await batch.commit();
      return res.status(200).json({ success: true });
    }
    if (!id) return res.status(400).json({ error: 'Notification id is required.' });
    const ref = adminDb.collection('notifications').doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Notification not found.' });
    if (String(doc.data().userEmail || '').toLowerCase() !== email) {
      return res.status(403).json({ error: 'You can only update your own notifications.' });
    }
    await ref.update({ read: true });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
});
