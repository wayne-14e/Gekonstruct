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
Landing page, `/login`, branded 404 + error boundary, sticky header with account menu, XP
chip, footer.

**Ingestion — done (Phase 2).** The dashboard has a connect form (public GitHub URLs only)
and project cards with stage badges. `createProject` enforces the 3-project cap inside a
Firestore transaction and writes `project_created`. `/api/pipeline/ingest` reads the GitHub
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
allowed. `/projects/[id]/overview` renders the summary, an outside-in layer accordion (native
`<details>`, no client JS), the request flow, the concepts grid, GitHub-linked file chips and
the optional mermaid source.

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
`pending` session document, extracts keywords and matches the top-10 snapshot files using a
deterministic overlap function (path segments weighted +20/+10, bounded content frequency
counts), builds the `debug-v1` prompt over the matched code + guidebook summary, calls DeepSeek
with repair retry, audits every evidence file and backticked path against the snapshot, and writes
`projects/{pid}/debugSessions/{sid}` (`done`/`failed`) + `debug_created` event.
`/projects/[id]/debug` provides the symptom input form with quick suggestion chips and session
history. `/projects/[id]/debug/[sid]` renders the reported symptom, likely causes with confidence
badges and shiki `<CodeBlock>` evidence previews, concrete fix steps, a why-it-works concept
panel, Geko tip bubble, and client `<DebugQuiz>`. `completeDebugSession` re-grades the quiz on
the server (≥70%), writes progress `debug[sid] = { completed: true, at }`, awards 30 XP on first
pass, grants the `"bug-whisperer"` badge on the first completed debug session (written to both
`progress.badges` and `users/{uid}.badges`), and records `debug_completed` inside a single
Firestore transaction. The project hub ReadyPanel renders all three pathways.

Design system live (redesigned 2026-11-13): dark IDE surface (`#0b0f14`), Space Grotesk
for all UI + display with JetBrains Mono for labels, file paths and code (no serif/italic
anywhere), lime `#5be000` primary with chunky 3px-edge buttons, chameleon-skin gradient
reserved for the brand mark and XP moments,
`GekoMark`/`GekoBadge`/`GekoAvatar`/`SpeechBubble`.

Landing page is a signed-out-only surface: a centred hero (badge, display headline,
short subtitle, two CTAs, limits line) above a full-width sample-pipeline window with
mac-style red/yellow/green dots, followed by the pathways, how-it-works and closing CTA.
Signed-in visitors are redirected to `/dashboard`; signing out returns them to `/`.

Last verified: 2026-11-19 — `next build` green, `npx tsc --noEmit` green, `npm run lint`
green, `npm test` green (71/71). All 3 pathways (Architecture Map, Foundations Lessons,
Debug & Learn) functional end-to-end. Previously verified 2026-11-19: Foundations live run on
`wayne-14e/Verdict` (6 stored lessons, quiz grading, 20 XP + 50 bonus); 2026-11-18: architecture
on `wayne-14e/Verdict` (6 layers, 7 flow steps, 11 concepts, ~41s); 2026-11-13: live ingestion of
`shadcn-ui/taxonomy`, `firebase/quickstart-js` and `vercel/next-learn`.

### Build plan — executing phase by phase

| Phase | Milestone | Scope | Exit criteria |
|---|---|---|---|
| 0 | Bootstrap | Scaffold, design tokens, brand components, Firebase wiring, env, this doc | `next build` green; landing shell renders |
| 1 | M1 Auth & shell ✅ | Client Firebase auth + Google sign-in, session cookie via server action, `users/{uid}` bootstrap, landing, `/login`, `/dashboard` empty state, app header | Sign in → `/dashboard` shows empty state; signed-out `/dashboard` redirects to `/login` |
| 2 | M2 Ingestion ✅ | `createProject` (3-project cap), `/api/pipeline/ingest`, GitHub tree+contents, ingest filters/budget (unit-tested), stack detection (unit-tested), `snapshot/main`, `/projects/[id]` runner, project cards with stage badges | 3 real public repos ingest; `node_modules` never in snapshot; >300 KB skipped; unrecognizable stack fails with message |
| 3 | M3 Architecture ✅ | `/api/pipeline/architecture`, prompts module, zod schemas, repair retry, `guidebook` doc, `/overview` page (layers, data flow, concepts, file chips, optional mermaid) | guidebook passes zod on a real repo; overview renders real layers |
| 4 | M4 Foundations ✅ | `/api/pipeline/lessons1` + `lessons2`, `/learn` list + lesson page, shiki code blocks, `Quiz`, `completeLesson`, XP transaction, progress state | pass quiz → XP in `users/{uid}`; fail → no XP, retry allowed |
| 5 | M5 Debug ✅ | `/api/debug/run`, symptom form + session list, session page (causes/fix steps/whyItWorks/quiz), `completeDebugSession` | real symptom → evidence files that exist in the snapshot |
| 6 | M6 Polish | Badges, analytics events, `PipelineRunner` retry UX, error/empty states everywhere, rules deployed, Geko polish | full journey with zero console errors |
| 7 | M7 Validation | vitest green, `next build` green, `docs/TEST_PLAN.md` mapping events → §1 metrics | 5-tester checklist ready |

