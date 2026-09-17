import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../lib/firebaseClient';
import {
  STATUSES, MODELS, SOURCES, LINE_STATUSES, RISK_LEVELS, RISK_STATUSES,
  applySourceLines, compute, emptyAssessment, isMallModel, MALL_MODEL, normalizeLogistics,
} from '../../lib/riskMath';

const MD = '\u00b7';
const EM = '\u2014';
const EN = '\u2013';
const ARR = '\u2190';
const MINUS = '\u2212';
const TIMES = '\u00d7';
const ELL = '\u2026';
const fmt = (v) => (typeof v === 'number' && Number.isFinite(v) ? `$${Math.round(v).toLocaleString()}` : EM);
const fmtMoney2 = (v) => (typeof v === 'number' && Number.isFinite(v) ? `$${v.toFixed(2)}` : EM);
const fmtN = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : EM);
const CHEV_OPEN = '\u25BE';
const CHEV_CLOSED = '\u25B8';
const DETAIL_SECTIONS = ['project', 'chair', 'logistics', 'travel', 'other', 'opex', 'pricing', 'scenarios', 'required', 'risks', 'decision'];
function collapsedMap() {
  return DETAIL_SECTIONS.reduce((acc, id) => { acc[id] = false; return acc; }, {});
}
function fmtPaybackMonths(months) {
  if (typeof months === 'number' && Number.isFinite(months) && months > 0) return months.toFixed(1) + ' months';
  return null;
}
function fmtEstimatedPayback(profit, months) {
  if (typeof profit === 'number' && Number.isFinite(profit) && profit > 0) {
    const label = fmtPaybackMonths(months);
    if (label) return label;
  }
  return 'No Payback at Current Base Scenario';
}
function fmtScenarioPayback(profit, months) {
  if (typeof profit === 'number' && Number.isFinite(profit) && profit > 0) {
    const label = fmtPaybackMonths(months);
    if (label) return label;
  }
  return 'No payback';
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
      <span className="muted">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.35rem' }}>{value}</div>
    </div>
  );
}

function summarizeRisks(risks) {
  const rows = risks || [];
  const isOpen = (r) => r.status === 'Open';
  const highCritOpen = rows.filter((r) => isOpen(r) && (r.level === 'High' || r.level === 'Critical')).length;
  const mediumOpen = rows.filter((r) => isOpen(r) && r.level === 'Medium').length;
  const lowOpen = rows.filter((r) => isOpen(r) && r.level === 'Low').length;
  const mitigating = rows.filter((r) => r.status === 'Mitigating').length;
  const resolved = rows.filter((r) => r.status === 'Resolved').length;
  const notAssessed = rows.filter((r) => r.level === 'Not Assessed' || r.status === 'Not Assessed').length;
  const parts = [];
  if (highCritOpen) parts.push(highCritOpen + ' High/Critical Open');
  if (mediumOpen) parts.push(mediumOpen + ' Medium Open');
  if (notAssessed) parts.push(notAssessed + ' Not Assessed');
  return { highCritOpen, mediumOpen, lowOpen, mitigating, resolved, notAssessed, header: parts.join(' ' + MD + ' ') };
}

const LEVEL_TINT = {
  Critical: { background: '#f4d6d2', color: '#6f1d16' },
  High: { background: '#f8e4e2', color: '#9b2c22' },
  Medium: { background: '#f8ead6', color: '#8a4b12' },
  Low: { background: '#e4f0e8', color: '#1f5b38' },
  'Not Assessed': { background: '#eeeae4', color: '#5f5a55' },
};
const STATUS_TINT = {
  Open: { background: '#f8e4e2', color: '#9b2c22' },
  Mitigating: { background: '#e4ebf4', color: '#1d4e89' },
  Resolved: { background: '#e4f0e8', color: '#1f5b38' },
  'Not Applicable': { background: '#eeeae4', color: '#5f5a55' },
  'Not Assessed': { background: '#eeeae4', color: '#5f5a55' },
};

