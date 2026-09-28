export default function AddIncomeModal({ venue, form, error, readOnly, canEdit, monthlyFee, onEdit, onChange, onClose, onSubmit }) {
  const months = (Array.isArray(form.periodMonths) && form.periodMonths.length)
    ? form.periodMonths.slice(0, 3)
    : [form.periodMonth || ''].filter(Boolean);
  while (months.length < 1) months.push('');

  function set(field, value) {
    if (readOnly) return;
    onChange({ ...form, [field]: value });
  }

  function setMonths(next) {
    if (readOnly) return;
    const cleaned = next.map((m) => String(m || '').trim()).filter(Boolean).slice(0, 3);
    const unique = [];
    cleaned.forEach((m) => { if (!unique.includes(m)) unique.push(m); });
    unique.sort();
    const fee = Number(monthlyFee) || 0;
    const nextForm = { ...form, periodMonths: unique, periodMonth: unique[0] || '' };
    if (fee > 0) nextForm.amount = String(fee * unique.length);
    onChange(nextForm);
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
        {months.map((month, idx) => (
          <label className="stack-field" key={idx}>
            {idx === 0 ? 'Paying for' : 'Also paying for'}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="month" className="task-date" value={month} required={idx === 0} disabled={readOnly} onChange={(e) => {
                const next = months.slice();
                next[idx] = e.target.value;
                setMonths(next);
              }} />
              {idx > 0 && !readOnly && (
                <button type="button" className="btn btn-ghost" onClick={() => setMonths(months.filter((_, i) => i !== idx))}>Remove</button>
              )}
            </div>
          </label>
        ))}
        {!readOnly && months.length < 3 && (
          <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => setMonths([...months, ''])}>
            + Add another month
          </button>
        )}
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: -4 }}>
          Select every service month this payment covers. Example: June+July.
        </p>
        <label className="stack-field">Amount
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
