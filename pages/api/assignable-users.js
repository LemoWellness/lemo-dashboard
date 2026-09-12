// Any logged-in user (not just Admins) can see who else is registered, so
// the Tasks tab can offer a proper "Assigned To" dropdown instead of free
// text — matching getAssignableUsers() in the old Auth.gs. Only active users.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const snap = await adminDb.collection('users').where('active', '==', true).get();
  const users = snap.docs.map((d) => {
    const u = d.data();
    return { email: (u.email || '').toLowerCase(), name: u.name || u.email };
  });
  res.status(200).json({ users });
});
