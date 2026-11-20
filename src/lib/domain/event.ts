import { z } from "zod";

/**
 * Analytics events written to `projects/{pid}/events/{eid}` (BLUEPRINT §13).
 * The tuple is the contract `docs/TEST_PLAN.md` maps to Module 3 metrics.
 */
export const ANALYTICS_EVENT_TYPES = [
  "project_created",
  "stage_completed",
  "analysis_ready",
  "overview_section_viewed",
  "lesson_viewed",
  "quiz_passed",
  "quiz_failed",
  "pathway_completed",
  "debug_created",
  "debug_completed",
  "return_visit",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const AnalyticsEventDocSchema = z.object({
  type: z.enum(ANALYTICS_EVENT_TYPES),
  at: z.number().int().nonnegative(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export type AnalyticsEventDoc = z.infer<typeof AnalyticsEventDocSchema>;

/**
 * The four readable sections of `/projects/[id]/overview`. `map-reader` is awarded when
 * every one of these has been seen (BLUEPRINT §7: "overview fully expanded/read").
 */
export const OVERVIEW_SECTIONS = ["summary", "skillmap", "flow", "concepts"] as const;

export const OverviewSectionSchema = z.enum(OVERVIEW_SECTIONS);

export type OverviewSection = z.infer<typeof OverviewSectionSchema>;

export const OVERVIEW_SECTION_LABELS: Record<OverviewSection, string> = {
  summary: "Summary",
  skillmap: "Skill map",
  flow: "Request flow",
  concepts: "Concepts",
};

export function isOverviewSection(value: string): value is OverviewSection {
  return (OVERVIEW_SECTIONS as readonly string[]).includes(value);
}

/** Add one section to the read list, ignoring duplicates and unknown values. */
export function mergeViewedSections(
  existing: readonly string[],
  section: string,
): string[] {
  if (!isOverviewSection(section)) return uniqueSections(existing);
  return uniqueSections([...existing, section]);
}

function uniqueSections(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(isOverviewSection)));
}

export function isOverviewComplete(viewed: readonly string[]): boolean {
  const set = new Set(viewed);
  return OVERVIEW_SECTIONS.every((section) => set.has(section));
}

/** BLUEPRINT §13: `return_visit` = first session more than 24h after `analysis_ready`. */
export const RETURN_VISIT_AFTER_MS = 24 * 60 * 60 * 1_000;

export function isReturnVisitDue(analysisReadyAt: number, now: number): boolean {
  return (
    Number.isFinite(analysisReadyAt) &&
    analysisReadyAt > 0 &&
    now - analysisReadyAt >= RETURN_VISIT_AFTER_MS
  );
}

/** Deterministic event ids keep view analytics idempotent across reloads. */
export function lessonViewedEventId(lessonId: string): string {
  return `lesson_viewed_${lessonId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function overviewSectionEventId(section: OverviewSection): string {
  return `overview_section_${section}`;
}
