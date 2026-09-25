// Account-page Usage only. Reads dailyRawData for one venue.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function rowDedupeKey(row) {
  return [row.countDate, row.venueId, row.outletId, row.venueName, row.outletName]
    .map((p) => String(p || '').trim().toLowerCase())
    .join('|');
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const location = String(req.query.location || '').trim();
  if (!location) return res.status(400).json({ error: 'location is required.' });

  const snap = await adminDb.collection('dailyRawData').where('venueName', '==', location).get();
  const empty = {
    hasData: false,
    location,
    totals: { usage: 0, refunds: 0, rsIncome: 0, avgVisitors: 0 },
  };
  if (snap.empty) return res.status(200).json(empty);

  const seenKeys = new Set();
  const totals = { usage: 0, refunds: 0, rsIncome: 0, visitorsSum: 0, visitorsCount: 0 };

  snap.forEach((doc) => {
    const row = doc.data();
    const dateKey = row.countDate;
    if (!dateKey || !DATE_RE.test(dateKey)) return;
    const key = rowDedupeKey(row);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    totals.usage += Number(row.orderNumber) || 0;
    totals.refunds += Number(row.refund) || 0;
    totals.rsIncome += Number(row.pos) || 0;
    if (row.avgVisitors !== '' && row.avgVisitors != null) {
      totals.visitorsSum += Number(row.avgVisitors) || 0;
      totals.visitorsCount += 1;
    }
  });

  if (seenKeys.size === 0) return res.status(200).json(empty);

  return res.status(200).json({
    hasData: true,
    location,
    totals: {
      usage: totals.usage,
      refunds: totals.refunds,
      rsIncome: totals.rsIncome,
      avgVisitors: totals.visitorsCount > 0 ? totals.visitorsSum / totals.visitorsCount : 0,
    },
  });
}, { tab: 'loc' });
