export default function CommunicationLogModal({ venue, form, error, readOnly, canEdit, onEdit, onChange, onClose, onSubmit }) {
  function set(field, value) {
    if (readOnly) return;
    onChange({ ...form, [field]: value });
  }
  const title = form.id ? (readOnly ? 'Communication Log' : 'Edit Note') : 'Communication Log';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 440 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label className="stack-field">Date
          <input type="date" className="task-date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">Channel
          <select value={form.channel || 'Call'} onChange={(e) => set('channel', e.target.value)} disabled={readOnly}>
            <option>Call</option>
            <option>Email</option>
            <option>Text</option>
            <option>In Person</option>
            <option>Other</option>
          </select>
        </label>
        <label className="stack-field">Note
          <textarea className="stack-input" value={form.note} onChange={(e) => set('note', e.target.value)} required rows={4} disabled={readOnly} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          {readOnly && canEdit && <button type="button" className="btn" onClick={onEdit}>Edit</button>}
          {!readOnly && <button type="submit" className="btn">Save Note</button>}
        </div>
      </form>
    </div>
  );
}
