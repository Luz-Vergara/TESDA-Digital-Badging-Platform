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
