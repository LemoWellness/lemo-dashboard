import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const { name } = req.query;
  const doc = await adminDb.collection('projects').doc(String(name)).get();
  if (!doc.exists) return res.status(404).json({ error: 'Location not found.' });
  res.status(200).json({ id: doc.id, ...doc.data() });
}, { tab: 'loc' });
