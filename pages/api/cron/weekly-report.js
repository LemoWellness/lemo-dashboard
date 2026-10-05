import { adminDb } from '../../../lib/firebaseAdmin';
import { buildWeeklyReport, weekStart, addDays, ymd } from '../../../lib/weeklyReport';
import { notifyWeeklyReport } from '../../../lib/notifications';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const secret = process.env.CRON_SECRET || '';
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized.' });
  const today = ymd(new Date());
  const start = weekStart(today);
  const end = addDays(start, 6);
  const [taskSnap, userSnap] = await Promise.all([adminDb.collection('tasks').get(), adminDb.collection('users').get()]);
  const tasks = taskSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const users = userSnap.docs.map((d) => d.data());
  const report = buildWeeklyReport(tasks, { start, end, person: '', users, mode: 'week' });
  await adminDb.collection('weeklyReports').doc(start).set({ ...report, savedAt: new Date().toISOString() });
  const horace = users.find((u) => String(u.name || '').toLowerCase().includes('horace'));
  const email = process.env.WEEKLY_REPORT_EMAIL || (horace && horace.email) || '';
  if (email) {
    await notifyWeeklyReport({ userEmail: email, completed: report.counts.completed, waiting: report.counts.waiting, overdue: report.counts.overdue, label: report.label });
  }
  return res.status(200).json({ ok: true, label: report.label, notified: email || null });
}
