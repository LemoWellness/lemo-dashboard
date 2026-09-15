// Direct port of getMonthlyOverview() + getCorporateWellnessPaymentStatus_()
// from the old Code.gs/Monthly Overview sheet formulas. Same math: this
// month's income/expenses split by business model, a location performance
// table, revenue-per-chair, expense category breakdown, a 12-month trend,
// and outstanding Corporate Wellness payment tracking.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthStart(monthKey) {
  return `${monthKey}-01`;
}
function monthEnd(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthKey}-${String(last).padStart(2, '0')}`;
}

function reportCoversMonth(report, monthKey) {
  const start = report.periodStart || '';
  const end = report.periodEnd || '';
  if (!start && !end) return false;
  const ms = monthStart(monthKey);
  const me = monthEnd(monthKey);
  const s = start || ms;
  const e = end || start || me;
  return s <= me && e >= ms;
}

function expenseTotalFromReports(reports, monthKey, fallbackRows) {
  const matches = reports.filter((r) => reportCoversMonth(r, monthKey));
  if (matches.length) {
    const withExpense = matches.filter((r) => r.expense != null && r.expense !== '');
    if (withExpense.length) {
      return withExpense.reduce((s, r) => s + (Number(r.expense) || 0), 0);
    }
    const fromCats = matches.reduce((s, r) => {
      const cats = r.topExpenses || [];
      return s + cats.reduce((t, c) => t + (Number(c.amount) || 0), 0);
    }, 0);
    if (fromCats) return fromCats;
  }
  return fallbackRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

function breakdownFromReports(reports, monthKey, monthExpenses) {
  const matches = reports.filter((r) => reportCoversMonth(r, monthKey));
  const cats = [];
  matches.forEach((r) => {
    (r.topExpenses || []).forEach((e) => {
      cats.push({ category: e.category, total: Number(e.amount) || 0, percentOfTotal: e.percentOfTotal ?? null });
    });
  });
  if (cats.length) {
    const byCat = {};
    cats.forEach((c) => {
      if (!byCat[c.category]) byCat[c.category] = { category: c.category, total: 0, percentOfTotal: c.percentOfTotal };
      byCat[c.category].total += c.total;
    });
    return Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 8);
  }
  const byCat = {};
  monthExpenses.forEach((e) => {
    const cat = e.category || 'Uncategorized';
    byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
  });
  const total = Object.values(byCat).reduce((s, n) => s + n, 0);
  return Object.entries(byCat)
    .map(([category, amount]) => ({ category, total: amount, percentOfTotal: total ? Math.round((amount / total) * 100) : null }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const monthKey = req.query.month || new Date().toISOString().slice(0, 7);

  const [projectsSnap, expensesSnap, incomeSnap, financialsSnap] = await Promise.all([
    adminDb.collection('projects').get(),
    adminDb.collection('expenses').get(),
    adminDb.collection('income').get(),
    adminDb.collection('financialReports').get(),
  ]);

  const projectsByName = {};
  projectsSnap.forEach((doc) => { projectsByName[doc.id] = doc.data(); });
  const modelOf = (loc) => projectsByName[loc]?.businessModel || null;

  const allExpenses = expensesSnap.docs.map((d) => d.data());
  const allIncome = incomeSnap.docs.map((d) => d.data());
  const financialReports = financialsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const monthIncome = allIncome.filter((i) => (i.date || '').startsWith(monthKey));
  const monthExpenses = allExpenses.filter((e) => (e.date || '').startsWith(monthKey));

  const totalLemoIncome = monthIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const corporateWellnessIncome = monthIncome.filter((i) => modelOf(i.location) === 'Corporate Wellness').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const revenueSharingIncome = monthIncome.filter((i) => modelOf(i.location) === 'Revenue Sharing').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalExpenses = expenseTotalFromReports(financialReports, monthKey, monthExpenses);
  const netProfitLoss = totalLemoIncome - totalExpenses;

  const perLocationIncome = {};
  monthIncome.forEach((i) => { perLocationIncome[i.location] = (perLocationIncome[i.location] || 0) + (Number(i.amount) || 0); });
  const perLocationExpenses = {};
  monthExpenses.forEach((e) => { perLocationExpenses[e.location] = (perLocationExpenses[e.location] || 0) + (Number(e.amount) || 0); });
  const activeLocationNames = Array.from(new Set([
    ...Object.keys(perLocationIncome).filter((n) => perLocationIncome[n] !== 0),
    ...Object.keys(perLocationExpenses).filter((n) => perLocationExpenses[n] !== 0),
  ]));
  const activeLocations = activeLocationNames.length;
  const corporateWellnessLocations = activeLocationNames.filter((n) => modelOf(n) === 'Corporate Wellness').length;
  const revenueSharingLocations = activeLocationNames.filter((n) => modelOf(n) === 'Revenue Sharing').length;

  const comparison = ['Corporate Wellness', 'Revenue Sharing'].map((model) => {
    const income = monthIncome.filter((i) => modelOf(i.location) === model).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const expenses = monthExpenses.filter((e) => modelOf(e.location) === model).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { model, income, expenses, netProfit: income - expenses, activeLocations: activeLocationNames.filter((n) => modelOf(n) === model).length };
  });

  const perLocationGross = {};
  monthIncome.forEach((i) => { if (i.grossRevenue != null) perLocationGross[i.location] = (perLocationGross[i.location] || 0) + Number(i.grossRevenue); });

  const locationTable = activeLocationNames.map((name) => {
    const p = projectsByName[name] || {};
    const lemoIncome = perLocationIncome[name] || 0;
    const expenses = perLocationExpenses[name] || 0;
    const chairs = p.numberOfChairs ?? null;
    const netProfit = lemoIncome - expenses;
    return {
      location: name, model: p.businessModel || '', chairs,
      grossRevenue: perLocationGross[name] ?? null, lemoIncome, expenses, netProfit,
      netPerChair: chairs && Number(chairs) > 0 ? netProfit / Number(chairs) : null,
    };
  }).sort((a, b) => b.lemoIncome - a.lemoIncome);

  const perChair = {};
  locationTable.forEach((l) => {
    if (!l.model || !l.chairs) return;
    if (!perChair[l.model]) perChair[l.model] = { totalIncome: 0, totalChairs: 0 };
    perChair[l.model].totalIncome += l.lemoIncome;
    perChair[l.model].totalChairs += Number(l.chairs) || 0;
  });
  const revenuePerChair = Object.entries(perChair).map(([model, v]) => ({
    model, chairs: v.totalChairs, revenuePerChair: v.totalChairs > 0 ? v.totalIncome / v.totalChairs : 0,
  }));
  const activeChairs = locationTable.reduce((s, l) => s + (Number(l.chairs) || 0), 0);

  const expenseBreakdown = breakdownFromReports(financialReports, monthKey, monthExpenses);

  const allTimeReceivedByLocation = {};
  allIncome.forEach((i) => { allTimeReceivedByLocation[i.location] = (allTimeReceivedByLocation[i.location] || 0) + (Number(i.amount) || 0); });
  const outstandingPayments = Object.entries(projectsByName)
    .filter(([, p]) => p.businessModel === 'Corporate Wellness' && Number(p.monthlyFee) > 0)
    .map(([name, p]) => {
      const monthsBillable = Math.floor(Number(p.tenureMonths) || 0);
      if (monthsBillable <= 0) return null;
      const expectedTotal = monthsBillable * Number(p.monthlyFee);
      const totalReceived = allTimeReceivedByLocation[name] || 0;
      const balanceOwed = expectedTotal - totalReceived;
      if (balanceOwed <= 0.5) return null;
      return { location: name, model: p.businessModel, monthlyFee: p.monthlyFee, monthsBillable, expectedTotal, totalReceived, balanceOwed };
    })
    .filter(Boolean)
    .sort((a, b) => b.balanceOwed - a.balanceOwed);

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    const incomeTotal = allIncome.filter((r) => (r.date || '').startsWith(key)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expenseRows = allExpenses.filter((r) => (r.date || '').startsWith(key));
    const expenseTotal = expenseTotalFromReports(financialReports, key, expenseRows);
    trend.push({ month: monthLabel(key).replace(/, /, ' '), income: incomeTotal, expenses: expenseTotal, net: incomeTotal - expenseTotal });
  }

  const prevMonthKey = shiftMonth(monthKey, -1);
  const prevIncomeRows = allIncome.filter((r) => (r.date || '').startsWith(prevMonthKey));
  const prevExpenseRows = allExpenses.filter((r) => (r.date || '').startsWith(prevMonthKey));
  const prevIncome = prevIncomeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const prevExpenses = expenseTotalFromReports(financialReports, prevMonthKey, prevExpenseRows);
  const monthComparison = {
    current: { label: monthLabel(monthKey).split(' ')[0], income: totalLemoIncome, expenses: totalExpenses, net: netProfitLoss },
    previous: { label: monthLabel(prevMonthKey).split(' ')[0], income: prevIncome, expenses: prevExpenses, net: prevIncome - prevExpenses },
  };

  res.status(200).json({
    month: monthLabel(monthKey), monthKey,
    totalLemoIncome, corporateWellnessIncome, revenueSharingIncome, totalExpenses, netProfitLoss,
    activeLocations, corporateWellnessLocations, revenueSharingLocations, activeChairs,
    comparison, trend, monthComparison, locationTable, expenseBreakdown, outstandingPayments, revenuePerChair,
  });
}, { tab: 'mo' });
