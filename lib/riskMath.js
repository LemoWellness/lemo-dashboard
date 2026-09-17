// Pure calculators for Deployment Risk Management. Not used by live ROI.

export const STATUSES = [
  'Evaluating',
  'Awaiting Information',
  'Ready for Review',
  'Approved',
  'Declined',
  'Deployed',
];

export const MALL_MODEL = 'Shopping Mall – Fixed Rent';
export const MALL_MODEL_LEGACY = 'Mall Paid Space';
export function isMallModel(m) {
  return m === MALL_MODEL || m === MALL_MODEL_LEGACY;
}
export function displayModel(m) {
  return isMallModel(m) ? MALL_MODEL : (m || '—');
}

export const MODELS = ['Revenue Sharing', 'Corporate Wellness', MALL_MODEL];
export const SOURCES = ['Existing U.S. Inventory', 'China Direct', 'Transfer From Existing U.S. Location'];
export const LINE_STATUSES = ['Assumption', 'Quote Received', 'Confirmed', 'Actual'];
export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
export const RISK_STATUSES = ['Open', 'Mitigating', 'Resolved', 'Not Applicable'];

export const RISK_CATEGORIES = [
  'Financial / ROI',
  'Revenue Uncertainty',
  'Fixed Rent Exposure',
  'Contract Term',
  'Freight / Logistics',
  'Import / Customs',
  'Certification / Compliance',
  'Installation Complexity',
  'Electrical / Site Requirements',
  'Cleaning',
  'Maintenance',
  'Local Service Availability',
  'Insurance',
  'Payment System',
  'Internet / Connectivity',
  'Distance From LEMO Operations',
  'Travel Dependency',
  'Storage / Fulfillment',
  'Operational Support',
];

export const US_LOGISTICS = [
  ['domesticFreight', 'Domestic Freight'],
  ['freightCarrier', 'Freight Carrier'],
  ['warehouse', 'Fulfillment / Warehouse Cost'],
  ['storage', 'Storage / Staging'],
  ['finalMile', 'Final Mile Delivery'],
  ['loading', 'Loading / Unloading'],
  ['installTransport', 'Installation Transportation'],
  ['otherLogistics', 'Other Logistics'],
];

export const CHINA_LOGISTICS = [
  ['chinaFreight', 'China-Side Freight / Export'],
  ['intlFreight', 'International Freight'],
  ['oceanAir', 'Ocean / Air Freight'],
  ['duty', 'Estimated Duty / Tariff'],
  ['broker', 'Customs Broker Fee'],
  ['port', 'Port Fees'],
  ['bond', 'Customs Bond / Import Fees'],
  ['drayage', 'Drayage'],
  ['usStorage', 'U.S. Storage / Staging'],
  ['finalMile', 'Final Mile Delivery'],
  ['certification', 'Certification / Testing'],
  ['otherImport', 'Other Import Costs'],
];

export const TRANSFER_LOGISTICS = [
  ['removal', 'Removal / Deinstallation'],
  ['domesticFreight', 'Domestic Freight / Transportation'],
  ['storage', 'Storage / Staging'],
  ['finalMile', 'Final Mile'],
  ['reinstall', 'Reinstallation'],
  ['otherTransfer', 'Other Transfer Costs'],
];

export const TRAVEL_KEYS = [
  ['airfare', 'Airfare'],
  ['hotel', 'Hotel'],
  ['meals', 'Meals'],
  ['ground', 'Ground Transportation'],
  ['rental', 'Rental Car'],
  ['mileage', 'Mileage'],
  ['parking', 'Parking / Tolls'],
  ['baggage', 'Baggage'],
  ['supplies', 'Travel Supplies'],
  ['miscTravel', 'Miscellaneous Travel'],
];

