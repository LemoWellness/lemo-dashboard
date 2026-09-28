import { adminDb } from '../../lib/firebaseAdmin';
import { requireSession } from '../../lib/auth';

export default async function handler(req, res) {
  try {
    const session = await requireSession(req);
    if (req.method === 'POST' && req.body && req.body.standalone) {
      const platform = String(req.body.platform || '').slice(0, 32);
      await adminDb.collection('users').doc(session.uid).set({
        lastStandaloneAt: new Date().toISOString(),
        standalonePlatform: platform || 'pwa',
      }, { merge: true });
      return res.status(200).json({ ...session, homeScreen: true });
    }
    res.status(200).json(session);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
