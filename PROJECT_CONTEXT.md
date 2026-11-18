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
Firestore transaction and writes `project_created`. `/api/pipeline/ingest` reads
`repos/{owner}/{repo}/git/trees/HEAD?recursive=1`, drops node_modules/build output,
lockfiles, `.env*`, binaries and blobs over 300 KB, selects up to 60 files / 150k chars by
the blueprint priority order, truncates files to 12k (head+tail marker), detects the stack
deterministically, then writes `snapshot/main`, the stack, stage `ingested` and a
`stage_completed` event. `/projects/[id]` runs the ingest step and, afterwards, shows the
snapshot stats, file list and detected stack. Failures store `failed:ingested` +
`stageError` and the UI offers a retry.

LLM access is DeepSeek's OpenAI-compatible API: the `openai` SDK with
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-flash` (DeepSeek-V4.1-Flash) and
`DEEPSEEK_BASE_URL=https://api.deepseek.com`. Pipeline calls disable DeepSeek thinking mode
for a predictable, temperature-honouring JSON answer inside the 60s stage budget. BLUEPRINT
§3/§12 still name Anthropic; the 2026-11-13 DeepSeek decision below is authoritative and the
user has updated §4's diagram to DeepSeek.

**Architecture map — done (Phase 3).** `/projects/[id]` runs ingest → architecture
sequentially behind one button. `/api/pipeline/architecture` builds a prompt from the stored
snapshot + stack, asks DeepSeek for JSON, validates it with zod and against the real
snapshot paths, then writes `guidebook/main` with provenance (`model`, `promptVersion`).
One repair retry is allowed; a second failure stores `failed:architecture`. `/projects/[id]/overview`
renders the summary, an outside-in layer accordion (native `<details>`, no client JS), the
request flow, the concepts grid, GitHub-linked file chips and the optional mermaid source.

Design system live (redesigned 2026-11-13): dark IDE surface (`#0b0f14`), Space Grotesk
for all UI + display with JetBrains Mono for labels, file paths and code (no serif/italic
anywhere), lime `#5be000` primary with chunky 3px-edge buttons, chameleon-skin gradient
reserved for the brand mark and XP moments,
`GekoMark`/`GekoBadge`/`GekoAvatar`/`SpeechBubble`.

Landing page is a signed-out-only surface: a centred hero (badge, display headline,
short subtitle, two CTAs, limits line) above a full-width sample-pipeline window with
mac-style red/yellow/green dots, followed by the pathways, how-it-works and closing CTA.
Signed-in visitors are redirected to `/dashboard`; signing out returns them to `/`.

Last verified: 2026-11-18 — `next build` green, `npx tsc --noEmit` green, `npm run lint`
green, `npm test` green (44/44). Live architecture run: `wayne-14e/Verdict`
(36 files / 131,674 chars) produced a guidebook with 6 layers, 7 flow steps, 11 concepts
and a mermaid source in 2 attempts / ~41s; every file chip and every path cited in prose
exists in the snapshot. `/projects/[id]` showed “Your map is ready”; `/overview` rendered
at 1440px and 390px (no horizontal scroll, 7 `<details>`, zero console/page errors);
signed-out `/overview` 307s to `/login`; the architecture route returns 401 without a
cookie, 404 for another owner's project and 400 for an empty body. Previously verified
2026-11-13: live ingestion of `shadcn-ui/taxonomy`, `firebase/quickstart-js` and
`vercel/next-learn`; `octocat/Hello-World` failed with the friendly stack message; the
3-project cap disabled the form; hero centred at 1440px and 390px; signed-in `/` and
`/login` redirect to `/dashboard`; sign-out lands on `/` with the session cookie cleared.

### Build plan — executing phase by phase

| Phase | Milestone | Scope | Exit criteria |
|---|---|---|---|
| 0 | Bootstrap | Scaffold, design tokens, brand components, Firebase wiring, env, this doc | `next build` green; landing shell renders |
| 1 | M1 Auth & shell ✅ | Client Firebase auth + Google sign-in, session cookie via server action, `users/{uid}` bootstrap, landing, `/login`, `/dashboard` empty state, app header | Sign in → `/dashboard` shows empty state; signed-out `/dashboard` redirects to `/login` |
| 2 | M2 Ingestion ✅ | `createProject` (3-project cap), `/api/pipeline/ingest`, GitHub tree+contents, ingest filters/budget (unit-tested), stack detection (unit-tested), `snapshot/main`, `/projects/[id]` runner, project cards with stage badges | 3 real public repos ingest; `node_modules` never in snapshot; >300 KB skipped; unrecognizable stack fails with message |
| 3 | M3 Architecture ✅ | `/api/pipeline/architecture`, prompts module, zod schemas, repair retry, `guidebook` doc, `/overview` page (layers, data flow, concepts, file chips, optional mermaid) | guidebook passes zod on a real repo; overview renders real layers |
| 4 | M4 Foundations | `/api/pipeline/lessons1` + `lessons2`, `/learn` list + lesson page, shiki code blocks, `Quiz`, `completeLesson`, XP transaction, progress state | pass quiz → XP in `users/{uid}`; fail → no XP, retry allowed |
| 5 | M5 Debug | `/api/debug/run`, symptom form + session list, session page (causes/fix steps/whyItWorks/quiz), `completeDebugSession` | real symptom → evidence files that exist in the snapshot |
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
  router.refresh() after each stage → server component re-renders progress
  POST /api/pipeline/{lessons1|lessons2}, /api/debug/run (planned)
