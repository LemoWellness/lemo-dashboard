import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const notesSnap = await adminDb.collection('opportunities').doc('notes').get();
    const editsSnap = await adminDb.collection('opportunities').doc('edits').get();
    const contactedSnap = await adminDb.collection('opportunities').doc('contacted').get();
    const stagesSnap = await adminDb.collection('opportunities').doc('stages').get();
    return res.status(200).json({
      notes: notesSnap.exists ? notesSnap.data() : {},
      edits: editsSnap.exists ? editsSnap.data() : {},
      contacted: contactedSnap.exists ? contactedSnap.data() : {},
      stages: stagesSnap.exists ? stagesSnap.data() : {},
    });
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    if (body.notes) await adminDb.collection('opportunities').doc('notes').set(body.notes);
    if (body.edits) await adminDb.collection('opportunities').doc('edits').set(body.edits);
    if (body.contacted) await adminDb.collection('opportunities').doc('contacted').set(body.contacted);
    if (body.stages) await adminDb.collection('opportunities').doc('stages').set(body.stages);
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'opportunities' });
