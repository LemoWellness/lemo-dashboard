import { useEffect, useState } from 'react';
import {
  bannerDismissed,
  dismissBanner,
  getPushCapability,
  listRegisteredDevices,
  listenForegroundPush,
  registerPushDevice,
} from '../lib/pushClient';

export default function PushEnableBanner() {
  const [cap, setCap] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(null);
  const [hidden, setHidden] = useState(true);

  async function refresh() {
    const next = await getPushCapability();
    setCap(next);
    let devices = { count: 0, devices: [] };
    try {
      devices = await listRegisteredDevices();
    } catch (e) {
      devices = { count: 0, devices: [] };
    }
    if (devices.count > 0) {
      setRegistered(devices.devices[0]);
      listenForegroundPush();
    }
    const dismissed = bannerDismissed();
    const showHint = next.iosNeedsHomeScreen;
    const showEnable = next.canEnable && next.permission !== 'granted' && !dismissed;
    const showDenied = next.permission === 'denied' && !dismissed;
    const showMissingKey = !next.hasVapid && !dismissed;
    setHidden(!(showHint || showEnable || showDenied || showMissingKey || devices.count > 0));
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!cap || cap.permission !== 'granted' || !cap.canEnable) return;
    registerPushDevice()
      .then((r) => { setRegistered(r); setError(''); })
      .catch(() => {});
  }, [cap && cap.permission, cap && cap.canEnable]);

  async function onEnable() {
    setBusy(true);
    setError('');
    try {
      const result = await registerPushDevice();
      setRegistered(result);
    } catch (e) {
      setError(e.message || 'Could not enable device notifications.');
    }
    setBusy(false);
    refresh();
  }

  function onNotNow() {
    dismissBanner();
    setHidden(true);
  }

  if (hidden || !cap) return null;

  let body = 'Enable device notifications so this phone can receive task alerts when the dashboard is closed.';
  if (cap.iosNeedsHomeScreen) {
    body = 'On iPhone, add LEMO to your Home Screen (Share → Add to Home Screen), then open that icon and tap Enable.';
  } else if (!cap.hasVapid) {
    body = 'Device notifications are not configured yet. An administrator needs to add the VAPID key in Vercel.';
  } else if (cap.permission === 'denied') {
    body = 'Notification permission is blocked. Enable it in this phone’s Settings for LEMO, then reopen the app.';
  } else if (registered) {
    body = `This device is registered for notifications (${cap.platform}${registered.tokenTail ? `, token …${registered.tokenTail}` : ''}). The in-app inbox still works.`;
  }

  return (
    <div className="push-banner">
      <div>
        <strong>Device notifications</strong>
        <p className="muted" style={{ margin: '4px 0 0' }}>{body}</p>
        {error ? <p className="form-error" style={{ margin: '6px 0 0' }}>{error}</p> : null}
      </div>
      <div className="push-banner-actions">
        {cap.canEnable && cap.permission !== 'granted' && cap.hasVapid && (
          <button type="button" className="btn" disabled={busy} onClick={onEnable}>
            {busy ? 'Enabling…' : 'Enable device notifications'}
          </button>
        )}
        <button type="button" className="push-dismiss" onClick={onNotNow}>Not now</button>
      </div>
      <style jsx>{`
        .push-banner {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 12px; flex-wrap: wrap;
          background: #fff; border: 1px solid var(--iron); border-left: 3px solid var(--ember);
          border-radius: 3px; padding: 12px 14px; margin-bottom: 16px;
        }
        .push-banner-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .push-dismiss {
          background: none; border: none; color: var(--ash); cursor: pointer;
          font-size: 0.8rem; padding: 6px 0;
        }
      `}</style>
    </div>
  );
}
