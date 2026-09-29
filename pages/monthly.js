import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const DASH = String.fromCharCode(8212);
const DOT = String.fromCharCode(183);
const ELLIPSIS = String.fromCharCode(8230);
const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : DASH);
const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10'];
const RS_LEMO = 0.7;
const RS_VENUE = 0.2;
const RS_BD = 0.1;
const NET_HINT = 'Net income after refunds';

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

function Row({ label, value, last }) {
  return (
    <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: last ? 0 : 6 }}>
      <span>{label}</span><span>{value}</span>
    </div>
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
  const [unsigned, setUnsigned] = useState({ cw: 0, rs: 0 });
  const monthOptions = buildMonthOptions();

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
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
  useEffect(() => {
    if (!session) return;
    authedFetch('/api/projects').then((r) => r.json()).then((d) => {
      const list = d.projects || [];
      const count = (model) => list.filter((p) => p.businessModel === model && !p.signedContract).length;
      setUnsigned({ cw: count('Corporate Wellness'), rs: count('Revenue Sharing') });
    }).catch(() => {});
  }, [session]);
  function onMonthChange(e) { setMonth(e.target.value); load(e.target.value); }

  if (loading) return <Layout active="mo" onNavigate={navigate}><p className="muted">Loading monthly overview{ELLIPSIS}</p></Layout>;
  if (error) return <Layout active="mo" onNavigate={navigate}><p className="form-error">{error}</p></Layout>;
  if (!data) return null;

  const totalIncome = data.totalIncome ?? data.totalCashCollected ?? 0;
  const net = data.netProfitLoss != null ? data.netProfitLoss : (totalIncome - (Number(data.totalExpenses) || 0));
  const HIDDEN_FROM_LOCATION_TABLE = new Set(['lemo wellness', 'lemo inc office1', 'lemo inc office2']);
  const filteredLocations = (data.locationTable || []).filter((l) => {
    const name = String(l.location || '').trim().toLowerCase();
    if (HIDDEN_FROM_LOCATION_TABLE.has(name)) return false;
    return modelFilter === 'All' || l.model === modelFilter;
  });
  const comparison = data.comparison || [];
  const breakdown = data.expenseBreakdown || [];
  const outstanding = data.outstandingPayments || [];
  const alerts = data.needsAttention || [];
  const cmp = data.monthComparison || { current: {}, previous: {} };
  const rsChairsFromTable = (data.locationTable || [])
    .filter((l) => l.model === 'Revenue Sharing' && l.commercial !== false)
    .reduce((s, l) => s + (Number(l.chairs) || 0), 0);

  return (
    <Layout active="mo" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1>Monthly Overview</h1>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Month
          <select value={month} onChange={onMonthChange}>{monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        </label>
      </div>
      <p className="muted">{data.month} performance {DOT} AR balances as of {data.asOfLabel || data.month}</p>
      {!(Number(data.totalExpenses) > 0) && !(data.expenseBreakdown || []).length && (
        <p style={{ color: 'var(--ember-muted)', fontWeight: 500, marginTop: 0 }}>The Bench expense report has not been uploaded for this month. It is usually added at the end of the month.</p>
      )}

      <div className="grid-4">
        <Kpi label="Net Income" value={fmt(totalIncome)} hint="RS net after refunds plus CW payments received this month." />
        <Kpi label="Total Expenses" value={fmt(data.totalExpenses)} hint="Company-wide expenses from Financials for this month." />
        <Kpi label="Refunds" value={fmt(data.totalRefunds)} hint="RS refunds from Daily Raw Data this month." />
        <Kpi label="Net Profit / Loss" value={fmt(net)} negative={net < 0} hint="Net income minus company-wide expenses." />
        <Kpi label="Active Chairs" value={data.activeChairs?.toLocaleString() ?? DASH} hint="Chairs at live locations this month." />
      </div>

      <div className="card" style={{ borderLeft: '3px solid var(--ember)' }}>
        <h3 style={{ marginTop: 0 }}>Needs attention</h3>
        <p className="muted" style={{ marginTop: -6 }}>Simple rules from A/R, refunds, and Daily uploads. Not a forecast.</p>
        {alerts.length === 0 && <p className="muted">Nothing flagged for this month.</p>}
        {alerts.map((item) => (
          <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--warm-white)' }}>
            <div style={{ fontWeight: 500 }}>{item.title}</div>
            <div className="muted" style={{ fontSize: 13 }}>{item.action}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {comparison.map((c) => {
          const isCw = c.model === 'Corporate Wellness';
          const chairs = isCw ? (c.chairs ?? 0) : (c.chairs || c.revenueGeneratingChairs || rsChairsFromTable || 0);
          const installs = c.installs ?? c.activeLocations ?? DASH;
          const rsGross = Number(c.cash ?? c.income) || 0;
          const rsRefunds = Number(c.refunds) || 0;
          const rsNet = Number(c.netIncome) || (rsGross - rsRefunds);
          return (
            <div className="card" key={c.model} style={{ marginBottom: 0 }}>
              <h3 style={{ marginTop: 0 }}>{c.model} Performance</h3>
              {isCw ? (
                <>
                  <Row label="Expected" value={fmt(c.income)} />
                  <Row label="Received" value={fmt(c.cash)} />
                  <Row label="Backpay" value={fmt(c.owed)} />
                  <Row label="# of Installs" value={installs} />
                  <Row label="# of Chairs" value={chairs || DASH} />
                  <Row label="Unsigned contracts" value={isCw ? unsigned.cw : unsigned.rs} last />
                </>
              ) : (
                <>
                  <Row label="Total Income" value={fmt(rsGross)} />
                  <Row label="Refunds" value={fmt(rsRefunds)} />
                  <Row label="Net Income" value={fmt(rsNet)} />
                  <Row label="LEMO Payout" value={fmt(rsNet * RS_LEMO)} />
                  <Row label="Venue Payout" value={fmt(rsNet * RS_VENUE)} />
                  <Row label="BD Consultant Payout" value={fmt(rsNet * RS_BD)} />
                  <Row label="# of Installs" value={installs} />
                  <Row label="# of Chairs" value={chairs || DASH} />
                  <Row label="Unsigned contracts" value={unsigned.rs} last />
                </>
              )}
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
              <CompareRow label="Net Income" current={cmp.current?.income} previous={cmp.previous?.income} />
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
        <p className="muted" style={{ marginTop: 0 }}>Revenue is RS net + CW payments received. The current month is month-to-date.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Line type="linear" dataKey="income" name="Revenue" stroke="#E85D20" strokeWidth={2.5} dot />
            <Line type="linear" dataKey="expenses" name="Expenses" stroke="#0C0A09" strokeWidth={2.5} dot />
            <Line type="linear" dataKey="net" name="Profit" stroke="#D9A441" strokeWidth={2.5} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Accounts Receivable</h3>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: -6 }}>
          Only accounts with an unpaid balance as of {data.asOfLabel || data.month}.
        </p>
        {outstanding.length > 0 ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Location</th><th>Chairs</th><th>Months owed</th><th>Amount owed</th></tr></thead>
            <tbody>
              {outstanding.map((c, i) => (
                <tr key={i}>
                  <td>{c.location}</td>
                  <td>{c.chairs ?? DASH}</td>
                  <td>{c.monthsOwed ?? c.monthsBillable}</td>
                  <td style={{ color: 'var(--ember-muted)' }}>{fmt(c.balanceOwed)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : <p className="muted">No accounts owe a balance as of {data.asOfLabel || data.month}.</p>}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Location performance {DASH} {data.month} only</h3>
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
            <th>Gross Income</th>
            <th>Refunds</th>
            <th title={NET_HINT}>Net Income <Hint text={NET_HINT} /></th>
          </tr></thead>
          <tbody>
            {filteredLocations.map((l, i) => {
              const isCw = l.model === 'Corporate Wellness';
              const expected = isCw && l.commercial !== false ? fmt(l.billableRevenue ?? l.lemoIncome) : DASH;
              const received = l.commercial === false ? DASH : fmt(l.received ?? 0);
              const netValue = l.netIncome != null ? l.netIncome : (Number(l.received) || 0) - (Number(l.refunds) || 0);
              const netInc = l.commercial === false ? DASH : fmt(netValue);
              return (
              <tr key={i}>
                <td>{l.location}</td>
                <td>{isCw ? 'CW' : l.model === 'Revenue Sharing' ? 'RS' : (l.model || DASH)}</td>
                <td>{l.chairs ?? DASH}</td>
                <td>{expected}</td>
                <td>{received}</td>
                <td>{l.commercial === false ? DASH : fmt(Number(l.refunds) || 0)}</td>
                <td title={NET_HINT}>{netInc}</td>
              </tr>
              );
            })}
            {filteredLocations.length === 0 && <tr><td colSpan={7} className="muted">No location activity for this month</td></tr>}
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
  let changeText = DASH; let color = 'var(--ash)';
  if (typeof current === 'number' && typeof previous === 'number' && previous !== 0) {
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const isUp = pct > 0;
    changeText = `${pct === 0 ? String.fromCharCode(8594) : isUp ? String.fromCharCode(8593) : String.fromCharCode(8595)} ${Math.abs(pct).toFixed(0)}%`;
    const isGood = lowerIsBetter ? !isUp : isUp;
    color = pct === 0 ? 'var(--ash)' : isGood ? '#16a34a' : 'var(--ember-muted)';
  }
  return <tr><td>{label}</td><td>{fmt(current)}</td><td>{fmt(previous)}</td><td style={{ color, fontWeight: 500 }}>{changeText}</td></tr>;
}
