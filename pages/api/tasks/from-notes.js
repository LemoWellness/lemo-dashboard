import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { notifyTaskAssigned } from '../../../lib/notifications';

function isTaskAdmin(session) {
  return session.role === 'Admin' || session.role === 'Tasks Admin';
}

function weekFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseNextSteps(raw) {
  const text = String(raw || '').replace(/\r/g, '\n');
  const start = text.search(/next steps/i);
  let block = start >= 0 ? text.slice(start) : text;
  const end = block.search(/\n\s*details\b/i);
  if (end > 0) block = block.slice(0, end);
  const items = [];
  const re = /\[([^\]]+)\]\s*([^:\n]{1,80}):\s*([\s\S]*?)(?=\n\s*\[[^\]]+\]\s*[^:\n]{1,80}:|\s*$)/gi;
  let m;
  while ((m = re.exec(block))) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    const title = String(m[2] || '').trim();
    const body = String(m[3] || '').replace(/\s+/g, ' ').trim();
    if (!title) continue;
    items.push({ names, title, body });
  }
  return items;
}

function matchUser(names, users) {
  const first = String(names[0] || '').toLowerCase();
  if (!first) return null;
  const exact = users.find((u) => String(u.name || '').toLowerCase() === first || String(u.email || '').toLowerCase() === first);
  if (exact) return exact;
  const last = first.split(/\s+/).pop();
  return users.find((u) => String(u.name || '').toLowerCase().includes(last) || String(u.email || '').toLowerCase().includes(last)) || null;
}

async function extractText(body) {
  if (body.text) return String(body.text);
  const b64 = String(body.base64 || '');
  const filename = String(body.filename || '').toLowerCase();
  if (!b64) return '';
  const buf = Buffer.from(b64, 'base64');
  if (filename.endsWith('.pdf') || buf.slice(0, 4).toString() === '%PDF') {
    const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'));
    const parsed = await pdfParse(buf);
    return String(parsed.text || '');
  }
  return buf.toString('utf8');
}

export default withAuth(async (req, res, session) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!isTaskAdmin(session)) return res.status(403).json({ error: 'Only an Admin or Tasks Admin can import meeting notes.' });

  let text;
  try {
    text = await extractText(req.body || {});
  } catch (err) {
    return res.status(400).json({ error: 'Could not read that file. Paste the Next steps text instead.' });
  }
  const parsed = parseNextSteps(text);
  if (!parsed.length) {
    return res.status(400).json({ error: 'No Next steps found. Use a Gemini notes file or paste the Next steps section.' });
  }

  const snap = await adminDb.collection('users').where('active', '==', true).get();
  const users = snap.docs.map((d) => d.data());
  const deadline = weekFromNow();
  const preview = parsed.map((item, i) => {
    const user = matchUser(item.names, users);
    const extra = item.names.slice(1).join(', ');
    const notes = [item.body, extra ? `Also with: ${extra}` : '', 'Imported from meeting notes. Due date set to 1 week.'].filter(Boolean).join(' ');
    return {
      key: String(i),
      task: item.title,
      assignedTo: user ? String(user.email || '').toLowerCase() : '',
      assignedName: user ? (user.name || user.email) : item.names[0] || '',
      unmatched: !user,
      deadline,
      notes,
    };
  });

  if (req.body && req.body.create) {
    const selected = Array.isArray(req.body.items) && req.body.items.length ? req.body.items : preview.filter((p) => p.assignedTo);
    const created = [];
    for (const row of selected) {
      const assignedTo = String(row.assignedTo || '').toLowerCase();
      const task = String(row.task || '').trim();
      if (!assignedTo || !task) continue;
      const due = String(row.deadline || deadline);
      const notes = String(row.notes || '');
      const updates = notes ? [{
        id: `u-${Date.now()}-${created.length}`,
        at: new Date().toISOString(),
        by: session.email,
        byName: session.name || session.email,
        text: notes,
        kind: 'note',
      }] : [];
      const docRef = await adminDb.collection('tasks').add({
        timestamp: new Date().toISOString(),
        addedBy: session.email,
        assignedTo,
        task,
        deadline: due,
        priority: 'Medium',
        status: 'Not Started',
        notes,
        updates,
        calendarEventId: '',
        source: 'meeting-notes',
      });
      try {
        await notifyTaskAssigned({ taskId: docRef.id, assignedTo, taskName: task, dueDate: due });
      } catch (err) {
        console.error('Assignment notification failed', err);
      }
      created.push(docRef.id);
    }
    return res.status(200).json({ success: true, created: created.length, ids: created, deadline });
  }

  return res.status(200).json({ items: preview, deadline });
}, { tab: 'tasks' });
