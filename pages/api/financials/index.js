import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('financialReports').orderBy('periodStart', 'desc').get();
    return res.status(200).json({ reports: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }
  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'financials' });
