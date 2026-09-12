import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const [tab, setTab] = useState('loc');
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    setTab(code);
  }

  useEffect(() => {
    if (!session) return;
    authedFetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setLoading(false);
      });
  }, [session]);

  useEffect(() => {
    if (!selected) return;
    authedFetch(`/api/expenses?location=${encodeURIComponent(selected.name)}`).then((r) => r.json()).then((d) => setExpenses(d.expenses || []));
    authedFetch(`/api/income?location=${encodeURIComponent(selected.name)}`).then((r) => r.json()).then((d) => setIncome(d.income || []));
    authedFetch(`/api/communication-log?location=${encodeURIComponent(selected.name)}`).then((r) => r.json()).then((d) => setNotes(d.notes || []));
  }, [selected]);

  return (
    <Layout active={tab} onNavigate={navigate}>
      <h1>Installations</h1>
      {loading && <p className="muted">Loading…</p>}
      {!loading && projects.length === 0 && (
        <p className="muted">
          No installations yet. An admin can bring in the old Project Details sheet from{' '}
          <a href="/admin/import">Import Data</a>.
        </p>
      )}

      {!selected ? (
        <table>
          <thead>
            <tr><th>Name</th><th>Business Model</th><th>State</th><th>Monthly Fee</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                <td>{p.name}</td>
                <td>{p.businessModel}</td>
                <td>{p.state}</td>
                <td>{p.monthlyFee != null ? `$${p.monthlyFee}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>
          <button className="btn" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>← Back to all installations</button>
          <h2>{selected.name}</h2>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Details</h3>
            <p className="muted">
              {selected.streetAddress}, {selected.city}, {selected.state} {selected.zipCode}<br />
              Business model: {selected.businessModel} · Chairs: {selected.numberOfChairs ?? '—'} · Go-live: {selected.goLiveDate || '—'}<br />
              BD Consultant: {selected.bdConsultantName} ({selected.bdConsultantEmail})
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Expenses</h3>
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Item</th><th>Amount</th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.item}</td><td>${e.amount?.toFixed?.(2) ?? e.amount}</td></tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={4} className="muted">No expenses recorded.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Income</h3>
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Notes</th></tr></thead>
              <tbody>
                {income.map((i) => (
                  <tr key={i.id}><td>{i.date}</td><td>${i.amount}</td><td>{i.notes}</td></tr>
                ))}
                {income.length === 0 && <tr><td colSpan={3} className="muted">No income recorded.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Communication Log</h3>
            {notes.map((n) => (
              <p key={n.id}><strong>{n.date}</strong> ({n.channel}) — {n.note} <span className="muted">— {n.loggedBy}</span></p>
            ))}
            {notes.length === 0 && <p className="muted">No notes logged yet.</p>}
          </div>
        </div>
      )}
    </Layout>
  );
}
