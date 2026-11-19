import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const { location } = req.query;
    let q = adminDb.collection('payouts').orderBy('date', 'desc');
    if (location) q = adminDb.collection('payouts').where('location', '==', location).orderBy('date', 'desc');
    const snap = await q.limit(200).get();
    return res.status(200).json({ payouts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const { id, location, date, payee, amount, howPaid, notes } = req.body || {};
    if (!location) return res.status(400).json({ error: 'No location specified.' });
    if (!payee || !['Venue', 'BD'].includes(payee)) return res.status(400).json({ error: 'Payee must be Venue or BD.' });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be a positive number.' });
    if (!date) return res.status(400).json({ error: 'Date is required.' });

    const payload = {
      location,
      date,
      payee,
      amount: amt,
      howPaid: howPaid || '',
      notes: notes || '',
    };

    if (req.method === 'POST') {
      const docRef = await adminDb.collection('payouts').add({
        ...payload,
        addedBy: session.email,
        createdAt: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, id: docRef.id });
    }

    if (!id) return res.status(400).json({ error: 'Missing payout id.' });
    const ref = adminDb.collection('payouts').doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Payout not found.' });
    await ref.update({ ...payload, updatedBy: session.email, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
