// Monthly overview.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

const DEVICES_PER_VENUE = 2;
const COMMERCIAL_MODELS = new Set(['Corporate Wellness', 'Revenue Sharing']);

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthStart(monthKey) { return `${monthKey}-01`; }
function monthEnd(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}
function asOfLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function reportCoversMonth(report, monthKey) {
  const start = report.periodStart || '';
  const end = report.periodEnd || '';
  if (!start && !end) return false;
  const ms = monthStart(monthKey);
  const me = monthEnd(monthKey);
  return (start || ms) <= me && (end || start || me) >= ms;
}
function expenseTotalFromReports(reports, monthKey, fallbackRows) {
  const matches = reports.filter((r) => reportCoversMonth(r, monthKey));
  if (matches.length) {
    const withExpense = matches.filter((r) => r.expense != null && r.expense !== '');
    if (withExpense.length) return withExpense.reduce((s, r) => s + (Number(r.expense) || 0), 0);
    const fromCats = matches.reduce((s, r) => s + (r.topExpenses || []).reduce((t, c) => t + (Number(c.amount) || 0), 0), 0);
    if (fromCats) return fromCats;
  }
  return (fallbackRows || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
}
function breakdownFromReports(reports, monthKey, monthExpenses) {
  const matches = reports.filter((r) => reportCoversMonth(r, monthKey));
  const cats = [];
  matches.forEach((r) => { (r.topExpenses || []).forEach((e) => cats.push({ category: e.category, total: Number(e.amount) || 0, percentOfTotal: e.percentOfTotal ?? null })); });
  if (cats.length) {
    const byCat = {};
    cats.forEach((c) => {
      if (!byCat[c.category]) byCat[c.category] = { category: c.category, total: 0, percentOfTotal: c.percentOfTotal };
      byCat[c.category].total += c.total;
    });
    return Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 3);
  }
  const byCat = {};
  (monthExpenses || []).forEach((e) => { const cat = e.category || 'Uncategorized'; byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0); });
  const total = Object.values(byCat).reduce((s, n) => s + n, 0);
  return Object.entries(byCat).map(([category, amount]) => ({ category, total: amount, percentOfTotal: total ? Math.round((amount / total) * 100) : null })).sort((a, b) => b.total - a.total).slice(0, 3);
}
function findProject(projectsByName, projectsByLower, name) {
  if (!name) return { key: name, data: {} };
  if (projectsByName[name]) return { key: name, data: projectsByName[name] };
  const key = projectsByLower[String(name).trim().toLowerCase()];
  if (key) return { key, data: projectsByName[key] || {} };
  return { key: name, data: {} };
}
function chairsOf(project) {
  const n = Number(project?.numberOfChairs);
  return !isNaN(n) && n > 0 ? n : DEVICES_PER_VENUE;
}
function cwContractMonthly(project) { return Number(project?.monthlyFee) || 0; }
function liveInMonth(project, monthKey) {
  const go = project?.goLiveDate || '';
  if (!go) return false;
  return String(go).slice(0, 10) <= monthEnd(monthKey);
}
function isCommercialSite(name, project) {
  if (project && project.commercial === false) return false;
  const n = String(name || project?.name || '').trim().toLowerCase();
  if (/\b(demo|internal|test|non[- ]?commercial)\b/.test(n)) return false;
  if (n === 'lemo wellness' || n.startsWith('lemo wellness')) return false;
  return COMMERCIAL_MODELS.has(project?.businessModel || '');
}
function cashInMonth(allIncome, monthKey) {
  return allIncome.filter((i) => (i.date || '').startsWith(monthKey)).reduce((s, i) => s + (Number(i.amount) || 0), 0);
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
function firstServiceMonthKey(goLiveDate) {
  const raw = String(goLiveDate || '').slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (!parts[0] || !parts[1]) return '';
  const day = parts[2] || 1;
  const goMonth = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
  return shiftMonth(goMonth, day <= 1 ? 0 : 1);
}
function incomeBelongsToSite(incomeLocation, name, project) {
  const loc = String(incomeLocation || '').trim().toLowerCase();
  if (!loc) return false;
  return [name, project?.name].filter(Boolean).some((s) => String(s).trim().toLowerCase() === loc);
}

const MONTH_RE = /^\d{4}-\d{2}$/;
function incomeAppliedMonths(row) {
  const out = [];
  const push = (m) => {
    const key = String(m || '').trim().slice(0, 7);
    if (MONTH_RE.test(key) && !out.includes(key)) out.push(key);
  };
  if (Array.isArray(row.periodMonths)) row.periodMonths.forEach(push);
  String(row.periodMonth || '').split('+').forEach(push);
  if (!out.length) push(String(row.date || '').slice(0, 7));
  return out;
}
function cwBalance(name, data, monthKey, allIncome) {
  const fee = cwContractMonthly(data);
  const start = firstServiceMonthKey(data.goLiveDate);
  const lastBilled = shiftMonth(monthKey, -1);
  if (fee <= 0 || !start || start > lastBilled) return null;
  const billable = monthKeysFromTo(start, lastBilled);
  const paid = new Set();
  let cash = 0;
  allIncome.forEach((i) => {
    const receivedMonth = String(i.date || '').slice(0, 7);
    if (receivedMonth.length !== 7 || receivedMonth > monthKey) return;
    if (!incomeBelongsToSite(i.location, name, data)) return;
    const amt = Number(i.amount) || 0;
    if (amt <= 0) return;
    cash += amt;
    incomeAppliedMonths(i).forEach((m) => { if (m <= lastBilled) paid.add(m); });
  });
  const unpaid = billable.filter((m) => !paid.has(m));
  return {
    fee,
    monthsBillable: billable.length,
    monthsOwed: unpaid.length,
    expectedTotal: billable.length * fee,
    totalReceived: cash,
    balanceOwed: unpaid.length * fee,
  };
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
  const monthKey = req.query.month || new Date().toISOString().slice(0, 7);
  const [projectsSnap, expensesSnap, incomeSnap, financialsSnap, dailySnap] = await Promise.all([
    adminDb.collection('projects').get(), adminDb.collection('expenses').get(), adminDb.collection('income').get(),
    adminDb.collection('financialReports').get(),
      adminDb.collection('dailyRawData')
        .where('countDate', '>=', monthStart(shiftMonth(monthKey, -5)))
        .where('countDate', '<=', monthEnd(monthKey))
        .get(),
  ]);
  const projectsByName = {}; const projectsByLower = {};
  projectsSnap.forEach((doc) => {
    const data = doc.data(); const name = data.name || doc.id;
    projectsByName[doc.id] = data;
    if (name) projectsByLower[String(name).trim().toLowerCase()] = doc.id;
  });
  const modelOf = (loc) => findProject(projectsByName, projectsByLower, loc).data.businessModel || null;
  const allExpenses = expensesSnap.docs.map((d) => d.data());
  const allIncome = incomeSnap.docs.map((d) => d.data());
  const financialReports = financialsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const monthIncome = allIncome.filter((i) => (i.date || '').startsWith(monthKey));
  const monthExpenses = allExpenses.filter((e) => (e.date || '').startsWith(monthKey));
  function cwEarned(forMonth) {
    return Object.entries(projectsByName).map(([name, data]) => ({ name: data.name || name, data }))
      .filter(({ name, data }) => data.businessModel === 'Corporate Wellness' && isCommercialSite(name, data) && liveInMonth(data, forMonth))
      .reduce((s, { data }) => s + cwContractMonthly(data), 0);
  }
  function rsDailyByVenue(forMonth) {
    const byVenue = {};
    dailySnap.forEach((doc) => {
      const row = doc.data();
      if (!(row.countDate || '').startsWith(forMonth)) return;
      const venue = String(row.venueName || '').trim();
      if (!venue) return;
      const p = findProject(projectsByName, projectsByLower, venue).data || {};
      if (p.businessModel !== 'Revenue Sharing') return;
      if (!isCommercialSite(venue, p)) return;
      if (!byVenue[venue]) byVenue[venue] = { total: 0, refund: 0, net: 0 };
      const gross = Number(row.totalAmount) || 0;
      const refund = Number(row.refund) || 0;
      byVenue[venue].total += gross;
      byVenue[venue].refund += refund;
      byVenue[venue].net += gross - refund;
    });
    return byVenue;
  }
  function rsEarned(forMonth) {
    return Object.values(rsDailyByVenue(forMonth)).reduce((s, v) => s + (v.net != null ? v.net : (v.total - v.refund)), 0);
  }
  function rsRefunds(forMonth) {
    return Object.values(rsDailyByVenue(forMonth)).reduce((s, v) => s + v.refund, 0);
  }
  function cwCash(forMonth) {
    return allIncome.reduce((s, i) => {
      if (!(i.date || '').startsWith(forMonth)) return s;
      const p = findProject(projectsByName, projectsByLower, i.location).data || {};
      if (p.businessModel !== 'Corporate Wellness') return s;
      return s + (Number(i.amount) || 0);
    }, 0);
  }
  const cwSites = Object.entries(projectsByName).map(([name, data]) => ({ name: data.name || name, data }))
    .filter(({ name, data }) => data.businessModel === 'Corporate Wellness' && isCommercialSite(name, data) && liveInMonth(data, monthKey));
  let rsChairs = 0;
  let rsInstalls = 0;
  Object.entries(projectsByName).forEach(([id, data]) => {
    const name = data.name || id;
    if (data.businessModel === 'Revenue Sharing' && isCommercialSite(name, data) && liveInMonth(data, monthKey)) {
      rsInstalls += 1;
      rsChairs += Number(data.numberOfChairs) > 0 ? Number(data.numberOfChairs) : 0;
    }
  });
  const rsThisMonth = rsDailyByVenue(monthKey);
  const corporateWellnessIncome = cwEarned(monthKey);
  const corporateWellnessCash = cwCash(monthKey);
  const revenueSharingIncome = rsEarned(monthKey);
  const totalRefunds = rsRefunds(monthKey);
  const totalEarned = corporateWellnessCash + revenueSharingIncome;
  const totalLemoIncome = totalEarned;
  const totalIncome = totalEarned;
  const totalCashCollected = totalEarned;
  const totalExpenses = expenseTotalFromReports(financialReports, monthKey, monthExpenses);
  const netProfitLoss = totalIncome - totalExpenses;
  const perLocationIncome = {}; monthIncome.forEach((i) => { perLocationIncome[i.location] = (perLocationIncome[i.location] || 0) + (Number(i.amount) || 0); });
  const perLocationExpenses = {}; monthExpenses.forEach((e) => { perLocationExpenses[e.location] = (perLocationExpenses[e.location] || 0) + (Number(e.amount) || 0); });
  const dailyActive = new Set(); dailySnap.forEach((doc) => { const row = doc.data(); const venue = String(row.venueName || '').trim(); if (venue && (row.countDate || '').startsWith(monthKey)) dailyActive.add(venue); });
  const displayNames = {};
  function remember(name) { if (!name) return; const { key } = findProject(projectsByName, projectsByLower, name); displayNames[String(key).trim().toLowerCase()] = key || name; }
  Object.keys(perLocationIncome).forEach(remember); Object.keys(perLocationExpenses).forEach(remember); dailyActive.forEach(remember); cwSites.forEach(({ name }) => remember(name));
  const activeLocationNames = Array.from(new Set(Object.values(displayNames).filter(Boolean)))
    .filter((name) => liveInMonth(findProject(projectsByName, projectsByLower, name).data, monthKey));
  const activeLocations = activeLocationNames.length;
  const perLocationGross = {}; monthIncome.forEach((i) => { if (i.grossRevenue != null) perLocationGross[i.location] = (perLocationGross[i.location] || 0) + Number(i.grossRevenue); });
  const locationTable = activeLocationNames.map((name) => {
    const p = findProject(projectsByName, projectsByLower, name).data || {};
    const commercial = isCommercialSite(name, p);
    const chairs = chairsOf(p);
    const rsRow = rsThisMonth[name] || rsThisMonth[p.name];
    const received = p.businessModel === 'Revenue Sharing'
      ? (rsRow ? rsRow.total : 0)
      : (perLocationIncome[name] || perLocationIncome[p.name] || 0);
    const refunds = p.businessModel === 'Revenue Sharing' ? (rsRow ? rsRow.refund : 0) : 0;
    const netIncome = received - refunds;
    const billableRevenue = p.businessModel === 'Corporate Wellness' ? (commercial ? cwContractMonthly(p) : 0) : received;
    const expenses = perLocationExpenses[name] || perLocationExpenses[p.name] || 0;
    const netProfit = billableRevenue - expenses;
    return { location: name, model: p.businessModel || '', chairs, commercial, grossRevenue: perLocationGross[name] ?? perLocationGross[p.name] ?? null, billableRevenue, received, refunds, netIncome, lemoIncome: billableRevenue, expenses, netProfit, netPerChair: commercial && chairs ? netProfit / chairs : null };
  }).sort((a, b) => b.billableRevenue - a.billableRevenue);
  let cwOwed = 0;
  let cwChairs = 0;
  cwSites.forEach(({ name, data }) => {
    cwChairs += Number(data.numberOfChairs) > 0 ? Number(data.numberOfChairs) : 0;
    const bal = cwBalance(name, data, monthKey, allIncome);
    if (bal) cwOwed += bal.balanceOwed;
  });
  const comparison = ['Corporate Wellness', 'Revenue Sharing'].map((model) => {
    const rows = locationTable.filter((l) => l.model === model && l.commercial !== false);
    const rsGross = Object.values(rsThisMonth).reduce((s, v) => s + v.total, 0);
    const rsRefundsTot = Object.values(rsThisMonth).reduce((s, v) => s + v.refund, 0);
    const income = model === 'Corporate Wellness' ? corporateWellnessIncome : rsGross;
    const cash = model === 'Corporate Wellness'
      ? monthIncome.filter((i) => modelOf(i.location) === model).reduce((s, i) => s + (Number(i.amount) || 0), 0)
      : rsGross;
    const expenses = monthExpenses.filter((e) => modelOf(e.location) === model).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    let usage = 0;
    dailySnap.forEach((doc) => {
      const row = doc.data();
      if (!(row.countDate || '').startsWith(monthKey)) return;
      const venue = String(row.venueName || '').trim();
      if (modelOf(venue) !== model) return;
      usage += Number(row.orderNumber) || 0;
    });
    return {
      model, income, cash, usage,
      refunds: model === 'Revenue Sharing' ? rsRefundsTot : 0,
      netIncome: model === 'Revenue Sharing' ? rsGross - rsRefundsTot : cash,
      owed: model === 'Corporate Wellness' ? cwOwed : 0, expenses,
      netProfit: income - expenses,
      activeLocations: activeLocationNames.filter((n) => modelOf(n) === model).length,
      installs: model === 'Corporate Wellness' ? cwSites.length : rsInstalls,
      chairs: model === 'Corporate Wellness' ? cwChairs : rsChairs,
      revenueGeneratingChairs: rows.reduce((s, l) => s + (Number(l.chairs) || DEVICES_PER_VENUE), 0),
    };
  });
  const activeChairs = locationTable.reduce((s, l) => s + (Number(l.chairs) || 0), 0);
  const expenseBreakdown = breakdownFromReports(financialReports, monthKey, monthExpenses);
  const outstandingPayments = cwSites.map(({ name, data }) => {
    const bal = cwBalance(name, data, monthKey, allIncome);
    if (!bal || bal.balanceOwed <= 0.5) return null;
    return {
      location: name,
      model: data.businessModel,
      monthlyFee: bal.fee,
      chairs: Number(data.numberOfChairs) > 0 ? Number(data.numberOfChairs) : 0,
      monthsOwed: bal.monthsOwed,
      monthsBillable: bal.monthsBillable,
      expectedTotal: bal.expectedTotal,
      totalReceived: bal.totalReceived,
      balanceOwed: bal.balanceOwed,
    };
  }).filter(Boolean).sort((a, b) => b.balanceOwed - a.balanceOwed);
  const needsAttention = [];
  outstandingPayments.forEach((row) => {
    const months = row.monthsOwed === 1 ? '1 month' : `${row.monthsOwed} months`;
    needsAttention.push({
      id: `ar-${row.location}`,
      title: `${row.location} owes $${Math.round(row.balanceOwed).toLocaleString()} (${months})`,
      action: 'Call and collect the unpaid service months.',
    });
  });
  const rsGrossTot = Object.values(rsThisMonth).reduce((s, v) => s + (Number(v.total) || 0), 0);
  if (rsGrossTot >= 100 && totalRefunds / rsGrossTot >= 0.12) {
    needsAttention.push({
      id: 'refunds',
      title: `RS refunds are ${Math.round((totalRefunds / rsGrossTot) * 100)}% of RS gross this month`,
      action: 'Check which venues are issuing refunds.',
    });
  }
  const reportedDays = new Set();
  dailySnap.forEach((doc) => {
    const d = String(doc.data().countDate || '');
    if (d.startsWith(monthKey)) reportedDays.add(d);
  });
  const isCurrent = monthKey === new Date().toISOString().slice(0, 7);
  const dim = Number(monthEnd(monthKey).slice(8));
  if (isCurrent && reportedDays.size > 0 && reportedDays.size < Math.max(8, dim - 10)) {
    needsAttention.push({
      id: 'upload',
      title: `Only ${reportedDays.size} days of Daily Raw Data in ${monthLabel(monthKey)}`,
      action: 'Upload the latest Daily file so month-to-date is complete.',
    });
  }
  const dayOfMonth = isCurrent ? new Date().getUTCDate() : 31;
  if (dayOfMonth >= 10) {
    const prevRs = rsDailyByVenue(shiftMonth(monthKey, -1));
    let quiet = 0;
    Object.entries(projectsByName).forEach(([id, data]) => {
      if (quiet >= 6) return;
      const name = data.name || id;
      if (data.businessModel !== 'Revenue Sharing' || !isCommercialSite(name, data) || !liveInMonth(data, monthKey)) return;
      const prev = prevRs[name] || prevRs[data.name] || { total: 0 };
      const curr = rsThisMonth[name] || rsThisMonth[data.name] || { total: 0 };
      if ((Number(prev.total) || 0) >= 50 && (Number(curr.total) || 0) <= 0) {
        quiet += 1;
        needsAttention.push({
          id: `quiet-${name}`,
          title: `${name} had RS sales last month and none this month`,
          action: 'Check the chairs and whether Daily Raw Data includes this site.',
        });
      }
    });
  }
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    const income = rsEarned(key) + cwCash(key);
    const expenseTotal = expenseTotalFromReports(financialReports, key, allExpenses.filter((r) => (r.date || '').startsWith(key)));
    trend.push({ month: monthLabel(key).replace(/, /, ' '), income, expenses: expenseTotal, net: income - expenseTotal });
  }
  const prevMonthKey = shiftMonth(monthKey, -1);
  const prevIncome = rsEarned(prevMonthKey) + cwCash(prevMonthKey);
  const prevExpenses = expenseTotalFromReports(financialReports, prevMonthKey, allExpenses.filter((r) => (r.date || '').startsWith(prevMonthKey)));
  res.status(200).json({
    month: monthLabel(monthKey), monthKey, asOf: monthEnd(monthKey), asOfLabel: asOfLabel(monthKey),
    totalEarned, totalIncome, totalCashCollected, totalLemoIncome, corporateWellnessIncome, corporateWellnessCash, revenueSharingIncome, totalRefunds, totalExpenses, netProfitLoss,
    activeLocations,
    corporateWellnessLocations: activeLocationNames.filter((n) => modelOf(n) === 'Corporate Wellness').length,
    revenueSharingLocations: activeLocationNames.filter((n) => modelOf(n) === 'Revenue Sharing').length,
    activeChairs, comparison, trend,
    monthComparison: {
      current: { label: monthLabel(monthKey).split(' ')[0], cash: totalIncome, income: totalIncome, expenses: totalExpenses, net: netProfitLoss },
      previous: { label: monthLabel(prevMonthKey).split(' ')[0], cash: prevIncome, income: prevIncome, expenses: prevExpenses, net: prevIncome - prevExpenses },
    },
    locationTable, expenseBreakdown, outstandingPayments, needsAttention,
    monthMovers: Object.entries(rsThisMonth).map(([name, curr]) => {
      const prev = (rsDailyByVenue(prevMonthKey)[name] || {}).net || 0;
      return { name, change: Math.round((Number(curr.net) || 0) - prev) };
    }).filter((row) => Math.abs(row.change) >= 20).sort((a, b) => b.change - a.change).slice(0, 2),
    newInstalls: Object.entries(projectsByName).map(([id, data]) => ({ name: data.name || id, goLiveDate: String(data.goLiveDate || '').slice(0, 10), model: data.businessModel || '' }))
      .filter((row) => row.goLiveDate.startsWith(monthKey) && isCommercialSite(row.name, { businessModel: row.model, name: row.name })),
    usageUpdate: (() => {
      function byVenue(forMonth) {
        const totals = {};
        dailySnap.forEach((doc) => {
          const row = doc.data();
          if (!(row.countDate || '').startsWith(forMonth)) return;
          const venue = String(row.venueName || '').trim();
          if (!venue) return;
          totals[venue] = (totals[venue] || 0) + (Number(row.orderNumber) || 0);
        });
        return totals;
      }
      const curr = byVenue(monthKey);
      const prev = byVenue(prevMonthKey);
      const current = Object.values(curr).reduce((s, n) => s + n, 0);
      const previous = Object.values(prev).reduce((s, n) => s + n, 0);
      const leader = Object.entries(curr).sort((a, b) => b[1] - a[1])[0];
      const mover = Object.keys({ ...curr, ...prev }).map((name) => {
        const before = prev[name] || 0;
        const now = curr[name] || 0;
        return { name, changePct: before ? Math.round(((now - before) / before) * 100) : null, now };
      }).filter((row) => row.changePct != null).sort((a, b) => b.changePct - a.changePct)[0];
      return { current, previous, changePct: previous ? Math.round(((current - previous) / previous) * 100) : null, leader: leader ? { name: leader[0], usage: leader[1] } : null, mover: mover || null };
    })(),
  });
  } catch (err) {
    console.error('monthly api', err);
    res.status(500).json({ error: err.message || 'Monthly API failed.' });
  }
}, { tab: 'mo' });
