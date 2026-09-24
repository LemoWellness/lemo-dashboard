import { useRouter } from 'next/router';
import { useState } from 'react';
import Layout from '../../components/Layout';
import { auth } from '../../lib/firebaseClient';

const TYPES = [
  { value: 'projects', label: 'Project Details (installations / company info)' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'communicationLog', label: 'Communication Log' },
  { value: 'dailyRawData', label: 'Daily Raw Data (POS export)' },
  { value: 'usageRawData', label: 'Usage Raw Data (weekly venue export)' },
];

export default function ImportData() {
  const router = useRouter();
  const [type, setType] = useState('projects');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [pnlFile, setPnlFile] = useState(null);
  const [topExpFiles, setTopExpFiles] = useState([]);
  const [finBusy, setFinBusy] = useState(false);
  const [finResult, setFinResult] = useState(null);
  const [finError, setFinError] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!file) { setError('Choose a CSV file first.'); return; }
    setBusy(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append('type', type);
      formData.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitFinancials(e) {
    e.preventDefault();
    setFinError(''); setFinResult(null);
    if (!pnlFile && topExpFiles.length === 0) { setFinError('Upload at least one file (Profit & Loss or Top Expenses).'); return; }
    setFinBusy(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const formData = new FormData();
      if (pnlFile) formData.append('pnl', pnlFile);
      topExpFiles.forEach((f) => formData.append('topExpenses', f));
      const res = await fetch('/api/financials/upload', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFinResult(data);
      setPnlFile(null); setTopExpFiles([]);
    } catch (err) {
      setFinError(err.message);
    } finally {
      setFinBusy(false);
    }
  }

  return (
    <Layout active="admin-import" onNavigate={navigate}>
      <h1>Import Data</h1>
      <p className="muted">
        Export as CSV, then upload here. Re-uploading the same Usage, Daily, Project, Expense, Income, or Communication Log rows now overwrites the existing record instead of creating a duplicate. For Daily Raw Data, keep the original POS headers (Venue Name, Count Date, POS, etc.).
      </p>
      <form className="card inline-form" onSubmit={submit}>
        <label>
          Data type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label>
          CSV file
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        </label>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Importing…' : 'Import'}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {result && (
        <p className="muted">
          Imported {result.written} row(s) out of {result.totalRows} ({result.skipped} skipped — missing name/location).
        </p>
      )}

      <form className="card" onSubmit={submitFinancials}>
        <h3 style={{ marginTop: 0 }}>Financials (Profit & Loss / Top Expenses)</h3>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Different file shape than the CSVs above (.xlsx exports straight from the accounting software), so it lives
          here as its own upload rather than the Data Type dropdown. Upload a P&L + Top Expenses pair for the
          same period, or just one or more monthly Top Expenses files (each becomes its own month — select multiple
          at once for a batch upload). Uploading a file for a period that already exists fills it in rather than
          duplicating it.
        </p>
        {finError && <p className="form-error">{finError}</p>}
        {finResult && (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            {finResult.reportsCreated} report{finResult.reportsCreated === 1 ? '' : 's'} processed:{' '}
            {finResult.reports.map((r) => `${r.label}${r.merged ? ' (updated)' : ' (new)'}`).join(', ')}
          </p>
        )}
        <div className="inline-form">
          <label>Profit and Loss (.xlsx, optional)<input type="file" accept=".xlsx" onChange={(e) => setPnlFile(e.target.files[0])} /></label>
          <label>Top Expenses (.xlsx, one or more)<input type="file" accept=".xlsx" multiple onChange={(e) => setTopExpFiles(Array.from(e.target.files))} /></label>
          <button className="btn" type="submit" disabled={finBusy}>{finBusy ? 'Uploading…' : 'Upload'}</button>
        </div>
      </form>
    </Layout>
  );
}
