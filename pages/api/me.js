import { adminDb } from '../../lib/firebaseAdmin';
import { requireSession } from '../../lib/auth';

export default async function handler(req, res) {
  try {
    const session = await requireSession(req);
    const ref = adminDb.collection('users').doc(session.uid);
    const now = new Date().toISOString();

    if (req.method === 'POST' && req.body && req.body.standalone) {
      const platform = String(req.body.platform || '').slice(0, 32);
      await ref.set({
        lastSeenAt: now,
        lastStandaloneAt: now,
        standalonePlatform: platform || 'pwa',
      }, { merge: true });
      return res.status(200).json({ ...session, homeScreen: true });
    }

    // Stamp last activity on normal loads so Manage Users reflects real use,
    // not only the rare full password sign-in.
    ref.set({ lastSeenAt: now }, { merge: true }).catch(() => {});
    res.status(200).json(session);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