function Section({ id, title, summary, open, onToggle, children }) {
  return (
    <div className="card">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(id); } }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {summary ? <p className="muted" style={{ margin: '4px 0 0' }}>{summary}</p> : null}
        </div>
        <span className="muted" aria-hidden="true">{open ? CHEV_OPEN : CHEV_CLOSED}</span>
      </div>
      {open ? <div style={{ marginTop: 12 }}>{children}</div> : null}
    </div>
  );
}

function LineTable({ title, items, onChange, locked, extra, embedded }) {
  function patch(i, key, val) {
    const next = items.map((row, idx) => (idx === i ? { ...row, [key]: val } : row));
    onChange(next);
  }
  const body = (
    <>
      {extra}
      <div className="table-wrap wide">
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Amount</th><th>Status</th><th>Source / Confirmed By</th><th>Date</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((row, i) => (
              <tr key={row.key || i}>
                <td>{row.label}</td>
                <td><input type="number" disabled={locked} value={row.amount} onChange={(e) => patch(i, 'amount', e.target.value)} style={{ width: 110 }} /></td>
                <td>
                  <select disabled={locked} value={row.status} onChange={(e) => patch(i, 'status', e.target.value)}>
                    {LINE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td><input disabled={locked} value={row.source || ''} onChange={(e) => patch(i, 'source', e.target.value)} /></td>
                <td><input type="date" disabled={locked} value={row.date || ''} onChange={(e) => patch(i, 'date', e.target.value)} /></td>
                <td><input disabled={locked} value={row.notes || ''} onChange={(e) => patch(i, 'notes', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
  if (embedded) return body;
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {body}
    </div>
  );
}

export default function RiskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { session } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [openSections, setOpenSections] = useState(collapsedMap);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
  }

  function load() {
    if (!id) return;
    setLoading(true);
    authedFetch(`/api/risk/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Not found.');
        const blank = emptyAssessment();
        const loaded = d.assessment || {};
        setForm(normalizeLogistics({
          ...blank,
          ...loaded,
          businessModel: isMallModel(loaded.businessModel) ? MALL_MODEL : (loaded.businessModel || blank.businessModel),
          rs: { ...blank.rs, ...(loaded.rs || {}) },
        }));
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { if (session && id) load(); }, [session, id]);
  useEffect(() => { setOpenSections(collapsedMap()); }, [id]);

  function toggleSection(sectionId) {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }
  function expandAll() {
    setOpenSections(DETAIL_SECTIONS.reduce((acc, sid) => { acc[sid] = true; return acc; }, {}));
  }
  function collapseAll() {
    setOpenSections(collapsedMap());
  }

  const isAdmin = session?.role === 'Admin';
  const locked = !isAdmin || form?.status === 'Approved';
  const derived = useMemo(() => (form ? compute(form) : null), [form]);

  function set(key, val) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'inventorySource') return applySourceLines(next);
      return next;
    });
  }
  function setRs(key, val) {
    setForm((f) => ({ ...f, rs: { ...f.rs, [key]: val } }));
  }

  async function save(action = 'save') {
    setBusy(true); setError(''); setSaveMsg('');
    const payload = { ...form, action };
    delete payload.id;
    const res = await authedFetch(`/api/risk/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error); return; }
    setSaveMsg(action === 'revise' ? 'Revision opened. Approved snapshot kept.' : 'Saved.');
    load();
  }

  if (loading || !form) {
    return <Layout active="risk" onNavigate={navigate}><p className="muted">{error || ('Loading assessment' + ELL)}</p></Layout>;
  }

  const pay = form.businessModel !== 'Corporate Wellness';
  const c = derived || {};
  const pilotMissing = form.termType === 'Pilot' && !form.termMonths;

  return (
    <Layout active="risk" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn" type="button" onClick={() => router.push('/risk')}>{ARR} All assessments</button>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.status === 'Approved' && (
              <>
                <button className="btn" type="button" disabled={busy} onClick={() => save('status')}>Save notes / status</button>
                <button className="btn" type="button" disabled={busy} onClick={() => save('revise')}>Revise Assessment</button>
              </>
            )}
            {form.status !== 'Approved' && (
              <button className="btn" type="button" disabled={busy} onClick={() => save('save')}>{busy ? ('Saving' + ELL) : 'Save'}</button>
            )}
          </div>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      {saveMsg && <p className="muted">{saveMsg}</p>}
      {!isAdmin && <p className="muted">View only. Ask an administrator to edit this assessment.</p>}
      {form.approvedSnapshot && (
        <p className="muted">Approved baseline saved {form.approvedAt ? `on ${form.approvedAt.slice(0, 10)}` : ''}{form.approvedByUser ? ` by ${form.approvedByUser}` : ''}. Later assumption edits require Revise Assessment and do not overwrite that snapshot.</p>
      )}

      <h1 style={{ marginBottom: 6 }}>{form.name || 'Untitled assessment'}</h1>
      <p className="muted">{form.businessModel} {MD} {form.chairQty || EM} chairs {MD} {form.inventorySource} {MD} {form.targetDeployDate || 'no date'} {MD} {form.status}{form.version ? ` ${MD} v${form.version}` : ''}</p>

      <div className="grid-4">
        <Kpi label="New cash required" value={fmt(c.inv?.newCash)} />
        <Kpi label="Total economic investment" value={fmt(c.inv?.totalEconomic)} />
        <Kpi label="Monthly operating cost" value={fmt(c.opex)} />
        <Kpi label="Target payback" value={form.targetPaybackMonths ? `${form.targetPaybackMonths} mo` : EM} />
      </div>
      {pay && (
        <div className="grid-4">
          <Kpi label="Required sessions / chair / day" value={fmtN(c.required?.sessionsChairDay, 2)} />
          <Kpi label="Required sessions / week" value={fmtN(c.required?.sessionsWeek, 1)} />
          <Kpi label="Required sessions / month" value={fmtN(c.required?.sessionsMonth, 0)} />
          <Kpi label={'Estimated Payback ' + EN + ' Base Scenario'} value={c.scenarios ? fmtEstimatedPayback(c.scenarios.base.profit, c.scenarios.base.paybackMonths) : EM} />
        </div>
      )}
      {form.businessModel === 'Corporate Wellness' && c.cw && (
        <div className="grid-4">
          <Kpi label="Monthly contract revenue" value={fmt(c.cw.monthlyContract)} />
          <Kpi label="Net monthly contribution" value={fmt(c.cw.netMonthly)} />
          <Kpi label="Estimated payback" value={fmtEstimatedPayback(c.cw.netMonthly, c.cw.paybackMonths)} />
          <Kpi label="Required fee / chair for target" value={fmt(c.cw.requiredFeePerChair)} />
        </div>
      )}
      {c.termRisk && <p className="form-error">{c.termRiskNote}</p>}
      {pilotMissing && <p className="form-error">Pilot requires a pilot length in months. No default is assumed.</p>}
      {c.required?.reason && <p className="muted">{c.required.reason}</p>}

      {c.completeness?.total > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Assumption completeness</h3>
          <p className="muted">
            Confirmed {Math.round(100 * c.completeness.Confirmed / c.completeness.total)}% {MD}{' '}
            Quoted {Math.round(100 * c.completeness.Quoted / c.completeness.total)}% {MD}{' '}
            Assumed {Math.round(100 * c.completeness.Assumed / c.completeness.total)}%
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <button className="btn" type="button" onClick={expandAll}>Expand All</button>
        <button className="btn" type="button" onClick={collapseAll}>Collapse All</button>
      </div>

      <Section id="project" title="Project information" open={!!openSections.project} onToggle={toggleSection}>
        <div className="inline-form">
          <Field label="Project / location name"><input disabled={locked} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Company / venue"><input disabled={locked} value={form.company} onChange={(e) => set('company', e.target.value)} /></Field>
          <Field label="City"><input disabled={locked} value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><input disabled={locked} value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Business model">
            <select disabled={locked} value={form.businessModel} onChange={(e) => set('businessModel', e.target.value)}>
              {MODELS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Chair quantity"><input type="number" disabled={locked} value={form.chairQty} onChange={(e) => set('chairQty', e.target.value)} /></Field>
          <Field label="Chair inventory">
            <select disabled={locked} value={form.chairInventory} onChange={(e) => set('chairInventory', e.target.value)}>
              <option>New</option><option>Existing</option>
            </select>
          </Field>
          <Field label="Inventory / fulfillment source">
            <select disabled={locked} value={form.inventorySource} onChange={(e) => set('inventorySource', e.target.value)}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Target deployment date"><input type="date" disabled={locked} value={form.targetDeployDate} onChange={(e) => set('targetDeployDate', e.target.value)} /></Field>
          <Field label="Term type">
            <select disabled={locked} value={form.termType} onChange={(e) => set('termType', e.target.value)}>
              <option>Pilot</option><option>Months</option><option>Ongoing</option>
            </select>
          </Field>
          {(form.termType === 'Pilot' || form.termType === 'Months') && (
            <Field label={form.termType === 'Pilot' ? 'Pilot length (months)' : 'Term (months)'}>
              <input type="number" disabled={locked} value={form.termMonths} onChange={(e) => set('termMonths', e.target.value)} />
            </Field>
          )}
          <Field label="Target payback (months)"><input type="number" disabled={locked} value={form.targetPaybackMonths} onChange={(e) => set('targetPaybackMonths', e.target.value)} /></Field>
          <Field label="Investment scope">
            <select disabled={locked} value={form.investmentScope} onChange={(e) => set('investmentScope', e.target.value)}>
              <option>Deployment Cost Only</option>
              <option>Full Investment</option>
            </select>
          </Field>
          <Field label="Assessment status">
            <select disabled={!isAdmin} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section id="chair" title="Chair Investment" open={!!openSections.chair} onToggle={toggleSection}>
        <div className="inline-form">
          {form.chairInventory === 'New' && (
            <>
              <Field label="Chair cost per unit"><input type="number" disabled={locked} value={form.chairCostPerUnit} onChange={(e) => set('chairCostPerUnit', e.target.value)} /></Field>
              <Field label="Already paid?">
                <select disabled={locked} value={form.chairAlreadyPaid ? 'Yes' : 'No'} onChange={(e) => set('chairAlreadyPaid', e.target.value === 'Yes')}>
                  <option>No</option><option>Yes</option>
                </select>
              </Field>
            </>
          )}
          {form.chairInventory === 'Existing' && (
            <Field label="Assigned chair value per unit"><input type="number" disabled={locked} value={form.assignedChairValuePerUnit} onChange={(e) => set('assignedChairValuePerUnit', e.target.value)} /></Field>
          )}
        </div>
        <p className="muted">Total Chair Value: {fmt((Number(form.chairQty) || 0) * (Number(form.chairInventory === 'Existing' ? form.assignedChairValuePerUnit : form.chairCostPerUnit) || 0))}</p>
        <p className="muted">Remaining New Cash Required: {fmt(c.inv?.newCash)}</p>
        <p className="muted">Total Economic Investment: {fmt(c.inv?.totalEconomic)}</p>
        <p className="muted">ROI Investment Basis: {fmt(c.inv?.basis)}</p>
        <p className="muted">
          {form.investmentScope === 'Full Investment'
            ? 'Chair value is included in the ROI investment basis because this assessment is set to Full Investment Including Chair Value.'
            : 'Chair value is excluded from the ROI investment basis because this assessment is set to Deployment Cost Only.'}
        </p>
        {form.chairInventory === 'New' && (
          <p className="muted">Already Paid affects remaining cash required. It does not determine whether chair value is included in the ROI investment basis; Investment Scope controls that.</p>
        )}
      </Section>

      <Section id="logistics" title="Inventory / logistics" open={!!openSections.logistics} onToggle={toggleSection}>
        <LineTable embedded title="Inventory / logistics" items={form.logisticsItems || []} locked={locked} onChange={(items) => set('logisticsItems', items)} />
      </Section>
      <Section id="travel" title="Travel (amounts per trip)" open={!!openSections.travel} onToggle={toggleSection}>
        <LineTable
          embedded
          title="Travel (amounts per trip)"
          items={form.travelItems || []}
          locked={locked}
          onChange={(items) => set('travelItems', items)}
          extra={<Field label="Number of trips"><input type="number" disabled={locked} value={form.travelTrips} onChange={(e) => set('travelTrips', e.target.value)} /></Field>}
        />
      </Section>
      <Section id="other" title="Other deployment costs" open={!!openSections.other} onToggle={toggleSection}>
        <LineTable embedded title="Other deployment costs" items={form.otherCostItems || []} locked={locked} onChange={(items) => set('otherCostItems', items)} />
      </Section>
      <Section id="opex" title="Monthly operating costs" open={!!openSections.opex} onToggle={toggleSection}>
        <LineTable
          embedded
          title="Monthly operating costs"
          items={form.opexItems || []}
          locked={locked}
          onChange={(items) => set('opexItems', items)}
          extra={<Field label="Payment processing % of gross customer transactions"><input type="number" disabled={locked} value={form.processingPct} onChange={(e) => set('processingPct', e.target.value)} /></Field>}
        />
      </Section>

      {pay && (
        <Section id="pricing" title="Session Pricing / Business Model Revenue Inputs" open={!!openSections.pricing} onToggle={toggleSection}>
          <p className="muted">{isMallModel(form.businessModel) ? ('Shopping Mall ' + EN + ' Fixed Rent ' + EM + ' session pricing') : 'Revenue sharing'}</p>
          <div className="inline-form">
            <Field label="10-min price"><input type="number" disabled={locked} value={form.rs.price10} onChange={(e) => setRs('price10', e.target.value)} /></Field>
            <Field label="15-min price"><input type="number" disabled={locked} value={form.rs.price15} onChange={(e) => setRs('price15', e.target.value)} /></Field>
            <Field label="25-min price"><input type="number" disabled={locked} value={form.rs.price25} onChange={(e) => setRs('price25', e.target.value)} /></Field>
            <Field label="10-min mix %"><input type="number" disabled={locked} value={form.rs.mix10} onChange={(e) => setRs('mix10', e.target.value)} /></Field>
            <Field label="15-min mix %"><input type="number" disabled={locked} value={form.rs.mix15} onChange={(e) => setRs('mix15', e.target.value)} /></Field>
            <Field label="25-min mix %"><input type="number" disabled={locked} value={form.rs.mix25} onChange={(e) => setRs('mix25', e.target.value)} /></Field>
          </div>
          {!c.mixOk && <p className="form-error">Session mix must total 100% before session calculations appear.</p>}
          {c.mixOk && <p className="muted">Weighted average transaction {fmtMoney2(c.weightedTicket)}</p>}
          {form.businessModel === 'Revenue Sharing' && (
            <>
              <div className="inline-form">
                <Field label="LEMO share %"><input type="number" disabled={locked} value={form.rs.lemoPct} onChange={(e) => setRs('lemoPct', e.target.value)} /></Field>
                <Field label="Venue share %"><input type="number" disabled={locked} value={form.rs.venuePct} onChange={(e) => setRs('venuePct', e.target.value)} /></Field>
                <Field label="BD share %"><input type="number" disabled={locked} value={form.rs.bdPct} onChange={(e) => setRs('bdPct', e.target.value)} /></Field>
              </div>
              {!c.sharesOk && <p className="form-error">Revenue shares must total 100%.</p>}
              <p className="muted">Default 70 / 20 / 10 is pre-filled and editable. Shopping Mall {EN} Fixed Rent does not use this split.</p>
            </>
          )}
          {isMallModel(form.businessModel) && (
            <p className="muted">
              The shopping center receives 0% of customer session revenue. LEMO pays a fixed monthly mall rent (enter it under Monthly operating costs as Rent / Space Fee) and retains 100% of session gross before payment processing and LEMO operating expenses.
              Calculation: Gross Session Revenue {MINUS} Payment Processing = LEMO Net Revenue Before OpEx; then subtract Monthly Mall Rent, Cleaning, Maintenance, and Other Monthly Operating Expenses. Target-payback required sessions include mall rent and all other monthly OpEx. The RS 70/20/10 structure is not applied.
            </p>
          )}
          <div className="inline-form">
            <Field label="Operating days / month"><input type="number" disabled={locked} value={form.daysPerMonth} onChange={(e) => set('daysPerMonth', e.target.value)} /></Field>
            <Field label="Expected chair uptime %"><input type="number" disabled={locked} value={form.uptimePct} onChange={(e) => set('uptimePct', e.target.value)} /></Field>
            <Field label={'Low Scenario ' + EN + ' Sessions / Chair / Day'}><input type="number" disabled={locked} value={form.spdLow} onChange={(e) => set('spdLow', e.target.value)} /></Field>
            <Field label={'Base Scenario ' + EN + ' Sessions / Chair / Day'}><input type="number" disabled={locked} value={form.spdBase} onChange={(e) => set('spdBase', e.target.value)} /></Field>
            <Field label={'High Scenario ' + EN + ' Sessions / Chair / Day'}><input type="number" disabled={locked} value={form.spdHigh} onChange={(e) => set('spdHigh', e.target.value)} /></Field>
          </div>
        </Section>
      )}

      {form.businessModel === 'Corporate Wellness' && (
        <Section id="pricing" title="Session Pricing / Business Model Revenue Inputs" open={!!openSections.pricing} onToggle={toggleSection}>
          <p className="muted">Corporate Wellness contract</p>
          <div className="inline-form">
            <Field label="Monthly fee per chair"><input type="number" disabled={locked} value={form.cwFeePerChair} onChange={(e) => set('cwFeePerChair', e.target.value)} /></Field>
            <Field label="Or total monthly contract fee"><input type="number" disabled={locked} value={form.cwTotalMonthlyFee} onChange={(e) => set('cwTotalMonthlyFee', e.target.value)} /></Field>
            <Field label="Contract start"><input type="date" disabled={locked} value={form.cwContractStart} onChange={(e) => set('cwContractStart', e.target.value)} /></Field>
            <Field label="Contract term (months)"><input type="number" disabled={locked} value={form.cwContractMonths} onChange={(e) => set('cwContractMonths', e.target.value)} /></Field>
            <Field label="Deposit / upfront"><input type="number" disabled={locked} value={form.cwDeposit} onChange={(e) => set('cwDeposit', e.target.value)} /></Field>
          </div>
          <p className="muted">If total monthly fee is entered it is used; otherwise chairs {TIMES} fee per chair. Sessions are not used for CW revenue.</p>
        </Section>
      )}

      {pay && c.scenarios && (
        <Section id="scenarios" title="Performance Scenarios" open={!!openSections.scenarios} onToggle={toggleSection}>
          <p className="muted">Uptime applies to these realized scenarios only. The required sessions/chair/day KPI is the literal paid-session target and is not inflated by uptime.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th></th><th>Low</th><th>Base</th><th>High</th></tr>
              </thead>
              <tbody>
                <tr><td>Sessions / chair / day</td><td>{fmtN(c.scenarios.low.sessionsPerChairPerDay, 2)}</td><td>{fmtN(c.scenarios.base.sessionsPerChairPerDay, 2)}</td><td>{fmtN(c.scenarios.high.sessionsPerChairPerDay, 2)}</td></tr>
                <tr><td>Required Sessions / Chair / Day for Target Payback</td><td>{fmtN(c.required?.sessionsChairDay, 2)}</td><td>{fmtN(c.required?.sessionsChairDay, 2)}</td><td>{fmtN(c.required?.sessionsChairDay, 2)}</td></tr>
                <tr><td>Sessions / month</td><td>{fmtN(c.scenarios.low.perMonth, 0)}</td><td>{fmtN(c.scenarios.base.perMonth, 0)}</td><td>{fmtN(c.scenarios.high.perMonth, 0)}</td></tr>
                <tr><td>Gross revenue</td><td>{fmt(c.scenarios.low.gross)}</td><td>{fmt(c.scenarios.base.gross)}</td><td>{fmt(c.scenarios.high.gross)}</td></tr>
                {!isMallModel(form.businessModel) && (
                  <tr><td>{MINUS} Revenue distributions</td><td>{fmt((c.scenarios.low.venue || 0) + (c.scenarios.low.bd || 0))}</td><td>{fmt((c.scenarios.base.venue || 0) + (c.scenarios.base.bd || 0))}</td><td>{fmt((c.scenarios.high.venue || 0) + (c.scenarios.high.bd || 0))}</td></tr>
                )}
                <tr><td>{MINUS} Payment processing</td><td>{fmt(c.scenarios.low.processing)}</td><td>{fmt(c.scenarios.base.processing)}</td><td>{fmt(c.scenarios.high.processing)}</td></tr>
                <tr><td>LEMO net revenue before OpEx</td><td>{fmt(c.scenarios.low.netBeforeOpex)}</td><td>{fmt(c.scenarios.base.netBeforeOpex)}</td><td>{fmt(c.scenarios.high.netBeforeOpex)}</td></tr>
                <tr><td>{MINUS} Monthly operating expenses</td><td>{fmt(c.scenarios.low.opex)}</td><td>{fmt(c.scenarios.base.opex)}</td><td>{fmt(c.scenarios.high.opex)}</td></tr>
                <tr><td>Monthly operating profit / loss</td><td>{fmt(c.scenarios.low.profit)}</td><td>{fmt(c.scenarios.base.profit)}</td><td>{fmt(c.scenarios.high.profit)}</td></tr>
                <tr><td>Payback</td><td>{fmtScenarioPayback(c.scenarios.low.profit, c.scenarios.low.paybackMonths)}</td><td>{fmtScenarioPayback(c.scenarios.base.profit, c.scenarios.base.paybackMonths)}</td><td>{fmtScenarioPayback(c.scenarios.high.profit, c.scenarios.high.paybackMonths)}</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {pay && c.required && !c.required.blocked && (
        <Section id="required" title="Required performance for target payback" open={!!openSections.required} onToggle={toggleSection}>
          <p className="muted">
            Required monthly investment recovery {fmt(c.required.recovery)} + monthly operating expenses {fmt(c.opex)}
            = required LEMO net revenue before OpEx {fmt(c.required.netBeforeOpex)}.
            Gross and paid sessions are reverse-calculated from that net figure so operating expenses are not double-counted.
          </p>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr><td>Required gross / month</td><td>{fmt(c.required.gross)}</td></tr>
                <tr><td>Required paid sessions / month</td><td>{fmtN(c.required.sessionsMonth, 0)}</td></tr>
                <tr><td>Required paid sessions / week</td><td>{fmtN(c.required.sessionsWeek, 1)}</td></tr>
                <tr><td>Required paid sessions / day</td><td>{fmtN(c.required.sessionsDay, 1)}</td></tr>
                <tr><td>Required sessions / chair / day</td><td>{fmtN(c.required.sessionsChairDay, 2)}</td></tr>
                <tr><td>Uptime-adjusted sessions / chair / day</td><td>{fmtN(c.required.sessionsChairDayUptimeAdjusted, 2)}</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section id="risks" title="Deployment risks" summary={summarizeRisks(form.risks).header} open={!!openSections.risks} onToggle={toggleSection}>
        {(() => {
          const rs = summarizeRisks(form.risks);
          const Mini = ({ label, value }) => (
            <div className="card" style={{ marginBottom: 0, padding: 10 }}>
              <div className="muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '1.15rem', marginTop: 4 }}>{value}</div>
            </div>
          );
          return (
            <div className="grid-4" style={{ marginBottom: 12 }}>
              <Mini label="High / Critical Open" value={rs.highCritOpen} />
              <Mini label="Medium Open" value={rs.mediumOpen} />
              <Mini label="Low Open" value={rs.lowOpen} />
              <Mini label="Mitigating" value={rs.mitigating} />
              <Mini label="Resolved" value={rs.resolved} />
              <Mini label="Not Assessed" value={rs.notAssessed} />
            </div>
          );
        })()}
        <div className="table-wrap wide">
          <table>
            <thead>
              <tr><th>Category</th><th>Level</th><th>Status</th><th>Owner</th><th>Mitigation</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {(form.risks || []).map((row, i) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td>
                    <select disabled={locked} value={row.level || 'Not Assessed'} style={LEVEL_TINT[row.level] || LEVEL_TINT['Not Assessed']} onChange={(e) => {
                      const risks = form.risks.map((r, idx) => (idx === i ? { ...r, level: e.target.value } : r));
                      set('risks', risks);
                    }}>{RISK_LEVELS.map((lvl) => <option key={lvl}>{lvl}</option>)}</select>
                  </td>
                  <td>
                    <select disabled={locked} value={row.status || 'Not Assessed'} style={STATUS_TINT[row.status] || STATUS_TINT['Not Assessed']} onChange={(e) => {
                      const risks = form.risks.map((r, idx) => (idx === i ? { ...r, status: e.target.value } : r));
                      set('risks', risks);
                    }}>{RISK_STATUSES.map((st) => <option key={st}>{st}</option>)}</select>
                  </td>
                  <td><input disabled={locked} value={row.owner || ''} onChange={(e) => {
                    const risks = form.risks.map((r, idx) => (idx === i ? { ...r, owner: e.target.value } : r));
                    set('risks', risks);
                  }} /></td>
                  <td><input disabled={locked} value={row.mitigation || ''} onChange={(e) => {
                    const risks = form.risks.map((r, idx) => (idx === i ? { ...r, mitigation: e.target.value } : r));
                    set('risks', risks);
                  }} /></td>
                  <td><input disabled={locked} value={row.notes || ''} onChange={(e) => {
                    const risks = form.risks.map((r, idx) => (idx === i ? { ...r, notes: e.target.value } : r));
                    set('risks', risks);
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="decision" title="Decision / management notes" open={!!openSections.decision} onToggle={toggleSection}>
        <div className="inline-form">
          <Field label="Decision date"><input type="date" disabled={!isAdmin} value={form.decisionDate || ''} onChange={(e) => set('decisionDate', e.target.value)} /></Field>
          <Field label="Approved by"><input disabled={!isAdmin} value={form.approvedBy || ''} onChange={(e) => set('approvedBy', e.target.value)} /></Field>
        </div>
        <Field label="Management notes">
          <textarea disabled={!isAdmin} rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4 }} />
        </Field>
        <Field label="Outstanding information needed">
          <textarea disabled={!isAdmin} rows={2} value={form.outstandingInfo || ''} onChange={(e) => set('outstandingInfo', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 8 }} />
        </Field>
      </Section>
    </Layout>
  );
}
