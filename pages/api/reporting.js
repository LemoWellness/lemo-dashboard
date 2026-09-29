// Reporting. Reads dailyRawData + projects. Session mix from usageRawData.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftMonthKey(monthKey, delta) {
  const [y, m] = String(monthKey || '').split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dailyRangeFor(req) {
  const now = new Date().toISOString().slice(0, 7);
  const requested = String(req.query.month || req.query.date || now).slice(0, 7);
  const startMonth = shiftMonthKey(requested, -11);
  return { start: `${startMonth}-01`, end: `${requested}-31` };
}

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
    orders: 0, netIncome: 0, refunds: 0, completed: 0, totalAmount: 0, gross: 0,
    orderPriceSum: 0, orderPriceCount: 0, visitorsSum: 0, visitorsCount: 0,
  };
}

function addRow(target, row) {
  target.orders += Number(row.orderNumber) || 0;
  target.refunds += Number(row.refund) || 0;
  const gross = Number(row.totalAmount) || 0;
  target.gross = (target.gross || 0) + gross;
  target.netIncome += gross - (Number(row.refund) || 0);
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

function venueRow(name, v, chairsByVenue, businessModelByVenue) {
  const key = String(name || '').trim().toLowerCase();
  const chairs = chairsByVenue[key] || null;
  return {
    venue: name,
    model: (businessModelByVenue && businessModelByVenue[key]) || '',
    orders: v.orders,
    chairs,
    avgPerChair: chairs ? v.orders / chairs : null,
    gross: v.gross || v.totalAmount || 0,
    netIncome: v.netIncome,
    refunds: v.refunds,
    completed: v.completed,
    avgOrderPrice: v.orderPriceCount > 0 ? v.orderPriceSum / v.orderPriceCount : 0,
    avgVisitors: v.visitorsCount > 0 ? v.visitorsSum / v.visitorsCount : 0,
  };
}

function usagePeriodMonth(period) {
  if (period instanceof Date && !isNaN(period.getTime())) {
    return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof period === 'number' && period > 20000 && period < 80000) {
    const d = new Date(Math.round((period - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  let s = String(period || '').trim();
  if (!s) return '';
  s = s.replace(/\s+to\s+/ig, '~');
  const iso = s.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0].slice(0, 7);
  const ymd = s.match(/\b(\d{4})[\/](\d{1,2})[\/](\d{1,2})\b/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}`;
  const mdy = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (mdy) {
    const year = mdy[3].length === 2 ? (Number(mdy[3]) >= 70 ? `19${mdy[3]}` : `20${mdy[3]}`) : mdy[3];
    return `${year}-${String(mdy[1]).padStart(2, '0')}`;
  }
  const parsed = Date.parse(s.split('~')[0].trim());
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const ym = s.match(/\d{4}-\d{2}/);
  return ym ? ym[0] : '';
}

function rowUsageMonth(row) {
  const stored = String((row && row.periodMonth) || '');
  if (/^\d{4}-\d{2}$/.test(stored)) return stored;
  return usagePeriodMonth(row && row.period);
}

function usageMonths(usageSnap) {
  const months = new Set();
  if (!usageSnap || usageSnap.empty) return [];
  usageSnap.forEach((doc) => {
    const m = rowUsageMonth(doc.data());
    if (m) months.add(m);
  });
  return [...months].sort();
}

function parseGear(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function rowsForUsageMonth(usageSnap, month) {
  const byVenue = {};
  if (!usageSnap || usageSnap.empty || !month) return [];
  usageSnap.forEach((doc) => {
    const row = doc.data();
    if (rowUsageMonth(row) !== month) return;
    const name = String(row.venueName || '').trim();
    if (!name) return;
    if (!byVenue[name]) byVenue[name] = { venue: name, month, orders: 0, first: 0, second: 0, third: 0, weight: 0 };
    const w = Number(row.orderNumber) || 0;
    byVenue[name].orders += w;
    const g1 = parseGear(row.firstGearRate);
    const g2 = parseGear(row.secondGearRate);
    const g3 = parseGear(row.thirdGearRate);
    if (g1 == null && g2 == null && g3 == null) return;
    if (g1 === 0 && g2 === 0 && g3 === 0) return;
    const weight = w > 0 ? w : 1;
    byVenue[name].first += (g1 || 0) * weight;
    byVenue[name].second += (g2 || 0) * weight;
    byVenue[name].third += (g3 || 0) * weight;
    byVenue[name].weight += weight;
  });
  return Object.values(byVenue).map((v) => ({
    venue: v.venue,
    month: v.month || month,
    orders: v.orders,
    firstGearRate: v.weight ? v.first / v.weight : null,
    secondGearRate: v.weight ? v.second / v.weight : null,
    thirdGearRate: v.weight ? v.third / v.weight : null,
  })).sort((a, b) => b.orders - a.orders);
}

function allSessionRows(usageSnap) {
  const byKey = {};
  if (!usageSnap || usageSnap.empty) return [];
  usageSnap.forEach((doc) => {
    const row = doc.data();
    const month = rowUsageMonth(row);
    const name = String(row.venueName || '').trim();
    if (!name) return;
    const key = month + '|' + name;
    if (!byKey[key]) byKey[key] = { month, venue: name, orders: 0, first: 0, second: 0, third: 0, weight: 0 };
    const w = Number(row.orderNumber) || 0;
    byKey[key].orders += w;
    const g1 = parseGear(row.firstGearRate);
    const g2 = parseGear(row.secondGearRate);
    const g3 = parseGear(row.thirdGearRate);
    if (g1 == null && g2 == null && g3 == null) return;
    if (g1 === 0 && g2 === 0 && g3 === 0) return;
    const weight = w > 0 ? w : 1;
    byKey[key].first += (g1 || 0) * weight;
    byKey[key].second += (g2 || 0) * weight;
    byKey[key].third += (g3 || 0) * weight;
    byKey[key].weight += weight;
  });
  return Object.values(byKey).map((v) => ({
    month: v.month,
    venue: v.venue,
    orders: v.orders,
    firstGearRate: v.weight ? v.first / v.weight : null,
    secondGearRate: v.weight ? v.second / v.weight : null,
    thirdGearRate: v.weight ? v.third / v.weight : null,
  })).sort((a, b) => String(a.month).localeCompare(b.month) || String(a.venue).localeCompare(b.venue));
}

function buildSessionTable(usageSnap, month) {
  const months = usageMonths(usageSnap);
  return {
    month,
    requestedMonth: month,
    availableMonths: months,
    rows: rowsForUsageMonth(usageSnap, month),
    allRows: allSessionRows(usageSnap),
  };
}

function buildSessionMeta(usageSnap, month) {
  let total = 0;
  let matched = 0;
  const samples = [];
  if (!usageSnap || usageSnap.empty) return { total: 0, matched: 0, samples: [] };
  usageSnap.forEach((doc) => {
    const row = doc.data();
    total += 1;
    const m = rowUsageMonth(row);
    if (m === month) matched += 1;
    if (samples.length < 6) {
      samples.push({ period: String(row.period || ''), month: m || '', venue: String(row.venueName || '') });
    }
  });
  return { total, matched, samples };
}

function daysInMonthKey(monthKey) {
  const [y, m] = String(monthKey || '').split('-').map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0).getDate();
}

function monthSliceTotals(dateVenue, dateKeys, month, throughDay) {
  const out = { orders: 0, netIncome: 0 };
  dateKeys.filter((d) => d.slice(0, 7) === month && Number(d.slice(8)) <= throughDay).forEach((dKey) => {
    const venues = dateVenue[dKey] || {};
    Object.keys(venues).forEach((v) => {
      out.orders += venues[v].orders || 0;
      out.netIncome += venues[v].netIncome || 0;
    });
  });
  return out;
}

function monthStory(totals, prev, venueTable, mtd) {
  const parts = [];
  const vs = mtd ? `vs last month through day ${mtd.throughDay}` : 'vs last month';
  if (mtd) parts.push(`Month-to-date through day ${mtd.throughDay} of ${mtd.daysInMonth}.`);
  if (prev && prev.orders) {
    const pct = Math.round(((totals.orders - prev.orders) / prev.orders) * 100);
    parts.push(`Usage is ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct)}% ${vs} (${Math.round(totals.orders)} vs ${Math.round(prev.orders)}).`);
  } else {
    parts.push(`${Math.round(totals.orders || 0)} sessions started this month.`);
  }
  if (prev && prev.netIncome != null && totals.netIncome != null && prev.netIncome) {
    const pct = Math.round(((totals.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100);
    parts.push(`Net Income is ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct)}% ${vs}.`);
  }
  if (venueTable[0] && venueTable[0].orders > 0) {
    parts.push(`${venueTable[0].venue} led usage.`);
  }
  const quiet = venueTable.filter((v) => !v.orders);
  if (quiet.length) parts.push(`${quiet.length} site${quiet.length === 1 ? '' : 's'} at zero.`);
  return parts.join(' ');
}

function rowDedupeKey(row) {
  return [row.countDate, row.venueId, row.outletId, row.venueName, row.outletName]
    .map((p) => String(p || '').trim().toLowerCase())
    .join('|');
}

export default withAuth(async (req, res, session) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const tabs = session.tabs;
  const allowed = session.role === 'Admin' || tabs === 'all'
    || (Array.isArray(tabs) && (tabs.includes('daily') || tabs.includes('usage') || tabs.includes('reporting')));
  if (!allowed) return res.status(403).json({ error: 'You do not have access to this section.' });

  const view = String(req.query.view || 'daily') === 'monthly' ? 'monthly' : 'daily';

  const [dailySnap, projectsSnap, usageSnap] = await Promise.all([
    adminDb.collection('dailyRawData')
      .where('countDate', '>=', dailyRangeFor(req).start)
      .where('countDate', '<=', dailyRangeFor(req).end)
      .get(),
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
  const isCorporateWellness = (venueName) =>
    businessModelByVenue[String(venueName || '').trim().toLowerCase()] === 'Corporate Wellness';

  const dateVenue = {};
  const dateOutlet = {};
  const venueFirstSeen = {};
  let badDateCount = 0;
  const badDateExamples = [];
  const seenKeys = new Set();

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
    const key = rowDedupeKey(row);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
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
    const totals = { orders: 0, netIncome: 0, refunds: 0, completed: 0, gross: 0 };
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
        if (isCorporateWellness(v)) cwOrders += src.orders;
        else rsOrders += src.orders;
      });
    });

    const venueTable = Object.keys(byVenue)
      .map((name) => venueRow(name, byVenue[name], chairsByVenue, businessModelByVenue))
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
          if (isCorporateWellness(v)) cw += venuesThisDay[v].orders;
          else {
            rs += venuesThisDay[v].orders;
            income += venuesThisDay[v].netIncome;
          }
        });
      });
      return { month: m, orders, corporateWellnessOrders: cw, revenueSharingOrders: rs, revenueSharingIncome: income };
    });

    const sessionPack = buildSessionTable(usageSnap, month);
    const dim = daysInMonthKey(month);
    const lastReported = monthDates[monthDates.length - 1] || '';
    const throughDay = Number(lastReported.slice(8)) || monthDates.length;
    const inProgress = monthDates.length < dim;
    const prevMonth = shiftMonthKey(month, -1);
    const prev = inProgress
      ? monthSliceTotals(dateVenue, dateKeys, prevMonth, throughDay)
      : (trend.length > 1 ? { orders: trend[trend.length - 2].orders, netIncome: trend[trend.length - 2].revenueSharingIncome } : null);
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
      story: monthStory(totals, prev, venueTable, inProgress ? { throughDay, daysInMonth: dim } : null),
      sessionPack,
      sessionTable: sessionPack.rows,
      sessionMeta: buildSessionMeta(usageSnap, month),
      dataHealthIssues,
      unsupportedUsageMetrics: ['seating', 'idle', 'occupied', 'scanned', 'payCount', 'h5Conversion'],
    });
  }

  const selectedDateKey = req.query.date || null;
  const latestKey = selectedDateKey && dateKeys.includes(selectedDateKey) ? selectedDateKey : dateKeys[dateKeys.length - 1];
  const latestIsWeekend = isWeekendKey(latestKey);
  const latestVenues = dateVenue[latestKey];
  const latestIdx = dateKeys.indexOf(latestKey);
  const previousKey = latestIdx > 0 ? dateKeys[dateKeys.length - 1] && dateKeys[latestIdx - 1] : null;
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

  const sessionPack = buildSessionTable(usageSnap, latestKey.slice(0, 7));
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
    sessionPack,
    sessionTable: sessionPack.rows,
    sessionMeta: buildSessionMeta(usageSnap, latestKey.slice(0, 7)),
    dataHealthIssues,
    availableDates: dateKeys,
    unsupportedUsageMetrics: ['seating', 'idle', 'occupied', 'scanned', 'payCount', 'h5Conversion'],
  });
});
