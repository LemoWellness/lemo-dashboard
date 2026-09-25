import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function noteId(periodStart, category) {
  return `${String(periodStart || '')}__${String(category || '').replace(/[\/#\[\]]/g, '_')}`;
}

export default withAuth(async (req, res, session) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });
  if (session.role !== 'Admin') return res.status(403).json({ error: 'Only an administrator can do that.' });
  const body = req.body || {};
  const periodStart = String(body.periodStart || '').slice(0, 10);
  const category = String(body.category || '').trim();
  if (!periodStart || !category) return res.status(400).json({ error: 'Period and category are required.' });
  const note = String(body.note || '').trim();
  const id = noteId(periodStart, category);
  await adminDb.collection('financialCategoryNotes').doc(id).set({
    periodStart,
    category,
    note,
    updatedAt: new Date().toISOString(),
    updatedBy: session.email,
  });
  return res.status(200).json({ success: true, id, note });
}, { tab: 'financials' });
