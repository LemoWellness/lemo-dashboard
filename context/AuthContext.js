import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, authedFetch } from '../lib/firebaseClient';

const AuthContext = createContext(null);

function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.navigator && window.navigator.standalone === true) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches;
  } catch (e) {
    return false;
  }
}

function standalonePlatform() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (!fbUser) {
        setSession(null);
        return;
      }
      try {
        const res = await authedFetch('/api/me');
        if (!res.ok) throw new Error((await res.json()).error);
        setSession(await res.json());
        if (isStandalone()) {
          authedFetch('/api/me', {
            method: 'POST',
            body: JSON.stringify({ standalone: true, platform: standalonePlatform() }),
          }).catch(() => {});
        }
      } catch (e) {
        setError(e.message);
        setSession(null);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
