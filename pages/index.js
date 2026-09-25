import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import AccountChrome from '../components/AccountChrome';
import AccountUsage from '../components/AccountUsage';
import AccountPayouts from '../components/AccountPayouts';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import CommunicationLogModal from '../components/CommunicationLogModal';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../lib/firebaseClient';

const PIE_COLORS = ['#E85D20', '#0C0A09', '#706B66', '#2A1A10'];
const fmt = (n) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : (n ?? '-'));
function monthLabelFromKey(key) {
  const [y, m] = String(key).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

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
  const [incForm, setIncForm] = useState({ date: '', periodMonth: '', amount: '', notes: '' });
  const [noteForm, setNoteForm] = useState({ note: '', channel: 'Call', loggedBy: '' });
  const [formError, setFormError] = useState('');
  const [openSections, setOpenSections] = useState({ expenses: true, income: true, commlog: true });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(false);
  const [viewingIncome, setViewingIncome] = useState(false);
  const [viewingNote, setViewingNote] = useState(false);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'daily') return router.push('/daily');
    if (code === 'usage') return router.push('/usage');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'risk') return router.push('/risk');
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

  const businessModels = useMemo(() => [...new Set(projects.map((p) => p.businessModel).filter(Boolean))], [projects]);
  const statesForModel = useMemo(() => {
    const pool = modelFilter === 'All' ? projects : projects.filter((p) => p.businessModel === modelFilter);
    return [...new Set(pool.map((p) => p.state).filter(Boolean))].sort();
  }, [projects, modelFilter]);
  useEffect(() => { if (stateFilter !== 'All' && !statesForModel.includes(stateFilter)) setStateFilter('All'); }, [statesForModel]);
  const filteredProjects = projects.filter((p) => (modelFilter === 'All' || p.businessModel === modelFilter) && (stateFilter === 'All' || p.state === stateFilter));

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
    const sortedIncome = [...income].filter((i) => i.date).sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0, breakEvenDate = null;
    for (const i of sortedIncome) {
      cumulative += Number(i.amount) || 0;
      if (cumulative >= totalExpenses && totalExpenses > 0) { breakEvenDate = i.date; break; }
    }
    let daysToBreakEven = '-';
    if (selected.goLiveDate) {
      const goLive = new Date(selected.goLiveDate);
      daysToBreakEven = breakEvenDate
        ? `${Math.round((new Date(breakEvenDate) - goLive) / 86400000)} days`
        : `${Math.round((new Date() - goLive) / 86400000)} days (Still Recovering)`;
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
      const key = String(i.date).slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { key, total: 0, label: monthLabelFromKey(key) };
      byMonth[key].total += Number(i.amount) || 0;
    });
    return {
      totalExpenses, totalLemoIncome, netProfitLoss, roiProgress, currentMonthlyRevenue,
      breakEvenDate: breakEvenDate || 'Not Reached', daysToBreakEven, expenseBreakdown,
      monthlyIncome: Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key)),
    };
  }, [selected, expenses, income]);

  function openAddAccount() { setAccountForm(EMPTY_FORM); setEditingAccount(false); setAccountError(''); setShowAddAccount(true); }
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
    setEditingAccount(true); setAccountError(''); setShowAddAccount(true);
  }
  async function submitAccount(e) {
    e.preventDefault(); setAccountError('');
    if (!accountForm.name.trim()) { setAccountError('Installation name is required.'); return; }
    const res = await authedFetch('/api/projects', { method: 'POST', body: JSON.stringify(accountForm) });
    if (!res.ok) { setAccountError((await res.json()).error); return; }
    setShowAddAccount(false); loadProjects(); if (editingAccount) setSelectedName(accountForm.name);
  }
  async function submitExpense(e) {
    e.preventDefault(); setFormError('');
    if (viewingExpense) return;
    const method = expForm.id ? 'PUT' : 'POST';
    const res = await authedFetch('/api/expenses', { method, body: JSON.stringify({ location: selectedName, ...expForm }) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setExpForm({ date: '', category: '', item: '', description: '', source: '', quantity: 1, costPerUnit: '', notes: '' });
    setViewingExpense(false); setShowExpenseModal(false); loadDetail(selectedName);
  }
  async function submitIncome(e) {
    e.preventDefault(); setFormError('');
    if (viewingIncome) return;
    const method = incForm.id ? 'PUT' : 'POST';
    const res = await authedFetch('/api/income', { method, body: JSON.stringify({ location: selectedName, ...incForm }) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setIncForm({ date: '', periodMonth: '', amount: '', notes: '' });
    setViewingIncome(false); setShowIncomeModal(false); loadDetail(selectedName);
  }
  async function submitNote(e) {
    e.preventDefault(); setFormError('');
    if (viewingNote) return;
    const method = noteForm.id ? 'PUT' : 'POST';
    const res = await authedFetch('/api/communication-log', { method, body: JSON.stringify({ location: selectedName, ...noteForm }) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setNoteForm({ note: '', channel: 'Call', loggedBy: '' });
    setViewingNote(false); setShowNoteModal(false); loadDetail(selectedName);
  }
  function openExpenseModal() { setExpForm({ date: new Date().toISOString().slice(0, 10), category: '', item: '', description: '', source: '', quantity: 1, costPerUnit: '', notes: '' }); setViewingExpense(false); setFormError(''); setShowExpenseModal(true); }
  function openIncomeModal() {
    const today = new Date().toISOString().slice(0, 10);
    setIncForm({ date: today, periodMonth: today.slice(0, 7), amount: '', notes: '' });
    setViewingIncome(false);
    setFormError('');
    setShowIncomeModal(true);
  }
  function openNoteModal() { setNoteForm({ date: new Date().toISOString().slice(0, 10), note: '', channel: 'Call', loggedBy: '' }); setViewingNote(false); setFormError(''); setShowNoteModal(true); }
  function openExpenseRow(row) {
    setExpForm({
      id: row.id,
      date: row.date || '',
      category: row.category || '',
      item: row.item || '',
      description: row.description || '',
      source: row.source || '',
      quantity: row.quantity ?? 1,
      costPerUnit: row.costPerUnit ?? '',
      notes: row.notes || '',
    });
    setViewingExpense(true); setFormError(''); setShowExpenseModal(true);
  }
  function openIncomeRow(row) {
    setIncForm({
      id: row.id,
      date: row.date || '',
      periodMonth: row.periodMonth || String(row.date || '').slice(0, 7),
      amount: row.amount ?? '',
      notes: row.notes || '',
    });
    setViewingIncome(true); setFormError(''); setShowIncomeModal(true);
  }
  function openNoteRow(row) {
    setNoteForm({
      id: row.id,
      date: row.date || '',
      note: row.note || '',
      channel: row.channel || 'Call',
      loggedBy: row.loggedBy || '',
    });
    setViewingNote(true); setFormError(''); setShowNoteModal(true);
  }
  async function downloadExpensePdf() {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text('LEMO Expense Report', 40, 40);
    doc.setFontSize(12); doc.text(selectedName, 40, 58);
    autoTable(doc, { startY: 84, head: [['Date', 'Category', 'Item', 'Source', 'Description', 'Cost', 'Qty', 'Notes']], body: expenses.map((e) => [e.date || '', e.category || '', e.item || '', e.source || '', e.description || '', e.costPerUnit != null ? `$${Number(e.costPerUnit).toFixed(2)}` : '', e.quantity ?? '', e.notes || '']), headStyles: { fillColor: [12, 10, 9] }, styles: { fontSize: 8 } });
    doc.save(`LEMO-Expenses-${selectedName}.pdf`);
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
            <label>Business model<select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}><option value="All">All</option>{businessModels.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <label>State<select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}><option value="All">All</option>{statesForModel.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          </div>
          {loading && <p className="muted">Loading...</p>}
          {!loading && filteredProjects.length > 0 && (
            <div className="table-wrap"><table>
              <thead><tr><th>Name</th><th>Business Model</th><th>State</th><th>Monthly Fee</th></tr></thead>
              <tbody>{filteredProjects.map((p) => (<tr key={p.id} onClick={() => setSelectedName(p.name)} style={{ cursor: 'pointer' }}><td>{p.name}</td><td>{p.businessModel}</td><td>{p.state}</td><td>{p.monthlyFee != null && p.monthlyFee !== '' ? `$${p.monthlyFee}` : ''}</td></tr>))}</tbody>
            </table></div>
          )}
        </>
      ) : (
        <div>
          <AccountChrome selected={selected} isAdmin={isAdmin} onBack={() => setSelectedName(null)} onEdit={openEditAccount} onNote={openNoteModal} onIncome={openIncomeModal} onExpense={openExpenseModal} />
          {metrics && (<><div className="grid-4"><Kpi label={selected.businessModel === 'Corporate Wellness' ? 'Monthly Fee' : 'Current monthly revenue'} value={fmt(metrics.currentMonthlyRevenue)} /><Kpi label="Total Income" value={fmt(metrics.totalLemoIncome)} /><Kpi label="Total expenses" value={fmt(metrics.totalExpenses)} /><Kpi label="Net profit / loss" value={fmt(metrics.netProfitLoss)} negative={metrics.netProfitLoss < 0} /></div>
          <div className="grid-3">
            <div className="card"><h3 style={{ marginTop: 0 }}>ROI progress</h3>
              <div style={{ background: 'var(--warm-white)', border: '1px solid var(--iron)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 10 }}><div style={{ background: 'var(--ember)', height: '100%', width: `${(metrics.roiProgress || 0) * 100}%` }} /></div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                {metrics.roiProgress != null
                  ? `${(metrics.roiProgress * 100).toFixed(1)}% recovered (${fmt(metrics.totalLemoIncome)} of ${fmt(metrics.totalExpenses)})`
                  : 'Add expenses to track recovery'}
                {' '}{String.fromCharCode(0x00b7)}{' '}
                {metrics.breakEvenDate === 'Not Reached' ? `Not reached ${String.fromCharCode(0x00b7)} ${metrics.daysToBreakEven}` : `Reached ${metrics.breakEvenDate}`}
              </div>
              <div style={{ fontWeight: 500, marginTop: 16 }}>{selected.businessModel}</div>
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Expense categories (all-time)</h3>{metrics.expenseBreakdown.length > 0 ? (<ResponsiveContainer width="100%" height={200}><PieChart><Pie data={metrics.expenseBreakdown} dataKey="total" nameKey="category" outerRadius="75%" label={(e) => e.category}>{metrics.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(v) => fmt(v)} /></PieChart></ResponsiveContainer>) : <p className="muted">No expenses yet.</p>}</div>
            {selected.businessModel !== 'Revenue Sharing' && (<div className="card"><h3 style={{ marginTop: 0 }}>Monthly income</h3>{metrics.monthlyIncome.length > 0 ? (<ResponsiveContainer width="100%" height={220}><BarChart data={metrics.monthlyIncome}><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="total" fill="#E85D20" /></BarChart></ResponsiveContainer>) : <p className="muted">No income yet.</p>}</div>)}
          </div></>)}
          {selected.businessModel === 'Revenue Sharing' && <AccountPayouts income={income} expenses={expenses} />}
          <AccountUsage venue={selected.name} />
          <Collapsible title="Expenses" open={openSections.expenses} onToggle={() => setOpenSections({ ...openSections, expenses: !openSections.expenses })} actions={isAdmin && (<><button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); downloadExpensePdf(); }}>Download PDF</button><button className="btn" onClick={(e) => { e.stopPropagation(); openExpenseModal(); }}>+ Add Expense</button></>)}>
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Item</th><th>Amount</th></tr></thead><tbody>{expenses.slice(0, 10).map((e) => (<tr key={e.id} onClick={() => openExpenseRow(e)} style={{ cursor: 'pointer' }}><td>{e.date}</td><td>{e.category}</td><td>{e.item}</td><td>{fmt(e.amount)}</td></tr>))}{expenses.length === 0 && <tr><td colSpan={4} className="muted">No expenses recorded.</td></tr>}</tbody></table></div>
          </Collapsible>
          <Collapsible title="Income" open={openSections.income} onToggle={() => setOpenSections({ ...openSections, income: !openSections.income })} actions={isAdmin && selected.businessModel === 'Corporate Wellness' && (<button className="btn" onClick={(e) => { e.stopPropagation(); openIncomeModal(); }}>+ Add Income</button>)}>
            <div className="table-wrap"><table><thead><tr><th>Date received</th><th>Paying for</th><th>Amount</th><th>Notes</th></tr></thead><tbody>{income.slice(0, 10).map((i) => (<tr key={i.id} onClick={() => openIncomeRow(i)} style={{ cursor: 'pointer' }}><td>{i.date}</td><td>{i.periodMonth || String(i.date || '').slice(0, 7)}</td><td>{fmt(i.amount)}</td><td>{i.notes}</td></tr>))}{income.length === 0 && <tr><td colSpan={4} className="muted">No income recorded.</td></tr>}</tbody></table></div>
          </Collapsible>
          <Collapsible title="Communication Log" open={openSections.commlog} onToggle={() => setOpenSections({ ...openSections, commlog: !openSections.commlog })} actions={<button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); openNoteModal(); }}>+ Communication Log</button>}>
            {notes.map((n) => (<p key={n.id} onClick={() => openNoteRow(n)} style={{ cursor: 'pointer' }}><strong>{n.date}</strong> ({n.channel}) - {n.note} <span className="muted">- {n.loggedBy}</span></p>))}
            {notes.length === 0 && <p className="muted">No notes logged yet.</p>}
          </Collapsible>
        </div>
      )}
      {showAddAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: '24px 12px', overflowY: 'auto' }}>
          <form className="card" onSubmit={submitAccount} style={{ background: 'var(--warm-white)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editingAccount ? 'Edit Company' : 'Add New Account'}</h3>
            {accountError && <p className="form-error">{accountError}</p>}
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ash)', margin: '12px 0 8px' }}>Account Information</div>
            <div className="form-grid-2">
              <label>Name<input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} disabled={editingAccount} required /></label>
              <label>Business Model<select value={accountForm.businessModel} onChange={(e) => setAccountForm({ ...accountForm, businessModel: e.target.value })}><option>Revenue Sharing</option><option>Corporate Wellness</option></select></label>
              <label>Number of Chairs<input type="number" value={accountForm.numberOfChairs} onChange={(e) => setAccountForm({ ...accountForm, numberOfChairs: e.target.value })} /></label>
              <label>Go-Live Date<input type="date" value={accountForm.goLiveDate} onChange={(e) => setAccountForm({ ...accountForm, goLiveDate: e.target.value })} /></label>
              {accountForm.businessModel === 'Corporate Wellness'
                ? <label>Monthly Fee<input type="number" value={accountForm.monthlyFee} onChange={(e) => setAccountForm({ ...accountForm, monthlyFee: e.target.value })} /></label>
                : <label>LEMO Revenue Share %<input type="number" value={accountForm.revenueSharePercent} onChange={(e) => setAccountForm({ ...accountForm, revenueSharePercent: e.target.value })} /></label>}
            </div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ash)', margin: '16px 0 8px' }}>Venue Address</div>
            <div className="form-grid-2">
              <label>Street Address<input value={accountForm.streetAddress} onChange={(e) => setAccountForm({ ...accountForm, streetAddress: e.target.value })} /></label>
              <label>City<input value={accountForm.city} onChange={(e) => setAccountForm({ ...accountForm, city: e.target.value })} /></label>
              <label>State<input value={accountForm.state} onChange={(e) => setAccountForm({ ...accountForm, state: e.target.value })} /></label>
              <label>ZIP<input value={accountForm.zipCode} onChange={(e) => setAccountForm({ ...accountForm, zipCode: e.target.value })} /></label>
            </div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ash)', margin: '16px 0 8px' }}>Primary Venue Contact</div>
            <div className="form-grid-2">
              <label>Name<input value={accountForm.customerContactName} onChange={(e) => setAccountForm({ ...accountForm, customerContactName: e.target.value })} /></label>
              <label>Phone<input value={accountForm.customerContactPhone} onChange={(e) => setAccountForm({ ...accountForm, customerContactPhone: e.target.value })} /></label>
              <label>Email<input type="email" value={accountForm.customerContactEmail} onChange={(e) => setAccountForm({ ...accountForm, customerContactEmail: e.target.value })} /></label>
            </div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ash)', margin: '16px 0 8px' }}>Secondary Venue Contact (Optional)</div>
            <div className="form-grid-2">
              <label>Name<input value={accountForm.contact2Name} onChange={(e) => setAccountForm({ ...accountForm, contact2Name: e.target.value })} /></label>
              <label>Phone<input value={accountForm.contact2Phone} onChange={(e) => setAccountForm({ ...accountForm, contact2Phone: e.target.value })} /></label>
              <label>Email<input type="email" value={accountForm.contact2Email} onChange={(e) => setAccountForm({ ...accountForm, contact2Email: e.target.value })} /></label>
            </div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ash)', margin: '16px 0 8px' }}>BD Consultant</div>
            <div className="form-grid-2">
              <label>Name<input value={accountForm.bdConsultantName} onChange={(e) => setAccountForm({ ...accountForm, bdConsultantName: e.target.value })} /></label>
              <label>Phone<input value={accountForm.bdConsultantPhone} onChange={(e) => setAccountForm({ ...accountForm, bdConsultantPhone: e.target.value })} /></label>
              <label>Email<input type="email" value={accountForm.bdConsultantEmail} onChange={(e) => setAccountForm({ ...accountForm, bdConsultantEmail: e.target.value })} /></label>
            </div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ash)', margin: '16px 0 8px' }}>Notes</div>
            <label style={{ display: 'block' }}>Notes
              <textarea value={accountForm.editNotes} onChange={(e) => setAccountForm({ ...accountForm, editNotes: e.target.value })} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--iron)', borderRadius: 4, marginTop: 4, fontFamily: 'inherit' }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddAccount(false)}>Cancel</button>
              <button type="submit" className="btn">{editingAccount ? 'Save Company' : 'Save Account'}</button>
            </div>
          </form>
        </div>
      )}
      {showExpenseModal && <AddExpenseModal venue={selectedName} form={expForm} error={formError} readOnly={viewingExpense} canEdit={isAdmin} onEdit={() => setViewingExpense(false)} onChange={setExpForm} onClose={() => { setShowExpenseModal(false); setViewingExpense(false); }} onSubmit={submitExpense} />}
      {showIncomeModal && <AddIncomeModal venue={selectedName} form={incForm} error={formError} readOnly={viewingIncome} canEdit={isAdmin} onEdit={() => setViewingIncome(false)} onChange={setIncForm} onClose={() => { setShowIncomeModal(false); setViewingIncome(false); }} onSubmit={submitIncome} />}
      {showNoteModal && <CommunicationLogModal venue={selectedName} form={noteForm} error={formError} readOnly={viewingNote} canEdit={!!session} onEdit={() => setViewingNote(false)} onChange={setNoteForm} onClose={() => { setShowNoteModal(false); setViewingNote(false); }} onSubmit={submitNote} />}
    </Layout>
  );
}
function Kpi({ label, value, negative }) {
  return (<div className="card kpi-card" style={{ marginBottom: 0 }}><div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div><div style={{ fontFamily: "'Lora', serif", fontSize: '1.5rem', color: negative ? 'var(--ember-muted)' : 'var(--obsidian)' }}>{value}</div></div>);
}
function Collapsible({ title, open, onToggle, actions, children }) {
  return (<div className="card"><div onClick={onToggle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 14 : 0 }}><h3 style={{ margin: 0 }}>{title}</h3><div style={{ display: 'flex', gap: 8 }}>{actions}</div></div>{open && children}</div>);
}
