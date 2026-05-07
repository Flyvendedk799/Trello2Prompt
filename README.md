# Trello2Prompt

Standalone web app that turns Trello cards into clean delegation prompts you copy-paste into agentic coding tools (Claude Code, Cursor, etc.).

## How it works

1. Point it at any Trello board.
2. The AI of your choice analyzes the board's structure and figures out which lists/labels mean "ready to work on" — different boards use wildly different conventions.
3. Override the AI's verdicts in the UI if you disagree; choices persist per-board.
4. Click **Generate prompts** — get one delegation-style prompt per actionable card (or one grouped prompt per list). Copy to clipboard, paste into your agent.

## Setup

Requires Node 20+.

```bash
git clone <this repo>
cd Trello2Prompt
cp .env.local.example .env.local
# Edit .env.local — fill TRELLO_API_KEY, TRELLO_TOKEN, and at least one AI key
npm install
npm run dev
```

Open http://localhost:3000.

### Trello credentials

Get them from https://trello.com/app-key. You need both the API key and a token.

### AI providers

Configure any one of these in `.env.local`:

| Provider | Env vars |
|---|---|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` |
| OpenAI (GPT) | `OPENAI_API_KEY` |
| Google (Gemini) | `GOOGLE_GENERATIVE_AI_API_KEY` |
| OpenAI-compatible (Ollama, LM Studio) | `OPENAI_COMPATIBLE_BASE_URL`, optionally `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_MODEL` |

Switch the active provider and model at any time in `/settings`. Switches take effect on the next analyze/generate click; no restart needed.

## Verifying the install

1. http://localhost:3000 — your boards.
2. http://localhost:3000/api/health — `{ "trello": true, "providers": { ... } }`.
3. Click a board → **Analyze board** → review the verdicts.
4. Adjust overrides if needed → **Save overrides**.
5. Pick **One per card** or **Grouped per list** → **Generate prompts**.
6. Click **Copy** on a prompt → paste into your agent.

## Testing

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run build
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Banner: "Connect Trello" | Add `TRELLO_API_KEY` and `TRELLO_TOKEN` to `.env.local`, restart dev server. |
| "Trello token rejected (401)" | Regenerate the token at https://trello.com/app-key. |
| "Active AI provider has no key" banner | Either add the missing env var or switch provider in `/settings`. |
| Toast: "model output did not match schema" | Try again, or switch to a stronger model. The raw output is shown in the toast. |
| `data/config.json` corrupted | The app auto-backs up to `data/config.json.bak.<timestamp>` and rewrites defaults. |

## What's not in v1

No auth, no multi-user, no cloud deploy, no prompt history persistence, no local repo enrichment (the receiving agent already has repo access).

## Architecture

- **Next.js 15 App Router + React 19 + TypeScript** — Route Handlers (`src/app/api/*`) keep all credentials server-side.
- **Vercel AI SDK v5** — single interface across all four providers.
- **Trello REST via `fetch`** — `src/lib/trello/client.ts`.
- **Zod everywhere** — `generateObject({ schema })` enforces structured AI output with one retry on parse failure.
- **Local JSON config** at `./data/config.json` — atomic writes + in-process mutex. No DB.
