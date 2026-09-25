import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';

function monthLabel(key) {
  const [y, m] = String(key).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function monthEnd(key) {
  const [y, m] = String(key).split('-').map(Number);
  return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}
function monthKeyOf(date) {
  const k = String(date || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(k) ? k : '';
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const [reportSnap, incomeSnap, expenseSnap] = await Promise.all([
    adminDb.collection('financialReports').orderBy('periodStart', 'desc').get(),
    adminDb.collection('income').get(),
    adminDb.collection('expenses').get(),
  ]);

  const incomeRows = incomeSnap.docs.map((d) => d.data());
  const expenseRows = expenseSnap.docs.map((d) => d.data());
  const uploaded = reportSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const months = new Set();
  incomeRows.forEach((i) => { const k = monthKeyOf(i.date); if (k) months.add(k); });
  expenseRows.forEach((e) => { const k = monthKeyOf(e.date); if (k) months.add(k); });
  uploaded.forEach((r) => { const k = monthKeyOf(r.periodStart); if (k) months.add(k); });

  const reports = [...months].sort().reverse().map((key) => {
    const inMonth = incomeRows.filter((i) => monthKeyOf(i.date) === key);
    const exMonth = expenseRows.filter((e) => monthKeyOf(e.date) === key);
    const uploads = uploaded.filter((r) => monthKeyOf(r.periodStart) === key);
    const liveRevenue = inMonth.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const liveExpense = exMonth.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const uploadRevenue = uploads.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
    const uploadExpense = uploads.reduce((s, r) => s + (Number(r.expense) || 0), 0);
    const revenue = liveRevenue || uploadRevenue;
    const expense = liveExpense || uploadExpense;
    const byCat = {};
    exMonth.forEach((e) => {
      const cat = e.category || 'Uncategorized';
      byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
    });
    let topExpenses = Object.entries(byCat)
      .map(([category, amount]) => ({ category, amount, percentOfTotal: expense ? Math.round((amount / expense) * 100) : null }))
      .sort((a, b) => b.amount - a.amount);
    if (!topExpenses.length) {
      uploads.forEach((r) => { (r.topExpenses || []).forEach((c) => { topExpenses.push({ category: c.category, amount: Number(c.amount) || 0, percentOfTotal: c.percentOfTotal ?? null }); }); });
    }
    return {
      id: `month-${key}`,
      periodStart: `${key}-01`,
      periodEnd: monthEnd(key),
      label: monthLabel(key),
      revenue,
      expense,
      netProfit: revenue - expense,
      topExpenses,
      uploadIds: uploads.map((u) => u.id),
    };
  });

  return res.status(200).json({ reports });
}, { tab: 'financials' });
