import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';
import { STATUSES } from '../lib/riskMath';

export default function RiskList() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);

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
  }

  function load() {
    setLoading(true); setError('');
    authedFetch('/api/risk').then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load assessments.');
      setRows(d.assessments || []); setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session) load(); }, [session]);

  const isAdmin = session?.role === 'Admin';
  const visible = rows.filter((r) => {
    if (!showArchived && r.archived) return false;
    if (showArchived && !r.archived) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    return true;
  });

  async function createNew() {
    const res = await authedFetch('/api/risk', { method: 'POST', body: JSON.stringify({ name: 'Untitled assessment' }) });
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Could not create.'); return; }
    router.push(`/risk/${d.id}`);
  }
  async function duplicate(id) {
    const res = await authedFetch(`/api/risk/${id}`, { method: 'POST', body: JSON.stringify({ action: 'duplicate' }) });
    const d = await res.json();
    if (!res.ok) { setError(d.error); return; }
    router.push(`/risk/${d.id}`);
  }
  async function archive(id) {
    const res = await authedFetch(`/api/risk/${id}`, { method: 'POST', body: JSON.stringify({ action: 'archive' }) });
    if (!res.ok) { setError((await res.json()).error); return; }
    load();
  }

  return (
    <Layout active="risk" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Deployment Risk Management</h1>
        {isAdmin && <button className="btn" onClick={createNew}>+ New Assessment</button>}
      </div>
      <p className="muted">Pre-deployment planning only. These records are not live installations and do not affect actual ROI, income, or expenses.</p>
      <div className="inline-form">
        <label>Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Archived</label>
      </div>
      {loading && <p className="muted">Loading assessments…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && visible.length === 0 && <p className="muted">No assessments in this view.</p>}
      {!loading && visible.length > 0 && (
        <div className="table-wrap"><table>
          <thead><tr><th>Project</th><th>Model</th><th>Chairs</th><th>Inventory</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/risk/${r.id}`)}>
                <td>{r.name || '—'}</td><td>{r.businessModel || '—'}</td><td>{r.chairQty || '—'}</td><td>{r.inventorySource || '—'}</td><td>{r.status || '—'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {isAdmin && (<div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn" onClick={() => router.push(`/risk/${r.id}`)}>Edit</button>
                    <button type="button" className="btn" onClick={() => duplicate(r.id)}>Duplicate</button>
                    {!r.archived && <button type="button" className="btn" onClick={() => archive(r.id)}>Archive</button>}
                  </div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </Layout>
  );
}
