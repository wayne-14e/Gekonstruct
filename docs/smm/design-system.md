# Gekonstruct — SMM Design System

> **What this file is:** the visual source of truth for every social post, thumbnail, carousel,
> image prompt and short video. It translates the live app (`src/app/globals.css` and the brand
> components) into rules an SMM agent can follow without opening the codebase.
>
> **Companion file:** `docs/smm/database.md` — mission, audience, voice, status and hashtags.
>
> **One rule above all:** every post must include **Geko actively guiding or explaining
> something**, and exactly one required hashtag (`#update`, `#bug_fix`, `#new_feature`,
> `#new_milestone`) at the top or bottom.

---

## 1. The design idea

**“An IDE you can learn in.”**

Gekonstruct looks like a serious developer tool that happens to be a great teacher. The
reference is **Duolingo × JetBrains**:

- **JetBrains half:** dark editor surfaces, mono labels, file paths, code windows, precise
  borders, restrained colour, zero toy-like chrome.
- **Duolingo half:** chunky buttons, XP rewards, progress bars, a mascot with feelings and
  short, satisfying learning loops.

It is **not** cyberpunk, not a generic SaaS dashboard, not a cartoon kids’ app, and not a
“hacker” aesthetic. No hoodies, no matrix rain, no robots, no glowing brains.

Keywords: **dark, precise, code-first, warm, gamified, real, calm, optimistic.**

Use “Duolingo × JetBrains” only as an internal design reference. Never put those brand names
in a caption, image, ad or public post, and never imitate their logos or characters.

---

## 2. Colour

Dark-only. There is no light theme, and social posts must not invent one.

### 2.1 Core surfaces

| Token | Hex | Use |
|---|---|---|
| Background | `#0B0F14` | Page / post background |
| Card | `#121821` | Panels, speech bubbles, cards |
| Elevated | `#1A2230` | Secondary buttons, active surfaces |
| Code surface | `#0E141B` | Code blocks, terminal windows |
| Code surface alt | `#101720` | File-path chips |
| Border | `#253041` | 1px borders everywhere |
| Input border | `#33415A` | Hover / focused inputs |
| Foreground | `#E8F0F6` | Primary text |
| Muted foreground | `#94A3B3` | Secondary text, labels |
| Code text | `#A9BCCB` | Code and path-chip text |

### 2.2 Brand accents

| Token | Hex | Use |
|---|---|---|
| Primary lime | `#5BE000` | Main accent, success, CTA, progress |
| Primary edge | `#3C9C00` | 3px bottom edge on chunky buttons |
| Ink on lime | `#08140A` | Text/icons on lime fills |
| Lime text | `#7CF03D` | Lime text on dark |
| Success text | `#8CE85F` | “Passed”, success labels |
| Teal | `#2DD4BF` | Curiosity, map, “encouraging” mood |
| Amber | `#FFC53D` | XP, rewards, “proud” mood |
| Violet | `#A78BFA` | Rare chart/accent only |
| Danger | `#FF7A70` | Real failures only — never decoration |

### 2.3 Tinted surfaces (use these instead of opacity hacks)

| State | Background | Border | Text |
|---|---|---|---|
| Success / ready | `#0E2A1C` | `#1E5033` | `#8CE85F` |
| Teal / map | `#0B2B2B` | `#155149` | `#7CE7D8` |
| Amber / XP | `#2B1F06` | `#584211` | `#FFD57A` |
| Danger | `#2B1210` (derived) | `#5A2420` (derived) | `#FF7A70` |

### 2.4 The chameleon-skin gradient

```
linear-gradient(100deg, #2DD4BF 0%, #5BE000 55%, #FFC53D 100%)
```

Use **only** for:

- the brand mark / logo badge,
- XP and milestone moments,
- a thin underline or small burst,
- the Geko mascot aura in a celebration post.

Never use it as a full-bleed background, on body text, on code, or on every post. It is the
one place we “spend colour”.

### 2.5 Colour proportion

For a typical post:

- 70–80% dark surface,
- 10–15% neutral text/borders,
- 10–15% lime,
- teal/amber as a small signal,
- red only for a real error state.

### 2.6 Colour rules