[Next.js server]
  server actions: signIn, signOut, createProject, completeLesson, completeDebugSession
  route handlers: pipeline stages (idempotent, ≤60s), debug
  lib: firebase/client (browser), firebase/admin (server), github, projects, llm,
       prompts, domain/{project,architecture}, pipeline/{ingest,stack,architecture}
[Firestore]
  users/{uid}
  projects/{pid}
  projects/{pid}/{snapshot/main, events/{eid}, guidebook/main, lessons/{lid},
                 debugSessions/{sid}, progress/{uid}}
```

Routes as built: `/` (landing, signed-out only — a signed-in visitor is redirected to
`/dashboard`), `/login`, `/dashboard` (guarded in `src/app/(app)/layout.tsx`),
`/projects/[id]` (pipeline runner + map-ready or snapshot panel),
`/projects/[id]/overview` (architecture pathway), `/api/pipeline/ingest` (POST),
`/api/pipeline/architecture` (POST), `not-found`, `error`.
Planned: `/projects/[id]/{learn,debug}`, `/api/pipeline/{lessons1,lessons2}`, `/api/debug/run`.

Key modules as built: `src/lib/firebase/{config,client,admin}.ts`, `src/lib/auth/{session,users}.ts`,
`src/lib/domain/{user,project,architecture}.ts`, `src/lib/pipeline/{ingest,stack,ingest-runner,
architecture,architecture-runner}.ts`, `src/lib/{github,projects,llm,prompts}.ts`, `src/lib/nav.ts`,
`src/app/actions/{auth,projects}.ts`,
`src/components/{brand,auth,app,projects}/*` (incl. `guidebook-parts.tsx`),
`scripts/dev-session.mjs` (dev-only cookie minter).

Auth boundary: browser keeps the Firebase client session (for realtime Firestore reads);
the server trusts only the httpOnly cookie, verified with `adminAuth().verifySessionCookie`.
Route handlers and server actions call `getCurrentUser()`; pages of the `(app)` group call
`requireUser()`.

Client/server boundary: server components by default; `"use client"` only for the sign-in
button, account menu, connect form, pipeline runner, and (later) quiz, mermaid.

## Data Model

As built through Phase 2 (all timestamps are epoch **milliseconds**, not Firestore Timestamp):

- `users/{uid}` — `{ email, displayName, photoURL|null, totalXp: 0, badges: [], createdAt }`.
  Written inside a transaction: created once on first sign-in, afterwards only
  `email`/`displayName`/`photoURL` refresh, so XP and badges can never be reset by a login.
- `projects/{pid}` — `{ ownerUid, repoUrl, owner, repo, title, stage, stageError: string|null,
  stack: Stack|null, createdAt, updatedAt, lessonCount }`. Created by `createProject` inside a
  transaction that re-counts the owner's projects (cap 3). Stage values: `created`,
  `ingested`, `architecture`, `lessons1`, `lessons2`, `ready`, `failed:{ingested|architecture|
  lessons1|lessons2}`. Only route handlers advance it.
- `projects/{pid}/snapshot/main` — `{ files: [{ path, size, content }], fetchedAt, totalChars,
  truncated: string[] }`. **Deviation:** the blueprint writes `projects/{pid}/snapshot`; Firestore
  needs a document id, so singleton docs use `main` (same for `guidebook/main` later).
- `projects/{pid}/events/{eid}` — `{ type, at, meta }`. `project_created`, `stage_completed`
  (ingest and architecture) and `analysis_ready` are written today.
- `projects/{pid}/guidebook/main` — the architecture map, validated by `GuidebookDocSchema`:
  `{ summary: { whatItDoes, plainSummary, gekoIntro },
     architecture: { layers: [{ id, name, purpose, files[], plainExplanation }],
                     dataFlow: [{ from, to, whatHappens }], mermaid: string|null },
     concepts: [{ id, term, plainDefinition, files[], whyItMatters }],
     analyzedAt, model, promptVersion }`.
  **Deviation:** `model` and `promptVersion` are extra provenance fields (see Decisions Log).
  `files` always contain real snapshot paths; ids are slugs and unique per list.
- `projects/{pid}/{lessons/{lid},debugSessions/{sid},progress/{uid}}` — not yet
  written (Phases 4–6).

## Env & Secrets

Names only; values live in `.env.local` (gitignored) and the host dashboard.

| Name | Where used |
|---|---|
| `NEXT_PUBLIC_APP_URL` | metadata base, auth redirect sanity |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | browser Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | server only — firebase-admin credential, one-line JSON |
| `DEEPSEEK_API_KEY` | server only — `src/lib/llm.ts` (architecture stage today; lessons/debug later), sent to `https://api.deepseek.com` |
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

`lessons-v1` (Phase 4) and `debug-v1` (Phase 5) are not written yet. Every prompt change =
version bump + this table + a Decisions Log entry.

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

## Change Log

Newest last.

- **2026-11-18 — Phase 3: architecture stage, guidebook doc, overview page.**
  Files: `src/lib/domain/architecture.ts`, `src/lib/prompts.ts`, `src/lib/llm.ts`,
  `src/lib/pipeline/{architecture,architecture-runner}.ts` (+ `architecture.test.ts`),
  `src/lib/projects.ts`, `src/app/api/pipeline/architecture/route.ts`,
  `src/app/(app)/projects/[id]/{page.tsx,overview/page.tsx}`,
  `src/components/projects/{pipeline-runner,guidebook-parts}.tsx`, `PROJECT_CONTEXT.md`.
  Why: the Architecture pathway is the first thing a vibe-coder needs — a plain-English map of
  a repo they don't fully understand — and every later lesson reuses this guidebook.
  What: `architecture-v1` prompt (stack + exact path list + snapshot contents, capped at 150k
  chars); `requestStructured` calls DeepSeek in JSON mode with thinking disabled, parses the
  object, validates it with zod + snapshot-path rules, and allows one repair retry before the
  stage fails. File refs are filtered to real snapshot paths, invented prose paths are rejected,
  counts are clamped to 3–7 layers / 4–8 steps / 5–12 concepts, ids are slugged and de-duped,
  and mermaid is kept only if it is a real `flowchart`/`graph` source. The route stores
  `guidebook/main` (+ `model`, `promptVersion`, `analyzedAt`), moves the project to
  `architecture`, and writes `stage_completed` + `analysis_ready` events in one batch.
  `PipelineRunner` now runs ingest → architecture sequentially and derives the next step from
  `stage` + `hasSnapshot`; the project page shows a map-ready panel with a CTA; `/overview`
  renders the Geko intro, summary, layer `<details>` accordion, numbered request flow, concept
  grid, GitHub-linked file chips and the diagram source. Error/empty states cover missing maps,
  failed stages, missing snapshots and another user's project.
  Verify: `npm run dev` → sign in → open a project that has been ingested → “Build the
  architecture map” → both steps finish and the page shows “Your map is ready” → “Open the
  architecture map” → layers expand, flow steps cite files, chips link to
  `github.com/{owner}/{repo}/blob/HEAD/{path}`, and the diagram source expands. Resize to 390px:
  no horizontal scroll. Check Firestore `projects/{pid}/guidebook/main` has real paths only and
  `projects/{pid}.stage === "architecture"`. Re-POST the route to confirm it overwrites its own
  output. Signed-out `/overview` redirects to `/login`; the route returns 401 without a cookie,
  404 for another owner and 409 after a later stage has run.
  Verified 2026-11-18 on `wayne-14e/Verdict` (36 files / 131,674 chars): 6 layers, 7 flow steps,
  11 concepts, mermaid source, 2 attempts, ~41s; `/overview` at 1440px and 390px with zero
  console errors; `tsc`, lint, 44/44 tests and `next build` green.

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
- **2026-11-13 — Landing hero recentred:** full-width sample window, centred header nav, signed-in
  `/` redirects to `/dashboard`.
- **2026-11-13 — LLM config Anthropic → DeepSeek:** `openai` SDK and `DEEPSEEK_*` env (no call yet).
- **2026-11-16 — Vercel warnings:** `engines.node` pinned to `22.x`, `allowScripts`, `.npmrc`
  `loglevel=error`.

## Known Issues

- **FIXED 2026-11-18 — `DEEPSEEK_API_KEY` was blank.** The key is configured and the
  architecture stage makes a real model call (see Change Log 2026-11-18).
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
- **The guidebook is reachable only from the project page.** There is no project hub nav
  (`Map / Learn / Debug`) until M6; `/overview` links back to the project.

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
- **FIXED 2026-11-18 — The runner only executed the ingest stage.** It now runs
  ingest → architecture sequentially; lessons and debug remain disabled placeholders
  (Phases 4–5).
- **Stage progress still uses `router.refresh()`, not `onSnapshot`.** Snapshot and guidebook
  stats are read once per server render; the realtime listener stays Backlog until more
  stages need streaming progress.
- **A project cannot be removed.** The 3-project cap counts every project, including ones
  stuck in `failed:*`, so a QA account that fails three times is locked out of connecting
  more repos. Removal/reconnect ships with the project settings entry (see Backlog).
- Landing page copy describes the lessons and debug pathways before they are clickable
  (Phases 4–5); the architecture map is live.
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
- **Reduce architecture prompt cost/latency** if testers connect very large repos: per-file
  budget for prose-heavy files, or split the call into "layers" and "concepts".
- **Cache the built prompt** (or the raw model answer) per snapshot so a failed repair does
  not pay for the full input twice.
