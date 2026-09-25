import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: 'location query param is required.' });
    const snap = await adminDb
      .collection('communicationLog')
      .where('location', '==', location)
      .orderBy('date', 'desc')
      .limit(20)
      .get();
    return res.status(200).json({ notes: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { id, location, date, note, channel } = req.body || {};
    if (!location) return res.status(400).json({ error: 'No location specified.' });
    if (!note || !String(note).trim()) return res.status(400).json({ error: 'Note text is required.' });
    const payload = {
      location,
      date: date || new Date().toISOString().slice(0, 10),
      note,
      channel: channel || '',
    };
    if (req.method === 'POST') {
      const docRef = await adminDb.collection('communicationLog').add({
        ...payload,
        loggedBy: session.name,
        enteredBy: session.email,
        createdAt: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, id: docRef.id });
    }
    if (!id) return res.status(400).json({ error: 'Missing note id.' });
    const ref = adminDb.collection('communicationLog').doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Note not found.' });
    await ref.update({ ...payload, updatedBy: session.email, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
