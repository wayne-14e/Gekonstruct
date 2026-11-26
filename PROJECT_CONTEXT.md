# PROJECT_CONTEXT.md — living memory of Gekonstruct

> What EXISTS (code is proof). BLUEPRINT.md says what MUST exist. Every shipped slice
> updates this file in the same commit.

## North Star

Vibe-coders whose AI-built project has outgrown the "AI fixes everything" phase hit a
context wall: fixes break other files and they cannot debug code they never understood.
Gekonstruct reads their public GitHub repo and reverse-engineers it into a gamified
guidebook narrated by Geko the chameleon, through three pathways: **Foundations** (ordered
lessons), **Debug & Learn** (explain + teach a bug in their code), **Architecture Overview**
(plain-English map). Module 3 hypothesis: a grown-project vibe-coder connects a repo,
finishes ≥1 pathway, can explain a key part of their project afterwards, and returns for a
second pathway.

## Current State

**Auth & shell — done.** Signed-in users reach `/dashboard`; visitors are redirected to
`/login`. Google sign-in (client popup) → `signInAction` verifies the ID token, provisions
`users/{uid}`, sets an httpOnly `geko_session` cookie (14 days) and refreshes the route.
Landing page, `/login`, `/profile` (editable name, earned badges, share progress, reset and
sign-out actions), `/community` (signed-in Coming Soon teaser with no project listings),
`/projects` (two-column project cards with pathway progress), and `/dashboard` (personal greeting,
repo connection and the six latest activities), branded 404 + error boundary, sticky header with
account menu, XP chip, footer. The user-menu links "Community" and "My profile" open their pages.

**Ingestion — done (Phase 2).** The dashboard has a connect form (public GitHub URLs only)
and a recent-activity feed; `/projects` lists project cards with stage badges and pathway progress.
`createProject` enforces the 3-project cap inside a Firestore transaction and writes
`project_created`. `/api/pipeline/ingest` reads the GitHub
tree, drops node_modules/build output, lockfiles, `.env*`, binaries and blobs over 300 KB,
selects up to 60 files / 150k chars by blueprint priority, truncates files to 12k, detects
the stack deterministically and writes `snapshot/main` + stage `ingested`. Failures store
`failed:ingested` + `stageError`; the project page offers a retry.

LLM access is DeepSeek's OpenAI-compatible API: the `openai` SDK with
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-flash` (DeepSeek-V4.1-Flash) and
`DEEPSEEK_BASE_URL=https://api.deepseek.com`. Pipeline calls disable DeepSeek thinking mode
for a predictable, temperature-honouring JSON answer inside the 60s stage budget. BLUEPRINT
§3/§12 still name Anthropic; the 2026-11-13 DeepSeek decision below is authoritative and the
user has updated §4's diagram to DeepSeek.

**Architecture map — done (Phase 3).** `/api/pipeline/architecture` asks DeepSeek for JSON
from the stored snapshot + stack, validates it with zod and against real snapshot paths, then
writes `guidebook/main` with provenance (`model`, `promptVersion`). One repair retry is
allowed. `/projects/[id]/overview` is a four-section pager: project summary, interactive
React Flow skill map, request walkthrough, and concepts with GitHub-linked file chips. The
request walkthrough highlights the current step and saves each “Understood” action; the map
reader tracker reports the four areas visited.

**Foundations — done (Phase 4).** `/projects/[id]` runs ingest → architecture → lessons1
→ lessons2 (four idempotent steps) and reaches `ready`. `/api/pipeline/lessons1|lessons2`
build the pathway in two model calls from the stored snapshot + guidebook, validate every
codeRef, prose citation and quiz against real snapshot paths, then write
`projects/{pid}/lessons/{lid}` (`order`, `part`, 20 XP) and `stage_completed`. Part 1 keeps
3–5 lessons; part 2 adds 2–5 and sets `ready` + `lessonCount` (6–10 total). `/learn` lists
both parts with pass state, a progress bar, pathway XP and the +50 completion bonus;
`/learn/[lessonId]` renders real snapshot code with shiki, a constrained markdown explain,
the Geko tip and a client `Quiz` that receives only question text/options (never the answer
key). `completeLesson` re-grades on the server (≥70%), writes progress and
`quiz_passed|quiz_failed`, and adds XP in one Firestore transaction
(`users.totalXp` + `progress.xp`), never twice.

**Debug & Learn — done (Phase 5).** Pathway 2 is live at `/projects/[id]/debug` and
`/projects/[id]/debug/[sid]`. `/api/debug/run` takes `{ projectId, symptom }`, creates a
`pending` session document after an atomic per-project usage reservation, extracts keywords and matches the top-10 snapshot files using a
deterministic overlap function (path segments weighted +20/+10, bounded content frequency
counts), builds the `debug-v3` prompt over the matched code + guidebook summary + the map's
stored data flow, calls DeepSeek
with repair retry, audits every evidence file and backticked path against the snapshot, and writes
`projects/{pid}/debugSessions/{sid}` (`done`/`failed`) + `debug_created` event.
Free-plan users can start at most two debug sessions per project; a reservation counts as used
even when analysis later fails, since the model call may already incur cost.
`/projects/[id]/debug` provides the symptom input form with quick suggestion chips and session
history. `/projects/[id]/debug/[sid]` renders the reported symptom, the detective board, a
signal trace of how the data moves between components until it breaks, likely causes with
confidence badges and shiki `<CodeBlock>` evidence previews, concrete fix steps,
Geko tip bubble, and client `<DebugQuiz>`. `completeDebugSession` re-grades the quiz on
the server (≥70%), writes progress `debug[sid] = { completed: true, at }`, awards 30 XP on first
pass, grants the `"bug-whisperer"` badge on the first completed debug session (written to both
`progress.badges` and `users/{uid}.badges`), and records `debug_completed` inside a single
Firestore transaction. The project hub ReadyPanel renders all three pathways.

**M6 Polish — done (2026-11-20).** All three badges are awarded once and shown on the profile.
Firestore analytics now cover all eleven BLUEPRINT §13 events: map
sections report in as they are read (`overview_section_viewed`), lesson pages record
`lesson_viewed`, and opening a project hub ≥24h after `analysis_ready` writes `return_visit`
once. `foundation-builder` is awarded in the lesson transaction, `map-reader` in the overview
section transaction, and `bug-whisperer` on the first completed debug session. The shared
`Map / Learn / Debug` switcher appears on the hub and every pathway page. `PipelineRunner` now
shows per-step saved/next/failed states, a progress bar, elapsed seconds and a clear
session-expired redirect, keeping completed stages on a retry. `/projects/[id]` ships a loading
skeleton and a segment error boundary; debug explains that it unlocks after the map exists; the
debug quiz uses the same dot markers as Foundations. Firestore rules were deployed to
`gekonstruct-14174`. Vercel Analytics and Speed Insights are mounted in the root layout for
page-level traffic/Core Web Vitals telemetry; product analytics remain the Firestore event
documents described below.

Design system live (redesigned 2026-11-13): dark IDE surface (`#0b0f14`), Space Grotesk
for all UI + display with JetBrains Mono for labels, file paths and code (no serif/italic
anywhere), lime `#5be000` primary with chunky 3px-edge buttons, chameleon-skin gradient
reserved for the brand mark and XP moments,
`GekoMark`/`GekoBadge`/`GekoAvatar`/`SpeechBubble`.

Landing page is a signed-out-only surface: a centred hero (badge, display headline,
short subtitle, two CTAs, limits line) above a full-width sample-pipeline window with
mac-style red/yellow/green dots, followed by the pathways, how-it-works and closing CTA.
Signed-in visitors are redirected to `/dashboard`; signing out returns them to `/`.

Last verified: 2026-11-26 — `npx tsc --noEmit`, `npm run lint`, `npm test` (124/124), and `npm run build` green. `PipelineRunner` renders a connected signal-trace rail with circular dot nodes, immediate green state on finished stages, and live pulse/sweep animations. Underlying concept panel removed end-to-end from Debug & Learn pathway. Signal trace in Debug & Learn pathway renders hop text stably without scaling/bouncing animations. Architecture uses a four-section pager, React Flow skill map,
and a saved, step-by-step request walkthrough;
Foundations include a progressive Monaco split workspace; Debug includes
the detective board and the audited signal trace of how data moves between components. The header includes Profile and the account popup labels Community as
Coming soon. Projects include icon-only cascade deletion with confirmation. Profile sharing renders a branded PNG and uses native file sharing
where supported, with download/caption fallback; the two-session quota is enforced with Admin
SDK transactions. Its usage subcollection is unmatched by client Firestore rules, so no rules
redeploy is required.
`firebase deploy --only firestore:rules` previously released the owner-scoped rules to
`gekonstruct-14174`. All 3 pathways (Architecture Map, Foundations Lessons,
Debug & Learn) functional end-to-end with badges and the full §13 event set. Previously
verified 2026-11-19: Foundations live run on
`wayne-14e/Verdict` (6 stored lessons, quiz grading, 20 XP + 50 bonus); 2026-11-18: architecture
on `wayne-14e/Verdict` (6 layers, 7 flow steps, 11 concepts, ~41s); 2026-11-13: live ingestion of
`shadcn-ui/taxonomy`, `firebase/quickstart-js` and `vercel/next-learn`.

**M7 Validation — checklist and Telegram community footer ready (2026-11-20).**
`docs/TEST_PLAN.md` maps the five-tester procedure and the Module 3 success metrics to
stored analytics events. The footer exposes `@gekonstruct` and `@gekonstruct_chat`.
M7 verification is complete at the code level: `npm test` passes 107 tests across 15 files,
`npm run typecheck` is green, and `npm run build` produces the 20-route Next.js build.
Live five-tester recruitment and metric collection remain a real-world validation step; do
not replace missing tester results with synthetic events.

### Build plan — executing phase by phase

| Phase | Milestone | Scope | Exit criteria |
|---|---|---|---|
| 0 | Bootstrap | Scaffold, design tokens, brand components, Firebase wiring, env, this doc | `next build` green; landing shell renders |
| 1 | M1 Auth & shell ✅ | Client Firebase auth + Google sign-in, session cookie via server action, `users/{uid}` bootstrap, landing, `/login`, `/dashboard` empty state, app header | Sign in → `/dashboard` shows empty state; signed-out `/dashboard` redirects to `/login` |
| 2 | M2 Ingestion ✅ | `createProject` (3-project cap), `/api/pipeline/ingest`, GitHub tree+contents, ingest filters/budget (unit-tested), stack detection (unit-tested), `snapshot/main`, `/projects/[id]` runner, project cards with stage badges | 3 real public repos ingest; `node_modules` never in snapshot; >300 KB skipped; unrecognizable stack fails with message |
| 3 | M3 Architecture ✅ | `/api/pipeline/architecture`, prompts module, zod schemas, repair retry, `guidebook` doc, `/overview` page (summary, skill map, request flow, concepts, file chips) | guidebook passes zod on a real repo; overview renders real project structure |
| 4 | M4 Foundations ✅ | `/api/pipeline/lessons1` + `lessons2`, `/learn` list + lesson page, shiki code blocks, `Quiz`, `completeLesson`, XP transaction, progress state | pass quiz → XP in `users/{uid}`; fail → no XP, retry allowed |
| 5 | M5 Debug ✅ | `/api/debug/run`, symptom form + session list, session page (causes/fix steps/whyItWorks/quiz), `completeDebugSession` | real symptom → evidence files that exist in the snapshot |
| 6 | M6 Polish ✅ | Badges, analytics events, `PipelineRunner` retry UX, error/empty states everywhere, rules deployed, Geko polish | full journey with zero console errors |
| 7 | M7 Validation ✅ | vitest green, `next build` green, `docs/TEST_PLAN.md` mapping events → §1 metrics | 5-tester checklist ready |

## Architecture Map

```
[Browser]
  Google sign-in (firebase client SDK) → ID token
  POST server action signIn(idToken) → httpOnly session cookie (admin SDK)
  root layout mounts Vercel Analytics + Speed Insights (page-level telemetry only)
  createProject(repoUrl) server action → projects/{pid} (stage "created")
  POST /api/pipeline/ingest → snapshot + stack (stage "ingested")
  POST /api/pipeline/architecture → guidebook/main (stage "architecture")
  POST /api/pipeline/lessons1 → lessons part 1 (stage "lessons1")
  POST /api/pipeline/lessons2 → lessons part 2 (stage "ready" + lessonCount)
  router.refresh() after each stage → server component re-renders progress
  POST /api/debug/run(symptom) → transactional free-plan reservation + debugSessions/{sid} + debug_created event
  completeLesson(projectId, lessonId, answers) server action → progress + XP + foundation-builder transaction
  completeDebugSession(projectId, sid, answers) server action → progress + XP + bug-whisperer badge
  markOverviewSectionViewed(projectId, section) server action → overviewSections + map-reader transaction
  markRequestStepUnderstood(projectId, stepIndex) server action → understoodRequestSteps transaction
  updateDisplayName / clearUserProgress server actions → editable profile / owned-project recursive deletion
  user menu → /community (signed-in Coming Soon teaser; no marketplace listings)
  after() on lesson/hub render → lesson_viewed / return_visit (deterministic ids)
[Next.js server]
  server actions: signIn, signOut, createProject, completeLesson, completeDebugSession,
                 markOverviewSectionViewed, markRequestStepUnderstood,
                 updateDisplayName, clearUserProgress, roastProjectAction
  route handlers: pipeline stages (idempotent, ≤60s), debug (/api/debug/run)
  lib: firebase/client (browser), firebase/admin (server), github, projects, debug, llm,
       prompts, lessons, quiz, badges, analytics,
       domain/{project,architecture,lesson,progress,event,debug,repo-roast},
       pipeline/{ingest,stack,architecture,lessons,debug,debug-runner}
[Firestore]
  users/{uid}
  projects/{pid}
  projects/{pid}/{snapshot/main, repoRoast/main, events/{eid}, guidebook/main, lessons/{lid},
                 debugSessions/{sid}, progress/{uid}}
```

