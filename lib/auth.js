// Server-only. This replaces the whole role/tab permission layer that used
// to live in Auth.gs (validateSession_, requireTab_, requireAdmin_).
//
// WHY THIS EXISTS: Firebase Auth only proves WHO someone is (a verified
// email/uid). It has no concept of "Admin vs Viewer" or "can see the Tasks
// tab but not Expenses" — that's LEMO-specific business logic, so it lives
// here, backed by a `users/{uid}` Firestore document instead of the old
// hidden `Users` sheet.
//
// users/{uid} shape:
//   { email, name, role: 'Admin' | 'Viewer', tabs: 'all' | string[], active: boolean }
import { adminAuth, adminDb } from './firebaseAdmin';

class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 401;
  }
}

/**
 * Verifies the Firebase ID token on the request and loads the matching
 * users/{uid} doc. Throws AuthError (401/403) on any failure. This is the
 * single gate every API route should call first — direct equivalent of
 * validateSession_(token) in the old Auth.gs.
 */
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

  return {
    uid: decoded.uid,
    email: (data.email || decoded.email || '').toLowerCase(),
    name: data.name || data.email || decoded.email,
    role: data.role || 'Viewer',
    tabs: data.role === 'Admin' ? 'all' : (data.tabs || []),
  };
}

/** Direct equivalent of requireTab_() in the old Auth.gs. */
export function requireTab(session, tabCode) {
  if (session.role === 'Admin') return;
  if (session.tabs === 'all') return;
  if (!Array.isArray(session.tabs) || session.tabs.indexOf(tabCode) === -1) {
    throw new AuthError('You do not have access to this section. Contact your administrator if this seems wrong.', 403);
  }
}

/** Direct equivalent of requireAdmin_() in the old Auth.gs. */
export function requireAdmin(session) {
  if (session.role !== 'Admin') {
    throw new AuthError('Only an administrator can do that.', 403);
  }
}

/**
 * Wraps a Next.js API route handler with session handling and consistent
 * error responses, so individual routes don't repeat try/catch boilerplate.
 * Usage: export default withAuth(async (req, res, session) => { ... }, { tab: 'loc' })
 */
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
