import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const LOCATIONS = [
  { name: "Almeda Mall", city: "Houston", state: "TX", lat: 29.62, lng: -95.22 },
  { name: "Arrowhead Towne Center", city: "Glendale", state: "AZ", lat: 33.64, lng: -112.23 },
  { name: "Arizona Mills", city: "Tempe", state: "AZ", lat: 33.38, lng: -111.97 },
  { name: "Arundel Mills", city: "Hanover", state: "MD", lat: 39.16, lng: -76.72 },
  { name: "Battlefield Mall", city: "Springfield", state: "MO", lat: 37.16, lng: -93.26 },
  { name: "Boulevard Mall", city: "Las Vegas", state: "NV", lat: 36.12, lng: -115.14 },
  { name: "Brea Mall", city: "Brea", state: "CA", lat: 33.92, lng: -117.89 },
  { name: "Briarwood Mall", city: "Ann Arbor", state: "MI", lat: 42.24, lng: -83.75 },
  { name: "Broadway Square Mall", city: "Tyler", state: "TX", lat: 32.30, lng: -95.30 },
  { name: "Broward Mall", city: "Plantation", state: "FL", lat: 26.12, lng: -80.25 },
  { name: "Chandler Fashion Center", city: "Chandler", state: "AZ", lat: 33.30, lng: -111.90 },
  { name: "Cielo Vista Mall", city: "El Paso", state: "TX", lat: 31.78, lng: -106.38 },
  { name: "Coddingtown Mall", city: "Santa Rosa", state: "CA", lat: 38.46, lng: -122.73 },
  { name: "College Mall", city: "Bloomington", state: "IN", lat: 39.16, lng: -86.50 },
  { name: "Crabtree Valley Mall", city: "Raleigh", state: "NC", lat: 35.84, lng: -78.68 },
  { name: "Culver City (aka Fox Hills)", city: "Culver City", state: "CA", lat: 33.99, lng: -118.39 },
  { name: "Danbury Fair Mall", city: "Danbury", state: "CT", lat: 41.38, lng: -73.45 },
  { name: "Deptford Mall", city: "Deptford", state: "NJ", lat: 39.83, lng: -75.10 },
  { name: "Desert Sky Mall", city: "Phoenix", state: "AZ", lat: 33.50, lng: -112.22 },
  { name: "Destiny USA", city: "Syracuse", state: "NY", lat: 43.07, lng: -76.17 },
  { name: "Eagle Rock Plaza", city: "Los Angeles", state: "CA", lat: 34.14, lng: -118.21 },
  { name: "Eastland Mall", city: "Evansville", state: "IN", lat: 37.99, lng: -87.52 },
  { name: "Empire Mall (The)", city: "Sioux Falls", state: "SD", lat: 43.53, lng: -96.77 },
  { name: "Freehold Raceway Mall", city: "Freehold", state: "NJ", lat: 40.26, lng: -74.29 },
  { name: "Galleria at Roseville", city: "Roseville", state: "CA", lat: 38.77, lng: -121.27 },
  { name: "Great Mall", city: "Milpitas", state: "CA", lat: 37.42, lng: -121.90 },
  { name: "Green Acres Mall", city: "Valley Stream", state: "NY", lat: 40.66, lng: -73.72 },
  { name: "Greenwood Park Mall", city: "Greenwood", state: "IN", lat: 39.63, lng: -86.11 },
  { name: "Houston Galleria", city: "Houston", state: "TX", lat: 29.74, lng: -95.46 },
  { name: "The Shops at Mission Viejo", city: "Mission Viejo", state: "CA", lat: 33.56, lng: -117.67 },
];

const STATES = [...new Set(LOCATIONS.map((l) => l.state))].sort();

export default function Opportunities() {
  const router = useRouter();
  const { session } = useAuth();
  const [stateFilter, setStateFilter] = useState('All');
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
    return LOCATIONS.filter((l) => stateFilter === 'All' || l.state === stateFilter);
  }, [stateFilter]);

  const mapUrl = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.15},${selected.lat - 0.1},${selected.lng + 0.15},${selected.lat + 0.1}&layer=mapnik&marker=${selected.lat},${selected.lng}`
    : null;

  return (
    <Layout active="risk" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Smarte Carte Opportunities</h1>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Confirmed malls and centers with massage chairs (from Smarte Carte refunds form). Read-only competitive map. {LOCATIONS.length} locations.
      </p>

      <div className="inline-form">
        <label>
          State
          <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <span className="muted" style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
          {filtered.length} shown
        </span>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>Venues</h3>
          {filtered.length === 0 && <p className="muted">None in this state.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((l) => (
              <button
                key={l.name}
                type="button"
                className="btn btn-ghost"
                style={{
                  textAlign: 'left',
                  background: selected?.name === l.name ? 'var(--ember)' : 'transparent',
                  color: selected?.name === l.name ? '#fff' : 'var(--ink)',
                  border: '1px solid var(--iron)',
                }}
                onClick={() => setSelected(l)}
              >
                <strong>{l.name}</strong>
                <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{l.city}, {l.state}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>Detail</h3>
          {!selected && <p className="muted">Select a venue to see details and map.</p>}
          {selected && (
            <>
              <p style={{ margin: '0 0 8px' }}><strong>{selected.name}</strong></p>
              <p className="muted" style={{ margin: '0 0 12px' }}>{selected.city}, {selected.state}</p>
              <p style={{ margin: '0 0 16px' }}>Massage chairs: <strong>Yes</strong></p>
              <div style={{ border: '1px solid var(--iron)', borderRadius: 4, overflow: 'hidden', height: 280 }}>
                <iframe
                  title="map"
                  width="100%"
                  height="280"
                  frameBorder="0"
                  src={mapUrl}
                  style={{ border: 0 }}
                />
              </div>
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
