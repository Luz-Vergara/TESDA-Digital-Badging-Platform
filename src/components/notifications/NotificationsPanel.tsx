import React from 'react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../../lib/FirebaseProvider';
import { notificationDestination } from '../../lib/notification-model';
import { useNotifications } from './NotificationsProvider';

export default function NotificationsPanel() {
  const { items, readIds, unreadCount, loading, error, actionError, saving, markRead, retry } = useNotifications();
  const { userProfile } = useFirebase();
  return <section aria-label="Notifications" className="bg-white rounded-lg">
    <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
      <h2 className="font-semibold">Notifications { !loading && !error && <span aria-live="polite">({unreadCount} unread)</span> }</h2>
      <button type="button" className="text-xs text-blue-700 disabled:opacity-50" disabled={loading || Boolean(error) || saving || !unreadCount}
        onClick={() => void markRead(items)}>Mark all as read</button>
    </div>
    {loading && <p role="status" className="p-4 text-sm text-slate-500">Loading notifications…</p>}
    {error && <div role="alert" className="p-4 text-sm text-red-700">{error} <button type="button" className="underline" onClick={retry}>Retry</button></div>}
    {actionError && <p role="alert" className="p-4 text-sm text-red-700">{actionError}</p>}
    {!loading && !error && items.length === 0 && <p className="p-4 text-sm text-slate-500">No notifications yet. Relevant badge and RPL updates will appear here.</p>}
    <ul className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
      {!loading && !error && items.map(item => <li key={item.id} className={`p-4 ${readIds.has(item.id) ? '' : 'bg-blue-50'}`}>
        <p className="text-sm font-semibold">{item.title}{!readIds.has(item.id) && <span className="ml-2 text-xs text-blue-700">Unread</span>}</p>
        <p className="text-sm text-slate-600 break-words">{item.message}</p>
        <p className="text-xs text-slate-500 break-all">Reference: {item.entityId}</p>
        {notificationDestination(item, userProfile?.role) && <Link className="block mt-2 text-sm text-blue-700 underline"
          to={notificationDestination(item, userProfile?.role)!}>Open workflow</Link>}
        <p className="text-xs text-slate-500 mt-1">{item.time ? new Date(item.time).toLocaleString() : 'Date unavailable'}</p>
        {!readIds.has(item.id) && <button type="button" className="mt-2 text-xs text-blue-700 disabled:opacity-50"
          disabled={saving || loading || Boolean(error)} onClick={() => void markRead([item])}>Mark as read</button>}
      </li>)}
    </ul>
  </section>;
}
