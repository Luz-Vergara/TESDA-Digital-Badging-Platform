import type { BadgeType, StandardType } from '@/src/types';

export interface DemoCompetency {
  code?: string;
  title: string;
  badgeType?: BadgeType;
}

export interface DemoStandard {
  id: string;
  type: StandardType;
  title: string;
  code?: string;
  competencies: readonly DemoCompetency[];
  completionBadgeType: BadgeType;
}

export const demoStandards: readonly DemoStandard[] = [
  {
    id: 'cs-knx-certified-devices',
    type: 'CS',
    title: 'KNX Certified Devices Installation and Programming',
    code: 'CS-ELC741310',
    competencies: [
      {
        title: 'Perform installation, programming, testing and commissioning of KNX certified devices',
        badgeType: 'Proficient',
      },
    ],
    completionBadgeType: 'Skilled',
  },
  {
    id: 'mcc-print-media-visual-graphics',
    type: 'MCC',
    title: 'Developing Design for Print Media Leading to Visual Graphics Design NC III',
    competencies: [],
    completionBadgeType: 'Proficient',
  },
  {
    id: 'tr-warehousing-services-nc-ii',
    type: 'TR',
    title: 'Warehousing Services NC II',
    competencies: [
      { code: 'LOG432301', title: 'Receive stocks/goods', badgeType: 'Proficient' },
      { code: 'LOG432302', title: 'Store stocks/goods', badgeType: 'Proficient' },
      { code: 'LOG432303', title: 'Pick stocks/goods', badgeType: 'Proficient' },
      { code: 'LOG432304', title: 'Issue/dispatch stocks/goods', badgeType: 'Proficient' },
      { code: 'LOG432305', title: 'Pack stocks/goods', badgeType: 'Proficient' },
      { code: 'LOG432306', title: 'Operate and maintain manual material handling equipment', badgeType: 'Proficient' },
    ],
    completionBadgeType: 'Skilled',
  },
];

export const getDemoStandard = (standardId: string | undefined) =>
  demoStandards.find((standard) => standard.id === standardId);

export const getDemoStandardBadgeConfiguration = (standard: DemoStandard) => {
  const proficientCompetencies = standard.competencies.filter(
    (competency) => competency.badgeType === 'Proficient',
  ).length;

  if (proficientCompetencies > 0) {
    return `${proficientCompetencies} Proficient competency badge${proficientCompetencies === 1 ? '' : 's'} → ${standard.completionBadgeType} complete-standard badge`;
  }

  return `Complete ${standard.type} → ${standard.completionBadgeType}`;
};
