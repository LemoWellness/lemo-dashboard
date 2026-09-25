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

function liveReportsFromBooks(incomeRows, expenseRows) {
  const months = new Set();
  incomeRows.forEach((i) => { const k = monthKeyOf(i.date); if (k) months.add(k); });
  expenseRows.forEach((e) => { const k = monthKeyOf(e.date); if (k) months.add(k); });
  return [...months].sort().reverse().map((key) => {
    const inMonth = incomeRows.filter((i) => monthKeyOf(i.date) === key);
    const exMonth = expenseRows.filter((e) => monthKeyOf(e.date) === key);
    const revenue = inMonth.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const expense = exMonth.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const byCat = {};
    exMonth.forEach((e) => {
      const cat = e.category || 'Uncategorized';
      byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
    });
    const topExpenses = Object.entries(byCat)
      .map(([category, amount]) => ({ category, amount, percentOfTotal: expense ? Math.round((amount / expense) * 100) : null }))
      .sort((a, b) => b.amount - a.amount);
    return {
      id: `live-${key}`,
      source: 'live',
      periodStart: `${key}-01`,
      periodEnd: monthEnd(key),
      label: `${monthLabel(key)} (live books)`,
      revenue,
      expense,
      netProfit: revenue - expense,
      topExpenses,
    };
  });
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const [reportSnap, incomeSnap, expenseSnap] = await Promise.all([
    adminDb.collection('financialReports').orderBy('periodStart', 'desc').get(),
    adminDb.collection('income').get(),
    adminDb.collection('expenses').get(),
  ]);
  const uploaded = reportSnap.docs.map((d) => ({ id: d.id, source: 'upload', ...d.data() }));
  const live = liveReportsFromBooks(
    incomeSnap.docs.map((d) => d.data()),
    expenseSnap.docs.map((d) => d.data()),
  );
  const reports = [...live, ...uploaded].sort((a, b) => String(b.periodStart || '').localeCompare(String(a.periodStart || '')));
  return res.status(200).json({ reports });
}, { tab: 'financials' });
