export default function AddIncomeModal({ venue, form, error, onChange, onClose, onSubmit }) {
  function set(field, value) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>Add Income</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label style={{ display: 'block', marginBottom: 12 }}>Date<input type="date" className="task-date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></label>
        <label style={{ display: 'block', marginBottom: 12 }}>Amount (monthly subscription payment)<input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} required /></label>
        <label style={{ display: 'block', marginBottom: 16 }}>Notes (optional)<input value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save Income</button>
        </div>
      </form>
    </div>
  );
}
