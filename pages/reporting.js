import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : n);
const count = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString() : n || '0');

export default function Reporting() {
  const router = useRouter();
  const { session } = useAuth();
  const [view, setView] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
    if (code === 'reporting') return router.push('/reporting');
  }

  function load(nextView, key) {
    const v = nextView || view;
    setLoading(true);
    setError('');
    const qs = v === 'monthly'
      ? `?view=monthly${key ? `&month=${encodeURIComponent(key)}` : ''}`
      : `?view=daily${key ? `&date=${encodeURIComponent(key)}` : ''}`;
    authedFetch(`/api/reporting${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        if (d.period) setSelectedDate(d.period);
        if (d.month) setSelectedMonth(d.month);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { if (session) load('daily'); }, [session]);

  function switchView(next) {
    setView(next);
    load(next, next === 'monthly' ? selectedMonth : selectedDate);
  }

  return (
    <Layout active="reporting" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1>Reporting</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className={view === 'daily' ? 'btn' : 'signout'} onClick={() => switchView('daily')}>Daily</button>
          <button type="button" className={view === 'monthly' ? 'btn' : 'signout'} onClick={() => switchView('monthly')}>Monthly</button>
        </div>
      </div>
      <p className="muted">
        Built from Daily Raw Data only. Usage is chair sessions started (orderNumber). Income is Revenue Sharing POS only.
      </p>
      {loading && <p className="muted">Loading reporting data…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && (!data || !data.hasData) && (
        <p className="muted">No daily data uploaded yet. Import Daily Raw Data to populate Reporting.</p>
      )}
      {!loading && !error && data && data.hasData && view === 'daily' && (
        <DailyView data={data} selectedDate={selectedDate} onDate={(d) => { setSelectedDate(d); load('daily', d); }} />
      )}
      {!loading && !error && data && data.hasData && view === 'monthly' && (
        <MonthlyView data={data} selectedMonth={selectedMonth} onMonth={(m) => { setSelectedMonth(m); load('monthly', m); }} />
      )}
    </Layout>
  );
}

function DailyView({ data, selectedDate, onDate }) {
  const anyAlert = data.duplicates.length || data.missingVenues.length || data.sustainedOutages.length || data.flags.length;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Showing {data.period}{data.previousPeriod ? ` · compared against ${data.previousPeriod}` : ' · no earlier day to compare against yet'}
        </p>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Select day
          <input
            type="date"
            value={selectedDate}
            min={data.availableDates[0]}
            max={data.availableDates[data.availableDates.length - 1]}
            onChange={(e) => onDate(e.target.value)}
          />
        </label>
      </div>
      {data.dataHealthIssues?.count > 0 && <HealthBanner issues={data.dataHealthIssues} />}
      <div className="grid-4">
        <Kpi label="Usage" value={count(data.totals.orders)} />
        <Kpi label="Refunds" value={fmt(data.totals.refunds)} />
        <Kpi label="RS Income" value={fmt(data.totals.netIncome)} />
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Usage and RS income (last 30 days)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="corporateWellnessOrders" name="CW Usage" stroke="#E85D20" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="revenueSharingOrders" name="RS Usage" stroke="#1C1916" strokeWidth={2.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenueSharingIncome" name="RS Income" stroke="#D9A441" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {data.duplicates.length > 0 && (
        <AlertPanel title="Possible duplicate upload">
          {data.duplicates.map((x, i) => (
            <AlertRow key={i}><strong>{x.venue}</strong> — outlet "{x.outletName}" has {x.rowCount} rows for this same upload.</AlertRow>
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
            <AlertRow key={i}><strong>{o.venue}</strong> normally averages {o.priorAvg} uses, at zero for {o.streak} uploads in a row.</AlertRow>
          ))}
        </AlertPanel>
      )}
      {data.flags.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Worth a look</h3>
          {data.flags.map((f, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--warm-white)' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{f.venue}</div>
              <div className="muted" style={{ fontSize: 12 }}>{f.message}</div>
            </div>
          ))}
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
          <p className="muted">Nothing unusual to flag for this day.</p>
        </div>
      )}
      <VenueTable rows={data.venueTable} />
    </>
  );
}

function MonthlyView({ data, selectedMonth, onMonth }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Calendar month {data.month} · {data.dayCount} day{data.dayCount === 1 ? '' : 's'} of Daily Raw Data.
        </p>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Select month
          <select value={selectedMonth} onChange={(e) => onMonth(e.target.value)}>
            {data.availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      {data.dataHealthIssues?.count > 0 && <HealthBanner issues={data.dataHealthIssues} />}
      <div className="grid-4">
        <Kpi label="Usage" value={count(data.totals.orders)} />
        <Kpi label="Refunds" value={fmt(data.totals.refunds)} />
        <Kpi label="RS Income" value={fmt(data.totals.netIncome)} />
      </div>
      <div className="grid-4">
        <Kpi label="CW Usage" value={count(data.split.corporateWellnessOrders)} />
        <Kpi label="RS Usage" value={count(data.split.revenueSharingOrders)} />
        <Kpi label="Days in month" value={count(data.dayCount)} />
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Monthly trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="corporateWellnessOrders" name="CW Usage" stroke="#E85D20" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="revenueSharingOrders" name="RS Usage" stroke="#1C1916" strokeWidth={2.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenueSharingIncome" name="RS Income" stroke="#D9A441" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <VenueTable rows={data.venueTable} title="Venue totals — selected month (ranked by Usage)" />
    </>
  );
}

function VenueTable({ rows, title }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title || 'Venue activity (ranked by Usage)'}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Venue</th>
              <th>Usage</th>
              <th>Refunds</th>
              <th>RS Income</th>
              <th>Avg # of Visitors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => (
              <tr key={i}>
                <td>{v.venue}</td>
                <td>{count(v.orders)}</td>
                <td>{fmt(v.refunds)}</td>
                <td>{fmt(v.netIncome)}</td>
                <td>{Math.round(v.avgVisitors * 10) / 10}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="muted">No venue activity for this period</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
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
      {issues.count === 1 ? 'does not' : 'do not'} have a usable date.
      Examples: {examples}
    </div>
  );
}
