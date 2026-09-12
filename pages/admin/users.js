import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../lib/firebaseClient';

const ALL_TABS = [{ code: 'mo', label: 'Monthly Overview' }, { code: 'loc', label: 'Installations' }, { code: 'usage', label: 'Usage' }, { code: 'daily', label: 'Daily' }, { code: 'tasks', label: 'Tasks' }, { code: 'financials', label: 'Financials' }];

export default function ManageUsers() {
  const router = useRouter();
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'Viewer', tabs: [] });
  const [error, setError] = useState('');

  function navigate(code) {
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
  }

  function load() {
    authedFetch('/api/users').then((r) => r.json()).then((d) => setUsers(d.users || []));
  }
  useEffect(() => { if (session) load(); }, [session]);

  async function createUser(e) {
    e.preventDefault();
    setError('');
    const res = await authedFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ email: '', name: '', password: '', role: 'Viewer', tabs: [] });
    load();
  }

  async function toggleActive(u) {
    await authedFetch(`/api/users/${u.uid}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) });
    load();
  }

  function toggleTab(code) {
    setForm((f) => ({
      ...f,
      tabs: f.tabs.includes(code) ? f.tabs.filter((t) => t !== code) : [...f.tabs, code],
    }));
  }

  return (
    <Layout active="admin-users" onNavigate={navigate}>
      <h1>Manage Users</h1>

      <form className="card" onSubmit={createUser}>
        <h3 style={{ marginTop: 0 }}>Add user</h3>
        <div className="inline-form">
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Temporary password<input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Viewer</option><option>Admin</option>
            </select>
          </label>
        </div>
        {form.role === 'Viewer' && (
          <div style={{ margin: '10px 0' }}>
            <span className="muted">Tabs: </span>
            {ALL_TABS.map((t) => (
              <label key={t.code} style={{ marginRight: 12 }}>
                <input type="checkbox" checked={form.tabs.includes(t.code)} onChange={() => toggleTab(t.code)} /> {t.label}
              </label>
            ))}
          </div>
        )}
        <button className="btn" type="submit">Create user</button>
        {error && <p className="form-error">{error}</p>}
      </form>

      <div className="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Tabs</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.tabs === 'all' ? 'all' : (u.tabs || []).join(', ')}</td>
              <td>{u.active === false ? 'Deactivated' : 'Active'}</td>
              <td><button className="btn" onClick={() => toggleActive(u)}>{u.active === false ? 'Reactivate' : 'Deactivate'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Layout>
  );
}
