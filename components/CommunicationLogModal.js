export default function CommunicationLogModal({ venue, form, error, onChange, onClose, onSubmit }) {
  function set(field, value) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 440 }}>
        <h3 style={{ marginTop: 0 }}>Communication Log</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label style={{ display: 'block', marginBottom: 12 }}>Date<input type="date" className="task-date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} required /></label>
        <label style={{ display: 'block', marginBottom: 12 }}>Channel
          <select value={form.channel || 'Call'} onChange={(e) => set('channel', e.target.value)} style={{ width: '100%', marginTop: 4 }}>
            <option>Call</option>
            <option>Email</option>
            <option>Text</option>
            <option>In Person</option>
            <option>Other</option>
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>Note
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)} required rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save Note</button>
        </div>
      </form>
    </div>
  );
}
