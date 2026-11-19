# Gekonstruct — SMM Database

> **What this file is:** the product, mission, audience and messaging source of truth for the
> cloud social-media agent. Read this before writing any caption, script, carousel or image
> brief. It is self-contained: the agent only needs this file and `design-system.md`.
>
> **Last updated:** 2026-11-19. Product status changes often. Ask the founder or check the
> live product before announcing anything as live, and never turn a roadmap item into a
> shipped feature.
>
> **Companion file:** `design-system.md` — colours, type, Geko, layouts and image/video
> recipes.

---

## 0. How the SMM agent should use this file

1. **Find the post type first.** Every post needs exactly one required hashtag:
   `#update`, `#bug_fix`, `#new_feature` or `#new_milestone` (see §11).
2. **Check what is actually live.** Use §7. If a feature is not in the "Live today" list,
   write about it as planned/coming — never as available.
3. **Ask for evidence.** Before posting a build update, ask for the release note, screenshot
   or PR summary. Do not invent metrics, users, quotes, dates or features.
4. **Protect people.** Blur secrets, tokens, emails and private repo contents. Do not show a
   user's repo without permission. Public repos are still someone's work.
5. **Write like Geko.** Warm, specific, short sentences. No hype. No shaming. See §10.
6. **One post = one idea = one CTA.** If there are two ideas, make two posts.
7. **No claim without a source.** Security, speed and outcome claims follow §13.

---

## 1. One-liner

**Gekonstruct turns your own codebase into a course, so you can understand and safely change
the app you built with AI.**

Tagline:

> **You vibe-coded it. Now own it.**

Short boilerplate (bio / press):

> Gekonstruct reads a public GitHub repo and teaches it back to you — a plain-English
> architecture map, ordered lessons from your own files, and a debug guide that explains the
> cause instead of hiding it. Built for people whose AI-assisted project has outgrown the
> “just re-prompt it” phase.

One-sentence mission:

> Stop AI slop, reduce the leaks and breaches shipped by AI-coded projects, and make human
> coding — reading, understanding and owning code — popular again.

---

## 2. What Gekonstruct is (plain language)

People now build real products with AI tools. That is good. The problem starts when the
project grows: the owner has hundreds of files they never read, every fix risks breaking
something else, and the AI loop stops converging because nobody — including the owner —
understands the whole system.

Gekonstruct is a **learning layer for that moment**.

You connect a public GitHub repository. Gekonstruct reads the project and builds a guidebook
from the **real files**:

- **Architecture Overview** — a plain-English map of the layers, the data flow and the
  concepts that hold the project together.
- **Foundations** — an ordered lesson pathway, from “what this project is” to “how to add a
  feature without breaking three others”. Each lesson points at real code and ends with a
  short quiz.
- **Debug & Learn** *(next)* — you describe a bug or error. Geko explains the likely causes
  in your code, gives concrete fix steps, and teaches the underlying concept. It explains and
  teaches. It does **not** auto-fix your repo.

Geko the chameleon is the mentor. He is curious, warm and specific. He always points at
something real in your project rather than speaking in generic tutorial language.

**What Gekonstruct is not:** an AI coding tool, a code generator, an auto-fixer, a generic
video course, or a replacement for developers. It is the missing “understand it” step.

---

## 3. Mission

### 3.1 Stop AI slop

“AI slop” is not “code written with AI”. It is code that ships without understanding:

- copy-pasted patterns nobody can explain;
- features that look finished but break the moment one file changes;
- generic UI and generic logic that ignore the actual product;
- abandoned projects because the owner got stuck at the context wall.

Gekonstruct fights the **slop**, not the builder. The builder is capable; they were simply
given speed without a map. We give them the map.

### 3.2 Reduce leaks and breaches in AI-coded platforms

AI-assisted projects ship fast, and speed hides risk: exposed keys, missing auth checks,
unvalidated input, over-permissive database rules, secrets committed “just for now”.

Gekonstruct does not claim to secure an app. It teaches the owner where the important pieces
live and why they matter, so the person shipping the product can **see the risk in their own
code** instead of trusting a black box.

Approved framing:

> “We help builders understand the code they ship — including the parts that create security
> risk.”

