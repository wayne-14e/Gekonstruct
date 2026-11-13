import Link from "next/link";
import { ArrowRight, BookOpenCheck, Bug, Check, Network } from "lucide-react";
import { AppHeader, HeaderLink } from "@/components/app/app-header";
import { SiteFooter } from "@/components/app/site-footer";
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
    meta: ["6–10 lessons", "quiz per lesson", "20 xp each"],
    tone: {
      tile: "border-[#1e5033] bg-[#0e2a1c] text-[#5be000]",
      chip: "border-[#1e5033] bg-[#0e2a1c] text-[#8ce85f]",
    },
  },
  {
    icon: Bug,
    name: "Debug & Learn",
    line: "Describe the bug. Learn the cause.",
    detail:
      "Geko points at the files that likely cause it, gives concrete fix steps, then teaches the concept underneath.",
    meta: ["2–3 causes", "evidence files", "30 xp"],
    tone: {
      tile: "border-[#584211] bg-[#2b1f06] text-[#ffc53d]",
      chip: "border-[#584211] bg-[#2b1f06] text-[#ffd57a]",
    },
  },
  {
    icon: Network,
    name: "Architecture Overview",
    line: "The map, before the lessons.",
    detail:
      "Layers, data flow and the concepts that hold it together — in plain English, built from your tree.",
    meta: ["3–7 layers", "data flow", "5–12 concepts"],
    tone: {
      tile: "border-[#155149] bg-[#0b2b2b] text-[#2dd4bf]",
      chip: "border-[#155149] bg-[#0b2b2b] text-[#7ce7d8]",
    },
  },
] as const;

