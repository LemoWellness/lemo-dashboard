import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

export default function Tasks() {
  const router = useRouter();
  const { session } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ assignedTo: '', task: '', deadline: '', priority: 'Medium', notes: '' });
  const [error, setError] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
  }

  function load() {
    authedFetch('/api/tasks').then((r) => r.json()).then((d) => setTasks(d.tasks || []));
  }
  useEffect(() => { if (session) load(); }, [session]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await authedFetch('/api/tasks', { method: 'POST', body: JSON.stringify(form) });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ assignedTo: '', task: '', deadline: '', priority: 'Medium', notes: '' });
    load();
  }

  async function updateStatus(id, status) {
    await authedFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  async function remove(id) {
    await authedFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout active="tasks" onNavigate={navigate}>
      <h1>Tasks</h1>

      <form className="inline-form card" onSubmit={submit}>
        <label>Assigned To<input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} required /></label>
        <label>Task<input value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} required /></label>
        <label>Deadline<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
        <label>Priority
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </label>
        <button className="btn" type="submit">Add task</button>
      </form>
      {error && <p className="form-error">{error}</p>}

      <table>
        <thead><tr><th>Task</th><th>Assigned To</th><th>Deadline</th><th>Priority</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>{t.task}</td>
              <td>{t.assignedTo}</td>
              <td>{t.deadline}</td>
              <td>{t.priority}</td>
              <td>
                {t.canEdit ? (
                  <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}>
                    <option>Not Started</option><option>In Progress</option><option>Done</option>
                  </select>
                ) : t.status}
              </td>
              <td>{t.canDelete && <button className="btn" style={{ background: 'var(--danger)' }} onClick={() => remove(t.id)}>Delete</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}
