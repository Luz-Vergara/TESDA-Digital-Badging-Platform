# TESDA Digital Badging Platform

A web application prototype for the TESDA Digital Badging Platform, designed for secure badge issue tracking, decentralized approval queues, and public credential verification.

---

## 🔒 Prototype Testing & Demo Accounts Setup

This platform includes a built-in **Demo Login** feature for offline, sandbox, and local prototype verification. It operates independently of the Google Login used by production users.

To configure and test the prototype, follow the instructions below to enable Email/Password Authentication in your Firebase Console.

### Part 1: Enable Email/Password Auth in Firebase
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase project.
3. In the left-hand navigation list, click on **Authentication**.
4. Go to the **Sign-in method** tab.
5. Under **Sign-in providers**, click on **Add new provider** (or edit the Email/Password entry).
6. Enable **Email/Password** sign-in (keep "Email link (passwordless sign-in)" disabled).
7. Click **Save**.

### Part 2: Manually Create Demo Accounts
Demo accounts must be created manually through the Firebase Console. The application does not support sign-up to maintain security boundaries.

1. While still under **Authentication**, click on the **Users** tab.
2. Click **Add user** in the top right.
3. Enter one of the following mapped emails and set a strong, secure password of your choice:
   * **Learner**: `learner@demo.com`
   * **QSO Admin**: `qso@demo.com`
   * **Certification Office**: `co@demo.com`
   * **District Office**: `district@demo.com`
   * **Training Center**: `training@demo.com`
   * **Assessment Center**: `assessment@demo.com`
   * **Central Admin**: `admin@demo.com`
   * **ICTO Admin**: `icto@demo.com`
4. Click **Add user**.

> [!CAUTION]
> **Password Handling Policy:**
> * Never hard-code passwords.
> * Never store passwords in the source code or in any configuration files.
> * Never write passwords down in this README or compile them.
> * Never commit any passwords to GitHub or other repositories.
> Set individual passwords dynamically in the console.

### Part 3: Mapped Roles Reference
The application parses the sign-in email to automatically link and set up the corresponding user profile and mock organizations:

| Email Pattern contains | Assigned Role | Display Name Prefix | Access Level | Mapped Demo Organization |
| :--- | :--- | :--- | :--- | :--- |
| `learner` or `student` | `Learner` | Demo Learner | Accesses badge wallet, applications, and transcripts | *None* |
| `qso` | `qso_admin` | Demo QSO Admin | Manages qualification templates and standards | Central QSO |
| `co` or `cert` | `co_admin` | Demo Certification Officer | Signs and stamps final National Certificates (NC) | Certification Office |
| `district` or `do` | `DistrictOffice` | Demo District Office | Regional approval queue and institutional audits | `demo-district-office` |
| `training` or `tc` | `TrainingCenter` | Demo Training Center | Uploads batched accomplishments, triggers micro-credentials | `demo-training-center` |
| `assessment` or `ac` | `AssessmentCenter` | Demo Assessment Center | Submits assessment grades, requests skilled national badges | `demo-assessment-center` |
| `admin` | `Admin` | Demo Admin | Unified view of system catalogs, logs, users | Central Admin |
| `icto` | `icto_admin` | Demo ICTO Admin | Systems telemetry and schema administration | Technical Office |

---

## 🚀 Key Features

* **Visual Theme Separation**: Automatic visual identification badge (**"DEMO ACCOUNT"**) lights up across all dashboards when a demo user is logged in.
* **Hermetic Record Encapsulation**: Dynamic proxy filters isolate testing data—demo accounts only interact with collections marked with `isDemo: true`, completely hidden from production users.
* **Zero-Setup Seeding**: The application automatically provisions clean, realistic mock data templates and demo organizations inside Firestore when you first execute a demo login.

---

## External Information System API Demo (Training Center Phase)

This repository contains a local-only, disabled-by-default demonstration of
retrieving Training Center data from a temporary Supabase mock database.
Supabase is not the Digital Badging Platform's permanent datastore and is not
treated as the final T2MIS contract.

### Architecture

```text
Training Center Dashboard
  -> Digital Badging Integration API
  -> ExternalDataSourceAdapter
  -> Supabase mock database
```

React never connects to Supabase tables and never chooses the data source. The
server-side `EXTERNAL_DATA_SOURCE` setting chooses the adapter:

| Value | Status |
| --- | --- |
| `supabase` | Implemented temporary mock adapter |
| `t2mis-api` | Reserved, deliberately unconfigured |
| `t2mis-database` | Reserved, deliberately unconfigured |

The adapter contract and standardized field requirements are documented in
[`supabase/functions/api/ADAPTERS.md`](supabase/functions/api/ADAPTERS.md).
No assumptions have been made about final T2MIS field names, database
technology, API format, or authentication.

