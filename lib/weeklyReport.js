export const HOLD_REASONS = ['Waiting on client', 'Waiting on vendor', 'Waiting on management', 'Waiting on team', 'Scheduling', 'Budget/approval', 'Other'];

export function ymd(date, timeZone = 'America/Los_Angeles') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(ymdValue, days) {
  const [y, m, d] = String(ymdValue).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function weekday(ymdValue) {
  const [y, m, d] = String(ymdValue).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export function weekStart(ymdValue) {
  const day = weekday(ymdValue);
  return addDays(ymdValue, -(day === 0 ? 6 : day - 1));
}
export function monthStart(ymdValue) {
  return `${String(ymdValue).slice(0, 7)}-01`;
}
export function monthEnd(ymdValue) {
  const [y, m] = String(ymdValue).split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
function labelRange(start, end) {
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const a = new Date(`${start}T12:00:00Z`).toLocaleDateString('en-US', opts);
  const b = new Date(`${end}T12:00:00Z`).toLocaleDateString('en-US', opts);
  return `${a}–${b}`;
}
function email(value) {
  return String(value || '').toLowerCase().trim();
}
function personName(task, users) {
  const who = email(task.assignedTo);
  const match = (users || []).find((u) => email(u.email) === who);
  return match ? match.name : (task.assignedTo || 'Unassigned');
}
function outcome(task) {
  return String(task.completionOutcome || '').trim();
}
function sentence(items, empty) {
  const list = items.filter(Boolean);
  if (!list.length) return empty;
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export function buildWeeklyReport(tasks, { start, end, person, users, mode }) {
  const mine = email(person);
  const inRange = (value) => {
    const day = String(value || '').slice(0, 10);
    return day && day >= start && day <= end;
  };
  const include = (task) => !mine || email(task.assignedTo) === mine;
  const rows = (tasks || []).filter(include);
  const finishedOn = (t) => {
    if (t.completedAt) return String(t.completedAt);
    const updates = Array.isArray(t.updates) ? t.updates : [];
    const hit = [...updates].reverse().find((u) => /Status changed to Done/i.test(String(u.text || '')));
    return hit ? String(hit.at || '') : '';
  };
  const done = rows.filter((t) => t.status === 'Done' && inRange(finishedOn(t)));
  const cancelled = rows.filter((t) => t.status === 'Cancelled' && inRange(t.cancelledAt || t.cancelRequestedAt || t.timestamp));
  const waiting = rows.filter((t) => t.status === 'On Hold' || t.status === 'Pending');
  const open = rows.filter((t) => !['Done', 'Cancelled', 'Cancel Requested', 'On Hold', 'Pending'].includes(t.status));
  const overdue = open.filter((t) => t.deadline && t.deadline < end);
  const moving = open.filter((t) => !overdue.includes(t));
  const ahead = rows.filter((t) => t.deadline && t.deadline > end && t.deadline <= addDays(end, 7) && !['Done', 'Cancelled'].includes(t.status));
  const who = mine ? personName({ assignedTo: person }, users) : 'the team';
  const doneBits = done.slice(0, 4).map((t) => outcome(t) ? `${t.task}: ${outcome(t)}` : t.task);
  const overview = done.length
    ? `${done.length} task${done.length === 1 ? ' was' : 's were'} completed for ${who}. ${sentence(doneBits, 'No outcome notes were added.')}`
    : `No tasks were marked done for ${who} in this period.`;
  const waitingGroups = HOLD_REASONS.map((reason) => ({
    reason,
    tasks: waiting.filter((t) => t.holdReason === reason),
  })).filter((g) => g.tasks.length);
  const missing = waiting.filter((t) => !t.holdReason);
  if (missing.length) waitingGroups.push({ reason: 'No reason given', tasks: missing });
  const card = (t) => ({ id: t.id, task: t.task, person: personName(t, users), note: outcome(t) || t.notes || t.cancelReason || '', deadline: t.deadline || '', waiting: t.holdReason || '' });
  return {
    mode, start, end, label: labelRange(start, end), person: person || '',
    counts: { completed: done.length, inProgress: moving.length, waiting: waiting.length, overdue: overdue.length, cancelled: cancelled.length },
    sections: {
      overview,
      completed: done.map(card),
      inProgress: moving.map(card),
      waiting: waitingGroups.map((g) => ({ reason: g.reason, tasks: g.tasks.map(card) })),
      overdue: overdue.map(card),
      cancelled: cancelled.map(card),
      ahead: ahead.map(card),
    },
  };
}
