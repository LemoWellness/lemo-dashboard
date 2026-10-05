import { useEffect, useState } from 'react';
import { authedFetch } from '../lib/firebaseClient';

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}
function themes(rows) {
  const words = rows.map((t) => String(t.task || '').split(/[-–:]/)[0].trim()).filter(Boolean).slice(0, 3);
  return words.join(', ');
}

export default function WeeklyReport({ users, onOpenTask }) {
  const [mode, setMode] = useState('week');
  const [date, setDate] = useState(mondayOf());
  const [person, setPerson] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  useEffect(() => {
    setReport(null);
    const q = new URLSearchParams({ mode, date, person });
    authedFetch(`/api/tasks/report?${q}`).then((r) => r.json()).then((data) => {
      if (data.error) setError(data.error);
      else setReport(data);
    }).catch((e) => setError(e.message));
  }, [mode, date, person]);
  if (!report) return <div className="card">{error ? <p className="form-error">{error}</p> : <p className="muted">Loading report...</p>}</div>;
  const story = report.narrative || {};
  const c = report.counts;
  const fallback = {
    overview: c.completed ? `${c.completed} tasks were completed. Work covered ${themes(report.sections.completed) || 'the open list'}.` : 'No tasks were marked done in this period.',
    outcomes: c.completed ? `Completed work included ${themes(report.sections.completed)}.` : 'Nothing was completed in this period.',
    progress: c.inProgress ? `Current work is centered on ${themes(report.sections.inProgress)}.` : 'Nothing is in progress.',
    waiting: c.waiting ? `${c.waiting} items are waiting on outside information or action.` : 'Nothing is waiting.',
    attention: c.overdue ? `${c.overdue} items are overdue and may need a follow-up.` : 'Nothing needs a decision.',
    cancelled: c.cancelled ? `${c.cancelled} task${c.cancelled === 1 ? ' was' : 's were'} cancelled.` : '',
    ahead: report.sections.ahead.length ? `Upcoming priorities include ${themes(report.sections.ahead)}.` : 'No upcoming deadlines.',
  };
  const text = {
    overview: story.overview || fallback.overview,
    outcomes: story.outcomes || fallback.outcomes,
    progress: story.progress || fallback.progress,
    waiting: story.waiting || fallback.waiting,
    attention: story.attention || fallback.attention,
    cancelled: story.cancelled || fallback.cancelled,
    ahead: story.ahead || fallback.ahead,
  };
  const cards = [['Completed', c.completed], ['In Progress', c.inProgress], ['Waiting', c.waiting], ['Overdue', c.overdue], ['Cancelled', c.cancelled]];
  function section(title, body, rows) {
    if (!body) return null;
    const shown = open === title;
    return (
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 6 }}>{title}</h3>
        <p style={{ marginTop: 0 }}>{body} {rows && rows.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setOpen(shown ? '' : title)}>View details</button>}</p>
        {shown && rows.map((row) => (
          <button key={row.id} type="button" onClick={() => onOpenTask(row.id)} style={{ display: 'block', background: 'transparent', border: 0, padding: '2px 0', textAlign: 'left', cursor: 'pointer' }}>{row.task}</button>
        ))}
      </div>
    );
  }
  const waitingRows = report.sections.waiting.flatMap((g) => g.tasks);
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
      <div className="muted" style={{ marginBottom: 8 }}>{report.label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {cards.map(([label, value]) => <div key={label} style={{ border: '1px solid var(--iron)', borderRadius: 6, padding: '8px 12px', minWidth: 90 }}><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: '1.2rem' }}>{value}</div></div>)}
      </div>
      {section('Weekly Overview', text.overview)}
      {section('Key Outcomes', text.outcomes, report.sections.completed)}
      {section('In Progress', text.progress, report.sections.inProgress)}
      {section('Waiting / On Hold', text.waiting, waitingRows)}
      {section('Needs Attention', text.attention, report.sections.overdue)}
      {section('Cancelled', text.cancelled, report.sections.cancelled)}
      {section('Looking Ahead', text.ahead, report.sections.ahead)}
    </div>
  );
}
