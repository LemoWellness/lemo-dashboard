import { requireSession } from '../../lib/auth';

export default async function handler(req, res) {
  try {
    const session = await requireSession(req);
    res.status(200).json(session);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
