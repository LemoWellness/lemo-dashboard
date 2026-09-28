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
  const [reportSnap, incomeSnap, noteSnap, dailySnap, projectSnap] = await Promise.all([
    adminDb.collection('financialReports').orderBy('periodStart', 'desc').get(),
    adminDb.collection('income').get(),
    adminDb.collection('financialCategoryNotes').get(),
    adminDb.collection('dailyRawData').get(),
    adminDb.collection('projects').get(),
  ]);
  const projectsByLower = {};
  projectSnap.forEach((doc) => {
    const data = doc.data();
    const name = String(data.name || doc.id).trim().toLowerCase();
    if (name) projectsByLower[name] = data;
  });
  function modelOf(location) {
    return (projectsByLower[String(location || '').trim().toLowerCase()] || {}).businessModel || '';
  }
  const dailyRows = dailySnap.docs.map((d) => d.data());
  const incomeRows = incomeSnap.docs.map((d) => d.data());
  function rsNetInRange(start, end) {
    return dailyRows.reduce((s, row) => {
      const d = String(row.countDate || '').slice(0, 10);
      if (d.length !== 10) return s;
      if (start && d < start) return s;
      if (end && d > end) return s;
      if (modelOf(row.venueName) !== 'Revenue Sharing') return s;
      return s + ((Number(row.totalAmount) || 0) - (Number(row.refund) || 0));
    }, 0);
  }
  function cwCashInRange(start, end) {
    return incomeRows.reduce((s, i) => {
      const d = String(i.date || '').slice(0, 10);
      if (d.length !== 10) return s;
      if (start && d < start) return s;
      if (end && d > end) return s;
      if (modelOf(i.location) !== 'Corporate Wellness') return s;
      return s + (Number(i.amount) || 0);
    }, 0);
  }
  const notesByKey = {};
  noteSnap.forEach((d) => {
    const n = d.data();
    notesByKey[noteKey(n.periodStart, n.category)] = n.note || '';
  });
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
    const revenue = rsNetInRange(data.periodStart, data.periodEnd) + cwCashInRange(data.periodStart, data.periodEnd);
    const expenseMissing = data.expense == null || data.expense === '';
    const expense = expenseMissing ? 0 : Number(data.expense) || 0;
    return {
      id: d.id,
      ...data,
      revenue,
      expense,
      expenseMissing,
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
    const revenue = rsNetInRange(start, end) + cwCashInRange(start, end);
    return {
      id: `income-${key}`,
      periodStart: start,
      periodEnd: end,
      label: monthLabel(key),
      revenue,
      expense: 0,
      expenseMissing: true,
      netProfit: revenue,
      topExpenses: [],
      uploadIds: [],
    };
  });

  const reports = [...uploaded, ...extra].sort((a, b) => String(b.periodStart || '').localeCompare(String(a.periodStart || '')));
  return res.status(200).json({ reports });
}, { tab: 'financials' });
