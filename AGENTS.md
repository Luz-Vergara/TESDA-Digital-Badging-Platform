# TESDA Digital Badging Platform — Agent Instructions

## Project Architecture

This repository uses:

* React 19
* TypeScript
* Vite
* Firebase Authentication
* Cloud Firestore
* Firestore Security Rules
* Supabase Edge Functions for external integrations

Firebase/Firestore is the primary backend and canonical datastore for Digital Badging workflows.

Supabase is currently an external integration/mock data layer.

Do not move core application workflows to Supabase unless there is a clear architectural reason and the change is explicitly approved.

---

## General Agent Behavior

Before changing code:

1. Inspect the relevant existing implementation.
2. Understand the current architecture and data flow.
3. Find the root cause before fixing bugs.
4. Reuse existing components, hooks, services, types, and utilities where practical.
5. Keep changes focused on the requested task.
6. Do not perform unrelated refactors or cleanup.
7. Inspect both frontend and backend behavior when a feature crosses both layers.
8. Do not claim something was tested, deployed, migrated, or verified unless it actually was.

Do not blindly agree with or implement a proposed technical approach.

If the requested approach appears:

* unnecessarily complex
* insecure
* inconsistent with the existing architecture
* likely to create technical debt
* destructive
* less maintainable than a clear alternative

explain the concern and recommend the better approach before implementing it.

Follow explicit user requirements, but raise important architectural or security concerns instead of silently implementing a poor design.

---

## Frontend Structure

Application code primarily lives under:

* `src/pages/`
* `src/components/`
* `src/services/`
* `src/lib/`
* `src/types/`

Shared UI components may also exist under:

* `components/`

Both `components/` and `src/components/` are intentional.

Do not merge, move, or reorganize them unless explicitly requested and justified.

---

## Import Alias

The `@` alias points to the repository root, not directly to `src`.

Imports such as:

`@/src/...`

and:

`@/components/...`

are intentional.

Do not change the alias unless there is a clear reason and the impact has been reviewed.

---

## Firebase Architecture

Firebase Authentication is the primary identity system.

Cloud Firestore is the canonical datastore for primary Digital Badging workflows.

This includes areas such as:

* users
* organizations
* badge requests
* badge templates
* issued badges
* learners
* assessments
* training workflows
* workflow records

Do not migrate primary workflow data to Supabase merely because Supabase is available.

---

## Firestore Wrapper — Critical

The repository aliases:

`firebase/firestore`

to:

`src/lib/firestore-wrapper.ts`

Do not:

* bypass this wrapper
* replace it with direct internal Firebase imports
* remove the alias
* create another Firestore client that bypasses it

The wrapper participates in demo/non-demo data isolation.

Treat changes to this file as security-sensitive.

Inspect its behavior before modifying it.

---

## Demo and Production Isolation

Preserve the existing `isDemo` behavior.

Never intentionally allow:

* demo users to modify production records
* production users to accidentally modify demo-only records
* new queries to bypass demo filtering
* writes to omit required demo-state behavior

Do not weaken Firestore Security Rules simply to make a feature work.

If an operation is blocked, determine the correct authorization behavior first.

---

## Authentication and Roles

Existing roles include:

* Learner
* Admin
* TrainingCenter
* AssessmentCenter
* DistrictOffice
* Employer
* qso_admin
* co_admin
* icto_admin

Some roles exist in the authentication/data model but are not yet fully wired into the application.

Do not assume that every defined role already has a complete portal or route structure.

Frontend role checks are for user experience.

Firestore Security Rules and trusted backend code must enforce authorization.

Never rely only on:

* hidden buttons
* client-side route guards
* client-side role checks

for security.

---

## FirebaseProvider

Treat:

`src/lib/FirebaseProvider.tsx`

as security-sensitive.

Before modifying it:

* inspect the current authentication flow
* preserve existing role behavior unless intentionally changing it
* preserve demo account behavior
* avoid privilege escalation
* do not assign privileged roles based only on client-controlled data

Do not perform broad authentication refactors as part of unrelated work.

---

## Firestore Security Rules

Treat:

`firestore.rules`

as security-sensitive.

When adding or modifying Firestore operations, verify:

* who can read
* who can create
* who can update
* who can delete
* role boundaries
* organization boundaries
* demo/non-demo isolation
* which fields may be modified

Never introduce broad authenticated access simply to make development easier.

Do not deploy Firestore rules automatically.

Production rule changes require human review.

---

## Supabase Architecture

Important areas include:

* `supabase/functions/`
* `supabase/migrations/`

Preserve the current integration boundary:

Frontend
→ Firebase-authenticated request
→ Edge Function / integration API
→ adapter/integration layer
→ Supabase external data

Do not expose private Supabase tables directly to the browser.

Do not use Supabase as a replacement for Firestore workflows without an explicit architectural decision.

---

## Database Migrations

Treat database migrations as potentially destructive.

Do not automatically:

* apply production migrations
* drop tables
* delete columns
* truncate data
* reset databases
* destructively modify production records

Prefer additive and backward-compatible changes.

Production migration execution requires explicit approval.

---

## Secrets and Environment Variables

Never expose private credentials in frontend code.

Do not place secrets in `VITE_` variables.

Never expose:

* Firebase Admin credentials
* Supabase service-role keys
* OpenAI API keys
* Gemini API keys
* private API credentials
* signing secrets

Public Firebase client configuration and explicitly public/publishable keys may remain client-side where appropriate.

