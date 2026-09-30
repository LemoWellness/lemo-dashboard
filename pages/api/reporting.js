import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';
import {
  DATE_RE, dailyRangeFor, emptyVenue, addRow, venueRow, rowDedupeKey,
  buildSessionTable, buildSessionMeta, daysInMonthKey, monthSliceTotals,
  monthStory, shiftMonthKey, isWeekendKey, mostRecentBusinessDayBefore,
} from '../../lib/reportingLib';

export default withAuth(async (req, res, session) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const tabs = session.tabs;
  const allowed = session.role === 'Admin' || tabs === 'all'
    || (Array.isArray(tabs) && (tabs.includes('daily') || tabs.includes('usage') || tabs.includes('reporting')));
  if (!allowed) return res.status(403).json({ error: 'You do not have access to this section.' });

  const view = String(req.query.view || 'daily') === 'monthly' ? 'monthly' : 'daily';
  const range = dailyRangeFor(req);
  const [dailySnap, projectsSnap, usageSnap] = await Promise.all([
    adminDb.collection('dailyRawData').where('countDate', '>=', range.start).where('countDate', '<=', range.end).get(),
    adminDb.collection('projects').get(),
    adminDb.collection('usageRawData').get(),
  ]);
  if (dailySnap.empty) return res.status(200).json({ hasData: false, view });

  const businessModelByVenue = {};
  const chairsByVenue = {};
  projectsSnap.forEach((doc) => {
    const p = doc.data();
    const key = String(p.name || '').trim().toLowerCase();
    if (!key) return;
    businessModelByVenue[key] = p.businessModel;
    const chairs = Number(p.numberOfChairs);
    if (!isNaN(chairs) && chairs > 0) chairsByVenue[key] = chairs;
  });
  const isCW = (venueName) => businessModelByVenue[String(venueName || '').trim().toLowerCase()] === 'Corporate Wellness';

  const dateVenue = {};
  const dateOutlet = {};
  const venueFirstSeen = {};
  const dataHealthIssues = { count: 0, examples: [] };
  const seenKeys = new Set();

  dailySnap.forEach((doc) => {
    const row = doc.data();
    const venue = row.venueName;
    if (!venue) return;
    const dateKey = row.countDate;
    if (!dateKey || !DATE_RE.test(dateKey)) {
      dataHealthIssues.count += 1;
      if (dataHealthIssues.examples.length < 5) {
        dataHealthIssues.examples.push({ venue: String(venue), rawValue: dateKey || '(blank)' });
      }
      return;
    }
    const key = rowDedupeKey(row);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    if (!dateVenue[dateKey]) dateVenue[dateKey] = {};
    if (!dateVenue[dateKey][venue]) dateVenue[dateKey][venue] = emptyVenue();
    addRow(dateVenue[dateKey][venue], row);
    const outletName = row.outletName || '(no outlet name)';
    if (!dateOutlet[dateKey]) dateOutlet[dateKey] = {};
    dateOutlet[dateKey][venue + '||' + outletName] = (dateOutlet[dateKey][venue + '||' + outletName] || 0) + 1;
    if (venueFirstSeen[venue] === undefined || dateKey < venueFirstSeen[venue]) venueFirstSeen[venue] = dateKey;
  });

  const dateKeys = Object.keys(dateVenue).sort();
  if (dateKeys.length === 0) return res.status(200).json({ hasData: false, view, dataHealthIssues });

  if (view === 'monthly') {
    const months = [...new Set(dateKeys.map((d) => d.slice(0, 7)))].sort();
    const requested = String(req.query.month || '');
    const month = months.includes(requested) ? requested : months[months.length - 1];
    const monthDates = dateKeys.filter((d) => d.slice(0, 7) === month);
    const byVenue = {};
    const totals = { orders: 0, netIncome: 0, refunds: 0, completed: 0, gross: 0 };
    let cwOrders = 0;
    let rsOrders = 0;
    monthDates.forEach((dKey) => {
      Object.keys(dateVenue[dKey]).forEach((v) => {
        if (!byVenue[v]) byVenue[v] = emptyVenue();
        const src = dateVenue[dKey][v];
        byVenue[v].orders += src.orders;
        byVenue[v].netIncome += src.netIncome;
        byVenue[v].refunds += src.refunds;
        byVenue[v].gross = (byVenue[v].gross || 0) + (src.gross || 0);
        byVenue[v].completed += src.completed;
        byVenue[v].orderPriceSum += src.orderPriceSum;
        byVenue[v].orderPriceCount += src.orderPriceCount;
        byVenue[v].visitorsSum += src.visitorsSum;
        byVenue[v].visitorsCount += src.visitorsCount;
        totals.orders += src.orders;
        totals.netIncome += src.netIncome;
        totals.refunds += src.refunds;
        totals.gross += src.gross || 0;
        totals.completed += src.completed;
        if (isCW(v)) cwOrders += src.orders;
        else rsOrders += src.orders;
      });
    });
    const venueTable = Object.keys(byVenue)
      .map((name) => venueRow(name, byVenue[name], chairsByVenue, businessModelByVenue))
      .sort((a, b) => b.orders - a.orders);
    const trend = months.slice(-12).map((m) => {
      let orders = 0; let cw = 0; let rs = 0; let income = 0;
      dateKeys.filter((d) => d.slice(0, 7) === m).forEach((dKey) => {
        Object.keys(dateVenue[dKey]).forEach((v) => {
          orders += dateVenue[dKey][v].orders;
          if (isCW(v)) cw += dateVenue[dKey][v].orders;
          else { rs += dateVenue[dKey][v].orders; income += dateVenue[dKey][v].netIncome; }
        });
      });
      return { month: m, orders, corporateWellnessOrders: cw, revenueSharingOrders: rs, revenueSharingIncome: income };
    });
    const sessionPack = buildSessionTable(usageSnap, month);
    const dim = daysInMonthKey(month);
    const lastReported = monthDates[monthDates.length - 1] || '';
    const throughDay = Number(lastReported.slice(8)) || monthDates.length;
    const inProgress = monthDates.length < dim;
    const fullPrev = trend.length > 1
      ? { orders: trend[trend.length - 2].orders, netIncome: trend[trend.length - 2].revenueSharingIncome }
      : null;
    const prev = inProgress ? monthSliceTotals(dateVenue, dateKeys, shiftMonthKey(month, -1), throughDay) : fullPrev;
    return res.status(200).json({
      hasData: true, view: 'monthly', month, availableMonths: months, dayCount: monthDates.length, totals,
      split: { corporateWellnessOrders: cwOrders, revenueSharingOrders: rsOrders },
      completedRate: totals.orders > 0 ? totals.completed / totals.orders : 0,
      venueTable, trend,
      story: monthStory(totals, prev, venueTable, inProgress ? { throughDay, daysInMonth: dim } : null, fullPrev),
      sessionPack, sessionTable: sessionPack.rows, sessionMeta: buildSessionMeta(usageSnap, month),
      dataHealthIssues, unsupportedUsageMetrics: ['seating', 'idle', 'occupied', 'scanned', 'payCount', 'h5Conversion'],
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
  const totals = { orders: 0, netIncome: 0, refunds: 0, completed: 0, gross: 0 };
  const venueTable = [];
  Object.keys(latestVenues).forEach((v) => {
    const lv = latestVenues[v];
    totals.orders += lv.orders;
    totals.netIncome += lv.netIncome;
    totals.refunds += lv.refunds;
    totals.gross += lv.gross || 0;
    totals.completed += lv.completed;
    venueTable.push(venueRow(v, lv, chairsByVenue, businessModelByVenue));
  });
  venueTable.sort((a, b) => b.orders - a.orders);

  const missingVenues = [];
  Object.keys(rsPreviousVenues).forEach((pv) => { if (!isCW(pv) && !(pv in latestVenues)) missingVenues.push(pv); });
  if (!latestIsWeekend) Object.keys(cwPreviousVenues).forEach((pv) => { if (isCW(pv) && !(pv in latestVenues)) missingVenues.push(pv); });
  const newVenues = Object.keys(latestVenues).filter((v) => venueFirstSeen[v] === latestKey);

  const flags = [];
  Object.keys(latestVenues).forEach((v) => {
    const cwVenue = isCW(v);
    if (cwVenue && latestIsWeekend) return;
    const comparisonVenues = cwVenue ? cwPreviousVenues : rsPreviousVenues;
    const comparisonDateKey = cwVenue ? previousBusinessDayForCW : previousKey;
    if (!comparisonDateKey || !(v in comparisonVenues)) return;
    const curr = latestVenues[v].orders;
    const prevN = comparisonVenues[v].orders;
    if (prevN >= 5 && curr <= prevN * 0.2) flags.push({ venue: v, type: 'drop', message: `Had ${prevN} orders on ${comparisonDateKey}, only ${curr} now.` });
    else if (prevN < 5 && curr >= Math.max(prevN * 3, 5)) flags.push({ venue: v, type: 'rise', message: `Had ${prevN} orders on ${comparisonDateKey}, jumped to ${curr} now.` });
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
    const series = isCW(v) ? venueSeries[v].filter((e) => !e.isWeekend) : venueSeries[v];
    if (!series.length) return;
    const last = series[series.length - 1];
    if (last.dateKey !== latestKey || last.orders > 0) return;
    let streak = 0;
    for (let k = series.length - 1; k >= 0; k -= 1) {
      if (series[k].orders === 0) streak += 1; else break;
    }
    if (streak < 2) return;
    const priorEndIndex = series.length - 1 - streak;
    if (priorEndIndex < 0) return;
    let priorTotal = 0; let priorCount = 0;
    for (let k = 0; k <= priorEndIndex; k += 1) { priorTotal += series[k].orders; priorCount += 1; }
    const priorAvg = priorCount > 0 ? priorTotal / priorCount : 0;
    if (priorAvg >= 5) sustainedOutages.push({ venue: v, streak, priorAvg: Math.round(priorAvg) });
  });

  const trend = dateKeys.slice(-30).map((dKey) => {
    let cwTotal = 0; let rsTotal = 0; let rsIncomeTotal = 0;
    Object.keys(dateVenue[dKey]).forEach((vn) => {
      if (isCW(vn)) cwTotal += dateVenue[dKey][vn].orders;
      else { rsTotal += dateVenue[dKey][vn].orders; rsIncomeTotal += dateVenue[dKey][vn].netIncome; }
    });
    return { date: dKey, corporateWellnessOrders: cwTotal, revenueSharingOrders: rsTotal, revenueSharingIncome: rsIncomeTotal };
  });

  const sessionPack = buildSessionTable(usageSnap, latestKey.slice(0, 7));
  return res.status(200).json({
    hasData: true, view: 'daily', period: latestKey, previousPeriod: previousKey, totals, venueTable,
    missingVenues, newVenues, flags, duplicates, sustainedOutages, trend,
    sessionPack, sessionTable: sessionPack.rows, sessionMeta: buildSessionMeta(usageSnap, latestKey.slice(0, 7)),
    dataHealthIssues, availableDates: dateKeys,
    unsupportedUsageMetrics: ['seating', 'idle', 'occupied', 'scanned', 'payCount', 'h5Conversion'],
  });
});
