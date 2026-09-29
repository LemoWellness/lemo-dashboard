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
  const [view, setView] = useState('monthly');
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
    authedFetch(`/api/reporting${qs}&_=${Date.now()}`, { cache: 'no-store' })
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

  useEffect(() => { if (session) load('monthly'); }, [session]);

  function switchView(next) {
    setView(next);
    load(next, next === 'monthly' ? selectedMonth : selectedDate);
  }

  const outline = { background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' };

  return (
    <Layout active="reporting" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1>Reporting</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn" style={view === 'daily' ? undefined : outline} onClick={() => switchView('daily')}>Daily</button>
          <button type="button" className="btn" style={view === 'monthly' ? undefined : outline} onClick={() => switchView('monthly')}>Monthly</button>
        </div>
      </div>
      <p className="muted">
        Usage comes from Daily Raw Data (CW + RS). RS Gross, RS Refunds, and RS Net Income come from Daily Raw Data. Session mix comes from the Usage file uploaded in the Sessions table.
      </p>
      {loading && <p className="muted">Loading reporting data...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && (!data || !data.hasData) && (
        <p className="muted">No daily data uploaded yet. Import Daily Raw Data to populate Reporting.</p>
      )}
      {!loading && !error && data && data.hasData && view === 'daily' && (
        <DailyView data={data} selectedDate={selectedDate} isAdmin={session?.role === 'Admin'} onUploaded={() => load('daily', selectedDate)} onDate={(d) => { setSelectedDate(d); load('daily', d); }} />
      )}
      {!loading && !error && data && data.hasData && view === 'monthly' && (
        <MonthlyView data={data} selectedMonth={selectedMonth} isAdmin={session?.role === 'Admin'} onUploaded={() => load('monthly', selectedMonth)} onMonth={(m) => { setSelectedMonth(m); load('monthly', m); }} />
      )}
    </Layout>
  );
}

