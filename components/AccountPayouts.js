import { useMemo, useState } from 'react';

const LEMO = 0.7;
const VENUE = 0.2;
const BD = 0.1;

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

function monthKey(row) {
  return String(row.periodMonth || row.date || '').slice(0, 7);
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
    const list = [...set].sort();
    const now = new Date().toISOString().slice(0, 7);
    if (!list.includes(now)) list.push(now);
    return list.sort();
  }, [income, expenses]);

  const [range, setRange] = useState('all');
  const [month, setMonth] = useState(() => months[months.length - 1] || new Date().toISOString().slice(0, 7));

  const totals = useMemo(() => {
    const inRows = (income || []).filter((i) => range === 'all' || monthKey(i) === month);
    const exRows = (expenses || []).filter((e) => range === 'all' || String(e.date || '').slice(0, 7) === month);
    const totalIncome = inRows.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const venuePaid = exRows.filter((e) => isVenuePayout(e.category)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const bdPaid = exRows.filter((e) => isBdPayout(e.category)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      totalIncome,
      lemo: totalIncome * LEMO,
      venue: totalIncome * VENUE,
      bd: totalIncome * BD,
      venuePaid,
      bdPaid,
    };
  }, [income, expenses, range, month]);

  const outline = { background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Income payouts</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn" style={range === 'month' ? undefined : outline} onClick={() => setRange('month')}>Month</button>
          <button type="button" className="btn" style={range === 'all' ? undefined : outline} onClick={() => setRange('all')}>All-time</button>
          {range === 'month' && (
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="grid-4">
        <PayoutKpi label="Total Income" value={money(totals.totalIncome)} />
        <PayoutKpi label="LEMO Payout 70%" value={money(totals.lemo)} />
        <PayoutKpi label="Venue Payout 20%" value={money(totals.venue)} />
        <PayoutKpi label="BD Payout 10%" value={money(totals.bd)} />
      </div>
      <p className="muted" style={{ margin: '12px 0 0', fontSize: '0.8rem' }}>
        Venue paid {money(totals.venuePaid)} {String.fromCharCode(0x00b7)} BD paid {money(totals.bdPaid)}. Mark payments with Add Expense categories Payout to Venue or Payout to BD.
      </p>
    </div>
  );
}

function PayoutKpi({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.25rem' }}>{value}</div>
    </div>
  );
}
