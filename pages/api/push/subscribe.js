import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function summarize(doc) {
  const data = doc.data() || {};
  const token = String(data.token || '');
  return {
    id: doc.id,
    platform: data.platform || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    userAgent: data.userAgent || '',
    tokenTail: token.slice(-8),
  };
}

export default withAuth(async (req, res, session) => {
  const email = String(session.email || '').toLowerCase();
  const col = adminDb.collection('pushSubscriptions');

  if (req.method === 'GET') {
    const snap = await col.where('userEmail', '==', email).get();
    const devices = snap.docs.map(summarize)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return res.status(200).json({ devices, count: devices.length });
  }

  if (req.method === 'POST') {
    const token = String((req.body || {}).token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token is required.' });
    const userAgent = String((req.body || {}).userAgent || '').slice(0, 500);
    const platform = String((req.body || {}).platform || 'unknown').slice(0, 32);
    const now = new Date().toISOString();
    const existing = await col.where('token', '==', token).limit(1).get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      await doc.ref.update({
        userEmail: email,
        uid: session.uid,
        userAgent,
        platform,
        updatedAt: now,
      });
      return res.status(200).json({ success: true, id: doc.id, email, created: false, tokenTail: token.slice(-8) });
    }
    const ref = await col.add({
      userEmail: email,
      uid: session.uid,
      token,
      userAgent,
      platform,
      createdAt: now,
      updatedAt: now,
    });
    return res.status(200).json({ success: true, id: ref.id, email, created: true, tokenTail: token.slice(-8) });
  }

  if (req.method === 'DELETE') {
    const token = String((req.body || {}).token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token is required.' });
    const existing = await col.where('token', '==', token).limit(5).get();
    let removed = 0;
    const batch = adminDb.batch();
    existing.docs.forEach((d) => {
      if (String(d.data().userEmail || '').toLowerCase() === email) {
        batch.delete(d.ref);
        removed += 1;
      }
    });
    if (removed) await batch.commit();
    return res.status(200).json({ success: true, removed });
  }

  res.status(405).json({ error: 'Method not allowed.' });
});
