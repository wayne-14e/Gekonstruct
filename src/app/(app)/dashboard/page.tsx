import type { Metadata } from "next";
import { FolderGit2, ShieldCheck, Sparkles } from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { XpBadge } from "@/components/app/xp-badge";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PROJECT_LIMIT = 3;

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getUserProfile(user.uid);
  const totalXp = profile?.totalXp ?? 0;
  const projectCount = 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Your projects</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {projectCount === 0
              ? `No repositories connected yet. You can connect up to ${PROJECT_LIMIT} while we validate.`
              : `${projectCount} of ${PROJECT_LIMIT} repositories connected.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <XpBadge totalXp={totalXp} />
        </div>
      </div>

      <section aria-labelledby="empty-projects" className="mt-8">
        <div className="rounded-2xl border border-dashed border-border bg-card/70 px-5 py-12 text-center sm:px-10">
          <div className="mx-auto flex max-w-md flex-col items-center">
            <GekoAvatar mood="encouraging" size="lg" />
            <h2 id="empty-projects" className="mt-4 text-xl font-semibold">
              Your first repo goes here
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
              Connect a public GitHub project and Geko maps it, teaches it, and keeps your
              XP in one place. Projects that have grown past a single file benefit most.
            </p>
          </div>

          <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {[
              {
                icon: FolderGit2,
                title: "Public repo",
                body: "Paste a github.com URL. Private repos are out of scope in the MVP.",
              },
              {
                icon: Sparkles,
                title: "About a minute",
                body: "Ingestion is fast; the analysis runs as visible pipeline steps.",
              },
              {
                icon: ShieldCheck,
                title: "Read-only",
                body: "Gekonstruct never writes, pushes, or opens pull requests.",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-border bg-card p-3.5 text-left"
              >
                <item.icon className="size-4 text-primary" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-2">
            <Button size="lg" disabled>
              Connect a repository
            </Button>
            <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
              Opens in the next build step
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
