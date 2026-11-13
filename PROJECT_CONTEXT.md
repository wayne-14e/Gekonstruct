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

**Phase 0 — Bootstrap & design system: done.** Next 16 + React 19 + TS strict + Tailwind v4
+ shadcn/ui (radix, nova preset) scaffolded; field-guide design tokens in
`src/app/globals.css`; Geko placeholder mark + logo + avatar + speech bubble in
`src/components/brand/`; Firebase project `gekonstruct-14174` wired (web config + admin
service-account key generated); `firestore.rules` written (not yet deployed); staged build
plan below. Last verified: 2026-11-13 (`next build` green, `tsc --noEmit` green).

### Build plan — executing phase by phase

| Phase | Milestone | Scope | Exit criteria |
|---|---|---|---|
| 0 | Bootstrap | Scaffold, design tokens, brand components, Firebase wiring, env, this doc | `next build` green; landing shell renders |
| 1 | M1 Auth & shell | Client Firebase auth + Google sign-in, session cookie via server action, `users/{uid}` bootstrap, landing, `/login`, `/dashboard` empty state, app header | Sign in → `/dashboard` shows empty state; signed-out `/dashboard` redirects to `/login` |
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

Routes as built: `/` (landing), `/login`, `/dashboard` (Phase 1); `/projects/[id]`,
`/projects/[id]/overview|learn|debug` (Phases 2–5).

Client/server boundary: server components by default; `"use client"` only for auth buttons,
quiz, pipeline runner, mermaid.

## Data Model

As built in Phase 1:

- `users/{uid}` — `{ email, displayName, photoURL|null, totalXp: 0, badges: [], createdAt }`
  created idempotently (merge) on first sign-in.
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

None yet. `src/lib/prompts.ts` arrives in Phase 3 (architecture prompt v1), Phase 4
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

## Change Log

Newest last.

- **2026-11-13 — Phase 0: scaffold + design system + Firebase wiring.**
  Files: `package.json`, `src/app/globals.css`, `src/app/layout.tsx`,
  `src/components/brand/{geko-mark,geko-avatar,logo,speech-bubble}.tsx`, `src/app/icon.svg`,
  `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `.env.example`.
  Verify: `npm run build` → visit `/`; the Geko badge + wordmark render; `firebase projects:list`
  shows `gekonstruct-14174` active.
  Why: everything later needs tokens, brand components and a working Firebase target.

## Known Issues

- `PROJECT_CONTEXT.md` architecture/data-model sections mark later phases as planned — they
  describe intent, not code, until the matching phase ships.
- Landing page copy currently references pathways that are not yet clickable (Phases 2–5).
- No dark theme (intentional, BLUEPRINT §2).
- Placeholder brand mark (intentional until real logo lands).

## Backlog / Out of Scope

- Dark appearance, i18n, mobile app, payments, leaderboards, streaks (BLUEPRINT §2).
- Private repos, ZIP upload, GitLab/Bitbucket.
- Auto-fixing code; Gekonstruct never writes to the user's repo.
- Mermaid diagram is optional polish — never blocks a milestone.
- Nice-to-have: `/dashboard` project search, keyboard shortcuts, offline lesson cache.
