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
  const [noteRow, setNoteRow] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState('');

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
    const row = reports.find((r) => r.id === id);
    const uploadIds = row?.uploadIds || [];
    if (!uploadIds.length) return;
    if (!window.confirm('Delete this report?')) return;
    await Promise.all(uploadIds.map((uid) => authedFetch(`/api/financials/${uid}`, { method: 'DELETE' })));
    load();
  }

  function openNote(row) {
    setNoteRow(row);
    setNoteDraft(row.note || '');
    setNoteError('');
  }

  async function saveNote(e) {
    e.preventDefault();
    if (!selected || !noteRow) return;
    const res = await authedFetch('/api/financials/notes', {
      method: 'PUT',
      body: JSON.stringify({ periodStart: selected.periodStart, category: noteRow.category, note: noteDraft }),
    });
    if (!res.ok) { setNoteError((await res.json()).error || 'Could not save note.'); return; }
    setNoteRow(null);
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
          Upload Profit &amp; Loss / Top Expenses reports from <a href="/admin/import">Import Data</a>.
        </p>
      )}

      {loading ? <p className="muted">Loading...</p> : !selected ? (
        <p className="muted">No financial reports uploaded yet. An admin can bring one in from Import Data.</p>
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
                <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th><th></th></tr></thead>
                <tbody>
                  {(selected.topExpenses || []).map((e, i) => (
                    <tr key={i}>
                      <td>{e.category}</td>
                      <td>{fmt(e.amount)}</td>
                      <td>{e.percentOfTotal != null ? `${e.percentOfTotal}%` : dash}</td>
                      <td>
                        <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => openNote(e)}>
                          {e.note ? 'Note' : 'Add note'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!selected.topExpenses || selected.topExpenses.length === 0) && <tr><td colSpan={4} className="muted">No categories for this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Report history</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Period</th><th>Revenue</th><th>Expense</th><th>Net Profit</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>
                  {reports.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{ cursor: 'pointer', background: r.id === selectedId ? 'var(--warm-white)' : undefined }}
                    >
                      <td>{r.label || `${r.periodStart} to ${r.periodEnd}`}</td>
                      <td>{fmt(r.revenue)}</td><td>{fmt(r.expense)}</td><td>{fmt(r.netProfit)}</td>
                      {isAdmin && <td>{r.uploadIds?.length > 0 && <button className="task-delete-btn" onClick={(ev) => { ev.stopPropagation(); deleteReport(r.id); }}>Delete</button>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {noteRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <form className="card" onSubmit={saveNote} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 420, margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>{noteRow.category}</h3>
            {noteError && <p className="form-error">{noteError}</p>}
            {isAdmin ? (
              <label className="stack-field">Note
                <textarea className="stack-input" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={5} />
              </label>
            ) : (
              <p style={{ whiteSpace: 'pre-wrap' }}>{noteRow.note || 'No note yet.'}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setNoteRow(null)}>Close</button>
              {isAdmin && <button type="submit" className="btn">Save note</button>}
            </div>
          </form>
        </div>
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