export const OTHER_COST_KEYS = [
  ['installLabor', 'Installation Labor'],
  ['electrical', 'Electrical Work'],
  ['internetSetup', 'Internet / Connectivity Setup'],
  ['signage', 'Signage'],
  ['fixtures', 'Fixtures'],
  ['pos', 'POS Hardware'],
  ['paymentSetup', 'Payment Setup'],
  ['cleaningSupplies', 'Initial Cleaning Supplies'],
  ['spareParts', 'Initial Maintenance / Spare Parts'],
  ['insuranceCoi', 'Insurance / COI Related Cost'],
  ['permits', 'Permits / Licenses'],
  ['compliance', 'Certification / Compliance'],
  ['storage', 'Storage'],
  ['localService', 'Local Service Setup'],
  ['other', 'Other'],
];

export const OPEX_KEYS = [
  ['rent', 'Rent / Space Fee'],
  ['cleaning', 'Cleaning'],
  ['maintenance', 'Maintenance'],
  ['localService', 'Local Service Provider'],
  ['internet', 'Internet / Connectivity'],
  ['insurance', 'Insurance Allocation'],
  ['software', 'Software'],
  ['paymentFixed', 'Payment System Fees (fixed)'],
  ['storage', 'Storage'],
  ['otherMonthly', 'Other Monthly Fixed Expenses'],
];

