import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VENUES = [
  {"name":"Riverchase Galleria","city":"Hoover","state":"AL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Shoppes at Bel Air","city":"Mobile","state":"AL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Auburn Mall","city":"Auburn","state":"AL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Eastdale Mall","city":"Montgomery","state":"AL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Parkway Place","city":"Huntsville","state":"AL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Anchorage 5th Avenue Mall","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Dimond Center","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Bentley Mall","city":"Fairbanks","state":"AK","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Tucson Mall","city":"Tucson","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Northwest Arkansas Mall","city":"Fayetteville","state":"AR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Central Mall","city":"Fort Smith","state":"AR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"McCain Mall","city":"North Little Rock","state":"AR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Park Plaza Mall","city":"Little Rock","state":"AR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Beverly Center","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food court"},
  {"name":"Park Meadows","city":"Lone Tree","state":"CO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Cherry Creek Shopping Center","city":"Denver","state":"CO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"FlatIron Crossing","city":"Broomfield","state":"CO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Colorado Mills","city":"Lakewood","state":"CO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Connecticut Post Mall","city":"Milford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Westfarms","city":"West Hartford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Brass Mill Center","city":"Waterbury","state":"CT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Christiana Mall","city":"Newark","state":"DE","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Concord Mall","city":"Wilmington","state":"DE","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Dover Mall","city":"Dover","state":"DE","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Mall at Millenia","city":"Orlando","state":"FL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"International Plaza","city":"Tampa","state":"FL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Sawgrass Mills","city":"Sunrise","state":"FL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mall of Georgia","city":"Buford","state":"GA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Lenox Square","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Perimeter Mall","city":"Dunwoody","state":"GA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"North Point Mall","city":"Alpharetta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Pearlridge Center","city":"Aiea","state":"HI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Kahala Mall","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Boise Towne Square","city":"Boise","state":"ID","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Grand Teton Mall","city":"Idaho Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Magic Valley Mall","city":"Twin Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Oakbrook Center","city":"Oak Brook","state":"IL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Water Tower Place","city":"Chicago","state":"IL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Gurnee Mills","city":"Gurnee","state":"IL","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Castleton Square","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Fashion Mall at Keystone","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Jordan Creek Town Center","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Valley West Mall","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Coral Ridge Mall","city":"Coralville","state":"IA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Oak Park Mall","city":"Overland Park","state":"KS","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Town Center Plaza","city":"Leawood","state":"KS","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"West Ridge Mall","city":"Topeka","state":"KS","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Fayette Mall","city":"Lexington","state":"KY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Oxmoor Center","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mall St. Matthews","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mall of Louisiana","city":"Baton Rouge","state":"LA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Lakeside Shopping Center","city":"Metairie","state":"LA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Esplanade","city":"Kenner","state":"LA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Maine Mall","city":"South Portland","state":"ME","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Bangor Mall","city":"Bangor","state":"ME","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"The Mall in Columbia","city":"Columbia","state":"MD","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Westfield Montgomery","city":"Bethesda","state":"MD","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Towson Town Center","city":"Towson","state":"MD","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Natick Mall","city":"Natick","state":"MA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"South Shore Plaza","city":"Braintree","state":"MA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Burlington Mall","city":"Burlington","state":"MA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"CambridgeSide","city":"Cambridge","state":"MA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Somerset Collection","city":"Troy","state":"MI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Twelve Oaks Mall","city":"Novi","state":"MI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Great Lakes Crossing","city":"Auburn Hills","state":"MI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Southdale Center","city":"Edina","state":"MN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Rosedale Center","city":"Roseville","state":"MN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Ridgedale Center","city":"Minnetonka","state":"MN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Northpark Mall","city":"Ridgeland","state":"MS","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Edgewater Mall","city":"Biloxi","state":"MS","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mall at Barnes Crossing","city":"Tupelo","state":"MS","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Saint Louis Galleria","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Independence Center","city":"Independence","state":"MO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"West County Center","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Rimrock Mall","city":"Billings","state":"MT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Southgate Mall","city":"Missoula","state":"MT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Holiday Village Mall","city":"Great Falls","state":"MT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Westroads Mall","city":"Omaha","state":"NE","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Gateway Mall","city":"Lincoln","state":"NE","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Fashion Show","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Meadows Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Galleria at Sunset","city":"Henderson","state":"NV","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Mall at Rockingham Park","city":"Salem","state":"NH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Mall of New Hampshire","city":"Manchester","state":"NH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Pheasant Lane Mall","city":"Nashua","state":"NH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"American Dream","city":"East Rutherford","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Cherry Hill Mall","city":"Cherry Hill","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Coronado Center","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Cottonwood Mall","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"ABQ Uptown","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Queens Center","city":"Elmhurst","state":"NY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Crossgates Mall","city":"Albany","state":"NY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Roosevelt Field","city":"Garden City","state":"NY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"SouthPark","city":"Charlotte","state":"NC","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Hanes Mall","city":"Winston-Salem","state":"NC","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Streets at Southpoint","city":"Durham","state":"NC","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"West Acres Shopping Center","city":"Fargo","state":"ND","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Kirkwood Mall","city":"Bismarck","state":"ND","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Eastgate Mall","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Kenwood Towne Centre","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Easton Town Center","city":"Columbus","state":"OH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"SouthPark Mall","city":"Strongsville","state":"OH","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Penn Square Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Woodland Hills Mall","city":"Tulsa","state":"OK","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Quail Springs Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Washington Square","city":"Tigard","state":"OR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Clackamas Town Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Lloyd Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Mall at Robinson","city":"Robinson Township","state":"PA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Ross Park Mall","city":"Pittsburgh","state":"PA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Willow Grove Park","city":"Willow Grove","state":"PA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Providence Place","city":"Providence","state":"RI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Warwick Mall","city":"Warwick","state":"RI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Haywood Mall","city":"Greenville","state":"SC","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Columbiana Centre","city":"Columbia","state":"SC","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Coastal Grand Mall","city":"Myrtle Beach","state":"SC","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Rushmore Mall","city":"Rapid City","state":"SD","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Opry Mills","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"West Town Mall","city":"Knoxville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Wolfchase Galleria","city":"Memphis","state":"TN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"CoolSprings Galleria","city":"Franklin","state":"TN","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"NorthPark Center","city":"Dallas","state":"TX","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"The Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall"},
  {"name":"Barton Creek Square","city":"Austin","state":"TX","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"North Star Mall","city":"San Antonio","state":"TX","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"City Creek Center","city":"Salt Lake City","state":"UT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Fashion Place","city":"Murray","state":"UT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"University Place","city":"Orem","state":"UT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"University Mall","city":"South Burlington","state":"VT","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Potomac Mills","city":"Woodbridge","state":"VA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"MacArthur Center","city":"Norfolk","state":"VA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Short Pump Town Center","city":"Richmond","state":"VA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Alderwood","city":"Lynnwood","state":"WA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Bellevue Square","city":"Bellevue","state":"WA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Northgate","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Huntington Mall","city":"Barboursville","state":"WV","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Charleston Town Center","city":"Charleston","state":"WV","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Mayfair Mall","city":"Wauwatosa","state":"WI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"East Towne Mall","city":"Madison","state":"WI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Bayshore","city":"Glendale","state":"WI","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Eastridge Mall","city":"Casper","state":"WY","hasSmarteCarte":false,"type":"enclosed mall"},
  {"name":"Frontier Mall","city":"Cheyenne","state":"WY","hasSmarteCarte":false,"type":"enclosed mall"}
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
        All 50 states. Flagged if Smarte Carte already has massage chairs (skip those). {VENUES.length} venues.
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
