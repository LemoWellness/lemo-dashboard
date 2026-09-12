// Admin-only. Parses reports from the accounting software. Supports two
// shapes: (1) a Profit & Loss + Top Expenses pair covering the same period
// (the original combined-quarter upload), or (2) one or more standalone
// Top Expenses exports with no matching P&L (e.g. monthly exports where
// only the expense breakdown was pulled) — each becomes its own report,
// with revenue/net left blank since that data wasn't provided for it.
import * as XLSX from 'xlsx';
import formidable from 'formidable';
import fs from 'fs';
import { adminDb } from '../../../lib/firebaseAdmin';
import { requireSession, requireAdmin } from '../../../lib/auth';

export const config = { api: { bodyParser: false } };

function sheetRows(filepath) {
  const buf = fs.readFileSync(filepath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
}

function parsePeriod(rows) {
  const line = rows.map((r) => r.find((c) => typeof c === 'string' && c.startsWith('For the period'))).find(Boolean);
  if (!line) return { periodStart: '', periodEnd: '', label: '' };
  const match = line.match(/For the period (.+) to (.+)/);
  if (!match) return { periodStart: '', periodEnd: '', label: line };
  const toISO = (s) => {
    const d = new Date(s.replace(/(\d+)(st|nd|rd|th)/, '$1'));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };
  return { periodStart: toISO(match[1]), periodEnd: toISO(match[2]), label: `${match[1].trim()} – ${match[2].trim()}` };
}

function findValue(rows, label) {
  for (const row of rows) {
    if (row.some((c) => String(c || '').trim().toLowerCase() === label.toLowerCase())) {
      const nums = row.filter((c) => typeof c === 'number');
      return nums.length ? nums[nums.length - 1] : null;
    }
  }
  return null;
}

function parseTopExpenses(rows) {
  const headerIdx = rows.findIndex((r) => r.some((c) => String(c || '').trim() === 'Category'));
  if (headerIdx === -1) return { categories: [], total: null };
  const categories = [];
  let total = null;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row.find((c) => typeof c === 'string') || '').trim();
    const nums = row.filter((c) => typeof c === 'number');
    if (label === 'Total') { total = nums[0] ?? null; break; }
    if (!label || nums.length < 1) continue;
    categories.push({ category: label, amount: nums[0], percentOfTotal: nums.length > 1 ? nums[1] : null });
  }
  categories.sort((a, b) => b.amount - a.amount);
  return { categories, total };
}

function toArray(f) { return f ? (Array.isArray(f) ? f : [f]) : []; }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const session = await requireSession(req);
    requireAdmin(session);

    const form = formidable({ maxFileSize: 15 * 1024 * 1024, multiples: true });
    const [, files] = await form.parse(req);
    const pnlFiles = toArray(files.pnl);
    const topExpFiles = toArray(files.topExpenses);
    if (pnlFiles.length === 0 && topExpFiles.length === 0) {
      return res.status(400).json({ error: 'Upload at least one file (Profit & Loss or Top Expenses).' });
    }

    // Parse every file up front, keyed by its own period.
    const pnlByPeriod = {};
    for (const f of pnlFiles) {
      const rows = sheetRows(f.filepath);
      const period = parsePeriod(rows);
      pnlByPeriod[`${period.periodStart}|${period.periodEnd}`] = {
        ...period,
        revenue: findValue(rows, 'Revenue') ?? 0,
        expense: findValue(rows, 'Expense') ?? 0,
        netProfit: findValue(rows, 'Net Profit') ?? null,
      };
    }

    const results = [];
    const consumedPnlKeys = new Set();

    for (const f of topExpFiles) {
      const rows = sheetRows(f.filepath);
      const period = parsePeriod(rows);
      const { categories, total } = parseTopExpenses(rows);
      const key = `${period.periodStart}|${period.periodEnd}`;
      const matchingPnl = pnlByPeriod[key];
      if (matchingPnl) consumedPnlKeys.add(key);

      const doc = {
        periodStart: period.periodStart, periodEnd: period.periodEnd, label: period.label,
        revenue: matchingPnl ? matchingPnl.revenue : null,
        expense: matchingPnl ? matchingPnl.expense : total,
        netProfit: matchingPnl ? matchingPnl.netProfit : null,
        topExpenses: categories,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.email,
      };
      const ref = await adminDb.collection('financialReports').add(doc);
      results.push({ id: ref.id, ...doc });
    }

    // Any P&L file whose period didn't match a Top Expenses file becomes its own report (no category breakdown).
    for (const key in pnlByPeriod) {
      if (consumedPnlKeys.has(key)) continue;
      const p = pnlByPeriod[key];
      const doc = {
        periodStart: p.periodStart, periodEnd: p.periodEnd, label: p.label,
        revenue: p.revenue, expense: p.expense, netProfit: p.netProfit,
        topExpenses: [],
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.email,
      };
      const ref = await adminDb.collection('financialReports').add(doc);
      results.push({ id: ref.id, ...doc });
    }

    res.status(200).json({ success: true, reportsCreated: results.length, reports: results });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message || 'Upload failed.' });
  }
}
