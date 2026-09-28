// Account-page Usage + RS money. Reads dailyRawData for one venue.
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

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const snap = await adminDb.collection('dailyRawData').where('venueName', '==', location).get();
  const empty = {
    hasData: false,
    location,
    thisMonthKey,
    totals: { usage: 0, refunds: 0, rsIncome: 0, netIncome: 0, avgVisitors: 0 },
    thisMonth: { gross: 0, net: 0, refunds: 0 },
    months: {},
  };
  if (snap.empty) return res.status(200).json(empty);

  const seenKeys = new Set();
  const totals = { usage: 0, refunds: 0, rsIncome: 0, visitorsSum: 0, visitorsCount: 0 };
  const months = {};

  snap.forEach((doc) => {
    const row = doc.data();
    const dateKey = row.countDate;
    if (!dateKey || !DATE_RE.test(dateKey)) return;
    const key = rowDedupeKey(row);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const gross = Number(row.totalAmount) || 0;
    const refund = Number(row.refund) || 0;
    const net = gross - refund;
    totals.usage += Number(row.orderNumber) || 0;
    totals.refunds += refund;
    totals.rsIncome += gross;
    const mk = dateKey.slice(0, 7);
    if (!months[mk]) months[mk] = { gross: 0, net: 0, refunds: 0 };
    months[mk].gross += gross;
    months[mk].net += net;
    months[mk].refunds += refund;
    if (row.avgVisitors !== '' && row.avgVisitors != null) {
      totals.visitorsSum += Number(row.avgVisitors) || 0;
      totals.visitorsCount += 1;
    }
  });

  if (seenKeys.size === 0) return res.status(200).json(empty);

  const thisMonth = months[thisMonthKey] || { gross: 0, net: 0, refunds: 0 };
  return res.status(200).json({
    hasData: true,
    location,
    thisMonthKey,
    totals: {
      usage: totals.usage,
      refunds: totals.refunds,
      rsIncome: totals.rsIncome,
      netIncome: totals.rsIncome - totals.refunds,
      avgVisitors: totals.visitorsCount > 0 ? totals.visitorsSum / totals.visitorsCount : 0,
    },
    thisMonth,
    months,
  });
}, { tab: 'loc' });
