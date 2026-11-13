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

LLM access is pointed at DeepSeek's OpenAI-compatible API: the `openai` SDK with
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-flash` (DeepSeek-V4.1-Flash) and
`DEEPSEEK_BASE_URL=https://api.deepseek.com`. No model call is written yet — the architecture
stage is Phase 3.

Design system live (redesigned 2026-11-13): dark IDE surface (`#0b0f14`), Space Grotesk
for all UI + display with JetBrains Mono for labels, file paths and code (no serif/italic
anywhere), lime `#5be000` primary with chunky 3px-edge buttons, chameleon-skin gradient
reserved for the brand mark and XP moments,
`GekoMark`/`GekoBadge`/`GekoAvatar`/`SpeechBubble`.

Landing page is a signed-out-only surface: a centred hero (badge, display headline,
short subtitle, two CTAs, limits line) above a full-width sample-pipeline window with
mac-style red/yellow/green dots, followed by the pathways, how-it-works and closing CTA.
Signed-in visitors are redirected to `/dashboard`; signing out returns them to `/`.

Last verified: 2026-11-13 — `next build` green, `npx tsc --noEmit` green, `npm run lint`
green, `npm test` green (26/26), dashboard + project pages rendered for a real session
cookie, no console errors at 1440px or 390px. Live ingestion: `shadcn-ui/taxonomy`,
`firebase/quickstart-js` and `vercel/next-learn` each kept 60 files with no excluded paths
and no stored content over 12,000 chars; `octocat/Hello-World` failed with the friendly
stack message; the 3-project cap disabled the form. Hero verified centred at 1440px and
390px (h1 centre = viewport centre, no horizontal scroll); signed-in `/` and `/login`
redirect to `/dashboard`; sign-out lands on `/` with the session cookie cleared.

### Build plan — executing phase by phase

| Phase | Milestone | Scope | Exit criteria |
|---|---|---|---|
| 0 | Bootstrap | Scaffold, design tokens, brand components, Firebase wiring, env, this doc | `next build` green; landing shell renders |
| 1 | M1 Auth & shell ✅ | Client Firebase auth + Google sign-in, session cookie via server action, `users/{uid}` bootstrap, landing, `/login`, `/dashboard` empty state, app header | Sign in → `/dashboard` shows empty state; signed-out `/dashboard` redirects to `/login` |
| 2 | M2 Ingestion ✅ | `createProject` (3-project cap), `/api/pipeline/ingest`, GitHub tree+contents, ingest filters/budget (unit-tested), stack detection (unit-tested), `snapshot/main`, `/projects/[id]` runner, project cards with stage badges | 3 real public repos ingest; `node_modules` never in snapshot; >300 KB skipped; unrecognizable stack fails with message |
| 3 | M3 Architecture | `/api/pipeline/architecture`, prompts module, zod schemas, repair retry, `guidebook` doc, `/overview` page (layers, data flow, concepts, file chips, optional mermaid) | guidebook passes zod on a real repo; overview renders real layers |
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
  router.refresh() after a stage → server component re-renders progress
  POST /api/pipeline/{architecture|lessons1|lessons2}, /api/debug/run (planned)
[Next.js server]
  server actions: signIn, signOut, createProject, completeLesson, completeDebugSession
  route handlers: pipeline stages (idempotent, ≤60s), debug
  lib: firebase/client (browser), firebase/admin (server), github, projects,
       pipeline/{ingest,stack,ingest-runner}, prompts, schemas
[Firestore]
  users/{uid}
  projects/{pid}
  projects/{pid}/{snapshot/main, events/{eid}, guidebook/main, lessons/{lid},
                 debugSessions/{sid}, progress/{uid}}
