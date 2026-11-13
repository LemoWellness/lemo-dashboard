import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function toIso(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') {
    try { return value.toDate().toISOString(); } catch (e) { return ''; }
  }
  return String(value);
}

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
          authByUid[rec.uid] = toIso(rec.metadata?.lastSignInTime);
        });
      } catch (e) {
        console.error('users lastSignIn lookup failed', e.message);
      }
    }
    const out = users.map((u) => {
      // Prefer the activity stamp we write on dashboard load. Fall back to
      // Firebase's password sign-in time for accounts that have not loaded yet.
      const seen = toIso(u.lastSeenAt);
      const signedIn = authByUid[u.uid] || '';
      const lastLogin = seen && signedIn
        ? (seen > signedIn ? seen : signedIn)
        : (seen || signedIn);
      return {
        uid: u.uid,
        email: u.email || '',
        name: u.name || '',
        role: u.role === 'Admin' ? 'Admin' : 'Viewer',
        tabs: u.tabs,
        active: u.active !== false,
        taskDesk: (u.role === 'Admin' || u.role === 'Tasks Admin' || u.taskAdmin || u.taskDesk === 'hq') ? 'hq' : 'contractor',
        taskAdmin: u.role === 'Admin' || u.role === 'Tasks Admin' || !!u.taskAdmin,
        timeOffAdmin: u.role === 'Admin' || !!u.timeOffAdmin,
        lastLogin,
        homeScreen: !!u.lastStandaloneAt,
        lastStandaloneAt: u.lastStandaloneAt || '',
        standalonePlatform: u.standalonePlatform || '',
      };
    });
    return res.status(200).json({ users: out });
  }

  if (req.method === 'POST') {
    const { email, name, password, role, tabs, timeOffAdmin, taskAdmin } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const userRecord = await adminAuth.createUser({ email, password, displayName: name || email });
    const finalRole = role === 'Admin' ? 'Admin' : 'Viewer';
    const isAdmin = finalRole === 'Admin';
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase(),
      name: name || email,
      role: finalRole,
      tabs: isAdmin ? 'all' : (Array.isArray(tabs) ? tabs : []),
      active: true,
      taskDesk: (isAdmin || taskAdmin) ? 'hq' : 'contractor',
      taskAdmin: isAdmin || !!taskAdmin,
      timeOffAdmin: isAdmin || !!timeOffAdmin,
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, uid: userRecord.uid });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { role: 'Admin' });