Routes as built: `/` (landing, signed-out only — a signed-in visitor is redirected to
`/dashboard`), `/login`, `/dashboard` (greeting + latest activity, guarded in
`src/app/(app)/layout.tsx`), `/profile`,
`/projects` (owned project list + pathway progress), `/projects/[id]` (pipeline runner + guidebook hub or snapshot panel),
`/projects/[id]/overview` (architecture pathway), `/projects/[id]/learn` (Foundations list),
`/projects/[id]/learn/[lessonId]` (lesson + quiz), `/projects/[id]/debug` (debug symptom form + session list),
`/projects/[id]/debug/[sid]` (debug session walkthrough + quiz), `/api/pipeline/ingest`,
`/api/pipeline/architecture`, `/api/pipeline/lessons1`, `/api/pipeline/lessons2`,
`/api/debug/run` (all POST), `not-found`, `error`, plus `projects/[id]/loading.tsx` and
`projects/[id]/error.tsx`.

Key modules as built: `src/lib/firebase/{config,client,admin}.ts`, `src/lib/auth/{session,users}.ts`,
`src/lib/domain/{user,project,architecture,lesson,progress,event,debug}.ts`,
`src/lib/pipeline/{ingest,stack,ingest-runner,architecture,architecture-runner,
lessons,lessons-runner,lessons-route,debug,debug-runner,runner-state}.ts`,
`src/lib/{github,projects,debug,activity,llm,prompts,lessons,quiz,badges,analytics,code-language}.ts`,
`src/lib/domain/activity.ts`,
`src/lib/nav.ts`, `src/app/actions/{auth,projects,lessons,debug,progress,profile}.ts`,
`src/components/{brand,auth,app,projects}/*` (incl. `badge-shelf.tsx`, `pathway-nav.tsx`,
`profile-actions.tsx`, `app-nav.tsx`, `project-progress-card.tsx`, `overview-tracker.tsx`,
`request-flow.tsx`, `recent-activity-feed.tsx`, `guidebook-parts.tsx`, `code-block.tsx`,
`lesson-markdown.tsx`, `quiz.tsx`, `debug-quiz.tsx`, `debug-symptom-form.tsx`,
`debug-detective.tsx`, `debug-data-path.tsx`,
`repo-roast.tsx`), `scripts/dev-session.mjs` (dev-only cookie minter).

Auth boundary: browser keeps the Firebase client session (for realtime Firestore reads);
the server trusts only the httpOnly cookie, verified with `adminAuth().verifySessionCookie`.
Route handlers and server actions call `getCurrentUser()`; pages of the `(app)` group call
`requireUser()`.

Client/server boundary: server components by default; `"use client"` only for the sign-in
button, account menu, route-aware app navigation, profile forms/confirmation dialog and
progress sharing, Repo Roast UI/sharing, connect form, pipeline runner, overview tracker,
request walkthrough, quizzes, the debug detective board and the debug signal trace.

## Data Model

As built through Phase 6 (all timestamps are epoch **milliseconds**, not Firestore Timestamp):

- `users/{uid}` — `{ email, displayName, photoURL|null, totalXp: 0, badges: [], createdAt, projectsCreatedCount: 0 }`.
  Written inside a transaction: created once on first sign-in, afterwards only `email` and
  `photoURL` refresh; `displayName` is user-editable and is preserved across later sign-ins.
  `totalXp` and `badges` are awarded inside lesson, debug and overview transactions and reset
  by the authenticated profile reset action. `projectsCreatedCount` is a lifetime counter
  incremented atomically inside the `createProject` transaction and **never decremented on
  deletion**, so the 3-project cap cannot be bypassed by deleting and re-adding projects.
  Existing users without the field parse as `0` (zod `.default(0)`).
  Profile reset clears `totalXp`, `badges`, and each project's `progress/{uid}` document
  (pathway progress, lesson/quiz records, overview sections, XP within progress). It **does not**
  delete projects, pipeline output, `debugSessions`, `debugUsage` quota, or `projectsCreatedCount`.
- `users/{uid}/debugUsage/{pid}` — `{ projectId, sessionsUsed, updatedAt }`. Admin-only
  per-project debug-session reservations; nested documents have no client Firestore rule.
  Atomic reservation prevents concurrent requests from exceeding the free-plan limit of two;
  failed analysis attempts count. Profile reset **preserves** these records so resetting progress
  cannot be used to generate unlimited debug sessions.
- `projects/{pid}` — `{ ownerUid, repoUrl, owner, repo, title, stage, stageError: string|null,
  stack: Stack|null, createdAt, updatedAt, lessonCount }`. Created by `createProject` inside a
  transaction that checks `users/{uid}.projectsCreatedCount` against the cap (3). Stage values: `created`,
  `ingested`, `architecture`, `lessons1`, `lessons2`, `ready`, `failed:{ingested|architecture|
  lessons1|lessons2}`. Only route handlers advance it. `lessons2` writes `ready` directly
  (BLUEPRINT §8), so the `lessons2` stage remains legal but is never persisted.
- `projects/{pid}/snapshot/main` — `{ files: [{ path, size, content }], fetchedAt, totalChars,
  truncated: string[] }`. **Deviation:** the blueprint writes `projects/{pid}/snapshot`; Firestore
  needs a document id, so singleton docs use `main` (same for `guidebook/main`).
- `projects/{pid}/repoRoast/main` — one successful roast per project. During generation it is
  `{ status: "pending", reservationToken, reservedAt }`; on success it becomes
  `{ status: "complete", quote, file, generatedAt, model, promptVersion }`. An atomic
  reservation prevents concurrent model calls; a failed call releases the reservation so the
  owner can retry, while a completed roast is returned on later requests and survives reloads.
- `projects/{pid}/events/{eid}` — `{ type, at, meta }`, one of the eleven BLUEPRINT §13 types:
  `project_created`, `stage_completed` (ingest, architecture, lessons1, lessons2),
  `analysis_ready`, `overview_section_viewed`, `lesson_viewed`, `quiz_passed`, `quiz_failed`,
  `pathway_completed` (foundations, architecture, debug), `debug_created`, `debug_completed`,
  `return_visit`. View events use deterministic ids (`overview_section_{section}`,
  `lesson_viewed_{lessonId}`, `return_visit`) so reloads and strict-mode remounts cannot
  double-count; everything else uses an auto id.
- `projects/{pid}/guidebook/main` — the architecture map, validated by `GuidebookDocSchema`:
  `{ summary: { whatItDoes, plainSummary, gekoIntro },
     architecture: { layers: [{ id, name, purpose, files[], plainExplanation }],
                     dataFlow: [{ from, to, whatHappens }], mermaid: string|null },
     concepts: [{ id, term, plainDefinition, files[], whyItMatters }],
     analyzedAt, model, promptVersion }`.
  **Deviation:** `model` and `promptVersion` are extra provenance fields (see Decisions Log).
  `files` always contain real snapshot paths; ids are slugs and unique per list.
- `projects/{pid}/lessons/{lid}` — `{ order, part: 1|2, id, title, goal, explain, codeRefs:
  [{ file, note }], gekoTip, xp: 20, quiz: [{ question, options[], correctIndex, why }] }`,
  validated by `LessonDocSchema`. `explain` is constrained markdown; every `codeRefs.file`,
  every backticked prose path and every quiz file option is checked against the snapshot.
  Ids are slugs, unique across both parts; `part 2` order continues after part 1.
- `projects/{pid}/progress/{uid}` — `{ lessons: Record<lessonId, {passed, score, at}>,
  debug: Record<sid, {completed, at}>, badges: string[], xp: number,
  pathwayBonusAwarded: boolean, overviewSections: string[],
  understoodRequestSteps: number[] }`. **Deviations:**
  `pathwayBonusAwarded` is extra so the +50 completion bonus is paid exactly once across
  retakes; `overviewSections` is extra so each map section is recorded once and `map-reader`
  can be awarded from stored state; `understoodRequestSteps` persists the learner's completed
  request walkthrough steps. `overviewSections` contains the four keys (`summary`, `skillmap`,
  `flow`, `concepts`); legacy `layers` entries are normalized to `skillmap`.
  `understoodRequestSteps` contains zero-based indexes into the guidebook's `architecture.dataFlow`.
- `projects/{pid}/debugSessions/{sid}` — `{ id, projectId, symptom, status: 'pending'|'done'|'failed',
  error: string|null, likelyCauses: [{ cause, evidenceFiles[], confidence: 'high'|'medium'|'low' }],
  fixSteps: string[], dataPath: { entry, steps: [{ from, to, file, whatHappens }], breaksAt },
  quiz: [{ question, options[], correctIndex, why }],
  gekoTip: string, xp: 30, createdAt, analyzedAt, model, promptVersion }`, validated by
  `DebugSessionDocSchema`. Created as `pending` on `/api/debug/run`, updated to `done` or `failed`.
  `evidenceFiles` and every `dataPath.steps[].file` always contain real snapshot paths.
  `dataPath` and legacy `whyItWorks` are optional on the stored doc so sessions created before
  `debug-v3` or `debug-v4` still render; new sessions carry 3–6 audited hops across at least two distinct files.

## Env & Secrets

Names only; values live in `.env.local` (gitignored) and the host dashboard.

| Name | Where used |
|---|---|
| `NEXT_PUBLIC_APP_URL` | metadata base, auth redirect sanity |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | browser Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | server only — firebase-admin credential, one-line JSON |
| `DEEPSEEK_API_KEY` | server only — `src/lib/llm.ts` (architecture, lessons, debug, and Repo Roast), sent to `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | optional model override, default `deepseek-flash` (DeepSeek-V4.1-Flash) |
| `DEEPSEEK_BASE_URL` | optional endpoint override, default `https://api.deepseek.com` |
| `GITHUB_TOKEN` | optional, raises GitHub anonymous limit 60 req/h (used by `src/lib/github.ts`) |

Local secret file `.secrets/firebase-service-account.json` is gitignored; `.env.local` holds
the same JSON on one line for the app.

## Prompts

Prompts live in `src/lib/prompts.ts` only. Version constant + last change:

| Version | Stage | Last changed | Notes |
|---|---|---|---|
| `architecture-v2` | architecture | 2026-11-20 | Architecture map copy now prefers one idea per sentence and scannable UI-ready mission, clue, evidence and trace language while retaining the real-path and JSON constraints. |
| `lessons-v2` | lessons1 / lessons2 | 2026-11-20 | Foundations copy now prefers short, scannable, mission-ready explanations and keeps the existing 250–500-word and real-codeRef constraints. |
| `debug-v4` | debug | 2026-11-24 | Removes whyItWorks (Underlying concept) from debug generation to streamline output, avoid unnecessary token usage, and focus on real evidence, audited data path and actionable fix steps. |
| `roast-v2` | repo roast | 2026-11-26 | Grounds Repo Roast in pre-computed VERIFIED FACTS from the snapshot, requires observable evidence in the snippet, removes README/code mismatch hints, and forbids missing-file claims. |

Every prompt change = version bump + this table + a Decisions Log entry.

## Decisions Log

Append-only. Newest last.

- **2026-11-20 — Add on-demand Repo Roast to project hubs.**
  Repo Roast uses the stored snapshot and DeepSeek, validates exactly one sentence plus one
  real file reference, and remains owner-only. Sharing creates a roast-branded PNG and uses
  native sharing/text clipboard fallbacks like profile sharing. Rejected: making the roast a
  public repo mutation and retaining the project-hub badges block (badges remain available on
  the profile).
- **2026-11-20 — Limit Repo Roast to one successful generation per project.**
  Persist the verified roast in `repoRoast/main`; a Firestore transaction reserves generation
  so simultaneous requests cannot spend multiple model calls. Later requests reuse the stored
  roast, and failed model calls release their reservation to permit retry. Both social-image
  types now use one shared card frame and the app's loaded Space Grotesk/JetBrains Mono fonts.
  Rejected: keeping roasts only in client state (refresh would lose the result and bypass the
  intended limit) and using system fonts (they did not match the product UI).
- **2026-11-20 — Add Telegram community links to the shared footer.**
  Gekonstruct's public Telegram channel is `@gekonstruct` and the vibe-coder feedback chat is
  `@gekonstruct_chat`. The footer links both so visitors can follow updates and shape the
  product. Rejected: linking only the channel (it gives too little direct feedback surface) or
  introducing an external community widget/dependency (not needed for the MVP).
- **2026-11-13 — Next 16 instead of 15.** BLUEPRINT §3 says "Next.js 15+"; installed
  16.4.6 (current stable) with React 19.3 and Tailwind 4.3. Rejected: pinning 15.x — no
  reason to start on an older major when App Router APIs used here are unchanged.
- **2026-11-13 — shadcn/ui via `radix` base + `nova` preset.** User asked for ready shadcn
  components. Chose the Radix-based components (most battle-tested) over the newer Base UI /
  React Aria bases. Rejected: hand-rolled primitives (slower), Base UI (less familiar).
- **2026-11-13 — Session cookie instead of per-request ID tokens.** Google sign-in happens in
  the browser; the ID token is exchanged once (server action) for an httpOnly session cookie
  verified with the admin SDK. This satisfies BLUEPRINT §8 "ID token verified server-side"
  while letting server components render user data without a client round-trip. Rejected:
  passing ID tokens on every request from the client (every page becomes a client island).
