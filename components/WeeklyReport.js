import { useEffect, useState } from 'react';
import { authedFetch } from '../lib/firebaseClient';

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export default function WeeklyReport({ users, onOpenTask }) {
  const [mode, setMode] = useState('week');
  const [date, setDate] = useState(mondayOf());
  const [person, setPerson] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setReport(null);
    const q = new URLSearchParams({ mode, date, person });
    authedFetch(`/api/tasks/report?${q}`).then((r) => r.json()).then((data) => {
      if (data.error) setError(data.error);
      else setReport(data);
    }).catch((e) => setError(e.message));
  }, [mode, date, person]);
  const cards = report ? [
    ['Completed', report.counts.completed],
    ['In Progress', report.counts.inProgress],
    ['Waiting', report.counts.waiting],
    ['Overdue', report.counts.overdue],
    ['Cancelled', report.counts.cancelled],
  ] : [];
  function item(row) {
    return (
      <button key={row.id} type="button" onClick={() => onOpenTask(row.id)} style={{ display: 'block', textAlign: 'left', background: 'transparent', border: 0, padding: '4px 0', cursor: 'pointer' }}>
        <strong>{row.task}</strong> <span className="muted">{row.person}{row.note ? ` — ${row.note}` : ''}</span>
      </button>
    );
  }
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <label className="muted" style={{ fontSize: '0.75rem' }}>Assigned To
          <select value={person} onChange={(e) => setPerson(e.target.value)} style={{ display: 'block', minWidth: 150, marginTop: 4 }}>
            <option value="">All</option>
            {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
          </select>
        </label>
        <label className="muted" style={{ fontSize: '0.75rem' }}>{mode === 'month' ? 'Month' : 'Week of'}
          <input type={mode === 'month' ? 'month' : 'date'} value={mode === 'month' ? date.slice(0, 7) : date} onChange={(e) => setDate(mode === 'month' ? `${e.target.value}-01` : e.target.value)} style={{ display: 'block', marginTop: 4 }} />
        </label>
        <button type="button" className="btn" style={mode === 'week' ? undefined : { background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setMode('week')}>Week</button>
        <button type="button" className="btn" style={mode === 'month' ? undefined : { background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setMode('month')}>Month</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!report && <p className="muted">Loading report...</p>}
      {report && (
        <>
          <div className="muted" style={{ marginBottom: 8 }}>{report.label}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {cards.map(([label, value]) => (
              <div key={label} style={{ border: '1px solid var(--iron)', borderRadius: 6, padding: '8px 12px', minWidth: 90 }}>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.2rem' }}>{value}</div>
              </div>
            ))}
          </div>
          <h3>Weekly Overview</h3>
          <p>{report.sections.overview}</p>
          <h3>Completed / Key Outcomes</h3>
          {report.sections.completed.map(item)}
          {report.sections.completed.length === 0 && <p className="muted">Nothing completed in this period.</p>}
          <h3>In Progress</h3>
          {report.sections.inProgress.map(item)}
          {report.sections.inProgress.length === 0 && <p className="muted">Nothing in progress.</p>}
          <h3>Pending / On Hold</h3>
          {report.sections.waiting.map((g) => (
            <div key={g.reason} style={{ marginBottom: 8 }}>
              <div className="muted">{g.reason}</div>
              {g.tasks.map(item)}
            </div>
          ))}
          {report.sections.waiting.length === 0 && <p className="muted">Nothing waiting.</p>}
          <h3>Overdue / Needs Attention</h3>
          {report.sections.overdue.map(item)}
          {report.sections.overdue.length === 0 && <p className="muted">Nothing overdue.</p>}
          <h3>Cancelled</h3>
          {report.sections.cancelled.map(item)}
          {report.sections.cancelled.length === 0 && <p className="muted">Nothing cancelled.</p>}
          <h3>Looking Ahead</h3>
          {report.sections.ahead.map(item)}
          {report.sections.ahead.length === 0 && <p className="muted">No deadlines in the next week.</p>}
        </>
      )}
    </div>
  );
}
