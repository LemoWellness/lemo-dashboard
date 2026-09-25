import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function expenseFields(body) {
  const { location, date, category, item, description, source, quantity, costPerUnit, notes } = body || {};
  if (!location) return { error: 'No location specified.' };
  if (!category) return { error: 'Category is required.' };
  const qty = Number(quantity);
  const cost = Number(costPerUnit);
  if (!quantity || isNaN(qty) || qty <= 0) return { error: 'Quantity must be a positive number.' };
  if (costPerUnit === '' || costPerUnit == null || isNaN(cost) || cost < 0) {
    return { error: 'Cost / Unit must be a valid number.' };
  }
  if (!date) return { error: 'Date is required.' };
  return {
    data: {
      location,
      date,
      category,
      item: item || '',
      description: description || '',
      source: source || '',
      quantity: qty,
      costPerUnit: cost,
      amount: qty * cost,
      notes: notes || '',
    },
  };
}

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const { location } = req.query;
    let q = adminDb.collection('expenses').orderBy('date', 'desc');
    if (location) q = adminDb.collection('expenses').where('location', '==', location).orderBy('date', 'desc');
    const snap = await q.limit(200).get();
    return res.status(200).json({ expenses: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const parsed = expenseFields(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (req.method === 'POST') {
      const docRef = await adminDb.collection('expenses').add({
        ...parsed.data,
        addedBy: session.email,
        createdAt: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, id: docRef.id });
    }
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing expense id.' });
    const ref = adminDb.collection('expenses').doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Expense not found.' });
    await ref.update({ ...parsed.data, updatedBy: session.email, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
