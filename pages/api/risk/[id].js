import { adminDb } from '../../../lib/firebaseAdmin';
import { withAuth } from '../../../lib/auth';
import { snapshotFields } from '../../../lib/riskMath';

export default withAuth(async (req, res, session) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id.' });
  const ref = adminDb.collection('deploymentAssessments').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Assessment not found.' });
  const current = { id: snap.id, ...snap.data() };

  if (req.method === 'GET') return res.status(200).json({ assessment: current });
  if (session.role !== 'Admin') return res.status(403).json({ error: 'Only an administrator can change assessments.' });

  if (req.method === 'PUT') {
    const body = req.body || {};
    const action = body.action || 'save';
    const incoming = { ...body };
    delete incoming.action;
    delete incoming.id;

    if (action === 'revise') {
      if (!current.approvedSnapshot) return res.status(400).json({ error: 'Nothing approved to revise.' });
      await ref.set({
        ...incoming,
        approvedSnapshot: current.approvedSnapshot,
        approvedAt: current.approvedAt || null,
        approvedByUser: current.approvedByUser || current.approvedBy || '',
        status: incoming.status || 'Evaluating',
        version: (Number(current.version) || 1) + 1,
        revisedAt: new Date().toISOString(),
        revisedBy: session.email,
        updatedAt: new Date().toISOString(),
        updatedBy: session.email,
        archived: false,
      }, { merge: false });
      return res.status(200).json({ success: true, revised: true });
    }

    if (action === 'status') {
      await ref.set({
        status: incoming.status || current.status,
        notes: incoming.notes != null ? incoming.notes : current.notes,
        outstandingInfo: incoming.outstandingInfo != null ? incoming.outstandingInfo : current.outstandingInfo,
        decisionDate: incoming.decisionDate != null ? incoming.decisionDate : current.decisionDate,
        approvedBy: incoming.approvedBy != null ? incoming.approvedBy : current.approvedBy,
        updatedAt: new Date().toISOString(),
        updatedBy: session.email,
      }, { merge: true });
      return res.status(200).json({ success: true });
    }

    if (current.status === 'Approved') {
      return res.status(409).json({ error: 'This assessment is approved. Use Revise Assessment to change financial assumptions. The original approved snapshot is kept.' });
    }

    const next = { ...current, ...incoming, updatedAt: new Date().toISOString(), updatedBy: session.email };
    delete next.id;
    if (incoming.status === 'Approved' && current.status !== 'Approved' && !current.approvedSnapshot) {
      next.approvedSnapshot = snapshotFields({ ...current, ...incoming });
      next.approvedAt = new Date().toISOString();
      next.approvedByUser = session.email;
    }
    await ref.set(next, { merge: false });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST') {
    const action = (req.body || {}).action;
    if (action === 'duplicate') {
      const copy = { ...current };
      delete copy.id;
      copy.name = `${current.name || 'Assessment'} (copy)`;
      copy.status = 'Evaluating';
      copy.archived = false;
      copy.version = 1;
      copy.approvedSnapshot = null;
      copy.approvedAt = null;
      copy.approvedByUser = null;
      copy.decisionDate = '';
      copy.approvedBy = '';
      copy.createdAt = new Date().toISOString();
      copy.createdBy = session.email;
      copy.updatedAt = new Date().toISOString();
      copy.updatedBy = session.email;
      const created = await adminDb.collection('deploymentAssessments').add(copy);
      return res.status(200).json({ id: created.id, success: true });
    }
    if (action === 'archive') {
      await ref.set({ archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: session.email }, { merge: true });
      return res.status(200).json({ success: true });
    }
    if (action === 'unarchive') {
      await ref.set({ archived: false, updatedAt: new Date().toISOString(), updatedBy: session.email }, { merge: true });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}, { tab: 'risk' });
