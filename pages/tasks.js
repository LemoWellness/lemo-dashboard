import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import MeetingNotesImport from '../components/MeetingNotesImport';
import TaskModal from '../components/TaskModal';
import WeeklyReport from '../components/WeeklyReport';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const EMPTY = { assignedTo: '', assignedTo2: '', task: '', deadline: '', priority: 'Medium', notes: '' };
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isCreationUpdate(t, u) {
  if (!u) return false;
  if (u.kind === 'created' || u.kind === 'create') return true;
  if (!t.timestamp || !u.at) return false;
  const created = new Date(t.timestamp).getTime();
  const at = new Date(u.at).getTime();
  if (Number.isNaN(created) || Number.isNaN(at)) return false;
  return Math.abs(at - created) < 15000;
}
function todayUpdates(t) {
  return (Array.isArray(t.updates) ? t.updates : []).filter((u) => u && dayKey(u.at) === todayStr() && !isCreationUpdate(t, u));
}
function updatedToday(t) {
  return todayUpdates(t).length > 0;
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
function tabFor(status) {
  if (status === 'Done') return 'completed';
  if (status === 'Cancelled') return 'cancelled';
  if (status === 'On Hold' || status === 'Pending') return 'hold';
  return 'active';
}

export default function Tasks() {
  const router = useRouter();
  const { session } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [deskUsers, setDeskUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subtab, setSubtab] = useState('active');
  const [dash, setDash] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [form, setForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [deskBusy, setDeskBusy] = useState('');
  const isAdmin = session?.role === 'Admin';
  const isHq = isAdmin || session?.taskDesk === 'hq' || !!session?.taskAdmin;
  const focusId = typeof router.query.task === 'string' ? router.query.task : '';
  const live = openTask ? (tasks.find((t) => t.id === openTask.id) || openTask) : null;

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
    const reqs = [
      authedFetch('/api/tasks').then((r) => r.json()),
      authedFetch('/api/assignable-users').then((r) => r.json()),
    ];
    if (isAdmin) reqs.push(authedFetch('/api/users').then((r) => r.ok ? r.json() : { users: [] }));
    Promise.all(reqs).then(([t, u, staff]) => {
      setTasks(t.tasks || []);
      setUsers(u.users || []);
      if (staff) setDeskUsers(staff.users || []);
      setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => {
    if (!focusId || !tasks.length) return;
    const hit = tasks.find((t) => t.id === focusId);
    if (!hit) return;
    setSubtab(tabFor(hit.status));
    setOpenTask(hit);
  }, [focusId, tasks]);

  const hold = (s) => s === 'On Hold' || s === 'Pending';
  const parked = (s) => s === 'Done' || s === 'Cancelled' || hold(s);
  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (filterAssigned) {
        const want = filterAssigned.toLowerCase();
        if (String(t.assignedTo || '').toLowerCase() !== want && String(t.assignedTo2 || '').toLowerCase() !== want) return false;
      }
      if (subtab === 'active') {
        if (parked(t.status)) return false;
        if (filterStatus && t.status !== filterStatus) return false;
        return true;
      }
      if (subtab === 'hold') return hold(t.status);
      if (subtab === 'cancelled') return t.status === 'Cancelled';
      return t.status === 'Done';
    });
    if (dash) {
      const mine = String(session?.email || '').toLowerCase();
      const soon = new Date(); soon.setDate(soon.getDate() + 3);
      const soonKey = soon.toISOString().slice(0, 10);
      const isMine = (t) => [t.assignedTo, t.assignedTo2].some((v) => String(v || '').toLowerCase() === mine);
      const dueSoon = (t) => t.deadline && t.deadline >= todayStr() && t.deadline <= soonKey && !parked(t.status);
      list = list.filter((t) => {
        if (dash === 'mine') return isMine(t) && !parked(t.status);
        if (dash === 'overdue') return isMine(t) && isOverdue(t);
        if (dash === 'soon') return isMine(t) && dueSoon(t);
        if (dash === 'messages') return Number(t.privateMessageCount) > 0;
        if (dash === 'team-active') return !parked(t.status);
        if (dash === 'team-overdue') return isOverdue(t);
        if (dash === 'team-soon') return dueSoon(t);
        return true;
      });
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'created_asc') return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy === 'deadline_asc') return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31');
      if (sortBy === 'deadline_desc') return (b.deadline || '0000-01-01').localeCompare(a.deadline || '0000-01-01');
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    return list;
  }, [tasks, subtab, filterAssigned, filterStatus, sortBy, dash, session]);
  const needsUpdate = subtab === 'active' ? filtered.filter((t) => !updatedToday(t)) : filtered;
  const updatedNow = subtab === 'active' ? filtered.filter((t) => updatedToday(t)) : [];
  const counts = {
    active: tasks.filter((t) => !parked(t.status)).length,
    hold: tasks.filter((t) => hold(t.status)).length,
    cancelled: tasks.filter((t) => t.status === 'Cancelled').length,
    completed: tasks.filter((t) => t.status === 'Done').length,
  };
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
  async function setDesk(uid, taskDesk) {
    setDeskBusy(uid);
    await authedFetch(`/api/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ taskDesk }) });
    const staff = await authedFetch('/api/users').then((r) => r.json());
    setDeskUsers(staff.users || []);
    setDeskBusy('');
  }
  async function setTaskAdmin(uid, taskAdmin) {
    setDeskBusy(uid);
    await authedFetch(`/api/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ taskAdmin }) });
    const staff = await authedFetch('/api/users').then((r) => r.json());
    setDeskUsers(staff.users || []);
    setDeskBusy('');
  }

  function finishedOn(row) {
    if (row.completedAt) return String(row.completedAt).slice(0, 10);
    const updates = Array.isArray(row.updates) ? row.updates : [];
    const hit = [...updates].reverse().find((u) => /Status changed to Done/i.test(String(u.text || '')));
    return hit && hit.at ? String(hit.at).slice(0, 10) : '';
  }
  function taskTable(list) {
    const allOn = list.length > 0 && list.every((row) => selected.includes(row.id));
    const completedTab = subtab === 'completed';
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allOn} onChange={(e) => setSelected(e.target.checked ? list.map((row) => row.id) : selected.filter((id) => !list.some((row) => row.id === id)))} /></th>
              <th>Task</th><th>For</th><th>Added By</th><th>Deadline</th><th>Priority</th><th>{completedTab ? 'Completed' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => {
              const overdue = isOverdue(row);
              const done = row.status === 'Done';
              const focused = focusId && row.id === focusId;
              return (
                <tr key={row.id} onClick={() => setOpenTask(row)} style={{ cursor: 'pointer', ...(focused ? { outline: '2px solid var(--ember)', background: '#f8f1ea' } : done ? { opacity: 0.55 } : overdue ? { background: '#fdeceb' } : {}) }}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => toggleOne(row.id, e.target.checked)} /></td>
                  <td style={done ? { textDecoration: 'line-through' } : undefined}>{row.privateMessageCount > 0 && <span title="Private message" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: 'var(--ember)', marginRight: 8 }} />}{row.task}</td>
                  <td>{people(row)}</td>
                  <td>{nameOf(row.addedBy)}</td>
                  <td>{formatDeadline(row.deadline)}</td>
                  <td><span className={`task-badge ${row.priority}`}>{row.priority}</span></td>
                  <td>{completedTab ? (formatDeadline(finishedOn(row)) || '-') : row.status}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={7} className="muted">No tasks in this list.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Layout active="tasks" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isHq && <button className="btn" type="button" style={{ background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' }} onClick={() => setShowSettings(true)}>Settings</button>}
          <button className="btn" onClick={() => setShowAdd(true)}>+ Add Task</button>
        </div>
      </div>
      {loading && <p className="muted">Loading tasks...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && (
        <>

          {(() => {
            const mine = String(session?.email || '').toLowerCase();
            const soon = new Date(); soon.setDate(soon.getDate() + 3);
            const soonKey = soon.toISOString().slice(0, 10);
            const isMine = (t) => [t.assignedTo, t.assignedTo2].some((v) => String(v || '').toLowerCase() === mine);
            const open = (t) => !parked(t.status);
            const dueSoon = (t) => t.deadline && t.deadline >= todayStr() && t.deadline <= soonKey && open(t);
            const myOpen = tasks.filter((t) => isMine(t) && open(t));
            const cardStyle = (id, warn) => ({ flex: '1 1 180px', textAlign: 'left', border: '1px solid var(--iron)', borderRadius: 8, padding: '12px 14px', background: warn ? '#fdeceb' : '#fff', cursor: 'pointer' });
            const row = (id, label, count, warn) => (
              <button key={id} type="button" onClick={() => { setDash(dash === id ? '' : id); setSubtab('active'); }} style={cardStyle(id, warn)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{label}</span><span>›</span></div>
                <div style={{ fontSize: '1.4rem' }}>{count}</div>
              </button>
            );
            return (
              <div style={{ marginBottom: 16 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Task Dashboard</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {row('mine', 'My Tasks', myOpen.length, false)}
                  {row('soon', 'Due Soon', myOpen.filter(dueSoon).length, false)}
                  {row('overdue', 'Overdue', myOpen.filter(isOverdue).length, true)}
                  {row('messages', 'Private Messages', tasks.filter((t) => Number(t.privateMessageCount) > 0).length, false)}
                </div>
                {isHq && (
                  <>
                    <div className="muted" style={{ margin: '12px 0 6px' }}>Team Tasks</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {row('team-active', 'Active', tasks.filter((t) => open(t)).length, false)}
                      {row('team-overdue', 'Overdue', tasks.filter(isOverdue).length, true)}
                      {row('team-soon', 'Due Soon', tasks.filter(dueSoon).length, false)}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
          <div className="seg-tabs">
            <button className={`seg-tab ${subtab === 'active' ? 'active' : ''}`} onClick={() => setSubtab('active')}>Active ({counts.active})</button>
            <button className={`seg-tab ${subtab === 'hold' ? 'active' : ''}`} onClick={() => setSubtab('hold')}>Pending / Hold ({counts.hold})</button>
            <button className={`seg-tab ${subtab === 'cancelled' ? 'active' : ''}`} onClick={() => setSubtab('cancelled')}>Cancelled ({counts.cancelled})</button>
            <button className={`seg-tab ${subtab === 'completed' ? 'active' : ''}`} onClick={() => setSubtab('completed')}>Completed ({counts.completed})</button>
            <button className={`seg-tab ${subtab === 'report' ? 'active' : ''}`} onClick={() => setSubtab('report')} style={subtab === 'report' ? undefined : { color: 'var(--ember)' }}>Weekly Report</button>
          </div>
          {subtab !== 'report' && <div className="card" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }} className="muted">Assigned To
              <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} style={{ minWidth: 150 }}>
                <option value="">All</option>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            {subtab === 'active' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }} className="muted">Status
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ minWidth: 130 }}>
                  <option value="">All</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Cancel Requested</option>
                </select>
              </label>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }} className="muted">Sort By
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ minWidth: 150 }}>
                <option value="created_desc">Newest Created</option>
                <option value="created_asc">Oldest Created</option>
                <option value="deadline_asc">Deadline (Soonest)</option>
                <option value="deadline_desc">Deadline (Latest)</option>
              </select>
            </label>
          </div>}
          {subtab !== 'report' && selected.length > 0 && (
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
          {subtab === 'report' ? (
            <WeeklyReport users={users} onOpenTask={(id) => { const hit = tasks.find((t) => t.id === id); if (hit) setOpenTask(hit); }} />
          ) : subtab === 'active' ? (
            <>
              {needsUpdate.length > 0 && (
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Needs an Update</h3>
                  {taskTable(needsUpdate)}
                </div>
              )}
              {updatedNow.length > 0 && (
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Updated Today</h3>
                  <p className="muted" style={{ marginTop: -6 }}>Click a task to see the updates.</p>
                  {taskTable(updatedNow)}
                </div>
              )}
              {needsUpdate.length === 0 && updatedNow.length === 0 && (
                <div className="card"><p className="muted" style={{ margin: 0 }}>No tasks in this list.</p></div>
              )}
            </>
          ) : (
            <div className="card">{taskTable(filtered)}</div>
          )}
        </>
      )}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={addTask} style={{ width: '90%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto' }}>
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
            <div className="form-grid-2" style={{ marginBottom: 12 }}>
              <label>Deadline<input type="date" className="task-date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
              <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', marginTop: 4 }}><option>Low</option><option>Medium</option><option>High</option></select></label>
            </div>
            <label style={{ display: 'block', marginBottom: 16 }}>Notes
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
              <span className="muted" style={{ display: 'block', fontSize: '0.75rem', marginTop: 6 }}>Write updates here if needed.</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</button>
            </div>
          </form>
        </div>
      )}
      {live && <TaskModal task={live} users={users} session={session} onClose={() => setOpenTask(null)} onChanged={load} />}
      {showSettings && isHq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }} onClick={() => setShowSettings(false)}>
          <div className="card" style={{ background: 'var(--warm-white)', width: '92%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0 }}>Task settings</h3>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <p className="muted" style={{ fontSize: '0.8rem' }}>HQ sees every task. Contractors only see tasks they created or that are assigned to them. Tasks Admin can edit or delete any task and approve cancel requests. It is not the same as HQ.</p>
            <div style={{ margin: '12px 0 16px' }}>
              <MeetingNotesImport onCreated={load} />
            </div>
            {isAdmin && (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Desk</th><th>Tasks Admin</th></tr></thead>
              <tbody>
                {deskUsers.map((u) => (
                  <tr key={u.uid}>
                    <td>{u.name}</td><td>{u.email}</td>
                    <td>
                      <select disabled={deskBusy === u.uid || u.role === 'Admin'} value={u.taskDesk === 'hq' ? 'hq' : 'contractor'} onChange={(e) => setDesk(u.uid, e.target.value)}>
                        <option value="hq">HQ</option><option value="contractor">Contractor</option>
                      </select>
                    </td>
                    <td>
                      <input type="checkbox" disabled={deskBusy === u.uid || u.role === 'Admin'} checked={!!u.taskAdmin} onChange={(e) => setTaskAdmin(u.uid, e.target.checked)} />
                      {u.role === 'Admin' ? <span className="muted"> Admin</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