- **2026-11-13 — One light theme, no toggle.** Per BLUEPRINT §2. Tokens are CSS variables, so
  a dark theme later is a single `.dark` block, not a rewrite.
- **2026-11-13 — Design direction: "field guide to your own codebase".** Bone paper surface
  (`#f7f5ef`), deep-forest ink (`#101a15`), canopy-green primary (`#12694a`, 6.1:1 on paper),
  Fraunces display + Geist body + JetBrains Mono for file paths. Chameleon-skin gradient
  (`#2fb27a → #b9e769 → #f0c766`) is reserved for the brand mark and pipeline/XP moments, so
  boldness is spent in exactly one place. File-path chips are the recurring signature.
  Rejected: dark "developer tool" theme (this is a teaching product, long-form reading
  matters), cream+serif+terracotta (default template look).
- **2026-11-13 — Motion without a motion library.** Landing and micro-interactions are CSS
  transitions + keyframes with `prefers-reduced-motion` guards. Rejected: adding Framer
  Motion / Lenis now — no dependency for animation until a real need appears.
- **2026-11-13 — Placeholder Geko mark.** Hand-drawn chameleon line-art SVG
  (`src/components/brand/geko-mark.tsx` + `src/app/icon.svg`) as the user requested; all
  usages go through `GekoMark`/`GekoBadge` so the real mark is a one-file swap.
- **2026-11-13 — Admin credential = JSON key for the existing `firebase-adminsdk` service
  account**, generated via IAM API and kept out of git. Rejected: Application Default
  Credentials (no gcloud locally, and hosting env must work the same way).
- **2026-11-13 — Build plan lives in this file** (Current State → "Build plan") rather than a
  separate doc, because the user asked for the phased plan to be recorded here.

- **2026-11-13 — Next.js 16 cacheComponents / partialPrefetching disabled.** Every route is
  personalised and the pipeline is realtime, so PPR would add Suspense plumbing with no
  upside; `partialPrefetching` cannot run without `cacheComponents`. Rejected: enabling both
  and wrapping every auth read in Suspense.
- **2026-11-13 — `server-only` dependency added (0.0.1).** Guarantees admin SDK / secrets can
  never accidentally land in a client bundle. Alternative rejected: eslint import rules
  (weaker, easier to bypass).
- **2026-11-13 — Timestamps stored as epoch millis.** Simpler than Firestore `Timestamp` in
  rules, server actions and client rendering; matches BLUEPRINT §7 `at: number` for events.
- **2026-11-13 — shadcn primitive sizing overrides.** Nova sizes were 32px inputs / 36px
  buttons, too small for a reading app on touch. Inputs are now 44px, `lg` buttons 44px,
  default buttons 36px, `icon` buttons 36px. Primary hover moved from `primary/80` (white text
  dropped to ~3.6:1) to `#0f5f43` (7.0:1). Alternative rejected: styling each call site.
- **2026-11-13 — `scripts/dev-session.mjs` for local QA.** Mints a custom token → ID token →
  session cookie so authenticated pages can be screenshotted and clicked without a Google
  popup. It reads `.secrets/` and is never imported by app code. Alternative rejected: adding
  an e2e framework (AGENTS §6 says no e2e in the MVP).
