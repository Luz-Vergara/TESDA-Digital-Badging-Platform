import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useFirebase } from '../../lib/FirebaseProvider';
import { type LiveNotification, type NotificationScope } from '../../lib/notification-model';
import { markNotificationsRead, subscribeNotifications, type NotificationState } from '../../services/notifications';

interface NotificationsContextValue extends NotificationState {
  unreadCount: number;
  saving: boolean;
  actionError: string | null;
  markRead: (items: LiveNotification[]) => Promise<void>;
  retry: () => void;
}
const Context = createContext<NotificationsContextValue | null>(null);
const initialState: NotificationState = { items: [], readIds: new Set(), loading: true, error: null };

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useFirebase();
  const scope: NotificationScope = { uid: user?.uid || '', role: userProfile?.role || '',
    organizationId: userProfile?.organizationId || '', assignedDistrictId: userProfile?.assignedDistrictId || '',
    office: userProfile?.office || '', isDemo: userProfile?.isDemo === true };
  // Remount immediately on any identity/scope change, including before effects run.
  return <ScopedNotifications key={JSON.stringify(scope)} scope={scope}>{children}</ScopedNotifications>;
}

function ScopedNotifications({ scope, children }: { key?: string; scope: NotificationScope; children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = useRef(false);
  const scopeKey = JSON.stringify(scope);
  useEffect(() => {
    setState(initialState);
    if (!scope.uid) return;
    return subscribeNotifications(JSON.parse(scopeKey) as NotificationScope, setState);
  }, [scopeKey, attempt]);
  const markRead = async (items: LiveNotification[]) => {
    if (busy.current || state.loading || state.error) return;
    busy.current = true;
    setSaving(true);
    setActionError(null);
    try { await markNotificationsRead(scope, items.filter(item => !state.readIds.has(item.id))); }
    catch { setActionError('Could not mark notifications as read. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Context.Provider value={{ ...state, saving, actionError, markRead,
    unreadCount: state.items.filter(item => !state.readIds.has(item.id)).length,
    retry: () => setAttempt(value => value + 1),
  }}>{children}</Context.Provider>;
}

export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('NotificationsProvider is required');
  return value;
}
