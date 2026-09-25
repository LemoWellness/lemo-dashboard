import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const LEMO = 0.7;
const VENUE = 0.2;
const BD = 0.1;

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

function monthKey(row) {
  return String(row.periodMonth || row.date || '').slice(0, 7);
}

function monthLabel(key) {
  const [y, m] = String(key).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function isVenuePayout(category) {
  return String(category || '') === 'Payout to Venue';
}
function isBdPayout(category) {
  const c = String(category || '');
  return c === 'Payout to BD' || c === 'Payout to BD Consultants';
}

export default function AccountPayouts({ income, expenses }) {
  const months = useMemo(() => {
    const set = new Set();
    (income || []).forEach((i) => { const k = monthKey(i); if (/^\d{4}-\d{2}$/.test(k)) set.add(k); });
    (expenses || []).forEach((e) => { const k = String(e.date || '').slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) set.add(k); });
    const now = new Date().toISOString().slice(0, 7);
    if (!set.has(now)) set.add(now);
    return [...set].sort();
  }, [income, expenses]);

  const [view, setView] = useState('payouts');
  const [range, setRange] = useState('month');
  const [month, setMonth] = useState(() => months[months.length - 1] || new Date().toISOString().slice(0, 7));

  const totals = useMemo(() => {
    const inRows = (income || []).filter((i) => range === 'all' || monthKey(i) === month);
    const exRows = (expenses || []).filter((e) => range === 'all' || String(e.date || '').slice(0, 7) === month);
    const totalIncome = inRows.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    return {
      totalIncome,
      lemo: totalIncome * LEMO,
      venue: totalIncome * VENUE,
      bd: totalIncome * BD,
      venuePaid: exRows.filter((e) => isVenuePayout(e.category)).reduce((s, e) => s + (Number(e.amount) || 0), 0),
      bdPaid: exRows.filter((e) => isBdPayout(e.category)).reduce((s, e) => s + (Number(e.amount) || 0), 0),
    };
  }, [income, expenses, range, month]);

  const monthlyIncome = useMemo(() => {
    const byMonth = {};
    (income || []).forEach((i) => {
      const key = monthKey(i);
      if (!/^\d{4}-\d{2}$/.test(key)) return;
      if (range === 'month' && key !== month) return;
      if (!byMonth[key]) byMonth[key] = { key, total: 0, label: monthLabel(key) };
      byMonth[key].total += Number(i.amount) || 0;
    });
    return Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));
  }, [income, range, month]);

  const payoutBars = [
    { name: 'LEMO 70%', value: totals.lemo },
    { name: 'Venue 20%', value: totals.venue },
    { name: 'BD 10%', value: totals.bd },
  ];

  const outline = { background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>{view === 'payouts' ? 'Monthly payouts' : 'Monthly income'}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn" style={view === 'payouts' ? undefined : outline} onClick={() => setView('payouts')}>Payouts</button>
          <button type="button" className="btn" style={view === 'income' ? undefined : outline} onClick={() => setView('income')}>Monthly Income</button>
          <button type="button" className="btn" style={range === 'month' ? undefined : outline} onClick={() => setRange('month')}>Month</button>
          <button type="button" className="btn" style={range === 'all' ? undefined : outline} onClick={() => setRange('all')}>All-time</button>
          {range === 'month' && (
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      </div>

      {view === 'payouts' && (
        <>
          <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Income</div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: '1.7rem', marginBottom: 12 }}>{money(totals.totalIncome)}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={payoutBars} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="value" fill="#E85D20" name="Payout" />
            </BarChart>
          </ResponsiveContainer>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>
            Venue paid {money(totals.venuePaid)} {String.fromCharCode(0x00b7)} BD paid {money(totals.bdPaid)}
          </p>
        </>
      )}

      {view === 'income' && (
        monthlyIncome.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyIncome}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="total" fill="#E85D20" name="Income" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="muted">No income recorded for this range.</p>
      )}
    </div>
  );
}