- No pure black (`#000`) or pure white (`#FFF`).
- No blue/purple SaaS gradients. No glassmorphism. No neon glow baths.
- Lime is the loudest voice; do not use it for large body paragraphs.
- Red is reserved for failure, never for “attention”.
- On lime fills, use `#08140A` ink — never white.
- Green text on dark must be `#8CE85F` or lighter, not the button lime, for readability.

---

## 3. Typography

### 3.1 Families

| Role | Family | Notes |
|---|---|---|
| Display + UI | **Space Grotesk** | 700 for headlines, 500/600 for UI, 400 for body |
| Code + labels | **JetBrains Mono** | 400/500/700; paths, metrics, labels, code, hashtags |

Both are open-source and already used in the app. Do not substitute Inter, Roboto, Arial or a
serif. Do not use italics anywhere.

### 3.2 Display rules

- Weight 700.
- Tracking: **-0.03em to -0.045em** (tight, editorial).
- Line-height: **0.94–1.05** for large headlines.
- Sentence case, not ALL CAPS, except short mono labels.
- Maximum 2–3 lines for a social headline.

### 3.3 Body rules

- Space Grotesk 400/500, 15–17px in app; 28–36px on a 1080×1350 post.
- Line-height 1.55–1.65.
- Keep paragraphs under 3 lines on image.
- Use `text-wrap: pretty` in the app; on social, break lines manually for rhythm.

### 3.4 Mono rules

- Labels: 11–13px in app, **20–26px on social**, uppercase, tracking **0.12em**, muted.
- File paths: 12–14px app, 20–24px social, no uppercase, negative tracking optional.
- Hashtag: mono uppercase, tracking 0.08em, in a bordered pill.
- XP numerals: mono, tabular, amber.

### 3.5 Social type scale (1080×1350 baseline)

| Element | Size |
|---|---|
| Eyebrow / category | 24–28px mono uppercase |
| Headline | 76–112px Space Grotesk 700 |
| Subhead | 36–44px Space Grotesk 500 |
| Body | 30–34px Space Grotesk 400 |
| Code / path chip | 22–26px JetBrains Mono |
| Hashtag pill | 22–26px JetBrains Mono uppercase |
| Wordmark | 28–34px Space Grotesk 700 |

Never let text touch the outer 64px (portrait) or 80px (story).

---

## 4. Logo

### 4.1 The lockup

- **Badge:** a lime rounded square (`#5BE000`, radius 8–10px) with Geko drawn in dark ink
  (`#08140A`), plus a 2–3px darker lime bottom edge (`#3C9C00`).
- **Wordmark:** “Gekonstruct” in Space Grotesk 700, tight tracking, foreground `#E8F0F6`.
- **Clear space:** at least the height of the badge on all sides.
- **Minimum size:** 24px badge / 120px full lockup for legibility.

### 4.2 Logo rules

- Do not stretch, rotate, outline, add drop shadows or change the badge colour.
- Do not place the logo over busy code. Put it on a dark surface or in a corner with breathing
  room.
- On a lime background, invert: dark badge, lime mark.
- The in-app mark is currently a placeholder; do not redesign the character in social posts.
  Treat the app mark as the canonical silhouette until a real mascot sheet exists.

### 4.3 Canonical reference asset

`src/app/icon.svg` is the current app icon: lime rounded square, dark line-art Geko, same
silhouette used in the product. Export it (or attach it as a reference image) whenever an
image model needs to draw Geko. Do not rely on a text description alone; models drift. If a
larger transparent mascot sheet is produced later, it replaces this reference — update both
this file and the app together.

---

## 5. Geko, the mascot

Geko is a **chameleon mentor**, not a sticker. He is the one posting, explaining, reacting and
pointing. If a post could work with the mascot removed, the post is wrong.

### 5.1 Canonical silhouette

- Chameleon: rounded head, large circular eye, compact body, curled spiral tail, short legs,
  often perched on a branch.
- Thick, rounded line art. Flat vector look. No fur, no scales texture, no photorealism.
- Single ink colour per mood (lime, teal or amber). The skin gradient belongs to the logo/XP
  moments, not to his whole body.
- Friendly and curious, never smug or babyish. He is a mentor, not a pet.

### 5.2 Moods

