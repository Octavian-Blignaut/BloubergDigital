# Design decisions

Simplest-option calls made where the brief didn't specify, so future-me (or Copilot) doesn't relitigate them.

- **express@5** was what `npm install express` resolved to at build time — used as-is rather than pinning to v4, since routing behaviour used here (simple GET/POST, no wildcard edge cases) is unaffected.
- **tsx** for dev running (`npm run dev`) instead of `ts-node` — zero-config, fast, and already handles `.env` loading conveniently via its watch mode.
- **Demo delivery via polling, not websockets.** The `/demo` page polls `/demo/poll` every 1.2s for new outbound messages. A websocket would be more "real" but adds complexity for a sales-demo tool that's inherently low-traffic and single-user per session. Simplest option that behaves identically to the real channel from the brain's point of view.
- **Fake customer number persisted in `localStorage`** on the demo page, not tied to a login — good enough to test the 24h session-reset logic and multi-turn conversations without building auth into a sales demo.
- **Owner notifications in simulator mode go to `console.log`**, not to a second demo chat window — there's no real owner phone in a sales demo, and this keeps Phase 1 focused on the brain + customer-facing flow. Phase 2 will decide if a second simulated "owner" chat pane is worth building.
- **`record_lead` tool schema is generated dynamically** from each client's `qualifyingQuestions` array, so the same tool-use code path works for every trade without per-trade branching.
- **Emergency detection is belt-and-braces**: Claude sets `isEmergency` via the tool call based on the system prompt's rules, but `conversationEngine.ts` also does a plain keyword match against `emergencyKeywords` as a backstop, since missing a real emergency is the worst possible failure mode for this product.
- **Conversation history for the "current session"** is computed by walking backwards from the newest message and stopping at the first gap of 24h+ — done in application code against a plain `messages` table rather than a separate `sessions` table, to keep the schema minimal (per "no over-engineering").
- **Photos are stored as string references** (e.g. filenames/media IDs), not binary blobs, in both `messages.photoRefs` and `leads.photoRefs` (JSON-encoded TEXT columns) — actual media storage/hosting is a Phase 3 concern once the real WhatsApp Cloud API (which gives you a media ID to fetch) is wired up.
- **Single SQLite file (`receptionist.db`) with WAL mode enabled** — zero ops, per the brief's "no ORM, no queue" instruction, and WAL avoids writer/reader lock contention for the modest concurrency this needs.