Not approved:

> “We prevent breaches”, “breach-proof”, “guaranteed secure”, “we fix your vulnerabilities”.

### 3.3 Make human coding popular again

We are **not anti-AI**. We are anti-helplessness.

“Human coding” here means the human skill of reading, reasoning about, reviewing and
changing code — not typing every line by hand. The goal is a builder who can open any file in
their own product and say: I know what this does, why it is here, and what happens if I change
it.

The product should make that skill feel achievable and even fun, without pretending the
learner is a beginner. Our users already built something. We respect that.

### 3.4 Brand stance

- **Pro-builder, not anti-AI.** AI is a legitimate way to build. Ownership is the missing
  piece.
- **Specific over impressive.** A real file path beats a grand claim.
- **Teach, don’t take over.** Gekonstruct never writes to the user’s repository.
- **Calm confidence, not hype.** The product is a workshop, not a casino.
- **Security through understanding, not fear.** Explain the risk; don’t sell panic.

---

## 4. Who it is for

### Primary ICP

**Vibe-coders with a grown project.**

- They built a multi-file web app / MVP with Cursor, v0, Bolt, Lovable, ChatGPT or similar.
- The project is real: users, data, payments, auth, deployment — or close to it.
- They can ship features with AI but cannot confidently debug or refactor alone.
- They feel the “context wall”: fixes break other files, rollbacks erase work, the codebase
  feels foreign.
- They want to keep building, not abandon the project or start over.

### Not the primary user

- Complete beginners with a one-file tutorial project (they do not feel the pain yet).
- Teams looking for code review, CI, static analysis or a security scanner.
- People who want AI to write the app for them with no intention of understanding it.
- Enterprise buyers looking for compliance tooling.

### Pains → desires

| Pain | What they actually want |
|---|---|
| “I don’t know what half these files do.” | A map in plain English, built from their repo. |
| “AI fixes one thing and breaks another.” | Understanding of dependencies and flow before changing code. |
| “I’m scared to touch auth/payments.” | Guided, specific explanations of the risky parts. |
| “Tutorials use someone else’s todo app.” | Lessons that use **their** files and **their** stack. |
| “I don’t know if I’m actually learning.” | Quizzes, progress, XP and a visible path forward. |
| “I want to ship without leaking data.” | Confidence about where secrets, auth and data boundaries live. |

### Identity language

Users may call themselves vibe-coders, indie hackers, solo founders, builders, non-traditional
developers. Use their words. Never imply they are “not real developers” or that their project
is embarrassing.

---

## 5. The product today (plain-English mechanics)

### The journey

1. **Sign in with Google.**
2. **Connect a public GitHub repository by URL.**
3. **Gekonstruct reads the project** — it skips noise such as dependencies, build output,
   lockfiles and binaries, and detects the stack.
4. **The guidebook is built** — architecture map, then Foundations lessons.
5. **Learn through the pathways** — read, open real code, answer quizzes, earn XP.
6. **Come back when stuck** — the debug pathway (next) will explain a symptom in the context
   of the same project.

### The three pathways

| Pathway | What it does | Status |
|---|---|---|
| **Architecture Overview** | Quick orientation: layers, request/data flow, key concepts, real file links | Live |
| **Foundations** | 6–10 ordered lessons built from the repo, each with real code refs and a 2–3 question quiz | Live |
| **Debug & Learn** | Symptom → likely causes, evidence files, fix steps, the concept underneath | In development (next milestone) |

### Progress and rewards

- A lesson pass earns **20 XP**.
- Finishing every lesson in the Foundations pathway earns a **+50 XP pathway bonus** (once).
- A debug session is planned at **30 XP** (not live yet).
- XP lives on the user profile and on the project pathway.
- Quizzes are pass/fail at **70%**; a failed attempt awards no XP and can be retried.
- Badges (`map-reader`, `foundation-builder`, `bug-whisperer`) are planned for the polish
  milestone — do not announce them as live.

### Current limits (be honest if asked)

- **Public repositories only.**
- Up to **3 projects per account** during the MVP.
- Reads the repository; **never writes to it**.
- The generated guidebook is only as good as what the repository contains. It is an
  explanation, not an audit or a security certification.
