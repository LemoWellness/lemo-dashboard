export default function AddIncomeModal({ venue, form, error, readOnly, canEdit, onEdit, onChange, onClose, onSubmit }) {
  function set(field, value) {
    if (readOnly) return;
    onChange({ ...form, [field]: value });
  }
  const title = form.id ? (readOnly ? 'Income' : 'Edit Income') : 'Add Income';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label className="stack-field">Date received
          <input type="date" className="task-date" value={form.date} onChange={(e) => set('date', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">Paying for month
          <input type="month" className="task-date" value={form.periodMonth || ''} onChange={(e) => set('periodMonth', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">Amount (monthly subscription payment)
          <input className="stack-input" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">Notes (optional)
          <input className="stack-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} disabled={readOnly} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          {readOnly && canEdit && <button type="button" className="btn" onClick={onEdit}>Edit</button>}
          {!readOnly && <button type="submit" className="btn">Save Income</button>}
        </div>
      </form>
    </div>
  );
}
