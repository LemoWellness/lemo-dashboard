import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { code: 'mo', label: 'Monthly Overview' },
  { code: 'loc', label: 'Installations' },
  { code: 'usage', label: 'Usage' },
  { code: 'daily', label: 'Daily' },
  { code: 'tasks', label: 'Tasks' },
];
const ADMIN_NAV = [{ code: 'admin-users', label: 'Manage Users' }, { code: 'admin-import', label: 'Import Data' }];

export default function Layout({ active, onNavigate, children }) {
  const { user, session } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/login');
  }, [user, router]);

  useEffect(() => { setMenuOpen(false); }, [active]);

  if (user === undefined || (user && !session)) {
    return <p style={{ padding: 32 }}>Loading…</p>;
  }
  if (!user) return null;

  const visibleNav = NAV.filter((n) => session.tabs === 'all' || session.tabs.includes(n.code));

  const isAdminOnlyPage = active === 'admin-users' || active === 'admin-import';
  const hasAccess = session.role === 'Admin' || (isAdminOnlyPage ? false : (session.tabs === 'all' || session.tabs.includes(active)));

  function handleNav(code) {
    setMenuOpen(false);
    onNavigate(code);
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">☰</button>
        <h2>LEMO</h2>
      </div>
      <div className={`sidebar-backdrop ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <h2>LEMO</h2>
        {visibleNav.map((n) => (
          <button key={n.code} className={active === n.code ? 'active' : ''} onClick={() => handleNav(n.code)}>
            {n.label}
          </button>
        ))}
        {session.role === 'Admin' && (
          <>
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
            {ADMIN_NAV.map((n) => (
              <button key={n.code} className={active === n.code ? 'active' : ''} onClick={() => handleNav(n.code)}>
                {n.label}
              </button>
            ))}
          </>
        )}
        <div className="who">
          {session.name}
          <br />
          {session.role}
        </div>
        <button className="signout" onClick={() => signOut(auth)}>Sign out</button>
      </nav>
      <main className="main">
        {hasAccess ? children : (
          <div className="card" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0 }}>You don't have access to this section</h2>
            <p className="muted">Contact your administrator if this seems wrong.</p>
            {visibleNav[0] && <button className="btn" onClick={() => handleNav(visibleNav[0].code)}>Go to {visibleNav[0].label}</button>}
          </div>
        )}
      </main>
    </div>
  );
}
