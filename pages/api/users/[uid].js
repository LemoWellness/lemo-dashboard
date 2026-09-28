import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function normalizeRole(role) {
  if (role === 'Admin') return 'Admin';
  if (role === 'Tasks Admin') return 'Tasks Admin';
  return 'Viewer';
}

export default withAuth(async (req, res) => {
  const { uid } = req.query;
  const ref = adminDb.collection('users').doc(String(uid));

  if (req.method === 'PATCH') {
    const { role, tabs, active, newPassword, taskDesk } = req.body || {};
    const updates = {};
    if (role) updates.role = normalizeRole(role);
    if (updates.role === 'Admin') {
      updates.tabs = 'all';
      updates.taskDesk = 'hq';
    } else if (updates.role === 'Tasks Admin') {
      updates.taskDesk = 'hq';
      if (tabs !== undefined) updates.tabs = Array.isArray(tabs) ? tabs : ['tasks'];
    } else if (tabs !== undefined) updates.tabs = Array.isArray(tabs) ? tabs : [];
    if (active !== undefined) updates.active = !!active;
    if (taskDesk === 'hq' || taskDesk === 'contractor') {
      if (updates.role !== 'Admin' && updates.role !== 'Tasks Admin') updates.taskDesk = taskDesk;
    }
    if (Object.keys(updates).length) await ref.update(updates);

    if (newPassword) {
      if (String(newPassword).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      await adminAuth.updateUser(String(uid), { password: newPassword });
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { role: 'Admin' });
