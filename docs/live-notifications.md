# Live notifications

The sidebar, training/district notification pages, and district dashboard share one subscription provider per signed-in dashboard. Notifications project existing Firestore `badgeRequests`, `issuedBadges`, and `rplApplications` documents. No workflow mutations or external integration changes are required.

Learners subscribe by Firebase UID; training centers by organization ID; districts by their assigned district, organization, or office identifiers already recognized by existing rules. Administrative roles have an empty feed rather than a broad collection listener or invented administrative events. RPL notifications cover learners and their assigned training center. Unassigned RPL applications are not broadcast.

The feed shows the latest state per source document, including existing records on first use. It is not an immutable event history: intermediate transitions while offline are not retained, and deleted source records disappear. Issuance keeps its original issue date. Request/RPL updates use the persisted update timestamp and status. Records without timestamps sort last. No arbitrary reminders, profile events, or announcements are generated.

All browser Firestore imports use the existing `firebase/firestore` alias. The wrapper filters demo records; projection also checks demo state. Existing workflow read rules remain authoritative. Queries use existing single-field participant/organization indexes; sorting occurs locally to support legacy timestamps and avoid a new composite-index requirement. This loads all records within those scopes; there is no misleading capped unread count.

Only read receipts are written, at `users/{uid}/notificationReads/{eventKey}`. Each encoded event key contains source, document ID, status and timestamp. A later update has a distinct key; a concurrent mark-all operation cannot acknowledge it accidentally. Receipt payloads contain only `isDemo` and server `readAt`. Batched writes explicitly include demo state. Mark all operates on the currently loaded feed; partial batch failures are reported and may be retried. The receipt listener synchronizes read status across tabs/devices.

## Manual review and rollout

Review and deploy the additive receipt rules before releasing the frontend. Without those rules the feed reports a read-status error and disables read actions. No rules deployment, data backfill, migration, or production writes are performed by this change. Existing demo rules use an email allowlist; this change preserves that policy and fails closed if frontend demo state differs.

Run `node --experimental-strip-types scripts/test-notifications.ts`. With a local Firestore emulator, set `FIRESTORE_EMULATOR_HOST` and run `node --experimental-strip-types scripts/test-notification-rules.ts`. Also run `npm run lint` and `npm run build`.

Before release, test two authenticated sessions with local/demo fixtures: create a scoped badge request, approve/reject it, issue a badge, and update RPL evidence/status. Check realtime delivery, newest-first order, per-user read persistence, mark-all during a new update, refresh, account switch, permission failure/retry, and demo/production separation. No backend event delivery infrastructure is added.
