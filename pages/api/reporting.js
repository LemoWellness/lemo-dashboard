// Reporting only. Reads dailyRawData + projects. Does not change Daily or Usage.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isWeekendKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

function mostRecentBusinessDayBefore(dateKey, sortedDateKeys) {
  const idx = sortedDateKeys.indexOf(dateKey);
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (!isWeekendKey(sortedDateKeys[i])) return sortedDateKeys[i];
  }
  return null;
}

function emptyVenue() {
  return {
    orders: 0, netIncome: 0, refunds: 0, completed: 0, totalAmount: 0,
    orderPriceSum: 0, orderPriceCount: 0, visitorsSum: 0, visitorsCount: 0,
  };
}

function addRow(target, row) {
  target.orders += Number(row.orderNumber) || 0;
  target.netIncome += Number(row.pos) || 0;
  target.refunds += Number(row.refund) || 0;
  target.completed += Number(row.completeNum) || 0;
  target.totalAmount += Number(row.totalAmount) || 0;
  if (row.orderPrice !== '' && row.orderPrice != null) {
    target.orderPriceSum += Number(row.orderPrice) || 0;
    target.orderPriceCount += 1;
  }
  if (row.avgVisitors !== '' && row.avgVisitors != null) {
    target.visitorsSum += Number(row.avgVisitors) || 0;
    target.visitorsCount += 1;
  }
}

function venueRow(name, v) {
  return {
    venue: name,
    orders: v.orders,
    netIncome: v.netIncome,
    refunds: v.refunds,
    completed: v.completed,
    avgOrderPrice: v.orderPriceCount > 0 ? v.orderPriceSum / v.orderPriceCount : 0,
    avgVisitors: v.visitorsCount > 0 ? v.visitorsSum / v.visitorsCount : 0,
  };
}

