import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VENUES = [
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Mall of Georgia","city":"Buford","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Lenox Square","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Roosevelt Field","city":"Garden City","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Barton Creek Square","city":"Austin","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Castleton Square","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Haywood Mall","city":"Greenville","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Burlington Mall","city":"Burlington","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Northshore Mall","city":"Peabody","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"City Creek Center","city":"Salt Lake City","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Cherry Creek Shopping Center","city":"Denver","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Colorado Mills","city":"Lakewood","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Sawgrass Mills","city":"Sunrise","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Opry Mills","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Potomac Mills","city":"Woodbridge","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Gurnee Mills","city":"Gurnee","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Westfield Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Topanga","city":"Canoga Park","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Culver City","city":"Culver City","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Century City","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Montgomery","city":"Bethesda","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Old Orchard","city":"Skokie","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Natick Mall","city":"Natick","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Oakbrook Center","city":"Oak Brook","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"The Mall in Columbia","city":"Columbia","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Towson Town Center","city":"Towson","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Christiana Mall","city":"Newark","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Riverchase Galleria","city":"Hoover","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Park Meadows","city":"Lone Tree","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Mall of Louisiana","city":"Baton Rouge","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"The Maine Mall","city":"South Portland","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","address":"","contact":""},
  {"name":"American Dream","city":"East Rutherford","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","address":"","contact":""},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Pyramid Management","address":"","contact":""},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"CBL & Associates","address":"","contact":""},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Coddingtown Mall","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Eagle Rock Plaza","city":"Los Angeles","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Chelsea Market","city":"New York","state":"NY","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Reading Terminal Market","city":"Philadelphia","state":"PA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Pike Place Market","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Assembly Food Hall","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Ponce City Market","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Jamestown","address":"","contact":""},
  {"name":"Ferry Building Marketplace","city":"San Francisco","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Quincy Market","city":"Boston","state":"MA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"West Side Market","city":"Cleveland","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Findlay Market","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""}
];

const STATES = [...new Set(VENUES.map((v) => v.state))].sort();
const OWNERS = [...new Set(VENUES.map((v) => v.owner))].sort();
const TYPES = [...new Set(VENUES.map((v) => v.type))].sort();

export default function Opportunities() {
  const router = useRouter();
  const { session } = useAuth();
  const [stateFilter, setStateFilter] = useState('All');
  const [chairFilter, setChairFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
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
      if (ownerFilter !== 'All' && v.owner !== ownerFilter) return false;
      if (typeFilter !== 'All' && v.type !== typeFilter) return false;
      return true;
    });
  }, [stateFilter, chairFilter, ownerFilter, typeFilter]);

  return (
    <Layout active="risk" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Indoor Malls & Food Halls</h1>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Indoor shopping centers and food halls. Labeled by type and owner. Flagged if Smarte Carte has massage chairs. {VENUES.length} venues (expanding). Address and contact fields ready for later.
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
          Type
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Owner
          <select value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {OWNERS.map((o) => <option key={o}>{o}</option>)}
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
                key={v.name + v.state}
                type="button"
                className="btn btn-ghost"
                style={{
                  textAlign: 'left',
                  background: selected?.name === v.name && selected?.state === v.state ? 'var(--ember)' : 'transparent',
                  color: selected?.name === v.name && selected?.state === v.state ? '#fff' : 'var(--ink)',
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
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{v.owner}</div>
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
              <p style={{ margin: '0 0 8px' }}>Owner: {selected.owner}</p>
              <p style={{ margin: '0 0 16px' }}>
                Smarte Carte massage chairs: <strong style={{ color: selected.hasSmarteCarte ? 'var(--ember-muted)' : '#2e7d32' }}>
                  {selected.hasSmarteCarte ? 'Yes — skip' : 'No — potential'}
                </strong>
              </p>
              {selected.address && <p style={{ margin: '0 0 8px' }}>Address: {selected.address}</p>}
              {selected.contact && <p style={{ margin: '0 0 8px' }}>Contact: {selected.contact}</p>}
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
