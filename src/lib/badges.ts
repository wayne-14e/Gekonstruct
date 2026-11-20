/**
 * Badge catalogue and pure award rules (BLUEPRINT §7).
 *
 * Badge ids are stored as strings in `users/{uid}.badges` and
 * `projects/{pid}/progress/{uid}.badges`, so this module is the single place that knows
 * which ids are real and when each one is earned.
 */
export const BADGE_IDS = ["map-reader", "foundation-builder", "bug-whisperer"] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

export type BadgeDefinition = {
  name: string;
  description: string;
};

export const BADGES: Record<BadgeId, BadgeDefinition> = {
  "map-reader": {
    name: "Map Reader",
    description: "Read every section of your architecture map.",
  },
  "foundation-builder": {
    name: "Foundation Builder",
    description: "Pass every lesson in the Foundations pathway.",
  },
  "bug-whisperer": {
    name: "Bug Whisperer",
    description: "Complete your first Debug & Learn session.",
  },
};

export const BADGE_COUNT = BADGE_IDS.length;

export function isBadgeId(value: string): value is BadgeId {
  return (BADGE_IDS as readonly string[]).includes(value);
}

/** A display-safe list: known ids first (catalogue order), unknown legacy ids after. */
export function uniqueBadgeList(badges: readonly string[]): string[] {
  const known = BADGE_IDS.filter((id) => badges.includes(id));
  const unknown = Array.from(new Set(badges.filter((badge) => !isBadgeId(badge))));
  return [...known, ...unknown];
}

export function earnedBadgeCount(badges: readonly string[]): number {
  return BADGE_IDS.filter((id) => badges.includes(id)).length;
}

/**
 * Award a badge only when the achievement condition is true and neither the project
 * progress nor the user profile already owns it. Keeps badge writes idempotent across
 * retakes, reloads and multiple projects.
 */
export function shouldAwardBadge(input: {
  owned: readonly string[];
  badge: BadgeId;
  condition: boolean;
}): boolean {
  return input.condition && !input.owned.includes(input.badge);
}

export function addBadge(owned: readonly string[], badge: BadgeId): string[] {
  return uniqueBadgeList([...owned, badge]);
}
