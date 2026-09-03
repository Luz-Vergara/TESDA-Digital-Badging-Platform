import type { BadgeDesign, BadgeTemplate } from '@/src/types';

export const DEFAULT_BADGE_DESIGNS: BadgeDesign[] = [
  { id: 'default-proficient-design', name: 'Default Proficient Design', badgeType: 'Proficient', status: 'Active' },
  { id: 'default-skilled-design', name: 'Default Skilled Design', badgeType: 'Skilled', status: 'Active' },
];

/**
 * Remote documents augment the built-in defaults. This lets QSO configure the
 * artwork for a default design without creating a second design record in the
 * UI or losing the default's stable identity.
 */
export function mergeBadgeDesigns(remoteDesigns: BadgeDesign[] = []): BadgeDesign[] {
  const remoteById = new Map(remoteDesigns.map((design) => [design.id, design]));
  const defaults = DEFAULT_BADGE_DESIGNS.map((design) => ({
    ...design,
    ...remoteById.get(design.id),
  }));
  const additionalDesigns = remoteDesigns.filter((design) =>
    !DEFAULT_BADGE_DESIGNS.some((defaultDesign) => defaultDesign.id === design.id),
  );

  return [...defaults, ...additionalDesigns];
}

/** Uses the mapping first. `imageUrl` is intentionally only a legacy fallback. */
export function resolveBadgeDesign(template: BadgeTemplate | undefined, designs: BadgeDesign[] = DEFAULT_BADGE_DESIGNS) {
  const design = designs.find((item) => item.id === template?.badgeDesignId);
  return {
    design,
    artworkUrl: design?.artworkUrl || template?.imageUrl || '',
    isConfigured: Boolean(design?.artworkUrl || template?.imageUrl),
  };
}
