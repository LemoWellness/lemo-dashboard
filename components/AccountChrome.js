export default function AccountChrome({ selected, isAdmin, onBack, onEdit, onNote, onIncome, onExpense }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>{String.fromCharCode(0x2190)} Back</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={onNote}>+ Communication Log</button>
          {isAdmin && selected.businessModel === 'Corporate Wellness' && <button type="button" className="btn" onClick={onIncome}>+ Add Income</button>}
          {isAdmin && <button type="button" className="btn" onClick={onExpense}>+ Add Expense</button>}
        </div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{selected.name}</h2>
          {isAdmin && <button type="button" className="btn btn-ghost" onClick={onEdit}>Edit Company</button>}
        </div>
        <div className="grid-3">
          <div>
            <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Install Date</div>
            <div>{selected.goLiveDate || '-'}</div>
            <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginTop: 12 }}>Address</div>
            <div>{selected.streetAddress}<br />{selected.city}, {selected.state} {selected.zipCode}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Contact</div>
            <div>{selected.customerContactName || '-'}</div>
            <div className="muted">{selected.customerContactPhone}</div>
            <div className="muted">{selected.customerContactEmail}</div>
            {selected.contact2Name ? (
              <>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginTop: 12 }}>Additional Contact</div>
                <div>{selected.contact2Name}</div>
                <div className="muted">{selected.contact2Phone}</div>
                <div className="muted">{selected.contact2Email}</div>
              </>
            ) : (isAdmin && <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={onEdit}>+ Add Contact</button>)}
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>BD Consultant</div>
            <div>{selected.bdConsultantName || '-'}</div>
            <div className="muted">{selected.bdConsultantPhone}</div>
            <div className="muted">{selected.bdConsultantEmail}</div>
            <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginTop: 12 }}>Chairs</div>
            <div>{selected.numberOfChairs != null && selected.numberOfChairs !== '' ? selected.numberOfChairs : '-'}</div>
          </div>
        </div>
      </div>
    </>
  );
}