function DailyView({ data, selectedDate, onDate, isAdmin, onUploaded }) {
  const anyAlert = data.duplicates.length || data.missingVenues.length || data.sustainedOutages.length || data.flags.length;
  const gross = Number(data.totals.gross != null ? data.totals.gross : data.totals.totalAmount) || ((Number(data.totals.netIncome)||0) + (Number(data.totals.refunds)||0));
  const net = Number(data.totals.netIncome) || 0;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Showing {data.period}{data.previousPeriod ? ` compared against ${data.previousPeriod}` : ' no earlier day to compare against yet'}
        </p>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Select day
          <input id="reporting-day" name="reportingDay" type="date" value={selectedDate} min={data.availableDates[0]} max={data.availableDates[data.availableDates.length - 1]} onChange={(e) => onDate(e.target.value)} />
        </label>
      </div>
      {data.dataHealthIssues?.count > 0 && <HealthBanner issues={data.dataHealthIssues} />}
      <div className="grid-4">
        <Kpi label="Usage" value={count(data.totals.orders)} hint="Sessions started (orderNumber) from Daily Raw Data. Includes CW and RS." />
        <Kpi label="RS Gross Income" value={fmt(gross)} hint="RS Total Amount from Daily Raw Data before refunds. CW monthly fees are not included." />
        <Kpi label="RS Refunds" value={fmt(data.totals.refunds)} hint="Refund dollars from Daily Raw Data." />
        <Kpi label="RS Net Income" value={fmt(net)} hint="RS Gross Income minus RS Refunds. CW monthly fees are not included." />
      </div>
      <UsageChart data={data.trend} xKey="date" title="Usage (last 30 days)" />
      <IncomeChart data={data.trend} xKey="date" title="RS Net Income (last 30 days)" />
      {data.duplicates.length > 0 && (
        <AlertPanel title="Possible duplicate upload">
          {data.duplicates.map((x, i) => (
            <AlertRow key={i}><strong>{x.venue}</strong> - outlet "{x.outletName}" has {x.rowCount} rows for this same upload.</AlertRow>
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
      <SessionsTable rows={(data.sessionPack && data.sessionPack.rows) || data.sessionTable} pack={data.sessionPack} isAdmin={isAdmin} onUploaded={onUploaded} />
    </>
  );
}

function MonthlyView({ data, selectedMonth, onMonth, isAdmin, onUploaded }) {
  const gross = Number(data.totals.gross != null ? data.totals.gross : data.totals.totalAmount) || ((Number(data.totals.netIncome)||0) + (Number(data.totals.refunds)||0));
  const net = Number(data.totals.netIncome) || 0;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Calendar month {data.month} - {data.dayCount} day{data.dayCount === 1 ? '' : 's'} of Daily Raw Data.
        </p>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
          Select month
          <select id="reporting-month" name="reportingMonth" value={selectedMonth} onChange={(e) => onMonth(e.target.value)}>
            {data.availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      {data.dataHealthIssues?.count > 0 && <HealthBanner issues={data.dataHealthIssues} />}
      {data.story && (
        <div className="card" style={{ borderLeft: '3px solid var(--ember)' }}>
          <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>This month</div>
          <p style={{ margin: 0 }}>{data.story}</p>
        </div>
      )}
      <div className="grid-4">
        <Kpi label="Usage" value={count(data.totals.orders)} hint="Sessions started (orderNumber) from Daily Raw Data. Includes CW and RS." />
        <Kpi label="RS Gross Income" value={fmt(gross)} hint="RS Total Amount from Daily Raw Data before refunds. CW monthly fees are not included." />
        <Kpi label="RS Refunds" value={fmt(data.totals.refunds)} hint="Refund dollars from Daily Raw Data." />
        <Kpi label="RS Net Income" value={fmt(net)} hint="RS Gross Income minus RS Refunds. CW monthly fees are not included." />
      </div>
      <div className="grid-4">
        <Kpi label="CW Usage" value={count(data.split.corporateWellnessOrders)} hint="Sessions started at Corporate Wellness sites this month." />
        <Kpi label="RS Usage" value={count(data.split.revenueSharingOrders)} hint="Sessions started at Revenue Sharing sites this month." />
        <Kpi label="Days in month" value={count(data.dayCount)} hint="How many calendar days in this month have Daily Raw Data uploaded." />
      </div>
      <UsageChart data={data.trend} xKey="month" title="Usage trend" />
      <IncomeChart data={data.trend} xKey="month" title="RS Net Income trend" />
      <VenueTable rows={data.venueTable} title="Venue performance - selected month (ranked by Usage)" />
      <RsPayoutsTable rows={data.venueTable} />
      <SessionsTable rows={(data.sessionPack && data.sessionPack.rows) || data.sessionTable} pack={data.sessionPack} isAdmin={isAdmin} onUploaded={onUploaded} />
    </>
  );
}

function UsageChart({ data, xKey, title }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="corporateWellnessOrders" name="CW Usage" stroke="#E85D20" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="revenueSharingOrders" name="RS Usage" stroke="#1C1916" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function IncomeChart({ data, xKey, title }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Legend />
          <Line type="monotone" dataKey="revenueSharingIncome" name="RS Net Income" stroke="#D9A441" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const RS_LEMO = 0.7;
const RS_VENUE = 0.2;
const RS_BD = 0.1;

function isRsVenue(row) {
  return String(row.model || '').trim() === 'Revenue Sharing';
}

function VenueTable({ rows, title }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title || 'Venue performance (ranked by Usage)'}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Venue</th>
              <th title="Chairs on the Installations account.">Chairs</th>
              <th title="Chair sessions started (orderNumber) from Daily Raw Data.">Usage</th>
              <th title="Usage divided by chairs on the account. Blank if chair count is missing.">Avg / chair</th>
              <th title="Average visitors from Daily Raw Data.">Avg # of Visitors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => (
              <tr key={i}>
                <td>{v.venue}</td>
                <td>{v.chairs != null ? count(v.chairs) : '-'}</td>
                <td>{count(v.orders)}</td>
                <td>{v.avgPerChair != null ? Math.round(v.avgPerChair * 10) / 10 : '-'}</td>
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

function RsPayoutsTable({ rows }) {
  const rs = (rows || []).filter(isRsVenue);
  const money = (row) => {
    const gross = Number(row.gross != null ? row.gross : row.totalAmount) || ((Number(row.netIncome) || 0) + (Number(row.refunds) || 0));
    const refunds = Number(row.refunds) || 0;
    const net = Number(row.netIncome) || (gross - refunds);
    return { gross, refunds, net, lemo: net * RS_LEMO, venue: net * RS_VENUE, bd: net * RS_BD };
  };
  const tot = rs.reduce((s, row) => {
    const m = money(row);
    return {
      gross: s.gross + m.gross,
      refunds: s.refunds + m.refunds,
      net: s.net + m.net,
      lemo: s.lemo + m.lemo,
      venue: s.venue + m.venue,
      bd: s.bd + m.bd,
    };
  }, { gross: 0, refunds: 0, net: 0, lemo: 0, venue: 0, bd: 0 });
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>RS venue payouts</h3>
      <p className="muted" style={{ marginTop: -6 }}>70 / 20 / 10 of RS net after refunds. CW sites are not included.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Venue</th>
              <th title="RS Total Amount before refunds.">Gross</th>
              <th title="Refunds from Daily Raw Data.">Refunds</th>
              <th title="Gross minus refunds.">Net</th>
              <th title="70% of net.">LEMO</th>
              <th title="20% of net.">Venue payout</th>
              <th title="10% of net.">BD payout</th>
            </tr>
          </thead>
          <tbody>
            {rs.map((v, i) => {
              const m = money(v);
              return (
                <tr key={i}>
                  <td>{v.venue}</td>
                  <td>{fmt(m.gross)}</td>
                  <td>{fmt(m.refunds)}</td>
                  <td>{fmt(m.net)}</td>
                  <td>{fmt(m.lemo)}</td>
                  <td>{fmt(m.venue)}</td>
                  <td>{fmt(m.bd)}</td>
                </tr>
              );
            })}
            {rs.length > 0 && (
              <tr>
                <td><strong>TOTAL</strong></td>
                <td><strong>{fmt(tot.gross)}</strong></td>
                <td><strong>{fmt(tot.refunds)}</strong></td>
                <td><strong>{fmt(tot.net)}</strong></td>
                <td><strong>{fmt(tot.lemo)}</strong></td>
                <td><strong>{fmt(tot.venue)}</strong></td>
                <td><strong>{fmt(tot.bd)}</strong></td>
              </tr>
            )}
            {rs.length === 0 && <tr><td colSpan={7} className="muted">No Revenue Sharing venues for this month</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtPct(n) {
  if (n == null || n === '') return '-';
  const v = Number(n);
  if (isNaN(v)) return '-';
  const pct = v <= 1 && v >= 0 ? v * 100 : v;
  return `${Math.round(pct * 10) / 10}%`;
}

function SessionsTable({ rows, pack, isAdmin, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setMsg('');
    try {
      const body = new FormData();
      body.append('type', 'usageRawData');
      body.append('file', file);
      const res = await authedFetch('/api/import', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || 'Upload failed.');
      const s = data.sample || {};
      const mix = s.venue ? ` Read ${s.venue} ${s.periodMonth || ''} as ${s.firstGearRate}/${s.secondGearRate}/${s.thirdGearRate}.` : '';
      setMsg(`Saved ${data.written || 0} Usage rows.${mix}`);
      if (onUploaded) onUploaded();
    } catch (err) {
      setMsg(err.message || 'Upload failed.');
    }
    setBusy(false);
  }
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Sessions</h3>
        {isAdmin && (
          <label className="btn" style={{ margin: 0, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Uploading...' : 'Upload Usage file'}
            <input id="usage-file-upload" name="file" type="file" accept=".csv,.xlsx,.xls" onChange={onFile} disabled={busy} style={{ display: 'none' }} />
          </label>
        )}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Session mix for {pack && pack.requestedMonth ? pack.requestedMonth : 'the selected month'}. Use the Venue UserUsage file, not Outlet.
        {pack && pack.availableMonths && pack.availableMonths.length ? ` Stored months: ${pack.availableMonths.join(', ')}.` : ''}
      </p>
      {msg && <p className="muted">{msg}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Venue</th>
              <th>10 min</th>
              <th>15 min</th>
              <th>25 min</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((v, i) => (
              <tr key={i}>
                <td>{v.month || (pack && pack.requestedMonth) || '-'}</td>
                <td>{v.venue}</td>
                <td>{fmtPct(v.firstGearRate)}</td>
                <td>{fmtPct(v.secondGearRate)}</td>
                <td>{fmtPct(v.thirdGearRate)}</td>
              </tr>
            ))}
            {!(rows && rows.length) && (
              <tr><td colSpan={5} className="muted">
                No session mix for {pack && pack.requestedMonth ? pack.requestedMonth : 'this month'}.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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

function Kpi({ label, value, hint }) {
  return (
    <div className="card" style={{ marginBottom: 0 }} title={hint || ''}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        {label}{hint ? <Hint text={hint} /> : null}
      </div>
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
