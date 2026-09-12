import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : '—');
const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10'];

export default function Monthly() {
  const router = useRouter();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelFilter, setModelFilter] = useState('All');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
  }

  function load(m) {
    setLoading(true);
    setError('');
    authedFetch(`/api/monthly?month=${m}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session) load(month); }, [session]); // eslint-disable-line

  function onMonthChange(e) {
    setMonth(e.target.value);
    load(e.target.value);
  }

  if (loading) return <Layout active="mo" onNavigate={navigate}><p className="muted">Loading monthly overview…</p></Layout>;
  if (error) return <Layout active="mo" onNavigate={navigate}><p className="form-error">{error}</p></Layout>;
  if (!data) return null;

  const filteredLocations = data.locationTable.filter((l) => modelFilter === 'All' || l.model === modelFilter);
  const donutData = [
    { name: 'Corporate Wellness', value: data.corporateWellnessIncome },
    { name: 'Revenue Sharing', value: data.revenueSharingIncome },
  ].filter((d) => d.value > 0);

  return (
    <Layout active="mo" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1>Monthly Overview</h1>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Month
          <input type="month" value={month} onChange={onMonthChange} />
        </label>
      </div>
      <p className="muted">{data.month}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <Kpi label="Total LEMO income" value={fmt(data.totalLemoIncome)} />
        <Kpi label="Corporate wellness income" value={fmt(data.corporateWellnessIncome)} />
        <Kpi label="Revenue sharing income" value={fmt(data.revenueSharingIncome)} />
        <Kpi label="Net profit / loss" value={fmt(data.netProfitLoss)} negative={data.netProfitLoss < 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {data.comparison.map((c) => {
          const perChair = data.revenuePerChair.find((r) => r.model === c.model);
          return (
            <div className="card" key={c.model} style={{ marginBottom: 0 }}>
              <h3 style={{ marginTop: 0 }}>{c.model}</h3>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Income</span><span>{fmt(c.income)}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Expenses</span><span>{fmt(c.expenses)}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Net</span><span>{fmt(c.netProfit)}</span></div>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Active locations</span><span>{c.activeLocations}</span></div>
              {perChair && perChair.chairs > 0 && (
                <div className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--warm-white)' }}>
                  {fmt(perChair.revenuePerChair)}/chair across {perChair.chairs} chairs
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Corporate Wellness vs Revenue Sharing</h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label={(e) => e.name}>
                  {donutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="muted">No income this month.</p>}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Top expense categories</h3>
          {data.expenseBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.expenseBreakdown} dataKey="total" nameKey="category" outerRadius={80} label={(e) => e.category}>
                  {data.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="muted">No expenses this month.</p>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>12-month income trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Line type="monotone" dataKey="corporateWellness" name="Corporate Wellness" stroke="#E85D20" dot={false} />
            <Line type="monotone" dataKey="revenueSharing" name="Revenue Sharing" stroke="#0C0A09" dot={false} />
            <Line type="monotone" dataKey="total" name="Total" stroke="#D9A441" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Corporate Wellness — Outstanding Payments</h3>
        {data.cwPaymentStatus.length > 0 ? (
          <table>
            <thead><tr><th>Location</th><th>Fee / mo</th><th>Months billable</th><th>Expected</th><th>Received</th><th>Balance owed</th></tr></thead>
            <tbody>
              {data.cwPaymentStatus.map((c, i) => (
                <tr key={i}><td>{c.location}</td><td>{fmt(c.monthlyFee)}</td><td>{c.monthsBillable}</td><td>{fmt(c.expectedTotal)}</td><td>{fmt(c.totalReceived)}</td><td style={{ color: 'var(--ember-muted)' }}>{fmt(c.balanceOwed)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">All Corporate Wellness accounts are current — nothing owed.</p>}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Location performance — selected month</h3>
          <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
            <option value="All">All models</option>
            <option value="Corporate Wellness">Corporate Wellness</option>
            <option value="Revenue Sharing">Revenue Sharing</option>
          </select>
        </div>
        <table>
          <thead><tr><th>Location</th><th>Model</th><th>Chairs</th><th>Gross revenue</th><th>LEMO income</th><th>Expenses</th><th>Net</th></tr></thead>
          <tbody>
            {filteredLocations.map((l, i) => (
              <tr key={i}>
                <td>{l.location}</td><td>{l.model}</td><td>{l.chairs ?? '—'}</td>
                <td>{l.grossRevenue != null ? fmt(l.grossRevenue) : '—'}</td>
                <td>{fmt(l.lemoIncome)}</td><td>{fmt(l.expenses)}</td><td>{fmt(l.netProfit)}</td>
              </tr>
            ))}
            {filteredLocations.length === 0 && <tr><td colSpan={7} className="muted">No location activity for this month</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function Kpi({ label, value, negative }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem', color: negative ? 'var(--ember-muted)' : 'var(--obsidian)' }}>{value}</div>
    </div>
  );
}
