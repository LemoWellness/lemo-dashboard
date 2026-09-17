import { runDueNotificationSweep } from '../../../lib/notifications';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const secret = process.env.CRON_SECRET || '';
  const header = req.headers.authorization || '';
  if (!secret || header !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
    const result = await runDueNotificationSweep();
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Cron failed.' });
  }
}
