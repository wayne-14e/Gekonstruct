import type { Metadata } from "next";
import { RecentActivityFeed } from "@/components/app/recent-activity-feed";
import { XpBadge } from "@/components/app/xp-badge";
import { ConnectRepoForm } from "@/components/projects/connect-repo-form";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";
import { listRecentActivity } from "@/lib/activity";
import { MAX_PROJECTS } from "@/lib/domain/project";
import { listProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [profile, projects] = await Promise.all([
    getUserProfile(user.uid),
    listProjects(user.uid),
  ]);
  const activities = await listRecentActivity(projects);

  const totalXp = profile?.totalXp ?? 0;
  const atLimit = projects.length >= MAX_PROJECTS;
  const displayName = profile?.displayName ?? user.displayName;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">Workspace</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Hi, {displayName}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {projects.length === 0
              ? `No repositories connected yet. You can connect up to ${MAX_PROJECTS} while we validate.`
              : `${projects.length} of ${MAX_PROJECTS} repositories connected. See your latest learning activity below.`}
          </p>
        </div>
        <XpBadge totalXp={totalXp} />
      </div>

      <section
        aria-labelledby="connect-heading"
        className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-mono">Connect</p>
            <h2 id="connect-heading" className="mt-2 text-xl">
              Read a public repository
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Paste the repo root URL. Geko reads the tree once, keeps a snapshot of the
              files that matter, and never writes back.
            </p>
          </div>
          <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground tabular-nums uppercase">
            {projects.length} / {MAX_PROJECTS} connected
          </span>
        </div>

        <div className="mt-4">
          <ConnectRepoForm atLimit={atLimit} remaining={Math.max(0, MAX_PROJECTS - projects.length)} />
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="mt-10">
        <div>
          <p className="label-mono">Your journey</p>
          <h2 id="activity-heading" className="mt-2 text-2xl">
            Latest activity
          </h2>
        </div>
        <RecentActivityFeed activities={activities} />
      </section>
    </div>
  );
}