| Mood | Tile background | Ink | Border | When |
|---|---|---|---|---|
| `calm` | `#0E2A1C` | `#5BE000` | `#1E5033` | Default explanations, progress |
| `encouraging` | `#0B2B2B` | `#2DD4BF` | `#155149` | When the user is stuck, maps, curiosity |
| `proud` | `#2B1F06` | `#FFC53D` | `#584211` | Passed quizzes, milestones, XP |

### 5.3 Poses (pick one per post)

1. **Pointing** at a code line or file-path chip.
2. **Holding a magnifying glass** over a diff or error line.
3. **Peeking** from behind an app window.
4. **Holding a lesson card** or checklist.
5. **Sitting on the window chrome** with a speech bubble.
6. **Celebrating** next to an XP chip / 100% progress bar (amber mood).

Keep poses readable at thumbnail size. No complex action scenes.

### 5.4 The speech bubble

Mirror the app component:

- Dark card `#121821`, 1px `#253041` border, radius 12–16px, top-left corner tighter (4px).
- Mono label **GEKO** in the top-left, 10–12px, uppercase, 0.14em tracking, muted.
- Body 24–30px Space Grotesk, 1–2 short sentences, max ~12 words on image.
- A small tail or overlap pointing to Geko.
- One 🦎 maximum per post, optionally at the end of the bubble line.

### 5.5 Geko rules

**Do**

- Make him interact with the content: point, hold, inspect, present.
- Keep him 20–35% of the frame height; the message stays the hero.
- Match mood to the post: lime for progress, teal for explanation, amber for wins.
- Let him carry the hook in the bubble when the headline is already long.

**Don’t**

- 3D/Pixar render, photoreal lizard, furry creature, extra limbs, human hands.
- Hoodies, sunglasses, headphones or “hacker” props.
- Change species or colour per post; keep the same character.
- Paste him in a corner doing nothing.
- Put a paragraph in the bubble. One idea only.
- Use more than one mascot in a frame.

### 5.6 Image-generation description

Use this character description inside every image prompt:

> “Geko, a friendly chameleon mascot drawn as clean flat vector line art with thick rounded
> strokes, a large circular eye, a compact body and a curled spiral tail, perched on a small
> branch. Single ink colour, no gradients on the body, expressive but not childish. Dark
> developer-tool aesthetic.”

Then specify the mood colour and pose.

---

## 6. Core visual motifs

These are the elements that make a post recognisably Gekonstruct. Use **two or three** per
post, not all of them.

### 6.1 The app window

- Dark rounded window (`#121821`, radius 16–24px, 1px `#253041`).
- Top bar with three dots: red `#FF7A70`, amber `#FFC53D`, lime `#5BE000` (left to right).
- A mono window title, e.g. `your-repo / overview`.
- Optional tabs in mono.
- Content inside: real UI patterns — lessons, paths, progress, code.

This is the main “proof” object. It should look like the product, not a generic browser.

### 6.2 File-path chips

The visual signature of “this is real code in YOUR repo”.

- Background `#101720`, border `#253041`, radius 6px.
- JetBrains Mono 12–14px (22–26 social), colour `#A9BCCB`.
- Padding 2px 7px in app; 10px 16px on social.
- Always a plausible real path (`app/api/scan/route.ts`, `lib/analyzer.ts`), never lorem ipsum.

### 6.3 Mono eyebrow labels

Small uppercase JetBrains Mono labels above headlines:

- `PATHWAY 01 · FOUNDATIONS`
- `GEKO / FIELD NOTES`
- `CHANGELOG · 19 NOV`
- `REAL FILES · REAL LESSONS`

Tracking 0.12em, muted. This is the JetBrains voice.

### 6.4 Chunky buttons

- Lime fill `#5BE000`, dark ink `#08140A`, radius 8px.
- **3px bottom edge** in `#3C9C00`, compressing by 2px on press.
- Large CTA: uppercase, bold, 0.08em tracking.
- Secondary: transparent with `#253041` border; hover fills `#1A2230`.

On social, a button can be a visual prop in a mock UI or a real CTA end-card. Do not put more
than one button in a frame.

### 6.5 XP chip

