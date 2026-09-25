export default function AddExpenseModal({ venue, form, error, onChange, onClose, onSubmit }) {
  function set(field, value) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Add Expense</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label className="stack-field">Date
          <input type="date" className="task-date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <label className="stack-field">Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)} required>
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
          <input className="stack-input" value={form.item} onChange={(e) => set('item', e.target.value)} />
        </label>
        <label className="stack-field">Description
          <input className="stack-input" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label className="stack-field">Source / Vendor
          <input className="stack-input" value={form.source} onChange={(e) => set('source', e.target.value)} />
        </label>
        <div className="form-grid-2" style={{ marginBottom: 12 }}>
          <label className="stack-field">Quantity
            <input className="stack-input" type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </label>
          <label className="stack-field">Cost / Unit
            <input className="stack-input" type="number" value={form.costPerUnit} onChange={(e) => set('costPerUnit', e.target.value)} />
          </label>
        </div>
        <label className="stack-field">Notes (optional)
          <input className="stack-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save Expense</button>
        </div>
      </form>
    </div>
  );
}