Secret API calls must run through trusted server-side code or an Edge Function.

Do not inject secret API keys into the Vite frontend bundle.

---

## React / Frontend Rules

* Prefer TypeScript.
* Avoid introducing new `any` types.
* Reuse existing UI components.
* Keep components focused.
* Prefer services or hooks for reusable business/data logic.
* Avoid large amounts of Firestore logic directly inside presentation components.
* Provide loading states.
* Provide meaningful empty states.
* Handle errors clearly.
* Clean up realtime listeners when components unmount.
* Avoid unnecessary duplicate subscriptions.
* Preserve existing routing and role behavior unless intentionally changing them.

Do not perform a repository-wide strict TypeScript migration as unrelated cleanup.

---

## Realtime Features

The project already uses Firestore realtime functionality through:

`onSnapshot()`

Prefer Firestore realtime subscriptions when live Firestore data is required.

Do not introduce a separate WebSocket system merely to duplicate Firestore realtime behavior.

Use appropriately scoped queries based on:

* user
* organization
* role
* entity
* workflow

Avoid unnecessarily broad collection subscriptions.

---

## Debugging Workflow

When investigating a bug:

1. inspect or reproduce the reported behavior
2. trace the relevant flow
3. identify the root cause
4. identify affected files
5. determine whether the problem is frontend, backend, data, security, or integration-related
6. recommend the smallest safe fix
7. make changes only when requested

For cross-layer issues, trace:

UI
→ React component/state
→ hook/service
→ Firebase/Firestore/API
→ Security Rules/backend
→ response
→ UI

Do not make broad speculative code changes before understanding the problem.

---

## Existing Patterns First

Before creating a new:

* service
* hook
* provider
* collection
* component
* utility
* abstraction
* API layer

search for an existing equivalent pattern.

Reuse the existing architecture when practical.

Avoid duplicate systems for the same responsibility.

---

## Architecture Decisions

Prefer the simplest solution that fits the current architecture.

Do not introduce:

* unnecessary microservices
* duplicate databases
* unnecessary backend layers
* custom realtime infrastructure when Firestore already provides it
* new state-management libraries without a clear need
* major framework changes for small features

If a proposed solution is significantly more complex than necessary, recommend a simpler alternative.

Prioritize:

1. security
2. correctness
3. maintainability
4. consistency with the existing architecture
5. simplicity
6. performance where it materially matters

---

## Validation

For normal frontend changes, run:

`npm run lint`

`npm run build`

Important:

`npm run lint`

currently performs TypeScript checking with:

`tsc --noEmit`

It is not an ESLint run.

For integration API changes, also run:

`npm run check:integration-api`

Run relevant targeted tests where available.

If a check cannot be executed, report that clearly.

Never claim a check passed unless it was actually run successfully.

---

## CI

Do not assume GitHub Actions or CI validated a change.

If no workflow ran successfully, say so.

Creating a branch or pull request does not mean the code has been validated.

---

## Package Management

The repository currently contains:

* `package-lock.json`
* `bun.lock`

Use npm by default unless explicitly instructed otherwise.

Do not switch package managers or remove/regenerate another lockfile as unrelated cleanup.

---

## Git Workflow

For significant changes:

1. inspect the repository
2. understand the task
3. create a focused feature branch
4. implement the change
5. run relevant checks
6. review the diff
7. create a pull request
8. allow human review before merge

Use focused branch names such as:

`agent/live-notifications`

`agent/fix-auth-flow`

`agent/training-center-dashboard`

`agent/fix-badge-request`

Do not merge your own pull request unless explicitly instructed.

---

## Production Safety

Never automatically:

* deploy to production
* modify production environment variables
* expose secrets
* delete production records
* reset Firebase
* reset Supabase
* apply destructive migrations
* weaken authentication
* weaken authorization
* weaken Firestore Security Rules
* disable security checks
* merge into production

These actions require explicit approval.

---

## Security-Sensitive Files

Use extra caution when modifying:

* `firestore.rules`
* `src/lib/FirebaseProvider.tsx`
* `src/lib/firestore-wrapper.ts`
* `vite.config.ts`
* `supabase/migrations/`
* `supabase/functions/`
* authentication logic
* authorization logic
* environment configuration

Keep security-related changes small, focused, and easy to review.

---

## Scope Discipline

Do not combine unrelated refactors with feature work.

For example, when fixing one feature, do not also:

* replace the routing system
* switch databases
* replace Firebase Authentication
* enable TypeScript strict mode globally
* reorganize the entire repository
* remove unrelated dependencies
* migrate unrelated data

Recommend unrelated improvements separately.

---

## Current Repository Constraints

Be aware that:

* `AssessmentCenter` and `co_admin` exist in the role model but are not fully wired into the main application router.
* both `components/` and `src/components/` are intentionally present.
* both `package-lock.json` and `bun.lock` currently exist.
* `npm run lint` currently means TypeScript type checking, not ESLint.
* CI should not be assumed unless a workflow actually runs successfully.
* some application areas are still placeholders or under development.

Inspect incomplete modules before treating them as established architecture.

---

## Completion Report

When finishing a task, report:

1. what changed
2. root cause if fixing a bug
3. important files changed
4. frontend changes
5. backend/database/rules changes
6. checks run
7. checks that could not be run
8. deployment or migration steps still required
9. security considerations
10. anything requiring human review

Never claim code was:

* tested
* deployed
* verified
* migrated
* merged

unless that action actually occurred.
