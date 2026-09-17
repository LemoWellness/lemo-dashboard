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

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    function onDoc(e) {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

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
      <button type="button" className="notif-bell" aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        Notifications{unread > 0 ? <span className="notif-count">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="notif-markall" onClick={markAll}>Mark all as read</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="muted" style={{ padding: 12, margin: 0 }}>No notifications yet.</p>}
            {items.map((n) => (
              <button key={n.id} type="button" className={`notif-item ${n.read ? 'read' : 'unread'}`} onClick={() => openItem(n)}>
                <div className="notif-type">{typeLabel(n.type)}</div>
                <div>{n.taskName || n.title}</div>
                <div className="muted">{n.body}</div>
                <div className="muted">{n.dueDate ? `Due ${n.dueDate}` : ''}{n.dueDate ? ' \u00b7 ' : ''}{formatWhen(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .notif-wrap { position: relative; margin: 12px 0; }
        .notif-bell { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
        .notif-count {
          background: var(--ember); color: #fff; border-radius: 10px;
          font-size: 0.7rem; padding: 1px 6px; min-width: 18px; text-align: center;
        }
        .notif-panel {
          position: absolute; left: 0; right: 0; bottom: 100%;
          background: #fff; color: var(--obsidian); border: 1px solid var(--iron);
          border-radius: 4px; z-index: 80; max-height: 360px; overflow: auto;
          box-shadow: 0 8px 24px rgba(12,10,9,0.18); margin-bottom: 6px;
        }
        .notif-panel-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-bottom: 1px solid var(--iron); font-size: 0.8rem;
        }
        .notif-markall { background: none; border: none; color: var(--ember); cursor: pointer; font-size: 0.75rem; }
        .notif-item {
          display: block; width: 100%; text-align: left; background: #fff; border: none;
          border-bottom: 1px solid var(--iron); padding: 10px 12px; cursor: pointer; color: var(--obsidian);
        }
        .notif-item.unread { background: #f8f1ea; }
        .notif-type { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ash); margin-bottom: 2px; }
      `}</style>
    </div>
  );
}
