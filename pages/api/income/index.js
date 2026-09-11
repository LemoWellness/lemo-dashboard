import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const { location } = req.query;
    let q = adminDb.collection('income').orderBy('date', 'desc');
    if (location) q = adminDb.collection('income').where('location', '==', location).orderBy('date', 'desc');
    const snap = await q.limit(200).get();
    return res.status(200).json({ income: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === 'POST') {
    // addIncome() in the old Code.gs required Admin, and was restricted to
    // "Corporate Wellness" business-model locations — kept as-is here.
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const { location, date, amount, notes } = req.body || {};
    if (!location) return res.status(400).json({ error: 'No location specified.' });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be a positive number.' });
    if (!date) return res.status(400).json({ error: 'Date is required.' });

    const projectDoc = await adminDb.collection('projects').doc(location).get();
    const businessModel = projectDoc.exists ? projectDoc.data().businessModel : null;
    if (businessModel !== 'Corporate Wellness') {
      return res.status(400).json({
        error: `Adding income this way is only available for Corporate Wellness locations. "${location}" is ${businessModel || 'not a recognized location'}.`,
      });
    }

    const docRef = await adminDb.collection('income').add({
      location,
      date,
      businessModel,
      amount: amt,
      notes: notes || '',
      addedBy: session.email,
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, id: docRef.id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
