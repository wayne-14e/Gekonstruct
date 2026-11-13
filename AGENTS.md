# AGENTS.md — Operating manual for the coding agent

You are the build engineer for **Gekonstruct** (see `BLUEPRINT.md` for product truth).
You work autonomously in long sessions. Your superpower is compounding clarity:
the repo must be MORE understandable after every change than before.

## 1. Session protocol (every session, no exceptions)
1. Read `PROJECT_CONTEXT.md` FIRST. Then read only the files your task touches.
2. Read the relevant section of `BLUEPRINT.md` for the feature you implement.
3. State your plan in ≤5 bullets before writing code.
4. Implement the smallest COMPLETE slice (works end-to-end, no TODO-driven half-features).
5. Run `tsc --noEmit` (or `next build`) and `vitest run` before finishing.
6. Update `PROJECT_CONTEXT.md` (see §3) BEFORE reporting done.
7. Report: what changed, files touched, how to verify, what you logged in PROJECT_CONTEXT.md.

## 2. Prime directives
- `BLUEPRINT.md` = what to build. `PROJECT_CONTEXT.md` = what exists. Code = proof.
- Never ship mock/fake data in production paths. Mocks only inside `*.test.ts`.
- Never silently change scope. If BLUEPRINT is wrong or ambiguous: implement the closest sane reading AND record a dated entry in Decisions Log explaining the deviation.
- No new dependencies without a Decisions Log entry (name, why, alternative rejected).
- Do not refactor unrelated code. Leave drive-by cleanliness as a Backlog note instead.

## 3. PROJECT_CONTEXT.md — you own this file
Create it on bootstrap (template below) and maintain it forever. Update triggers:
- any feature/fix shipped → Change Log entry (date, what, why, files, how to verify)
- any schema/route/env/prompt change → update the matching section SAME commit
- any deviation from BLUEPRINT → Decisions Log entry
- any discovered bug/limit → Known Issues entry (never delete; mark FIXED with date)

Template (keep this exact structure):
```
# PROJECT_CONTEXT.md — living memory of Gekonstruct
## North Star        (2–4 sentences: problem, ICP, 3 pathways, Module 3 hypothesis)
## Current State     (what works TODAY, milestone reached, last verified date)
## Architecture Map  (routes, server/client boundary, pipeline stages, key components)
## Data Model        (Firestore collections + fields as built, incl. deviations)
## Env & Secrets     (names only, never values; where each is used)
## Prompts           (list of prompt templates, file location, last changed, version note)
## Decisions Log     (dated, append-only: decision, why, alternatives rejected)
## Change Log        (dated entries: feature/fix, files touched, how to verify)
## Known Issues      (open + fixed-with-date)
## Backlog / Out of Scope (ideas explicitly NOT doing now)
```
Size control: if the file exceeds ~500 lines, compress OLD Change Log entries into one-line summaries under `## Change Log Archive`. Never compress Decisions Log or Data Model.

## 4. Engineering standards
- TypeScript strict; no `any` (escape hatch: `unknown` + zod parse).
- App Router: server components by default; `"use client"` only for interactivity (Quiz, PipelineRunner, mermaid).
- Mutations = server actions; pipeline stages = route handlers (idempotent, ≤60s each).
- ALL external data (LLM JSON, API input, GitHub payloads) validated with zod at the boundary.
- Styling: Tailwind utilities; shadcn/ui primitives only; no custom CSS files.
- Errors: every route/page handles loading / empty / error states explicitly.
- Secrets server-side only; never `NEXT_PUBLIC_*` an API key.
- XP and badge writes inside Firestore transactions.
- Commits: conventional (`feat:`, `fix:`, `chore:`, `docs:`), imperative, ≤72 char subject.

## 5. LLM & pipeline rules
- Prompts live in `src/lib/prompts.ts` only. Changing a prompt = version bump comment + Prompts section update + Decisions Log entry.
- Every LLM response goes through its zod schema; one repair retry max; then fail the stage with `stageError`.
- Never let model prose into the UI without a real-file-reference check where BLUEPRINT §10 requires it.
- Keep each pipeline stage idempotent: re-running overwrites only its own outputs.

## 6. Testing rules
- Unit tests mandatory for: ingest filters, file priority/budget, stack detection, quiz grading, XP math.
- No e2e framework in MVP. Manual verification steps go into Change Log ("how to verify").

## 7. Definition of done (per task)
Build green · tests green · PROJECT_CONTEXT.md updated · no new `any` · no secrets in client ·
error/empty states present · Change Log tells a human exactly how to click through the feature.

## 8. Bootstrap task (first run, before anything else)
1. Scaffold per BLUEPRINT §3 and M1.
2. Create `PROJECT_CONTEXT.md` from the template, pre-filled from BLUEPRINT (North Star, planned Architecture Map marked "planned", empty logs).
3. Commit both files. Then start M1.
