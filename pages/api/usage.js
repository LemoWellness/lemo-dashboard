// Direct port of getUsageOverview() + getCompanyUsageTrend_() from the old
// Code.gs. Same aggregation: all-time totals across every row, a selected
// week's totals + venue ranking, and a chronological company-wide trend.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

function periodStartTime(period) {
  const startStr = String(period).split('~')[0];
  const d = new Date(startStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const snap = await adminDb.collection('usageRawData').get();
  if (snap.empty) return res.status(200).json({ hasData: false });

  const allTime = { orders: 0, seating: 0, idle: 0, occupied: 0, scanned: 0 };
  const byPeriodTrend = {}; // raw period -> { orders, scans, payments }
  const periodsSeen = new Set();
  const rows = [];

  snap.forEach((doc) => {
    const r = doc.data();
    if (!r.venueName) return;
    rows.push(r);

    const orders = Number(r.orderNumber) || 0;
    const seating = Number(r.seatNum) || 0;
    const idle = Number(r.idleNumber) || 0;
    const occupied = Number(r.occupyNumber) || 0;
    const scanned = Number(r.scanNumber) || 0;
    const payments = Number(r.payNumber) || 0;

    allTime.orders += orders;
    allTime.seating += seating;
    allTime.idle += idle;
    allTime.occupied += occupied;
    allTime.scanned += scanned;

    if (r.period) {
      periodsSeen.add(r.period);
      if (!byPeriodTrend[r.period]) byPeriodTrend[r.period] = { orders: 0, scans: 0, payments: 0 };
      byPeriodTrend[r.period].orders += orders;
      byPeriodTrend[r.period].scans += scanned;
      byPeriodTrend[r.period].payments += payments;
    }
  });

  const sortedPeriods = [...periodsSeen].sort((a, b) => periodStartTime(a) - periodStartTime(b));
  const cleanedWeeks = sortedPeriods.map((p) => String(p).split('~').join(' to '));

  const requestedWeek = req.query.week || null;
  const effectiveWeek = (requestedWeek && cleanedWeeks.includes(requestedWeek))
    ? requestedWeek
    : cleanedWeeks[cleanedWeeks.length - 1] || null;

  const selected = { orders: 0, seating: 0, idle: 0, occupied: 0, scanned: 0 };
  const byVenue = {};
  rows.forEach((r) => {
    const cleanPeriod = String(r.period || '').split('~').join(' to ');
    if (!effectiveWeek || cleanPeriod !== effectiveWeek) return;
    const orders = Number(r.orderNumber) || 0;
    const seating = Number(r.seatNum) || 0;
    const idle = Number(r.idleNumber) || 0;
    const occupied = Number(r.occupyNumber) || 0;
    const scanned = Number(r.scanNumber) || 0;

    selected.orders += orders;
    selected.seating += seating;
    selected.idle += idle;
    selected.occupied += occupied;
    selected.scanned += scanned;

    const vKey = String(r.venueName).trim();
    if (!byVenue[vKey]) byVenue[vKey] = { orders: 0, seating: 0, idle: 0, occupied: 0, scanned: 0 };
    byVenue[vKey].orders += orders;
    byVenue[vKey].seating += seating;
    byVenue[vKey].idle += idle;
    byVenue[vKey].occupied += occupied;
    byVenue[vKey].scanned += scanned;
  });

  const venues = Object.entries(byVenue)
    .map(([venue, v]) => ({ venue, ...v }))
    .sort((a, b) => b.orders - a.orders);

  const companyTrend = sortedPeriods.map((p) => ({
    period: p,
    totalOrders: byPeriodTrend[p].orders,
    h5ConversionRate: byPeriodTrend[p].scans > 0 ? byPeriodTrend[p].payments / byPeriodTrend[p].scans : 0,
  }));

  res.status(200).json({
    hasData: true,
    week: effectiveWeek,
    availableWeeks: cleanedWeeks,
    selectedOrders: selected.orders, selectedSeating: selected.seating, selectedIdle: selected.idle,
    selectedOccupied: selected.occupied, selectedScanned: selected.scanned,
    allTimeOrders: allTime.orders, allTimeSeating: allTime.seating, allTimeIdle: allTime.idle,
    allTimeOccupied: allTime.occupied, allTimeScanned: allTime.scanned,
    venues, companyTrend,
  });
}, { tab: 'usage' });
