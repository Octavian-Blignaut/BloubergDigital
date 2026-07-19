# Receptionist

An AI WhatsApp assistant for small trade businesses in Cape Town — plumbers, mechanics, landscapers, bakers. It replies instantly to customer messages, asks trade-specific qualifying questions one at a time, and hands the owner a clean, structured lead on their own WhatsApp.

Built for one developer to maintain: a single Node.js/TypeScript service, one SQLite file, config-driven onboarding (no code changes per client).

## Phase status

- ✅ **Phase 1 — Brain + Simulator**: config loader, Claude conversation engine, SQLite persistence, `/demo` chat page, lead extraction.
- ⏳ Phase 2 — `/leads` page + owner-notification formatting (console-logged in simulator mode already).
- ⏳ Phase 3 — Real WhatsApp Cloud API channel, webhook verification, photo handling.
- ⏳ Phase 4 — Emergency flagging polish, 24h reset tests, config/lead-extraction tests.

## Tech stack

- Node.js + TypeScript (strict mode)
- Express
- Anthropic Claude (`claude-sonnet-4-6`) via tool-use for structured lead extraction
- SQLite via `better-sqlite3` (single file: `receptionist.db`)
- Plain HTML/JS for the `/demo` chat simulator — no frontend framework

## Setup

```bash
npm install
cp .env.example .env
# then edit .env and add your ANTHROPIC_API_KEY
npm run dev
```

Open **http://localhost:3000/demo** — pick a client from the dropdown and chat as a customer would. The assistant's replies are polled from an in-memory queue (see `src/channels/simulator.ts`). Owner notifications are printed to the server console (📱 prefix) since there's no real owner phone in demo mode.

## Env vars

| Var | Used by | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude conversation brain | Phase 1+ |
| `WHATSAPP_TOKEN` | Meta Cloud API send | Phase 3 |
| `WHATSAPP_PHONE_ID` | Meta Cloud API send | Phase 3 |
| `VERIFY_TOKEN` | Meta webhook verification (GET `hub.challenge`) | Phase 3 |
| `LEADS_PASSWORD` | Password-protects `/leads` | Phase 2 |
| `PORT` | Server port (default 3000) | always |

## Adding a new client

No code changes needed. Copy an existing file in `/clients` (pick the one closest to the new business's trade), edit the fields, done:

```bash
cp clients/deons-plumbing.json clients/new-client-slug.json
```

Fields:
- `businessId` — must match the filename (without `.json`); this is how the system looks the client up.
- `emergencyKeywords` **or** `orderCutoffDays` — trades with urgent callouts (plumber, mechanic) use the former; order-based businesses (bakery) use the latter. Don't set both.
- `qualifyingQuestions` — asked one at a time, in order, unless the customer already answered in passing.

The new client appears automatically in the `/demo` dropdown and is usable over real WhatsApp once Phase 3 lands — just point Meta's webhook routing at the right `businessId` (by WhatsApp Business phone number).

## How the brain works

1. Inbound message is logged to SQLite (`messages` table — this is also the audit trail).
2. The current conversation (since the last 24h+ silence gap) is loaded and sent to Claude along with a system prompt built from the client's config (see `src/brain/systemPrompt.ts`).
3. Claude replies with plain text and, once qualification is complete (or the request is out of scope / an emergency), calls the `record_lead` tool (`src/brain/leadTool.ts`) — its schema is generated from the client's own qualifying questions.
4. The lead is saved to SQLite and the owner is notified via WhatsApp (or the console, in simulator mode).

## Running tests

```bash
npm run typecheck   # TypeScript strict-mode check
npm test            # once Phase 4 tests land
```

## Compliance note (WhatsApp policy)

Business-initiated messages (i.e. messaging a customer who has *not* messaged first) require pre-approved Meta message templates. This is out of scope for v1 — Receptionist only ever replies to a customer who has already messaged in, and only notifies the owner (who has an existing relationship with the business's WhatsApp number).
