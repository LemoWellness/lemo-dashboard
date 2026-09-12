import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10'];
const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : (n ?? '—'));

const EMPTY_FORM = {
  name: '', businessModel: 'Revenue Sharing', numberOfChairs: '', goLiveDate: '', monthlyFee: '',
  revenueSharePercent: '', streetAddress: '', city: '', state: '', zipCode: '',
  customerContactName: '', customerContactPhone: '', customerContactEmail: '',
  bdConsultantName: '', bdConsultantPhone: '', bdConsultantEmail: '',
  contact2Name: '', contact2Phone: '', contact2Email: '', editNotes: '',
};

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const [tab, setTab] = useState('loc');
  const [projects, setProjects] = useState([]);
  const [selectedName, setSelectedName] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(EMPTY_FORM);
  const [accountError, setAccountError] = useState('');
  const [expForm, setExpForm] = useState({ date: '', category: '', item: '', description: '', source: '', quantity: 1, costPerUnit: '', notes: '' });
  const [incForm, setIncForm] = useState({ date: '', amount: '', notes: '' });
  const [noteForm, setNoteForm] = useState({ note: '', channel: 'Call' });
  const [formError, setFormError] = useState('');

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    setTab(code);
  }

  function loadProjects() {
    authedFetch('/api/projects').then((r) => r.json()).then((data) => {
      setProjects(data.projects || []);
      setLoading(false);
    });
  }
  useEffect(() => { if (session) loadProjects(); }, [session]);

  const selected = useMemo(() => projects.find((p) => p.name === selectedName) || null, [projects, selectedName]);

  function loadDetail(name) {
    authedFetch(`/api/expenses?location=${encodeURIComponent(name)}`).then((r) => r.json()).then((d) => setExpenses(d.expenses || []));
    authedFetch(`/api/income?location=${encodeURIComponent(name)}`).then((r) => r.json()).then((d) => setIncome(d.income || []));
    authedFetch(`/api/communication-log?location=${encodeURIComponent(name)}`).then((r) => r.json()).then((d) => setNotes(d.notes || []));
  }
  useEffect(() => { if (selectedName) loadDetail(selectedName); }, [selectedName]);

  // ---- Cascading filters ----
  const businessModels = useMemo(() => [...new Set(projects.map((p) => p.businessModel).filter(Boolean))], [projects]);
  const statesForModel = useMemo(() => {
    const pool = modelFilter === 'All' ? projects : projects.filter((p) => p.businessModel === modelFilter);
    return [...new Set(pool.map((p) => p.state).filter(Boolean))].sort();
  }, [projects, modelFilter]);
  useEffect(() => { if (stateFilter !== 'All' && !statesForModel.includes(stateFilter)) setStateFilter('All'); }, [statesForModel]); // eslint-disable-line

  const filteredProjects = projects.filter((p) =>
    (modelFilter === 'All' || p.businessModel === modelFilter) &&
    (stateFilter === 'All' || p.state === stateFilter)
  );

  // ---- Derived dashboard numbers (ported from the old Dashboard sheet formulas) ----
  const metrics = useMemo(() => {
    if (!selected) return null;
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalLemoIncome = income.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const netProfitLoss = totalLemoIncome - totalExpenses;
    const roiProgress = totalExpenses > 0 ? Math.min(totalLemoIncome / totalExpenses, 1) : null;

    const thisMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonthlyRevenue = selected.businessModel === 'Corporate Wellness'
      ? Number(selected.monthlyFee) || 0
      : income.filter((i) => (i.date || '').startsWith(thisMonthKey)).reduce((s, i) => s + (Number(i.amount) || 0), 0);

    // Break-even date: earliest date at which cumulative income >= total expenses
    const sortedIncome = [...income].filter((i) => i.date).sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0, breakEvenDate = null;
    for (const i of sortedIncome) {
      cumulative += Number(i.amount) || 0;
      if (cumulative >= totalExpenses && totalExpenses > 0) { breakEvenDate = i.date; break; }
    }
    let daysToBreakEven = '—';
    if (selected.goLiveDate) {
      const goLive = new Date(selected.goLiveDate);
      if (breakEvenDate) {
        daysToBreakEven = `${Math.round((new Date(breakEvenDate) - goLive) / 86400000)} days`;
      } else {
        daysToBreakEven = `${Math.round((new Date() - goLive) / 86400000)} days (Still Recovering)`;
      }
    }

    const byCategory = {};
    expenses.forEach((e) => { if (e.category) byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0); });
    const catEntries = Object.entries(byCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
    const top3 = catEntries.slice(0, 3);
    const otherTotal = catEntries.slice(3).reduce((s, e) => s + e.total, 0);
    const expenseBreakdown = otherTotal > 0 ? [...top3, { category: 'Other', total: otherTotal }] : top3;

    const byMonth = {};
    income.forEach((i) => {
      if (!i.date) return;
      const key = i.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { key, total: 0, label: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
      byMonth[key].total += Number(i.amount) || 0;
    });
    const monthlyIncome = Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));

    return {
      totalExpenses, totalLemoIncome, netProfitLoss, roiProgress, currentMonthlyRevenue,
      breakEvenDate: breakEvenDate || 'Not Reached', daysToBreakEven, expenseBreakdown, monthlyIncome,
    };
  }, [selected, expenses, income]);

  function openAddAccount() {
    setAccountForm(EMPTY_FORM);
    setEditingAccount(false);
    setAccountError('');
    setShowAddAccount(true);
  }
  function openEditAccount() {
    setAccountForm({
      name: selected.name, businessModel: selected.businessModel || 'Revenue Sharing',
      numberOfChairs: selected.numberOfChairs ?? '', goLiveDate: selected.goLiveDate || '',
      monthlyFee: selected.monthlyFee ?? '', revenueSharePercent: selected.revenueSharePercent ?? '',
      streetAddress: selected.streetAddress || '', city: selected.city || '', state: selected.state || '', zipCode: selected.zipCode || '',
      customerContactName: selected.customerContactName || '', customerContactPhone: selected.customerContactPhone || '', customerContactEmail: selected.customerContactEmail || '',
      bdConsultantName: selected.bdConsultantName || '', bdConsultantPhone: selected.bdConsultantPhone || '', bdConsultantEmail: selected.bdConsultantEmail || '',
      contact2Name: selected.contact2Name || '', contact2Phone: selected.contact2Phone || '', contact2Email: selected.contact2Email || '', editNotes: selected.editNotes || '',
    });
    setEditingAccount(true);
    setAccountError('');
    setShowAddAccount(true);
  }

  async function submitAccount(e) {
    e.preventDefault();
    setAccountError('');
    if (!accountForm.name.trim()) { setAccountError('Installation name is required.'); return; }
    const res = await authedFetch('/api/projects', { method: 'POST', body: JSON.stringify(accountForm) });
    if (!res.ok) { setAccountError((await res.json()).error); return; }
    setShowAddAccount(false);
    loadProjects();
    if (editingAccount) setSelectedName(accountForm.name);
  }

  async function submitExpense(e) {
    e.preventDefault();
    setFormError('');
    const res = await authedFetch('/api/expenses', { method: 'POST', body: JSON.stringify({ location: selectedName, ...expForm }) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setExpForm({ date: '', category: '', item: '', description: '', source: '', quantity: 1, costPerUnit: '', notes: '' });
    loadDetail(selectedName);
  }
  async function submitIncome(e) {
    e.preventDefault();
    setFormError('');
    const res = await authedFetch('/api/income', { method: 'POST', body: JSON.stringify({ location: selectedName, ...incForm }) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setIncForm({ date: '', amount: '', notes: '' });
    loadDetail(selectedName);
  }
  async function submitNote(e) {
    e.preventDefault();
    setFormError('');
    const res = await authedFetch('/api/communication-log', { method: 'POST', body: JSON.stringify({ location: selectedName, ...noteForm }) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setNoteForm({ note: '', channel: 'Call' });
    loadDetail(selectedName);
  }

  const isAdmin = session?.role === 'Admin';

  return (
    <Layout active={tab} onNavigate={navigate}>
      {!selected ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h1>Installations</h1>
            {isAdmin && <button className="btn" onClick={openAddAccount}>+ Add New Account</button>}
          </div>

          <div className="inline-form">
            <label>Business model
              <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
                <option value="All">All</option>
                {businessModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label>State
              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                <option value="All">All</option>
                {statesForModel.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          {loading && <p className="muted">Loading…</p>}
          {!loading && filteredProjects.length === 0 && (
            <p className="muted">
              No installations match this filter. {projects.length === 0 && <>An admin can bring in the old Project Details sheet from <a href="/admin/import">Import Data</a>.</>}
            </p>
          )}
          {!loading && filteredProjects.length > 0 && (
            <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Business Model</th><th>State</th><th>Monthly Fee</th></tr></thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p.id} onClick={() => setSelectedName(p.name)} style={{ cursor: 'pointer' }}>
                    <td>{p.name}</td><td>{p.businessModel}</td><td>{p.state}</td>
                    <td>{p.monthlyFee != null && p.monthlyFee !== '' ? `$${p.monthlyFee}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <button className="btn" onClick={() => setSelectedName(null)}>← Back to all installations</button>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && <button className="btn" onClick={openEditAccount}>Edit Company</button>}
            </div>
          </div>
          <h2>{selected.name}</h2>

          <div className="card">
            <div className="grid-3">
              <div>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Install Date</div>
                <div>{selected.goLiveDate || '—'}</div>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginTop: 12 }}>Address</div>
                <div>{selected.streetAddress}<br />{selected.city}, {selected.state} {selected.zipCode}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Contact</div>
                <div>{selected.customerContactName || '—'}</div>
                <div className="muted">{selected.customerContactPhone}</div>
                <div className="muted">{selected.customerContactEmail}</div>
                {selected.contact2Name && (
                  <>
                    <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginTop: 12 }}>Contact 2</div>
                    <div>{selected.contact2Name}</div>
                    <div className="muted">{selected.contact2Phone}</div>
                    <div className="muted">{selected.contact2Email}</div>
                  </>
                )}
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>BD Consultant</div>
                <div>{selected.bdConsultantName || '—'}</div>
                <div className="muted">{selected.bdConsultantPhone}</div>
                <div className="muted">{selected.bdConsultantEmail}</div>
              </div>
            </div>
          </div>

          {metrics && (
            <>
              <div className="grid-4">
                <Kpi label="Current monthly revenue" value={fmt(metrics.currentMonthlyRevenue)} />
                <Kpi label="Total LEMO income" value={fmt(metrics.totalLemoIncome)} />
                <Kpi label="Total expenses" value={fmt(metrics.totalExpenses)} />
                <Kpi label="Net profit / loss" value={fmt(metrics.netProfitLoss)} negative={metrics.netProfitLoss < 0} />
              </div>

              <div className="grid-3">
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>ROI progress</h3>
                  <div style={{ background: 'var(--warm-white)', border: '1px solid var(--iron)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ background: 'var(--ember)', height: '100%', width: `${(metrics.roiProgress || 0) * 100}%` }} />
                  </div>
                  <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>{metrics.roiProgress != null ? `${(metrics.roiProgress * 100).toFixed(1)}% of expenses recovered` : '—'}</span>
                    <span>{metrics.breakEvenDate === 'Not Reached' ? `Not Reached · ${metrics.daysToBreakEven}` : `Reached ${metrics.breakEvenDate} · ${metrics.daysToBreakEven}`}</span>
                  </div>
                  {selected.tenureMonths != null && selected.tenureMonths !== '' && (
                    <div className="muted" style={{ fontSize: '0.85rem', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--warm-white)' }}>
                      {selected.tenureMonths} month{selected.tenureMonths === 1 ? '' : 's'} with LEMO<br />
                      {selected.avgMonthlyRevenue != null && selected.avgMonthlyRevenue !== '' && `${fmt(selected.avgMonthlyRevenue)}/month avg since go-live`}
                    </div>
                  )}
                  <div style={{ fontWeight: 500, marginTop: 16 }}>{selected.businessModel}</div>
                  {selected.businessModel === 'Revenue Sharing' && (
                    <div className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: 6 }}>
                      Revenue income is based on the 80/20 rule: LEMO receives 80% of gross customer revenue, the venue receives 20%.
                    </div>
                  )}
                </div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Expense categories (all-time)</h3>
                  {metrics.expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={metrics.expenseBreakdown} dataKey="total" nameKey="category" outerRadius={80} label={(e) => e.category}>
                          {metrics.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="muted">No expenses yet.</p>}
                </div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Monthly income</h3>
                  {metrics.monthlyIncome.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={metrics.monthlyIncome}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => fmt(v)} />
                        <Bar dataKey="total" fill="#E85D20" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="muted">No income yet.</p>}
                </div>
              </div>
            </>
          )}

          {formError && <p className="form-error">{formError}</p>}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Expenses</h3>
            {isAdmin && (
              <form className="inline-form" onSubmit={submitExpense}>
                <label>Date<input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} required /></label>
                <label>Category<input value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} required /></label>
                <label>Item<input value={expForm.item} onChange={(e) => setExpForm({ ...expForm, item: e.target.value })} /></label>
                <label>Source<input value={expForm.source} onChange={(e) => setExpForm({ ...expForm, source: e.target.value })} /></label>
                <label>Qty<input type="number" min="0" step="1" value={expForm.quantity} onChange={(e) => setExpForm({ ...expForm, quantity: e.target.value })} required style={{ width: 70 }} /></label>
                <label>Cost/Unit<input type="number" min="0" step="0.01" value={expForm.costPerUnit} onChange={(e) => setExpForm({ ...expForm, costPerUnit: e.target.value })} required style={{ width: 90 }} /></label>
                <button className="btn" type="submit">+ Add Expense</button>
              </form>
            )}
            <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Item</th><th>Amount</th></tr></thead>
              <tbody>
                {expenses.slice(0, 10).map((e) => (
                  <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.item}</td><td>{fmt(e.amount)}</td></tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={4} className="muted">No expenses recorded.</td></tr>}
              </tbody>
            </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Income</h3>
            {isAdmin && selected.businessModel === 'Corporate Wellness' ? (
              <form className="inline-form" onSubmit={submitIncome}>
                <label>Date<input type="date" value={incForm.date} onChange={(e) => setIncForm({ ...incForm, date: e.target.value })} required /></label>
                <label>Amount<input type="number" min="0" step="0.01" value={incForm.amount} onChange={(e) => setIncForm({ ...incForm, amount: e.target.value })} required /></label>
                <label>Notes<input value={incForm.notes} onChange={(e) => setIncForm({ ...incForm, notes: e.target.value })} /></label>
                <button className="btn" type="submit">+ Add Income</button>
              </form>
            ) : isAdmin && (
              <p className="muted" style={{ fontSize: '0.8rem' }}>Adding income manually is only available for Corporate Wellness locations.</p>
            )}
            <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Notes</th></tr></thead>
              <tbody>
                {income.slice(0, 10).map((i) => (
                  <tr key={i.id}><td>{i.date}</td><td>{fmt(i.amount)}</td><td>{i.notes}</td></tr>
                ))}
                {income.length === 0 && <tr><td colSpan={3} className="muted">No income recorded.</td></tr>}
              </tbody>
            </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Communication Log</h3>
            <form className="inline-form" onSubmit={submitNote}>
              <label style={{ flex: 1, minWidth: 220 }}>Note<input value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} required /></label>
              <label>Channel
                <select value={noteForm.channel} onChange={(e) => setNoteForm({ ...noteForm, channel: e.target.value })}>
                  <option>Call</option><option>Email</option><option>Text</option><option>In Person</option>
                </select>
              </label>
              <button className="btn" type="submit">+ Log Note</button>
            </form>
            {notes.map((n) => (
              <p key={n.id}><strong>{n.date}</strong> ({n.channel}) — {n.note} <span className="muted">— {n.loggedBy}</span></p>
            ))}
            {notes.length === 0 && <p className="muted">No notes logged yet.</p>}
          </div>
        </div>
      )}

      {showAddAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={submitAccount} style={{ background: 'var(--warm-white)', width: '90%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editingAccount ? 'Edit Company' : 'Add New Account'}</h3>
            {accountError && <p className="form-error">{accountError}</p>}
            <div className="form-grid-2">
              <label>Name<input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} disabled={editingAccount} required /></label>
              <label>Business Model
                <select value={accountForm.businessModel} onChange={(e) => setAccountForm({ ...accountForm, businessModel: e.target.value })}>
                  <option>Revenue Sharing</option><option>Corporate Wellness</option>
                </select>
              </label>
              <label>Number of Chairs<input type="number" value={accountForm.numberOfChairs} onChange={(e) => setAccountForm({ ...accountForm, numberOfChairs: e.target.value })} /></label>
              <label>Go-Live Date<input type="date" value={accountForm.goLiveDate} onChange={(e) => setAccountForm({ ...accountForm, goLiveDate: e.target.value })} /></label>
              {accountForm.businessModel === 'Corporate Wellness' ? (
                <label>Monthly Fee<input type="number" value={accountForm.monthlyFee} onChange={(e) => setAccountForm({ ...accountForm, monthlyFee: e.target.value })} /></label>
              ) : (
                <label>LEMO Revenue Share %<input type="number" value={accountForm.revenueSharePercent} onChange={(e) => setAccountForm({ ...accountForm, revenueSharePercent: e.target.value })} /></label>
              )}
              <label>Street Address<input value={accountForm.streetAddress} onChange={(e) => setAccountForm({ ...accountForm, streetAddress: e.target.value })} /></label>
              <label>City<input value={accountForm.city} onChange={(e) => setAccountForm({ ...accountForm, city: e.target.value })} /></label>
              <label>State<input value={accountForm.state} onChange={(e) => setAccountForm({ ...accountForm, state: e.target.value })} /></label>
              <label>ZIP<input value={accountForm.zipCode} onChange={(e) => setAccountForm({ ...accountForm, zipCode: e.target.value })} /></label>
              <label>Customer Contact<input value={accountForm.customerContactName} onChange={(e) => setAccountForm({ ...accountForm, customerContactName: e.target.value })} /></label>
              <label>Customer Phone<input value={accountForm.customerContactPhone} onChange={(e) => setAccountForm({ ...accountForm, customerContactPhone: e.target.value })} /></label>
              <label>Customer Email<input value={accountForm.customerContactEmail} onChange={(e) => setAccountForm({ ...accountForm, customerContactEmail: e.target.value })} /></label>
              <label>BD Consultant<input value={accountForm.bdConsultantName} onChange={(e) => setAccountForm({ ...accountForm, bdConsultantName: e.target.value })} /></label>
              <label>BD Phone<input value={accountForm.bdConsultantPhone} onChange={(e) => setAccountForm({ ...accountForm, bdConsultantPhone: e.target.value })} /></label>
              <label>BD Email<input value={accountForm.bdConsultantEmail} onChange={(e) => setAccountForm({ ...accountForm, bdConsultantEmail: e.target.value })} /></label>
              <label>Contact 2 Name<input value={accountForm.contact2Name} onChange={(e) => setAccountForm({ ...accountForm, contact2Name: e.target.value })} /></label>
              <label>Contact 2 Phone<input value={accountForm.contact2Phone} onChange={(e) => setAccountForm({ ...accountForm, contact2Phone: e.target.value })} /></label>
              <label>Contact 2 Email<input value={accountForm.contact2Email} onChange={(e) => setAccountForm({ ...accountForm, contact2Email: e.target.value })} /></label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>Notes
              <textarea value={accountForm.editNotes} onChange={(e) => setAccountForm({ ...accountForm, editNotes: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid var(--iron)', borderRadius: 4 }} rows={2} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--ash)', border: '1px solid var(--iron)' }} onClick={() => setShowAddAccount(false)}>Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}

function Kpi({ label, value, negative }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem', color: negative ? 'var(--ember-muted)' : 'var(--obsidian)' }}>{value}</div>
    </div>
  );
}