```

Routes as built: `/` (landing, signed-out only — a signed-in visitor is redirected to
`/dashboard`), `/login`, `/dashboard` (guarded in `src/app/(app)/layout.tsx`),
`/projects/[id]` (ingest runner + snapshot), `/api/pipeline/ingest` (POST),
`not-found`, `error`.
Planned: `/projects/[id]/{overview,learn,debug}` (Phases 3–5), `/api/pipeline/{architecture,
lessons1,lessons2}`, `/api/debug/run`.

Key modules as built: `src/lib/firebase/{config,client,admin}.ts`, `src/lib/auth/{session,users}.ts`,
`src/lib/domain/{user,project}.ts`, `src/lib/pipeline/{ingest,stack,ingest-runner}.ts`,
`src/lib/github.ts`, `src/lib/projects.ts`, `src/lib/nav.ts`,
`src/app/actions/{auth,projects}.ts`, `src/components/{brand,auth,app,projects}/*`,
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
- `projects/{pid}/events/{eid}` — `{ type, at, meta }`. `project_created` and
  `stage_completed` are written today.
- `projects/{pid}/{guidebook,lessons/{lid},debugSessions/{sid},progress/{uid}}` — not yet
  written (Phases 3–6).

## Env & Secrets

Names only; values live in `.env.local` (gitignored) and the host dashboard.

| Name | Where used |
|---|---|
| `NEXT_PUBLIC_APP_URL` | metadata base, auth redirect sanity |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | browser Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | server only — firebase-admin credential, one-line JSON |
| `DEEPSEEK_API_KEY` | server only — pipeline + debug (Phase 3+), sent to `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | optional model override, default `deepseek-flash` (DeepSeek-V4.1-Flash) |
| `DEEPSEEK_BASE_URL` | optional endpoint override, default `https://api.deepseek.com` |
| `GITHUB_TOKEN` | optional, raises GitHub anonymous limit 60 req/h (used by `src/lib/github.ts`) |

Local secret file `.secrets/firebase-service-account.json` is gitignored; `.env.local` holds
the same JSON on one line for the app.

## Prompts

None yet (Phase 3+). `src/lib/prompts.ts` arrives in Phase 3 (architecture prompt v1), Phase 4
(lessons v1), Phase 5 (debug v1). Every prompt change = version bump + Decisions Log entry.

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

## Change Log

Newest last.

- **2026-11-13 — Phase 0: scaffold + design system + Firebase wiring.**
  Files: `package.json`, `src/app/globals.css`, `src/app/layout.tsx`,
  `src/components/brand/{geko-mark,geko-avatar,logo,speech-bubble}.tsx`, `src/app/icon.svg`,
  `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `.env.example`.
  Verify: `npm run build` → visit `/`; the Geko badge + wordmark render; `firebase projects:list`
  shows `gekonstruct-14174` active.
  Why: everything later needs tokens, brand components and a working Firebase target.

- **2026-11-13 — Phase 1: auth, session cookie, landing, dashboard, shell.**
  Files: `src/lib/firebase/{config,client,admin}.ts`, `src/lib/auth/{session,users}.ts`,
  `src/lib/domain/user.ts`, `src/lib/nav.ts` (+ `.test.ts`), `src/app/actions/auth.ts`,
  `src/components/auth/google-sign-in-button.tsx`, `src/components/app/{app-header,user-menu,
  site-footer,xp-badge}.tsx`, `src/app/{page,not-found,error}.tsx`,
  `src/app/(auth)/login/page.tsx`, `src/app/(app)/layout.tsx`,
  `src/app/(app)/dashboard/{page,loading}.tsx`, `src/components/ui/*` (sizing overrides),
  `vitest.config.mts`, `scripts/{_admin,dev-session}.mjs`, `firestore.rules` (deployed).
  Why: nothing else can ship without identity + a shell.
  Verify by hand: `npm run dev` → open `http://localhost:3000` → hero renders, mark animates,
  no horizontal scroll at 390px → click “Sign in with Google” → consent popup → land on
  `/dashboard` with `0 XP` and the empty state → open the avatar menu → “Sign out” → back to
  `/` → visit `/dashboard` while signed out → redirected to `/login?next=…`.
  Verify without Google: `node scripts/dev-session.mjs qa-tester > /tmp/c.json`, then use the
  `sessionCookie` as the `geko_session` cookie (Playwright does this in the QA script).

- **2026-11-13 — Visual redesign: dark JetBrains × Duolingo system (no phase advance).**
  Files: `src/app/globals.css` (tokens, `label-mono`, `skin-gradient`, `path-chip`,
  `field-grid`, rise/drift/pop keyframes), `src/app/layout.tsx` (Space Grotesk + JetBrains
  Mono, dark viewport), `src/components/ui/{button,card,input,textarea,badge,skeleton,
  sonner}.tsx`, `src/components/brand/{geko-avatar,logo,speech-bubble}.tsx`,
  `src/components/app/{app-header,site-footer,xp-badge}.tsx`, `src/app/page.tsx` (landing
  rewrite with terminal pipeline card), `src/app/(auth)/login/page.tsx`,
  `src/app/(app)/dashboard/page.tsx`, `src/app/{not-found,error}.tsx`,
  `package.json` (drop `next-themes`).
  Why: user asked for a darker developer-tool look in one pass, without moving to Phase 2.
  Verify: `npm run dev` → `/` at 1440px shows the full-width "You vibe-coded it. / Now own
  it." hero, pathway cards and 2×2 steps, closing CTA; `/login` shows the account card +
  Geko bubble; sign in (or `scripts/dev-session.mjs`) → `/dashboard` shows the XP chip and
  empty state; `/definitely-not-a-page` shows the branded 404. Check 390px for no horizontal
  scroll. `npx tsc --noEmit`, `npm run lint`, `npm run test` (3/3) and `npm run build` green.

- **2026-11-13 — Phase 2: ingestion, stack detection, project cards, runner.**
  Files: `src/lib/domain/project.ts`, `src/lib/pipeline/{ingest,stack,ingest-runner}.ts`
  (+ `.test.ts` for the pure modules), `src/lib/github.ts`, `src/lib/projects.ts`,
  `src/app/actions/projects.ts`, `src/app/api/pipeline/ingest/route.ts`,
  `src/components/projects/{connect-repo-form,pipeline-runner,stage-badge}.tsx`,
  `src/app/(app)/dashboard/{page,loading}.tsx`, `src/app/(app)/projects/[id]/page.tsx`.
  Why: ingestion is the gate every pathway sits behind; nothing else can ship without a
  real snapshot and a known stack.
  Verify: `npm run dev` → sign in → `/dashboard` → paste
  `https://github.com/shadcn-ui/taxonomy` → “Connect repo” → project page → “Start
  ingestion” → after ~10 s the panel shows 60 files, the detected stack and the file list.
  Connect two more repos; the form disables at 3/3. A README-only repo
  (`octocat/Hello-World`) fails with “We couldn't recognize the stack…” and a retry button.
  Check `snapshot/main` in Firestore: no `node_modules`, lockfiles, `.env*`, binaries or
  stored content over 12,000 chars.
  Verified 2026-11-13 with Playwright: taxonomy 60 files / 126.4k chars / 1 truncated;
  quickstart-js 60 / 146.0k / 1; next-learn 60 / 54.7k / 0; Hello-World failed with the
  stack message; no console errors desktop or 390px; `tsc`, lint, 26/26 tests and build green.

- **2026-11-13 — Landing hero recentred, sample window enlarged, header nav centred.**
  Files: `src/app/page.tsx`, `src/components/app/app-header.tsx`.
  Why: the hero read as a left-aligned marketing split; the user wanted one centred column
  with the preview as the focal point, and the header nav visually centred.
  What: badge → h1 → shortened subtitle → CTA row → limits line, all centred with the h1
  exactly on the viewport centre; the sample pipeline window is now full width beneath,
  split into command/pipeline and Geko commentary, with mac-style red/yellow/green dots;
  `AppHeader` uses a `1fr auto 1fr` grid at `sm+` so nav links sit at the true centre while
  the logo and account stay at the edges (flex fallback keeps Sign in right on mobile).
  Signed-in visitors are redirected from `/` to `/dashboard`; sign-out returns to `/`.
  Verify: sign out, open `/` at 1440px — h1 is centred, the only horizontal list is above
  the window, the window spans the container, dots are red/yellow/green. Sign in, visit
  `/` — you land on `/dashboard`; sign out — you land on `/` and `/dashboard` bounces to
  `/login`. Keyboard-check the header nav. Verified 2026-11-13 with Playwright at 1440px and
  390px: h1 boxes centred (x+w/2 = 720 and 195), no horizontal scroll, no console errors,
  signed-in `/` and `/login` both 307 to `/dashboard`, sign-out clears `geko_session`.
  `npx tsc --noEmit`, `npm run lint`, `npm test` (26/26) and `npm run build` green.

- **2026-11-13 — LLM credentials/config moved from Anthropic to DeepSeek.**
  Files: `package.json`, `package-lock.json`, `.env.example` (and the local, gitignored
  `.env.local`), `PROJECT_CONTEXT.md`. `BLUEPRINT.md` intentionally unchanged.
  Why: the user will use a DeepSeek API key with DeepSeek-V4.1-Flash.
  What: `@anthropic-ai/sdk` out, `openai` in (DeepSeek's documented Node client);
  `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` became `DEEPSEEK_API_KEY` /
  `DEEPSEEK_MODEL=deepseek-flash` / optional `DEEPSEEK_BASE_URL=https://api.deepseek.com`.
  No model call was added — Phase 3 is still not started.
  Verify: `npm ls openai` resolves and `npm ls @anthropic-ai/sdk` is empty; `grep -ri
  anthropic src` returns nothing; `.env.local` exposes `DEEPSEEK_*` keys with the API key
  blank until the user pastes it. Then `npx tsc --noEmit`, `npm run lint`, `npm test`
  (26/26) and `npm run build` are green.

## Known Issues

- **`DEEPSEEK_API_KEY` is still blank.** Phase 3 (the architecture stage) cannot make a
  model call until the user pastes the DeepSeek key into `.env.local`. The SDK and env
  names are wired; no LLM request exists yet.

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
- **The runner only executes the ingest stage.** `/projects/[id]` shows the three later steps
  as disabled placeholders (Phases 3–5). Snapshot stats are read once per server render;
  there is no realtime listener yet.
- **A project cannot be removed.** The 3-project cap counts every project, including ones
  stuck in `failed:*`, so a QA account that fails three times is locked out of connecting
  more repos. Removal/reconnect ships with the project settings entry (see Backlog).
- Landing page copy describes pathways that are not yet clickable (Phases 3–5).
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
