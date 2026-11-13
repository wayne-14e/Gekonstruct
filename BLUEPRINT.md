# BLUEPRINT.md — Gekonstruct MVP

> Single source of truth for building the Gekonstruct MVP.
> The agent building this repo MUST also follow `AGENTS.md` and maintain `PROJECT_CONTEXT.md`.
> If this document and `PROJECT_CONTEXT.md` conflict: `PROJECT_CONTEXT.md` describes what EXISTS, this file describes what MUST EXIST. Reconcile by updating this file via a logged decision.

---

## 1. Product context (why we build this)

**Problem (from CustDev, Module 2):** People build real apps with AI coding tools (Cursor, v0, Bolt, Lovable). While the project is small, AI fixes everything. When the project GROWS (multi-file, real users), the AI fix-loop stops converging ("context wall"): fixes break other files, rollbacks erase work, and the owner cannot debug alone because they never understood the generated code. Current alternatives: endless re-prompting, rollback + asking a friend, ad-hoc planning, YouTube (doesn't match their stack), or abandoning the project.

**ICP:** Vibe-coders with a GROWN project (multi-file web app / MVP, ideally in production). NOT beginners with one-file bots (they feel no pain).

**Product:** Gekonstruct ingests the user's repository and reverse-engineers it into a structured, gamified guidebook that teaches the codebase through the user's OWN code, narrated by Geko the Chameleon (friendly mentor voice).

**Three pathways (core promise):**
1. **Foundations (full learning):** ordered lesson series built from the user's codebase, from "what this project is" to "how to change it safely".
2. **Debug & Learn (narrow learning):** user describes a bug/error → Gekonstruct explains likely causes IN THEIR CODE, gives fix steps, and teaches the underlying concept. It explains and teaches — it does NOT auto-fix.
3. **Architecture Overview (partial learning):** plain-English map of layers, files, and data flow for quick orientation.

**Module 3 hypothesis (what this MVP must validate):**
"We will build a prototype to verify that a vibe-coder with a grown project connects their repo, completes at least one explanation pathway, and can afterwards explain in their own words how a key part of their project works — and comes back for a second pathway."

**Success metrics (instrumented, see §13):** of 5 testers with grown projects: ≥3 complete ≥1 pathway; ≥3 pass a quiz without re-reading; ≥2 return within 7 days and start a second pathway or debug session.

---

## 2. Scope

### In scope (MVP)
- Google sign-in (Firebase Auth).
- Connect a **public GitHub repository by URL**.
- Automated ingestion + stack detection (deterministic, no LLM).
- 4-stage analysis pipeline (LLM) producing the guidebook.
- The 3 pathways above, with quizzes and XP.
- Geko mascot voice (text + simple SVG avatar with speech bubble).
- Firestore persistence: projects, guidebook, lessons, debug sessions, progress, XP, analytics events.
- Minimal landing page.

### Out of scope (do NOT build, do NOT stub with fake data)
- Auto-fixing code / writing patches into the repo.
- Private repos, ZIP upload, GitLab/Bitbucket.
- Payments, subscriptions, credit system.
- Leaderboards, streaks, social features.
- RAG vector DB, fine-tuned/custom models (prompt + structured output is enough now).
- Mobile app, i18n, dark/light theme toggle (ship one clean theme).
- Mermaid diagram is OPTIONAL polish (see §9) — never block a milestone on it.

**No mock data in production paths.** LLM calls are real. Mocks exist only in unit tests for pure functions.

---

## 3. Tech stack (fixed — do not substitute)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15+ (App Router), TypeScript `strict: true` | Server components by default; route handlers for pipeline stages |
| UI | React 19, Tailwind CSS v4, shadcn/ui primitives ONLY where needed | Fast, consistent, no design debt |
| Backend | Firebase: Auth (Google), Firestore; firebase-admin on server | User's chosen stack; realtime listeners for pipeline progress |
| LLM | Anthropic SDK `@anthropic-ai/sdk`, model `claude-sonnet-4-5` (override via `ANTHROPIC_MODEL`) | Strong code reasoning + reliable structured JSON |
| Validation | `zod` for ALL LLM outputs and ALL API inputs | Never trust model text |
| Code display | `shiki` (server-rendered highlighting) | Zero client JS for highlighting |
| Diagrams (optional) | `mermaid` (dynamic import, client) | Architecture overview polish |
| Tests | `vitest` for pure logic (ingest filters, stack detection, quiz grading) | Cheap safety net |
| Hosting | Firebase App Hosting (preferred) or Vercel (Pro or set `maxDuration` ≤60s per stage) | Pipeline stages are designed to finish <60s each |

Dependency rule: any NEW dependency requires a dated entry in `PROJECT_CONTEXT.md` → Decisions Log.

---

## 4. System architecture

```
[Browser]
  │  Google sign-in (firebase client SDK)
  │  onSnapshot(project) → pipeline progress UI
  │  POST /api/pipeline/<stage>  (client orchestrates stages sequentially)
  ▼
[Next.js server]
  route handlers: /api/pipeline/ingest | architecture | lessons1 | lessons2
                  /api/debug/run
  server actions: createProject, completeLesson, completeDebugSession
  │
  ├─ GitHub API (tree + raw contents, optional GITHUB_TOKEN)
  ├─ Anthropic API (3–5 calls per analysis, zod-validated JSON)
  └─ firebase-admin → Firestore
[Firestore]
  users, projects, projects/{pid}/snapshot, projects/{pid}/guidebook,
  projects/{pid}/lessons, projects/{pid}/debugSessions,
  projects/{pid}/progress, projects/{pid}/events
```

**Pipeline design rule:** each stage is an **idempotent HTTP step** that reads prior state from Firestore, does ≤60s of work, writes its output, and updates `project.stage`. The browser orchestrates the sequence and renders progress. A failed stage can be retried by re-POSTing the same stage (it overwrites its own output). This avoids queues, workers, and serverless timeouts.

Stage enum on `projects/{pid}.stage`:
`created → ingested → architecture → lessons1 → lessons2 → ready` , plus `failed:<stage>` and `stageError`.

---

## 5. Repository ingestion spec (deterministic)

Input: `https://github.com/{owner}/{repo}` (public).
1. `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1` (use `GITHUB_TOKEN` if present; else anonymous 60 req/h — show a friendly error on rate limit).
2. Exclude: `node_modules/`, `.git/`, `.next/`, `dist/`, `build/`, `coverage/`, lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`), `.env*`, binaries by extension (png, jpg, jpeg, svg, ico, gif, mp4, woff, woff2, ttf, pdf, zip), files >300 KB.
3. Priority order for inclusion (stop at **60 files / 150,000 chars**):
   1. Manifests: `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`
   2. Config: `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `vite.config.*`, `firebase.json`, `supabase/config.toml`, `vercel.json`
   3. Routes/entries: `app/**/page.{tsx,ts,jsx,js}`, `app/**/route.ts`, `pages/**`, `src/main.*`, `server.*`, `index.*`
   4. Schema/DB: `prisma/schema.prisma`, `drizzle/**`, first 2 `supabase/migrations/*.sql`, `schema.sql`
   5. `lib/**`, `services/**`, `api/**`, `utils/**`, `hooks/**`, `store/**`
   6. `README.md`
   7. Components: root layout + the 5 largest files in `components/**`
   8. Remaining source files, shallowest path first, then largest size
4. Per-file cap: 12,000 chars; truncate middle, keep head+tail, append marker `\n// ... [truncated by Gekonstruct] ...\n`.
5. Store result in `projects/{pid}/snapshot` doc: `{ files: [{path, size, content}], fetchedAt, totalChars, truncated: string[] }`.
6. Stack detection (pure function, unit-tested): map manifest deps + folder conventions → `{ framework, language, uiLib, backend, db, auth, hosting }` (e.g. next, react, vue, svelte, express, fastapi; supabase, firebase, prisma, mongodb; tailwind; vercel…). If nothing recognizable → fail stage with message "We couldn't recognize the stack".

---

## 6. LLM pipeline spec

All calls: server-side only, `temperature 0.2`, output parsed with `zod.safeParse`; on failure → ONE retry with the parse errors appended ("repair pass"); second failure → `failed:<stage>`.

### Stage `architecture` (1 call)
System prompt (voice rules apply to every human-readable field):
```
You are Gekonstruct's analysis engine. You turn a codebase into a teaching guidebook.
Rules for all text fields: plain English; short sentences; never use jargon without
a one-clause explanation; EVERY explanation must reference at least one real file path
from the provided tree; no generic tutorial content; if unsure, say what is uncertain.
Output ONLY JSON matching the schema.
```
User content: stack detection result + full file tree + concatenated snapshot files (with path headers).
Output schema `ArchitectureSchema` (zod):
```ts
{
  summary: { whatItDoes: string;        // 2–3 sentences, what the product does
             plainSummary: string;      // ELI5 paragraph, ≤120 words
             gekoIntro: string },       // 1–2 sentences in Geko voice (see §10)
  architecture: {
    layers: [{ id, name, purpose, files: string[], plainExplanation }],  // 3–7 layers
    dataFlow: [{ from, to, whatHappens }],                                // 4–8 steps
    mermaid: string | null                                                // optional flowchart LR
  },
  concepts: [{ id, term, plainDefinition, files: string[], whyItMatters }] // 5–12
}
```
Write to `projects/{pid}/guidebook`.

### Stages `lessons1` / `lessons2` (1 call each)
Generate the **Foundations pathway**: 6–10 lessons total (part 1 = first half). Order MUST progress: what this project is → how a request/render flows → where state & data live → how auth/permissions work here → how to add a feature safely → how to debug here.
`LessonSchema`:
```ts
{
  id: string; title: string; goal: string;              // what the learner will be able to do
  explain: string;                                       // markdown, 250–500 words, references real files
  codeRefs: [{ file: string; note: string }];            // 1–4 refs; note = what to look at, ≤2 sentences
  gekoTip: string;                                       // Geko voice, ≤2 sentences
  xp: number;                                            // fixed 20
  quiz: [{ question; options: string[3..4]; correctIndex: number; why: string }] // 2–3 questions,
         // questions must be answerable ONLY by someone who read THIS lesson about THIS codebase
}
```
Write each lesson as `projects/{pid}/lessons/{lessonId}` with `{ order, part: 1|2, ... }`.

### Debug pathway (`/api/debug/run`, 1 call per session)
Input: user's symptom text + `guidebook` summary/architecture + top-10 files matched by keyword overlap between symptom and file paths/content (pure function).
`DebugSessionSchema`:
```ts
{
  likelyCauses: [{ cause, evidenceFiles: string[], confidence: 'high'|'medium'|'low' }], // 2–3
  fixSteps: string[],                                    // 3–7 concrete steps, reference files
  whyItWorks: { concept, explanation },                  // the underlying fundamental, taught via THEIR code
  quiz: [ ...same as lesson quiz, 1–2 items ],
  gekoTip: string,
  xp: number                                             // fixed 30
}
```
Write to `projects/{pid}/debugSessions/{sid}`.

---

## 7. Data model (Firestore)

```ts
users/{uid}            { email, displayName, totalXp: number, badges: string[], createdAt }
projects/{pid}         { ownerUid, repoUrl, owner, repo, title, stage, stageError: string|null,
                         stack: Stack|null, createdAt, updatedAt, lessonCount: number }
projects/{pid}/snapshot        { files: [{path,size,content}], fetchedAt, totalChars, truncated }
projects/{pid}/guidebook       { ...ArchitectureSchema, analyzedAt }
projects/{pid}/lessons/{lid}   { order, part, ...LessonSchema }
projects/{pid}/debugSessions/{sid} { symptom, status: 'pending'|'done'|'failed',
                                     ...DebugSessionSchema|null, createdAt }
projects/{pid}/progress/{uid}  { lessons: Record<lessonId, {passed:boolean, score:number, at:number}>,
                                 debug: Record<sid, {completed:boolean, at:number}>,
                                 badges: string[], xp: number }
projects/{pid}/events/{eid}    { type, at, meta }   // see §13
```
XP: lesson quiz passed = lesson.xp; debug session completed = its xp; pathway completion bonus = 50. XP writes use a **Firestore transaction** (progress doc + `users/{uid}.totalXp`).
Badges: `map-reader` (overview fully expanded/read — fire event on last section view), `foundation-builder` (all lessons passed), `bug-whisperer` (first debug session completed).

`firestore.rules` (owner-only; admin SDK bypasses):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function owner(uid) { return request.auth != null && request.auth.uid == uid; }
    match /users/{uid} { allow read, write: if owner(uid); }
    match /projects/{pid} {
      allow read, update, delete: if owner(resource.data.ownerUid);
      allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
      match /{doc=**} {
        allow read, write: if owner(get(/databases/$(database)/documents/projects/$(pid)).data.ownerUid);
      }
    }
  }
}
```

---

## 8. API contract

Route handlers (POST, JSON; all validate input with zod; all idempotent):
- `/api/pipeline/ingest` `{projectId}` → runs §5, sets stage `ingested`.
- `/api/pipeline/architecture` `{projectId}` → stage `architecture`.
- `/api/pipeline/lessons1` / `lessons2` `{projectId}` → stages accordingly; `lessons2` sets `ready` + `lessonCount`.
- `/api/debug/run` `{projectId, symptom}` → creates session `pending`, runs LLM, sets `done`/`failed`.
All return `{ ok: true, stage }` or `{ ok: false, error }`. Auth: firebase ID token verified server-side; project must belong to caller. Limit: **3 projects per user** during MVP (cost control) — enforce in `createProject`.

Server actions: `createProject(repoUrl)`, `completeLesson(projectId, lessonId, answers: number[])` (server re-checks answers against stored quiz; ≥70% = pass; writes progress, XP transaction, event; returns `{passed, score, gekoLine}`), `completeDebugSession(projectId, sid, answers)`.
Geko reaction lines on quiz result: pick from a local constant array by score band (no LLM call).

---

## 9. Frontend spec

Routes (App Router; server components unless noted):
- `/` landing: hero ("You vibe-coded it. Now OWN it."), 3 pathway cards, CTA. ≤1 screen of copy.
- `/login` Google button → redirect `/dashboard`.
- `/dashboard`: project cards (repo, stage badge, XP), "Connect repo" form (URL input + validation), 3-project cap notice.
- `/projects/[id]`: if stage < ready → `<PipelineRunner/>` (client): sequential stage POSTs, progress steps from `onSnapshot`, retry button on `failed:*`. If ready → hub: XP/badges header + 3 pathway cards + Geko speech bubble greeting (`guidebook.summary.gekoIntro`).
- `/projects/[id]/overview` (Pathway 3): layer accordion (purpose, plainExplanation, file chips), data-flow numbered list, concepts grid; optional mermaid render (dynamic import; on error hide silently); "mark as read" fires `map-reader` badge event when last section opened.
- `/projects/[id]/learn` (Pathway 1): ordered lesson list with pass state; `/learn/[lessonId]`: goal, explain (markdown), codeRefs rendered as `<CodeBlock file>` (shiki, server-rendered, file content pulled from snapshot by path), gekoTip bubble, `<Quiz/>` (client) → server action → result state + XP toast.
- `/projects/[id]/debug` (Pathway 2): symptom textarea → session list; `/debug/[sid]`: likelyCauses (confidence chips + evidence files), fixSteps checklist, whyItWorks panel, quiz, XP.
- Components: `GekoAvatar` (simple inline SVG chameleon, 3 mood colors), `SpeechBubble`, `PipelineRunner`, `Quiz`, `CodeBlock`, `XpBadge`, `StageBadge`, `PathwayCard`.

UI bar: one theme, generous whitespace, code-first layout; Geko appears at decision moments (lesson start, quiz result, session done), never as decoration spam.

---

## 10. Voice & content quality bar (Geko)

Geko = curious, warm chameleon mentor. Short sentences. Never condescending. Always points at REAL files ("see `lib/auth.ts` — that's where your app decides who you are"). Celebrates specifics ("You just learned where YOUR payments live — `app/api/payments/route.ts`"). No hype words, no emojis in lesson body (one 🦎 allowed in bubble). Every `explain` must contain ≥2 real file paths. Quiz options must be plausible within THIS codebase (wrong options = real-but-wrong files/concepts, not jokes).

---

## 11. Milestones & acceptance criteria

- **M1 Scaffold & auth:** Next+TS+Tailwind+Firebase wired; Google login works; `users/{uid}` created; landing page. ✔ AC: login → dashboard empty state.
- **M2 Ingestion:** `createProject` + `/api/pipeline/ingest` + snapshot doc + stack detection + unit tests for filters/stack. ✔ AC: 3 real public repos ingest; node_modules never in snapshot; >300KB skipped.
- **M3 Architecture pathway:** stage `architecture` + overview page. ✔ AC: guidebook doc passes zod; overview renders layers/dataFlow/concepts from a real repo.
- **M4 Foundations pathway:** lessons1/2 + learn pages + Quiz + `completeLesson` + XP transaction + progress UI. ✔ AC: pass quiz → XP in user doc; fail → no XP, retry allowed.
- **M5 Debug pathway:** debug form, run stage, session page, `completeDebugSession`. ✔ AC: real symptom on tester repo returns causes with evidenceFiles that exist in snapshot.
- **M6 Polish:** Geko avatar/bubbles, badges, events (§13), 3-project cap, error/empty states everywhere, firestore.rules deployed.
- **M7 Validation readiness:** vitest green, `next build` green, 5-tester checklist doc (`docs/TEST_PLAN.md`) mirroring §1 success metrics.

---

## 12. Env & security

`NEXT_PUBLIC_FIREBASE_*` (client config), `FIREBASE_SERVICE_ACCOUNT` (server, JSON string), `ANTHROPIC_API_KEY` (server only), `ANTHROPIC_MODEL` (optional), `GITHUB_TOKEN` (optional, server only), `NEXT_PUBLIC_APP_URL`.
Never import admin SDK or keys in client components. All LLM/GitHub calls server-side. Rate-limit naive: per-user project cap + stage idempotency is enough for MVP.
Cost note: ~4 sonnet-class calls per analysis ≈ $0.10–0.30; debug ≈ $0.03–0.08. Cap of 3 projects/user keeps MVP burn trivial.

---

## 13. Validation instrumentation

Event types written to `projects/{pid}/events`: `project_created`, `stage_completed`, `analysis_ready`, `overview_section_viewed`, `lesson_viewed`, `quiz_passed`, `quiz_failed`, `pathway_completed`, `debug_created`, `debug_completed`, `return_visit` (first session >24h after `analysis_ready`).
`docs/TEST_PLAN.md` maps events → Module 3 success metrics (§1) so the 5-tester run is measured, not vibes.

---

## 14. Definition of done (MVP)

A stranger with a public grown repo can: sign in → connect repo → watch pipeline → read overview → pass ≥1 lesson quiz → run 1 debug session → see XP/badge — with zero mock data and zero console errors. `PROJECT_CONTEXT.md` reflects every shipped piece.
