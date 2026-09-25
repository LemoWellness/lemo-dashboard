// Account-page Usage only. Reads dailyRawData for one venue.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function rowDedupeKey(row) {
  return [row.countDate, row.venueId, row.outletId, row.venueName, row.outletName]
    .map((p) => String(p || '').trim().toLowerCase())
    .join('|');
}

function monthLabelFromKey(key) {
  const [y, m] = String(key).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const location = String(req.query.location || '').trim();
  if (!location) return res.status(400).json({ error: 'location is required.' });

  const snap = await adminDb.collection('dailyRawData').where('venueName', '==', location).get();
  if (snap.empty) {
    return res.status(200).json({
      hasData: false,
      location,
      month: '',
      availableMonths: [],
      totals: { usage: 0, refunds: 0, rsIncome: 0, avgVisitors: 0 },
      trend: [],
    });
  }

  const seenKeys = new Set();
  const byMonth = {};

  snap.forEach((doc) => {
    const row = doc.data();
    const dateKey = row.countDate;
    if (!dateKey || !DATE_RE.test(dateKey)) return;
    const key = rowDedupeKey(row);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const month = dateKey.slice(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = {
        usage: 0,
        refunds: 0,
        rsIncome: 0,
        visitorsSum: 0,
        visitorsCount: 0,
      };
    }
    byMonth[month].usage += Number(row.orderNumber) || 0;
    byMonth[month].refunds += Number(row.refund) || 0;
    byMonth[month].rsIncome += Number(row.pos) || 0;
    if (row.avgVisitors !== '' && row.avgVisitors != null) {
      byMonth[month].visitorsSum += Number(row.avgVisitors) || 0;
      byMonth[month].visitorsCount += 1;
    }
  });

  const availableMonths = Object.keys(byMonth).sort();
  if (availableMonths.length === 0) {
    return res.status(200).json({
      hasData: false,
      location,
      month: '',
      availableMonths: [],
      totals: { usage: 0, refunds: 0, rsIncome: 0, avgVisitors: 0 },
      trend: [],
    });
  }

  const requested = String(req.query.month || '');
  const month = availableMonths.includes(requested) ? requested : availableMonths[availableMonths.length - 1];
  const src = byMonth[month];
  const totals = {
    usage: src.usage,
    refunds: src.refunds,
    rsIncome: src.rsIncome,
    avgVisitors: src.visitorsCount > 0 ? src.visitorsSum / src.visitorsCount : 0,
  };

  const trend = availableMonths.slice(-12).map((m) => ({
    month: m,
    label: monthLabelFromKey(m),
    usage: byMonth[m].usage,
    rsIncome: byMonth[m].rsIncome,
  }));

  return res.status(200).json({
    hasData: true,
    location,
    month,
    availableMonths,
    totals,
    trend,
  });
}, { tab: 'loc' });
