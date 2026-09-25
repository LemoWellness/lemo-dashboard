import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { authedFetch } from '../lib/firebaseClient';

const money = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : (n ?? '-'));
const count = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString() : n || '0');

export default function AccountUsage({ venue }) {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  function load(nextMonth) {
    if (!venue) return;
    setLoading(true);
    const qs = nextMonth ? `&month=${encodeURIComponent(nextMonth)}` : '';
    authedFetch(`/api/account-usage?location=${encodeURIComponent(venue)}${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.month) setMonth(d.month);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(''); }, [venue]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Usage</h3>
        {data && data.availableMonths && data.availableMonths.length > 0 && (
          <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Month
            <select value={month} onChange={(e) => { setMonth(e.target.value); load(e.target.value); }}>
              {data.availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        )}
      </div>
      {loading && <p className="muted">Loading usage...</p>}
      {!loading && (!data || !data.hasData) && (
        <p className="muted">No Daily Raw Data matched this account name. Names must match the Daily import venue name.</p>
      )}
      {!loading && data && data.hasData && (
        <>
          <div className="grid-4">
            <MiniKpi label="Usage" value={count(data.totals.usage)} />
            <MiniKpi label="Refunds" value={money(data.totals.refunds)} />
            <MiniKpi label="RS Income" value={money(data.totals.rsIncome)} />
            <MiniKpi label="Avg # of Visitors" value={Math.round((data.totals.avgVisitors || 0) * 10) / 10} />
          </div>
          {data.trend.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 8 }}>Usage by month</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.trend}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#E85D20" name="Usage" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniKpi({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.25rem' }}>{value}</div>
    </div>
  );
}