- No team accounts, private repos, payments or marketplace yet.

---

## 6. Why it is different

| Alternative | Why Gekonstruct is different |
|---|---|
| Generic course / YouTube | The curriculum is **your** repo: your files, your stack, your architecture. |
| “Just ask AI” | A chat answer is a moment; Gekonstruct builds a persistent, ordered guidebook with proof you understood it. |
| Docs | Docs explain the framework. Gekonstruct explains **your use of it**. |
| Static analysis / security scanner | Those report issues. Gekonstruct teaches the owner why the issue exists and how the system fits together. |
| Auto-fix tools | Gekonstruct deliberately does not touch the repo. Understanding is the product. |
| “Duolingo for coders” | Gamified learning is the delivery mechanism, not the ceiling. The long-term product is a course centre and a project-course marketplace (see §8). |

Internal shorthand for the design is **“Duolingo × JetBrains”**: the momentum and reward
feeling of a learning app inside the visual language of a serious IDE. Do not use that phrase
as the public positioning; it is a design reference, not the pitch.

---

## 7. Current status — source of truth (2026-11-19)

### Live today

- Google sign-in and a personal dashboard.
- Connect a **public GitHub repo** by URL.
- Repository ingestion with noise filtering and stack detection.
- **Architecture Overview** page with layers, data flow, concepts and real file links.
- **Foundations pathway**: 6–10 lessons in two parts, real code refs, quizzes, pass state,
  progress bar, XP and the pathway bonus.
- Server-verified quiz grading; XP awarded once per lesson.
- Guided errors and retry states for the pipeline.

### In progress / next

- **Debug & Learn** pathway (the next milestone): symptom form, causes with evidence files,
  fix steps, why-it-works, quiz, XP.

### Planned, not live

- Badges and deeper analytics.
- Polish pass across all empty/error/loading states.
- **Course centre**: structured courses beyond “your own repo”.
- **Project-course marketplace**: creators turn projects into courses (see §8).
- Private repositories, teams, payments, mobile app.

### Never claim

- That debug is live.
- That the marketplace or course centre exists.
- That Gekonstruct fixes code, writes to repos, or guarantees security.
- Any user count, revenue, funding, partnership, waitlist size or “used by” logo unless the
  founder supplies the exact approved sentence and source.

---

## 8. Future: from guidebook to course centre to marketplace

This is the long-term story. It is **vision**, not current functionality — every public post
about it must say so.

### Step 1 — The personal course (today)

Your own repository becomes your curriculum. The product proves the model: people will
finish a pathway built from their real project.

### Step 2 — The course centre

Not just “another Duolingo for vibe-coders”. Gekonstruct becomes a complete course centre:
structured paths for the skills a builder needs — architecture, security basics, databases,
auth, shipping, debugging, specific stacks — with the same Geko-guided, proof-of-understanding
format.

### Step 3 — The project-course marketplace

Once enough repositories have been analysed, Gekonstruct can offer **ready-made courses built
from real projects**:

- A creator’s project is turned into a guided course **with their explicit permission**.
- Learners follow the course, build the project themselves, and finish with a working project
  they can keep or modify in any way they want.
- Creators get reach and attribution; commercial terms are **not announced yet**.
- Courses can cover different topics and project types, not only “learn your own repo”.

### Why this is credible

The hard part is not recording a tutorial. It is turning a real codebase into an ordered,
verified learning path where every reference is a real file and every quiz is answerable from
the lesson. Gekonstruct is building that engine now, on real repos.

### Guardrails for the marketplace story

- Permission first. A repository is someone’s work.
- Attribution and licence compatibility are non-negotiable.
- No “we train on your code” claims. Do not describe model training at all.
- No dates, revenue shares, creator payouts or launch quarters until the founder approves
  them.
- Frame as **planned / in exploration**, not “launching soon”.

---

## 9. Brand facts

- **Name:** Gekonstruct.
- **Mascot:** Geko, a chameleon mentor. He is the narrator and guide, not a decorative
  sticker. On social, Geko should look like he is the one posting: pointing, explaining,
  reacting or holding the artifact.