- Background `#2B1F06`, border `#584211`, text `#FFC53D`.
- Lightning bolt icon, mono numerals, uppercase “XP”.
- Use for rewards, milestones, “+20 XP”, “+50 bonus”.

### 6.6 Stage pills

Small mono uppercase pills with 1px borders:

- Ready / success: `#0E2A1C` / `#1E5033` / `#8CE85F`
- In progress: `#2B1F06` / `#584211` / `#FFD57A`
- Map / teal: `#0B2B2B` / `#155149` / `#7CE7D8`
- Failed: `#2B1210` / `#5A2420` / `#FF7A70`

### 6.7 Progress bar

- Height 6–8px app, 10–14px social.
- Track `#1A2230`, fill lime, fully rounded.
- Optional mono label: `4 / 6 LESSONS`.
- On milestones, fill 100% and add a small amber XP burst.

### 6.8 Editor grid + glow

The landing-page background is part of the brand:

- 32px grid lines at 5% white (`rgba(232,240,246,0.05)`).
- Radial lime glow at the top-left (`rgba(91,224,0,0.16)`), teal glow at the bottom-right
  (`rgba(45,212,191,0.10)`).
- Keep it subtle. If the glow is obvious at thumbnail size, it is too strong.

### 6.9 Code block

- `#0E141B` surface, 1px border, radius 12px.
- JetBrains Mono, 13–15px app, 24–28px social.
- App screenshots use the shiki `github-dark-default` theme. For custom social code art,
  keep punctuation `#A9BCCB` and use lime, teal, amber and violet sparingly — no rainbow.
- Always use **fake, generic code** in generated images; never real secrets or customer data.
- Add a path chip above the block so it reads as a real file.

---

## 7. Social formats and layouts

### 7.1 Sizes

| Format | Size | Use |
|---|---|---|
| Portrait feed | **1080×1350** (4:5) | Primary post, carousel cover |
| Square | 1080×1080 | Cross-post, quote card |
| Story / Reel | **1080×1920** (9:16) | Video, behind-the-scenes |
| Landscape | 1600×900 | X / LinkedIn, demo still |
| Thumbnail | 1280×720 | Video cover |
| OG image | 1200×630 | Link preview |

### 7.2 Safe areas

- Portrait: 64px outer margin; keep text and Geko inside.
- Story/Reel: 80px margin; avoid the top 250px and bottom 320px (platform UI).
- Landscape: 80px margin.
- Keep the headline in the central 80% so crops do not eat it.

### 7.3 Template A — “Window + Geko explainer” (default)

```
┌──────────────────────────────────────┐
│ GEKO / FIELD NOTES        #update    │  ← eyebrow + required hashtag
│                                      │
│  Your repo is                        │  ← 2–3 line headline
│  the curriculum.                     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ● ● ●  your-repo / overview    │  │  ← app window
│  │                                │  │
│  │  [path chip]  [stage pill]     │  │
│  │  lesson list / progress / code │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                          ┌─────────┐ │
│                          │ GEKO    │ │  ← bubble
│                          │ one line│ │
│                          └────┬────┘ │
│                            [Geko]    │  ← pointing at the window
│                                      │
│  Gekonstruct             CTA →       │  ← wordmark + one CTA
└──────────────────────────────────────┘
```

Use this for features, updates, explanations and most milestone posts.

### 7.4 Template B — “Milestone”

- Huge number or short phrase (`6 LESSONS`, `FOUNDATIONS ✓`).
- A 100% lime progress bar or an amber XP chip.
- Geko in `proud` mood, celebrating beside the number.
- Skin gradient allowed as a thin underline or small burst.
- Hashtag top-right or bottom-left.
- Wordmark bottom.

### 7.5 Template C — “Before / after”

- Two code windows side by side or stacked, with an arrow.
- Left: “before” label in muted mono, amber/red accent if it is a bug.
- Right: “after” label in lime, calmer layout.
- Geko points at the change, magnifying glass optional.
- Use only for real fixes/improvements with a real diff or a faithful mock labelled as such.

### 7.6 Template D — “One insight”

- Big editorial headline, no window.
- 2–3 path chips or a single code line as the visual proof.
- Geko peeking from the side with the takeaway in the bubble.
- Editor grid + one radial glow.
- Good for “AI slop” / ownership / context-wall posts.

