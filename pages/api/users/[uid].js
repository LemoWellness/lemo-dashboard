import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function normalizeRole(role) {
  if (role === 'Admin') return 'Admin';
  return 'Viewer';
}

export default withAuth(async (req, res) => {
  const { uid } = req.query;
  const ref = adminDb.collection('users').doc(String(uid));

  if (req.method === 'PATCH') {
    const { role, tabs, active, newPassword, taskDesk, taskAdmin } = req.body || {};
    const updates = {};
    if (role) {
      if (role === 'Tasks Admin') {
        updates.role = 'Viewer';
        updates.taskAdmin = true;
        updates.taskDesk = 'hq';
      } else {
        updates.role = normalizeRole(role);
      }
    }
    if (updates.role === 'Admin') {
      updates.tabs = 'all';
      updates.taskDesk = 'hq';
      updates.taskAdmin = true;
    } else if (tabs !== undefined) {
      updates.tabs = Array.isArray(tabs) ? tabs : [];
    }
    if (active !== undefined) updates.active = !!active;
    if (taskAdmin !== undefined) {
      updates.taskAdmin = !!taskAdmin;
      if (updates.taskAdmin) updates.taskDesk = 'hq';
    }
    if (taskDesk === 'hq' || taskDesk === 'contractor') {
      if (updates.role !== 'Admin') updates.taskDesk = taskDesk;
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
