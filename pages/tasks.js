import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const EMPTY = { assignedTo: '', assignedTo2: '', task: '', deadline: '', priority: 'Medium', notes: '' };
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isOverdue(t) {
  if (!t.deadline || ['Done', 'On Hold', 'Pending', 'Cancelled', 'Cancel Requested'].includes(t.status)) return false;
  return t.deadline < todayStr();
}
function formatDeadline(ymd) {
  if (!ymd) return '-';
  const parts = String(ymd).split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : ymd;
}

export default function Tasks() {
  const router = useRouter();
  const { session } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subtab, setSubtab] = useState('active');
  const [form, setForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'usage' || code === 'daily' || code === 'reporting') return router.push('/reporting');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
  }
  function nameOf(email) {
    const raw = String(email || '').trim();
    if (!raw) return '';
    const match = users.find((u) => String(u.email || '').toLowerCase() === raw.toLowerCase());
    return match ? match.name : raw;
  }
  function people(t) {
    const first = nameOf(t.assignedTo);
    const second = nameOf(t.assignedTo2);
    if (first && second && first !== second) return first + ' + ' + second;
    return first || second || '-';
  }
  function load() {
    setLoading(true);
    Promise.all([
      authedFetch('/api/tasks').then((r) => r.json()),
      authedFetch('/api/assignable-users').then((r) => r.json()),
    ]).then(([t, u]) => {
      setTasks(t.tasks || []);
      setUsers(u.users || []);
      setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session) load(); }, [session]);

  const hold = (s) => s === 'On Hold' || s === 'Pending';
  const parked = (s) => s === 'Done' || s === 'Cancelled' || hold(s);
  const filtered = useMemo(() => tasks.filter((t) => {
    if (subtab === 'active') return !parked(t.status);
    if (subtab === 'hold') return hold(t.status);
    if (subtab === 'cancelled') return t.status === 'Cancelled';
    return t.status === 'Done';
  }), [tasks, subtab]);
  const counts = {
    active: tasks.filter((t) => !parked(t.status)).length,
    hold: tasks.filter((t) => hold(t.status)).length,
    cancelled: tasks.filter((t) => t.status === 'Cancelled').length,
    completed: tasks.filter((t) => t.status === 'Done').length,
  };
  const allChecked = filtered.length > 0 && filtered.every((t) => selected.includes(t.id));
  function toggleOne(id, on) {
    setSelected((list) => on ? Array.from(new Set(list.concat(id))) : list.filter((x) => x !== id));
  }
  async function applyBulkStatus() {
    const ids = selected.filter((id) => (tasks.find((t) => t.id === id) || {}).canUpdateStatus);
    if (!bulkStatus || !ids.length) return;
    setSaving(true);
    for (const id of ids) await authedFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: bulkStatus }) });
    setSaving(false); setSelected([]); setBulkStatus(''); load();
  }
  async function applyBulkDelete() {
    const ids = selected.filter((id) => (tasks.find((t) => t.id === id) || {}).canDelete);
    if (!ids.length || !window.confirm('Delete selected tasks?')) return;
    setSaving(true);
    for (const id of ids) await authedFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setSaving(false); setSelected([]); setOpenTask(null); load();
  }
  async function addTask(e) {
    e.preventDefault();
    if (!form.assignedTo || !form.task.trim()) { setError('Assigned person and task are required.'); return; }
    setSaving(true);
    const res = await authedFetch('/api/tasks', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setShowAdd(false); setForm(EMPTY); load();
  }
  async function setStatus(id, status) {
    await authedFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <Layout active="tasks" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Task</button>
      </div>
      {loading && <p className="muted">Loading tasks...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && (
        <>
          <div className="seg-tabs">
            <button className={`seg-tab ${subtab === 'active' ? 'active' : ''}`} onClick={() => setSubtab('active')}>Active ({counts.active})</button>
            <button className={`seg-tab ${subtab === 'hold' ? 'active' : ''}`} onClick={() => setSubtab('hold')}>Pending / Hold ({counts.hold})</button>
            <button className={`seg-tab ${subtab === 'cancelled' ? 'active' : ''}`} onClick={() => setSubtab('cancelled')}>Cancelled ({counts.cancelled})</button>
            <button className={`seg-tab ${subtab === 'completed' ? 'active' : ''}`} onClick={() => setSubtab('completed')}>Completed ({counts.completed})</button>
          </div>
          {selected.length > 0 && (
            <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted">{selected.length} selected</span>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="">Update status</option>
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
              <button type="button" className="btn" disabled={saving || !bulkStatus} onClick={applyBulkStatus}>Apply</button>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ember-muted)', border: '1px solid var(--iron)' }} disabled={saving} onClick={applyBulkDelete}>Delete selected</button>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? filtered.map((t) => t.id) : [])} /></th>
                    <th>Task</th><th>For</th><th>Added By</th><th>Deadline</th><th>Priority</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const overdue = isOverdue(t);
                    const done = t.status === 'Done';
                    return (
                      <tr key={t.id} onClick={() => setOpenTask(t)} style={{ cursor: 'pointer', ...(done ? { opacity: 0.55 } : overdue ? { background: '#fdeceb' } : {}) }}>
                        <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.includes(t.id)} onChange={(e) => toggleOne(t.id, e.target.checked)} /></td>
                        <td style={done ? { textDecoration: 'line-through' } : undefined}>{t.task}</td>
                        <td>{people(t)}</td>
                        <td>{nameOf(t.addedBy)}</td>
                        <td>{formatDeadline(t.deadline)}</td>
                        <td><span className={`task-badge ${t.priority}`}>{t.priority}</span></td>
                        <td>{t.status}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={7} className="muted">No tasks in this list.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={addTask} style={{ width: '90%', maxWidth: 440 }}>
            <h3 style={{ marginTop: 0 }}>Add a Task</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>Assigned To
              <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                <option value="">Select...</option>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>Second person (optional)
              <select value={form.assignedTo2} onChange={(e) => setForm({ ...form, assignedTo2: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                <option value="">None</option>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>Task
              <textarea value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>Deadline
              <input type="date" className="task-date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</button>
            </div>
          </form>
        </div>
      )}
      {openTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setOpenTask(null)}>
          <div className="card" style={{ width: '92%', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{openTask.task}</h3>
            <p><strong>For</strong> {people(openTask)}</p>
            <p className="muted">Deadline {formatDeadline(openTask.deadline)}</p>
            {openTask.canUpdateStatus && (
              <label style={{ display: 'block', marginBottom: 12 }}>Status
                <select value={openTask.status} onChange={(e) => { setStatus(openTask.id, e.target.value); setOpenTask(null); }} style={{ width: '100%', marginTop: 4 }}>
                  <option>Not Started</option><option>In Progress</option><option>On Hold</option><option>Pending</option><option>Done</option>
                </select>
              </label>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setOpenTask(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