function n(v) {
  if (v === '' || v === undefined || v === null) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function sumItems(items) {
  return (items || []).reduce((s, i) => s + n(i.amount), 0);
}

export function itemDollarsByStatus(items) {
  const out = { Confirmed: 0, Quoted: 0, Assumed: 0, total: 0 };
  (items || []).forEach((i) => {
    const amt = n(i.amount);
    if (amt <= 0) return;
    out.total += amt;
    if (i.status === 'Confirmed' || i.status === 'Actual') out.Confirmed += amt;
    else if (i.status === 'Quote Received') out.Quoted += amt;
    else out.Assumed += amt;
  });
  return out;
}

export function logisticsKeysFor(source) {
  if (source === 'China Direct') return CHINA_LOGISTICS;
  if (source === 'Transfer From Existing U.S. Location') return TRANSFER_LOGISTICS;
  return US_LOGISTICS;
}

export function allLineItems(a) {
  const list = [];
  (a.logisticsItems || []).forEach((i) => list.push(i));
  (a.travelItems || []).forEach((i) => list.push(i));
  (a.otherCostItems || []).forEach((i) => list.push(i));
  (a.opexItems || []).forEach((i) => list.push(i));
  if (n(a.chairCostPerUnit) > 0 && a.chairQty) {
    list.push({ amount: n(a.chairCostPerUnit) * n(a.chairQty), status: a.chairCostStatus || 'Assumption' });
  }
  return list;
}

export function mixOk(rs) {
  const t = n(rs.mix10) + n(rs.mix15) + n(rs.mix25);
  return Math.abs(t - 100) < 0.05;
}

export function weightedTicket(rs) {
  if (!mixOk(rs)) return null;
  return n(rs.price10) * n(rs.mix10) / 100 + n(rs.price15) * n(rs.mix15) / 100 + n(rs.price25) * n(rs.mix25) / 100;
}

export function sharesOk(rs) {
  return Math.abs(n(rs.lemoPct) + n(rs.venuePct) + n(rs.bdPct) - 100) < 0.05;
}

export function investment(a) {
  const qty = n(a.chairQty);
  const manufacturing = (a.chairInventory === 'New' ? qty * n(a.chairCostPerUnit) : 0);
  const existingValue = (a.chairInventory === 'Existing' ? qty * n(a.assignedChairValuePerUnit) : 0);
  const alreadyPaid = !!a.chairAlreadyPaid;
  const logistics = sumItems(a.logisticsItems);
  const travel = sumItems(a.travelItems) * Math.max(1, n(a.travelTrips) || 1);
  const other = sumItems(a.otherCostItems);
  let newCash = logistics + travel + other;
  if (a.chairInventory === 'New' && manufacturing > 0 && !alreadyPaid) newCash += manufacturing;
  let totalEconomic = newCash;
  if (a.chairInventory === 'New' && manufacturing > 0 && alreadyPaid) totalEconomic += manufacturing;
  if (a.investmentScope === 'Full Investment') totalEconomic += existingValue;
  const basis = a.investmentScope === 'Full Investment' ? totalEconomic : newCash;
  return { manufacturing, existingValue, newCash, totalEconomic, basis, alreadyPaid };
}

function rsFromGross(G, rs, processingPct) {
  const venue = G * n(rs.venuePct) / 100;
  const bd = G * n(rs.bdPct) / 100;
  const processing = G * n(processingPct) / 100;
  return { gross: G, venue, bd, processing, netBeforeOpex: G - venue - bd - processing };
}

function mallFromGross(G, processingPct) {
  const processing = G * n(processingPct) / 100;
  return { gross: G, mallShare: 0, processing, netBeforeOpex: G - processing };
}

function scenarioSessions(a, spd) {
  const days = n(a.daysPerMonth);
  const uptime = n(a.uptimePct) / 100;
  const qty = n(a.chairQty);
  const perDay = n(spd) * qty * (uptime || 0);
  const perMonth = perDay * days;
  const perWeek = days ? perMonth * 7 / days : 0;
  return { perDay, perWeek, perMonth };
}

function paybackMonths(basis, monthlyProfit) {
  if (monthlyProfit <= 0) return null;
  return basis / monthlyProfit;
}

export function compute(a) {
  const inv = investment(a);
  const opex = sumItems(a.opexItems);
  const processingPct = n(a.processingPct);
  const T = (a.businessModel === 'Corporate Wellness') ? null : weightedTicket(a.rs || {});
  const days = n(a.daysPerMonth);
  const qty = n(a.chairQty);
  const M = n(a.targetPaybackMonths);
  const completeness = itemDollarsByStatus(allLineItems(a));
  const termMonths = a.termType === 'Ongoing' ? null : n(a.termMonths);
  const out = {
    inv, opex, weightedTicket: T,
    mixOk: a.businessModel === 'Corporate Wellness' ? true : mixOk(a.rs || {}),
    sharesOk: a.businessModel !== 'Revenue Sharing' || sharesOk(a.rs || {}),
    completeness, termMonths, required: null, scenarios: null, cw: null, termRisk: false, termRiskNote: '',
  };
  if (a.businessModel === 'Corporate Wellness') {
    const C = n(a.cwTotalMonthlyFee) > 0 ? n(a.cwTotalMonthlyFee) : qty * n(a.cwFeePerChair);
    const profit = C - opex;
    const pb = paybackMonths(inv.basis, profit);
    const reqC = M > 0 ? opex + inv.basis / M : null;
    out.cw = {
      monthlyContract: C, netMonthly: profit, annualContract: C * 12, paybackMonths: pb,
      requiredMonthlyContract: reqC, requiredFeePerChair: reqC != null && qty > 0 ? reqC / qty : null,
    };
    if (termMonths && pb != null && pb > termMonths) {
      out.termRisk = true;
      out.termRiskNote = 'Estimated payback exceeds expected deployment term.';
    }
    return out;
  }
  if (!out.mixOk || T == null || T <= 0 || !qty || !days) {
    if (M > 0) {
      out.required = {
        netBeforeOpex: opex + inv.basis / M, recovery: inv.basis / M, blocked: true,
        reason: !out.mixOk ? 'Session mix must total 100%.' : (!T ? 'Enter session prices and mix.' : 'Enter chairs and operating days.'),
      };
    }
    return out;
  }
  const buildScenario = (spd) => {
    const sess = scenarioSessions(a, spd);
    const G = sess.perMonth * T;
    const split = isMallModel(a.businessModel)
      ? mallFromGross(G, processingPct)
      : rsFromGross(G, a.rs || {}, processingPct);
    const profit = split.netBeforeOpex - opex;
    return { sessionsPerChairPerDay: n(spd), ...sess, ...split, opex, profit, annualRevenue: split.gross * 12, annualProfit: profit * 12, paybackMonths: paybackMonths(inv.basis, profit) };
  };
  out.scenarios = { low: buildScenario(a.spdLow), base: buildScenario(a.spdBase), high: buildScenario(a.spdHigh) };
  if (M > 0) {
    const recovery = inv.basis / M;
    const reqNetBefore = opex + recovery;
    const denom = isMallModel(a.businessModel)
      ? 1 - processingPct / 100
      : 1 - n(a.rs?.venuePct) / 100 - n(a.rs?.bdPct) / 100 - processingPct / 100;
    const reqGross = denom > 0 ? reqNetBefore / denom : null;
    const sessMonth = reqGross != null && T > 0 ? reqGross / T : null;
    const sessWeek = sessMonth != null && days ? sessMonth * 7 / days : null;
    const sessDay = sessMonth != null && days ? sessMonth / days : null;
    const sessChairDay = sessDay != null && qty ? sessDay / qty : null;
    const uptime = n(a.uptimePct) / 100;
    out.required = {
      recovery, netBeforeOpex: reqNetBefore, gross: reqGross,
      sessionsMonth: sessMonth, sessionsWeek: sessWeek, sessionsDay: sessDay, sessionsChairDay: sessChairDay,
      sessionsChairDayUptimeAdjusted: sessChairDay != null && uptime > 0 ? sessChairDay / uptime : null,
      blocked: reqGross == null,
      reason: reqGross == null ? 'LEMO share after processing is not positive.' : null,
    };
  }
  const basePb = out.scenarios.base.paybackMonths;
  if (termMonths && basePb != null && basePb > termMonths) {
    out.termRisk = true;
    out.termRiskNote = 'Estimated payback exceeds expected deployment term.';
  }
  return out;
}

export function emptyAssessment() {
  const line = (key, label) => ({ key, label, amount: '', status: 'Assumption', source: '', date: '', notes: '' });
  return {
    name: '', company: '', city: '', state: '',
    businessModel: 'Revenue Sharing', chairQty: '', chairInventory: 'New',
    inventorySource: 'Existing U.S. Inventory', targetDeployDate: '',
    termType: 'Months', termMonths: '', targetPaybackMonths: '12',
    investmentScope: 'Deployment Cost Only', status: 'Evaluating',
    chairCostPerUnit: '', assignedChairValuePerUnit: '', chairAlreadyPaid: false, chairCostStatus: 'Assumption',
    logisticsItems: US_LOGISTICS.map(([k, l]) => line(k, l)),
    travelItems: TRAVEL_KEYS.map(([k, l]) => line(k, l)), travelTrips: 1,
    otherCostItems: OTHER_COST_KEYS.map(([k, l]) => line(k, l)),
    opexItems: OPEX_KEYS.map(([k, l]) => line(k, l)), processingPct: '',
    rs: { price10: '', price15: '', price25: '', mix10: '', mix15: '', mix25: '', lemoPct: 70, venuePct: 20, bdPct: 10 },
    mallRevSharePct: '', mallMonthlyRentNote: '',
    cwFeePerChair: '', cwTotalMonthlyFee: '', cwContractStart: '', cwContractMonths: '', cwDeposit: '',
    daysPerMonth: 30, uptimePct: 100, spdLow: '', spdBase: '', spdHigh: '',
    risks: RISK_CATEGORIES.map((category) => ({ category, level: 'Low', status: 'Not Applicable', owner: '', mitigation: '', notes: '' })),
    notes: '', outstandingInfo: '', decisionDate: '', approvedBy: '', archived: false, version: 1,
  };
}

export function applySourceLines(a) {
  const keys = logisticsKeysFor(a.inventorySource);
  const prev = {};
  (a.logisticsItems || []).forEach((i) => { prev[i.key] = i; });
  return { ...a, logisticsItems: keys.map(([k, l]) => prev[k] || { key: k, label: l, amount: '', status: 'Assumption', source: '', date: '', notes: '' }) };
}

export function snapshotFields(a) {
  const skip = new Set(['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'approvedSnapshot', 'approvedAt', 'approvedByUser', 'revisedAt', 'revisedBy', 'archived', 'archivedAt']);
  const out = {};
  Object.keys(a || {}).forEach((k) => { if (!skip.has(k)) out[k] = a[k]; });
  return out;
}
