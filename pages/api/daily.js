// Direct port of getDailyOverview() from the old Code.gs. Same alert logic:
// missing venues, sustained outages, drop/rise flags, duplicate outlet rows,
// new venues — computed the same way, just reading Firestore instead of a
// sheet. Loads the whole dailyRawData collection into memory and aggregates
// client-side (same approach the old sheet-based version used).
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

function isWeekendKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

function mostRecentBusinessDayBefore(dateKey, sortedDateKeys) {
  const idx = sortedDateKeys.indexOf(dateKey);
  for (let i = idx - 1; i >= 0; i--) {
    if (!isWeekendKey(sortedDateKeys[i])) return sortedDateKeys[i];
  }
  return null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const selectedDateKey = req.query.date || null;

  const [dailySnap, projectsSnap] = await Promise.all([
    adminDb.collection('dailyRawData').get(),
    adminDb.collection('projects').get(),
  ]);

  if (dailySnap.empty) return res.status(200).json({ hasData: false });

  const businessModelByVenue = {};
  projectsSnap.forEach((doc) => {
    const p = doc.data();
    if (p.name) businessModelByVenue[String(p.name).trim().toLowerCase()] = p.businessModel;
  });
  const isCorporateWellness = (venueName) =>
    businessModelByVenue[String(venueName || '').trim().toLowerCase()] === 'Corporate Wellness';

  const dateVenue = {};
  const dateOutlet = {};
  const venueFirstSeen = {};
  let badDateCount = 0;
  const badDateExamples = [];

  dailySnap.forEach((doc) => {
    const row = doc.data();
    const venue = row.venueName;
    if (!venue) return;
    const dateKey = row.countDate;
    if (!dateKey || !DATE_RE.test(dateKey)) {
      badDateCount++;
      if (badDateExamples.length < 5) {
        badDateExamples.push({ venue: String(venue), rawValue: dateKey || '(blank)' });
      }
      return;
    }

    if (!dateVenue[dateKey]) dateVenue[dateKey] = {};
    if (!dateVenue[dateKey][venue]) {
      dateVenue[dateKey][venue] = {
        orders: 0, netIncome: 0, refunds: 0, completed: 0, totalAmount: 0,
        orderPriceSum: 0, orderPriceCount: 0, visitorsSum: 0, visitorsCount: 0,
      };
    }
    const dv = dateVenue[dateKey][venue];
    dv.orders += Number(row.orderNumber) || 0;
    dv.netIncome += Number(row.pos) || 0; // Revenue-Sharing income is sourced from POS, matching the old sheet
    dv.refunds += Number(row.refund) || 0;
    dv.completed += Number(row.completeNum) || 0;
    dv.totalAmount += Number(row.totalAmount) || 0;
    if (row.orderPrice !== '' && row.orderPrice != null) { dv.orderPriceSum += Number(row.orderPrice) || 0; dv.orderPriceCount++; }
    if (row.avgVisitors !== '' && row.avgVisitors != null) { dv.visitorsSum += Number(row.avgVisitors) || 0; dv.visitorsCount++; }

    const outletName = row.outletName || '(no outlet name)';
    if (!dateOutlet[dateKey]) dateOutlet[dateKey] = {};
    const outletKey = venue + '||' + outletName;
    dateOutlet[dateKey][outletKey] = (dateOutlet[dateKey][outletKey] || 0) + 1;

    if (venueFirstSeen[venue] === undefined || dateKey < venueFirstSeen[venue]) {
      venueFirstSeen[venue] = dateKey;
    }
  });

  const dataHealthIssues = { count: badDateCount, examples: badDateExamples };
  const dateKeys = Object.keys(dateVenue).sort();
  if (dateKeys.length === 0) return res.status(200).json({ hasData: false, dataHealthIssues });

  const latestKey = selectedDateKey && dateKeys.includes(selectedDateKey) ? selectedDateKey : dateKeys[dateKeys.length - 1];
  const latestIsWeekend = isWeekendKey(latestKey);
  const latestVenues = dateVenue[latestKey];
  const latestIdx = dateKeys.indexOf(latestKey);

  const previousKey = latestIdx > 0 ? dateKeys[latestIdx - 1] : null;
  const previousBusinessDayForCW = mostRecentBusinessDayBefore(latestKey, dateKeys);
  const rsPreviousVenues = previousKey ? dateVenue[previousKey] : {};
  const cwPreviousVenues = previousBusinessDayForCW ? dateVenue[previousBusinessDayForCW] : {};

  const totals = { orders: 0, netIncome: 0, refunds: 0, completed: 0 };
  const venueTable = [];
  for (const v in latestVenues) {
    const lv = latestVenues[v];
    totals.orders += lv.orders;
    totals.netIncome += lv.netIncome;
    totals.refunds += lv.refunds;
    totals.completed += lv.completed;
    venueTable.push({
      venue: v, orders: lv.orders, netIncome: lv.netIncome, refunds: lv.refunds, completed: lv.completed,
      avgOrderPrice: lv.orderPriceCount > 0 ? lv.orderPriceSum / lv.orderPriceCount : 0,
      avgVisitors: lv.visitorsCount > 0 ? lv.visitorsSum / lv.visitorsCount : 0,
    });
  }
  venueTable.sort((a, b) => b.orders - a.orders);

  const missingVenues = [];
  for (const pv in rsPreviousVenues) {
    if (isCorporateWellness(pv)) continue;
    if (!(pv in latestVenues)) missingVenues.push(pv);
  }
  if (!latestIsWeekend) {
    for (const pv in cwPreviousVenues) {
      if (!isCorporateWellness(pv)) continue;
      if (!(pv in latestVenues)) missingVenues.push(pv);
    }
  }

  const newVenues = [];
  for (const v in latestVenues) {
    if (venueFirstSeen[v] === latestKey) newVenues.push(v);
  }

  const flags = [];
  for (const v in latestVenues) {
    const cwVenue = isCorporateWellness(v);
    if (cwVenue && latestIsWeekend) continue;
    const comparisonVenues = cwVenue ? cwPreviousVenues : rsPreviousVenues;
    const comparisonDateKey = cwVenue ? previousBusinessDayForCW : previousKey;
    if (!comparisonDateKey || !(v in comparisonVenues)) continue;
    const curr = latestVenues[v].orders;
    const prev = comparisonVenues[v].orders;
    if (prev >= 5 && curr <= prev * 0.2) {
      flags.push({ venue: v, type: 'drop', message: `Had ${prev} orders on ${comparisonDateKey}, only ${curr} now.` });
    } else if (prev < 5 && curr >= Math.max(prev * 3, 5)) {
      flags.push({ venue: v, type: 'rise', message: `Had ${prev} orders on ${comparisonDateKey}, jumped to ${curr} now.` });
    }
  }
  flags.sort((a, b) => (a.type === b.type ? 0 : a.type === 'drop' ? -1 : 1));

  const duplicates = [];
  const latestOutlets = dateOutlet[latestKey] || {};
  for (const ok in latestOutlets) {
    if (latestOutlets[ok] > 1) {
      const [venue, outletName] = ok.split('||');
      duplicates.push({ venue, outletName, rowCount: latestOutlets[ok] });
    }
  }

  const venueSeries = {};
  dateKeys.forEach((dKey) => {
    const weekend = isWeekendKey(dKey);
    const venuesThisDate = dateVenue[dKey];
    for (const v in venuesThisDate) {
      if (!venueSeries[v]) venueSeries[v] = [];
      venueSeries[v].push({ dateKey: dKey, orders: venuesThisDate[v].orders, isWeekend: weekend });
    }
  });

  const sustainedOutages = [];
  for (const v in venueSeries) {
    const cw = isCorporateWellness(v);
    const series = cw ? venueSeries[v].filter((e) => !e.isWeekend) : venueSeries[v];
    if (series.length === 0) continue;
    const last = series[series.length - 1];
    if (last.dateKey !== latestKey || last.orders > 0) continue;

    let streak = 0;
    for (let k = series.length - 1; k >= 0; k--) {
      if (series[k].orders === 0) streak++; else break;
    }
    if (streak < 2) continue;

    const priorEndIndex = series.length - 1 - streak;
    if (priorEndIndex < 0) continue;
    let priorTotal = 0, priorCount = 0;
    for (let k = 0; k <= priorEndIndex; k++) { priorTotal += series[k].orders; priorCount++; }
    const priorAvg = priorCount > 0 ? priorTotal / priorCount : 0;
    if (priorAvg >= 5) sustainedOutages.push({ venue: v, streak, priorAvg: Math.round(priorAvg) });
  }

  const trendDays = dateKeys.slice(-30);
  const trend = trendDays.map((dKey) => {
    const venuesThisDay = dateVenue[dKey];
    let cwTotal = 0, rsTotal = 0, rsIncomeTotal = 0;
    for (const vn in venuesThisDay) {
      if (isCorporateWellness(vn)) cwTotal += venuesThisDay[vn].orders;
      else { rsTotal += venuesThisDay[vn].orders; rsIncomeTotal += venuesThisDay[vn].netIncome; }
    }
    return { date: dKey, corporateWellnessOrders: cwTotal, revenueSharingOrders: rsTotal, revenueSharingIncome: rsIncomeTotal };
  });

  res.status(200).json({
    hasData: true,
    period: latestKey,
    previousPeriod: previousKey,
    totals, venueTable, missingVenues, newVenues, flags, duplicates, sustainedOutages, trend,
    dataHealthIssues, availableDates: dateKeys,
  });
}, { tab: 'daily' });
