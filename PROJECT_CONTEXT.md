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

**Phase 1 — Auth & shell: done.** Signed-in users reach `/dashboard`; visitors are
redirected to `/login`. Google sign-in (client popup) → `signInAction` verifies the ID token,
provisions `users/{uid}`, sets an httpOnly `geko_session` cookie (14 days) and refreshes the
route. Landing page, `/login`, `/dashboard` empty state, branded 404 + error boundary, sticky
header with account menu, XP chip, footer. Firestore rules deployed to
`gekonstruct-14174`. Design system live: Fraunces display + Geist body + JetBrains Mono,
paper/canopy tokens, `GekoMark`/`GekoBadge`/`GekoAvatar`/`SpeechBubble`.
Last verified: 2026-11-13 — `next build` green, `npx tsc --noEmit` green, `npm test` green
(3/3), rules compiled + released, dashboard rendered for a real session cookie, no console
errors on `/`, `/login`, `/dashboard`.

### Build plan — executing phase by phase

| Phase | Milestone | Scope | Exit criteria |
|---|---|---|---|
| 0 | Bootstrap | Scaffold, design tokens, brand components, Firebase wiring, env, this doc | `next build` green; landing shell renders |
| 1 | M1 Auth & shell ✅ | Client Firebase auth + Google sign-in, session cookie via server action, `users/{uid}` bootstrap, landing, `/login`, `/dashboard` empty state, app header | Sign in → `/dashboard` shows empty state; signed-out `/dashboard` redirects to `/login` |
| 2 | M2 Ingestion | `createProject` (3-project cap), `/api/pipeline/ingest`, GitHub tree+contents, ingest filters/budget (unit-tested), stack detection (unit-tested), `snapshot` doc, project card stage badges | 3 real public repos ingest; `node_modules` never in snapshot; >300 KB skipped; unrecognizable stack fails with message |
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
  onSnapshot(project)  → pipeline progress
  POST /api/pipeline/{ingest|architecture|lessons1|lessons2}, /api/debug/run
[Next.js server]
  server actions: signIn, signOut, createProject, completeLesson, completeDebugSession
  route handlers: pipeline stages (idempotent, ≤60s), debug
  lib: firebase/client (browser), firebase/admin (server), ingest, stack, prompts, schemas
[Firestore]
  users/{uid}
  projects/{pid}/{snapshot,guidebook,lessons/{lid},debugSessions/{sid},progress/{uid},events/{eid}}
```

Routes as built: `/` (landing, dynamic — reads session for the CTA), `/login`,
`/dashboard` (guarded in `src/app/(app)/layout.tsx`), `not-found`, `error`.
Planned: `/projects/[id]` + `/overview|learn|debug` (Phases 2–5).

Key modules as built: `src/lib/firebase/{config,client,admin}.ts`, `src/lib/auth/{session,users}.ts`,
`src/lib/domain/user.ts`, `src/lib/nav.ts`, `src/app/actions/auth.ts`,
`src/components/{brand,auth,app}/*`, `scripts/dev-session.mjs` (dev-only cookie minter).

Auth boundary: browser keeps the Firebase client session (for realtime Firestore reads);
the server trusts only the httpOnly cookie, verified with `adminAuth().verifySessionCookie`.
Route handlers and server actions call `getCurrentUser()`; pages of the `(app)` group call
`requireUser()`.

Client/server boundary: server components by default; `"use client"` only for the sign-in
button, account menu, and (later) quiz, pipeline runner, mermaid.

## Data Model

As built in Phase 1 (all timestamps are epoch **milliseconds**, not Firestore Timestamp):

- `users/{uid}` — `{ email, displayName, photoURL|null, totalXp: 0, badges: [], createdAt }`.
  Written inside a transaction: created once on first sign-in, afterwards only
  `email`/`displayName`/`photoURL` refresh, so XP and badges can never be reset by a login.
- `projects/{pid}` — not yet written (Phase 2). Planned: `{ ownerUid, repoUrl, owner, repo,
  title, stage, stageError, stack, createdAt, updatedAt, lessonCount }`.
- Subcollections `snapshot`, `guidebook`, `lessons`, `debugSessions`, `progress`, `events` —
  not yet written (Phases 2–6).

## Env & Secrets

Names only; values live in `.env.local` (gitignored) and the host dashboard.

| Name | Where used |
|---|---|
| `NEXT_PUBLIC_APP_URL` | metadata base, auth redirect sanity |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | browser Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | server only — firebase-admin credential, one-line JSON |
| `ANTHROPIC_API_KEY` | server only — pipeline + debug (Phase 3+) |
| `ANTHROPIC_MODEL` | optional model override, default `claude-sonnet-4-5` |
| `GITHUB_TOKEN` | optional, raises GitHub anonymous limit 60 req/h (Phase 2) |

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

## Known Issues

- **Google popup sign-in not yet verified in an automated browser** (needs an interactive
  Google account). The token→cookie→session path is verified with a minted session cookie;
  the popup branch is covered by manual steps in the Change Log above.
- `scripts/dev-session.mjs` needs `.secrets/firebase-service-account.json`; it is local-only
  and must never be deployed or its output shared.
- Dashboard “Connect a repository” is intentionally disabled until Phase 2.
- Landing page copy describes pathways that are not yet clickable (Phases 2–5).
- No dark theme (intentional, BLUEPRINT §2).
- Placeholder brand mark (intentional until real logo lands).

## Backlog / Out of Scope

- Dark appearance, i18n, mobile app, payments, leaderboards, streaks (BLUEPRINT §2).
- Private repos, ZIP upload, GitLab/Bitbucket.
- Auto-fixing code; Gekonstruct never writes to the user's repo.
- Mermaid diagram is optional polish — never blocks a milestone.
- Nice-to-have: `/dashboard` project search, keyboard shortcuts, offline lesson cache.