### Phase 1 scope

Only the Training Center dashboard is integrated. District Office, Learner, and
public-verification dashboard integration are not changed in this phase.
Firebase Authentication and all existing Firebase workflows remain available.

The Integration API exposes only these read-only logical routes:

```text
GET /api/training-centers/{id}/dashboard-summary
GET /api/training-centers/{id}/learners
GET /api/learners/{id}
GET /api/training-centers/{id}/badge-requests
GET /api/badges/{verificationId}
```

When hosted as the Supabase Edge Function named `api`, the full URL includes
Supabase's function prefix. For example:

```text
https://PROJECT_REF.supabase.co/functions/v1/api/training-centers/TC-DEMO-001/learners
```

### Local feature settings

The feature is disabled unless explicitly enabled:

```dotenv
VITE_EXTERNAL_API_DEMO_ENABLED=false
VITE_EXTERNAL_API_BASE_URL=
VITE_EXTERNAL_TRAINING_CENTER_ID=TC-DEMO-001
```

When disabled, the existing Firestore-backed Training Center dashboard runs
unchanged and no Integration API request is made. When enabled without an API
base URL, the dashboard shows an intentional API configuration error instead of
silently falling back to Firebase.

### Mock database

The migration creates:

- `training_centers`
- `qualifications`
- `competencies`
- `registered_programs`
- `learners`
- `enrollments`
- `learner_competency_completions`
- `badge_definitions`
- `badge_requirements`
- `badge_requests`
- `badge_request_items`
- `issued_badges`
- `learner_badge_eligibility` read-only view

The seed contains only fictional data:

- Training Center `TC-DEMO-001`
- One fictional qualification and registered program
- Two required fictional competencies
- Demo Learner Alpha: both competencies complete and eligible
- Demo Learner Beta: one competency complete and not eligible
- Demo Learner Gamma: eligible with an approved request and active issued badge
- One pending request, one approved request, and one active issued badge

All emails use the reserved `example.invalid` domain.

## Create and Connect a Supabase Project Later

The following steps are instructions only. They have not been run for this
repository.

1. Create a new project in the [Supabase Dashboard](https://supabase.com/dashboard).
   Use a development-only project and store its database password in an approved
   password manager.
2. Install or invoke the current Supabase CLI, then authenticate through its
   browser-based login flow:

   ```bash
   npx supabase@latest login
   ```

3. Link this local repository after replacing the placeholder with the public
   project reference:

   ```bash
   npx supabase@latest link --project-ref PROJECT_REF
   ```

4. Review the migration and seed before applying them. When approved, apply the
   migration and fictional seed using the current CLI workflow:

   ```bash
   npx supabase@latest db push --include-seed
   ```

5. Configure only server-side function settings. Supabase supplies
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. Set the
   adapter selector and the allowed frontend origin without printing secret
   values:

   ```bash
   npx supabase@latest secrets set EXTERNAL_DATA_SOURCE=supabase
   npx supabase@latest secrets set ALLOWED_ORIGIN=https://YOUR_FRONTEND_ORIGIN
   ```

6. After reviewing the function, deploy it:

   ```bash
   npx supabase@latest functions deploy api --no-verify-jwt
   ```

7. Configure the frontend with public values:

   ```dotenv
   VITE_EXTERNAL_API_DEMO_ENABLED=true
   VITE_EXTERNAL_API_BASE_URL=https://PROJECT_REF.supabase.co/functions/v1
   VITE_EXTERNAL_TRAINING_CENTER_ID=TC-DEMO-001
   ```

8. Rebuild the frontend and open the Training Center dashboard. The visible
   "Mock External System" indicator confirms external demo mode.

Stop and obtain approval before linking, pushing migrations, setting project
secrets, deploying the Edge Function, or enabling the feature in a shared
environment.

### Public and secret configuration

| Configuration | Classification |
| --- | --- |
| `VITE_EXTERNAL_API_DEMO_ENABLED` | Public build setting |
| `VITE_EXTERNAL_API_BASE_URL` | Public endpoint |
| `VITE_EXTERNAL_TRAINING_CENTER_ID` | Public fictional identifier |
| Supabase project URL and project reference | Public identifiers |
| Supabase publishable/legacy anon key | Public client identifier; unused by this demo frontend |
| `EXTERNAL_DATA_SOURCE` | Server-only non-secret setting |
| `ALLOWED_ORIGIN` | Server-only non-secret setting |
| `SUPABASE_SERVICE_ROLE_KEY` or Supabase secret key | Secret; server only |
| Database password or connection string | Secret |
| Supabase CLI access token | Secret |

Never prefix a secret with `VITE_`; Vite variables are included in the browser
bundle. Do not place service-role keys, database passwords, access tokens, or
service-account credentials in repository files.
