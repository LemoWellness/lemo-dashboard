import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

const MONTH_RE = /^\d{4}-\d{2}$/;

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const { location } = req.query;
    let q = adminDb.collection('income').orderBy('date', 'desc');
    if (location) q = adminDb.collection('income').where('location', '==', location).orderBy('date', 'desc');
    const snap = await q.limit(200).get();
    return res.status(200).json({ income: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const { id, location, date, amount, notes, grossRevenue, periodMonth } = req.body || {};
    if (!location) return res.status(400).json({ error: 'No location specified.' });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be a positive number.' });
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    const paidFor = String(periodMonth || date).slice(0, 7);
    if (!MONTH_RE.test(paidFor)) return res.status(400).json({ error: 'Paying for month is required.' });

    const projectDoc = await adminDb.collection('projects').doc(location).get();
    const businessModel = projectDoc.exists ? projectDoc.data().businessModel : null;
    if (businessModel !== 'Corporate Wellness') {
      return res.status(400).json({
        error: `Adding income this way is only available for Corporate Wellness locations. "${location}" is ${businessModel || 'not a recognized location'}.`,
      });
    }

    const payload = {
      location,
      date,
      periodMonth: paidFor,
      businessModel,
      amount: amt,
      grossRevenue: grossRevenue != null && grossRevenue !== '' ? Number(grossRevenue) : null,
      notes: notes || '',
    };

    if (req.method === 'POST') {
      const docRef = await adminDb.collection('income').add({
        ...payload,
        addedBy: session.email,
        createdAt: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, id: docRef.id });
    }

    if (!id) return res.status(400).json({ error: 'Missing income id.' });
    const ref = adminDb.collection('income').doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Income not found.' });
    await ref.update({ ...payload, updatedBy: session.email, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