## Architecture Map

```
[Browser]
  Google sign-in (firebase client SDK) → ID token
  POST server action signIn(idToken) → httpOnly session cookie (admin SDK)
  createProject(repoUrl) server action → projects/{pid} (stage "created")
  POST /api/pipeline/ingest → snapshot + stack (stage "ingested")
  POST /api/pipeline/architecture → guidebook/main (stage "architecture")
  POST /api/pipeline/lessons1 → lessons part 1 (stage "lessons1")
  POST /api/pipeline/lessons2 → lessons part 2 (stage "ready" + lessonCount)
  completeLesson(projectId, lessonId, answers) server action → progress + XP transaction
  router.refresh() after each stage → server component re-renders progress
  POST /api/debug/run(symptom) → debugSessions/{sid} + debug_created event
  completeDebugSession(projectId, sid, answers) server action → progress + XP + bug-whisperer badge
[Next.js server]
  server actions: signIn, signOut, createProject, completeLesson, completeDebugSession
  route handlers: pipeline stages (idempotent, ≤60s), debug (/api/debug/run)
  lib: firebase/client (browser), firebase/admin (server), github, projects, debug, llm,
       prompts, lessons, quiz, domain/{project,architecture,lesson,progress,debug},
       pipeline/{ingest,stack,architecture,lessons,debug,debug-runner}
[Firestore]
  users/{uid}
  projects/{pid}
  projects/{pid}/{snapshot/main, events/{eid}, guidebook/main, lessons/{lid},
                 debugSessions/{sid}, progress/{uid}}
```

Routes as built: `/` (landing, signed-out only — a signed-in visitor is redirected to
`/dashboard`), `/login`, `/dashboard` (guarded in `src/app/(app)/layout.tsx`),
`/projects/[id]` (pipeline runner + guidebook hub or snapshot panel),
`/projects/[id]/overview` (architecture pathway), `/projects/[id]/learn` (Foundations list),
`/projects/[id]/learn/[lessonId]` (lesson + quiz), `/projects/[id]/debug` (debug symptom form + session list),
`/projects/[id]/debug/[sid]` (debug session walkthrough + quiz), `/api/pipeline/ingest`,
`/api/pipeline/architecture`, `/api/pipeline/lessons1`, `/api/pipeline/lessons2`,
`/api/debug/run` (all POST), `not-found`, `error`.

Key modules as built: `src/lib/firebase/{config,client,admin}.ts`, `src/lib/auth/{session,users}.ts`,
`src/lib/domain/{user,project,architecture,lesson,progress,debug}.ts`,
`src/lib/pipeline/{ingest,stack,ingest-runner,architecture,architecture-runner,
lessons,lessons-runner,lessons-route,debug,debug-runner}.ts`,
`src/lib/{github,projects,debug,llm,prompts,lessons,quiz,code-language}.ts`, `src/lib/nav.ts`,
`src/app/actions/{auth,projects,lessons,debug}.ts`,
`src/components/{brand,auth,app,projects}/*` (incl. `guidebook-parts.tsx`, `code-block.tsx`,
`lesson-markdown.tsx`, `quiz.tsx`, `debug-quiz.tsx`, `debug-symptom-form.tsx`), `scripts/dev-session.mjs` (dev-only cookie minter).

Auth boundary: browser keeps the Firebase client session (for realtime Firestore reads);
the server trusts only the httpOnly cookie, verified with `adminAuth().verifySessionCookie`.
Route handlers and server actions call `getCurrentUser()`; pages of the `(app)` group call
`requireUser()`.

Client/server boundary: server components by default; `"use client"` only for the sign-in
button, account menu, connect form, pipeline runner and quiz.

## Data Model

As built through Phase 4 (all timestamps are epoch **milliseconds**, not Firestore Timestamp):

- `users/{uid}` — `{ email, displayName, photoURL|null, totalXp: 0, badges: [], createdAt }`.
  Written inside a transaction: created once on first sign-in, afterwards only
  `email`/`displayName`/`photoURL` refresh, so XP and badges can never be reset by a login.
  `totalXp` is incremented only inside `completeLesson`'s transaction.
- `projects/{pid}` — `{ ownerUid, repoUrl, owner, repo, title, stage, stageError: string|null,
  stack: Stack|null, createdAt, updatedAt, lessonCount }`. Created by `createProject` inside a
  transaction that re-counts the owner's projects (cap 3). Stage values: `created`,
  `ingested`, `architecture`, `lessons1`, `lessons2`, `ready`, `failed:{ingested|architecture|
  lessons1|lessons2}`. Only route handlers advance it. `lessons2` writes `ready` directly
  (BLUEPRINT §8), so the `lessons2` stage remains legal but is never persisted.