### 7.7 Carousel

Maximum 6 slides:

1. **Hook** — the promise or the problem; Geko present.
2. **Context** — why it matters, one path chip or number.
3. **What changed / how it works** — app window.
4. **Proof** — code, before/after, or progress.
5. **Geko takeaway** — bubble with the one sentence to remember.
6. **CTA + hashtag + wordmark** — one action only.

Every slide keeps the same margins, type scale and footer. The required hashtag appears on the
first and last slide.

---

## 8. Image generation

### 8.1 What good looks like

A Gekonstruct image reads as a **screenshot from a beautiful, dark learning IDE** with a
friendly chameleon guide drawn into it. It is crisp, flat, high-contrast and uncluttered.
There is one message, generous negative space, and at least one real UI artifact (window, path
chip, progress bar or code block).

### 8.2 Master style prompt

Append this to every image prompt:

> “Dark developer-education app aesthetic. Background `#0B0F14` with a faint 32px editor grid
> and a soft lime radial glow top-left and teal glow bottom-right. Foreground: a rounded dark
> app window `#121821` with a 1px `#253041` border and three mac-style dots in red, amber and
> lime. Crisp flat vector UI, lime `#5BE000` primary accent, teal `#2DD4BF` secondary,
> amber `#FFC53D` for rewards, off-white `#E8F0F6` text, muted `#94A3B3` labels. Thick rounded
> line art, no gradients on the mascot, no photorealism. Generous negative space, strong
> hierarchy, one focal message. Geko the chameleon mascot is present, actively pointing at or
> explaining the content, with a small dark speech bubble labelled GEKO.”

### 8.3 Negative prompt

> “No photorealistic lizard, no 3D render, no Pixar style, no fur, no human hands, no hoodie,
> no sunglasses, no robot, no brain, no matrix code rain, no cyberpunk neon, no purple-blue
> SaaS gradient, no glassmorphism, no stock photo, no collage, no clutter, no tiny unreadable
> text, no watermark, no extra mascots, no emoji spam, no fake logos, no real person’s face,
> no real API keys or secrets.”

### 8.4 Text in generated images

Image models are bad at long text. Keep generated text to **2–5 words** maximum (a button, a
path chip, a label). Put the headline, caption, hashtag and CTA in your design tool / HTML
overlay, not in the image prompt. If the model adds gibberish text, regenerate or crop it out.

### 8.5 Per-hashtag prompts

**`#update` — build log**

> A weekly build-log post: Geko in calm lime sits on the chrome of a dark app window, pointing
> at a short list of three completed pipeline steps with check marks and a `stage` mono label.
> A small `#update` pill sits top-left. Leave the upper third empty for a headline. Dark IDE
> aesthetic, flat vector, editor grid, one soft lime glow.

**`#new_feature` — feature reveal**

> Geko in encouraging teal stands beside a newly highlighted panel inside a dark app window,
> one hand/limb pointing at a lime progress bar and a `ready` stage pill. The panel is the
> brightest object. A small `#new_feature` pill sits top-right. Leave generous space for a
> short headline. Flat vector UI, dark IDE, no 3D.

**`#bug_fix` — found it**

> Geko in calm lime holds a magnifying glass over a single highlighted line in a dark code
> window; a small amber warning chip is being replaced by a lime check. Geko’s expression is
> focused, not smug. A `#bug_fix` pill sits bottom-left. Muted red only on the “before” line.
> Flat vector, dark IDE, clean composition.

**`#new_milestone` — completion**

> Geko in proud amber celebrates beside a full lime progress bar at 100%, with a small XP chip
> and a subtle chameleon-skin gradient burst behind the number. Dark app window in the
> background, editor grid, restrained confetti (three or four lime/teal/amber shapes, not a
> party explosion). A `#new_milestone` pill sits top-left. Leave room for a big milestone
> headline.

**Roadmap / marketplace (`#update`)**

> Geko in encouraging teal unrolls a blueprint of course cards connected by thin lime lines,
> with one card highlighted and the others muted. A `planned` mono pill makes the status
> explicit. Dark IDE surface, path chips, no fake product screenshots, no dates. Flat vector,
> calm and credible, not hype.

