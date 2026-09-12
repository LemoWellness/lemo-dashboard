import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed.' });
  await adminDb.collection('financialReports').doc(String(req.query.id)).delete();
  res.status(200).json({ success: true });
}, { role: 'Admin' });
