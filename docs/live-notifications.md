# Live notifications

The sidebar, training/district notification pages, and district dashboard share one subscription provider per signed-in dashboard. Notifications project existing Firestore `badgeRequests`, `issuedBadges`, and `rplApplications` documents. No workflow mutations or external integration changes are required.

Learners subscribe by Firebase UID; training centers by organization ID; districts by their assigned district, organization, or office identifiers already recognized by existing rules. Administrative roles have an empty feed rather than a broad collection listener or invented administrative events. RPL notifications cover learners and their assigned training center. Unassigned RPL applications are not broadcast.

The feed shows the latest state per source document, including existing records on first use. It is not an immutable event history: intermediate transitions while offline are not retained, and deleted source records disappear. Issuance keeps its original issue date. Request/RPL identity uses only the top-level workflow status, not generic updatedAt. Issuance identity uses the source document ID. Metadata-only edits never create a new unread key, though the displayed last-update time can change. A return to an already-read status stays read; this projection does not count repeated transitions or evidence edits that leave the main RPL status unchanged. Records without timestamps sort last. No arbitrary reminders, profile events, or announcements are generated.

All browser Firestore imports use the existing `firebase/firestore` alias. The wrapper filters demo records; projection also checks demo state. Existing workflow read rules remain authoritative. Queries use existing single-field participant/organization indexes; sorting occurs locally to support legacy timestamps and avoid a new composite-index requirement. This loads all records within those scopes; there is no misleading capped unread count.

Only read receipts are written, at `users/{uid}/notificationReads/{eventKey}`. Each encoded event key contains source, document ID and status (or issued). A different status has a distinct key; a concurrent mark-all operation cannot acknowledge that different status accidentally. Receipt payloads contain only `isDemo` and server `readAt`. Batched writes explicitly include demo state. Mark all operates on the currently loaded feed; partial batch failures are reported and may be retried. The receipt listener synchronizes read status across tabs/devices.

## First-use baseline

The first complete, committed server snapshots establish the current authorized records as read. Historical items remain visible without an unread flood. Setup writes ordinary per-user receipts in transactions of at most 400 items, then a versioned completion marker in the same collection. No workflow document is modified. The marker is scoped by role, organization/district/office and demo state; setup persists across reloads and devices. Each transaction reads the marker, so concurrent initialization cannot continue writing after another tab completes it. The initial event list is frozen; subsequent snapshots are not appended to that list. Partial failure shows an error and permits retry; unread counts remain hidden until setup finishes. Updates received before setup successfully completes may be included in the baseline on retry. Initial setup needs network access and costs one receipt write per historical state plus a marker. New scopes are baselined independently.

## Navigation

Notifications retain source, entity ID and current status and display the reference ID. Links use existing pages: learner wallet for issuance, learner RPL tracker, learner dashboard for approved requests; training requests/issued/RPL pages; district approval queue for pending requests and status page for issued badges. There is no existing learner pending/rejected request page or district closed-request page, so those notifications intentionally have no misleading link. Links open the workflow list, not a newly invented detail route, and do not silently mark notifications read.

## Manual review and rollout

Review and deploy the additive receipt rules before releasing the frontend. Without those rules the feed reports a read-status error and disables read actions. No rules deployment, data backfill, migration, or production writes are performed by this change. Existing demo rules use an email allowlist; this change preserves that policy and fails closed if frontend demo state differs.

Run `node --experimental-strip-types scripts/test-notifications.ts`. With a local Firestore emulator, set `FIRESTORE_EMULATOR_HOST` and run `node --experimental-strip-types scripts/test-notification-rules.ts`. Also run `npm run lint` and `npm run build`.

Before release, test two authenticated sessions with local/demo fixtures: create a scoped badge request, approve/reject it, issue a badge, and update RPL evidence/status. Check realtime delivery, newest-first order, per-user read persistence, mark-all during a new update, refresh, account switch, permission failure/retry, and demo/production separation. No backend event delivery infrastructure is added.


## Review validation (September 12, 2026)

- TypeScript checking, production build, notification unit tests and notification rules tests passed. Build reports the existing large-bundle warning.
- Rules tests actually ran against the local Firestore emulator v1.22.0 on Temurin Java 21.0.12.1. They cover owner/other/anonymous access, missing receipt reads, both demo crossing directions, extra payload fields, forged timestamps, forbidden deletes, and a malicious receipt-plus-workflow batch.
- Authenticated full-app smoke testing used local Firebase Auth/Firestore with Learner, TrainingCenter and DistrictOffice accounts. Historical records showed zero unread, metadata edits stayed read, new workflow updates arrived live, single/bulk reads worked, read state survived reload/navigation, and one user's reads did not affect another user's count. Learner RPL status delivery was exercised. A production-tagged record was excluded from the demo feed. Existing wallet/issued/status links opened successfully. No browser page errors were reported in these sessions.
- Not tested: production, real external integrations, browser sessions with non-demo accounts, high-volume baseline throughput, interrupted/multi-tab initialization races, or every destination link. Unit tests cover the route mapping and state identity; rules tests cover production/demo receipt boundaries.

### Reproduce the local smoke environment

Use Java 21 on PATH. Start `firebase emulators:start --only firestore,auth --project demo-notification-smoke --config notification-emulators.json`. Set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8187` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197`, then run `node --experimental-strip-types scripts/notification-smoke-fixtures.ts seed`. Start `npx vite --config scripts/notification-smoke.config.ts`. This test-only config replaces the Firebase bootstrap with local emulator endpoints and a demo project; production bootstrap and authentication code are unchanged.

Use the Prototype Testing Login with learner@demo.com, training@demo.com, or district@demo.com and fixture-only password LocalSmoke123!. Restrict the test browser to localhost/127.0.0.1. Fixture operations `metadata`, `status`, `status Rejected`, `new`, and `rpl` mutate only the local demo project and refuse to run without exact local emulator host variables. Never use production credentials in this environment.
