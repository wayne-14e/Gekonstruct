import { BADGES, isBadgeId } from "@/lib/badges";
import type { BadgeId } from "@/lib/badges";
import type { AnalyticsEventDoc } from "@/lib/domain/event";

export type ActivityIcon = "project" | "pipeline" | "lesson" | "xp" | "badge" | "debug" | "return";

export type ActivityDescription = {
  title: string;
  details: string[];
  icon: ActivityIcon;
};

function numberMeta(meta: AnalyticsEventDoc["meta"], key: string): number {
  const value = meta[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function stringMeta(meta: AnalyticsEventDoc["meta"], key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function badgeName(value: string | null): string | null {
  return value && isBadgeId(value) ? BADGES[value].name : null;
}

function humanize(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rewardDetails(
  meta: AnalyticsEventDoc["meta"],
  bonusField: string | null,
  awardedBadge: BadgeId,
): string[] {
  const totalXp = Math.floor(numberMeta(meta, "xpAwarded"));
  const bonusXp = Math.min(
    totalXp,
    bonusField ? Math.floor(numberMeta(meta, bonusField)) : 0,
  );
  const baseXp = totalXp - bonusXp;
  const details: string[] = [];

  if (baseXp > 0) details.push(`Earned ${baseXp} XP`);
  if (bonusXp > 0) details.push(`Earned ${bonusXp} pathway bonus XP`);
  if (meta.badgeAwarded === true) {
    details.push(`Earned ${BADGES[awardedBadge].name} badge`);
  }

  return details;
}

/** Converts stored analytics events into concise, user-facing activity copy. */
export function describeActivity(event: AnalyticsEventDoc): ActivityDescription | null {
  const { meta, type } = event;

  switch (type) {
    case "project_created":
      return { title: "Connected a project", details: [], icon: "project" };
    case "stage_completed": {
      const stage = stringMeta(meta, "stage");
      const title =
        stage === "ingested"
          ? "Scanned a repository"
          : stage === "architecture"
            ? "Created an architecture map"
            : stage === "lessons1" || stage === "lessons2"
              ? "Created Foundations lessons"
              : "Completed a project step";
      return { title, details: [], icon: "pipeline" };
    }
    case "analysis_ready":
      return null;
    case "overview_section_viewed":
      return null;
    case "lesson_viewed": {
      const lessonId = stringMeta(meta, "lessonId");
      return {
        title: "Opened a Foundations lesson",
        details: lessonId ? [`Lesson: ${humanize(lessonId)}`] : [],
        icon: "lesson",
      };
    }
    case "quiz_passed": {
      const details: string[] = [];
      const lessonId = stringMeta(meta, "lessonId");
      if (lessonId) details.push(`Lesson: ${humanize(lessonId)}`);
      details.push(...rewardDetails(meta, "bonusXp", "foundation-builder"));
      if (meta.pathwayComplete === true) details.push("Completed the Foundations pathway");
      if (numberMeta(meta, "xpAwarded") === 0) details.push("No new XP this time");
      return {
        title: "Completed a Foundations lesson",
        details,
        icon: "lesson",
      };
    }
    case "quiz_failed": {
      const score = numberMeta(meta, "score");
      return {
        title: "Tried a Foundations lesson quiz",
        details: [`Score: ${Math.round(score * 100)}%`],
        icon: "lesson",
      };
    }
    case "pathway_completed": {
      const name = badgeName(stringMeta(meta, "badge"));
      if (stringMeta(meta, "pathway") === "architecture" && name) {
        return { title: `Earned the ${name} badge`, details: [], icon: "badge" };
      }
      return null;
    }
    case "debug_created":
      return { title: "Started a Debug & Learn session", details: [], icon: "debug" };
    case "debug_completed": {
      const passed = meta.passed === true;
      const details = rewardDetails(meta, null, "bug-whisperer");
      const score = numberMeta(meta, "score");
      if (!passed && score > 0) details.push(`Score: ${Math.round(score * 100)}%`);
      if (passed && details.length === 0) details.push("No new XP this time");
      return {
        title: passed ? "Completed a Debug & Learn session" : "Tried a Debug & Learn quiz",
        details,
        icon: passed ? "xp" : "debug",
      };
    }
    case "return_visit":
      return { title: "Returned to a project", details: [], icon: "return" };
  }
}
