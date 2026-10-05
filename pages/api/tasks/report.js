import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { addDays, buildWeeklyReport, monthEnd, monthStart, weekStart, ymd } from '../../../lib/weeklyReport';

function clean(text) {
  return String(text || '').replace(/Imported from meeting notes\.?/gi, '').replace(/Due date set to 1 week\.?/gi, '').replace(/\s+/g, ' ').trim();
}

async function writeSummary(report) {
  const key = process.env.XAI_API_KEY || '';
  if (!key) return { ...report, ai: false };
  const payload = {
    label: report.label,
    person: report.person || 'All',
    counts: report.counts,
    completed: report.sections.completed.map((t) => ({ task: t.task, person: t.person, note: clean(t.note) })),
    inProgress: report.sections.inProgress.map((t) => ({ task: t.task, person: t.person, note: clean(t.note) })),
    waiting: report.sections.waiting,
    overdue: report.sections.overdue.map((t) => ({ task: t.task, person: t.person, deadline: t.deadline, waiting: t.waiting })),
    cancelled: report.sections.cancelled.map((t) => ({ task: t.task, note: clean(t.note) })),
    ahead: report.sections.ahead.map((t) => ({ task: t.task, deadline: t.deadline })),
  };
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || 'grok-4',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Write an operations recap for a boss. Return JSON only. Do not invent facts. Combine related tasks into themes. Strip meeting-import boilerplate. overview is 2-3 sentences. outcomes, progress, attention, and ahead have at most 5 items. waiting is one count line plus at most 2 important callouts. cancelled is omitted if empty.' },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) return { ...report, ai: false, aiError: 'Summary could not be written.' };
  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  try {
    const parsed = JSON.parse(text);
    return { ...report, ai: true, narrative: parsed };
  } catch (err) {
    return { ...report, ai: false };
  }
}

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const today = ymd(new Date());
  const mode = req.query.mode === 'month' ? 'month' : 'week';
  const anchor = String(req.query.date || today).slice(0, 10);
  const start = mode === 'month' ? monthStart(anchor) : weekStart(anchor);
  const end = mode === 'month' ? monthEnd(anchor) : addDays(start, 6);
  const person = String(req.query.person || '');
  const [taskSnap, userSnap] = await Promise.all([
    adminDb.collection('tasks').get(),
    adminDb.collection('users').get(),
  ]);
  const tasks = taskSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const users = userSnap.docs.map((d) => d.data());
  const report = buildWeeklyReport(tasks, { start, end, person, users, mode });
  const written = await writeSummary(report);
  return res.status(200).json(written);
}, { tab: 'tasks' });