### 8.6 Image QA

- [ ] Geko is present and doing something related to the message.
- [ ] One focal point; the eye lands on the headline or the highlighted UI, not the glow.
- [ ] Background is `#0B0F14`-family, not pure black.
- [ ] Lime is an accent, not a wall.
- [ ] No more than two type sizes of headline + one mono label.
- [ ] Required hashtag pill is visible at top or bottom.
- [ ] Wordmark appears once, unobtrusively.
- [ ] No gibberish text, no extra limbs, no third eye, no second mascot.
- [ ] No secrets, emails, keys or private repo names.

---

## 9. Video and motion

### 9.1 Format

- 9:16, 1080×1920, 30fps, 15–35 seconds.
- Hook in the first 1.5 seconds: a question, a broken state, or a concrete promise.
- Real screen recording of the product, not a fake animation of a product.
- Geko overlay in the lower third or beside the action, with a short bubble.
- Burned-in captions, 2–6 words per line, max 2 lines.
- End card: wordmark, one CTA, required hashtag, 1.5–2s hold.

### 9.2 Structure

| Time | Beat |
|---|---|
| 0–1.5s | Hook: “Your AI fixed one file and broke three.” / “This repo has 214 files. Do you know them?” |
| 1.5–4s | Context: show the real project or the problem |
| 4–20s | Demo: one flow, real UI, cursor visible, no dead time |
| 20–27s | Geko explains the takeaway in one sentence |
| 27–32s | End card: CTA + hashtag + wordmark |

### 9.3 Motion rules

- Cuts every 1.5–3s; no long static holds.
- Ease-out, 150–250ms transitions; no glitch, shake, zoom-blast or whoosh spam.
- Zooms max 110%; keep UI legible.
- Geko animation is simple 2D: blink, tail sway, point, small bounce. No 3D.
- Respect `prefers-reduced-motion`: provide a static cover and captions.
- Music: minimal electronic/lo-fi, low under voice. No copyrighted tracks.
- Sound effects: soft clicks/pops only; no loud impacts.

### 9.4 Screen-recording rules

- Use the dark app at 1440×900 (desktop) or 390×844 (mobile), scaled up for legibility.
- Hide personal data, emails, XP totals if requested, and any secrets.
- Do not show a real repo the owner has not approved.
- Keep the cursor movement intentional; no hunting for buttons.
- If a feature is not live, do not fake a screen recording. Use a labelled concept card.

---

## 10. Voice in the visuals

The design and the copy must agree:

- **Headline:** one concrete promise or observation, sentence case, 2–3 lines.
- **Geko bubble:** the human takeaway, 1–2 short sentences.
- **Mono label:** context (`CHANGELOG`, `PATHWAY 01`, `REAL FILES`).
- **CTA:** one action (`Connect your repo`, `Read the map`, `Start a lesson`).
- **Hashtag:** required category tag, top or bottom.

Do not put the same sentence in the headline and the bubble. The headline states the change;
Geko explains why it matters.

---

## 11. Accessibility

- Body text on dark: `#E8F0F6` or `#94A3B3` only. Never lime body copy.
- Minimum social text: 24px at 1080px width; captions at least 20px.
- Contrast targets: foreground/background ≥ 15:1, muted/background ≥ 6:1, primary/background
  ≥ 10:1.
- Never use colour alone to mean success/failure; add a check, label or icon.
- Every image gets alt text. Every video gets a caption file.
- Avoid flashing, rapid strobes and high-frequency patterns.
- Provide a static cover for video and a reduced-motion version of animated posts.

---

## 12. Post QA checklist

**Content**

- [ ] Exactly one required hashtag (`#update`, `#bug_fix`, `#new_feature`, `#new_milestone`),
      top or bottom.
- [ ] The feature/bug/milestone is actually live (checked against `database.md` §7).
- [ ] One idea, one CTA.
- [ ] Claims sourced or softened; roadmap labelled planned.
- [ ] No secrets, emails, tokens, private repos or unapproved user data.

**Design**

