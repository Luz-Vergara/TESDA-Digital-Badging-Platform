import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch, type QuerySnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notificationQueries, projectNotification, sortNotifications, type LiveNotification, type NotificationScope } from '../lib/notification-model';

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
  const emit = () => {
    if (active) next({ items: sortNotifications([...streams.values()].flat()), readIds,
      loading: pending.size > 0, error: errors.size ? 'Unable to load all notifications or read status. Please retry.' : null });
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
        if (snapshot.metadata.hasPendingWrites) return;
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
    stops.push(onSnapshot(query(collection(db, 'users', scope.uid, 'notificationReads'), where('isDemo', '==', scope.isDemo)), (snapshot: QuerySnapshot) => {
      readIds = new Set(snapshot.docs.map(document => document.id));
      pending.delete(-1);
      emit();
    }, () => failed(-1)));
  } catch { failed(-1); }
  emit();
  return () => { active = false; stops.forEach(stop => stop()); };
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
