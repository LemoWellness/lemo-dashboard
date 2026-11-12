import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VENUES = [
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Coddingtown Mall","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Culver City (aka Fox Hills)","city":"Culver City","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Eagle Rock Plaza","city":"Los Angeles","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Beverly Center","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Arden Fair","city":"Sacramento","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Hillsdale Shopping Center","city":"San Mateo","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Oaks","city":"Thousand Oaks","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"MainPlace","city":"Santa Ana","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Los Cerritos Center","city":"Cerritos","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Northridge Fashion Center","city":"Northridge","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Stonestown Galleria","city":"San Francisco","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Sunvalley Shopping Center","city":"Concord","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Westfield Topanga","city":"Canoga Park","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food court"},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"NorthPark Center","city":"Dallas","state":"TX","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Galleria","city":"Houston","state":"TX","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall"}
];

const STATES = [...new Set(VENUES.map((v) => v.state))].sort();

export default function Opportunities() {
  const router = useRouter();
  const { session } = useAuth();
  const [stateFilter, setStateFilter] = useState('All');
  const [chairFilter, setChairFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'reporting') return router.push('/reporting');
    if (code === 'risk') return router.push('/risk');
  }

  const filtered = useMemo(() => {
    return VENUES.filter((v) => {
      if (stateFilter !== 'All' && v.state !== stateFilter) return false;
      if (chairFilter === 'Has chairs' && !v.hasSmarteCarte) return false;
      if (chairFilter === 'No chairs' && v.hasSmarteCarte) return false;
      return true;
    });
  }, [stateFilter, chairFilter]);

  return (
    <Layout active="risk" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Indoor Malls & Food Courts</h1>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Full list of indoor shopping centers and food courts. Flagged if Smarte Carte already has massage chairs (skip those). {VENUES.length} venues shown (expanding).
      </p>

      <div className="inline-form">
        <label>
          State
          <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Massage chairs
          <select value={chairFilter} onChange={(e) => { setChairFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            <option>Has chairs</option>
            <option>No chairs</option>
          </select>
        </label>
        <span className="muted" style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
          {filtered.length} shown
        </span>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0, maxHeight: '70vh', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Venues</h3>
          {filtered.length === 0 && <p className="muted">None match filters.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((v) => (
              <button
                key={v.name}
                type="button"
                className="btn btn-ghost"
                style={{
                  textAlign: 'left',
                  background: selected?.name === v.name ? 'var(--ember)' : 'transparent',
                  color: selected?.name === v.name ? '#fff' : 'var(--ink)',
                  border: '1px solid var(--iron)',
                }}
                onClick={() => setSelected(v)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{v.name}</strong>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: v.hasSmarteCarte ? '#fdeceb' : '#e8f5e9',
                    color: v.hasSmarteCarte ? 'var(--ember-muted)' : '#2e7d32',
                    whiteSpace: 'nowrap',
                  }}>
                    {v.hasSmarteCarte ? 'Has chairs' : 'Open'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{v.city}, {v.state} · {v.type}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>Detail</h3>
          {!selected && <p className="muted">Select a venue to see details.</p>}
          {selected && (
            <>
              <p style={{ margin: '0 0 8px' }}><strong>{selected.name}</strong></p>
              <p className="muted" style={{ margin: '0 0 12px' }}>{selected.city}, {selected.state}</p>
              <p style={{ margin: '0 0 8px' }}>Type: {selected.type}</p>
              <p style={{ margin: '0 0 16px' }}>
                Smarte Carte massage chairs: <strong style={{ color: selected.hasSmarteCarte ? 'var(--ember-muted)' : '#2e7d32' }}>
                  {selected.hasSmarteCarte ? 'Yes — skip' : 'No — potential'}
                </strong>
              </p>
              <p style={{ marginTop: 12 }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name + ' ' + selected.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Open in Google Maps
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
