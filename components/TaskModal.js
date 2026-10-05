import { useEffect, useState } from 'react';
import { authedFetch } from '../lib/firebaseClient';

function formatDeadline(ymd) {
  if (!ymd) return '-';
  const parts = String(ymd).split('-');
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
function emailOf(value) {
  return String(value || '').toLowerCase().trim();
}

export default function TaskModal({ task, users, session, onClose, onChanged }) {
  const [tab, setTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    assignedTo: task.assignedTo || '',
    assignedTo2: task.assignedTo2 || '',
    task: task.task || '',
    deadline: task.deadline || '',
    priority: task.priority || 'Medium',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [privateDraft, setPrivateDraft] = useState(task.privateNote || '');
  const [messageWith, setMessageWith] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [frozen, setFrozen] = useState(false);
  const [messageError, setMessageError] = useState('');
  const me = emailOf(session?.email);
  useEffect(() => { setPrivateDraft(task.privateNote || ''); }, [task.id, task.privateNote]);
  useEffect(() => { setTab('info'); setMessageWith(''); setMessages([]); }, [task.id]);

  function nameOf(email) {
    const raw = String(email || '').trim();
    if (!raw) return '';
    const match = users.find((u) => emailOf(u.email) === emailOf(raw));
    return match ? match.name : raw;
  }
  function people() {
    const first = nameOf(task.assignedTo);
    const second = nameOf(task.assignedTo2);
    if (first && second && first !== second) return first + ' + ' + second;
    return first || second || '-';
  }
  const partners = [...new Set([task.addedBy, task.assignedTo, task.assignedTo2].map(emailOf).filter((email) => email && email !== me))];
  const selectedPartner = messageWith || partners[0] || '';

  async function patch(body) {
    setSaving(true);
    setError('');
    const res = await authedFetch(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error || 'Could not update this task.');
      return false;
    }
    onChanged();
    return true;
  }
  async function submitEdit(e) {
    e.preventDefault();
    if (!editForm.assignedTo || !String(editForm.task || '').trim()) return;
    if (await patch(editForm)) setEditing(false);
  }
  async function changeStatus(status, note) {
    const body = note ? { status, addUpdate: note } : { status };
    if (await patch(body)) { setPendingStatus(''); setStatusNote(''); }
  }
  function requestStatus(next) {
    if (next === task.status) return;
    setPendingStatus(next);
    setStatusNote('');
  }
  async function submitStatusNote(e) {
    e.preventDefault();
    if (!statusNote.trim()) { setError('Add a note before setting this status.'); return; }
    await changeStatus(pendingStatus, statusNote.trim());
  }
  async function submitCancel(e) {
    e.preventDefault();
    if (await patch({ cancelRequest: cancelReason.trim() })) { setShowCancel(false); setCancelReason(''); }
  }
  async function decideCancel(decision) {
    await patch({ cancelDecision: decision });
  }
  async function submitUpdate(e) {
    e.preventDefault();
    if (await patch({ addUpdate: updateText.trim() })) setUpdateText('');
  }
  async function savePrivate(e) {
    e.preventDefault();
    await patch({ privateNote: privateDraft });
  }
  async function confirmDelete() {
    if (!window.confirm('Delete this task?')) return;
    setSaving(true);
    await authedFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    setSaving(false);
    onClose();
    onChanged();
  }
  async function loadMessages(withEmail) {
    const other = withEmail || selectedPartner;
    if (!other) return;
    const res = await authedFetch(`/api/tasks/${task.id}/messages?with=${encodeURIComponent(other)}`);
    const data = await res.json();
    if (!res.ok) { setMessageError(data.error || 'Could not load messages.'); return; }
    setMessages(data.messages || []);
    setFrozen(!!data.frozen);
    setMessageError('');
  }
  useEffect(() => {
    if (tab === 'message' && selectedPartner) loadMessages(selectedPartner);
  }, [tab, selectedPartner, task.id]);
  async function sendMessage(e) {
    e.preventDefault();
    if (!selectedPartner || !messageText.trim()) return;
    setSaving(true);
    const res = await authedFetch(`/api/tasks/${task.id}/messages`, { method: 'POST', body: JSON.stringify({ to: selectedPartner, text: messageText.trim() }) });
    setSaving(false);
    if (!res.ok) { setMessageError((await res.json()).error || 'Could not send.'); return; }
    setMessageText('');
    loadMessages(selectedPartner);
  }
  async function nudge(id) {
    setSaving(true);
    const res = await authedFetch(`/api/tasks/${task.id}/messages`, { method: 'POST', body: JSON.stringify({ nudgeId: id }) });
    setSaving(false);
    if (!res.ok) { setMessageError((await res.json()).error || 'Could not nudge.'); return; }
    loadMessages(selectedPartner);
  }

  const tabStyle = (id) => ({ background: tab === id ? 'var(--ember)' : 'transparent', color: tab === id ? '#fff' : 'var(--ash)', border: '1px solid var(--iron)', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div className="card" style={{ background: 'var(--warm-white)', width: '92%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ marginTop: 0 }}>{editing ? 'Edit Task' : task.task}</h3>
          <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={onClose}>Close</button>
        </div>
        {!editing && (
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: -6, marginBottom: 12 }}>
            {task.status} · {people()} · Due {formatDeadline(task.deadline)}
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        {editing ? (
          <form onSubmit={submitEdit}>
            <label style={{ display: 'block', marginBottom: 12 }}>Assigned To
              <select value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>Second person (optional)
              <select value={editForm.assignedTo2 || ''} onChange={(e) => setEditForm({ ...editForm, assignedTo2: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                <option value="">None</option>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>Task
              <textarea value={editForm.task} onChange={(e) => setEditForm({ ...editForm, task: e.target.value })} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
            </label>
            <div className="form-grid-2" style={{ marginBottom: 12 }}>
              <label>Deadline<input type="date" className="task-date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} /></label>
              <label>Priority<select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} style={{ width: '100%', marginTop: 4 }}><option>Low</option><option>Medium</option><option>High</option></select></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <button type="button" style={tabStyle('info')} onClick={() => setTab('info')}>Task Info</button>
              <button type="button" style={tabStyle('updates')} onClick={() => setTab('updates')}>Updates</button>
              <button type="button" style={tabStyle('message')} onClick={() => setTab('message')}>Private Message</button>
              {task.canPrivateNote && <button type="button" style={tabStyle('note')} onClick={() => setTab('note')}>Personal Note</button>}
            </div>
            {tab === 'info' && (
              <>
                <div className="grid-2" style={{ marginBottom: 14 }}>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Assigned to</div><div>{people()}</div></div>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Added by</div><div>{nameOf(task.addedBy)}</div></div>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Deadline</div><div>{formatDeadline(task.deadline)}</div></div>
                  <div><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Priority</div><div>{task.priority}</div></div>
                </div>
                {task.canUpdateStatus ? (
                  <label style={{ display: 'block', marginBottom: 16 }}>Status
                    <select value={pendingStatus || task.status} onChange={(e) => requestStatus(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
                      <option>Not Started</option><option>In Progress</option><option>On Hold</option><option>Pending</option><option>Done</option>
                    </select>
                  </label>
                ) : <p style={{ marginBottom: 16 }}><span className="muted">Status</span> {task.status}</p>}
                {pendingStatus && (
                  <form onSubmit={submitStatusNote} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block' }}>Note required<textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} /></label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => { setPendingStatus(''); setStatusNote(''); }}>Back</button>
                      <button type="submit" className="btn" disabled={saving || !statusNote.trim()}>{saving ? 'Saving...' : `Set ${pendingStatus}`}</button>
                    </div>
                  </form>
                )}
                {task.status === 'Cancel Requested' && (
                  <div className="card" style={{ marginBottom: 16, background: '#f8f1ea' }}>
                    <p style={{ marginTop: 0 }}><strong>Cancel requested</strong></p>
                    <p>{task.cancelReason || 'No reason given.'}</p>
                    {task.canDecideCancel && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} disabled={saving} onClick={() => decideCancel('deny')}>Deny</button>
                        <button type="button" className="btn" disabled={saving} onClick={() => decideCancel('approve')}>Approve cancel</button>
                      </div>
                    )}
                  </div>
                )}
                {task.status === 'Cancelled' && task.cancelReason && <p style={{ marginBottom: 16 }}><span className="muted">Cancel reason</span><br />{task.cancelReason}</p>}
                {showCancel && task.canRequestCancel && (
                  <form onSubmit={submitCancel} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block' }}>Why cancel this task?<textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} /></label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => { setShowCancel(false); setCancelReason(''); }}>Back</button>
                      <button type="submit" className="btn" disabled={saving || !cancelReason.trim()}>{saving ? 'Saving...' : 'Send request'}</button>
                    </div>
                  </form>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  {task.canRequestCancel && !showCancel && <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setShowCancel(true)}>Request cancel</button>}
                  {task.canDelete && <button type="button" className="task-delete-btn" onClick={confirmDelete}>Delete</button>}
                  {task.canEdit && <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>}
                </div>
              </>
            )}
            {tab === 'updates' && (
              <div>
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: 0 }}>Shared with everyone on this task.</p>
                {taskUpdates(task).length === 0 && <p className="muted">No updates yet.</p>}
                {taskUpdates(task).map((u) => (
                  <div key={u.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.8rem' }}>{u.text}</div>
                    <div className="muted" style={{ fontSize: '0.72rem' }}>{nameOf(u.by) || u.byName} | {formatWhen(u.at)}</div>
                  </div>
                ))}
                {task.canAddUpdate && (
                  <form onSubmit={submitUpdate} style={{ marginTop: 8 }}>
                    <textarea value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="submit" className="btn" disabled={saving || !updateText.trim()}>{saving ? 'Saving...' : 'Add update'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {tab === 'message' && (
              <div>
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: 0 }}>Only you and the person you choose can see this. It is not an update.</p>
                {partners.length === 0 && <p className="muted">No one else is on this task.</p>}
                {partners.length > 1 && (
                  <label style={{ display: 'block', marginBottom: 10 }}>Conversation with
                    <select value={selectedPartner} onChange={(e) => setMessageWith(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
                      {partners.map((email) => <option key={email} value={email}>{nameOf(email)}</option>)}
                    </select>
                  </label>
                )}
                {partners.length === 1 && <p style={{ marginTop: 0 }}>Conversation with {nameOf(partners[0])}</p>}
                {messageError && <p className="form-error">{messageError}</p>}
                {frozen && <p className="muted">This conversation is frozen because someone is no longer on the task.</p>}
                {messages.map((m) => (
                  <div key={m.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem' }}>{m.text}</div>
                    <div className="muted" style={{ fontSize: '0.72rem' }}>
                      {nameOf(m.from)} | {formatWhen(m.at)}
                      {m.from === me && (m.readAt ? ` · Read ${formatWhen(m.readAt)}` : ' · Not read yet')}
                    </div>
                    {m.from === me && !m.readAt && !frozen && (
                      <button type="button" className="btn btn-ghost" disabled={saving || m.nudged} onClick={() => nudge(m.id)}>{m.nudged ? 'Nudged' : 'Nudge'}</button>
                    )}
                  </div>
                ))}
                {!frozen && selectedPartner && (
                  <form onSubmit={sendMessage} style={{ marginTop: 8 }}>
                    <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="submit" className="btn" disabled={saving || !messageText.trim()}>{saving ? 'Sending...' : 'Send'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {tab === 'note' && task.canPrivateNote && (
              <form onSubmit={savePrivate}>
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: 0 }}>Only you can see this. It does not post to Updates.</p>
                <textarea value={privateDraft} onChange={(e) => setPrivateDraft(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save personal note'}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
