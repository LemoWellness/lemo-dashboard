import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { code: 'loc', label: 'Locations' },
  { code: 'tasks', label: 'Tasks' },
];
const ADMIN_NAV = [{ code: 'admin-users', label: 'Manage Users' }, { code: 'admin-import', label: 'Import Data' }];

export default function Layout({ active, onNavigate, children }) {
  const { user, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace('/login');
  }, [user, router]);

  if (user === undefined || (user && !session)) {
    return <p style={{ padding: 32 }}>Loading…</p>;
  }
  if (!user) return null;

  const visibleNav = NAV.filter((n) => session.tabs === 'all' || session.tabs.includes(n.code));

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <h2>LEMO</h2>
        {visibleNav.map((n) => (
          <button key={n.code} className={active === n.code ? 'active' : ''} onClick={() => onNavigate(n.code)}>
            {n.label}
          </button>
        ))}
        {session.role === 'Admin' && (
          <>
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
            {ADMIN_NAV.map((n) => (
              <button key={n.code} className={active === n.code ? 'active' : ''} onClick={() => onNavigate(n.code)}>
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
      <main className="main">{children}</main>
    </div>
  );
}
