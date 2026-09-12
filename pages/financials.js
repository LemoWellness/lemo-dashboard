import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { auth, authedFetch } from '../lib/firebaseClient';

const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : '—');
const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10', '#d9a441', '#6b4c14'];

export default function Financials() {
  const router = useRouter();
  const { session } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pnlFile, setPnlFile] = useState(null);
  const [topExpFiles, setTopExpFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
  }

  function load() {
    setLoading(true);
    authedFetch('/api/financials').then((r) => r.json()).then((d) => {
      setReports(d.reports || []);
      setLoading(false);
    });
  }
  useEffect(() => { if (session) load(); }, [session]);

  async function submitUpload(e) {
    e.preventDefault();
    setUploadError(''); setUploadResult(null);
    if (!pnlFile && topExpFiles.length === 0) { setUploadError('Upload at least one file (Profit & Loss or Top Expenses).'); return; }
    setUploading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const formData = new FormData();
      if (pnlFile) formData.append('pnl', pnlFile);
      topExpFiles.forEach((f) => formData.append('topExpenses', f));
      const res = await fetch('/api/financials/upload', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadResult(data);
      setPnlFile(null); setTopExpFiles([]);
      load();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteReport(id) {
    if (!window.confirm('Delete this report?')) return;
    await authedFetch(`/api/financials/${id}`, { method: 'DELETE' });
    load();
  }

  const latest = reports[0];
  const isAdmin = session?.role === 'Admin';

  return (
    <Layout active="financials" onNavigate={navigate}>
      <h1>Financials</h1>

      {isAdmin && (
        <form className="card" onSubmit={submitUpload}>
          <h3 style={{ marginTop: 0 }}>Upload a report</h3>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Upload a Profit &amp; Loss + Top Expenses pair covering the same period, or just one or more monthly
            Top Expenses exports (each becomes its own report, with revenue left blank since that export doesn't include it).
            Select multiple Top Expenses files at once to upload several months in one go.
          </p>
          {uploadError && <p className="form-error">{uploadError}</p>}
          {uploadResult && (
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {uploadResult.reportsCreated} report{uploadResult.reportsCreated === 1 ? '' : 's'} created:{' '}
              {uploadResult.reports.map((r) => r.label).join(', ')}
            </p>
          )}
          <div className="inline-form">
            <label>Profit and Loss (.xlsx, optional)<input type="file" accept=".xlsx" onChange={(e) => setPnlFile(e.target.files[0])} /></label>
            <label>Top Expenses (.xlsx, one or more)<input type="file" accept=".xlsx" multiple onChange={(e) => setTopExpFiles(Array.from(e.target.files))} /></label>
            <button className="btn" type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      )}

      {loading ? <p className="muted">Loading…</p> : !latest ? (
        <p className="muted">No financial reports uploaded yet.</p>
      ) : (
        <>
          <p className="muted">Most recent period: {latest.label || `${latest.periodStart} to ${latest.periodEnd}`}</p>
          <div className="grid-3">
            <Kpi label="Revenue" value={fmt(latest.revenue)} />
            <Kpi label="Expense" value={fmt(latest.expense)} />
            <Kpi label="Net Profit" value={fmt(latest.netProfit)} negative={latest.netProfit < 0} />
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Expense breakdown</h3>
              {latest.topExpenses?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={latest.topExpenses} dataKey="amount" nameKey="category" outerRadius={100}>
                      {latest.topExpenses.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="muted">No category breakdown for this report.</p>}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>By category</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
                  <tbody>
                    {(latest.topExpenses || []).map((e, i) => (
                      <tr key={i}><td>{e.category}</td><td>{fmt(e.amount)}</td><td>{e.percentOfTotal != null ? `${e.percentOfTotal}%` : '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Report history</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Period</th><th>Revenue</th><th>Expense</th><th>Net Profit</th><th>Uploaded</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.label || `${r.periodStart} to ${r.periodEnd}`}</td>
                      <td>{fmt(r.revenue)}</td><td>{fmt(r.expense)}</td><td>{fmt(r.netProfit)}</td>
                      <td className="muted">{r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : '—'}</td>
                      {isAdmin && <td><button className="task-delete-btn" onClick={() => deleteReport(r.id)}>Delete</button></td>}
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
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem', color: negative ? 'var(--ember-muted)' : 'var(--obsidian)' }}>{value}</div>
    </div>
  );
}
