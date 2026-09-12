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
    return {
      location: name, model: p.businessModel || '', chairs: p.numberOfChairs ?? null,
      grossRevenue: perLocationGross[name] ?? null, lemoIncome, expenses, netProfit: lemoIncome - expenses,
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

  const byCategory = {};
  monthExpenses.forEach((e) => { if (e.category) byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0); });
  const catEntries = Object.entries(byCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  const top3 = catEntries.slice(0, 3);
  const otherTotal = catEntries.slice(3).reduce((s, e) => s + e.total, 0);
  const expenseBreakdown = otherTotal > 0 ? [...top3, { category: 'Other', total: otherTotal }] : top3;

  // Corporate Wellness outstanding payments — uses ALL-TIME income received, not just this month
  const allTimeReceivedByLocation = {};
  allIncome.forEach((i) => { allTimeReceivedByLocation[i.location] = (allTimeReceivedByLocation[i.location] || 0) + (Number(i.amount) || 0); });
  const cwPaymentStatus = Object.entries(projectsByName)
    .filter(([, p]) => p.businessModel === 'Corporate Wellness' && Number(p.monthlyFee) > 0)
    .map(([name, p]) => {
      const monthsBillable = Math.floor(Number(p.tenureMonths) || 0);
      if (monthsBillable <= 0) return null;
      const expectedTotal = monthsBillable * Number(p.monthlyFee);
      const totalReceived = allTimeReceivedByLocation[name] || 0;
      const balanceOwed = expectedTotal - totalReceived;
      if (balanceOwed <= 0.5) return null;
      return { location: name, monthlyFee: p.monthlyFee, monthsBillable, expectedTotal, totalReceived, balanceOwed };
    })
    .filter(Boolean)
    .sort((a, b) => b.balanceOwed - a.balanceOwed);

  // 12-month trend ending at the selected month
  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    const monthRows = allIncome.filter((r) => (r.date || '').startsWith(key));
    const cw = monthRows.filter((r) => modelOf(r.location) === 'Corporate Wellness').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const rs = monthRows.filter((r) => modelOf(r.location) === 'Revenue Sharing').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    trend.push({ month: monthLabel(key).replace(/, /, ' '), corporateWellness: cw, revenueSharing: rs, total: cw + rs });
  }

  res.status(200).json({
    month: monthLabel(monthKey), monthKey,
    totalLemoIncome, corporateWellnessIncome, revenueSharingIncome, totalExpenses, netProfitLoss,
    activeLocations, corporateWellnessLocations, revenueSharingLocations,
    comparison, trend, locationTable, expenseBreakdown, cwPaymentStatus, revenuePerChair,
  });
}, { tab: 'mo' });
