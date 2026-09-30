// Reporting helpers for monthly/daily story and session mix.

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function shiftMonthKey(monthKey, delta) {
  const [y, m] = String(monthKey || '').split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dailyRangeFor(req) {
  const now = new Date().toISOString().slice(0, 7);
  const requested = String(req.query.month || req.query.date || now).slice(0, 7);
  return { start: `${shiftMonthKey(requested, -11)}-01`, end: `${requested}-31` };
}

export function isWeekendKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

export function mostRecentBusinessDayBefore(dateKey, sortedDateKeys) {
  const idx = sortedDateKeys.indexOf(dateKey);
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (!isWeekendKey(sortedDateKeys[i])) return sortedDateKeys[i];
  }
  return null;
}

export function emptyVenue() {
  return {
    orders: 0, netIncome: 0, refunds: 0, completed: 0, totalAmount: 0, gross: 0,
    orderPriceSum: 0, orderPriceCount: 0, visitorsSum: 0, visitorsCount: 0,
  };
}

export function addRow(target, row) {
  target.orders += Number(row.orderNumber) || 0;
  target.refunds += Number(row.refund) || 0;
  const gross = Number(row.totalAmount) || 0;
  target.gross = (target.gross || 0) + gross;
  target.netIncome += gross - (Number(row.refund) || 0);
  target.completed += Number(row.completeNum) || 0;
  target.totalAmount += Number(row.totalAmount) || 0;
  if (row.orderPrice !== '' && row.orderPrice != null) {
    target.orderPriceSum += Number(row.orderPrice) || 0;
    target.orderPriceCount += 1;
  }
  if (row.avgVisitors !== '' && row.avgVisitors != null) {
    target.visitorsSum += Number(row.avgVisitors) || 0;
    target.visitorsCount += 1;
  }
}

export function venueRow(name, v, chairsByVenue, businessModelByVenue) {
  const key = String(name || '').trim().toLowerCase();
  const chairs = chairsByVenue[key] || null;
  return {
    venue: name,
    model: (businessModelByVenue && businessModelByVenue[key]) || '',
    orders: v.orders,
    chairs,
    avgPerChair: chairs ? v.orders / chairs : null,
    gross: v.gross || v.totalAmount || 0,
    netIncome: v.netIncome,
    refunds: v.refunds,
    completed: v.completed,
    avgOrderPrice: v.orderPriceCount > 0 ? v.orderPriceSum / v.orderPriceCount : 0,
    avgVisitors: v.visitorsCount > 0 ? v.visitorsSum / v.visitorsCount : 0,
  };
}

