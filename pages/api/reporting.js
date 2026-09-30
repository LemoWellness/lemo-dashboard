// Reporting. Reads dailyRawData + projects. Session mix from usageRawData.
import { adminDb } from '../../lib/firebaseAdmin';
import { withAuth } from '../../lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftMonthKey(monthKey, delta) {
  const [y, m] = String(monthKey || '').split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
