import Link from "next/link";
import { ArrowRight, BookOpenCheck, Bug, Check, Network } from "lucide-react";
import { AppHeader, HeaderLink } from "@/components/app/app-header";
import { SiteFooter } from "@/components/app/site-footer";
import { GekoMark } from "@/components/brand/geko-mark";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

const PATHWAYS = [
  {
    icon: BookOpenCheck,
    name: "Foundations",
    line: "The full course, in reading order.",
    detail:
      "From “what this project actually is” to “how to ship a change without breaking three files”.",
    meta: ["6–10 lessons", "quiz per lesson", "20 XP each"],
  },
  {
    icon: Bug,
    name: "Debug & Learn",
    line: "Describe the bug. Learn the cause.",
    detail:
      "Geko points at the files that likely cause it, gives concrete fix steps, then teaches the concept underneath.",
    meta: ["2–3 likely causes", "evidence files", "30 XP"],
  },
  {
    icon: Network,
    name: "Architecture Overview",
    line: "The map, before the lessons.",
    detail:
      "Layers, data flow and the concepts that hold it together — in plain English, built from your tree.",
    meta: ["3–7 layers", "data flow", "5–12 concepts"],
  },
] as const;

const STEPS = [
  {
    title: "Connect a public repo",
    body: "Paste the GitHub URL. We read the tree and skip what does not teach you anything: node_modules, lockfiles, binaries, anything over 300 KB.",
  },
  {
    title: "Geko detects your stack",
    body: "Framework, database, auth, hosting — read from your manifests and folders. No guessing, no LLM involved in this part.",
  },
  {
    title: "Pick a pathway",
    body: "Lost? Start with the map. Staying? Start with lessons. Broken? Start with debug.",
  },
  {
    title: "Prove it back",
    body: "Every lesson ends with questions answerable only from your codebase. Pass, and the XP is yours.",
  },
] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <AppHeader
        user={user}
        nav={
          <>
            <HeaderLink href="#pathways">Pathways</HeaderLink>
            <HeaderLink href="#how">How it works</HeaderLink>
          </>
        }
      />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="field-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <div>
              <p className="animate-rise flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
                <span className="skin-gradient size-2 rounded-full" aria-hidden="true" />
                For projects that outgrew the AI fix loop
              </p>

              <h1 className="animate-rise mt-5 text-[clamp(2.6rem,7vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.03em] [animation-delay:60ms]">
                You vibe-coded it.
                <span className="relative mt-1 block w-fit">
                  Now own it.
                  <span
                    className="skin-gradient absolute inset-x-0 -bottom-1 h-[6px] rounded-full opacity-80"
                    aria-hidden="true"
                  />
                </span>
              </h1>

              <p className="animate-rise mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground [animation-delay:120ms]">
                Geko reads your public repo and explains it back through your own files:
                an architecture map, a lesson series, and a debug guide. No patches, no
                magic — just your code, taught to you.
              </p>

              <div className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:180ms]">
                <Button asChild size="lg" className="sm:w-auto">
                  <Link href={user ? "/dashboard" : "/login"}>
                    {user ? "Open your dashboard" : "Sign in with Google"}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#pathways">See the three pathways</Link>
                </Button>
              </div>

              <p className="animate-rise mt-5 text-sm text-muted-foreground [animation-delay:240ms]">
                Free while we validate · public repositories only · we never write to your
                code.
              </p>
            </div>

            <HeroSpecimen />
          </div>
        </section>

        {/* Pathways */}
        <section id="pathways" className="scroll-mt-20 border-b border-border/70 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold sm:text-4xl">Three ways in.</h2>
                <p className="mt-2 max-w-lg text-muted-foreground">
                  Same repo, same voice. Pick the depth you need today.
                </p>
              </div>
              <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
                From your files only
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {PATHWAYS.map((p) => (
                <article
                  key={p.name}
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,26,21,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_24px_-12px_rgba(16,26,21,0.25)]"
                >
                  <p.icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm font-medium text-foreground/90">{p.line}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p.detail}
                  </p>
                  <ul className="mt-auto flex flex-wrap gap-1.5 border-t border-border/70 pt-4">
                    {p.meta.map((m) => (
                      <li
                        key={m}
                        className="rounded-full bg-muted px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-3xl font-semibold sm:text-4xl">How it works</h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Four steps. The first two take about a minute; the analysis runs in the
                background while you watch.
              </p>
              <div className="mt-6 rounded-xl border border-border/80 bg-muted/50 p-4">
                <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
                  Limits, stated up front
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {[
                    "Public GitHub repositories only",
                    "3 projects per account during validation",
                    "Explains and teaches — never auto-fixes",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-xl border border-border bg-card p-5">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border/70 bg-secondary/60">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <GekoAvatar mood="encouraging" size="lg" />
              <div>
                <h2 className="text-2xl font-semibold">Ready when your repo is.</h2>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                  Bring a project that has grown past one file. That is where the confusion
                  lives — and where this helps most.
                </p>
              </div>
            </div>
            <Button asChild size="lg">
              <Link href={user ? "/dashboard" : "/login"}>
                {user ? "Go to dashboard" : "Start with your repo"}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function HeroSpecimen() {
  return (
    <div className="animate-rise relative [animation-delay:150ms]">
      <div className="absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(60%_60%_at_50%_20%,rgba(185,231,105,0.28),transparent_70%)]" />
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_-30px_rgba(16,26,21,0.45)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
            Sample output
          </p>
          <span className="path-chip min-w-0 max-w-full truncate">your-repo/src/app/page.tsx</span>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-border/70 bg-muted/40">
          <div className="skin-gradient absolute inset-x-0 top-0 h-1" aria-hidden="true" />
          <div className="grid place-items-center px-4 pt-6 pb-4">
            <GekoMark className="animate-drift size-28 text-primary sm:size-32" />
          </div>
          <div className="border-t border-border/70 bg-card px-4 py-3">
            <p className="text-sm leading-relaxed">
              <span className="font-medium">Geko:</span> “Your landing page renders from{" "}
              <span className="text-primary">src/app/page.tsx</span> — that is the first
              file to open when a change goes wrong.” 🦎
            </p>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-border/70 text-sm">
          {[
            { icon: Network, label: "Overview", value: "6 layers · 9 concepts · data flow" },
            { icon: BookOpenCheck, label: "Foundations", value: "8 lessons · quizzes · XP" },
            { icon: Bug, label: "Debug", value: "3 likely causes with evidence files" },
          ].map((row) => (
            <li key={row.label} className="flex items-start gap-3 py-2.5">
              <row.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="w-[4.5rem] shrink-0 font-medium sm:w-24">{row.label}</span>
              <span className="min-w-0 flex-1 text-muted-foreground">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
