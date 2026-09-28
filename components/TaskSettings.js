export default function TaskSettings({ users, busy, onDesk, onTaskAdmin, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }} onClick={onClose}>
      <div className="card" style={{ background: 'var(--warm-white)', width: '92%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ marginTop: 0 }}>Task settings</h3>
          <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={onClose}>Close</button>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Desk controls who they can see. Tasks Admin can edit any task, change due dates, import notes, and approve cancellations. A Viewer can still be Tasks Admin and keep other page access.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Desk</th>
                <th>Tasks Admin</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u) => (
                <tr key={u.uid}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select disabled={busy === u.uid} value={u.taskDesk === 'hq' ? 'hq' : 'contractor'} onChange={(e) => onDesk(u.uid, e.target.value)}>
                      <option value="hq">HQ</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        disabled={busy === u.uid || u.role === 'Admin'}
                        checked={!!u.taskAdmin || u.role === 'Admin'}
                        onChange={(e) => onTaskAdmin(u.uid, e.target.checked)}
                      />
                      {u.role === 'Admin' ? 'Admin' : (u.taskAdmin ? 'Yes' : 'No')}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
