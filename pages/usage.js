import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const count = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString() : n || '0');
const pct = (n) => (typeof n === 'number' ? `${(n * 100).toFixed(1)}%` : '—');

export default function Usage() {
  const router = useRouter();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'mo') return router.push('/monthly');
  }

  function load(week) {
    setLoading(true);
    setError('');
    authedFetch(`/api/usage${week ? `?week=${encodeURIComponent(week)}` : ''}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session) load(); }, [session]);

  if (loading) return <Layout active="usage" onNavigate={navigate}><p className="muted">Loading usage data…</p></Layout>;
  if (error) return <Layout active="usage" onNavigate={navigate}><p className="form-error">{error}</p></Layout>;
  if (!data || !data.hasData) {
    return (
      <Layout active="usage" onNavigate={navigate}>
        <h1>Usage</h1>
        <p className="muted">No usage data uploaded yet. Bring it in from Import Data → Usage Raw Data.</p>
      </Layout>
    );
  }

  return (
    <Layout active="usage" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1>Usage</h1>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Month
          <select value={data.week || ''} onChange={(e) => load(e.target.value)}>
            {data.availableWeeks.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>

      <div className="grid-4">
        <Kpi label="Orders (sessions)" value={count(data.selectedOrders)} />
        <Kpi label="Seating count" value={count(data.selectedSeating)} />
        <Kpi label="Idle count" value={count(data.selectedIdle)} />
        <Kpi label="Occupied count" value={count(data.selectedOccupied)} />
      </div>

      <div className="grid-2">
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>Scanned count (selected month)</h3>
          <div style={{ fontFamily: "'Lora', serif", fontSize: '1.6rem' }}>{count(data.selectedScanned)}</div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>All-time totals since tracking began</h3>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Orders</span><span>{count(data.allTimeOrders)}</span></div>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Seating</span><span>{count(data.allTimeSeating)}</span></div>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Idle</span><span>{count(data.allTimeIdle)}</span></div>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>Occupied</span><span>{count(data.allTimeOccupied)}</span></div>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Scanned</span><span>{count(data.allTimeScanned)}</span></div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Company-wide usage trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.companyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={pct} label={{ value: 'H5 conversion', angle: 90, position: 'insideRight', fontSize: 11 }} />
            <Tooltip formatter={(v, name) => (name === 'h5ConversionRate' ? pct(v) : v)} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="totalOrders" name="Total orders" stroke="#E85D20" strokeWidth={2.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="h5ConversionRate" name="H5 conversion rate" stroke="#D9A441" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Venue activity — selected month (ranked by orders)</h3>
        <div className="table-wrap">
        <table>
          <thead><tr><th>Venue</th><th>Orders</th><th>Seating</th><th>Idle</th><th>Occupied</th><th>Scanned</th></tr></thead>
          <tbody>
            {data.venues.map((v, i) => (
              <tr key={i}><td>{v.venue}</td><td>{count(v.orders)}</td><td>{count(v.seating)}</td><td>{count(v.idle)}</td><td>{count(v.occupied)}</td><td>{count(v.scanned)}</td></tr>
            ))}
            {data.venues.length === 0 && <tr><td colSpan={6} className="muted">No venue activity for this period</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </Layout>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem' }}>{value}</div>
    </div>
  );
}
