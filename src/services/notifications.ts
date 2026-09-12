import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where, writeBatch, type QuerySnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notificationBaselineId, notificationQueries, projectNotification, sortNotifications, type LiveNotification, type NotificationScope } from '../lib/notification-model';

export interface NotificationState {
  items: LiveNotification[];
  readIds: Set<string>;
  loading: boolean;
  error: string | null;
}

export function subscribeNotifications(scope: NotificationScope, next: (state: NotificationState) => void) {
  const specs = notificationQueries(scope);
  const streams = new Map<number, LiveNotification[]>();
  const pending = new Set([...specs.map((_, index) => index), -1]);
  const errors = new Set<number>();
  let readIds = new Set<string>();
  let active = true;
  let initializing = false;
  const baselineId = notificationBaselineId(scope);
  const emit = () => {
    if (active && !initializing && pending.size === 0 && errors.size === 0 && !readIds.has(baselineId)) {
      initializing = true;
      // Freeze the initial server-backed states. Later snapshots are not added
      // to this baseline while its receipts are being committed.
      void initializeNotificationBaseline(scope, sortNotifications([...streams.values()].flat()), () => active)
        .catch(() => { errors.add(-2); })
        .finally(() => { emit(); });
    }
    if (active) next({ items: sortNotifications([...streams.values()].flat()), readIds,
      loading: errors.size === 0 && (pending.size > 0 || !readIds.has(baselineId)),
      error: errors.size ? 'Unable to load all notifications or initialize read status. Please retry.' : null });
  };
  const failed = (index: number) => {
    pending.delete(index);
    errors.add(index);
    streams.delete(index);
    if (index === -1) readIds = new Set();
    emit();
  };
  const stops: (() => void)[] = [];
  specs.forEach((spec, index) => {
    try {
      stops.push(onSnapshot(query(collection(db, spec.source), where(spec.field, spec.operator, spec.value)), { includeMetadataChanges: true }, (snapshot: QuerySnapshot) => {
        // Do not notify for uncommitted local workflow writes.
        if (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
        streams.set(index, snapshot.docs.flatMap(document => {
          const item = projectNotification(spec.source, document.id, document.data(), scope.isDemo);
          return item ? [item] : [];
        }));
        pending.delete(index);
        emit();
      }, () => failed(index)));
    } catch { failed(index); }
  });
  try {
    stops.push(onSnapshot(query(collection(db, 'users', scope.uid, 'notificationReads'), where('isDemo', '==', scope.isDemo)), { includeMetadataChanges: true }, (snapshot: QuerySnapshot) => {
      if (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
      readIds = new Set(snapshot.docs.map(document => document.id));
      pending.delete(-1);
      emit();
    }, () => failed(-1)));
  } catch { failed(-1); }
  emit();
  return () => { active = false; stops.forEach(stop => stop()); };
}

export async function initializeNotificationBaseline(scope: NotificationScope, items: LiveNotification[], active = () => true) {
  const marker = doc(db, 'users', scope.uid, 'notificationReads', notificationBaselineId(scope));
  // Every transaction checks the marker, so another tab that completes setup
  // prevents late initialization writes. A failed partial setup is retryable.
  for (let offset = 0; offset < items.length; offset += 400) {
    if (!active()) return;
    const alreadyInitialized = await runTransaction(db, async transaction => {
      if ((await transaction.get(marker)).exists()) return true;
      for (const item of items.slice(offset, offset + 400)) {
        transaction.set(doc(db, 'users', scope.uid, 'notificationReads', item.id), {
          isDemo: scope.isDemo, readAt: serverTimestamp(),
        });
      }
      return false;
    });
    if (alreadyInitialized) return;
  }
  if (!active()) return;
  await runTransaction(db, async transaction => {
    if (!(await transaction.get(marker)).exists()) transaction.set(marker, {
      isDemo: scope.isDemo, readAt: serverTimestamp(),
    });
  });
}

export async function markNotificationsRead(scope: NotificationScope, items: LiveNotification[]) {
  // Batches are explicitly tagged because the wrapper exports the SDK batch API.
  // Each immutable event key prevents a late write from marking a newer update read.
  for (let offset = 0; offset < items.length; offset += 400) {
    const batch = writeBatch(db);
    for (const item of items.slice(offset, offset + 400)) {
      batch.set(doc(db, 'users', scope.uid, 'notificationReads', item.id), {
        isDemo: scope.isDemo, readAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
