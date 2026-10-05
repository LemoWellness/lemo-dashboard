import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { addDays, buildWeeklyReport, monthEnd, monthStart, weekStart, ymd } from '../../../lib/weeklyReport';

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
  return res.status(200).json(report);
}, { tab: 'tasks' });
