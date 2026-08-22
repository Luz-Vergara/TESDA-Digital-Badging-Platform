import type { BadgeDesign, BadgeTemplate } from '@/src/types';

export const DEFAULT_BADGE_DESIGNS: BadgeDesign[] = [
  { id: 'default-proficient-design', name: 'Default Proficient Design', badgeType: 'Proficient', status: 'Active' },
  { id: 'default-skilled-design', name: 'Default Skilled Design', badgeType: 'Skilled', status: 'Active' },
];

/** Uses the mapping first. `imageUrl` is intentionally only a legacy fallback. */
export function resolveBadgeDesign(template: BadgeTemplate | undefined, designs: BadgeDesign[] = DEFAULT_BADGE_DESIGNS) {
  const design = designs.find((item) => item.id === template?.badgeDesignId);
  return {
    design,
    artworkUrl: design?.artworkUrl || template?.imageUrl || '',
    isConfigured: Boolean(design?.artworkUrl || template?.imageUrl),
  };
}
