import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('users').get();
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const identifiers = users.map((u) => ({ uid: u.uid }));
    let authByUid = {};
    if (identifiers.length) {
      try {
        const result = await adminAuth.getUsers(identifiers);
        result.users.forEach((rec) => {
          authByUid[rec.uid] = rec.metadata?.lastSignInTime || '';
        });
      } catch (e) {
        console.error('users lastSignIn lookup failed', e.message);
      }
    }
    const out = users.map((u) => ({
      uid: u.uid,
      email: u.email || '',
      name: u.name || '',
      role: u.role === 'Admin' ? 'Admin' : 'Viewer',
      tabs: u.tabs,
      active: u.active !== false,
      taskDesk: (u.role === 'Admin' || u.role === 'Tasks Admin' || u.taskAdmin || u.taskDesk === 'hq') ? 'hq' : 'contractor',
      taskAdmin: u.role === 'Admin' || u.role === 'Tasks Admin' || !!u.taskAdmin,
      lastLogin: authByUid[u.uid] || '',
      homeScreen: !!u.lastStandaloneAt,
      lastStandaloneAt: u.lastStandaloneAt || '',
      standalonePlatform: u.standalonePlatform || '',
    }));
    return res.status(200).json({ users: out });
  }

  if (req.method === 'POST') {
    const { email, name, password, role, tabs } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const userRecord = await adminAuth.createUser({ email, password, displayName: name || email });
    const finalRole = role === 'Admin' ? 'Admin' : 'Viewer';
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase(),
      name: name || email,
      role: finalRole,
      tabs: finalRole === 'Admin' ? 'all' : (Array.isArray(tabs) ? tabs : []),
      active: true,
      taskDesk: finalRole === 'Admin' ? 'hq' : 'contractor',
      taskAdmin: finalRole === 'Admin',
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, uid: userRecord.uid });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { role: 'Admin' });
