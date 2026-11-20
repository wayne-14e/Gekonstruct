import "server-only";

import {
  AnalyticsEventDocSchema,
} from "@/lib/domain/event";
import { describeActivity, type ActivityDescription } from "@/lib/domain/activity";
import { projectDocRef, type ProjectRecord } from "@/lib/projects";

export type RecentActivity = ActivityDescription & {
  id: string;
  projectId: string;
  projectTitle: string;
  at: number;
};

const RECENT_ACTIVITY_LIMIT = 6;

/** Loads validated activity from only the authenticated user's already-owned projects. */
export async function listRecentActivity(
  projects: readonly ProjectRecord[],
): Promise<RecentActivity[]> {
  const eventsByProject = await Promise.all(
    projects.map(async (project) => {
      const snapshot = await projectDocRef(project.id)
        .collection("events")
        .orderBy("at", "desc")
        .limit(40)
        .get();

      return snapshot.docs.flatMap((document) => {
        const parsed = AnalyticsEventDocSchema.safeParse(document.data());
        if (!parsed.success) return [];

        const description = describeActivity(parsed.data);
        if (!description) return [];

        return [
          {
            ...description,
            id: document.id,
            projectId: project.id,
            projectTitle: project.title,
            at: parsed.data.at,
          },
        ];
      });
    }),
  );

  return eventsByProject
    .flat()
    .sort((a, b) => b.at - a.at)
    .slice(0, RECENT_ACTIVITY_LIMIT);
}
