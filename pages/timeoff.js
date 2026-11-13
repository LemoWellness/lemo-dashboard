import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const TYPES = ['Vacation / PTO', 'Personal', 'Sick', 'Other'];

function ymd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}
function todayYmd() {
  return ymd(new Date());
}
function addDays(ymdStr, n) {
  const [y, m, d] = String(ymdStr).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function startOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 1));
}
function monthLabel(year, month) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function shortName(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  return parts[0] || name;
}
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function formatRange(start, end) {
  if (!start) return '';
  if (!end || start === end) {
    const d = new Date(start + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) return `${a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${b.getDate()}`;
  return `${a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
function inRange(day, start, end) {
  return day >= start && day <= end;
}
function weekDays(ymdStr) {
  const [y, m, d] = String(ymdStr).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const start = addDays(ymdStr, -day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export default function TimeOff() {
  const router = useRouter();
  const { session } = useAuth();
  const isAdmin = session?.role === 'Admin';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(todayYmd());
  const [showRequest, setShowRequest] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({ startDate: todayYmd(), endDate: todayYmd(), type: 'Vacation / PTO', note: '' });
  const [recordForm, setRecordForm] = useState({ userEmail: '', userName: '', startDate: todayYmd(), endDate: todayYmd(), type: 'Vacation / PTO', note: '' });
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'usage' || code === 'daily' || code === 'reporting') return router.push('/reporting');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
    if (code === 'opportunities') return router.push('/opportunities');
  }

  function load() {
    setLoading(true);
    authedFetch('/api/timeoff')
      .then((r) => r.json())
      .then((d) => { setRequests(d.requests || []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => {
    if (!isAdmin) return;
    authedFetch('/api/assignable-users').then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(() => {});
  }, [isAdmin]);

  const approved = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests]);
  const myRequests = useMemo(() => {
    const me = String(session?.email || '').toLowerCase();
    return requests.filter((r) => String(r.userEmail || '').toLowerCase() === me).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [requests, session]);
  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  const today = todayYmd();
  const outToday = useMemo(() => approved.filter((r) => inRange(today, r.startDate, r.endDate)), [approved, today]);
  const thisWeek = useMemo(() => {
    const days = weekDays(today);
    const names = new Set();
    approved.forEach((r) => {
      if (days.some((d) => inRange(d, r.startDate, r.endDate))) names.add(r.userName);
    });
    return [...names];
  }, [approved, today]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const startPad = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const names = approved
        .filter((r) => inRange(key, r.startDate, r.endDate))
        .map((r) => shortName(r.userName))
        .filter(Boolean);
      cells.push({ day: d, key, names: [...new Set(names)] });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth, approved]);

  const dayPeople = useMemo(() => {
    return approved.filter((r) => inRange(selectedDay, r.startDate, r.endDate));
  }, [approved, selectedDay]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }
  function goToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(todayYmd());
  }

  async function submitRequest(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await authedFetch('/api/timeoff', { method: 'POST', body: JSON.stringify(form) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setShowRequest(false);
    setForm({ startDate: todayYmd(), endDate: todayYmd(), type: 'Vacation / PTO', note: '' });
    load();
  }
  async function submitRecord(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await authedFetch('/api/timeoff', { method: 'POST', body: JSON.stringify({ ...recordForm, office: true }) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setShowRecord(false);
    setRecordForm({ userEmail: '', userName: '', startDate: todayYmd(), endDate: todayYmd(), type: 'Vacation / PTO', note: '' });
    load();
  }
  async function doAction(id, action, note) {
    setBusy(true);
    await authedFetch(`/api/timeoff/${id}`, { method: 'PATCH', body: JSON.stringify({ action, note }) });
    setBusy(false);
    setReviewing(null);
    setReviewNote('');
    load();
  }

  const selectedLabel = new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <Layout active="timeoff" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Time Off</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isAdmin && <button className="btn btn-ghost" type="button" onClick={() => setShowRecord(true)}>Record time off</button>}
          <button className="btn" type="button" onClick={() => setShowRequest(true)}>+ Request time off</button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      {!loading && (
        <>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted" style={{ fontSize: '0.75rem' }}>Out today</div>
              <div style={{ marginTop: 4, fontWeight: 500 }}>{outToday.length ? outToday.map((r) => r.userName).join(', ') : 'Nobody'}</div>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted" style={{ fontSize: '0.75rem' }}>Out this week</div>
              <div style={{ marginTop: 4, fontWeight: 500 }}>{thisWeek.length ? thisWeek.join(', ') : 'Nobody'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 16 }} className="timeoff-layout">
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{monthLabel(viewYear, viewMonth)}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost" type="button" onClick={prevMonth} style={{ padding: '6px 10px' }}>{'<'}</button>
                  <button className="btn btn-ghost" type="button" onClick={goToday} style={{ padding: '6px 10px' }}>Today</button>
                  <button className="btn btn-ghost" type="button" onClick={nextMonth} style={{ padding: '6px 10px' }}>{'>'}</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: '0.75rem', color: 'var(--ash)', marginBottom: 6 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {calendarDays.map((cell, i) => {
                  if (!cell) return <div key={i} />;
                  const isToday = cell.key === today;
                  const isSel = cell.key === selectedDay;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDay(cell.key)}
                      style={{
                        minHeight: 64,
                        border: isSel ? '2px solid var(--ember)' : '1px solid var(--iron)',
                        borderRadius: 4,
                        background: isToday ? '#f8f1ea' : '#fff',
                        padding: 4,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: isToday ? 500 : 400 }}>{cell.day}</div>
                      <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {cell.names.slice(0, 2).map((n) => (
                          <span key={n} style={{ background: '#e8f0fe', color: '#1a4b8c', borderRadius: 99, padding: '1px 6px', fontSize: '0.65rem' }}>{n}</span>
                        ))}
                        {cell.names.length > 2 && <span style={{ fontSize: '0.65rem', color: 'var(--ash)' }}>+{cell.names.length - 2}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted" style={{ fontSize: '0.75rem' }}>Who's out</div>
              <h3 style={{ margin: '4px 0 12px' }}>{selectedLabel}</h3>
              {dayPeople.length === 0 && <p className="muted" style={{ margin: 0 }}>Nobody out.</p>}
              {dayPeople.map((r) => (
                <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 99, background: '#e8f0fe', color: '#1a4b8c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 500 }}>{initials(r.userName)}</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.userName}</div>
                    <div className="muted" style={{ fontSize: '0.75rem' }}>{r.type} · All day</div>
                  </div>
                </div>
              ))}
              {isAdmin && pending.length > 0 && (
                <>
                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--iron)' }} />
                  <h3 style={{ margin: '0 0 12px' }}>Pending approvals ({pending.length})</h3>
                  {pending.map((r) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--iron)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.userName}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>{formatRange(r.startDate, r.endDate)}</div>
                      </div>
                      <button className="btn btn-ghost" type="button" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setReviewing(r); setReviewNote(''); }}>Review</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>My requests</h3>
            {myRequests.length === 0 && <p className="muted" style={{ margin: 0 }}>No requests yet.</p>}
            {myRequests.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--iron)' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{r.type}</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>{formatRange(r.startDate, r.endDate)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: '0.7rem',
                    background: r.status === 'approved' ? '#e6f4ea' : r.status === 'denied' ? '#fdeceb' : r.status === 'cancelled' ? '#eee' : '#f1e6d8',
                    color: r.status === 'approved' ? '#1e7e34' : r.status === 'denied' ? 'var(--ember-muted)' : 'var(--charcoal)',
                  }}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
                  {r.status === 'pending' && <button className="btn btn-ghost" type="button" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => doAction(r.id, 'withdraw')}>Withdraw</button>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={submitRequest} style={{ width: '90%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Request time off</h3>
            <label className="stack-field">Start<input type="date" className="stack-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
            <label className="stack-field">End<input type="date" className="stack-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></label>
            <label className="stack-field">Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="stack-field">Note (optional)<textarea className="stack-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Submit request'}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowRequest(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showRecord && isAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={submitRecord} style={{ width: '90%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Record time off</h3>
            <label className="stack-field">Person
              <select value={recordForm.userEmail} onChange={(e) => {
                const u = users.find((x) => x.email === e.target.value);
                setRecordForm({ ...recordForm, userEmail: e.target.value, userName: u ? u.name : '' });
              }} required>
                <option value="">Select...</option>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </label>
            <label className="stack-field">Start<input type="date" className="stack-input" value={recordForm.startDate} onChange={(e) => setRecordForm({ ...recordForm, startDate: e.target.value })} required /></label>
            <label className="stack-field">End<input type="date" className="stack-input" value={recordForm.endDate} onChange={(e) => setRecordForm({ ...recordForm, endDate: e.target.value })} required /></label>
            <label className="stack-field">Type
              <select value={recordForm.type} onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="stack-field">Note (optional)<textarea className="stack-input" value={recordForm.note} onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Record'}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowRecord(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {reviewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '90%', maxWidth: 420 }}>
            <h3 style={{ marginTop: 0 }}>Review request</h3>
            <p style={{ margin: '0 0 8px' }}><strong>{reviewing.userName}</strong></p>
            <p className="muted" style={{ margin: '0 0 12px' }}>{reviewing.type} · {formatRange(reviewing.startDate, reviewing.endDate)}</p>
            {reviewing.note && <p style={{ margin: '0 0 12px' }}>{reviewing.note}</p>}
            <label className="stack-field">Note (optional)<textarea className="stack-input" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" type="button" disabled={busy} onClick={() => doAction(reviewing.id, 'approve', reviewNote)}>Approve</button>
              <button className="btn" type="button" style={{ background: 'var(--ember-muted)' }} disabled={busy} onClick={() => doAction(reviewing.id, 'deny', reviewNote)}>Deny</button>
              <button className="btn btn-ghost" type="button" onClick={() => setReviewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          .timeoff-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
