export interface DemoAccount {
  id: string;
  label: string;
  email: string;
  organizationName?: string;
}

export interface DemoAccountGroup {
  role: string;
  label: string;
  dashboardPath: string;
  accounts: DemoAccount[];
}

export const demoAccountGroups: DemoAccountGroup[] = [
  {
    role: "qso_admin",
    label: "QSO Admin",
    dashboardPath: "/qso",
    accounts: [
      {
        id: "demo-qso-1",
        label: "Demo QSO Admin",
        email: "qso@demo.com",
        organizationName: "Central QSO"
      }
    ]
  },
  {
    role: "TrainingCenter",
    label: "Training Center",
    dashboardPath: "/trainingcenter",
    accounts: [
      {
        id: "demo-training-main",
        label: "Demo Training Center",
        email: "training@demo.com",
        organizationName: "Demo Training Center"
      },
      {
        id: "demo-training-1",
        label: "Demo Training Center 1",
        email: "training1@demo.com",
        organizationName: "Demo Training Center 1"
      },
      {
        id: "demo-training-2",
        label: "Demo Training Center 2",
        email: "training2@demo.com",
        organizationName: "Demo Training Center 2"
      }
    ]
  },
  {
    role: "DistrictOffice",
    label: "District Office",
    dashboardPath: "/districtoffice",
    accounts: [
      {
        id: "demo-district-1",
        label: "Demo District Office",
        email: "district@demo.com",
        organizationName: "Demo District Office"
      }
    ]
  },
  {
    role: "Learner",
    label: "Learner",
    dashboardPath: "/learner",
    accounts: [
      {
        id: "demo-learner-1",
        label: "Demo Learner 1 (Juan Dela Cruz)",
        email: "learner@demo.com"
      },
      {
        id: "demo-learner-2",
        label: "Demo Learner 2 (Maria Santos)",
        email: "learner2@demo.com"
      },
      {
        id: "demo-learner-3",
        label: "Demo Learner 3 (Jose Rizal)",
        email: "learner3@demo.com"
      },
      {
        id: "demo-learner-4",
        label: "Demo Learner 4 (Andres Bonifacio)",
        email: "learner4@demo.com"
      },
      {
        id: "demo-learner-5",
        label: "Demo Learner 5 (Emilio Aguinaldo)",
        email: "learner5@demo.com"
      }
    ]
  },
  {
    role: "AssessmentCenter",
    label: "Assessment Center",
    dashboardPath: "/assessmentcenter",
    accounts: [
      {
        id: "demo-assessment-1",
        label: "Demo Assessment Center",
        email: "assessment@demo.com",
        organizationName: "Demo Assessment Center"
      }
    ]
  },
  {
    role: "co_admin",
    label: "Certification Office",
    dashboardPath: "/co",
    accounts: [
      {
        id: "demo-co-1",
        label: "Demo Cert Officer",
        email: "co@demo.com",
        organizationName: "Certification Office"
      }
    ]
  },
  {
    role: "icto_admin",
    label: "ICTO",
    dashboardPath: "/icto",
    accounts: [
      {
        id: "demo-icto-1",
        label: "Demo ICTO Admin",
        email: "icto@demo.com",
        organizationName: "ICTO Central"
      }
    ]
  },
  {
    role: "Admin",
    label: "Super Admin",
    dashboardPath: "/admin",
    accounts: [
      {
        id: "demo-admin-1",
        label: "Demo Super Admin",
        email: "admin@demo.com",
        organizationName: "TESDA Main"
      }
    ]
  }
];

export function shouldShowDemoLauncher(user: any, userProfile: any): boolean {
  const env = (import.meta as any).env || {};
  const demoMode = env.VITE_DEMO_MODE === "true" || env.DEV || true;

  // Only show if the user is explicitly a demo user
  return !!(demoMode && userProfile?.isDemo);
}
