// Replaces the Project Details reads inside getFilterOptions()/getAddressForLocation_()
// in the old Code.gs. Firestore collection: `projects`, doc id = location name (slugified
// isn't necessary since Firestore doc IDs can contain most characters, but we store the
// canonical name as a field too so it's easy to display/search).
import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const snap = await adminDb.collection('projects').orderBy('name').get();
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ projects });
  }

  if (req.method === 'POST') {
    // Creating/editing a project's core details is admin-only, mirroring how
    // addExpense/addIncome (the other mutating calls) required Admin.
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'Location name is required.' });

    const docId = String(body.name).trim();
    await adminDb.collection('projects').doc(docId).set(
      {
        name: docId,
        businessModel: body.businessModel || '',
        numberOfChairs: body.numberOfChairs ?? null,
        goLiveDate: body.goLiveDate || '', // stored as 'yyyy-MM-dd' string
        monthlyFee: body.monthlyFee ?? null,
        revenueSharePercent: body.revenueSharePercent ?? null,
        streetAddress: body.streetAddress || '',
        city: body.city || '',
        state: body.state || '',
        zipCode: body.zipCode || '',
        tenureMonths: body.tenureMonths ?? null,
        avgMonthlyRevenue: body.avgMonthlyRevenue ?? null,
        bdConsultantName: body.bdConsultantName || '',
        bdConsultantPhone: body.bdConsultantPhone || '',
        bdConsultantEmail: body.bdConsultantEmail || '',
        contact2Name: body.contact2Name || '',
        contact2Phone: body.contact2Phone || '',
        contact2Email: body.contact2Email || '',
        editNotes: body.editNotes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: session.email,
      },
      { merge: true }
    );
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
