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
function incomeInRange(rows, start, end) {
  return rows.filter((i) => {
    const d = String(i.date || '').slice(0, 10);
    if (d.length !== 10) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}
function noteKey(periodStart, category) {
  return `${String(periodStart || '')}|${String(category || '')}`;
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const [reportSnap, incomeSnap, noteSnap] = await Promise.all([
    adminDb.collection('financialReports').orderBy('periodStart', 'desc').get(),
    adminDb.collection('income').get(),
    adminDb.collection('financialCategoryNotes').get(),
  ]);
  const notesByKey = {};
  noteSnap.forEach((d) => {
    const n = d.data();
    notesByKey[noteKey(n.periodStart, n.category)] = n.note || '';
  });
  const incomeRows = incomeSnap.docs.map((d) => d.data());
  const used = new Set();

  function withNotes(periodStart, categories) {
    return (categories || []).map((c) => ({
      ...c,
      note: notesByKey[noteKey(periodStart, c.category)] || '',
    }));
  }

  const uploaded = reportSnap.docs.map((d) => {
    const data = d.data();
    const matched = incomeInRange(incomeRows, data.periodStart, data.periodEnd);
    matched.forEach((i) => used.add(`${i.location || ''}|${i.date || ''}|${i.amount || ''}`));
    const added = matched.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const revenue = (Number(data.revenue) || 0) + added;
    const expense = data.expense == null || data.expense === '' ? 0 : Number(data.expense) || 0;
    return {
      id: d.id,
      ...data,
      revenue,
      expense,
      netProfit: revenue - expense,
      topExpenses: withNotes(data.periodStart, data.topExpenses),
      uploadIds: [d.id],
    };
  });

  const leftoverMonths = new Set();
  incomeRows.forEach((i) => {
    const key = `${i.location || ''}|${i.date || ''}|${i.amount || ''}`;
    if (used.has(key)) return;
    const mk = monthKeyOf(i.date);
    if (mk) leftoverMonths.add(mk);
  });

  const extra = [...leftoverMonths].sort().reverse().map((key) => {
    const start = `${key}-01`;
    const end = monthEnd(key);
    const matched = incomeRows.filter((i) => {
      const stamp = `${i.location || ''}|${i.date || ''}|${i.amount || ''}`;
      return !used.has(stamp) && monthKeyOf(i.date) === key;
    });
    const revenue = matched.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    return {
      id: `income-${key}`,
      periodStart: start,
      periodEnd: end,
      label: monthLabel(key),
      revenue,
      expense: 0,
      netProfit: revenue,
      topExpenses: [],
      uploadIds: [],
    };
  });

  const reports = [...uploaded, ...extra].sort((a, b) => String(b.periodStart || '').localeCompare(String(a.periodStart || '')));
  return res.status(200).json({ reports });
}, { tab: 'financials' });
