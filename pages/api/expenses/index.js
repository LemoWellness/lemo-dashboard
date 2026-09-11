import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const { location } = req.query;
    let q = adminDb.collection('expenses').orderBy('date', 'desc');
    if (location) q = adminDb.collection('expenses').where('location', '==', location).orderBy('date', 'desc');
    const snap = await q.limit(200).get();
    return res.status(200).json({ expenses: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === 'POST') {
    // addExpense() in the old Code.gs required Admin — kept as-is here.
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const { location, date, category, item, description, source, quantity, costPerUnit, notes } = req.body || {};
    if (!location) return res.status(400).json({ error: 'No location specified.' });
    if (!category) return res.status(400).json({ error: 'Category is required.' });
    const qty = Number(quantity);
    const cost = Number(costPerUnit);
    if (!quantity || isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity must be a positive number.' });
    if (costPerUnit === '' || costPerUnit == null || isNaN(cost) || cost < 0) {
      return res.status(400).json({ error: 'Cost / Unit must be a valid number.' });
    }
    if (!date) return res.status(400).json({ error: 'Date is required.' });

    const docRef = await adminDb.collection('expenses').add({
      location,
      date, // 'yyyy-MM-dd'
      category,
      item: item || '',
      description: description || '',
      source: source || '',
      quantity: qty,
      costPerUnit: cost,
      amount: qty * cost, // replaces the old spreadsheet formula in column J
      notes: notes || '',
      addedBy: session.email,
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, id: docRef.id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
