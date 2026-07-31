import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function runCleanup() {
  const force = process.argv.includes('--force') || process.argv.includes('--confirm');
  console.log('=== Digital Badging Demo Cleanup Utility ===');
  if (!force) {
    console.log('NOTICE: Running in DRY-RUN mode. No actual deletions will be performed.');
    console.log('To perform actual deletions, run with: npm run cleanup-demo -- --force  OR  npm run cleanup-demo -- --confirm\n');
  } else {
    console.log('WARNING: Running in ACTIVE deletion mode! Real deletions will occur.\n');
  }

  // Load config
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: firebase-applet-config.json not found in root directory.');
    process.exit(1);
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Re-map keys if needed to match standard Client SDK requirements
  const firebaseConfig = {
    apiKey: rawConfig.apiKey,
    authDomain: rawConfig.authDomain,
    projectId: rawConfig.projectId,
    storageBucket: rawConfig.storageBucket,
    messagingSenderId: rawConfig.messagingSenderId,
    appId: rawConfig.appId,
    measurementId: rawConfig.measurementId
  };

  const app = initializeApp(firebaseConfig);
  // Specify custom Firestore database ID if provided in config
  const db = getFirestore(app, rawConfig.firestoreDatabaseId || '(default)');

  const targetCollections = [
    'users',
    'badgeTemplates',
    'issuedBadges',
    'organizations',
    'enrollments',
    'badgeRequests',
    'learners',
    'assessmentRecords',
    'rplApplications',
    'auditLogs',
    'deletedDemoItems'
  ];

  let totalScanned = 0;
  let totalDemoItems = 0;
  let totalDeleted = 0;

  for (const colName of targetCollections) {
    console.log(`Scanning collection: "${colName}"...`);
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      
      const demoDocs: string[] = [];
      snap.forEach((docSnap) => {
        totalScanned++;
        const data = docSnap.data();
        const id = docSnap.id;
        
        // Match condition: starts with "demo-", isDemo is true, or contains a demo email pattern
        const isDemoEmail = data.email && (
          data.email.toLowerCase().endsWith('@demo.com') || 
          data.email.toLowerCase().includes('demo')
        );
        
        if (id.startsWith('demo-') || data.isDemo === true || isDemoEmail) {
          demoDocs.push(id);
          totalDemoItems++;
        }
      });

      if (demoDocs.length === 0) {
        console.log(`  -> No demo records found.\n`);
        continue;
      }

      console.log(`  -> Found ${demoDocs.length} demo records: [${demoDocs.join(', ')}]`);
      
      if (force) {
        for (const id of demoDocs) {
          const docRef = doc(db, colName, id);
          await deleteDoc(docRef);
          totalDeleted++;
          console.log(`     [DELETED] ${colName}/${id}`);
        }
      } else {
        console.log(`     [DRY-RUN WILL DELETE] ${demoDocs.length} items from ${colName}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(`  -> Failed to scan/clean collection "${colName}":`, err.message || err);
      console.log('');
    }
  }

  console.log('=== Cleanup Summary ===');
  console.log(`Total Records Scanned:  ${totalScanned}`);
  console.log(`Total Demo Items Found: ${totalDemoItems}`);
  if (force) {
    console.log(`Total Demo Items Deleted: ${totalDeleted}`);
  } else {
    console.log('No items were deleted (dry-run mode).');
  }
}

runCleanup().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
