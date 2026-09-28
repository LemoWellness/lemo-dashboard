import { useState } from 'react';
import { authedFetch } from '../lib/firebaseClient';

export default function MeetingNotesImport({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setText('');
    setItems([]);
    setError('');
  }

  async function fileToPayload(file) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return { filename: file.name, base64: btoa(binary) };
  }

  async function preview(payload) {
    setBusy(true);
    setError('');
    try {
      const res = await authedFetch('/api/tasks/from-notes', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read notes.');
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    preview(await fileToPayload(file));
  }

  function onPaste(e) {
    e.preventDefault();
    preview({ text });
  }

  async function create() {
    const ready = items.filter((i) => i.assignedTo);
    if (!ready.length) {
      setError('Match each task to a user before creating.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await authedFetch('/api/tasks/from-notes', {
        method: 'POST',
        body: JSON.stringify({ create: true, items: ready }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create tasks.');
      close();
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn" type="button" style={{ background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' }} onClick={() => setOpen(true)}>Import notes</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: 12 }} onClick={close}>
          <div className="card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh', overflow: 'auto', margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Import meeting notes</h3>
            <p className="muted">Upload a Gemini notes PDF or paste the Next steps section. Due date is 1 week from today. You can change dates after the tasks are created.</p>
            <label className="stack-field">PDF or text file
              <input type="file" accept=".pdf,.txt,.text" onChange={onFile} />
            </label>
            <label className="stack-field">Or paste Next steps
              <textarea className="stack-input" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <button className="btn" type="button" disabled={busy || !text.trim()} onClick={onPaste}>Preview pasted text</button>
            {error && <p className="form-error">{error}</p>}
            {items.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="muted">{items.length} task{items.length === 1 ? '' : 's'} found. Unmatched names need an email before create.</p>
                {items.map((item, i) => (
                  <div key={item.key || i} className="card" style={{ marginBottom: 8, padding: 12 }}>
                    <strong>{item.task}</strong>
                    <div className="muted">{item.assignedName || 'No owner'} {item.unmatched ? '(no matching user)' : ''}</div>
                    <div className="muted">Due {item.deadline}</div>
                    <div className="muted">{item.notes}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn" type="button" disabled={busy} onClick={create}>{busy ? 'Creating...' : 'Create tasks'}</button>
                  <button className="btn btn-ghost" type="button" onClick={close}>Cancel</button>
                </div>
              </div>
            )}
            {!items.length && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-ghost" type="button" onClick={close}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
