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
];

export default function ImportData() {
  const router = useRouter();
  const [type, setType] = useState('projects');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
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

  return (
    <Layout active="admin-import" onNavigate={navigate}>
      <h1>Import Data</h1>
      <p className="muted">
        Export the relevant tab from the old LEMO spreadsheet as CSV (File → Download → Comma Separated Values),
        then upload it here. Re-uploading the same file is safe for Project Details (it updates by installation name);
        for Expenses/Income/Communication Log/Daily Raw Data, re-uploading will add duplicate rows.
        For Daily Raw Data specifically, export the sheet exactly as-is — its column headers
        (Venue Name, Count Date, POS, etc.) must match the original POS export precisely.
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
    </Layout>
  );
}
