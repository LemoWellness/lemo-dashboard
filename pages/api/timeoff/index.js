import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

const TYPES = ['Vacation / PTO', 'Personal', 'Sick', 'Other'];

function ymd(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return [];
  const out = [];
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(ymd(d));
  }
  return out;
}

export default withAuth(async (req, res, session) => {
  const col = adminDb.collection('timeOff');

  if (req.method === 'GET') {
    const snap = await col.orderBy('createdAt', 'desc').get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const isAdmin = session.role === 'Admin';
    const mine = all.filter((r) => String(r.userEmail || '').toLowerCase() === String(session.email || '').toLowerCase());
    const approved = all.filter((r) => r.status === 'approved');
    const pending = isAdmin ? all.filter((r) => r.status === 'pending') : [];
    // Visible: own + approved (for calendar) + pending if admin
    const visibleIds = new Set([
      ...mine.map((r) => r.id),
      ...approved.map((r) => r.id),
      ...pending.map((r) => r.id),
    ]);
    const requests = all.filter((r) => visibleIds.has(r.id));
    return res.status(200).json({ requests });
  }

  if (req.method === 'POST') {
    const { startDate, endDate, type, note, userEmail, userName, office } = req.body || {};
    const start = String(startDate || '').slice(0, 10);
    const end = String(endDate || start).slice(0, 10);
    if (!start || !end || start > end) return res.status(400).json({ error: 'Valid start and end dates are required.' });
    const kind = TYPES.includes(type) ? type : 'Vacation / PTO';
    const isOffice = !!office && session.role === 'Admin';
    const targetEmail = isOffice && userEmail ? String(userEmail).toLowerCase() : String(session.email || '').toLowerCase();
    const targetName = isOffice && userName ? String(userName) : (session.name || session.email);

    const doc = {
      userEmail: targetEmail,
      userName: targetName,
      startDate: start,
      endDate: end,
      type: kind,
      note: String(note || '').trim(),
      status: isOffice ? 'approved' : 'pending',
      source: isOffice ? 'office' : 'request',
      createdAt: new Date().toISOString(),
      createdBy: session.email,
      reviewedBy: isOffice ? session.email : null,
      reviewedAt: isOffice ? new Date().toISOString() : null,
      reviewNote: '',
    };
    const ref = await col.add(doc);
    return res.status(200).json({ success: true, id: ref.id });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'timeoff' });
