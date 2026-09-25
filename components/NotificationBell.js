import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { authedFetch } from '../lib/firebaseClient';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function typeLabel(type) {
  if (type === 'assigned') return 'New Task Assigned';
  if (type === 'dueToday') return 'Task Due Today';
  if (type === 'dueSoon') return 'Task Due Soon';
  if (type === 'overdue') return 'Task Overdue';
  if (type === 'cancelRequested') return 'Cancel Request';
  if (type === 'cancelApproved') return 'Task Cancelled';
  if (type === 'cancelDenied') return 'Cancel Denied';
  return type || 'Notification';
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const box = useRef(null);

  async function load() {
    try {
      const res = await authedFetch('/api/notifications');
      if (!res.ok) return;
      const d = await res.json();
      setItems(d.notifications || []);
      setUnread(d.unreadCount || 0);
    } catch (e) {
      // Keep the dashboard usable if the inbox cannot load.
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    function onDoc(e) {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  function toggleOpen() {
    setOpen((v) => {
      if (!v) load();
      return !v;
    });
  }

  async function markRead(id) {
    await authedFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id }) });
    load();
  }
  async function markAll() {
    await authedFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) });
    load();
  }

  async function openItem(n) {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.taskId) router.push(`/tasks?task=${encodeURIComponent(n.taskId)}`);
    else router.push('/tasks');
  }

  return (
    <div className="notif-wrap" ref={box}>
      <button type="button" className="notif-bell" aria-label="Notifications" onClick={toggleOpen}>
        Notifications{unread > 0 ? <span className="notif-count">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            <div className="notif-panel-actions">
              {unread > 0 && <button type="button" className="notif-markall" onClick={markAll}>Mark all as read</button>}
              <button type="button" className="notif-close" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="muted" style={{ padding: 12, margin: 0 }}>No notifications yet.</p>}
            {items.map((n) => (
              <button key={n.id} type="button" className={`notif-item ${n.read ? 'read' : 'unread'}`} onClick={() => openItem(n)}>
                <div className="notif-type">{typeLabel(n.type)}</div>
                <div className="notif-name">{n.taskName || n.title}</div>
                <div className="muted notif-body">{n.body}</div>
                <div className="muted notif-meta">{n.dueDate ? `Due ${n.dueDate}` : ''}{n.dueDate ? ` ${String.fromCharCode(0x00b7)} ` : ''}{formatWhen(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .notif-wrap { position: relative; margin: 0; display: inline-block; }
        .notif-bell {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          width: auto; white-space: nowrap;
        }
        .notif-count {
          background: var(--ember); color: #fff; border-radius: 10px;
          font-size: 0.7rem; padding: 1px 6px; min-width: 18px; text-align: center;
        }
        .notif-panel {
          position: absolute; top: calc(100% + 6px); right: 0; left: auto;
          width: min(380px, calc(100vw - 24px));
          background: #fff; color: var(--obsidian); border: 1px solid var(--iron);
          border-radius: 4px; z-index: 80; overflow: hidden;
          box-shadow: 0 8px 24px rgba(12,10,9,0.18);
          display: flex; flex-direction: column;
          max-height: min(70vh, 480px);
        }
        .notif-panel-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-bottom: 1px solid var(--iron); font-size: 0.8rem;
          flex-shrink: 0; gap: 8px;
        }
        .notif-panel-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .notif-markall { background: none; border: none; color: var(--ember); cursor: pointer; font-size: 0.75rem; }
        .notif-close { display: inline-block; background: none; border: none; cursor: pointer; font-size: 0.75rem; color: var(--ash); }
        .notif-list { overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; min-height: 0; }
        .notif-item {
          display: block; width: 100%; text-align: left; background: #fff; border: none;
          border-bottom: 1px solid var(--iron); padding: 10px 12px; cursor: pointer; color: var(--obsidian);
          overflow-wrap: anywhere; word-break: break-word; white-space: normal; box-sizing: border-box;
        }
        .notif-item.unread { background: #f8f1ea; }
        .notif-type { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ash); margin-bottom: 2px; }
        .notif-name, .notif-body, .notif-meta { overflow-wrap: anywhere; word-break: break-word; }
        @media (max-width: 640px) {
          .notif-bell {
            color: var(--warm-white); background: transparent; border: none;
            font-size: 0.78rem; font-family: inherit; font-weight: 500; padding: 4px 6px;
          }
          .notif-panel {
            position: fixed;
            top: calc(56px + env(safe-area-inset-top, 0px));
            left: max(12px, env(safe-area-inset-left, 0px));
            right: max(12px, env(safe-area-inset-right, 0px));
            width: auto;
            max-width: none;
            max-height: calc(100dvh - 68px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
            z-index: 320;
          }
          .notif-panel-head { flex-wrap: wrap; }
          .notif-markall, .notif-close { min-height: 32px; padding: 6px 2px; }
        }
      `}</style>
    </div>
  );
}
