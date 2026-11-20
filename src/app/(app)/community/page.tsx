import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Clock3,
  GitFork,
  Map,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Community",
};

const upcomingFeatures = [
  {
    icon: Map,
    title: "See how it fits together",
    description: "Explore a creator's project through its Architecture Map.",
  },
  {
    icon: GitFork,
    title: "Make it your own",
    description:
      "Build a separate learning remix. You won't change or contribute to the creator's GitHub project.",
  },
  {
    icon: BookOpenText,
    title: "Learn by rebuilding",
    description:
      "Use Foundations to understand the project. Community remixes won't include Debug & Learn.",
  },
];

export default async function CommunityPage() {
  await requireUser("/community");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="relative overflow-hidden rounded-3xl border border-[#26313c] bg-[#111821] px-6 py-8 sm:px-9 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-20 size-80 rounded-full bg-[#5be000]/10 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="label-mono">Learn from each other</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#584211] bg-[#2b1f06] px-2.5 py-1 font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-[#ffd57a] uppercase">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Coming soon
            </span>
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-semibold text-foreground sm:text-5xl">
            Build their project.
            <br />
            Understand your own.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Community will be a place to discover projects shared by other vibe-coders, remix one
            into your own workspace, and learn how it works by building it yourself.
          </p>
        </div>
      </header>

      <section aria-label="Community features coming soon" className="mt-8">
        <div className="grid gap-4 md:grid-cols-3">
          {upcomingFeatures.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="community-path-heading"
        className="mt-8 grid gap-6 rounded-3xl border border-border bg-card p-5 sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:items-center"
      >
        <div>
          <p className="label-mono">The learning loop</p>
          <h2 id="community-path-heading" className="mt-2 text-2xl font-semibold text-foreground">
            Their starting point. Your understanding.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Creators share a project to teach from. You get your own remix to explore with the
            Architecture Map and Foundations—without sending changes back to their repository.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-[#0e141b] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
              Shared project
            </span>
            <ArrowRight className="size-4 text-primary" aria-hidden="true" />
            <span className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
              Your remix
            </span>
          </div>
          <div className="my-4 border-t border-border" />
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
              <Map className="size-3.5 text-primary" aria-hidden="true" />
              Architecture Map
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
              <BookOpenText className="size-3.5 text-primary" aria-hidden="true" />
              Foundations
            </span>
          </div>
          <p className="mt-3 text-center font-mono text-[0.6875rem] text-muted-foreground">
            A learning remix, not a GitHub contribution
          </p>
        </div>
      </section>

      <section
        aria-labelledby="community-opening-heading"
        className="mt-8 flex flex-col gap-5 rounded-2xl border border-dashed border-[#3b4a57] bg-[#111821]/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <p className="label-mono">Nothing to browse yet</p>
          <h2
            id="community-opening-heading"
            className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            Community is still taking shape.
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            No projects are listed here yet. Would you learn by rebuilding a project someone else
            made? That&apos;s what we&apos;re working toward.
          </p>
        </div>
        <Button asChild variant="secondary" className="sm:shrink-0">
          <Link href="/projects">
            Explore your projects
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
