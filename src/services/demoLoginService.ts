import { signInWithEmailAndPassword, signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { DemoAccount } from '../config/demoAccounts';

/**
 * Service to handle Demo Account Logins securely.
 */
export async function loginWithDemoAccount(
  account: DemoAccount,
  onPasswordRequired: (email: string) => Promise<string | null>,
  onStatusChange?: (status: 'signing_out' | 'authenticating' | 'success' | 'failed', message?: string) => void
): Promise<boolean> {
  try {
    // 1. Sign out current user first if any
    if (auth.currentUser) {
      onStatusChange?.('signing_out', 'Signing out current user...');
      localStorage.setItem('is_demo_user', 'false');
      await signOut(auth);
    }

    onStatusChange?.('authenticating', `Connecting as ${account.email}...`);

    // --- STRATEGY A: Google Cloud Function / Backend Custom Token (Preferred) ---
    // If the backend exists, we can invoke it. Here is the implementation pattern:
    /*
    try {
      const response = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoAccountId: account.id })
      });
      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('is_demo_user', 'true');
        await signInWithCustomToken(auth, token);
        onStatusChange?.('success');
        return true;
      }
    } catch (e) {
      console.warn("Backend login failed or unavailable, falling back to secure local sign-in:", e);
    }
    */

    // --- STRATEGY B: Secure Local Sign-in Fallback (Passwords are never hardcoded) ---
    // Check if we have the password in SessionStorage for this session
    let password = sessionStorage.getItem('demo_session_password');
    
    if (!password) {
      // Prompt user through callback
      password = await onPasswordRequired(account.email);
    }

    if (!password) {
      onStatusChange?.('failed', 'Sign in aborted: password is required.');
      return false;
    }

    // Set flag
    localStorage.setItem('is_demo_user', 'true');

    // Attempt firebase email/password login
    await signInWithEmailAndPassword(auth, account.email, password);
    
    // If login succeeds, cache the password in sessionStorage for seamless switching in this tab/session
    sessionStorage.setItem('demo_session_password', password);
    onStatusChange?.('success');
    return true;

  } catch (error: any) {
    console.error('Demo login service error:', error);
    localStorage.setItem('is_demo_user', 'false');
    onStatusChange?.('failed', error.message || 'Authentication failed.');
    throw error;
  }
}

/**
 * Backend code guideline for `createDemoSession` Node/Firebase Cloud Function.
 * Deliver this as an exported documentation string.
 */
export const backendCloudFunctionGuideline = `
/**
 * Firebase Cloud Function Secure Custom Token implementation guideline:
 * 
 * import * as functions from 'firebase-functions';
 * import * as admin from 'firebase-admin';
 * 
 * admin.initializeApp();
 * 
 * const DEMO_WHITELIST: Record<string, { uid: string, email: string, role: string }> = {
 *   "demo-qso-1": { uid: "demo-qso-uid", email: "qso@demo.com", role: "qso_admin" },
 *   "demo-training-1": { uid: "demo-tc1-uid", email: "training1@demo.com", role: "TrainingCenter" },
 *   "demo-training-2": { uid: "demo-tc2-uid", email: "training2@demo.com", role: "TrainingCenter" },
 *   "demo-district-1": { uid: "demo-do1-uid", email: "district@demo.com", role: "DistrictOffice" },
 *   "demo-learner-1": { uid: "demo-learner1-uid", email: "learner1@demo.com", role: "Learner" },
 *   "demo-learner-2": { uid: "demo-learner2-uid", email: "learner2@demo.com", role: "Learner" },
 * };
 * 
 * export const createDemoSession = functions.https.onRequest(async (req, res) => {
 *   // Enable CORS
 *   res.set('Access-Control-Allow-Origin', '*');
 *   if (req.method === 'OPTIONS') {
 *     res.set('Access-Control-Allow-Methods', 'POST');
 *     res.set('Access-Control-Allow-Headers', 'Content-Type');
 *     res.status(204).send('');
 *     return;
 *   }
 * 
 *   const { demoAccountId } = req.body;
 *   const isDemoModeEnabled = process.env.DEMO_LOGIN_ENABLED === 'true';
 * 
 *   if (!isDemoModeEnabled) {
 *     res.status(403).json({ error: "Demo mode is disabled." });
 *     return;
 *   }
 * 
 *   const demoUser = DEMO_WHITELIST[demoAccountId];
 *   if (!demoUser) {
 *     res.status(422).json({ error: "Invalid demo account request." });
 *     return;
 *   }
 * 
 *   try {
 *     // Create secure custom token with user claims
 *     const customToken = await admin.auth().createCustomToken(demoUser.uid, {
 *       isDemo: true,
 *       role: demoUser.role,
 *       email: demoUser.email
 *     });
 *     
 *     res.status(200).json({ token: customToken });
 *   } catch (error) {
 *     res.status(500).json({ error: "Failed to generate custom token." });
 *   }
 * });
 */
`;