const STEPS = [
  {
    title: "Connect a public repo",
    body: "Paste the GitHub URL. We read the tree and skip what teaches you nothing: node_modules, lockfiles, binaries, anything over 300 KB.",
  },
  {
    title: "Geko detects your stack",
    body: "Framework, database, auth, hosting — read from your manifests and folders. Deterministic, no LLM involved in this part.",
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

const PIPELINE = [
  { label: "ingest", value: "68 files · node_modules skipped" },
  { label: "stack", value: "next · react · firestore · tailwind" },
  { label: "architecture", value: "6 layers · 9 concepts" },
  { label: "lessons", value: "8 lessons · quizzes ready" },
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
          <div className="field-grid absolute inset-0 -z-20 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_78%)]" />
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(720px_420px_at_12%_-15%,rgba(91,224,0,0.16),transparent_70%),radial-gradient(600px_380px_at_92%_110%,rgba(45,212,191,0.10),transparent_70%)]"
            aria-hidden="true"
          />

          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <span className="label-mono !text-[#a9bccb]">The context wall ends here</span>
            </p>

            <h1 className="animate-rise mt-5 text-[clamp(2.35rem,8.2vw,5.4rem)] leading-[0.94] tracking-[-0.045em] [animation-delay:60ms]">
              <span className="block">You vibe-coded it.</span>
              <span className="relative mt-1 block w-fit">
                Now own it.
                <span
                  className="skin-gradient absolute inset-x-0 -bottom-1.5 h-2 rounded-full opacity-90"
                  aria-hidden="true"
                />
              </span>
            </h1>

            <div className="mt-10 grid grid-cols-1 gap-10 lg:mt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-14">
              <div>
                <p className="animate-rise max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground [animation-delay:120ms]">
                  Geko reads your public repo and explains it back through your own files: an
                  architecture map, a lesson series, and a debug guide. No patches, no magic —
                  just your code, taught to you.
                </p>

                <div className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:180ms]">
                  <Button asChild size="lg">
                    <Link href={user ? "/dashboard" : "/login"}>
                      {user ? "Open your dashboard" : "Start with Google"}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#pathways">See the three pathways</Link>
                  </Button>
                </div>

                <p className="animate-rise mt-6 font-mono text-xs leading-relaxed text-[#7a8a99] [animation-delay:240ms]">
                  public repos only · 3 projects per account · read-only, always
                </p>
              </div>

              <HeroTerminal />
            </div>
          </div>
        </section>

        {/* Pathways */}
        <section
          id="pathways"
          className="scroll-mt-20 border-b border-border/70 py-16 sm:py-20"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-mono">Pick your depth</p>
                <h2 className="mt-2 text-3xl tracking-[-0.035em] sm:text-4xl">
                  Three ways in.
                </h2>
                <p className="mt-2 max-w-lg text-muted-foreground">
                  Same repo, same voice. Pick the depth you need today.
                </p>
              </div>
              <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
                built from your files only
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {PATHWAYS.map((p) => (
                <article
                  key={p.name}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3a4b61] hover:shadow-[0_24px_44px_-32px_rgba(91,224,0,0.45)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-9 place-items-center rounded-lg border ${p.tone.tile}`}
                    >
                      <p.icon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold tracking-[-0.02em]">{p.name}</h3>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">{p.line}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {p.detail}
                  </p>
                  <ul className="mt-auto flex flex-wrap gap-1.5 border-t border-border/70 pt-4">
                    {p.meta.map((m) => (
                      <li
                        key={m}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[0.6875rem] ${p.tone.chip}`}
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
              <p className="label-mono">The run</p>
              <h2 className="mt-2 text-3xl tracking-[-0.035em] sm:text-4xl">
                How it works
              </h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Four steps. The first two take about a minute; the analysis runs in the
                background while you watch.
              </p>
              <div className="mt-6 rounded-xl border border-border bg-[#0e141b] p-4">
                <p className="label-mono">limits, stated up front</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {[
                    "Public GitHub repositories only",
                    "3 projects per account during validation",
                    "Explains and teaches — never auto-fixes",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[#3a4b61]"
                >
                  <span className="font-mono text-xs font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-base font-semibold tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-[#1e5033] bg-[#0c1a12] p-6 sm:p-8">
              <div
                className="absolute inset-0 -z-10 bg-[radial-gradient(560px_280px_at_8%_0%,rgba(91,224,0,0.18),transparent_70%)]"
                aria-hidden="true"
              />
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <GekoAvatar mood="calm" size="lg" />
                  <div>
                    <h2 className="text-2xl tracking-[-0.03em]">Ready when your repo is.</h2>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                      Bring a project that has grown past one file. That is where the
                      confusion lives — and where this helps most.
                    </p>
                  </div>
                </div>
                <Button asChild size="lg">
                  <Link href={user ? "/dashboard" : "/login"}>
                    {user ? "Go to dashboard" : "Connect a repo"}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function HeroTerminal() {
  return (
    <div className="animate-rise relative [animation-delay:150ms]">
      <div className="rounded-2xl border border-border bg-[#0c1219] shadow-[0_30px_70px_-45px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 border-b border-border bg-[#101821] px-3 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#2a3646]" />
            <span className="size-2.5 rounded-full bg-[#2a3646]" />
            <span className="size-2.5 rounded-full bg-[#2a3646]" />
          </span>
          <span className="ml-1 font-mono text-[0.6875rem] text-muted-foreground">
            geko — pipeline
          </span>
          <span className="path-chip ml-auto">you/your-app</span>
        </div>

        <div className="px-4 py-4 font-mono text-[0.75rem] leading-6 sm:text-[0.8125rem]">
          <p className="text-[#7a8a99]">
            <span className="text-primary">$</span> geko analyze github.com/you/your-app
          </p>
          <ul className="mt-2 space-y-1">
            {PIPELINE.map((row) => (
              <li key={row.label} className="flex items-start gap-2">
                <Check
                  className="mt-1 size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-[#a9bccb]">
                  <span className="text-foreground">{row.label}</span>
                  <span className="text-[#4d5b6b]"> · </span>
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[#7a8a99]">
            <span className="text-primary">→</span> guidebook ready
          </p>
        </div>

        <div className="flex items-start gap-3 border-t border-border bg-card px-4 py-4">
          <GekoAvatar mood="encouraging" size="sm" />
          <p className="text-sm leading-relaxed">
            <span className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
              geko
            </span>
            <span className="mt-1 block">
              “Your landing page renders from{" "}
              <span className="text-primary">src/app/page.tsx</span> — start there when a
              change goes wrong.” 🦎
            </span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[0.6875rem] tracking-[0.1em] text-[#5c6b7a] uppercase">
        sample output
      </p>
    </div>
  );
}