- `projects/{pid}/snapshot/main` — `{ files: [{ path, size, content }], fetchedAt, totalChars,
  truncated: string[] }`. **Deviation:** the blueprint writes `projects/{pid}/snapshot`; Firestore
  needs a document id, so singleton docs use `main` (same for `guidebook/main`).
- `projects/{pid}/events/{eid}` — `{ type, at, meta }`. `project_created`, `stage_completed`
  (ingest, architecture, lessons1, lessons2), `analysis_ready`, `quiz_passed`,
  `quiz_failed` and `pathway_completed` are written today.
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
  pathwayBonusAwarded: boolean }`. **Deviation:** `pathwayBonusAwarded` is extra so the +50
  completion bonus is paid exactly once across retakes.
- `projects/{pid}/debugSessions/{sid}` — `{ id, projectId, symptom, status: 'pending'|'done'|'failed',
  error: string|null, likelyCauses: [{ cause, evidenceFiles[], confidence: 'high'|'medium'|'low' }],
  fixSteps: string[], whyItWorks: { concept, explanation }, quiz: [{ question, options[], correctIndex, why }],
  gekoTip: string, xp: 30, createdAt, analyzedAt, model, promptVersion }`, validated by
  `DebugSessionDocSchema`. Created as `pending` on `/api/debug/run`, updated to `done` or `failed`.
  `evidenceFiles` always contain real snapshot paths.

## Env & Secrets

Names only; values live in `.env.local` (gitignored) and the host dashboard.

| Name | Where used |
|---|---|
| `NEXT_PUBLIC_APP_URL` | metadata base, auth redirect sanity |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | browser Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | server only — firebase-admin credential, one-line JSON |
| `DEEPSEEK_API_KEY` | server only — `src/lib/llm.ts` (architecture, lessons, and debug stages), sent to `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | optional model override, default `deepseek-flash` (DeepSeek-V4.1-Flash) |
| `DEEPSEEK_BASE_URL` | optional endpoint override, default `https://api.deepseek.com` |
| `GITHUB_TOKEN` | optional, raises GitHub anonymous limit 60 req/h (used by `src/lib/github.ts`) |

Local secret file `.secrets/firebase-service-account.json` is gitignored; `.env.local` holds
the same JSON on one line for the app.

## Prompts

Prompts live in `src/lib/prompts.ts` only. Version constant + last change:

| Version | Stage | Last changed | Notes |
|---|---|---|---|
| `architecture-v1` | architecture | 2026-11-18 | System rules (plain English, real paths, JSON only, Geko voice) + user prompt built from stack, the exact allowed path list and the snapshot contents (150k-char budget; omitted files are named). Demands 3–7 layers, 4–8 flow steps and 5–12 concepts. |
| `lessons-v1` | lessons1 / lessons2 | 2026-11-19 | One system prompt, one builder with a `part` switch. Part 1 asks 3–5 opening lessons; part 2 receives the stored part-1 titles/goals/ids and asks for the remainder (2–5) so the pathway totals 6–10 and ends with “how to debug here”. Demands 250–500-word markdown explains with ≥2 distinct real paths, 1–4 real codeRefs, Geko tip and 2–3 codebase-specific quiz questions. Snapshot budget 120k chars; omitted files are named. |
| `debug-v1` | debug | 2026-11-19 | System rules + user prompt built from stack, guidebook architecture summary, user symptom text, allowed snapshot paths, and the top-10 keyword-matched file contents (80k budget; omitted files are named). Demands 2–3 likely causes with real evidenceFiles, 3–7 concrete fix steps naming real paths, whyItWorks fundamental concept explanation, 1–2 codebase-specific quiz questions, and a Geko tip. |

Every prompt change = version bump + this table + a Decisions Log entry.

## Decisions Log

Append-only. Newest last.

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

## Change Log

Newest last.

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
- **`lesson_viewed` is not recorded.** The quiz events and `pathway_completed` are written, but
  the view event listed in BLUEPRINT §13 waits for M6 instrumentation.
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
- **The overview fires no analytics yet.** `overview_section_viewed` and the `map-reader`
  badge land with M6 instrumentation (BLUEPRINT §13).
- **Mermaid is shown as source, not rendered.** The stored flowchart opens in a collapsed
  `<pre>`; diagram rendering is Backlog polish.
- **There is no project hub nav yet.** The map and the Foundations pathway are linked from
  the project page and from each other; a shared `Map / Learn / Debug` hub lands with M6.

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
- **Project hub navigation** (`Map / Learn / Debug`) and the `map-reader` badge event, both
  scheduled with M6.
- **Revisit quiz pass arithmetic** once tester feedback exists: with 2–3 questions a 70% pass
  means 2 of 2 or 3 of 3, so a single miss fails a lesson. Either ask for 4 questions or treat
  2 of 3 as a pass.
- **`lesson_viewed` instrumentation** alongside the other M6 events.
- **Reduce architecture prompt cost/latency** if testers connect very large repos: per-file
  budget for prose-heavy files, or split the call into "layers" and "concepts".
- **Cache the built prompt** (or the raw model answer) per snapshot so a failed repair does
  not pay for the full input twice.
