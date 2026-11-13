import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../lib/firebaseClient';

const ALL_TABS = [{ code: 'mo', label: 'Monthly Overview' }, { code: 'loc', label: 'Installations' }, { code: 'reporting', label: 'Reporting' }, { code: 'tasks', label: 'Tasks' }, { code: 'timeoff', label: 'Time Off' }, { code: 'financials', label: 'Financials' }, { code: 'risk', label: 'Deployment Risk' }, { code: 'opportunities', label: 'Venue Directory' }];

function fmtWhen(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ManageUsers() {
  const router = useRouter();
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'Viewer', tabs: [], timeOffAdmin: false, taskAdmin: false });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  function navigate(code) {
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'timeoff') return router.push('/timeoff');
    if (code === 'daily' || code === 'usage' || code === 'reporting') return router.push('/reporting');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
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
    setForm({ email: '', name: '', password: '', role: 'Viewer', tabs: [], timeOffAdmin: false, taskAdmin: false });
    load();
  }

  async function toggleActive(u) {
    await authedFetch(`/api/users/${u.uid}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) });
    load();
  }

  function toggleTab(code, setter) {
    setter((f) => ({
      ...f,
      tabs: f.tabs.includes(code) ? f.tabs.filter((t) => t !== code) : [...f.tabs, code],
    }));
  }

  function startEdit(u) {
    setEditError('');
    setEditing({
      uid: u.uid,
      name: u.name || '',
      email: u.email || '',
      role: u.role === 'Admin' ? 'Admin' : 'Viewer',
      tabs: u.tabs === 'all' ? ALL_TABS.map((t) => t.code) : [...(u.tabs || [])],
      newPassword: '',
      timeOffAdmin: !!u.timeOffAdmin,
      taskAdmin: !!u.taskAdmin,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setEditError('');
    setEditBusy(true);
    try {
      const payload = {
        role: editing.role,
        tabs: editing.role === 'Admin' ? 'all' : editing.tabs,
        timeOffAdmin: editing.role === 'Admin' || !!editing.timeOffAdmin,
        taskAdmin: editing.role === 'Admin' || !!editing.taskAdmin,
      };
      if (editing.newPassword) payload.newPassword = editing.newPassword;
      const res = await authedFetch(`/api/users/${editing.uid}`, { method: 'PATCH', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update user.');
      setEditing(null);
      load();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  }

  function Permissions({ value, onChange, isAdmin }) {
    if (isAdmin) return <p className="muted" style={{ margin: '8px 0 0' }}>Admins have access to everything.</p>;
    return (
      <div style={{ margin: '12px 0' }}>
        <div className="muted" style={{ marginBottom: 6 }}>Tabs</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 10 }}>
          {ALL_TABS.map((t) => (
            <label key={t.code} style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" checked={value.tabs.includes(t.code)} onChange={() => onChange({ ...value, tabs: value.tabs.includes(t.code) ? value.tabs.filter((c) => c !== t.code) : [...value.tabs, t.code] })} /> {t.label}
            </label>
          ))}
        </div>
        <div className="muted" style={{ marginBottom: 6 }}>Extra permissions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          <label style={{ fontSize: '0.85rem' }}>
            <input type="checkbox" checked={!!value.timeOffAdmin} onChange={(e) => onChange({ ...value, timeOffAdmin: e.target.checked })} /> Time Off admin
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            <input type="checkbox" checked={!!value.taskAdmin} onChange={(e) => onChange({ ...value, taskAdmin: e.target.checked })} /> Tasks admin
          </label>
        </div>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.75rem' }}>Time Off admin can approve, deny, and record time off. Tasks admin can manage tasks.</p>
      </div>
    );
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
        <Permissions value={form} onChange={setForm} isAdmin={form.role === 'Admin'} />
        <button className="btn" type="submit">Create user</button>
        {error && <p className="form-error">{error}</p>}
      </form>
      {editing && (
        <form className="card" onSubmit={saveEdit}>
          <h3 style={{ marginTop: 0 }}>Edit {editing.name || editing.email}</h3>
          <div className="inline-form">
            <label>Role
              <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                <option>Viewer</option><option>Admin</option>
              </select>
            </label>
            <label>New password (optional)<input type="text" value={editing.newPassword} onChange={(e) => setEditing({ ...editing, newPassword: e.target.value })} placeholder="Leave blank to keep" /></label>
          </div>
          <Permissions value={editing} onChange={setEditing} isAdmin={editing.role === 'Admin'} />
          {editError && <p className="form-error">{editError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit" disabled={editBusy}>{editBusy ? 'Saving...' : 'Save'}</button>
            <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Tabs</th><th>Time Off admin</th><th>Tasks admin</th><th>Status</th><th>Last login</th><th>Home screen</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.tabs === 'all' ? 'all' : (u.tabs || []).join(', ')}</td>
              <td>{u.timeOffAdmin ? 'Yes' : 'No'}</td>
              <td>{u.taskAdmin ? 'Yes' : 'No'}</td>
              <td>{u.active === false ? 'Deactivated' : 'Active'}</td>
              <td>{fmtWhen(u.lastLogin)}</td>
              <td>{u.homeScreen ? ('Yes' + (u.standalonePlatform ? ' (' + u.standalonePlatform + ')' : '')) : 'Unknown'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn" type="button" onClick={() => startEdit(u)} style={{ marginRight: 8 }}>Edit</button>
                <button className="btn" type="button" onClick={() => toggleActive(u)}>{u.active === false ? 'Reactivate' : 'Deactivate'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Layout>
  );
}
