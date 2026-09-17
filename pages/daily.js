import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : n);
const count = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString() : n || '0');

export default function Daily() {
  const router = useRouter();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
  }

  function load(dateKey) {
    setLoading(true);
    setError('');
    authedFetch(`/api/daily${dateKey ? `?date=${dateKey}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.period) setSelectedDate(d.period);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { if (session) load(); }, [session]);

  if (loading) return <Layout active="daily" onNavigate={navigate}><p className="muted">Loading daily data…</p></Layout>;
  if (error) return <Layout active="daily" onNavigate={navigate}><p className="form-error">{error}</p></Layout>;
  if (!data || !data.hasData) {
    return (
      <Layout active="daily" onNavigate={navigate}>
        <h1>Daily</h1>
        {data?.dataHealthIssues?.count > 0 && <HealthBanner issues={data.dataHealthIssues} />}
        <p className="muted">No daily data uploaded yet. Bring it in from Import Data → Daily Raw Data.</p>
      </Layout>
    );
  }

  const anyAlert = data.duplicates.length || data.missingVenues.length || data.sustainedOutages.length || data.flags.length;

  return (
    <Layout active="daily" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1>Daily</h1>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Select day
          <input
            type="date"
            value={selectedDate}
            min={data.availableDates[0]}
            max={data.availableDates[data.availableDates.length - 1]}
            onChange={(e) => load(e.target.value)}
          />
        </label>
      </div>
      <p className="muted">
        Showing: {data.period}{data.previousPeriod ? ` · compared against ${data.previousPeriod}` : ' · no earlier day to compare against yet'}
      </p>

      {data.dataHealthIssues?.count > 0 && <HealthBanner issues={data.dataHealthIssues} />}

      <div className="grid-4">
        <Kpi label="Orders" value={count(data.totals.orders)} />
        <Kpi label="Income (Revenue Sharing)" value={fmt(data.totals.netIncome)} />
        <Kpi label="Refunds" value={fmt(data.totals.refunds)} />
        <Kpi label="Completed orders" value={count(data.totals.completed)} />
      </div>
      <p className="muted" style={{ fontStyle: 'italic', marginTop: -12 }}>
        Income shown here covers Revenue Sharing only, sourced from POS. Corporate Wellness income is a flat monthly fee tracked in Income, not shown here.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Orders &amp; Revenue Sharing income (last 30 days)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'RS Income ($)', angle: 90, position: 'insideRight', fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="corporateWellnessOrders" name="Corporate Wellness orders" stroke="#E85D20" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="revenueSharingOrders" name="Revenue Sharing orders" stroke="#1C1916" strokeWidth={2.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenueSharingIncome" name="Revenue Sharing income" stroke="#D9A441" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.duplicates.length > 0 && (
        <AlertPanel title="Possible duplicate upload">
          {data.duplicates.map((x, i) => (
            <AlertRow key={i}><strong>{x.venue}</strong> — outlet "{x.outletName}" has {x.rowCount} rows for this same upload, double check it wasn't pasted in twice.</AlertRow>
          ))}
        </AlertPanel>
      )}
      {data.missingVenues.length > 0 && (
        <AlertPanel title="Went quiet since last upload">
          {data.missingVenues.map((v, i) => <AlertRow key={i}><strong>{v}</strong> reported last upload but has no data this time.</AlertRow>)}
        </AlertPanel>
      )}
      {data.sustainedOutages.length > 0 && (
        <AlertPanel title="Ongoing outage">
          {data.sustainedOutages.map((o, i) => (
            <AlertRow key={i}><strong>{o.venue}</strong> normally averages {o.priorAvg} orders, at zero for {o.streak} uploads in a row now. Worth checking on directly.</AlertRow>
          ))}
        </AlertPanel>
      )}
      {data.flags.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Worth a look</h3>
          {data.flags.map((f, i) => {
            const isDrop = f.type === 'drop';
            return (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--warm-white)' }}>
                <div style={{ color: isDrop ? 'var(--ember-muted)' : '#16a34a', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', whiteSpace: 'nowrap', paddingTop: 2 }}>
                  {isDrop ? 'Check on this account' : 'Nice jump'}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{f.venue}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{f.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data.newVenues.length > 0 && (
        <AlertPanel title="New venues">
          {data.newVenues.map((v, i) => <AlertRow key={i}><strong>{v}</strong> showed up for the first time.</AlertRow>)}
        </AlertPanel>
      )}
      {!anyAlert && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>All clear</h3>
          <p className="muted">Nothing unusual to flag for this upload.</p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Venue activity — selected day (ranked by orders)</h3>
        <div className="table-wrap">
        <table>
          <thead><tr><th>Venue</th><th>Orders</th><th>Net income</th><th>Refunds</th><th>Completed</th><th>Avg order price</th><th>Avg visitors</th></tr></thead>
          <tbody>
            {data.venueTable.map((v, i) => (
              <tr key={i}>
                <td>{v.venue}</td><td>{count(v.orders)}</td><td>{fmt(v.netIncome)}</td><td>{fmt(v.refunds)}</td>
                <td>{count(v.completed)}</td><td>{fmt(v.avgOrderPrice)}</td><td>{Math.round(v.avgVisitors * 10) / 10}</td>
              </tr>
            ))}
            {data.venueTable.length === 0 && <tr><td colSpan={7} className="muted">No venue activity for this day</td></tr>}
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
function AlertPanel({ title, children }) {
  return <div className="card"><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>;
}
function AlertRow({ children }) {
  return <div style={{ padding: '8px 0', borderBottom: '1px solid var(--warm-white)', fontSize: 13 }}>{children}</div>;
}
function HealthBanner({ issues }) {
  const examples = (issues.examples || []).map((e) => `${e.venue} (value: "${e.rawValue}")`).join('; ');
  return (
    <div style={{ background: '#fdf3e0', border: '1px solid #d9a441', color: '#6b4c14', borderRadius: 3, padding: '14px 18px', marginBottom: 18, fontSize: 13, lineHeight: 1.6 }}>
      <strong>Some rows are being skipped.</strong> {issues.count} row{issues.count === 1 ? '' : 's'} in Daily Raw Data{' '}
      {issues.count === 1 ? "doesn't" : "don't"} have a usable date and {issues.count === 1 ? "isn't" : "aren't"} being counted anywhere on this tab.
      Likely a date pasted in as text instead of a real date. Examples: {examples}
    </div>
  );
}
