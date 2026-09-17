import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { emptyAssessment } from '../../../lib/riskMath';

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('deploymentAssessments').get();
    const assessments = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return res.status(200).json({ assessments });
  }

  if (req.method === 'POST') {
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can create assessments.' });
    }
    const body = req.body || {};
    const base = emptyAssessment();
    const doc = {
      ...base,
      ...body,
      name: String(body.name || '').trim() || 'Untitled assessment',
      archived: false,
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: session.email,
      updatedAt: new Date().toISOString(),
      updatedBy: session.email,
    };
    const ref = await adminDb.collection('deploymentAssessments').add(doc);
    return res.status(200).json({ id: ref.id, success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'risk' });
