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
    completed: report.sections.completed.map((t) => ({ task: t.task, note: clean(t.note) })),
    inProgress: report.sections.inProgress.map((t) => ({ task: t.task, note: clean(t.note) })),
    waiting: report.sections.waiting.map((g) => ({ reason: g.reason, count: g.tasks.length })),
    overdue: report.sections.overdue.map((t) => ({ task: t.task, waiting: t.waiting })),
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
        { role: 'system', content: 'Write a one-screen operations recap. Return JSON only with string fields: overview, outcomes, progress, waiting, attention, cancelled, ahead. Each field is 1-2 sentences of prose. overview may be 2-3 sentences. Do not list task names. Combine related work into themes. Do not invent facts. Leave cancelled empty if none.' },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) return { ...report, ai: false };
  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  try {
    return { ...report, ai: true, narrative: JSON.parse(text) };
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
  return res.status(200).json(await writeSummary(report));
}, { tab: 'tasks' });
