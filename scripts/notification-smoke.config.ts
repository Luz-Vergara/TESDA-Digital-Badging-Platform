// Local-only full-app smoke server. Production config and FirebaseProvider are unchanged.
import { defineConfig, mergeConfig } from 'vite';
import applicationConfig from '../vite.config';

export default defineConfig(environment => mergeConfig(applicationConfig(environment), {
  server: { host: '127.0.0.1', port: 3197, strictPort: true },
  plugins: [{
    name: 'notification-smoke-emulators',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replaceAll('\\', '/').endsWith('/src/lib/firebase.ts')) return;
      const start = code.indexOf('// Initialize Firebase SDK');
      const end = code.indexOf('// Error Handling Types');
      if (start < 0 || end < start) throw new Error('Firebase bootstrap changed; review smoke config.');
      return code.slice(0, start)
        .replace("import { getAuth }", "import { getAuth, connectAuthEmulator }")
        .replace('getFirestore, doc', 'getFirestore, connectFirestoreEmulator, doc') + `
const app = initializeApp({ projectId: 'demo-notification-smoke', apiKey: 'local-emulator-only', authDomain: 'localhost' });
export const db = getFirestore(app);
export const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', 8187);
connectAuthEmulator(auth, 'http://127.0.0.1:9197');
` + code.slice(end);
    },
  }],
}));
