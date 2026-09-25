import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { notifyTaskAssigned, notifyCancelRequested, notifyCancelApproved, notifyCancelDenied } from '../../../lib/notifications';

function emailOf(session) {
  return String(session.email || '').toLowerCase();
}
function isCreator(session, task) {
  return emailOf(session) === String(task.addedBy || '').toLowerCase();
}
function isAssignee(session, task) {
  return emailOf(session) === String(task.assignedTo || '').toLowerCase();
}
function canEditFields(session, task) {
  return session.role === 'Admin' || isCreator(session, task);
}
function canWork(session, task) {
  return canEditFields(session, task) || isAssignee(session, task);
}
function history(task) {
  if (Array.isArray(task.updates) && task.updates.length) return task.updates;
  const legacy = String(task.notes || '').trim();
  if (!legacy) return [];
  return [{
    id: 'legacy-notes',
    at: task.timestamp || new Date().toISOString(),
    by: task.addedBy || '',
    byName: task.addedBy || '',
    text: legacy,
    kind: 'note',
  }];
}

export default withAuth(async (req, res, session) => {
  const ref = adminDb.collection('tasks').doc(String(req.query.id));
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Task not found.' });
  const task = doc.data();

  if (req.method === 'PATCH') {
    const { status, assignedTo, task: taskText, deadline, priority, notes, addUpdate, cancelRequest, cancelDecision } = req.body || {};
    const editingFields = assignedTo !== undefined || taskText !== undefined || deadline !== undefined || priority !== undefined || notes !== undefined;

    if (cancelRequest) {
      if (!isAssignee(session, task) && session.role !== 'Admin') {
        return res.status(403).json({ error: 'Only the assignee can request cancellation.' });
      }
      if (task.status === 'Cancelled' || task.status === 'Cancel Requested') {
        return res.status(400).json({ error: 'This task already has a cancel request or is cancelled.' });
      }
      const reason = String(cancelRequest === true ? addUpdate : cancelRequest).trim();
      if (!reason) return res.status(400).json({ error: 'Write why this task should be cancelled.' });
      const now = new Date().toISOString();
      const entry = {
        id: `u-${Date.now()}`,
        at: now,
        by: session.email,
        byName: session.name || session.email,
        text: `Cancel requested: ${reason}`,
        kind: 'cancel',
      };
      await ref.update({
        status: 'Cancel Requested',
        cancelReason: reason,
        cancelRequestedBy: session.email,
        cancelRequestedAt: now,
        cancelPreviousStatus: task.status || 'Not Started',
        notes: reason,
        updates: [...history(task), entry],
      });
      try {
        await notifyCancelRequested({
          taskId: doc.id,
          creatorEmail: task.addedBy,
          taskName: task.task,
          dueDate: task.deadline || '',
          reason,
        });
      } catch (err) {
        console.error('Cancel request notification failed', err);
      }
      return res.status(200).json({ success: true });
    }

    if (cancelDecision) {
      if (!canEditFields(session, task)) {
        return res.status(403).json({ error: 'Only the person who created this task can approve or deny cancellation.' });
      }
      if (task.status !== 'Cancel Requested') {
        return res.status(400).json({ error: 'There is no cancel request to review.' });
      }
      const decision = String(cancelDecision);
      const now = new Date().toISOString();
      if (decision === 'approve') {
        await ref.update({
          status: 'Cancelled',
          updates: [...history(task), {
            id: `u-${Date.now()}`,
            at: now,
            by: session.email,
            byName: session.name || session.email,
            text: 'Cancel request approved',
            kind: 'cancel',
          }],
        });
        try {
          await notifyCancelApproved({ taskId: doc.id, assigneeEmail: task.assignedTo, taskName: task.task, dueDate: task.deadline || '' });
        } catch (err) {
          console.error('Cancel approved notification failed', err);
        }
        return res.status(200).json({ success: true });
      }
      if (decision === 'deny') {
        await ref.update({
          status: task.cancelPreviousStatus || 'Not Started',
          cancelReason: '',
          cancelRequestedBy: '',
          cancelRequestedAt: '',
          cancelPreviousStatus: '',
          updates: [...history(task), {
            id: `u-${Date.now()}`,
            at: now,
            by: session.email,
            byName: session.name || session.email,
            text: 'Cancel request denied',
            kind: 'cancel',
          }],
        });
        try {
          await notifyCancelDenied({ taskId: doc.id, assigneeEmail: task.assignedTo, taskName: task.task, dueDate: task.deadline || '' });
        } catch (err) {
          console.error('Cancel denied notification failed', err);
        }
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: 'Decision must be approve or deny.' });
    }

    if (status !== undefined && !editingFields) {
      if (!canWork(session, task)) {
        return res.status(403).json({ error: 'Only the creator or assignee can update status.' });
      }
      const next = String(status);
      if (next === 'Cancelled' || next === 'Cancel Requested') {
        return res.status(400).json({ error: 'Use the cancel request flow for cancellation.' });
      }
      if (task.status === 'Cancel Requested' || task.status === 'Cancelled') {
        return res.status(400).json({ error: 'Review the cancel request before changing status.' });
      }
      const note = String(addUpdate || '').trim();
      if ((next === 'On Hold' || next === 'Pending') && !note) {
        return res.status(400).json({ error: 'Add a note before setting this status.' });
      }
      const now = new Date().toISOString();
      const entries = [{
        id: `u-${Date.now()}`,
        at: now,
        by: session.email,
        byName: session.name || session.email,
        text: `Status changed to ${next}`,
        kind: 'status',
      }];
      if (note) {
        entries.push({
          id: `u-${Date.now()}-n`,
          at: now,
          by: session.email,
          byName: session.name || session.email,
          text: note,
          kind: 'note',
        });
      }
      const patch = { status: next, updates: [...history(task), ...entries] };
      if (note) patch.notes = note;
      await ref.update(patch);
      return res.status(200).json({ success: true });
    }

    if (addUpdate !== undefined) {
      if (!canWork(session, task)) {
        return res.status(403).json({ error: 'Only the creator or assignee can add an update.' });
      }
      const text = String(addUpdate || '').trim();
      if (!text) return res.status(400).json({ error: 'Update text is required.' });
      const entry = {
        id: `u-${Date.now()}`,
        at: new Date().toISOString(),
        by: session.email,
        byName: session.name || session.email,
        text,
        kind: 'note',
      };
      await ref.update({ updates: [...history(task), entry], notes: text });
      return res.status(200).json({ success: true });
    }

    if (!canEditFields(session, task)) {
      return res.status(403).json({ error: 'Only the person who created this task can edit it.' });
    }
    const nextAssigned = assignedTo ?? task.assignedTo;
    const nextTask = taskText ?? task.task;
    const nextDeadline = deadline ?? task.deadline;
    const patch = {
      assignedTo: nextAssigned,
      task: nextTask,
      deadline: nextDeadline,
      priority: priority ?? task.priority,
    };
    if (status !== undefined) patch.status = status;
    if (notes !== undefined) {
      const text = String(notes || '').trim();
      if (text) {
        patch.notes = text;
        patch.updates = [...history(task), {
          id: `u-${Date.now()}`,
          at: new Date().toISOString(),
          by: session.email,
          byName: session.name || session.email,
          text,
          kind: 'note',
        }];
      }
    }
    await ref.update(patch);
    const prevEmail = String(task.assignedTo || '').toLowerCase();
    const nextEmail = String(nextAssigned || '').toLowerCase();
    if (nextEmail && nextEmail !== prevEmail) {
      try {
        await notifyTaskAssigned({ taskId: doc.id, assignedTo: nextAssigned, taskName: nextTask, dueDate: nextDeadline || '' });
      } catch (err) {
        console.error('Reassignment notification failed', err);
      }
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    if (!canEditFields(session, task)) {
      return res.status(403).json({ error: 'Only the person who created this task can delete it.' });
    }
    await ref.delete();
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'tasks' });