- [ ] Dark IDE aesthetic, `#0B0F14` family — not pure black, not light mode.
- [ ] Space Grotesk headline, JetBrains Mono labels/paths, no serif/italic.
- [ ] Lime accent used sparingly; one glow, not five.
- [ ] Geko present, in character, actively explaining.
- [ ] App window / path chip / progress / code artifact included.
- [ ] Hashtag pill legible at thumbnail size.
- [ ] Wordmark once, with clear space.
- [ ] Text inside safe area; no platform UI overlap.
- [ ] Alt text and caption written.

**Brand**

- [ ] Geko is not smug, babyish or decorative.
- [ ] No shaming the user; the enemy is slop, not the builder.
- [ ] No hype words.
- [ ] No fake metric, logo, quote or count.
- [ ] Looks like Gekonstruct at a glance, even without the wordmark.

---

## 13. Worked examples

> Captions and claims follow `database.md`. Replace bracketed placeholders with real facts.

### 13.1 `#new_feature` — Architecture map is live

**Visual:** Template A. A dark window titled `your-repo / overview`, with three layer rows,
two path chips, a teal `map` pill, and a progress line. Geko in `encouraging` teal points at
the first layer from the right; bubble: “Start with the map. Then the files make sense.”

**Caption**

```
#new_feature

The architecture map is live.

Connect a public repo and Geko turns it into plain-English layers, data flow and the concepts
that hold it together — every chip is a real file in your project.

Not a generic diagram. Your code, mapped.

Read the map before your next fix. 🦎
```

### 13.2 `#new_milestone` — Foundations pathway complete

**Visual:** Template B. Huge `FOUNDATIONS ✓`, a full lime progress bar, `6 / 6 LESSONS`, an
amber `+50 XP` chip, Geko in `proud` mood with a small gradient burst. Hashtag top-left.

**Caption**

```
#new_milestone

Foundations is complete.

6–10 lessons, built from your own files. Each one ends with a quiz, and a pass earns XP.
Finish the pathway and the +50 bonus is yours — once, no farming.

You built it with AI. Now you can explain it. 🦎

Start with one lesson.
```

### 13.3 `#bug_fix` — every code reference is checked

**Visual:** Template C. Left window: a lesson citing `lib/invented.ts`, amber warning.
Right window: the same lesson with a lime check and a real path. Geko holds a magnifying glass,
calm mood, bubble: “If it isn’t in your repo, it doesn’t get taught.”

**Caption**

```
#bug_fix

A lesson should never point at a file that doesn’t exist.

So every code reference, path and quiz option is now checked against your actual snapshot.
Invented paths fail the stage and get one repair attempt — not a place in your pathway.

Small fix. Big trust difference.

[Replace with the real bug and the real verification step.]
```

### 13.4 `#update` — what comes next

**Visual:** Template D. Headline “The debug pathway is next.” A path chip
`app/api/debug/run` and a teal `in development` pill. Geko peeks from the side with a
magnifying glass; bubble: “Bring me the error. I’ll explain the cause.”

**Caption**

```
#update

Next up: Debug & Learn.

Describe a bug in your project. Geko will point at the files that likely cause it, give
concrete fix steps, and teach the concept underneath — in your code, not a generic tutorial.

It explains. It does not auto-fix. Planned, in development, not live yet.

What should Geko debug first? 🦎
```

---

## 14. Quick reference card

```
BACKGROUND   #0B0F14     CARD      #121821     CODE      #0E141B
BORDER       #253041     TEXT      #E8F0F6     MUTED     #94A3B3
LIME         #5BE000     LIME EDGE #3C9C00     ON LIME   #08140A
TEAL         #2DD4BF     AMBER     #FFC53D     VIOLET    #A78BFA
DANGER       #FF7A70

DISPLAY      Space Grotesk 700, -0.03em
BODY         Space Grotesk 400/500
MONO         JetBrains Mono 400/500/700

RADIUS       14px base · 6px chips · 8px buttons · 16–24px windows
BORDER       1px #253041 everywhere
BUTTON       3px bottom edge #3C9C00, lime fill, dark ink
GRADIENT     100deg #2DD4BF → #5BE000 → #FFC53D (logo/XP only)
GRID         32px lines at 5% white
MOODS        calm lime · encouraging teal · proud amber

EVERY POST   Geko explaining + one of #update #bug_fix #new_feature #new_milestone
```
