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

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const monthKey = req.query.month || new Date().toISOString().slice(0, 7);

  const [projectsSnap, expensesSnap, incomeSnap] = await Promise.all([
    adminDb.collection('projects').get(),
    adminDb.collection('expenses').get(),
    adminDb.collection('income').get(),
  ]);

  const projectsByName = {};
  projectsSnap.forEach((doc) => { projectsByName[doc.id] = doc.data(); });
  const modelOf = (loc) => projectsByName[loc]?.businessModel || null;

  const allExpenses = expensesSnap.docs.map((d) => d.data());
  const allIncome = incomeSnap.docs.map((d) => d.data());

  const monthIncome = allIncome.filter((i) => (i.date || '').startsWith(monthKey));
  const monthExpenses = allExpenses.filter((e) => (e.date || '').startsWith(monthKey));

  const totalLemoIncome = monthIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const corporateWellnessIncome = monthIncome.filter((i) => modelOf(i.location) === 'Corporate Wellness').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const revenueSharingIncome = monthIncome.filter((i) => modelOf(i.location) === 'Revenue Sharing').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfitLoss = totalLemoIncome - totalExpenses;

  const perLocationIncome = {};
  monthIncome.forEach((i) => { perLocationIncome[i.location] = (perLocationIncome[i.location] || 0) + (Number(i.amount) || 0); });
  const activeLocationNames = Object.keys(perLocationIncome).filter((n) => perLocationIncome[n] !== 0);
  const activeLocations = activeLocationNames.length;
  const corporateWellnessLocations = activeLocationNames.filter((n) => modelOf(n) === 'Corporate Wellness').length;
  const revenueSharingLocations = activeLocationNames.filter((n) => modelOf(n) === 'Revenue Sharing').length;

  const comparison = ['Corporate Wellness', 'Revenue Sharing'].map((model) => {
    const income = monthIncome.filter((i) => modelOf(i.location) === model).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const expenses = monthExpenses.filter((e) => modelOf(e.location) === model).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { model, income, expenses, netProfit: income - expenses, activeLocations: activeLocationNames.filter((n) => modelOf(n) === model).length };
  });

  const perLocationExpenses = {};
  monthExpenses.forEach((e) => { perLocationExpenses[e.location] = (perLocationExpenses[e.location] || 0) + (Number(e.amount) || 0); });
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

  // Top expense categories now come from the uploaded Profit & Loss / Top
  // Expenses reports (real accounting categories), not from summing the
  // per-location Expenses collection — per Gloria's request, since the
  // accounting export is the authoritative source for this breakdown.
  const financialsSnap = await adminDb.collection('financialReports').orderBy('periodStart', 'desc').limit(1).get();
  const expenseBreakdown = financialsSnap.empty
    ? []
    : (financialsSnap.docs[0].data().topExpenses || []).slice(0, 3).map((e) => ({ category: e.category, total: e.amount, percentOfTotal: e.percentOfTotal ?? null }));

  // Outstanding payments — general-purpose, not permanently CW-only. Right
  // now only Corporate Wellness has a billing model (fixed monthly fee) that
  // produces a receivable, but this is built to hold other models' balances
  // too later (mall fees, RS amounts due, etc.) without a second table.
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

  // 6-Month Financial Trend — Income / Expenses / Net, not CW/RS split
  // (that split is already shown in the comparison cards above), since for
  // an end-of-month read the more useful question is whether expenses are
  // growing faster than income.
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    const incomeTotal = allIncome.filter((r) => (r.date || '').startsWith(key)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expenseTotal = allExpenses.filter((r) => (r.date || '').startsWith(key)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    trend.push({ month: monthLabel(key).replace(/, /, ' '), income: incomeTotal, expenses: expenseTotal, net: incomeTotal - expenseTotal });
  }

  // This Month vs Last Month — reuses the same monthly totals, just for the
  // previous month too, so the comparison replaces the CW/RS donut (which
  // just repeated numbers already shown in the comparison cards above it).
  const prevMonthKey = shiftMonth(monthKey, -1);
  const prevIncomeRows = allIncome.filter((r) => (r.date || '').startsWith(prevMonthKey));
  const prevExpenseRows = allExpenses.filter((r) => (r.date || '').startsWith(prevMonthKey));
  const prevIncome = prevIncomeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const prevExpenses = prevExpenseRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
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
