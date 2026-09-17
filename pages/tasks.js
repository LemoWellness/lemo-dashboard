import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const EMPTY_FORM = { assignedTo: '', task: '', deadline: '', priority: 'Medium', notes: '' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isOverdue(t) {
  if (!t.deadline || t.status === 'Done') return false;
  return t.deadline < todayStr();
}
function formatDeadline(ymd) {
  if (!ymd) return '\u2014';
  const parts = ymd.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : ymd;
}

export default function Tasks() {
  const router = useRouter();
  const { session } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subtab, setSubtab] = useState('active');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const focusId = typeof router.query.task === 'string' ? router.query.task : '';

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'usage') return router.push('/usage');
    if (code === 'daily') return router.push('/daily');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
  }

  function displayName(email) {
    const match = users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    return match ? match.name : email;
  }

  function load() {
    setLoading(true);
    setLoadError('');
    Promise.all([
      authedFetch('/api/tasks').then((r) => { if (!r.ok) throw new Error('Could not load tasks.'); return r.json(); }),
      authedFetch('/api/assignable-users').then((r) => { if (!r.ok) throw new Error('Could not load the assignable users list.'); return r.json(); }),
    ]).then(([t, u]) => {
      setTasks(t.tasks || []);
      setUsers(u.users || []);
      setLoading(false);
    }).catch((e) => {
      setLoadError(e.message || 'Something went wrong loading this page.');
      setLoading(false);
    });
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => {
    if (!focusId || !tasks.length) return;
    const hit = tasks.find((t) => t.id === focusId);
    if (hit) setSubtab(hit.status === 'Done' ? 'completed' : 'active');
  }, [focusId, tasks]);

  const activeCount = tasks.filter((t) => t.status !== 'Done').length;
  const completedCount = tasks.filter((t) => t.status === 'Done').length;

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (subtab === 'active' && t.status === 'Done') return false;
      if (subtab === 'completed' && t.status !== 'Done') return false;
      if (filterAssigned && String(t.assignedTo || '').toLowerCase() !== filterAssigned.toLowerCase()) return false;
      if (subtab === 'active' && filterStatus && t.status !== filterStatus) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'created_desc') return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortBy === 'created_asc') return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy === 'deadline_asc') return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31');
      if (sortBy === 'deadline_desc') return (b.deadline || '0000-01-01').localeCompare(a.deadline || '0000-01-01');
      return 0;
    });
    return list;
  }, [tasks, subtab, filterAssigned, filterStatus, sortBy]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }
  function openEdit(t) {
    if (!t.canEdit) return;
    setEditingId(t.id);
    setForm({ assignedTo: t.assignedTo, task: t.task, deadline: t.deadline || '', priority: t.priority, notes: t.notes || '' });
    setFormError('');
    setShowModal(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    setFormError('');
    if (!form.assignedTo) { setFormError('Choose who this is assigned to.'); return; }
    if (!form.task.trim()) { setFormError('Task description is required.'); return; }
    setSaving(true);
    const res = editingId
      ? await authedFetch(`/api/tasks/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) })
      : await authedFetch('/api/tasks', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setShowModal(false);
    load();
  }

  async function changeStatus(id, status) {
    await authedFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  async function confirmDelete(t) {
    if (!window.confirm(`Delete "${t.task}"?`)) return;
    await authedFetch(`/api/tasks/${t.id}`, { method: 'DELETE' });
    load();
  }

  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Layout active="tasks" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <button className="btn" onClick={openAdd}>+ Add Task</button>
      </div>

      {loading ? <p className="muted">Loading tasks\u2026</p> : loadError ? <p className="form-error">{loadError}</p> : (
        <>
          <div className="seg-tabs">
            <button className={`seg-tab ${subtab === 'active' ? 'active' : ''}`} onClick={() => setSubtab('active')}>
              Active ({activeCount})
            </button>
            <button className={`seg-tab ${subtab === 'completed' ? 'active' : ''}`} onClick={() => setSubtab('completed')}>
              Completed ({completedCount})
            </button>
          </div>

          <div className="card" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }} className="muted">
              Assigned To
              <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} style={{ minWidth: 150 }}>
                <option value="">All</option>
                {sortedUsers.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            {subtab === 'active' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }} className="muted">
                Status
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ minWidth: 130 }}>
                  <option value="">All</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </label>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }} className="muted">
              Sort By
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ minWidth: 150 }}>
                <option value="created_desc">Newest Created</option>
                <option value="created_asc">Oldest Created</option>
                <option value="deadline_asc">Deadline (Soonest)</option>
                <option value="deadline_desc">Deadline (Latest)</option>
              </select>
            </label>
          </div>

          <div className="card">
            <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Notes</th>
                  <th>For</th>
                  <th>Added By</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const overdue = isOverdue(t);
                  const done = t.status === 'Done';
                  const focused = focusId && t.id === focusId;
                  return (
                    <tr key={t.id} style={focused ? { outline: '2px solid var(--ember)', background: '#f8f1ea' } : done ? { opacity: 0.55 } : overdue ? { background: '#fdeceb' } : undefined}>
                      <td style={done ? { textDecoration: 'line-through' } : undefined}>{t.task}</td>
                      <td className="muted" style={{ fontStyle: t.notes ? 'italic' : 'normal' }}>{t.notes || '\u2014'}</td>
                      <td>{displayName(t.assignedTo)}</td>
                      <td>{displayName(t.addedBy)}</td>
                      <td>{formatDeadline(t.deadline)}</td>
                      <td><span className={`task-badge ${t.priority}`}>{t.priority}</span></td>
                      <td>
                        <select className="task-status-select" disabled={!t.canEdit} value={t.status} onChange={(e) => changeStatus(t.id, e.target.value)}>
                          <option>Not Started</option>
                          <option>In Progress</option>
                          <option>Done</option>
                        </select>
                      </td>
                      <td>
                        {t.canEdit || t.canDelete ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {t.canEdit && <button type="button" className="task-edit-btn" onClick={() => openEdit(t)}>Edit</button>}
                            {t.canDelete && <button type="button" className="task-delete-btn" onClick={() => confirmDelete(t)}>Delete</button>}
                          </div>
                        ) : <span className="task-locked-note">View only</span>}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="muted">{subtab === 'completed' ? 'No completed tasks yet.' : 'No active tasks \u2014 click "+ Add Task" to create one.'}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={submitForm} style={{ background: 'var(--warm-white)', width: '90%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Task' : 'Add a Task'}</h3>
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: -8 }}>
              {editingId ? 'Only the creator, the assignee, or an Admin can change this.' : 'This will be logged under your account automatically.'}
            </p>
            {formError && <p className="form-error">{formError}</p>}

            <label style={{ display: 'block', marginBottom: 12 }}>Assigned To
              <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                <option value="">Select\u2026</option>
                {sortedUsers.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>Task
              <textarea value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} rows={3} placeholder="What needs to get done?"
                style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
            </label>
            <div className="form-grid-2" style={{ marginBottom: 12 }}>
              <label>Deadline<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={{ width: '100%', marginTop: 4 }} /></label>
              <label>Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginBottom: 16 }}>Notes
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving\u2026' : editingId ? 'Save Changes' : 'Save Task'}</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
