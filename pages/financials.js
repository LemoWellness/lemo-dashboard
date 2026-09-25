import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const dash = String.fromCharCode(0x2014);
const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : dash);
const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10', '#d9a441', '#6b4c14'];

export default function Financials() {
  const router = useRouter();
  const { session } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'reporting') return router.push('/reporting');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'risk') return router.push('/risk');
  }

  function load() {
    setLoading(true);
    authedFetch('/api/financials').then((r) => r.json()).then((d) => {
      const list = d.reports || [];
      setReports(list);
      setSelectedId((prev) => prev && list.some((r) => r.id === prev) ? prev : (list[0]?.id ?? null));
      setLoading(false);
    });
  }
  useEffect(() => { if (session) load(); }, [session]);

  async function deleteReport(id) {
    if (String(id).startsWith('live-')) return;
    if (!window.confirm('Delete this report?')) return;
    await authedFetch(`/api/financials/${id}`, { method: 'DELETE' });
    load();
  }

  const selected = useMemo(() => reports.find((r) => r.id === selectedId) || null, [reports, selectedId]);
  const isAdmin = session?.role === 'Admin';

  return (
    <Layout active="financials" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Financials</h1>
        {reports.length > 0 && (
          <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Period
            <select value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
              {reports.map((r) => <option key={r.id} value={r.id}>{r.label || `${r.periodStart} to ${r.periodEnd}`}</option>)}
            </select>
          </label>
        )}
      </div>

      {isAdmin && (
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Live books update when CW or RS income and expenses are saved. Uploaded Profit &amp; Loss reports still come from <a href="/admin/import">Import Data</a>.
        </p>
      )}

      {loading ? <p className="muted">Loading...</p> : !selected ? (
        <p className="muted">No live books or uploaded financial reports yet.</p>
      ) : (
        <>
          <div className="grid-3">
            <Kpi label="Revenue" value={fmt(selected.revenue)} />
            <Kpi label="Expense" value={fmt(selected.expense)} />
            <Kpi label="Net Profit" value={fmt(selected.netProfit)} negative={selected.netProfit < 0} />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Expense breakdown</h3>
            {selected.topExpenses?.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(220, selected.topExpenses.length * 34 + 20)}>
                <BarChart data={selected.topExpenses} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--iron)" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="amount" barSize={18}>
                    {selected.topExpenses.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="muted">No category breakdown for this period.</p>}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>By category</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
                <tbody>
                  {(selected.topExpenses || []).map((e, i) => (
                    <tr key={i}><td>{e.category}</td><td>{fmt(e.amount)}</td><td>{e.percentOfTotal != null ? `${e.percentOfTotal}%` : dash}</td></tr>
                  ))}
                  {(!selected.topExpenses || selected.topExpenses.length === 0) && <tr><td colSpan={3} className="muted">No categories for this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Report history</h3>
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: -8 }}>Live books come from recorded income and expenses. Click a row to view that period.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Period</th><th>Revenue</th><th>Expense</th><th>Net Profit</th><th>Source</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>
                  {reports.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{ cursor: 'pointer', background: r.id === selectedId ? 'var(--warm-white)' : undefined }}
                    >
                      <td>{r.label || `${r.periodStart} to ${r.periodEnd}`}</td>
                      <td>{fmt(r.revenue)}</td><td>{fmt(r.expense)}</td><td>{fmt(r.netProfit)}</td>
                      <td className="muted">{r.source === 'live' ? 'Live books' : (r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : 'Upload')}</td>
                      {isAdmin && <td>{r.source !== 'live' && <button className="task-delete-btn" onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}>Delete</button>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function Kpi({ label, value, negative }) {
  return (
    <div className="card kpi-card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem', color: negative ? 'var(--ember-muted)' : 'var(--obsidian)' }}>{value}</div>
    </div>
  );
}