function usagePeriodMonth(period) {
  if (period instanceof Date && !isNaN(period.getTime())) {
    return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof period === 'number' && period > 20000 && period < 80000) {
    const d = new Date(Math.round((period - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  let s = String(period || '').trim();
  if (!s) return '';
  s = s.replace(/\s+to\s+/ig, '~');
  const iso = s.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0].slice(0, 7);
  const ymd = s.match(/\b(\d{4})[\/](\d{1,2})[\/](\d{1,2})\b/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}`;
  const mdy = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (mdy) {
    const year = mdy[3].length === 2 ? (Number(mdy[3]) >= 70 ? `19${mdy[3]}` : `20${mdy[3]}`) : mdy[3];
    return `${year}-${String(mdy[1]).padStart(2, '0')}`;
  }
  const parsed = Date.parse(s.split('~')[0].trim());
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const ym = s.match(/\d{4}-\d{2}/);
  return ym ? ym[0] : '';
}

function rowUsageMonth(row) {
  const stored = String((row && row.periodMonth) || '');
  if (/^\d{4}-\d{2}$/.test(stored)) return stored;
  return usagePeriodMonth(row && row.period);
}

function parseGear(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function mixRows(usageSnap, monthFilter) {
  const byKey = {};
  if (!usageSnap || usageSnap.empty) return [];
  usageSnap.forEach((doc) => {
    const row = doc.data();
    const month = rowUsageMonth(row);
    const name = String(row.venueName || '').trim();
    if (!name) return;
    if (monthFilter && month !== monthFilter) return;
    const key = month + '|' + name;
    if (!byKey[key]) byKey[key] = { month, venue: name, orders: 0, first: 0, second: 0, third: 0, weight: 0 };
    const w = Number(row.orderNumber) || 0;
    byKey[key].orders += w;
    const g1 = parseGear(row.firstGearRate);
    const g2 = parseGear(row.secondGearRate);
    const g3 = parseGear(row.thirdGearRate);
    if (g1 == null && g2 == null && g3 == null) return;
    if (g1 === 0 && g2 === 0 && g3 === 0) return;
    const weight = w > 0 ? w : 1;
    byKey[key].first += (g1 || 0) * weight;
    byKey[key].second += (g2 || 0) * weight;
    byKey[key].third += (g3 || 0) * weight;
    byKey[key].weight += weight;
  });
  return Object.values(byKey).map((v) => ({
    month: v.month,
    venue: v.venue,
    orders: v.orders,
    firstGearRate: v.weight ? v.first / v.weight : null,
    secondGearRate: v.weight ? v.second / v.weight : null,
    thirdGearRate: v.weight ? v.third / v.weight : null,
  }));
}

export function buildSessionTable(usageSnap, month) {
  const allRows = mixRows(usageSnap, null).sort((a, b) => String(a.month).localeCompare(b.month) || String(a.venue).localeCompare(b.venue));
  const months = [...new Set(allRows.map((r) => r.month).filter(Boolean))].sort();
  return {
    month,
    requestedMonth: month,
    availableMonths: months,
    rows: mixRows(usageSnap, month).sort((a, b) => b.orders - a.orders),
    allRows,
  };
}

export function buildSessionMeta(usageSnap, month) {
  let total = 0;
  let matched = 0;
  const samples = [];
  if (!usageSnap || usageSnap.empty) return { total: 0, matched: 0, samples: [] };
  usageSnap.forEach((doc) => {
    const row = doc.data();
    total += 1;
    const m = rowUsageMonth(row);
    if (m === month) matched += 1;
    if (samples.length < 6) samples.push({ period: String(row.period || ''), month: m || '', venue: String(row.venueName || '') });
  });
  return { total, matched, samples };
}

export function daysInMonthKey(monthKey) {
  const [y, m] = String(monthKey || '').split('-').map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0).getDate();
}

export function monthSliceTotals(dateVenue, dateKeys, month, throughDay) {
  const out = { orders: 0, netIncome: 0 };
  dateKeys.filter((d) => d.slice(0, 7) === month && Number(d.slice(8)) <= throughDay).forEach((dKey) => {
    const venues = dateVenue[dKey] || {};
    Object.keys(venues).forEach((v) => {
      out.orders += venues[v].orders || 0;
      out.netIncome += venues[v].netIncome || 0;
    });
  });
  return out;
}

function money(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString();
}

export function monthStory(totals, prev, venueTable, mtd, fullPrev) {
  const parts = [];
  const when = mtd ? ' this month so far' : ' this month';
  if (prev && prev.orders) {
    const pct = Math.round(((totals.orders - prev.orders) / prev.orders) * 100);
    parts.push(`Usage is ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct)}%${when} (${Math.round(totals.orders)} vs ${Math.round(prev.orders)}).`);
  } else {
    parts.push(`${Math.round(totals.orders || 0)} sessions${when}.`);
  }
  if (prev && prev.netIncome && totals.netIncome != null) {
    const pct = Math.round(((totals.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100);
    parts.push(`Income is ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct)}% (${money(totals.netIncome)} vs ${money(prev.netIncome)}).`);
  }
  if (mtd && mtd.throughDay && mtd.daysInMonth && fullPrev && fullPrev.orders) {
    const projected = totals.orders * (mtd.daysInMonth / mtd.throughDay);
    const fpct = Math.round(((projected - fullPrev.orders) / fullPrev.orders) * 100);
    parts.push(`On pace to finish ${fpct >= 0 ? 'up' : 'down'} ${Math.abs(fpct)}% by month end.`);
  }
  if (venueTable[0] && venueTable[0].orders > 0) {
    const next = venueTable[1];
    parts.push(next && next.orders > 0
      ? `${venueTable[0].venue} led the way, then ${next.venue}.`
      : `${venueTable[0].venue} led the way.`);
  }
  const quiet = venueTable.filter((v) => !v.orders);
  if (quiet.length === 1) parts.push(`${quiet[0].venue} is still at zero.`);
  else if (quiet.length) parts.push(`${quiet.length} sites are still at zero.`);
  return parts.join(' ');
}

export function rowDedupeKey(row) {
  return [row.countDate, row.venueId, row.outletId, row.venueName, row.outletName]
    .map((p) => String(p || '').trim().toLowerCase())
    .join('|');
}
