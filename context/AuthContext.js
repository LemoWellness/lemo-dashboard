import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, authedFetch } from '../lib/firebaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [session, setSession] = useState(null); // { role, tabs, name, email }
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
