import { useEffect, useState } from 'react';
import { authedFetch } from '../lib/firebaseClient';

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}
function clean(text) {
  return String(text || '').replace(/Imported from meeting notes\.?/gi, '').replace(/Due date set to 1 week\.?/gi, '').replace(/\s+/g, ' ').trim();
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
  const outcomes = story.outcomes || report.sections.completed.slice(0, 5).map((t) => ({ title: t.task, detail: clean(t.note), ids: [t.id] }));
  const smaller = Math.max(0, report.sections.completed.length - outcomes.length);
  const progress = story.progress || report.sections.inProgress.slice(0, 5).map((t) => ({ title: t.task, detail: clean(t.note), ids: [t.id] }));
  const attention = story.attention || report.sections.overdue.slice(0, 5).map((t) => ({ title: t.task, detail: t.waiting || 'Overdue', ids: [t.id] }));
  const ahead = story.ahead || report.sections.ahead.slice(0, 5).map((t) => ({ title: t.task, detail: t.deadline, ids: [t.id] }));
  const waitingLine = story.waiting || `${report.counts.waiting} waiting`;
  const cards = [['Completed', report.counts.completed], ['In Progress', report.counts.inProgress], ['Waiting', report.counts.waiting], ['Overdue', report.counts.overdue], ['Cancelled', report.counts.cancelled]];
  function lines(rows, key) {
    return rows.slice(0, 5).map((row, i) => (
      <div key={`${key}-${i}`} style={{ marginBottom: 8 }}>
        <button type="button" onClick={() => { if (row.ids && row.ids[0]) onOpenTask(row.ids[0]); setOpen(open === `${key}-${i}` ? '' : `${key}-${i}`); }} style={{ background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}>
          <strong>{row.title || row.task}</strong>
        </button>
        {row.detail && <div className="muted" style={{ fontSize: '0.85rem' }}>{row.detail}</div>}
      </div>
    ));
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
      <div className="muted" style={{ marginBottom: 8 }}>{report.label}{report.ai ? '' : ' · add XAI_API_KEY on Vercel for the written summary'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {cards.map(([label, value]) => <div key={label} style={{ border: '1px solid var(--iron)', borderRadius: 6, padding: '8px 12px', minWidth: 90 }}><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: '1.2rem' }}>{value}</div></div>)}
      </div>
      <h3>Weekly Overview</h3>
      <p>{story.overview || report.sections.overview}</p>
      <h3>Key Outcomes</h3>
      {lines(outcomes, 'done')}
      {smaller > 0 && <p className="muted">{smaller} smaller tasks completed.</p>}
      <h3>In Progress</h3>
      {lines(progress, 'progress')}
      <h3>Waiting / On Hold</h3>
      <p>{waitingLine}</p>
      <h3>Needs Attention</h3>
      {attention.length ? lines(attention, 'attention') : <p className="muted">Nothing needs a decision.</p>}
      {report.counts.cancelled > 0 && <><h3>Cancelled</h3>{lines(report.sections.cancelled.map((t) => ({ title: t.task, detail: clean(t.note), ids: [t.id] })), 'cancel')}</>}
      <h3>Looking Ahead</h3>
      {ahead.length ? lines(ahead, 'ahead') : <p className="muted">No upcoming deadlines.</p>}
    </div>
  );
}