- **Category:** learning / developer education for AI-assisted builders.
- **Core promise:** understand the code you already shipped, then change it safely.
- **Enemy:** AI slop, the context wall, helplessness. Never the user.
- **Personality:** curious, warm, precise, quietly funny, encouraging without cheerleading.
- **Values:** ownership, clarity, real files, permission, craft, honesty about limits.
- **Visual shorthand:** dark IDE, lime primary, chameleon-skin gradient, file-path chips,
  mono labels, chunky buttons. Full rules in `design-system.md`.
- **Do not use as public positioning:** “Duolingo for developers” as the whole pitch,
  “revolutionary”, “10x”, “magic”, “effortless”.

---

## 10. Voice and messaging

### Geko’s voice

- Short sentences. One idea per line.
- Specific nouns: a file path, a layer, a symptom, a lesson title.
- Warm, never condescending. The user is capable; they are missing a map.
- Curious: “Here’s what I found in your repo.”
- Celebrates the specific: “You just learned where your payments live.”
- Dry humour is allowed. Cruelty is not.
- No hype words, no emoji spam. **Maximum one 🦎 per post**, and only in Geko’s voice.
- Geko speaks in first person (“I read your repo”). The team speaks as “we”. Do not mix both
  in the same sentence.

### Approved lines

- “You vibe-coded it. Now own it.”
- “Your repo is the curriculum.”
- “Real files. Real lessons. Real ownership.”
- “Stop shipping code you can’t explain.”
- “AI writes fast. You still have to own it.”
- “The context wall ends here.”
- “Geko reads the repo so you can read your code.”
- “Not a generic course. Your actual project.”

### Banned language

- revolutionary, game-changer, 10x, unleash, supercharge, effortless, magic, secret sauce
- “we fix your code”, “we write the patch”, “we secure your app”, “breach-proof”
- “replace developers”, “AI will code everything”, “just prompt better”
- “you don’t understand your own code” as an accusation
- “real developers” used to exclude the audience
- Fake urgency (“last chance”), fake scarcity, fake social proof
- Naming and shaming competitors or their users

### Before / after

| Weak | Better |
|---|---|
| “AI coding is changing everything. Our revolutionary platform helps you learn.” | “You built it with AI. Geko teaches the code back to you — file by file.” |
| “We fix the security issues in your vibe-coded app.” | “See where auth, secrets and data live in your own repo — and why they matter.” |
| “Another AI tool for developers.” | “Not another code generator. The missing step where you understand what you shipped.” |
| “Learn to code with our gamified platform.” | “Pass the quiz on your own code, earn the XP, keep the understanding.” |

---

## 11. Hashtag system (required)

Every post must carry **exactly one required category hashtag**, placed at the **top or the
bottom** of the caption / frame — not buried in the middle.

| Hashtag | Use it when | Do not use it for |
|---|---|---|
| `#update` | General progress, behind-the-scenes, “what we’re working on”, roadmap, thoughts, weekly notes | A shipped feature or a fixed bug (use the specific tag) |
| `#bug_fix` | A real bug fixed, reliability improvement, security hardening, “this broke and here’s what we learned” | A new feature or a general progress note |
| `#new_feature` | A feature that is **live for users today** | A roadmap item, a prototype, a design mock |
| `#new_milestone` | A real milestone reached: phase complete, first tester, launch, a meaningful threshold | Routine weekly progress |

Rules:

- One category tag per post. Do not stack `#new_feature #new_milestone` to cover more reach.
- Keep the exact spelling: `#bug_fix` with an underscore, lowercase.
- On images, render it as a small mono pill at the top-left under the category label or at
  the bottom-left above the wordmark. On video, burn it into the first frame and the end card.
- Optional brand/community tags (`#Gekonstruct`, `#buildinpublic`) may follow **after** the
  required tag, never instead of it.
- Do not use unrelated trending tags to farm reach.

---

## 12. Content pillars