- **2026-11-13 — DESIGN REVERSAL: dark "JetBrains × Duolingo" replaces the field-guide
  theme.** User explicitly asked for a darker developer-tool vibe, no serif or italic type,
  Space Grotesk, "JetBrains × Duolingo". This supersedes the earlier "field guide" entry
  (kept above for history). Tokens: bg `#0b0f14`, card `#121821`, elevated `#1a2230`, border
  `#253041`, ink `#e8f0f6` (16.7:1), muted `#94a3b3` (6.9:1), primary `#5be000` with ink
  `#08140a` (10.9:1) and edge `#3c9c00`, amber `#ffc53d`, teal `#2dd4bf`, violet `#a78bfa`,
  danger `#ff7a70`. Type: Space Grotesk (UI + display) + JetBrains Mono (labels, paths,
  code); Fraunces and Geist removed. Buttons carry a 3px bottom edge that compresses on
  press (Duolingo half); terminal chrome, file-path chips and mono eyebrows carry the IDE
  half. Rejected: keeping the light paper theme (contradicts the user's direction); a pure
  IDE clone (no learning warmth); serif display accents (explicitly excluded).
- **2026-11-13 — `next-themes` removed; the app is dark-only.** `<html>` sets
  `color-scheme: dark`, the viewport theme colour is `#0b0f14`, and the Toaster is pinned to
  `theme="dark"`. BLUEPRINT §2 still calls for one theme — only the chosen theme changed.
  Rejected: keeping `next-themes` with `forcedTheme` (a dependency doing nothing).
- **2026-11-13 — Singleton docs get the id `main`.** Firestore paths alternate
  collection/document, so the blueprint's `projects/{pid}/snapshot` needs a document id.
  Snapshot lives at `projects/{pid}/snapshot/main`; `guidebook` will use `guidebook/main`.
  Rejected: storing the snapshot on the project doc (300 KB payloads would ride along on
  every dashboard read and the project list would get heavy).
- **2026-11-13 — GitHub raw URLs for file contents, tree API for the listing.** One
  authenticated tree call per ingest (BLUEPRINT §5) plus
  `raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}` for up to 60 files. Raw does not
  consume the 60 req/h API quota. Rejected: 60 contents-API calls per ingest (anonymous
  users would exhaust the limit on the first repo).
- **2026-11-13 — Pipeline progress via `router.refresh()` until the multi-stage runner.**
  Phase 2 has exactly one HTTP step, so the runner POSTs ingest and refreshes the server
  component. This also works for cookie-only QA sessions that have no client Firebase user.
  Revisit in Phase 3, when four stages stream progress and `onSnapshot(project)` earns its
  keep. Rejected: adding a client listener now for a single step.
- **2026-11-13 — The landing page is signed-out only.** `/` calls `getCurrentUser()` and
  redirects a signed-in visitor to `/dashboard`; `/login` already did the same. This makes
  the product one workspace once you are inside, and keeps `/` as the pre-auth pitch.
  Rejected: rendering the landing page with "Open dashboard" CTAs (two competing homes,
  and the nav reads as marketing while signed in).
- **2026-11-13 — Repository URLs must be roots.** `parseRepoUrl` accepts
  `https://github.com/owner/repo` (protocol optional, trailing `.git`/slash allowed) and
  rejects tree/file URLs with a message asking for the root. Rejected: guessing a branch
  from a `/tree/...` URL (silently teaches the wrong branch).
- **2026-11-13 — LLM provider is DeepSeek, not Anthropic.** The user supplies a DeepSeek API
  key and wants DeepSeek-V4.1-Flash. DeepSeek exposes an OpenAI-compatible API, so the
  unused `@anthropic-ai/sdk` dependency was replaced with `openai`, and env names moved to
  `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL`. The model API id is
  `deepseek-flash` (display name “DeepSeek-V4.1-Flash”), not `deepseek-v4.1-flash`.
  `BLUEPRINT.md` still names Anthropic on purpose — the user asked not to edit it — so this
  entry is the authoritative record of the deviation. No pipeline code calls the model yet
  (Phase 3). Rejected: keeping the Anthropic SDK pointed at a DeepSeek gateway (an extra
  moving part with no benefit); a hand-rolled `fetch` client (DeepSeek documents the
  official OpenAI SDK for Node and we get retries/timeouts for free).
- **2026-11-16 — `jose` pinned to `^4.15.9` via npm overrides and `engines.node` pinned to `22.x`.**
  On Vercel (or any serverless environment where Node executes CommonJS or runs < 20.19.0),
  `firebase-admin/auth` failed to load with `Error [ERR_REQUIRE_ESM]: require() of ES Module .../jose/dist/webapi/index.js from .../jwks-rsa/src/utils.js not supported`.
  `firebase-admin@14.5.1` pulls `jwks-rsa@4.1.0`, which bumped its `jose` dependency to `^6.1.3` (pure ESM).
  Because Next.js marks `firebase-admin` as an external package (`serverExternalPackages`), Turbopack's SSR
  runtime delegates to Node.js `require('firebase-admin/auth')`, which executes `jwks-rsa`'s synchronous
  `const jose = require('jose')`. Adding `"overrides": { "jose": "^4.15.9" }` forces `jwks-rsa` to load `jose` v4,
  which provides the exact CJS entrypoints (`importJWK`, `exportSPKI`, `decodeJwt`, `decodeProtectedHeader`)
  without `ERR_REQUIRE_ESM`. `engines.node` is pinned to `"22.x"` (rather than `">=22.0.0"`) to comply with
  Vercel's convention preventing unintended auto-upgrades when new major Node versions release.
  Alternatives rejected: downgrading `firebase-admin` to v12 (loses current SDK fixes), waiting for upstream
  `jwks-rsa` async redesign.
- **2026-11-16 — `allowScripts` in `package.json` and `.npmrc` loglevel configured.**
  Modern npm (v11+) warns about unreviewed install/lifecycle scripts (`@firebase/util` and `protobufjs`) and
  unknown injected environment variables (`npm_config_cache_dir` from Vercel's build runner). Added
  `allowScripts` in `package.json` to explicitly approve `@firebase/util@1.15.3` and `protobufjs@7.6.6`, and
  added `.npmrc` with `loglevel=error` to suppress advisory warnings from Vercel-injected environment flags.
- **2026-11-18 — DeepSeek thinking mode is disabled for pipeline calls.** `deepseek-flash`
  enables thinking by default (64K output budget); reasoning tokens run before the JSON and
  made one architecture attempt ~20s with unpredictable truncation at an 8K cap. Pipeline
  calls now send `thinking: { type: "disabled" }` with `max_tokens: 8192`, which honours
  BLUEPRINT §6's `temperature 0.2` and keeps a stage inside its 60s budget. Rejected: leaving
  thinking on with a 32–64K cap (2× latency for a structured extraction task, and the
  temperature setting would be ignored).
- **2026-11-18 — Real-file check: strict on file chips, strict on invented prose paths,
  soft on missing citations.** Every `files` entry must be a snapshot path; any backticked
  path-like token in prose that does not exist is a hard validation error (one repair). A
  layer/concept whose prose never cites a path is accepted with a `softWarning`, because it
  still ships validated file chips. Rejected: hard-failing every item without a prose
  citation — the model missed it often enough that otherwise-good maps failed twice, while
  the chips already guarantee the UI points at real files.
- **2026-11-18 — `guidebook/main` carries `model` and `promptVersion`.** BLUEPRINT §7 says
  `{ ...ArchitectureSchema, analyzedAt }`; the extra fields make it possible to tell which
  model/prompt produced a stored map without reading server logs. Rejected: a separate
  provenance collection (more reads for a field pair nobody queries).
- **2026-11-18 — Overview uses native `<details>` instead of the Radix accordion.** The whole
  architecture page stays a server component with zero client JS, and native disclosure is
  keyboard/screen-reader complete. Rejected: importing `components/ui/accordion` (client
  island) for a read-only reveal.
- **2026-11-18 — Mermaid is stored and shown as source, not rendered.** The model may return a
  `flowchart LR` string; the overview renders it inside a collapsed `<pre>`. No `mermaid`
  dependency was added in M3 because the layer and data-flow sections already carry the
  explanation and Mermaid is optional polish (BLUEPRINT §9). Rejected: adding Mermaid now
  (large client bundle, new dependency, no validation benefit).
- **2026-11-18 — Architecture prompt budget is 150,000 chars of file contents.** The ingest
  snapshot is already capped at 60 files / 150k chars, so in practice every kept file is sent.
  If a snapshot is larger, files are included in stored order until the cap and the prompt
  names the omissions so the model cannot pretend it read them.
- **2026-11-19 — The Foundations pathway is written in two model calls, not one.** Part 1 asks
  for 3–5 opening lessons; part 2 receives the stored part-1 ids/titles/goals and asks for the
  remainder (2–5) so the pathway lands at 6–10 and ends with “how to debug here”
  (BLUEPRINT §8). Shared code normalizes both parts. Rejected: one call for all 6–10 lessons
  (larger JSON output risks truncation and there is no way to resume after a part fails).
- **2026-11-19 — Lessons validate file references harder than the architecture map.** Every
  `codeRefs.file`, every backticked path in `explain`/`gekoTip`, and every file-shaped quiz
  option must exist in the snapshot; `explain` must cite at least two distinct real paths, and
  quiz options must be distinct with an in-range `correctIndex`. One repair retry, then the
  part fails. Rejected: silently dropping invented refs (a lesson that points at a file that
  does not exist teaches the wrong mental model, and the quiz would not be answerable from the
  lesson).
- **2026-11-19 — Lesson XP is 20 plus a 50 pathway bonus paid once.** `completeLesson` writes
  `users.totalXp` and `progress.xp` in one transaction, only on a first pass; a failed attempt
  never removes an earlier pass. The bonus is tracked by `progress.pathwayBonusAwarded`
  (documented Data Model deviation) so retakes and re-passes can never pay it twice.
  Rejected: deriving “bonus paid” from lesson pass counts (a progress reset or a trimmed
  pathway would reopen the payout).
- **2026-11-19 — `lessons2` writes `stage: "ready"` directly.** BLUEPRINT §8 says lessons2 is
  the final pipeline step, so the stored stage skips `lessons2`; the value remains in the
  project schema so a resumed/repairing project can still be recognised. Rejected: persisting
  `lessons2` then flipping to `ready` (an extra write nothing can observe).
- **2026-11-19 — Lesson `explain` markdown is rendered by a local subset renderer.** The prompt
  restricts the model to headings, paragraphs, ordered/unordered lists, `**bold**` and
  `` `inline code` ``, so `LessonMarkdown` parses exactly that and never injects HTML.
  Rejected: adding `react-markdown`/`remark-gfm` (a new dependency plus an unbounded HTML
  surface for a field we already constrain).
- **2026-11-19 — `requestStructured` accepts an `invalidOutputMessage`.** The shared retry
  loop used to say the model returned an invalid “map”; the lessons stage now supplies its own
  wording. Rejected: duplicating the retry/JSON/validation loop in the lesson runner.
- **2026-11-19 — Pure keyword overlap matching for top-10 debug files.** BLUEPRINT §6 requires
  top-10 files matched by keyword overlap between symptom and file paths/contents as a pure function.
  Heuristic tokenizes the symptom, strips common English stop words, weights path segment/basename
  matches heavily (+20/+10), and bounds content term frequencies (max +10 per keyword). If fewer than
  10 files match, it supplements up to 10 files using the snapshot's priority-ordered files so the
  model always receives core architecture context. Rejected: full-text search engine / vector embedding
  (out of scope for MVP).
- **2026-11-19 — Debug pathway awards 30 XP and "bug-whisperer" badge inside a transaction.**
  `completeDebugSession` validates quiz answers on the server (≥70% pass). On first completion, awards
  30 XP to `users.totalXp` and `progress.xp`. If the user does not yet possess the `"bug-whisperer"`
  badge (BLUEPRINT §7), it awards it to both `progress.badges` and `users/{uid}.badges` in the same
  transaction and logs `debug_completed`. Retakes preserve earlier XP and completion status.
- **2026-11-19 — Evidence files render expandable `<CodeBlock>` previews.** For each evidence file
  cited in `likelyCauses`, the session view resolves the content from `snapshot.files` and renders an
  interactive, syntax-highlighted shiki `<CodeBlock>` with "Open on GitHub" links, letting the user
  view real code directly on the session page.
- **2026-11-19 — Separation of pure debug logic (`debug.ts`) and runner (`debug-runner.ts`).**
  Follows the design of `architecture.ts`/`architecture-runner.ts` and `lessons.ts`/`lessons-runner.ts`.
  Keeps `src/lib/pipeline/debug.ts` pure and unit-testable without pulling `server-only` into client or
  test bundles.
- **2026-11-20 — Badge rules live in `src/lib/badges.ts` and never re-award.** The module owns
  the three ids, display names, descriptions and the pure `shouldAwardBadge` check.
  `foundation-builder` is awarded when every stored lesson is passed, `map-reader` when all four
  overview sections are recorded, and `bug-whisperer` on the first completed debug session.
  Every award is guarded by both `progress.badges` and `users/{uid}.badges`, so retakes, reloads
  and a second project cannot duplicate it. Rejected: duplicating badge strings in each action
  (three copies drift, and the shelf cannot validate ids).
- **2026-11-20 — Map reading is tracked with an IntersectionObserver island + server action.**
  The overview page stays a server component; `OverviewTracker` observes
  `[data-overview-section]`, reports each section once at ≥30% visibility, and
  `markOverviewSectionViewed` owns the progress write, `overview_section_viewed` event and
  `map-reader` award in one transaction. Rejected: converting the whole overview to a client
  page or making the native `<details>` layers a client accordion — both would ship model prose
  through a client boundary for no reading benefit.
- **2026-11-20 — Analytics stay in Firestore and view events use deterministic ids.**
  `lesson_viewed_{lessonId}`, `overview_section_{section}` and `return_visit` are created with
  `doc(id).create()` so repeated renders and React strict-mode remounts are idempotent; events
  written during render use `after()` so they never block the response. `return_visit` is only
  written when a stored `analysis_ready` event is at least 24h old. Rejected: a third-party
  product-analytics SDK — BLUEPRINT §13 treats the event documents as the measurement source,
  and keeping them in Firestore avoids a second identity/consent surface. (`@vercel/analytics`
  and `@vercel/speed-insights` are present in `package.json` from concurrent user changes but
  are not imported anywhere and are not used for these events.)
- **2026-11-20 — Pathway navigation is a server component with an explicit `active` prop.**
  `PathwayNav` renders the same `Map / Learn / Debug` links on the hub and every pathway page.
  Rejected: `usePathname` in a client island — every page already knows which pathway it is,
  and a server prop keeps the shell static and avoids hydration work.
- **2026-11-20 — The side-by-side IDE / connection-graph redesign is Backlog, not M6.**
  The user's notes ask for Foundations and Debug to become less wordy with an IDE split view
  and visual graphs. That changes the lesson/debug page architecture and prompt shape, so M6
  shipped only the requested quiz-marker fix (letters → dots) and the requested polish items.
  Rejected: a partial reskin now — it would create two lesson layouts within one milestone's scope.
- **2026-11-20 — Vercel Analytics and Speed Insights are mounted in the root layout.**
  `@vercel/analytics/next` and `@vercel/speed-insights/next` now render from `src/app/layout.tsx`
  for page-level traffic and Core Web Vitals telemetry on Vercel. This supersedes the earlier
  note that the two packages were unused. They are deliberately separate from BLUEPRINT §13
  product events: Firestore `events/*` remains the source for lesson/map/debug milestones, while
  Vercel covers page views and performance. No env vars or secrets are required; Vercel injects
  the endpoints at deploy time. Rejected: sending product events through Vercel custom events —
  they would no longer be queryable per project/owner from Firestore in M7.
- **2026-11-20 — The profile page owns editable identity and full progress reset.** `/profile`
  shows the editable display name, earned badge shelf and pathway progress for each owned
  project. Reset recursively deletes only projects matching the verified user's `ownerUid`,
  including nested snapshots, lessons, sessions, events and progress, then clears user XP and
  badges while preserving the sign-in account and display name. Confirmation requires typing
  `DELETE`. This profile surface was added at the user's request; BLUEPRINT §9 only specifies
  the dashboard. Rejected: deleting the Firebase Auth account (the user asked to erase learning
  data, not identity) and deleting project roots only (Firestore subcollections would remain).
- **2026-11-20 — Project progress lives on `/projects`, not in the profile.** A new signed-in
  projects page combines dashboard-style repository cards with per-pathway progress in a
  two-column desktop grid. The profile is reserved for identity, badges and account actions.
  Rejected: keeping project progress on both pages (duplicate destinations make the account
  and workspace responsibilities unclear).
- **2026-11-20 — Dashboard shows a personalized greeting and recent recorded activity.** The
  project cards moved to `/projects`; `/dashboard` keeps repository connection and derives a
  compact activity timeline from validated per-project analytics events. XP and badge copy
  comes from each event's recorded reward metadata. Rejected: mock activity or a second activity
  collection (the existing event stream is the source of truth).
- **2026-11-20 — Free plan debug allowance is two sessions per project.** The server reserves
  usage and creates the pending session in one Firestore transaction, serializing concurrent
  requests. Attempts count when reserved, including later failures, because analysis may incur
  model cost. The usage record lives in `users/{uid}/debugUsage/{pid}`, outside the client-writable
  project tree; the current Firestore rules do not match nested user subcollections. Existing
  session documents seed the counter on first use, and profile reset removes reservations.
  Every account is treated as free until paid-plan entitlements exist.
  Rejected: counting only successful `debug_created` events (failed calls would bypass the cap)
  and a client-writable project field (clients could reset it).
- **2026-11-20 — Profile progress sharing is a direct, user-triggered share.** The profile
  renders a branded PNG from the user's current display name, XP and earned badge names; the
  browser's native share sheet sends the image with a caption and `https://gekonstruct.dev`
  invite where file sharing is supported. Otherwise the image downloads and the caption is
  shared or copied. No public profile route or persistent public data is created.
  This is a narrow exception to BLUEPRINT's out-of-scope social features, explicitly requested
  by the user. Rejected: a social feed, public profile directory, or leaderboard.
- **2026-11-20 — `/community` is a Coming Soon teaser, not a marketplace launch.** It explains
  the requested creator-project remix concept, limited to Architecture Map and Foundations;
  learners will build in their own workspace without contributing to the creator's GitHub repo.
  The page lists no projects and adds no submission, remix, waitlist or marketplace behavior.
  This is an explicit exception to BLUEPRINT's out-of-scope social features. Rejected: mock
  listings that could imply the marketplace is already open.
- **2026-11-20 — All learning styles become first-class pathways.** The Architecture Map uses
  React Flow, snap-scrolling sections and a trace mode; Foundations use a progressive Monaco
  split workspace; Debug uses a suspect-and-
  evidence detective board. Existing lesson content, Firestore progress and server-side quiz
  grading remain unchanged. Rejected: hiding any mode behind a paid flag or replacing real
  repository evidence with synthetic tutorial code.
- **2026-11-20 — Added visual-interaction dependencies.** Added `@xyflow/react`
  and `@monaco-editor/react`.
  React Flow owns the interactive architecture graph; Monaco provides the progressive guided
  code workspace. Rejected: Gource, CodeCharta and GitDiagram as brittle or restyled
  third-party products.
- **2026-11-20 — The Architecture Map is a four-section guided pager.** The standalone Layers
  and Trace views and raw Mermaid source were removed; the interactive skill map, request
  walkthrough, summary and concepts remain. Each “Understood” click saves a zero-based request
  step in `progress/{uid}.understoodRequestSteps` inside a Firestore transaction; the server
  enforces sequential completion, and the learner resumes at the first uncompleted step. The
  section observer watches pager slides as they mount, preserving map-read progress for all four
  areas. This user-directed UI change intentionally deviates from BLUEPRINT §9's layer accordion,
  flow list and optional Mermaid UI; the stored guidebook schema remains unchanged. Rejected:
  saving only the current step (would lose completed progress on reload) and exposing raw Mermaid
  (not useful to the guided map flow).
- **2026-11-21 — Debug sessions carry an audited data path between components.**
  A first real tester asked whether Debug shows how data moves between components, not just
  which files are involved. Every `debug-v3` session now returns
  `dataPath { entry, steps[], breaksAt }`: 3–6 hops, each naming a real snapshot file, crossing
  at least two distinct files. The debug prompt also receives the stored
  `architecture.dataFlow`, so the trace cannot silently contradict the map. The normalizer
  audits every hop file and every backticked path (one repair retry, then the stage fails), and
  the stored field is optional so sessions created before `debug-v3` still render.
  Rejected: reusing the generic architecture data flow as-is (it is repo-wide, not tied to the
  symptom), and rendering the trace as another prose section (the learner needs a scannable
  path, not a fourth wall of text).
- **2026-11-24 — Remove Underlying Concept (whyItWorks) from Debug & Learn end-to-end.**
  User explicitly requested removing the Underlying Concept section altogether from Debug & Learn.
  To eliminate unnecessary token generation costs and latency, `whyItWorks` was removed end-to-end:
  the UI section was removed from `/projects/[id]/debug/[sid]`, the Geko bubble copy on `/projects/[id]/debug`
  was updated, `DEBUG_PROMPT_VERSION` was bumped to `debug-v4` without `whyItWorks`, the pipeline audit
  step was removed, and `DebugModelSchema`/`DebugSessionContentSchema` dropped `whyItWorks`. For backward
  compatibility with older Firestore sessions, `DebugSessionDocSchema.whyItWorks` remains optional.
  Rejected: UI-only hiding (would continue to spend model tokens and latency on unused prose and risk
  audit retries on hallucinated concept paths).

- **2026-11-26 — 3-project cap counts lifetime connections, not active projects.**
  Users connect repositories; the cap now tracks the total ever connected, so deleting a project
  does not free a slot. `users/{uid}.projectsCreatedCount` is a never-decremented counter
  incremented atomically inside the `createProject` transaction (the old query-based `owned.size`
  check is replaced by reading this counter). `profile reset` intentionally does NOT reset this
  counter — only the learning data (XP, badges, project docs) is cleared.
  Rejected: keeping the query-based count (delete+reconnect bypass), or storing the counter on
  the project collection (would still require counting active docs instead of a single field read).
- **2026-11-26 — Ground Repo Roast in pre-computed structural facts and ban missing-file claims (`roast-v2`).**
  Ingestion intentionally excludes `.env*` (including `.env.template`), lockfiles, binaries, and files beyond the 60-file / 150k-char cap, so `README.md` mentioning `.env.template` caused the model to hallucinate a "README/code mismatch" claim that the file was missing from the repo. `computeRoastFacts` now computes deterministic structural facts (`todoFiles`, `duplicateNames`, `largeFiles`, `depCount`, `authFiles`) injected as `VERIFIED FACTS`, `buildRoastUserPrompt` removes the `README/code mismatch` target hint, and both system/user prompts require observations literally visible in the snapshot while forbidding claims that any file is missing. The strict one-roast-per-project cap is preserved without adding a user-facing retry option.
  Rejected: removing the one-roast-per-project cap or adding retry buttons (user requested preserving the strict cap); changing `.env*` exclusion in `ingest.ts` alone (still leaves truncated/capped files vulnerable to missing-file claims).

## Change Log

Newest first.

- **2026-11-26 — Connect pipeline progress dots into a live green signal trace.**
  Files: `src/components/projects/pipeline-runner.tsx`,
  `src/lib/pipeline/runner-state.ts`, `src/lib/pipeline/runner-state.test.ts`,
  `src/app/globals.css`, `PROJECT_CONTEXT.md`.
  Why: `PipelineRunner` previously showed disconnected vertical step boxes, did not track
  locally finished steps or refresh between stages (so "Ingest the repository" reverted to
  pending/gray while later steps ran), and had only a static `Loader2` spinner during
  20–60s runs.
  What: added `resolveRunnerProgress` / `initialFailedStep` so completed stages stay green
  immediately as each stage finishes and `router.refresh()` runs after every stage; restyled
  the pipeline step list in the dark signal-trace panel style (`#090e13` + `field-grid`)
  with connected circular dot nodes (green check circles when done, pulsing radar dots when
  active, muted/next dots when pending), green/animated vertical connector rails (`animate-trace`
  traveling pulse), and a horizontal `animate-sweep` signal beam on the progress bar and active
  step card.
  Verify: `npx tsc --noEmit`, `npm run lint`, `npm test` (124/124) and `npm run build` green.
  Manual: connect a public repo on `/dashboard`, open `/projects/[id]`, click **Start the
  pipeline**, and confirm the vertical dots are connected by a rail; once **Ingest the
  repository** finishes, its dot, card tint, and downward connector turn green immediately
  while **Map the architecture** pulses with a traveling signal pulse and sweep animation.

- **2026-11-26 — Ground Repo Roast in verified snapshot facts and forbid missing-file hallucinations.**
  Files: `src/lib/prompts.ts`, `src/lib/pipeline/roast-runner.ts`, `src/lib/pipeline/roast.test.ts`, `PROJECT_CONTEXT.md`.
  Why: Repo Roast claimed a `.env.template` listed in `README.md` was missing from a Python repo even though it existed in GitHub (ingestion excludes `.env*` files from snapshots, and low-signal clean repos invited `README/code mismatch` hallucinations).
  What: bumped `ROAST_PROMPT_VERSION` to `roast-v2`, added deterministic `computeRoastFacts` (`todoFiles`, `duplicateNames`, `largeFiles`, `depCount`, `authFiles`) in `src/lib/prompts.ts`, injected `VERIFIED FACTS` into `buildRoastUserPrompt` via `runRepoRoast`, removed `README/code mismatch` from roast target hints, required literal snapshot evidence, and forbade claiming any file is missing from the repo while keeping the strict one-roast-per-project cap.
  Verify: `npx tsc --noEmit`, `npm run lint`, and `npm test` (119/119) green (`next build` requires network for Google Fonts in `src/app/layout.tsx`).
  Manual: connect a clean repo containing `.env.template` and a `README.md` referencing it, click **Roast my project**, and verify Geko roasts an observable code/fact pattern rather than claiming `.env.template` is missing; confirm the one-roast cap stays enforced.

- **2026-11-26 — Progress reset keeps projects; debug quota preserved.**
  Files: `src/app/actions/profile.ts`, `src/components/app/profile-actions.tsx`, `PROJECT_CONTEXT.md`.
  Why: reset should let users redo pathways on their existing projects without also restoring
  debug session quota (which could allow unlimited debug generation via reset cycling).
  What: `clearUserProgressAction` now deletes only `projects/{pid}/progress/{uid}` per owned
  project instead of recursively deleting project docs. `debugUsage` quota is no longer cleared.
  Projects, snapshots, guidebooks, lessons, and debug sessions remain untouched. UI copy updated.
  Verify: `npx tsc --noEmit` clean, `npm test` 111/111.
  Manual: connect a project, complete a pathway, reset progress → project still appears on
  `/projects`, pathway progress back to 0%, debug sessions still visible, debug quota unchanged.

- **2026-11-26 — 3-project cap uses lifetime counter, not active project count.**
  Files: `src/lib/domain/user.ts`, `src/app/actions/projects.ts`, `PROJECT_CONTEXT.md`.
  Why: users could delete a project then reconnect a new one, bypassing the 3-project cap.
  What: added `projectsCreatedCount` to `UserDocSchema` (`.default(0)` for backward compat),
  updated `emptyUserDoc`, changed `createProject` transaction to read the counter from
  `users/{uid}` and increment it atomically instead of querying active-project count.
  `clearUserProgressAction` deliberately preserves this counter.
  Verify: `npx tsc --noEmit` clean, `npm test` 111/111.
  Manual: connect 3 repos → reach limit; delete one → try to connect a 4th → still blocked.

- **2026-11-24 — Remove Underlying Concept section from Debug & Learn end-to-end.**
  Files: `src/app/(app)/projects/[id]/debug/[sid]/page.tsx`, `src/app/(app)/projects/[id]/debug/page.tsx`,
  `src/lib/prompts.ts`, `src/lib/domain/debug.ts`, `src/lib/pipeline/debug.ts`,
  `src/lib/pipeline/debug.test.ts`, `src/app/api/debug/run/route.ts`, `PROJECT_CONTEXT.md`.
  Why: simplify the Debug & Learn view to focus on the detective board, signal trace, likely causes,
  and actionable fix steps, while saving LLM token cost and generation latency.
  What: removed the Underlying Concept UI panel and unused `Lightbulb` import from `/projects/[id]/debug/[sid]`,
  adjusted speech bubble text on `/projects/[id]/debug`, bumped debug prompt version to `debug-v4`
  (removing `whyItWorks` JSON property and prompt constraints), updated `DebugModelSchema` and
  `DebugSessionContentSchema`, removed `whyItWorks` auditing and persistence in route handler, and updated tests.
  Verify: `npx tsc --noEmit`, `npm test` (111/111), and `npm run build` all pass green. Navigate to
  `/projects/[id]/debug/[sid]` to verify the session renders causes, fix steps, tip, and quiz without the
  Underlying Concept panel.

- **2026-11-24 — Remove scaling and bouncing animation from debug signal trace text.**
  Files: `src/components/projects/debug-data-path.tsx`, `PROJECT_CONTEXT.md`.
  Why: opening and switching active hops in the debug session signal trace triggered `animate-pop`,
  causing the hop explanation text to scale and bounce.
  What: removed `animate-pop` from the active hop card container in `DebugDataPath`. Hop explanation
  text now displays immediately and stably without scale or bounce animation.
  Verify: open `/projects/[id]/debug/[sid]`, click through the signal trace hops, and confirm the
  explanation text expands immediately without scaling or bouncing.

- **2026-11-21 — Add the debug signal trace (data path between components).**
  Files: `src/lib/domain/debug.ts`, `src/lib/pipeline/debug.ts`,
  `src/lib/pipeline/debug.test.ts`, `src/lib/prompts.ts`, `src/app/api/debug/run/route.ts`,
  `src/components/projects/debug-data-path.tsx`,
  `src/app/(app)/projects/[id]/debug/[sid]/page.tsx`,
  `src/app/(app)/projects/[id]/debug/page.tsx`, `src/app/globals.css`,
  `PROJECT_CONTEXT.md`.
  Why: the first external tester said linking explanations to files is useful but asked how data
  moves between components, because a trace is what stops the "ask AI to rewrite the same file"
  loop. Debug previously answered *where* the bug is, never *how the data got there*.
  What: `debug-v3` asks for a `dataPath` (trigger, 3–6 hops with `from`, `to`, real `file`, and
  `whatHappens`, then `breaksAt`) and receives the stored `architecture.dataFlow` as context.
  The normalizer rejects invented hop files, invented backticked paths, fewer than three hops,
  and traces that stay inside one file. The session page renders a "Signal trace" rail between
  the detective board and the causes: amber `IN` node, numbered hops with lime nodes, a traveling
  pulse, one expanded hop at a time, and a danger `BREAK` node. Old sessions simply omit it.
  Verify: `npx tsc --noEmit`, `npm run lint`, `npm test` (111/111) and `npm run build` green.
  Manually: run a new debug session on a ready project → open it and confirm the trace starts at
  a real trigger, each hop names a snapshot file, only one hop expands at a time, "Open this hop
  on GitHub" resolves, and the break line matches the reported symptom. Reload an older session
  and confirm the page still renders without a trace.

- **2026-11-20 — Complete M7 validation readiness verification.**
  Files: `docs/TEST_PLAN.md`, `PROJECT_CONTEXT.md`.
  Why: make the five-tester run measurable from real Firestore events and remove ambiguity
  around each Module 3 success threshold.
  What: the tester worksheet now records the public repo/project, first and second pathways,
  no-re-reading quiz passes, explanation recall and issues; the checklist defines event metadata
  and explicit 3/5, 3/5 and 2/5 metric calculations.
  Verify: `npm test` (107/107), `npm run typecheck`, `npm run build`, then run the
  `docs/TEST_PLAN.md` procedure with five real grown-project testers.

- **2026-11-20 — Enforce one Repo Roast per project and unify share-image styling.**
  Files: `src/app/actions/projects.ts`, `src/app/(app)/projects/[id]/page.tsx`,
  `src/components/projects/repo-roast.tsx`, `src/components/app/share-progress-button.tsx`,
  `src/lib/domain/repo-roast{.ts,.test.ts}`, `src/lib/projects.ts`,
  `src/lib/share-card.ts`, `src/lib/share-progress.ts`, `src/lib/share-roast.ts`,
  `README.md`, `PROJECT_CONTEXT.md`.
  Why: preserve one shareable roast per project across reloads, block repeat model calls, and
  make both downloaded card types visually consistent with each other and the app.
  What: generation uses an atomic Firestore reservation and stores its completed result;
  project pages reload and display it with sharing still available. Both image generators use
  a shared branded frame and load Space Grotesk/JetBrains Mono from the app's font styles.
  Verify: generate a roast and reload the project; the quote remains and the roast action is
  disabled. Download both card types and check matching frame/brand typography.

- **2026-11-20 — Prevent share failures when native share or font loading is unavailable.**
  Files: `src/lib/share-card.ts`, `src/components/app/share-progress-button.tsx`,
  `src/components/projects/repo-roast.tsx`, `PROJECT_CONTEXT.md`.
  Why: native sharing and explicit font fetches can reject with browser `NetworkError`.
  What: use the app's computed font stacks after `document.fonts.ready` rather than blocking on
  explicit font fetches; when a native share attempt fails, download the image and copy the
  caption without making a second failing share request.
  Verify: test both share actions in a browser where `navigator.share` is unavailable or rejects;
  confirm the PNG downloads and caption fallback is reported.

- **2026-11-20 — Replace starter README with product and setup guide.**
  Files: `README.md`, `PROJECT_CONTEXT.md`.
  Why: explain Gekonstruct's current learning pathways, Repo Roast, local setup, limits and
  community to users and contributors.
  What: document the actual feature set, Firebase/DeepSeek environment configuration,
  development commands, read-only behavior, and tester checklist; include the LinkedIn tagline.
  Verify: follow the documented setup against `.env.example` and confirm command names against
  `package.json`.

- **2026-11-20 — Add Repo Roast and project-hub sharing.**
  Files: `src/app/(app)/projects/[id]/page.tsx`,
  `src/components/projects/repo-roast.tsx`, `src/app/actions/projects.ts`,
  `src/lib/pipeline/{roast.ts,roast-runner.ts,roast.test.ts}`, `src/lib/share-roast.ts`,
  `src/lib/prompts.ts`, `PROJECT_CONTEXT.md`.
  Why: let project owners get a specific, shareable affectionate roast based on their real
  snapshot, and remove the redundant badges block from the project hub.
  What: the detected-stack aside now includes an orange Repo Roast card. Geko generates one
  verified-sentence roast with a real-file link; Share roast creates a branded PNG and uses
  native sharing, download, or clipboard fallback.
  Verify: open an ingested project, confirm the card appears below Detected stack, click
  Roast my project, confirm the quote and file link are specific, then share the roast.

- **2026-11-20 — Add Telegram community links and complete M7 checklist.**
  Files: `src/components/app/site-footer.tsx`, `docs/TEST_PLAN.md`, `PROJECT_CONTEXT.md`.
  Why: give vibe-coders direct update and feedback channels, and map M7's live 5-tester
  acceptance metrics to stored analytics events.
  What: the shared footer now links `@gekonstruct` and `@gekonstruct_chat` in a new tab,
  with an inline Telegram icon and matching high-contrast lime buttons for both destinations;
  `docs/TEST_PLAN.md` records the tester procedure and success targets.
  Verify: open the landing page or any app shell, confirm both Telegram links, then use
  `docs/TEST_PLAN.md` to collect five real tester results.

- **2026-11-20 — Keep long Foundations quiz questions inside their cards.**
  Files: `src/components/projects/quiz.tsx`, `PROJECT_CONTEXT.md`.
  Why: browsers position a visible `<legend>` across the fieldset's top border, making the
  question appear outside its card.
  What: keep a screen-reader-only legend for fieldset semantics and render the visible,
  wrapping question as normal content inside the card.
  Verify: open a Foundations lesson with a long question and confirm it wraps within the
  card on narrow and desktop layouts.

- **2026-11-20 — Simplify the Architecture Map and save request walkthrough progress.**
  Files: `src/app/(app)/projects/[id]/overview/page.tsx`,
  `src/components/projects/{architecture-explorer,overview-tracker,request-flow}.tsx`,
  `src/components/projects/architecture-trace.tsx` (removed),
  `src/app/actions/progress.ts`, `src/lib/{analytics.ts,domain/event.ts,domain/progress.ts}`,
  `src/lib/domain/{event.test.ts,progress.test.ts}`,
  `src/app/actions/{lessons,debug}.ts`, `src/app/(app)/projects/page.tsx`,
  `src/components/projects/project-progress-card.tsx`, `PROJECT_CONTEXT.md`.
  Why: remove redundant Layers/Trace/map-source UI and make the Request section an
  understandable, resumable walkthrough.
  What: the pager now has What, Skill map, Request and Concepts. Request highlights the next
  uncompleted step; **Understood** saves it transactionally and advances, with the server
  enforcing the sequence. The four map-area
  tracker now observes pager content when it mounts, and project progress counts the new
  Skill map section instead of Layers. Mermaid remains stored in guidebook data but is no
  longer exposed as raw source.
  Verify: open a ready project → Architecture → Request; click **Understood** on one or more
  steps, reload, and confirm completed steps stay marked and the next step is active. Visit
  What, Skill map, Request and Concepts and confirm the map-read indicator reaches 4/4.
  Confirm Layers, Trace and Diagram source are absent.

- **2026-11-20 — Standardize signed-in page content width.**
  Files: `src/app/(app)/profile/page.tsx`,
  `src/app/(app)/projects/[id]/overview/page.tsx`,
  `src/app/(app)/projects/[id]/learn/page.tsx`,
  `src/app/(app)/projects/[id]/learn/[lessonId]/page.tsx`,
  `src/app/(app)/projects/[id]/debug/page.tsx`,
  `src/app/(app)/projects/[id]/debug/[sid]/page.tsx`,
  `src/app/(app)/projects/[id]/error.tsx`, `PROJECT_CONTEXT.md`.
  Why: main page content varied between 4xl, 5xl and 6xl, so pathways felt narrower than
  Dashboard and Projects.
  What: signed-in page wrappers now share the Dashboard's `max-w-6xl` width. Narrow error and
  missing-map cards remain centered within the shared page container.
  Verify: compare Dashboard, Profile, Architecture, Foundations, lesson, Debug and debug-session
  pages at desktop width; their outer content edges now align.

- **2026-11-20 — Convert Foundations to a progressive split IDE workspace.**
  Files: `src/components/projects/foundation-workspace.tsx`,
  `src/app/(app)/projects/[id]/learn/[lessonId]/page.tsx`,
  `src/lib/github.ts`, removed Git time-travel and Sandpack components,
  `package.json`, `package-lock.json`, `PROJECT_CONTEXT.md`.
  Why: evidence check, Git replay and break/fix sandbox did not make the core lesson loop
  clearer; the Foundations pathway needs concept and code working in parallel.
  What: lesson concept, Geko tip and server-graded quiz now share the left pane. A Monaco IDE
  on the right reveals cumulative lesson codeRefs; earlier lessons expose only their relevant
  files, later lessons add more, and the final lesson exposes the full snapshot. The question
  options remain re-graded by the existing server action, while the learner answers alongside
  a real file tabbed in the IDE. Git time-travel, the evidence-check step and Sandpack sandbox
  were removed.
  Verify: open each Foundation lesson and confirm the left concept/quiz pane stays separate
  from the right IDE; files accumulate as lesson order increases; the final lesson exposes
  the full snapshot; quiz pass/fail and XP behavior are unchanged.

- **2026-11-20 — Replace Architecture horizontal strip with active-only sections.**
  Files: `src/components/projects/overview-pager.tsx`, `PROJECT_CONTEXT.md`.
  Why: a measured flex strip could still preserve the largest slide or stale height state,
  leaving blank space below short sections.
  What: the overview now renders only the active section, so its natural height is the exact
  carousel height. Direct tabs, Back/Next and horizontal touch swipes change the active section.
  The previous height-measurement approach was removed.
  Verify: open `/projects/[id]/overview`, switch among short and long sections and confirm
  no blank vertical area remains below the active section.

- **2026-11-20 — Make Architecture carousel height section-aware.**
  Files: `src/components/projects/overview-pager.tsx`, `PROJECT_CONTEXT.md`.
  Why: the horizontal flex carousel used the tallest slide's height for every section.
  What: the pager now measures its active slide with `ResizeObserver` and sets the carousel
  height to that slide, with a smooth height transition. Horizontal navigation and swipe
  scrolling continue to update the active section and its measured height.
  Verify: open `/projects/[id]/overview`, switch between a short and tall section and confirm
  the carousel immediately or smoothly settles to the active section's height without
  unnecessary blank space.

- **2026-11-20 — Refine Architecture Map navigation and remove Code City.**
  Files: `src/components/projects/architecture-explorer.tsx`,
  `src/components/projects/architecture-trace.tsx`,
  `src/components/projects/overview-pager.tsx`,
  `src/app/(app)/projects/[id]/overview/page.tsx`, `package.json`,
  `package-lock.json`, `PROJECT_CONTEXT.md`.
  Why: Code City did not improve code understanding, and the long overview page made its
  sections harder to use as a guided lesson.
  What: the overview is now a Duolingo-style horizontal snap scroller with direct section
  tabs and Back/Next controls. The skill map follows the project summary, uses flexible
  node sizing, spans the full slide width, and shows selected-node details below it. Trace
  appears after the request-flow section and before Concepts. Code City and its Three.js
  dependencies were removed.
  Verify: open `/projects/[id]/overview`, swipe or use the section tabs and Back/Next;
  confirm the What, Skill map, Layers, Request, Trace and Concepts slides are accessible,
  and skill-map text stays inside flexible nodes.

- **2026-11-20 — Refine project card action and divider spacing.**
  Files: `src/components/projects/project-progress-card.tsx`, `PROJECT_CONTEXT.md`.
  Why: remove an unnecessary divider above the pathway cards and keep card footer actions
  visually separate.
  What: pathway progress cards no longer have a top horizontal line; the bottom card footer
  retains a separator with extra spacing, and the icon-only delete button sits at the bottom
  left immediately before the Updated text.
  Verify: open `/projects` and confirm the pathway cards have no top divider, the bottom
  divider has clear margins, and delete appears before Updated with no overlap on mobile.

- **2026-11-20 — Add per-project deletion from the Projects page.**
  Files: `src/app/actions/projects.ts`,
  `src/components/projects/delete-project-button.tsx`,
  `src/components/projects/project-progress-card.tsx`, `PROJECT_CONTEXT.md`.
  Why: let owners recover the three-project cap without using profile-wide progress reset.
  What: each project card has an icon-only trash button. It opens a confirmation dialog naming
  the project and permanently deleting the project plus nested snapshot, guidebook, lesson,
  progress, debug and analytics data. The server action verifies authentication and ownership
  before recursively deleting the project.
  Verify: open `/projects`, choose Delete on one owned card, cancel and confirm cancellation
  leaves the project intact; reopen and confirm, then verify the project disappears and the
  project owner can connect a replacement.

- **2026-11-20 — Add Profile to header navigation and Community status badge.**
  Files: `src/components/app/app-nav.tsx`, `src/components/app/user-menu.tsx`,
  `PROJECT_CONTEXT.md`.
  Why: make Profile easier to reach and clearly label Community as unavailable.
  What: the signed-in desktop header now includes Dashboard, Projects and Profile with an
  active state for `/profile`. The account popup keeps Community and adds an amber
  "Coming soon" badge beside it.
  Verify: sign in, confirm Profile appears in the header and active styling on `/profile`;
  open the account menu and confirm the Community row shows the Coming soon badge.

- **2026-11-20 — Add multi-style quest learning experiences.**
  Files: `src/components/projects/architecture-explorer.tsx`,
  `src/components/projects/code-city.tsx`, `src/components/projects/lesson-quest.tsx`,
  `src/components/projects/monaco-tour.tsx`, `src/components/projects/git-time-travel.tsx`,
  `src/components/projects/sandbox-quest.tsx`, `src/components/projects/debug-detective.tsx`,
  `src/app/api/projects/[id]/history/route.ts`, `src/lib/github.ts`,
  `src/app/(app)/projects/[id]/overview/page.tsx`,
  `src/app/(app)/projects/[id]/learn/[lessonId]/page.tsx`,
  `src/app/(app)/projects/[id]/debug/[sid]/page.tsx`, `src/lib/prompts.ts`,
  `PROJECT_CONTEXT.md`.
  Why: remove textbook-heavy surfaces and support visual, reading, tracing, replay,
  sandbox and detective learning styles without weakening repository-grounded content.
  What: the Architecture Map now has a snap-scrolling section pager, a full-width interactive
  React Flow skill map and a dedicated request trace. Foundations now have a split concept/Monaco
  workspace with cumulative unlocked files. Debug now starts with a
  suspect/evidence detective board before the existing fix and quiz. Prompt versions were
  bumped to v2 and all existing XP, badge and server grading behavior remains intact.
  Verify: open a ready project → **Architecture** and exercise the section pager, skill map and Trace;
  open a Foundation lesson and confirm the concept and code workspace remain synchronized;
  open Debug & Learn, select a suspect,
  inspect evidence, follow fix steps and complete the quiz.

- **2026-11-20 — Add a Coming Soon Community page.**
  Files: `src/app/(app)/community/page.tsx`, `src/components/app/user-menu.tsx`,
  `PROJECT_CONTEXT.md`.
  Why: introduce the future project-learning marketplace without implying it is available now.
  What: the signed-in account menu links to a Community teaser describing the project remix
  concept, Architecture Map + Foundations learning path, and no-GitHub-contribution boundary.
  It shows no user projects or mock listings and links back to the existing Projects page.
  Verify: open the account menu → **Community**; confirm the Coming Soon state, concept and
  Projects link render, and no marketplace project cards are shown.

- **2026-11-20 — Share profile progress as an achievement.**
  Files: `src/app/(app)/profile/page.tsx`,
  `src/components/app/share-progress-button.tsx`, `src/lib/share-progress.ts`,
  `src/lib/share-progress.test.ts`, `PROJECT_CONTEXT.md`.
  Why: let users show their learning progress and invite others to Gekonstruct.
  What: **Share progress** renders a branded 1200×630 PNG with the user's name, XP, earned
  badges and `gekonstruct.dev` invitation, then shares it with a caption via the native file
  share sheet where supported. Otherwise it downloads the banner and shares/copies the caption.
  No public profile data is exposed automatically.
  Verify: on a mobile browser with file sharing, open `/profile` → **Share progress** → choose
  Telegram and confirm the image and caption are attached. Where file sharing is unsupported,
  confirm the banner downloads and the caption is shared or copied with status feedback.

- **2026-11-20 — Limit free-plan Debug & Learn to two sessions per project.**
  Files: `src/lib/domain/debug.ts`, `src/lib/domain/debug.test.ts`, `src/lib/debug.ts`,
  `src/app/api/debug/run/route.ts`, `src/app/(app)/projects/[id]/debug/page.tsx`,
  `src/components/projects/debug-symptom-form.tsx`, `src/app/actions/profile.ts`,
  `PROJECT_CONTEXT.md`.
  Why: bound free-tier model usage without letting concurrent requests overrun the allowance.
  What: atomically reserve one of two attempts per project before analysis; every reservation
  counts, even if the run later fails. The page shows remaining sessions and hides the form when
  exhausted. Profile reset also removes server-owned usage records.
  Verify: on a project with a ready map, start two debug sessions and confirm the remaining
  count updates; the third request receives HTTP 429 and the page shows the limit state. Confirm
  a failed analysis still consumes one attempt, and profile reset clears the project and usage.

- **2026-11-20 — Limit the dashboard activity feed to six entries.**
  Files: `src/lib/activity.ts`, `PROJECT_CONTEXT.md`.
  Why: keep the dashboard focused on the user's most recent actions.
  What: the feed now returns only the six newest eligible events across owned projects.
  Verify: open `/dashboard` with more than six recorded activities and confirm only the newest
  six are shown.

- **2026-11-20 — Personalized dashboard greeting and recent activity feed.**
  Files: `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/projects/page.tsx`,
  `src/lib/{activity.ts,domain/activity.ts,domain/event.ts}`,
  `src/components/app/recent-activity-feed.tsx`, `src/lib/domain/activity.test.ts`,
  `PROJECT_CONTEXT.md`.
  Why: focus the dashboard on the user’s progress while keeping project browsing on `/projects`.
  What: dashboard title greets the saved profile name and its project cards are replaced by a
  latest-activity feed assembled from validated existing project events. It reports lesson XP,
  pathway bonuses, badge awards, quiz outcomes, project setup and pipeline milestones. `/projects`
  is titled "Your projects".
  Verify: open `/dashboard`; confirm the greeting uses the editable name and activity entries link
  to their project; pass a lesson quiz and confirm its XP/badge details; open `/projects` and
  confirm the title reads "Your projects".

- **2026-11-20 — Moved project progress to a dedicated two-column Projects page.**
  Files: `src/app/(app)/projects/page.tsx`, `src/app/(app)/profile/page.tsx`,
  `src/app/(app)/layout.tsx`, `src/components/app/{app-nav,user-menu}.tsx`,
  `src/components/projects/project-progress-card.tsx`, `PROJECT_CONTEXT.md`.
  Why: separate profile/account settings from project browsing while keeping each project's
  pipeline and learning progress easy to scan.
  What: `/projects` now combines repository, stage, stack, recent activity and all three pathway
  progress meters in two columns on desktop (one on narrow screens). `/profile` no longer queries
  or renders projects. Added an active-aware Projects nav link beside Dashboard and a Projects
  shortcut in the account menu.
  Verify: open **Projects** from the header or account menu; confirm two cards per row at desktop
  widths, each with pipeline details and map/Foundations/Debug progress; confirm `/profile` shows
  only profile, badges and account actions.

- **2026-11-20 — Removed the badge shelf from the dashboard.**
  Files: `src/app/(app)/dashboard/page.tsx`, `PROJECT_CONTEXT.md`.
  Why: the profile page is now the home for badges, keeping the dashboard focused on connecting
  and opening projects.
  What: removed the badge shelf from the dashboard; the profile and project hub badge displays
  remain unchanged.
  Verify: open `/dashboard` and confirm no badge block appears; open `/profile` to see badges.

- **2026-11-20 — My profile page, editable name, project progress and full data reset.**
  Files: `src/app/(app)/profile/page.tsx`, `src/app/(app)/layout.tsx`,
  `src/app/actions/profile.ts`, `src/components/app/{profile-actions,user-menu}.tsx`,
  `src/lib/auth/users.ts`, `PROJECT_CONTEXT.md`.
  Why: give signed-in users one place to manage their identity, achievements and project learning
  state instead of the account menu linking "My projects".
  What: "My profile" now opens `/profile`; the page shows an editable name, earned badges, and
  per-project map, Foundations and Debug progress. The name persists through later Google
  sign-ins. Its final Account actions section offers a sign-out button and a confirmed reset
  that recursively removes owned projects and subcollections, then resets XP/badges without
  deleting the user's account or chosen name.
  Verify: open account menu → My profile; save a new name and confirm it remains after refresh
  and a later sign-in; check badges and each project's pathway progress; open "Erase all
  progress", cancel once, then type `DELETE` to confirm and verify project cards disappear,
  XP/badges reset, and the same account can sign in and reconnect a project.

- **2026-11-20 — Vercel Analytics + Speed Insights mounted.**
  Files: `src/app/layout.tsx`, `PROJECT_CONTEXT.md`.
  Why: the packages were already in `package.json` but nothing rendered them, so Vercel
  collected no page-view or Core Web Vitals data.
  What: root layout now renders `<Analytics />` from `@vercel/analytics/next` and
  `<SpeedInsights />` from `@vercel/speed-insights/next` next to the existing `Toaster`. They
  load only on Vercel deployments; product events stay in Firestore. No env vars needed.
  Verify: deploy on Vercel → the project’s Analytics tab shows page views and the Speed
  Insights tab shows Web Vitals after a few visits; local `next dev` is unaffected.

- **2026-11-20 — Phase 6: Polish (badges, full §13 analytics, pipeline retry UX, states, rules).**
  Files: `src/lib/{badges,analytics}.ts` (+ `badges.test.ts`), `src/lib/domain/event.ts`
  (+ `event.test.ts`), `src/lib/domain/progress.ts`, `src/app/actions/{lessons,debug,progress}.ts`,
  `src/app/(app)/projects/[id]/{page.tsx,loading.tsx,error.tsx,overview/page.tsx,
  learn/page.tsx,learn/[lessonId]/page.tsx,debug/page.tsx,debug/[sid]/page.tsx}`,
  `src/app/(app)/dashboard/page.tsx`,
  `src/components/app/badge-shelf.tsx`, `src/components/projects/{pathway-nav.tsx,
  overview-tracker.tsx,pipeline-runner.tsx,quiz.tsx,debug-quiz.tsx}`, `PROJECT_CONTEXT.md`.
  Why: closes M6 — the three prototype badges, every analytics event BLUEPRINT §13 names, a
  retry UI that tells the truth about saved stages, explicit loading/error/empty states, and a
  deployed rules file.
  What:
  - `src/lib/badges.ts` is the single badge catalogue + pure award/idempotency rules.
    `BadgeShelf` (dashboard + project hub) shows earned badges in amber and locked ones quietly.
    `completeLesson` awards `foundation-builder` in the same transaction as XP;
    `markOverviewSectionViewed` awards `map-reader`; `completeDebugSession` keeps
    `bug-whisperer`. All awards also land on `users/{uid}.badges`.
  - `progress.overviewSections` records map reading. `OverviewTracker` observes the four
    `[data-overview-section]` regions, reports each once, and the server action writes
    `overview_section_viewed` + progress + badge in one transaction. Awarding the badge also
    records `pathway_completed` for the architecture pathway.
  - Remaining §13 events: `lesson_viewed` (deterministic id, `after()` on the lesson page),
    `return_visit` (once, only ≥24h after the stored `analysis_ready`), and
    `pathway_completed` for the debug pathway. `analysis_ready`, `stage_completed`,
    `project_created`, `quiz_passed|quiz_failed`, `debug_created|debug_completed` were already
    recorded and now share the typed event module.
  - `PathwayNav` (`Map / Learn / Debug`) is on the hub and every pathway page.
  - `PipelineRunner`: saved/next/waiting/failed per step, saved-step progress bar, elapsed
    seconds while running, explicit 401 → login redirect, connection-loss copy, and an error
    panel that names the failed step and says earlier steps are reused. The stale “future
    step” row is gone.
  - `/projects/[id]` gained `loading.tsx` and an `error.tsx` segment boundary. Debug explains
    that it unlocks after the map; the empty map/lesson states remain. `DebugQuiz` options now
    use the same dot markers as `Quiz` (no A/B/C letters) and expose `aria-pressed`.
  - `firebase deploy --only firestore:rules` released the existing owner-scoped rules to
    `gekonstruct-14174` (“already up to date”, compiled successfully).
  Verify: `npx tsc --noEmit`, `npm run lint`, `npm test` (86/86) and `next build` green.
  Manual journey: open a `ready` project → badge shelf shows locked badges → read all four map
  sections (dots fill, Map Reader toast once) → pass every lesson (Foundation Builder toast,
  total 3 badges) → open a debug session and pass its quiz (Bug Whisperer already held) →
  reload `/learn/<lesson>` and check `projects/{pid}/events` has exactly one
  `lesson_viewed_<lessonId>` → open the hub 24h after `analysis_ready` to see one
  `return_visit`. Force a pipeline failure and confirm the error names the step, saved steps
  stay, and retry resumes there. Throttle/expire the session mid-run and confirm the 401 path
  sends you to `/login?next=...`.

- **2026-11-19 — Phase 5: Debug & Learn pathway (symptom run, session walkthrough, evidence code blocks, quiz, XP, badge).**
  Files: `src/lib/domain/debug.ts`, `src/lib/debug.ts`, `src/lib/prompts.ts`, `src/lib/pipeline/{debug.ts,debug-runner.ts,debug.test.ts}`,
  `src/app/api/debug/run/route.ts`, `src/app/actions/debug.ts`, `src/components/projects/{debug-symptom-form.tsx,debug-quiz.tsx}`,
  `src/app/(app)/projects/[id]/{page.tsx,debug/page.tsx,debug/[sid]/page.tsx}`, `src/components/projects/pipeline-runner.tsx`,
  `PROJECT_CONTEXT.md`.
  Why: Delivers the second core pathway from BLUEPRINT §1/§6/§8/§9. Vibe-coders facing context walls and breakages can
  describe errors/symptoms, inspect AI-identified root causes backed by real snapshot code, follow concrete fix steps,
  learn the underlying concept, and pass a quiz to prove mastery.
  What:
  - Domain: `DebugSessionDocSchema`, `LikelyCauseSchema`, `WhyItWorksSchema`, `DebugModelSchema`, `DebugSessionContentSchema`, `DEBUG_LIMITS`.
  - Storage: `src/lib/debug.ts` for Firestore collection queries and `debugSessions/{sid}`.
  - Pipeline: `matchFilesBySymptom` pure function (unit-tested in `debug.test.ts`), `normalizeDebugOutput` auditing evidence
    files and backticked paths against the snapshot, `debug-v1` prompt in `src/lib/prompts.ts`, and `runDebugAnalysis` in `src/lib/pipeline/debug-runner.ts`.
  - Route: `/api/debug/run` creates `pending` session, runs analysis with retry repair, updates to `done`/`failed`, and logs `debug_created` event.
  - Server Action: `completeDebugSession` grades quiz (≥70%), writes progress `debug[sid] = { completed: true, at }`, awards 30 XP on first
    pass, unlocks `"bug-whisperer"` badge on first completed debug session, and records `debug_completed` event in a transaction.
  - UI: `/projects/[id]/debug` symptom form with suggestion chips + session history; `/projects/[id]/debug/[sid]` full session walkthrough
    with confidence badges, `<CodeBlock>` evidence previews, fix steps, concept panel, and interactive `<DebugQuiz>`; `/projects/[id]`
    ReadyPanel updated to show all 3 pathways.
  Verify: `npm test` (71/71 pass), `npx tsc --noEmit` clean, `npm run lint` clean, `next build` clean.
  Navigate to `/projects/[id]` -> ReadyPanel shows 3 pathway cards (Architecture Map, Foundations Lessons, Debug & Learn). Click "Open debug"
  -> loads `/projects/[id]/debug`. Enter a symptom or click an example chip and submit -> redirects to `/projects/[id]/debug/[sid]`.
  Verify root causes with evidence code blocks, fix checklist, why-it-works concept panel, Geko tip, and `<DebugQuiz>`. Submit quiz -> awards
  30 XP and unlocks "Bug Whisperer" badge on the first completed session.

- **2026-11-19 — Phase 4: Foundations pathway (lessons, learn pages, quiz, XP).**
  Files: `src/lib/domain/{lesson,progress}.ts`, `src/lib/{quiz,code-language,lessons}.ts`,
  `src/lib/prompts.ts`, `src/lib/llm.ts`, `src/lib/pipeline/{lessons,lessons-runner,lessons-route}.ts`
  (+ `lessons.test.ts`, `src/lib/quiz.test.ts`), `src/app/api/pipeline/{lessons1,lessons2}/route.ts`,
  `src/app/actions/lessons.ts`, `src/app/(app)/projects/[id]/{page.tsx,learn/page.tsx,
  learn/[lessonId]/page.tsx,overview/page.tsx}`, `src/components/projects/{pipeline-runner,
  code-block,lesson-markdown,quiz}.tsx`, `PROJECT_CONTEXT.md`.
  Why: this is the first pathway a user finishes — it turns the architecture map into ordered,
  quiz-checked lessons built from their own files, and pays XP exactly once for a real pass.
  What: `lessons-v1` builds the pathway in two calls. Part 1 asks 3–5 lessons from the snapshot +
  guidebook; part 2 receives the stored part-1 ids/titles/goals and adds 2–5, ending with
  “how to debug here”. A shared normalizer rejects invented paths (codeRefs, backticked prose,
  file-shaped quiz options), requires ≥2 distinct real paths per explain, validates
  `correctIndex`/distinct options, slugs and de-dupes ids, continues `order`, clamps the part
  and the total (6–10) and sets `xp: 20`. Lessons1 stores part 1 and moves the project to
  `lessons1`; lessons2 stores part 2 and moves it straight to `ready` with `lessonCount`.
  `/projects/[id]` runs ingest → architecture → lessons1 → lessons2 and then shows a guidebook
  hub (map CTA, lesson progress, snapshot files); `/learn` lists both parts with pass state, a
  progress bar, pathway XP and the +50 bonus; `/learn/[lessonId]` renders the goal, constrained
  markdown, shiki code blocks read from the snapshot by path, the Geko tip and a client `Quiz`
  that receives question text/options only. `completeLesson` re-grades on the server (≥70%),
  writes progress and `quiz_passed|quiz_failed`, and inside one transaction increments
  `users.totalXp` + `progress.xp` for a first pass only, plus the once-only pathway bonus and a
  `pathway_completed` event.
  Verify: `npm run dev` → open a project at `architecture` → “Write the first lessons” then
  “Finish the lessons” → the hub shows lessons and `/learn` lists 6–10 with both parts. Open a
  lesson: code blocks expand with real file content and “Open on GitHub” links, no page fetches
  GitHub at read time. Submit fewer than 70%: result shows “Not yet”, 0 XP, progress unchanged,
  “Try again” re-enables the form. Pass: XP toast, `users.totalXp` rises by 20 once, passing
  again leaves it unchanged, and the final lesson pays the +50 bonus once. Reload `/learn` to
  see the pass state and bar move. Re-POST `lessons1` on a `lessons1` project to confirm it
  overwrites only part 1; it returns 409 on `ready`.
  Verified 2026-11-19 on `wayne-14e/Verdict` (36 files / 131,674 chars): lessons1 → 3 lessons
  in 1 attempt / 39s; lessons2 → 3 more in 1 attempt / 20s; all 6 have 3 quiz questions, 3–4
  real codeRefs and 6–9 real prose paths, no invented refs; stage `ready`, `lessonCount: 6`;
  wrong answers stored `passed:false` and awarded 0 XP, a correct retry moved `users.totalXp`
  0 → 20, a second pass stayed at 20; the lesson page rendered 4 shiki blocks with no
  `correctIndex` in HTML; `/learn` showed “1 of 6 lessons passed”. Routes: 401 without a
  cookie, 404 for another owner, 409 on `ready`, 400 on an empty body. `tsc`, lint, 62/62 tests
  and `next build` green.

## Change Log Archive

Older entries, one line each (full detail in git history):

- **2026-11-13 — Phase 0:** scaffold, design tokens, brand components, Firebase wiring and `env`.
  Verify: `npm run build` and `/` renders the Geko badge + wordmark.
- **2026-11-13 — Phase 1:** Google sign-in → httpOnly session cookie, `users/{uid}` bootstrap,
  landing, `/login`, guarded dashboard and header. Verify: sign in → empty dashboard; signed-out
  `/dashboard` → `/login?next=…`.
- **2026-11-13 — Visual redesign:** dark “JetBrains × Duolingo” system, `next-themes` removed.
  Verify: landing/login/dashboard/404 at 1440px and 390px.
- **2026-11-13 — Phase 2:** ingestion, stack detection, project cards and the runner; verified on
  `shadcn-ui/taxonomy`, `firebase/quickstart-js` and `vercel/next-learn`; Hello-World failed with
  the stack message.
- **2026-11-18 — Phase 3:** `architecture-v1` stage → `guidebook/main` + `/overview` (layers,
  flow, concepts, real file chips); verified on `wayne-14e/Verdict`, 2 attempts / ~41s.
  Verify: rebuild the map and expand every layer on `/overview`.
- **2026-11-13 — Landing hero recentred:** full-width sample window, centred header nav, signed-in
  `/` redirects to `/dashboard`.
- **2026-11-13 — LLM config Anthropic → DeepSeek:** `openai` SDK and `DEEPSEEK_*` env (no call yet).
- **2026-11-16 — Vercel warnings:** `engines.node` pinned to `22.x`, `allowScripts`, `.npmrc`
  `loglevel=error`.

## Known Issues

- **FIXED 2026-11-20 — Share actions could surface browser `NetworkError`.**
  Explicit `document.fonts.load` and retrying native share with text could fail in some
  browsers. Share cards now wait for existing brand-font loading, and a failed native share
  falls back once to download + caption clipboard (see Change Log 2026-11-20).
- **FIXED 2026-11-20 — Long Foundations quiz questions could overflow their card.**
  The visible question now renders inside the fieldset instead of overlapping its border
  as a legend (see Change Log 2026-11-20).
- **FIXED 2026-11-18 — `DEEPSEEK_API_KEY` was blank.** The key is configured and the
  architecture stage makes a real model call (see Change Log 2026-11-18).
- **FIXED 2026-11-19 — Lessons and quizzes were placeholders.** The full Foundations pathway
  now ships (see Change Log 2026-11-19).
- **Passing is effectively all-or-nothing with 2–3 questions.** The blueprint fixes quizzes at
  2–3 questions and a ≥70% pass, so 2/3 = 66.7% fails and a 3-question quiz needs all three
  correct. This is blueprint arithmetic, not a bug, but it makes “70%” feel stricter than it
  reads; revisit if testers report it as harsh.
- **Regenerating a lessons part can orphan progress entries.** Lesson ids are slugs derived
  from titles, so re-running `lessons1` after a model change can change ids. Old
  `progress.lessons` entries remain (XP already earned is never clawed back) but stop counting
  toward the new pathway. No UI explains this yet.
- **Lesson latency shares the 60s stage cap.** Live runs were 39s (part 1) and 20s (part 2) on a
  131,674-char snapshot; a repair retry on a near-cap repo could exceed `maxDuration = 60` in
  production, same risk as the architecture stage.
- **The debug signal trace is model-generated, not import-proven.** Every hop's `file` is
  audited against the snapshot, but the hand-off itself (`from` → `to`) is the model's reading
  of the provided code, not an AST/import edge. It is a strong hypothesis for following a bug,
  not a guarantee. A later version could derive edges from real imports before asking the model
  to narrate them.
- **Sessions created before `debug-v3` have no signal trace.** `dataPath` is optional on the
  stored document so those pages still render, but only newly run sessions show the rail. There
  is no backfill because the old sessions did not store enough reasoning to reconstruct one.

- **FIXED 2026-11-20 — Badge and view analytics were missing.** `map-reader`,
  `foundation-builder`, `overview_section_viewed`, `lesson_viewed` and `return_visit` are now
  recorded (see Change Log 2026-11-20).
- **`map-reader` uses viewport visibility as a reading proxy.** A section counts as read when
  at least 30% of it has been on screen. On a very tall monitor all four sections can qualify
  while scrolling quickly; on a short phone a long section still qualifies once 30% is visible.
  This is deliberately cheap and needs no click tracking; revisit if testers game it or feel it
  awards too early.
- **`foundation-builder` is not backfilled for pre-M6 passes.** A pathway finished before the
  badge shipped has no stored award; retaking any lesson in it awards the badge because
  `completeLesson` recomputes the full pass count. `map-reader` needs no backfill because
  pre-M6 progress has no `overviewSections`.
- **Architecture latency sits close to the 60s stage cap on large snapshots.** A first pass
  on a 131,674-char snapshot took ~20s; the repair pass pushed the stage to ~41s. Repos near
  the 150k ingest cap can exceed `maxDuration = 60` in production. Thinking mode is already
  disabled, output is capped at 8K tokens and the repair reuses the provider's prompt cache,
  but this needs a smaller prompt budget or a stage split if it bites.
- **A failed architecture attempt spends another model call.** No intermediate artifact is
  cached, so retrying the stage re-sends the whole snapshot prompt.
- **Prose path auditing only inspects backticked tokens.** A path written without backticks is
  not checked; every path rendered as a chip *is* validated against the snapshot, and the
  prompt asks for backticks.
- **Repository contents are untrusted prompt input.** A README or comment can contain
  instructions aimed at the model. The stage only reads and explains files (no tools, no
  writes) and the output is zod-checked, but a crafted repo can still skew the prose. Treat a
  connected repo as untrusted text when reviewing output quality.
- **FIXED 2026-11-20 — The overview previously fired no analytics and had no badge.** Sections
  now report `overview_section_viewed` and the fourth awards `map-reader` (BLUEPRINT §13).
- **Mermaid is shown as source, not rendered.** The stored flowchart opens in a collapsed
  `<pre>`; diagram rendering is Backlog polish.
- **FIXED 2026-11-20 — There was no project hub nav.** `Map / Learn / Debug` now appears on the
  hub and every pathway page, with the current pathway marked `aria-current="page"`.

- **Google popup sign-in not yet verified in an automated browser** (needs an interactive
  Google account). The token→cookie→session path is verified with a minted session cookie;
  the popup branch is covered by manual steps in the Change Log above.
- `scripts/dev-session.mjs` needs `.secrets/firebase-service-account.json`; it is local-only
  and must never be deployed or its output shared.
- **GitHub anonymous limit still applies to the tree call.** File contents use raw URLs
  (no quota), but each ingest spends one unauthenticated API request (60/hour per IP).
  Sharing one dev IP across several ingests can produce the friendly “GitHub is rate-limiting
  anonymous requests” message. Set `GITHUB_TOKEN` in `.env.local` to raise it to 5,000/hour.
- **Very large repos can return a truncated tree.** GitHub caps `git/trees/HEAD?recursive=1`
  at ~100k entries / 7 MB. The ingest route records the flag in the `stage_completed` event
  (`treeTruncated`) but does not surface it in the UI yet; selection still works on the
  entries that did arrive, so a truncated tree only means files are missing, never that the
  snapshot is invalid.
- **FIXED 2026-11-19 — The debug pathway was a placeholder.** Full Debug & Learn pathway is
  now live at `/projects/[id]/debug` and `/projects/[id]/debug/[sid]`, backed by `/api/debug/run`
  and `completeDebugSession` (see Change Log 2026-11-19).
- **Stage progress still uses `router.refresh()`, not `onSnapshot`.** Snapshot, guidebook and
  lesson progress are read once per server render; the realtime listener stays Backlog until
  more stages need streaming progress.
- **A project cannot be removed.** The 3-project cap counts every project, including ones
  stuck in `failed:*`, so a QA account that fails three times is locked out of connecting
  more repos. Removal/reconnect ships with the project settings entry (see Backlog).
- **FIXED 2026-11-19 — Landing page described the debug pathway before it was live.** All three
  pathways (Architecture Map, Foundations Lessons, and Debug & Learn) are now live and clickable.
- **FIXED 2026-11-13 — Dashboard “Connect a repository” was disabled until Phase 2.**
  The connect form now creates a project and the project page runs ingestion.
- **FIXED 2026-11-13 — No dark theme.** Superseded by the design reversal: the product is
  dark-only now (see Decisions Log).
- Placeholder brand mark (intentional until real logo lands).

## Backlog / Out of Scope

- Theme toggle / light appearance, i18n, mobile app, payments, leaderboards, streaks
  (BLUEPRINT §2).
- Private repos, ZIP upload, GitLab/Bitbucket.
- Auto-fixing code; Gekonstruct never writes to the user's repo.
- Mermaid diagram is optional polish — never blocks a milestone.
- Nice-to-have: `/dashboard` project search, keyboard shortcuts, offline lesson cache.
- **Disconnect / delete a project** so the 3-project cap is recoverable (needs a confirmation
  dialog plus cascade delete of `snapshot`, `events` and later `guidebook`/`lessons` docs).
- Persist `treeTruncated` on the project (or in the snapshot doc) and show a “some files were
  not listed” hint in the snapshot panel.
- **Render the stored mermaid flowchart** (dynamic import, silent fallback) once the map
  content has been through tester validation.
- **Revisit quiz pass arithmetic** once tester feedback exists: with 2–3 questions a 70% pass
  means 2 of 2 or 3 of 3, so a single miss fails a lesson. Either ask for 4 questions or treat
  2 of 3 as a pass.
- **Foundations and Debug need a visual, less wordy layout.** Requested direction: side-by-side
  IDE pane plus connection/dependency graphs and other visuals, instead of long prose. Needs a
  page-architecture and prompt-shape change (code refs, graph data, narrow-viewport fallback),
  so it was deliberately deferred out of M6.
- **Reduce architecture prompt cost/latency** if testers connect very large repos: per-file
  budget for prose-heavy files, or split the call into "layers" and "concepts".
- **Cache the built prompt** (or the raw model answer) per snapshot so a failed repair does
  not pay for the full input twice.

---

**TODO:**

### 1. Visual Maps: Libraries & APIs for Next.js

| Concept | Best Next.js / JS Stack | How It Works | UI & Design Customization |
| --- | --- | --- | --- |
| **Clickable System & Dependency Map** *(replaces GitDiagram / repowise)* | **`@xyflow/react`** (React Flow) + **`madge`** or **`dependency-cruiser`** | Run `madge` or `dependency-cruiser` in a Next.js API route (or parse ASTs with `ts-morph` / `web-tree-sitter`) to extract a JSON graph of files and imports. Feed that JSON into React Flow. | **100% Customizable.** Every node and edge in React Flow is a standard React component—you can style them with Tailwind CSS, add XP badges, lock/unlock states, or custom icons. |
| **3D Code City** *(replaces CodeCharta)* | **`three`** + **`@react-three/fiber`** (or `codecharta-visualization`) | While CodeCharta publishes `codecharta-visualization` on npm, building a lightweight 3D city in **React Three Fiber** using a treemap layout (`d3-hierarchy`) is much cleaner in Next.js. | **100% Customizable** in React Three Fiber (custom shaders, neon/dark palettes, camera fly-to animations per lesson). CodeCharta’s prebuilt UI is rigid to restyle. |
| **Function Flowcharts** *(replaces CodeVisualizer)* | **`mermaid`** or **`@xyflow/react`** + **`web-tree-sitter`** | Parse a single function's `if/else` and loop branches via Tree-sitter in WASM, convert to Mermaid syntax or React Flow nodes, and render interactively. | **High.** Mermaid supports custom `themeVariables` (colors, fonts, borders), while React Flow gives complete JSX control over every decision block. |
| **Git Evolution Replay** *(replaces Gource)* | **`d3-force`** + HTML5 `<canvas>` + **`isomorphic-git`** | Gource itself is a C++/OpenGL desktop binary with no web API. To recreate it in Next.js, use `isomorphic-git` to read commit history and animate a force-directed tree on `<canvas>`. | **100% Customizable.** Because you own the canvas draw loop, you control particle effects, avatar sprites, and color themes. |

*(Note: **GitDiagram** is also open-source and exposes an MCP server at `[https://gitdiagram.com/mcp](https://gitdiagram.com/mcp)`, though generating diagrams via your own LLM prompt + **React Flow** gives you far better visual control and interactive click handlers than static Mermaid SVGs.)*

---

### 2. Gamified Mechanics: Libraries for Next.js

* **Git Time-Travel ("Commit #1" Walkthroughs):**
* **Library:** **`isomorphic-git`** (pure JS Git implementation that works in Node.js API routes and in-browser with `LightningFS`) or the **GitHub REST/GraphQL API** (`GET /repos/{owner}/{repo}/commits`).
* **Design Control:** Complete—you fetch the commit snapshots and diffs as raw data, then render them in your own step-by-step lesson UI or diff viewer (like **`react-diff-viewer-continued`** or **`@monaco-editor/react`**).


* **"Break & Fix" Sabotage Quests (In-Browser Sandbox):**
* **Library:** **`@webcontainer/api`** (StackBlitz WebContainers) or **`@codesandbox/sandpack-react`**.
* **How It Works:** Both boot a real Node.js/React runtime directly inside the user's browser tab. Your course engine can programmatically inject a "bug" into a file in the virtual filesystem, show the broken live preview, and verify when the learner fixes it.
* **Design Control:** **Full.** You can hide the default Sandpack chrome and wire your own minimal editor + preview panes with custom Tailwind styling.


* **Trace One Button Click End-to-End (Guided Code Tour):**
* **Library:** **`@monaco-editor/react`** (VS Code's editor) + **`tree-sitter`**.
* **How It Works:** Use Monaco's Decorations API (`deltaDecorations`) to highlight the exact line where a click handler starts, dim unrelated lines, and animate a "step forward" pulse to the next function call across files as the user clicks *Next Step*.
* **Design Control:** **Full.** Monaco supports custom JSON themes, custom gutter icons, and floating React widgets anchored to specific lines of code.


---

### Recommended Architecture for Your Project

If you want the highest visual polish with the least friction in Next.js:

1. **Ingestion & Parsing:** Clone/fetch the repo via **`isomorphic-git`** or GitHub API → parse imports & ASTs with **`ts-morph`** (for JS/TS) or **`web-tree-sitter`** (multi-language).
2. **World Map View:** Render the repo structure in **`@xyflow/react`** (React Flow) styled as an interactive skill tree or node map where each node unlocks a lesson module.
3. **Interactive Quest View:** Embed **`@monaco-editor/react`** (for guided call-stack tracing) alongside **`@codesandbox/sandpack-react`** (for live "Break & Fix" coding challenges), all styled with your own CSS/Tailwind design system.


### Completed TODO items

- Removed Layers and Trace from the Architecture Map; Request step acknowledgements now
  highlight and persist progress.
- Removed the raw Mermaid diagram source from the map UI.
