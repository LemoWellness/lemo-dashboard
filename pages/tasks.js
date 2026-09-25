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
  if (!t.deadline || t.status === 'Done' || t.status === 'On Hold' || t.status === 'Pending') return false;
  return t.deadline < todayStr();
}
function formatDeadline(ymd) {
  if (!ymd) return '\u2014';
  const parts = ymd.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : ymd;
}
function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function taskUpdates(t) {
  if (Array.isArray(t.updates) && t.updates.length) return t.updates;
  const legacy = String(t.notes || '').trim();
  if (!legacy) return [];
  return [{ id: 'legacy-notes', at: t.timestamp, by: t.addedBy, byName: t.addedBy, text: legacy, kind: 'note' }];
}

export default function Tasks() {
  const router = useRouter();
  const { session } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [deskUsers, setDeskUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subtab, setSubtab] = useState('active');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [updateText, setUpdateText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [deskBusy, setDeskBusy] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const focusId = typeof router.query.task === 'string' ? router.query.task : '';
  const isAdmin = session?.role === 'Admin';

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'usage' || code === 'daily' || code === 'reporting') return router.push('/reporting');
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
    const reqs = [
      authedFetch('/api/tasks').then((r) => { if (!r.ok) throw new Error('Could not load tasks.'); return r.json(); }),
      authedFetch('/api/assignable-users').then((r) => { if (!r.ok) throw new Error('Could not load the assignable users list.'); return r.json(); }),
    ];
    if (isAdmin) reqs.push(authedFetch('/api/users').then((r) => r.ok ? r.json() : { users: [] }));
    Promise.all(reqs).then(([t, u, staff]) => {
      setTasks(t.tasks || []);
      setUsers(u.users || []);
      if (staff) setDeskUsers(staff.users || []);
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
    if (!hit) return;
    setSubtab(hit.status === 'Done' ? 'completed' : 'active');
    setOpenTask(hit);
    setEditing(false);
    setUpdateText('');
    setPendingStatus('');
    setStatusNote('');
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
    setForm(EMPTY_FORM);
    setFormError('');
    setShowAdd(true);
  }
  function openView(t) {
    setOpenTask(t);
    setEditing(false);
    setUpdateText('');
    setFormError('');
    setPendingStatus('');
    setStatusNote('');
  }
  function startEdit() {
    if (!openTask?.canEdit) return;
    setEditForm({
      assignedTo: openTask.assignedTo,
      task: openTask.task,
      deadline: openTask.deadline || '',
      priority: openTask.priority,
      notes: '',
    });
    setEditing(true);
    setFormError('');
  }

  async function submitAdd(e) {
    e.preventDefault();
    setFormError('');
    if (!form.assignedTo) { setFormError('Choose who this is assigned to.'); return; }
    if (!form.task.trim()) { setFormError('Task description is required.'); return; }
    setSaving(true);
    const res = await authedFetch('/api/tasks', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setShowAdd(false);
    load();
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!openTask) return;
    setFormError('');
    if (!editForm.assignedTo) { setFormError('Choose who this is assigned to.'); return; }
    if (!editForm.task.trim()) { setFormError('Task description is required.'); return; }
    setSaving(true);
    const res = await authedFetch(`/api/tasks/${openTask.id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
    setSaving(false);
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setEditing(false);
    load();
  }

  function requestStatus(next) {
    if (!openTask || next === openTask.status) return;
    if (next === 'On Hold' || next === 'Pending') {
      setPendingStatus(next);
      setStatusNote('');
      setFormError('');
      return;
    }
    setPendingStatus('');
    setStatusNote('');
    changeStatus(openTask.id, next);
  }

  async function changeStatus(id, status, note) {
    const body = note ? { status, addUpdate: note } : { status };
    const res = await authedFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (!res.ok) {
      setFormError((await res.json()).error || 'Could not update status.');
      return;
    }
    setPendingStatus('');
    setStatusNote('');
    load();
  }

  async function submitStatusNote(e) {
    e.preventDefault();
    if (!openTask || !pendingStatus) return;
    if (!statusNote.trim()) { setFormError('Add a note before setting this status.'); return; }
    setSaving(true);
    await changeStatus(openTask.id, pendingStatus, statusNote.trim());
    setSaving(false);
  }

  async function submitUpdate(e) {
    e.preventDefault();
    if (!openTask || !updateText.trim()) return;
    setSaving(true);
    const res = await authedFetch(`/api/tasks/${openTask.id}`, { method: 'PATCH', body: JSON.stringify({ addUpdate: updateText }) });
    setSaving(false);
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setUpdateText('');
    load();
  }

  async function confirmDelete(t) {
    if (!window.confirm(`Delete "${t.task}"?`)) return;
    await authedFetch(`/api/tasks/${t.id}`, { method: 'DELETE' });
    setOpenTask(null);
    load();
  }

  async function setDesk(uid, taskDesk) {
    setDeskBusy(uid);
    await authedFetch(`/api/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ taskDesk }) });
    const staff = await authedFetch('/api/users').then((r) => r.json());
    setDeskUsers(staff.users || []);
    setDeskBusy('');
    load();
  }

  useEffect(() => {
    if (!openTask) return;
    const fresh = tasks.find((t) => t.id === openTask.id);
    if (fresh) setOpenTask(fresh);
  }, [tasks]);

  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
  const live = openTask;

  return (
    <Layout active="tasks" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <button className="btn" type="button" style={{ background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' }} onClick={() => setShowSettings(true)}>Settings</button>}
          <button className="btn" onClick={openAdd}>+ Add Task</button>
        </div>
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
                  <option>On Hold</option>
                  <option>Pending</option>
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
                  <th>For</th>
                  <th>Added By</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const overdue = isOverdue(t);
                  const done = t.status === 'Done';
                  const focused = focusId && t.id === focusId;
                  return (
                    <tr key={t.id} onClick={() => openView(t)} style={{ cursor: 'pointer', ...(focused ? { outline: '2px solid var(--ember)', background: '#f8f1ea' } : done ? { opacity: 0.55 } : overdue ? { background: '#fdeceb' } : {}) }}>
                      <td style={done ? { textDecoration: 'line-through' } : undefined}>{t.task}</td>
                      <td>{displayName(t.assignedTo)}</td>
                      <td>{displayName(t.addedBy)}</td>
                      <td>{formatDeadline(t.deadline)}</td>
                      <td><span className={`task-badge ${t.priority}`}>{t.priority}</span></td>
                      <td>{t.status}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="muted">{subtab === 'completed' ? 'No completed tasks yet.' : 'No active tasks \u2014 click "+ Add Task" to create one.'}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={submitAdd} style={{ background: 'var(--warm-white)', width: '90%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Add a Task</h3>
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: -8 }}>This will be logged under your account automatically.</p>
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
              <label>Deadline<input type="date" className="task-date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
              <label>Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginBottom: 16 }}>Notes
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional"
                style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
              <span className="muted" style={{ display: 'block', fontSize: '0.75rem', marginTop: 6 }}>Write updates here if needed. They show in the task history after you save.</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving\u2026' : 'Save Task'}</button>
            </div>
          </form>
        </div>
      )}

      {live && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setOpenTask(null); setEditing(false); }}>
          <div className="card" style={{ background: 'var(--warm-white)', width: '92%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{editing ? 'Edit Task' : live.task}</h3>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => { setOpenTask(null); setEditing(false); }}>Close</button>
            </div>
            {formError && <p className="form-error">{formError}</p>}

            {editing ? (
              <form onSubmit={submitEdit}>
                <label style={{ display: 'block', marginBottom: 12 }}>Assigned To
                  <select value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                    {sortedUsers.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
                  </select>
                </label>
                <label style={{ display: 'block', marginBottom: 12 }}>Task
                  <textarea value={editForm.task} onChange={(e) => setEditForm({ ...editForm, task: e.target.value })} rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
                </label>
                <div className="form-grid-2" style={{ marginBottom: 12 }}>
                  <label>Deadline<input type="date" className="task-date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} /></label>
                  <label>Priority
                    <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
                  <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving\u2026' : 'Save Changes'}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid-2" style={{ marginBottom: 14 }}>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Assigned to</div><div>{displayName(live.assignedTo)}</div></div>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Added by</div><div>{displayName(live.addedBy)}</div></div>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Deadline</div><div>{formatDeadline(live.deadline)}</div></div>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Priority</div><div>{live.priority}</div></div>
                </div>
                {live.canUpdateStatus ? (
                  <label style={{ display: 'block', marginBottom: 16 }}>Status
                    <select value={pendingStatus || live.status} onChange={(e) => requestStatus(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>On Hold</option>
                      <option>Pending</option>
                      <option>Done</option>
                    </select>
                  </label>
                ) : <p style={{ marginBottom: 16 }}><span className="muted">Status</span> {live.status}</p>}
                {pendingStatus && (
                  <form onSubmit={submitStatusNote} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block' }}>Note required
                      <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={2} placeholder="Why is this On Hold or Pending?"
                        style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => { setPendingStatus(''); setStatusNote(''); setFormError(''); }}>Cancel</button>
                      <button type="submit" className="btn" disabled={saving || !statusNote.trim()}>{saving ? 'Saving\u2026' : `Set ${pendingStatus}`}</button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div style={{ borderTop: '1px solid var(--iron)', paddingTop: 12 }}>
              <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8 }}>Updates</div>
              {taskUpdates(live).length === 0 && <p className="muted">No updates yet.</p>}
              {taskUpdates(live).map((u) => (
                <div key={u.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.8rem' }}>{u.text}</div>
                  <div className="muted" style={{ fontSize: '0.72rem' }}>{displayName(u.by) || u.byName} \u00b7 {formatWhen(u.at)}</div>
                </div>
              ))}
              {live.canAddUpdate && (
                <form onSubmit={submitUpdate} style={{ marginTop: 8 }}>
                  <textarea value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={2} placeholder="Add an update\u2026"
                    style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="submit" className="btn" disabled={saving || !updateText.trim()}>{saving ? 'Saving\u2026' : 'Add update'}</button>
                  </div>
                </form>
              )}
            </div>

            {!editing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                {live.canDelete && <button type="button" className="task-delete-btn" onClick={() => confirmDelete(live)}>Delete</button>}
                {live.canEdit && <button type="button" className="btn" onClick={startEdit}>Edit</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {showSettings && isAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }} onClick={() => setShowSettings(false)}>
          <div className="card" style={{ background: 'var(--warm-white)', width: '92%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0 }}>Task settings</h3>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <p className="muted" style={{ fontSize: '0.8rem' }}>HQ sees every task. Contractors only see tasks they created or that are assigned to them. This does not change page access.</p>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Desk</th></tr></thead>
              <tbody>
                {deskUsers.map((u) => (
                  <tr key={u.uid}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select disabled={deskBusy === u.uid} value={u.taskDesk === 'hq' ? 'hq' : 'contractor'} onChange={(e) => setDesk(u.uid, e.target.value)}>
                        <option value="hq">HQ</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
