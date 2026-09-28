import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { notifyTaskAssigned } from '../../../lib/notifications';

function isTaskAdmin(session) {
  return session.role === 'Admin' || !!session.taskAdmin || session.role === 'Tasks Admin';
}

function weekFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9@.\s-]/g, ' ').split(/\s+/).filter(Boolean);
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
  for (const raw of names || []) {
    const ntoks = tokens(raw);
    if (!ntoks.length) continue;
    const exact = users.find((u) => tokens(u.name).join(' ') === ntoks.join(' ') || String(u.email || '').toLowerCase() === String(raw).toLowerCase());
    if (exact) return exact;
    const first = ntoks[0];
    const hits = users.filter((u) => {
      const ut = tokens(u.name);
      const email = String(u.email || '').toLowerCase();
      return ut[0] === first || ut.includes(first) || email.split('@')[0] === first || email.startsWith(first + '.');
    });
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) {
      return hits.find((u) => tokens(u.name).length === 1) || hits[0];
    }
  }
  return null;
}

function matchPeople(names, users) {
  const hits = [];
  const leftover = [];
  let pool = users.slice();
  for (const raw of names || []) {
    const user = matchUser([raw], pool);
    if (user) {
      hits.push(user);
      const email = String(user.email || '').toLowerCase();
      pool = pool.filter((u) => String(u.email || '').toLowerCase() !== email);
    } else leftover.push(raw);
  }
  return { hits, leftover };
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

  if (req.body && req.body.create && Array.isArray(req.body.items) && req.body.items.length) {
    const deadline = weekFromNow();
    const created = [];
    for (const row of req.body.items) {
      const assignedTo = String(row.assignedTo || '').toLowerCase();
      const assignedTo2 = String(row.assignedTo2 || '').toLowerCase();
      const second = assignedTo2 && assignedTo2 !== assignedTo ? assignedTo2 : '';
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
        assignedTo2: second,
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
        if (second) await notifyTaskAssigned({ taskId: docRef.id, assignedTo: second, taskName: task, dueDate: due });
      } catch (err) {
        console.error('Assignment notification failed', err);
      }
      created.push(docRef.id);
    }
    if (!created.length) return res.status(400).json({ error: 'No tasks created. Assign each task to a user first.' });
    return res.status(200).json({ success: true, created: created.length, ids: created });
  }

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
    const { hits, leftover } = matchPeople(item.names, users);
    const first = hits[0];
    const second = hits[1];
    const extra = leftover.join(', ');
    const notes = [item.body, extra ? `Also mentioned: ${extra}` : '', 'Imported from meeting notes. Due date set to 1 week.'].filter(Boolean).join(' ');
    return {
      key: String(i),
      task: item.title,
      assignedTo: first ? String(first.email || '').toLowerCase() : '',
      assignedName: first ? (first.name || first.email) : item.names[0] || '',
      assignedTo2: second ? String(second.email || '').toLowerCase() : '',
      assignedName2: second ? (second.name || second.email) : '',
      unmatched: !first,
      deadline,
      notes,
    };
  });

  return res.status(200).json({ items: preview, deadline });
}, { tab: 'tasks' });
