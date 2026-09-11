import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('users').get();
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
    const { email, name, password, role, tabs } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    // Creates the actual Firebase Auth account (replaces the salted-hash row
    // in the old hidden Users sheet) plus the role/tabs doc our auth layer reads.
    const userRecord = await adminAuth.createUser({ email, password, displayName: name || email });
    const finalRole = role === 'Admin' ? 'Admin' : 'Viewer';
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase(),
      name: name || email,
      role: finalRole,
      tabs: finalRole === 'Admin' ? 'all' : (Array.isArray(tabs) ? tabs : []),
      active: true,
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, uid: userRecord.uid });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { role: 'Admin' });
