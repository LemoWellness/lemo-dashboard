export default function AddPayoutModal({ venue, form, error, readOnly, canEdit, onEdit, onChange, onClose, onSubmit }) {
  function set(field, value) {
    if (readOnly) return;
    onChange({ ...form, [field]: value });
  }
  const title = form.id ? (readOnly ? 'Payment' : 'Edit Payment') : 'Add Payment';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <form className="card" onSubmit={onSubmit} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p className="muted" style={{ marginTop: -8 }}>For: {venue}</p>
        {error && <p className="form-error">{error}</p>}
        <label className="stack-field">Date
          <input type="date" className="task-date" value={form.date} onChange={(e) => set('date', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">Payee
          <select value={form.payee} onChange={(e) => set('payee', e.target.value)} required disabled={readOnly}>
            <option value="">Select...</option>
            <option value="Venue">Venue</option>
            <option value="BD">BD Consultant</option>
          </select>
        </label>
        <label className="stack-field">Amount
          <input className="stack-input" type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required disabled={readOnly} />
        </label>
        <label className="stack-field">How Paid
          <input className="stack-input" value={form.howPaid} onChange={(e) => set('howPaid', e.target.value)} disabled={readOnly} placeholder="e.g. ACH, Check, Wire" />
        </label>
        <label className="stack-field">Notes (optional)
          <input className="stack-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} disabled={readOnly} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          {readOnly && canEdit && <button type="button" className="btn" onClick={onEdit}>Edit</button>}
          {!readOnly && <button type="submit" className="btn">Save Payment</button>}
        </div>
      </form>
    </div>
  );
}
