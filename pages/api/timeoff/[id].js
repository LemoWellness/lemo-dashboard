import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed.' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id.' });

  const ref = adminDb.collection('timeOff').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Request not found.' });
  const row = snap.data() || {};
  const canManage = session.role === 'Admin' || !!session.timeOffAdmin;
  const isOwner = String(row.userEmail || '').toLowerCase() === String(session.email || '').toLowerCase();

  const { action, note } = req.body || {};
  const now = new Date().toISOString();

  if (action === 'approve' || action === 'deny') {
    if (!canManage) return res.status(403).json({ error: 'Only a Time Off admin can approve or deny.' });
    if (row.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be reviewed.' });
    await ref.update({
      status: action === 'approve' ? 'approved' : 'denied',
      reviewedBy: session.email,
      reviewedAt: now,
      reviewNote: String(note || '').trim(),
    });
    return res.status(200).json({ success: true });
  }

  if (action === 'withdraw') {
    if (!isOwner) return res.status(403).json({ error: 'You can only withdraw your own request.' });
    if (row.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be withdrawn.' });
    await ref.update({ status: 'cancelled', reviewedAt: now, reviewNote: 'Withdrawn by requester' });
    return res.status(200).json({ success: true });
  }

  if (action === 'cancel') {
    if (!canManage && !isOwner) return res.status(403).json({ error: 'Not allowed.' });
    if (row.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled.' });
    await ref.update({ status: 'cancelled', reviewedBy: session.email, reviewedAt: now, reviewNote: String(note || '').trim() });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}, { tab: 'timeoff' });
