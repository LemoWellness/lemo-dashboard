// Server-only. This replaces the whole role/tab permission layer that used
// to live in Auth.gs (validateSession_, requireTab_, requireAdmin_).
//
// users/{uid} shape:
//   { email, name, role: 'Admin' | 'Viewer', tabs: 'all' | string[], active: boolean,
//     taskDesk: 'hq' | 'contractor', taskAdmin: boolean }
import { adminAuth, adminDb } from './firebaseAdmin';

class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 401;
  }
}

export async function requireSession(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new AuthError('You need to log in first.', 401);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(match[1]);
  } catch (e) {
    throw new AuthError('Your session has expired. Please log in again.', 401);
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists) {
    throw new AuthError('Your account is not set up yet. Contact your administrator.', 403);
  }
  const data = userDoc.data();
  if (data.active === false) {
    throw new AuthError('This account has been deactivated. Contact your administrator.', 403);
  }

  const taskAdmin = data.role === 'Admin' || data.role === 'Tasks Admin' || data.taskAdmin === true;
  return {
    uid: decoded.uid,
    email: (data.email || decoded.email || '').toLowerCase(),
    name: data.name || data.email || decoded.email,
    role: data.role === 'Admin' ? 'Admin' : 'Viewer',
    tabs: data.role === 'Admin' ? 'all' : (data.tabs || []),
    taskDesk: (data.role === 'Admin' || taskAdmin || data.taskDesk === 'hq') ? 'hq' : 'contractor',
    taskAdmin,
  };
}

export function requireTab(session, tabCode) {
  if (session.role === 'Admin') return;
  if (session.tabs === 'all') return;
  if (!Array.isArray(session.tabs) || session.tabs.indexOf(tabCode) === -1) {
    throw new AuthError('You do not have access to this section. Contact your administrator if this seems wrong.', 403);
  }
}

export function requireAdmin(session) {
  if (session.role !== 'Admin') {
    throw new AuthError('Only an administrator can do that.', 403);
  }
}

export function withAuth(handler, { tab, role } = {}) {
  return async function (req, res) {
    try {
      const session = await requireSession(req);
      if (role) requireAdmin(session);
      if (tab) requireTab(session, tab);
      await handler(req, res, session);
    } catch (err) {
      const status = err instanceof AuthError ? err.status : 500;
      if (status === 500) console.error(err);
      res.status(status).json({ error: err.message || 'Something went wrong.' });
    }
  };
}
