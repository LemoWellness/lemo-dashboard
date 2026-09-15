import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : '—');
const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10'];

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return opts;
}

function Hint({ text }) {
  return (
    <span title={text} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 14, height: 14, marginLeft: 6, borderRadius: '50%',
      border: '1px solid var(--iron)', fontSize: 10, color: 'var(--ash)', cursor: 'help', verticalAlign: 'middle',
    }}>?</span>
  );
}

export default function Monthly() {
  const router = useRouter();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelFilter, setModelFilter] = useState('All');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const monthOptions = buildMonthOptions();

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'financials') return router.push('/financials');
  }

  function load(m) {
    setLoading(true); setError('');
    authedFetch(`/api/monthly?month=${m}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d.error || !Array.isArray(d.locationTable)) {
          setError(d.error || `Monthly data failed to load (${r.status}).`);
          setData(null);
        } else setData(d);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setData(null); setLoading(false); });
  }
  useEffect(() => { if (session) load(month); }, [session]); // eslint-disable-line
  function onMonthChange(e) { setMonth(e.target.value); load(e.target.value); }

  if (loading) return <Layout active="mo" onNavigate={navigate}><p className="muted">Loading monthly overview…</p></Layout>;
  if (error) return <Layout active="mo" onNavigate={navigate}><p className="form-error">{error}</p></Layout>;
  if (!data) return null;

  const totalIncome = data.totalCashCollected ?? 0;
  const net = totalIncome - (Number(data.totalExpenses) || 0);
  const filteredLocations = (data.locationTable || []).filter((l) => modelFilter === 'All' || l.model === modelFilter);
  const comparison = data.comparison || [];
  const breakdown = data.expenseBreakdown || [];
  const outstanding = data.outstandingPayments || [];
  const cmp = data.monthComparison || { current: {}, previous: {} };

  return (
    <Layout active="mo" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1>Monthly Overview</h1>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Month
          <select value={month} onChange={onMonthChange}>{monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        </label>
      </div>
      <p className="muted">{data.month} performance · AR balances as of {data.asOfLabel || data.month}</p>

      <div className="grid-4">
        <Kpi label="Total income" value={fmt(totalIncome)} hint="Cash received this month from income records. Unpaid CW contracts are not included." />
        <Kpi label="Total expenses" value={fmt(data.totalExpenses)} hint="Company-wide expenses from Financials for this month." />
        <Kpi label="Net profit / loss" value={fmt(net)} negative={net < 0} hint="Total income minus company-wide expenses." />
        <Kpi label="Active chairs" value={data.activeChairs?.toLocaleString() ?? '—'} hint="Chairs at locations with activity this month." />
      </div>

      <div className="grid-2">
        {comparison.map((c) => {
          const chairs = c.revenueGeneratingChairs ?? 0;
          const perChair = chairs > 0 ? c.income / chairs : null;
          return (
            <div className="card" key={c.model} style={{ marginBottom: 0 }}>
              <h3 style={{ marginTop: 0 }}>{c.model} Performance</h3>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Income</span><span>{fmt(c.income)}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Direct expenses</span><span>{fmt(c.expenses)}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Contribution</span><span>{fmt(c.netProfit)}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Active locations</span><span>{c.activeLocations}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Revenue-generating chairs</span><span>{chairs || '—'}</span></div>
              <div className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--warm-white)' }}>
                {perChair != null ? `${fmt(perChair)}/chair across ${chairs} revenue-generating chair${chairs === 1 ? '' : 's'}` : 'No revenue-generating chairs in this model this month'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>This Month vs Last Month</h3>
          <div className="table-wrap"><table>
            <thead><tr><th></th><th>{cmp.current?.label}</th><th>{cmp.previous?.label}</th><th>Change</th></tr></thead>
            <tbody>
              <CompareRow label="Income" current={cmp.current?.income} previous={cmp.previous?.income} />
              <CompareRow label="Expenses" current={cmp.current?.expenses} previous={cmp.previous?.expenses} lowerIsBetter />
              <CompareRow label="Net P/L" current={cmp.current?.net} previous={cmp.previous?.net} />
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Top 3 expense categories</h3>
          {breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={breakdown} dataKey="total" nameKey="category" outerRadius="75%" label={(e) => `${e.category}${e.percentOfTotal != null ? ` (${e.percentOfTotal}%)` : ''}`}>
                  {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name, entry) => [`${fmt(v)}${entry.payload.percentOfTotal != null ? ` (${entry.payload.percentOfTotal}%)` : ''}`, entry.payload.category]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="muted">No expenses this month.</p>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>6-Month Financial Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Line type="monotone" dataKey="income" name="Income" stroke="#E85D20" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#0C0A09" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="net" name="Net" stroke="#D9A441" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Accounts Receivable — Outstanding Balance</h3>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: -6 }}>
          Cumulative billed vs cash received as of {data.asOfLabel || data.month} — not this month’s performance.
        </p>
        {outstanding.length > 0 ? (
          <div className="table-wrap wide"><table>
            <thead><tr><th>Location</th><th>Business Model</th><th>Fee / mo</th><th>Months billable (to date)</th><th>Billed to date</th><th>Cash received to date</th><th>Balance owed</th></tr></thead>
            <tbody>
              {outstanding.map((c, i) => (
                <tr key={i}><td>{c.location}</td><td>{c.model}</td><td>{fmt(c.monthlyFee)}</td><td>{c.monthsBillable}</td><td>{fmt(c.expectedTotal)}</td><td>{fmt(c.totalReceived)}</td><td style={{ color: 'var(--ember-muted)' }}>{fmt(c.balanceOwed)}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : <p className="muted">Nothing outstanding as of {data.asOfLabel || data.month}.</p>}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Location performance — {data.month} only</h3>
          <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
            <option value="All">All models</option>
            <option value="Corporate Wellness">Corporate Wellness</option>
            <option value="Revenue Sharing">Revenue Sharing</option>
          </select>
        </div>
        <div className="table-wrap wide"><table>
          <thead><tr>
            <th>Location</th>
            <th>Model</th>
            <th>Chairs</th>
            <th>Expected</th>
            <th>Received / Revenue</th>
          </tr></thead>
          <tbody>
            {filteredLocations.map((l, i) => {
              const isCw = l.model === 'Corporate Wellness';
              const expected = isCw && l.commercial !== false ? fmt(l.billableRevenue ?? l.lemoIncome) : '—';
              const received = l.commercial === false ? '—' : fmt(l.received ?? 0);
              return (
              <tr key={i}>
                <td>{l.location}</td>
                <td>{isCw ? 'CW' : l.model === 'Revenue Sharing' ? 'RS' : (l.model || '—')}</td>
                <td>{l.chairs ?? '—'}</td>
                <td>{expected}</td>
                <td>{received}</td>
              </tr>
              );
            })}
            {filteredLocations.length === 0 && <tr><td colSpan={5} className="muted">No location activity for this month</td></tr>}
          </tbody>
        </table></div>
      </div>
    </Layout>
  );
}

function Kpi({ label, value, negative, hint }) {
  return (
    <div className="card" style={{ marginBottom: 0 }} title={hint || ''}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        {label}{hint ? <Hint text={hint} /> : null}
      </div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem', color: negative ? 'var(--ember-muted)' : 'var(--obsidian)' }}>{value}</div>
    </div>
  );
}

function CompareRow({ label, current, previous, lowerIsBetter }) {
  let changeText = '—'; let color = 'var(--ash)';
  if (typeof current === 'number' && typeof previous === 'number' && previous !== 0) {
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const isUp = pct > 0;
    changeText = `${pct === 0 ? '→' : isUp ? '↑' : '↓'} ${Math.abs(pct).toFixed(0)}%`;
    const isGood = lowerIsBetter ? !isUp : isUp;
    color = pct === 0 ? 'var(--ash)' : isGood ? '#16a34a' : 'var(--ember-muted)';
  }
  return <tr><td>{label}</td><td>{fmt(current)}</td><td>{fmt(previous)}</td><td style={{ color, fontWeight: 500 }}>{changeText}</td></tr>;
}
