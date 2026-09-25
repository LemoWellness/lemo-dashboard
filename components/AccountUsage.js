import { useEffect, useState } from 'react';
import { authedFetch } from '../lib/firebaseClient';

const money = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : (n ?? '-'));
const count = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString() : n || '0');

export default function AccountUsage({ venue }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    authedFetch(`/api/account-usage?location=${encodeURIComponent(venue)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [venue]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0, marginBottom: 14 }}>Usage activity (all-time)</h3>
      {loading && <p className="muted">Loading usage...</p>}
      {!loading && (!data || !data.hasData) && (
        <p className="muted">No Daily Raw Data matched this account name. Names must match the Daily import venue name.</p>
      )}
      {!loading && data && data.hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          <StatBox label="Usage (sessions)" value={count(data.totals.usage)} accent />
          <StatBox label="Refunds" value={money(data.totals.refunds)} />
          <StatBox label="RS Income" value={money(data.totals.rsIncome)} />
          <StatBox label="Avg # of Visitors" value={Math.round((data.totals.avgVisitors || 0) * 10) / 10} />
        </div>
      )}
      <style jsx>{`
        @media (max-width: 800px) {
          div :global(.usage-stat-grid) { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <div style={{
      border: '1px solid var(--iron)',
      borderLeft: accent ? '3px solid var(--ember)' : '1px solid var(--iron)',
      background: '#fff',
      padding: '12px 14px',
      minWidth: 0,
    }}>
      <div className="muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.45rem' }}>{value}</div>
    </div>
  );
}
