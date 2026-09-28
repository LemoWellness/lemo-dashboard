// Replaces the Project Details reads inside getFilterOptions()/getAddressForLocation_()
// in the old Code.gs. Firestore collection: `projects`, doc id = location name (slugified
// isn't necessary since Firestore doc IDs can contain most characters, but we store the
// canonical name as a field too so it's easy to display/search).
import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthKeysFromTo(startKey, endKey) {
  if (!startKey || !endKey || startKey > endKey) return [];
  const keys = [];
  let k = startKey;
  while (k <= endKey) {
    keys.push(k);
    k = shiftMonth(k, 1);
    if (keys.length > 120) break;
  }
  return keys;
}
function firstBillMonthKey(goLiveDate) {
  const raw = String(goLiveDate || '').slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (!parts[0] || !parts[1]) return '';
  const day = parts[2] || 1;
  const goMonth = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
  return shiftMonth(goMonth, day <= 1 ? 1 : 2);
}
function incomeBelongsToSite(incomeLocation, name) {
  const loc = String(incomeLocation || '').trim().toLowerCase();
  if (!loc) return false;
  return String(name || '').trim().toLowerCase() === loc;
}
function cwOwes(project, allIncome, monthKey) {
  if (project.businessModel !== 'Corporate Wellness') return false;
  const fee = Number(project.monthlyFee) || 0;
  if (fee <= 0) return false;
  const start = firstBillMonthKey(project.goLiveDate);
  if (!start || start > monthKey) return false;
  const expected = monthKeysFromTo(start, monthKey).length * fee;
  const received = allIncome.reduce((s, i) => {
    const mk = String(i.date || '').slice(0, 7);
    if (mk.length !== 7 || mk > monthKey) return s;
    if (!incomeBelongsToSite(i.location, project.name)) return s;
    return s + (Number(i.amount) || 0);
  }, 0);
  return expected - received > 0.5;
}

const PROJECT_FIELDS = [
  'businessModel', 'numberOfChairs', 'goLiveDate', 'monthlyFee', 'revenueSharePercent',
  'streetAddress', 'city', 'state', 'zipCode', 'tenureMonths', 'avgMonthlyRevenue',
  'customerContactName', 'customerContactPhone', 'customerContactEmail',
  'bdConsultantName', 'bdConsultantPhone', 'bdConsultantEmail',
  'contact2Name', 'contact2Phone', 'contact2Email', 'editNotes',
];

export default withAuth(async (req, res, session) => {
  if (req.method === 'GET') {
    const monthKey = new Date().toISOString().slice(0, 7);
    const [snap, incomeSnap] = await Promise.all([
      adminDb.collection('projects').orderBy('name').get(),
      adminDb.collection('income').get(),
    ]);
    const allIncome = incomeSnap.docs.map((d) => d.data());
    const projects = snap.docs.map((d) => {
      const data = { id: d.id, ...d.data() };
      return { ...data, owes: cwOwes(data, allIncome, monthKey) };
    });
    return res.status(200).json({ projects });
  }

  if (req.method === 'POST') {
    if (session.role !== 'Admin') {
      return res.status(403).json({ error: 'Only an administrator can do that.' });
    }
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'Location name is required.' });

    const docId = String(body.name).trim();
    const updates = {
      name: docId,
      updatedAt: new Date().toISOString(),
      updatedBy: session.email,
    };
    PROJECT_FIELDS.forEach((key) => {
      if (body[key] !== undefined) updates[key] = body[key] === '' ? '' : body[key];
    });
    if (body.signedContract !== undefined) updates.signedContract = !!body.signedContract;
    await adminDb.collection('projects').doc(docId).set(updates, { merge: true });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'loc' });
