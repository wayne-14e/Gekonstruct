# Gekonstruct 🦎

**Understand the code you build with AI.**

Gekonstruct turns a public GitHub repository into a practical, gamified guide to its own
codebase. Follow the architecture, learn the foundations, or investigate a bug with Geko the
chameleon as your guide.

> **LinkedIn company tagline:** Understand the code you build with AI.

## What you can do

- **Architecture Map** — explore how your app is organized, how requests move through it, and
  where important concepts live.
- **Foundations** — learn your project through ordered lessons, real code examples, and quizzes.
- **Debug & Learn** — describe a symptom to get likely causes and fix directions grounded in
  your repository. Gekonstruct explains; it does not edit your code.
- **Repo Roast** — get a one-line, good-natured roast tied to a real file, then share it as an
  image or caption.
- **Track your progress** — earn XP and badges as you learn.

## How it works

1. Sign in with Google and connect a public GitHub repository.
2. Gekonstruct reads and filters a bounded snapshot of the repository, then detects its stack.
3. AI creates a codebase-specific guidebook and learning pathways.
4. Explore the guide, complete quizzes, or use Debug & Learn when something goes wrong.

Gekonstruct is read-only: it does not push commits, open pull requests, or modify your
repository. Private repositories are not supported.

## Run locally

### Requirements

- Node.js 22
- npm
- A Firebase project with Google Authentication and Firestore enabled
- A DeepSeek API key

### Setup

```bash
git clone https://github.com/wayne-14e/Gekonstruct.git
cd Gekonstruct
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase web configuration, the Firebase Admin service-account
JSON, and your DeepSeek API key. Keep server secrets private and never commit `.env.local`.
An optional GitHub token raises the unauthenticated GitHub API rate limit.

Start the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment variables

See [`.env.example`](.env.example) for the full list and comments.

| Variable | Use |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Application URL used for metadata and redirects |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase browser configuration |
| `FIREBASE_SERVICE_ACCOUNT` | Server-only Firebase Admin service-account JSON |
| `DEEPSEEK_API_KEY` | Server-only key for analysis and Repo Roast |
| `DEEPSEEK_MODEL` | Optional model override; defaults to `deepseek-flash` |
| `DEEPSEEK_BASE_URL` | Optional compatible API endpoint override |
| `GITHUB_TOKEN` | Optional token for higher GitHub API limits |

`NEXT_PUBLIC_*` Firebase values are browser configuration, not service-account credentials.
Never expose `FIREBASE_SERVICE_ACCOUNT` or `DEEPSEEK_API_KEY` to client code.

## Project limits

- Public GitHub repositories only.
- Up to 3 connected projects per account.
- One Repo Roast per project.
- Ingestion keeps up to 60 files and 150,000 characters, with per-file and binary/build-output
  exclusions.
- Free-plan Debug & Learn allows up to 2 sessions per project.

## Development commands

```bash
npm run dev        # Start the local development server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript checks
npm test           # Run Vitest
npm run build      # Create a production build
npm start          # Serve the production build
```

## Community

- Telegram channel: [@gekonstruct](https://t.me/gekonstruct)
- Vibe-coder community chat: [@gekonstruct_chat](https://t.me/gekonstruct_chat)

## Product validation

The five-tester checklist and success metrics are documented in
[`docs/TEST_PLAN.md`](docs/TEST_PLAN.md).
