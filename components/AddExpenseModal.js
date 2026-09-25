export default function AddExpenseModal({ venue, form, error, readOnly, canEdit, onEdit, onChange, onClose, onSubmit }) {
  function set(field, value) {
    if (readOnly) return;
    onChange({ ...form, [field]: value });
  }
  const title = form.id ? (readOnly ? 'Expense' : 'Edit Expense') : 'Add Expense';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label className="stack-field">Date
          <input type="date" className="task-date" value={form.date} onChange={(e) => set('date', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)} required disabled={readOnly}>
            <option value="">Select...</option>
            <option>Installation</option>
            <option>Maintenance</option>
            <option>Shipping</option>
            <option>Payout to Venue</option>
            <option>Payout to BD</option>
            <option>Payout to BD Consultants</option>
            <option>Other</option>
          </select>
        </label>
        <label className="stack-field">Item
          <input className="stack-input" value={form.item} onChange={(e) => set('item', e.target.value)} disabled={readOnly} />
        </label>
        <label className="stack-field">Description
          <input className="stack-input" value={form.description} onChange={(e) => set('description', e.target.value)} disabled={readOnly} />
        </label>
        <label className="stack-field">Source / Vendor
          <input className="stack-input" value={form.source} onChange={(e) => set('source', e.target.value)} disabled={readOnly} />
        </label>
        <div className="form-grid-2" style={{ marginBottom: 12 }}>
          <label className="stack-field">Quantity
            <input className="stack-input" type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} disabled={readOnly} />
          </label>
          <label className="stack-field">Cost / Unit
            <input className="stack-input" type="number" value={form.costPerUnit} onChange={(e) => set('costPerUnit', e.target.value)} disabled={readOnly} />
          </label>
        </div>
        <label className="stack-field">Notes (optional)
          <input className="stack-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} disabled={readOnly} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          {readOnly && canEdit && <button type="button" className="btn" onClick={onEdit}>Edit</button>}
          {!readOnly && <button type="submit" className="btn">Save Expense</button>}
        </div>
      </form>
    </div>
  );
}
