import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res) => {
  const { uid } = req.query;
  const ref = adminDb.collection('users').doc(String(uid));

  if (req.method === 'PATCH') {
    const { role, tabs, active, newPassword, taskDesk } = req.body || {};
    const updates = {};
    if (role) updates.role = role === 'Admin' ? 'Admin' : 'Viewer';
    if (updates.role === 'Admin') updates.tabs = 'all';
    else if (tabs !== undefined) updates.tabs = Array.isArray(tabs) ? tabs : [];
    if (active !== undefined) updates.active = !!active;
    if (taskDesk === 'hq' || taskDesk === 'contractor') updates.taskDesk = taskDesk;
    if (Object.keys(updates).length) await ref.update(updates);

    if (newPassword) {
      if (String(newPassword).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      await adminAuth.updateUser(String(uid), { password: newPassword });
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { role: 'Admin' });
