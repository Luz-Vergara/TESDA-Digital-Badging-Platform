import * as original from '@firebase/firestore';
import { getAuth } from 'firebase/auth';

export * from '@firebase/firestore';

function isDemoUserLoggedIn(): boolean {
  if (localStorage.getItem('is_demo_user') === 'true') {
    return true;
  }
  try {
    const auth = getAuth();
    if (auth?.currentUser?.email?.toLowerCase().includes('demo')) {
      return true;
    }
  } catch (e) {}
  return false;
}

class QuerySnapshotWrapper {
  private _original: any;
  public docs: any[];
  public size: number;
  public empty: boolean;
  public metadata: any;
  public query: any;

  constructor(originalSnapshot: any, isDemo: boolean) {
    this._original = originalSnapshot;
    this.metadata = originalSnapshot.metadata;
    this.query = originalSnapshot.query;

    this.docs = (originalSnapshot.docs || []).filter((doc: any) => {
      const data = doc.data();
      const isRecordDemo = data && data.isDemo === true;
      if (isDemo) {
        return isRecordDemo;
      } else {
        return !isRecordDemo;
      }
    });

    this.size = this.docs.length;
    this.empty = this.size === 0;
  }

  forEach(callback: any, thisArg?: any) {
    this.docs.forEach((doc) => callback.call(thisArg, doc), thisArg);
  }

  docChanges(options?: any) {
    const changes = this._original.docChanges(options) || [];
    return changes.filter((change: any) => {
      const data = change.doc.data();
      const isRecordDemo = data && data.isDemo === true;
      const isDemo = isDemoUserLoggedIn();
      if (isDemo) {
        return isRecordDemo;
      } else {
        return !isRecordDemo;
      }
    });
  }
}

class DocumentSnapshotWrapper {
  private _original: any;
  public id: string;
  public ref: any;
  public metadata: any;

  constructor(originalDoc: any, isDemo: boolean) {
    this._original = originalDoc;
    this.id = originalDoc.id;
    this.ref = originalDoc.ref;
    this.metadata = originalDoc.metadata;
  }

  exists() {
    if (!this._original.exists()) return false;
    const data = this._original.data();
    const isRecordDemo = data && data.isDemo === true;
    const isDemo = isDemoUserLoggedIn();
    if (isDemo) {
      return isRecordDemo;
    } else {
      return !isRecordDemo;
    }
  }

  data(options?: any) {
    if (!this.exists()) return undefined;
    return this._original.data(options);
  }

  get(fieldPath: any, options?: any) {
    if (!this.exists()) return undefined;
    return this._original.get(fieldPath, options);
  }
}

export const getDocs = async (queryRef: any) => {
  const snapshot = await original.getDocs(queryRef);
  return new QuerySnapshotWrapper(snapshot, isDemoUserLoggedIn());
};

export const getDoc = async (docRef: any) => {
  const snapshot = await original.getDoc(docRef);
  return new DocumentSnapshotWrapper(snapshot, isDemoUserLoggedIn());
};

export const getDocFromServer = async (docRef: any) => {
  const snapshot = await original.getDocFromServer(docRef);
  return new DocumentSnapshotWrapper(snapshot, isDemoUserLoggedIn());
};

export function onSnapshot(...args: any[]) {
  const queryRef = args[0];
  let options = undefined;
  let observer: any = undefined;
  let errorCallback = undefined;

  if (typeof args[1] === 'function') {
    observer = args[1];
    errorCallback = args[2];
  } else {
    options = args[1];
    observer = args[2];
    errorCallback = args[3];
  }

  const wrappedObserver = (snapshot: any) => {
    const isDemo = isDemoUserLoggedIn();
    if (snapshot.docs) {
      observer(new QuerySnapshotWrapper(snapshot, isDemo));
    } else {
      observer(new DocumentSnapshotWrapper(snapshot, isDemo));
    }
  };

  if (options !== undefined) {
    return original.onSnapshot(queryRef, options, wrappedObserver, errorCallback);
  } else {
    return original.onSnapshot(queryRef, wrappedObserver, errorCallback);
  }
}

export const addDoc = async (reference: any, data: any) => {
  if (isDemoUserLoggedIn()) {
    data = { ...data, isDemo: true };
  } else {
    data = { ...data, isDemo: false };
  }
  return await original.addDoc(reference, data);
};

export const setDoc = async (reference: any, data: any, options?: any) => {
  if (isDemoUserLoggedIn()) {
    data = { ...data, isDemo: true };
  } else {
    data = { ...data, isDemo: false };
  }
  if (options) {
    return await original.setDoc(reference, data, options);
  }
  return await original.setDoc(reference, data);
};

export const updateDoc = async (reference: any, data: any) => {
  // Normally updates preserve isDemo but let's make sure it is set if not already present
  if (isDemoUserLoggedIn()) {
    data = { ...data, isDemo: true };
  }
  return await original.updateDoc(reference, data);
};
