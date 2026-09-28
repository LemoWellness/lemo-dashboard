import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    setStatus('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    if (!current || !next) {
      setError('Enter your current password and a new password.');
      return;
    }
    if (next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
      setError('You need to log in first.');
      return;
    }
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, next);
      setStatus('Password updated.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      const code = err && err.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError('Current password is incorrect.');
      else if (code === 'auth/weak-password') setError('New password is too weak.');
      else setError('Could not update password. Try signing out and back in, then try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="signout" type="button" onClick={() => setOpen(true)}>Change password</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: 12 }} onClick={close}>
          <form className="card" style={{ width: 'min(420px, 100%)', margin: 0 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3 style={{ marginTop: 0 }}>Change password</h3>
            <label className="stack-field">Current password
              <input className="stack-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            </label>
            <label className="stack-field">New password
              <input className="stack-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="stack-field">Confirm new password
              <input className="stack-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            {error && <p className="form-error">{error}</p>}
            {status && <p className="muted">{status}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button>
              <button className="btn btn-ghost" type="button" onClick={close}>Close</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
