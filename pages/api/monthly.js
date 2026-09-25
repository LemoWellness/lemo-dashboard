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
function usagePeriodOverlapsMonth(period, monthKey) {
  const raw = String(period || '');
  const parts = raw.includes('~') ? raw.split('~') : raw.includes(' to ') ? raw.split(' to ') : [raw];
  const start = (parts[0] || '').trim().slice(0, 10);
  const end = (parts[1] || parts[0] || '').trim().slice(0, 10);
  if (!start) return false;
  return start <= monthEnd(monthKey) && (end || start) >= monthStart(monthKey);
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
function firstBillMonthKey(goLiveDate) {
  const raw = String(goLiveDate || '').slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (!parts[0] || !parts[1]) return '';
  const day = parts[2] || 1;
  const goMonth = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
  return shiftMonth(goMonth, day <= 1 ? 1 : 2);
}
function incomeBelongsToSite(incomeLocation, name, project) {
  const loc = String(incomeLocation || '').trim().toLowerCase();
  if (!loc) return false;
  return [name, project?.name].filter(Boolean).some((s) => String(s).trim().toLowerCase() === loc);
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
  const monthKey = req.query.month || new Date().toISOString().slice(0, 7);
  const [projectsSnap, expensesSnap, incomeSnap, financialsSnap, dailySnap, usageSnap] = await Promise.all([
    adminDb.collection('projects').get(), adminDb.collection('expenses').get(), adminDb.collection('income').get(),
    adminDb.collection('financialReports').get(), adminDb.collection('dailyRawData').get(), adminDb.collection('usageRawData').get(),
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
  function rsEarned(forMonth) {
    return allIncome.filter((i) => (i.date || '').startsWith(forMonth) && modelOf(i.location) === 'Revenue Sharing').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  }
  const cwSites = Object.entries(projectsByName).map(([name, data]) => ({ name: data.name || name, data }))
    .filter(({ name, data }) => data.businessModel === 'Corporate Wellness' && isCommercialSite(name, data) && liveInMonth(data, monthKey));
  const corporateWellnessIncome = cwEarned(monthKey);
  const revenueSharingIncome = rsEarned(monthKey);
  const totalEarned = corporateWellnessIncome + revenueSharingIncome;
  const totalLemoIncome = totalEarned;
  const totalCashCollected = cashInMonth(allIncome, monthKey);
  const totalExpenses = expenseTotalFromReports(financialReports, monthKey, monthExpenses);
  const netProfitLoss = totalCashCollected - totalExpenses;
  const perLocationIncome = {}; monthIncome.forEach((i) => { perLocationIncome[i.location] = (perLocationIncome[i.location] || 0) + (Number(i.amount) || 0); });
  const perLocationExpenses = {}; monthExpenses.forEach((e) => { perLocationExpenses[e.location] = (perLocationExpenses[e.location] || 0) + (Number(e.amount) || 0); });
  const dailyActive = new Set(); dailySnap.forEach((doc) => { const row = doc.data(); const venue = String(row.venueName || '').trim(); if (venue && (row.countDate || '').startsWith(monthKey)) dailyActive.add(venue); });
  const usageActive = new Set(); usageSnap.forEach((doc) => { const row = doc.data(); const venue = String(row.venueName || '').trim(); if (venue && usagePeriodOverlapsMonth(row.period, monthKey)) usageActive.add(venue); });
  const displayNames = {};
  function remember(name) { if (!name) return; const { key } = findProject(projectsByName, projectsByLower, name); displayNames[String(key).trim().toLowerCase()] = key || name; }
  Object.keys(perLocationIncome).forEach(remember); Object.keys(perLocationExpenses).forEach(remember); dailyActive.forEach(remember); usageActive.forEach(remember); cwSites.forEach(({ name }) => remember(name));
  const activeLocationNames = Array.from(new Set(Object.values(displayNames).filter(Boolean)))
    .filter((name) => liveInMonth(findProject(projectsByName, projectsByLower, name).data, monthKey));
  const activeLocations = activeLocationNames.length;
  const perLocationGross = {}; monthIncome.forEach((i) => { if (i.grossRevenue != null) perLocationGross[i.location] = (perLocationGross[i.location] || 0) + Number(i.grossRevenue); });
  const locationTable = activeLocationNames.map((name) => {
    const p = findProject(projectsByName, projectsByLower, name).data || {};
    const commercial = isCommercialSite(name, p);
    const chairs = chairsOf(p);
    const received = perLocationIncome[name] || perLocationIncome[p.name] || 0;
    const billableRevenue = p.businessModel === 'Corporate Wellness' ? (commercial ? cwContractMonthly(p) : 0) : received;
    const expenses = perLocationExpenses[name] || perLocationExpenses[p.name] || 0;
    const netProfit = billableRevenue - expenses;
    return { location: name, model: p.businessModel || '', chairs, commercial, grossRevenue: perLocationGross[name] ?? perLocationGross[p.name] ?? null, billableRevenue, received, lemoIncome: billableRevenue, expenses, netProfit, netPerChair: commercial && chairs ? netProfit / chairs : null };
  }).sort((a, b) => b.billableRevenue - a.billableRevenue);
  let cwOwed = 0;
  let cwChairs = 0;
  cwSites.forEach(({ name, data }) => {
    cwChairs += Number(data.numberOfChairs) > 0 ? Number(data.numberOfChairs) : 0;
    const fee = cwContractMonthly(data);
    if (fee <= 0) return;
    const start = firstBillMonthKey(data.goLiveDate);
    if (!start || start > monthKey) return;
    const expected = monthKeysFromTo(start, monthKey).length * fee;
    const received = allIncome.reduce((s, i) => {
      const mk = String(i.date || '').slice(0, 7);
      if (mk.length !== 7 || mk > monthKey) return s;
      if (!incomeBelongsToSite(i.location, name, data)) return s;
      return s + (Number(i.amount) || 0);
    }, 0);
    cwOwed += Math.max(0, expected - received);
  });
  const comparison = ['Corporate Wellness', 'Revenue Sharing'].map((model) => {
    const rows = locationTable.filter((l) => l.model === model && l.commercial !== false);
    const income = model === 'Corporate Wellness' ? corporateWellnessIncome : revenueSharingIncome;
    const cash = monthIncome.filter((i) => modelOf(i.location) === model).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const expenses = monthExpenses.filter((e) => modelOf(e.location) === model).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      model, income, cash, owed: model === 'Corporate Wellness' ? cwOwed : 0, expenses,
      netProfit: income - expenses,
      activeLocations: activeLocationNames.filter((n) => modelOf(n) === model).length,
      chairs: model === 'Corporate Wellness' ? cwChairs : rows.reduce((s, l) => s + (Number(l.chairs) || 0), 0),
      revenueGeneratingChairs: rows.reduce((s, l) => s + (Number(l.chairs) || DEVICES_PER_VENUE), 0),
    };
  });
  const activeChairs = locationTable.reduce((s, l) => s + (Number(l.chairs) || 0), 0);
  const expenseBreakdown = breakdownFromReports(financialReports, monthKey, monthExpenses);
  const outstandingPayments = cwSites.map(({ name, data }) => {
    const fee = cwContractMonthly(data);
    if (fee <= 0) return null;
    const start = firstBillMonthKey(data.goLiveDate);
    if (!start || start > monthKey) return null;
    const monthsBillable = monthKeysFromTo(start, monthKey).length;
    const expectedTotal = monthsBillable * fee;
    const totalReceived = allIncome.reduce((s, i) => {
      const mk = String(i.date || '').slice(0, 7);
      if (mk.length !== 7 || mk > monthKey) return s;
      if (!incomeBelongsToSite(i.location, name, data)) return s;
      return s + (Number(i.amount) || 0);
    }, 0);
    const balanceOwed = expectedTotal - totalReceived;
    if (balanceOwed <= 0.5) return null;
    return {
      location: name,
      model: data.businessModel,
      monthlyFee: fee,
      chairs: Number(data.numberOfChairs) > 0 ? Number(data.numberOfChairs) : 0,
      monthsOwed: Math.round(balanceOwed / fee),
      monthsBillable,
      expectedTotal,
      totalReceived,
      balanceOwed,
    };
  }).filter(Boolean).sort((a, b) => b.balanceOwed - a.balanceOwed);
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    const income = cashInMonth(allIncome, key);
    const expenseTotal = expenseTotalFromReports(financialReports, key, allExpenses.filter((r) => (r.date || '').startsWith(key)));
    trend.push({ month: monthLabel(key).replace(/, /, ' '), income, expenses: expenseTotal, net: income - expenseTotal });
  }
  const prevMonthKey = shiftMonth(monthKey, -1);
  const prevCash = cashInMonth(allIncome, prevMonthKey);
  const prevExpenses = expenseTotalFromReports(financialReports, prevMonthKey, allExpenses.filter((r) => (r.date || '').startsWith(prevMonthKey)));
  res.status(200).json({
    month: monthLabel(monthKey), monthKey, asOf: monthEnd(monthKey), asOfLabel: asOfLabel(monthKey),
    totalEarned, totalCashCollected, totalLemoIncome, corporateWellnessIncome, revenueSharingIncome, totalExpenses, netProfitLoss,
    activeLocations,
    corporateWellnessLocations: activeLocationNames.filter((n) => modelOf(n) === 'Corporate Wellness').length,
    revenueSharingLocations: activeLocationNames.filter((n) => modelOf(n) === 'Revenue Sharing').length,
    activeChairs, comparison, trend,
    monthComparison: {
      current: { label: monthLabel(monthKey).split(' ')[0], cash: totalCashCollected, income: totalCashCollected, expenses: totalExpenses, net: netProfitLoss },
      previous: { label: monthLabel(prevMonthKey).split(' ')[0], cash: prevCash, income: prevCash, expenses: prevExpenses, net: prevCash - prevExpenses },
    },
    locationTable, expenseBreakdown, outstandingPayments,
  });
  } catch (err) {
    console.error('monthly api', err);
    res.status(500).json({ error: err.message || 'Monthly API failed.' });
  }
}, { tab: 'mo' });