export default withAuth(async (req, res, session) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const tabs = session.tabs;
  const allowed = session.role === 'Admin' || tabs === 'all'
    || (Array.isArray(tabs) && (tabs.includes('daily') || tabs.includes('usage') || tabs.includes('reporting')));
  if (!allowed) return res.status(403).json({ error: 'You do not have access to this section.' });

  const view = String(req.query.view || 'daily') === 'monthly' ? 'monthly' : 'daily';

  const [dailySnap, projectsSnap] = await Promise.all([
    adminDb.collection('dailyRawData').get(),
    adminDb.collection('projects').get(),
  ]);

  if (dailySnap.empty) return res.status(200).json({ hasData: false, view });

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
      badDateCount += 1;
      if (badDateExamples.length < 5) {
        badDateExamples.push({ venue: String(venue), rawValue: dateKey || '(blank)' });
      }
      return;
    }
    if (!dateVenue[dateKey]) dateVenue[dateKey] = {};
    if (!dateVenue[dateKey][venue]) dateVenue[dateKey][venue] = emptyVenue();
    addRow(dateVenue[dateKey][venue], row);

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
  if (dateKeys.length === 0) return res.status(200).json({ hasData: false, view, dataHealthIssues });

  if (view === 'monthly') {
    const months = [...new Set(dateKeys.map((d) => d.slice(0, 7)))].sort();
    const requested = String(req.query.month || '');
    const month = months.includes(requested) ? requested : months[months.length - 1];
    const monthDates = dateKeys.filter((d) => d.slice(0, 7) === month);

    const byVenue = {};
    const totals = { orders: 0, netIncome: 0, refunds: 0, completed: 0 };
    let cwOrders = 0;
    let rsOrders = 0;
    monthDates.forEach((dKey) => {
      const venuesThisDay = dateVenue[dKey];
      Object.keys(venuesThisDay).forEach((v) => {
        if (!byVenue[v]) byVenue[v] = emptyVenue();
        const src = venuesThisDay[v];
        byVenue[v].orders += src.orders;
        byVenue[v].netIncome += src.netIncome;
        byVenue[v].refunds += src.refunds;
        byVenue[v].completed += src.completed;
        byVenue[v].orderPriceSum += src.orderPriceSum;
        byVenue[v].orderPriceCount += src.orderPriceCount;
        byVenue[v].visitorsSum += src.visitorsSum;
        byVenue[v].visitorsCount += src.visitorsCount;
        totals.orders += src.orders;
        totals.netIncome += src.netIncome;
        totals.refunds += src.refunds;
        totals.completed += src.completed;
        if (isCorporateWellness(v)) cwOrders += src.orders;
        else rsOrders += src.orders;
      });
    });

    const venueTable = Object.keys(byVenue)
      .map((name) => venueRow(name, byVenue[name]))
      .sort((a, b) => b.orders - a.orders);

    const trend = months.slice(-12).map((m) => {
      let orders = 0;
      let cw = 0;
      let rs = 0;
      let income = 0;
      dateKeys.filter((d) => d.slice(0, 7) === m).forEach((dKey) => {
        const venuesThisDay = dateVenue[dKey];
        Object.keys(venuesThisDay).forEach((v) => {
          orders += venuesThisDay[v].orders;
          income += venuesThisDay[v].netIncome;
          if (isCorporateWellness(v)) cw += venuesThisDay[v].orders;
          else rs += venuesThisDay[v].orders;
        });
      });
      return { month: m, orders, corporateWellnessOrders: cw, revenueSharingOrders: rs, revenueSharingIncome: income };
    });

    return res.status(200).json({
      hasData: true,
      view: 'monthly',
      month,
      availableMonths: months,
      dayCount: monthDates.length,
      totals,
      split: { corporateWellnessOrders: cwOrders, revenueSharingOrders: rsOrders },
      completedRate: totals.orders > 0 ? totals.completed / totals.orders : 0,
      venueTable,
      trend,
      dataHealthIssues,
      unsupportedUsageMetrics: ['seating', 'idle', 'occupied', 'scanned', 'payCount', 'h5Conversion'],
    });
  }

  const selectedDateKey = req.query.date || null;
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
  Object.keys(latestVenues).forEach((v) => {
    const lv = latestVenues[v];
    totals.orders += lv.orders;
    totals.netIncome += lv.netIncome;
    totals.refunds += lv.refunds;
    totals.completed += lv.completed;
    venueTable.push(venueRow(v, lv));
  });
  venueTable.sort((a, b) => b.orders - a.orders);

  const missingVenues = [];
  Object.keys(rsPreviousVenues).forEach((pv) => {
    if (isCorporateWellness(pv)) return;
    if (!(pv in latestVenues)) missingVenues.push(pv);
  });
  if (!latestIsWeekend) {
    Object.keys(cwPreviousVenues).forEach((pv) => {
      if (!isCorporateWellness(pv)) return;
      if (!(pv in latestVenues)) missingVenues.push(pv);
    });
  }

  const newVenues = [];
  Object.keys(latestVenues).forEach((v) => {
    if (venueFirstSeen[v] === latestKey) newVenues.push(v);
  });

  const flags = [];
  Object.keys(latestVenues).forEach((v) => {
    const cwVenue = isCorporateWellness(v);
    if (cwVenue && latestIsWeekend) return;
    const comparisonVenues = cwVenue ? cwPreviousVenues : rsPreviousVenues;
    const comparisonDateKey = cwVenue ? previousBusinessDayForCW : previousKey;
    if (!comparisonDateKey || !(v in comparisonVenues)) return;
    const curr = latestVenues[v].orders;
    const prev = comparisonVenues[v].orders;
    if (prev >= 5 && curr <= prev * 0.2) {
      flags.push({ venue: v, type: 'drop', message: `Had ${prev} orders on ${comparisonDateKey}, only ${curr} now.` });
    } else if (prev < 5 && curr >= Math.max(prev * 3, 5)) {
      flags.push({ venue: v, type: 'rise', message: `Had ${prev} orders on ${comparisonDateKey}, jumped to ${curr} now.` });
    }
  });
  flags.sort((a, b) => (a.type === b.type ? 0 : a.type === 'drop' ? -1 : 1));

  const duplicates = [];
  const latestOutlets = dateOutlet[latestKey] || {};
  Object.keys(latestOutlets).forEach((ok) => {
    if (latestOutlets[ok] > 1) {
      const [venue, outletName] = ok.split('||');
      duplicates.push({ venue, outletName, rowCount: latestOutlets[ok] });
    }
  });

  const venueSeries = {};
  dateKeys.forEach((dKey) => {
    const weekend = isWeekendKey(dKey);
    Object.keys(dateVenue[dKey]).forEach((v) => {
      if (!venueSeries[v]) venueSeries[v] = [];
      venueSeries[v].push({ dateKey: dKey, orders: dateVenue[dKey][v].orders, isWeekend: weekend });
    });
  });

  const sustainedOutages = [];
  Object.keys(venueSeries).forEach((v) => {
    const cw = isCorporateWellness(v);
    const series = cw ? venueSeries[v].filter((e) => !e.isWeekend) : venueSeries[v];
    if (series.length === 0) return;
    const last = series[series.length - 1];
    if (last.dateKey !== latestKey || last.orders > 0) return;
    let streak = 0;
    for (let k = series.length - 1; k >= 0; k -= 1) {
      if (series[k].orders === 0) streak += 1;
      else break;
    }
    if (streak < 2) return;
    const priorEndIndex = series.length - 1 - streak;
    if (priorEndIndex < 0) return;
    let priorTotal = 0;
    let priorCount = 0;
    for (let k = 0; k <= priorEndIndex; k += 1) {
      priorTotal += series[k].orders;
      priorCount += 1;
    }
    const priorAvg = priorCount > 0 ? priorTotal / priorCount : 0;
    if (priorAvg >= 5) sustainedOutages.push({ venue: v, streak, priorAvg: Math.round(priorAvg) });
  });

  const trend = dateKeys.slice(-30).map((dKey) => {
    const venuesThisDay = dateVenue[dKey];
    let cwTotal = 0;
    let rsTotal = 0;
    let rsIncomeTotal = 0;
    Object.keys(venuesThisDay).forEach((vn) => {
      if (isCorporateWellness(vn)) cwTotal += venuesThisDay[vn].orders;
      else {
        rsTotal += venuesThisDay[vn].orders;
        rsIncomeTotal += venuesThisDay[vn].netIncome;
      }
    });
    return { date: dKey, corporateWellnessOrders: cwTotal, revenueSharingOrders: rsTotal, revenueSharingIncome: rsIncomeTotal };
  });

  return res.status(200).json({
    hasData: true,
    view: 'daily',
    period: latestKey,
    previousPeriod: previousKey,
    totals,
    venueTable,
    missingVenues,
    newVenues,
    flags,
    duplicates,
    sustainedOutages,
    trend,
    dataHealthIssues,
    availableDates: dateKeys,
    unsupportedUsageMetrics: ['seating', 'idle', 'occupied', 'scanned', 'payCount', 'h5Conversion'],
  });
});
