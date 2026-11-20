import Link from "next/link";
import {
  Award,
  Bug,
  CheckCircle2,
  Clock3,
  FolderPlus,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ActivityIcon } from "@/lib/domain/activity";
import type { RecentActivity } from "@/lib/activity";

const ICONS: Record<ActivityIcon, LucideIcon> = {
  project: FolderPlus,
  pipeline: CheckCircle2,
  lesson: GraduationCap,
  xp: Sparkles,
  badge: Award,
  debug: Bug,
  return: Clock3,
};

export function RecentActivityFeed({ activities }: { activities: RecentActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/70 px-5 py-8">
        <p className="font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect a project and start exploring its map or lessons to see your progress here.
        </p>
      </div>
    );
  }

  return (
    <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {activities.map((activity) => {
        const Icon = ICONS[activity.icon];
        const date = new Date(activity.at);

        return (
          <li key={`${activity.projectId}-${activity.id}`} className="flex gap-3 p-4 sm:p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold">{activity.title}</p>
                <time
                  className="font-mono text-[0.6875rem] text-muted-foreground"
                  dateTime={date.toISOString()}
                >
                  {formatDate(date)}
                </time>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <Link
                  href={`/projects/${activity.projectId}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {activity.projectTitle}
                </Link>
                {activity.details.map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
