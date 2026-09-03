import * as original from '@firebase/firestore';
import { getAuth } from 'firebase/auth';

export * from '@firebase/firestore';

function isVerificationPage(): boolean {
  try {
    return window.location.hash.includes('/verify') || 
           window.location.pathname.includes('/verify');
  } catch (e) {
    return false;
  }
}

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

function wrapQuerySnapshot(snapshot: any, isDemo: boolean): any {
  const filteredDocs = (snapshot.docs || []).filter((doc: any) => {
    if (isVerificationPage()) return true;
    const data = doc.data();
    const isRecordDemo = data && data.isDemo === true;
    return isDemo ? isRecordDemo : !isRecordDemo;
  });

  return new Proxy(snapshot, {
    get(target, prop, receiver) {
      if (prop === 'docs') {
        return filteredDocs;
      }
      if (prop === 'size') {
        return filteredDocs.length;
      }
      if (prop === 'empty') {
        return filteredDocs.length === 0;
      }
      if (prop === 'forEach') {
        return (callback: any, thisArg?: any) => {
          filteredDocs.forEach((doc) => callback.call(thisArg, doc), thisArg);
        };
      }
      if (prop === 'docChanges') {
        return (options?: any) => {
          const changes = target.docChanges(options) || [];
          return changes.filter((change: any) => {
            if (isVerificationPage()) return true;
            const data = change.doc.data();
            const isRecordDemo = data && data.isDemo === true;
            return isDemo ? isRecordDemo : !isRecordDemo;
          });
        };
      }
      
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });
}

function isCanonicalIntegrationDocument(snapshot: any): boolean {
  const collectionId = snapshot?.ref?.parent?.id;
  return (
    collectionId === 'integrationLearnerLinks' ||
    collectionId === 'integrationTrainingCenterLinks'
  );
}

function wrapDocumentSnapshot(snapshot: any, isDemo: boolean): any {
  const exists = () => {
    if (!snapshot.exists()) return false;
    if (isVerificationPage()) return true;
    if (isCanonicalIntegrationDocument(snapshot)) return true;
    const data = snapshot.data();
    const isRecordDemo = data && data.isDemo === true;
    return isDemo ? isRecordDemo : !isRecordDemo;
  };

  return new Proxy(snapshot, {
    get(target, prop, receiver) {
      if (prop === 'exists') {
        return exists;
      }
      if (prop === 'data') {
        return (options?: any) => {
          if (!exists()) return undefined;
          return target.data(options);
        };
      }
      if (prop === 'get') {
        return (fieldPath: any, options?: any) => {
          if (!exists()) return undefined;
          return target.get(fieldPath, options);
        };
      }
      
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });
}

export const getDocs = async (queryRef: any) => {
  const snapshot = await original.getDocs(queryRef);
  return wrapQuerySnapshot(snapshot, isDemoUserLoggedIn());
};

export const getDoc = async (docRef: any) => {
  const snapshot = await original.getDoc(docRef);
  return wrapDocumentSnapshot(snapshot, isDemoUserLoggedIn());
};

export const getDocFromServer = async (docRef: any) => {
  const snapshot = await original.getDocFromServer(docRef);
  return wrapDocumentSnapshot(snapshot, isDemoUserLoggedIn());
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
      observer(wrapQuerySnapshot(snapshot, isDemo));
    } else {
      observer(wrapDocumentSnapshot(snapshot, isDemo));
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
  if (isDemoUserLoggedIn()) {
    data = { ...data, isDemo: true };
  }
  return await original.updateDoc(reference, data);
};
