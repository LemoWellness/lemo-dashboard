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
  const acc = DETAIL_SECTIONS.reduce((m, id) => { m[id] = false; return m; }, {});
  acc.project = true;
  acc.pricing = true;
  acc.scenarios = true;
  acc.decision = true;
  return acc;
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
  return 'No Payback at Current Expected Scenario';
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
    <div className="card kpi-card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '1.35rem' }}>{value}</div>
    </div>
  );
}