| Pillar | Share | What it sounds like | Default tag |
|---|---|---|---|
| Build updates & changelog | 30% | “This week Geko learned to…” / a real screenshot or short demo | `#update` or `#new_feature` |
| Feature drops | 20% | One capability, one user problem, one proof | `#new_feature` |
| Bug fixes & reliability | 10% | “This broke. Here’s the fix and what it taught us.” | `#bug_fix` |
| Milestones | 10% | Phase complete, first cohort, launch day | `#new_milestone` |
| Education / AI slop & ownership | 20% | A specific lesson: context wall, secrets in repos, why understanding beats re-prompting | `#update` |
| Geko explainers / micro-lessons | 10% | A 15–30s “Geko explains one concept using a fake-but-realistic repo” | `#update` |

Avoid posting only announcements. The account should teach something even when it is
promoting something.

---

## 13. Claims, privacy and approval

### Claims

- No invented numbers. Every metric needs a source and founder approval.
- No security guarantees. Say “helps you understand the risk” or “reduces the chance of
  shipping blind”, never “prevents breaches”.
- No “we fix your code”. Gekonstruct never writes to the repository.
- Roadmap language: “planned”, “in development”, “we’re exploring”, “coming next”.
- If a screenshot is a mock, label it **mockup** / **concept**.
- If a result comes from one tester, say “one tester” — never generalise to “users”.
- Never invent a URL, social handle, launch date or waitlist. Use only the links the founder
  supplies.

### Privacy

- Public repo does not mean public permission. Ask before featuring someone’s project,
  name, face or repo URL.
- Blur API keys, tokens, emails, customer data, database names and internal URLs.
- Never show `.env` contents, private keys, session cookies or Firebase config that is not
  already public.
- Do not show a real user’s dashboard without consent and without redacting XP/email if asked.

### Approval checklist

- [ ] Is the feature actually live? (Checked against §7 and the live product.)
- [ ] Is the required hashtag present, exactly one, at the top or bottom?
- [ ] Is Geko in the visual, actively explaining something?
- [ ] Is there exactly one CTA?
- [ ] Are secrets, emails and private data removed?
- [ ] Is every claim sourced or softened?
- [ ] Is there alt text / a caption file for video?
- [ ] Does it look like Gekonstruct, not a generic SaaS post?

---

## 14. Glossary

- **Vibe-coder** — someone who builds with AI assistance, often without a traditional CS
  background. Used with respect.
- **Context wall** — the point where a project is too large for the owner or the AI to hold
  in context; fixes stop converging.
- **AI slop** — shipped code that nobody understands, often generic or unsafe. The enemy is
  the slop, not the builder.
- **Guidebook** — the generated learning material for one repository: map + lessons + (later)
  debug sessions.
- **Pathway** — one learning route: Architecture Overview, Foundations, Debug & Learn.
- **Lesson** — one focused explanation built from real files, with a short quiz.
- **XP** — the gamified reward for passing a lesson / completing a pathway.
- **Geko** — the chameleon mentor and narrator.
- **Course centre** — the planned catalogue of structured courses beyond the user’s own repo.
- **Project course** — a course built from a real project with the creator’s permission;
  learners build or modify the project as they learn.

---

## 15. Approved short copy

**Bio options**

> Gekonstruct turns your own repo into a course. Real files, real lessons, a chameleon who
> explains the parts AI glossed over. You vibe-coded it. Now own it.

> The missing step between “AI built it” and “I can change it safely.”

**CTA options**

- Connect your repo.
- See your architecture map.
- Start with one lesson.
- Read the map before the next fix.
- Own the code you shipped.

**Reply tone**

- “Fair question — here’s what it does today…”
- “Not yet. It’s on the roadmap, and we’ll say so when it’s live.”
- “That’s exactly the context wall. Here’s how Geko handles it…”

---

## 16. Sources and updates

- **This file is the standalone source of truth for social content.** No other project file
  is required.
- **The founder confirms what is live.** Before a feature, bug-fix or milestone post, ask for
  the release note, screenshot or confirmation. If a claim conflicts with the live product,
  the live product wins — update this file immediately.
- **Visual rules:** `design-system.md`.
- **Brand assets:** request the current Geko badge/mascot reference and any approved
  screenshots from the founder. Do not reconstruct a logo from memory.

When this file and the live product disagree about what is live, **the live product wins**.
Update this file after a milestone, not before it.
