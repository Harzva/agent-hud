# evolution-2026-04-19-agenthud-message-protocol.md

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-message-protocol.md`
- `src/host/panel-view.js`
- `src/host/thread-page.js`

## Bounded Target

Complete `AGHUD-007` only by simplifying the webview-to-host message protocol into an allowlisted dispatcher with safe unknown-message handling and provider-scoped errors.

## Completed Work

- Added `src/host/message-protocol.js`.
- Added an allowlist for current and near-term pure ThreadPage messages:
  - provider selection;
  - thread selection;
  - refresh;
  - query, status filter, and sort changes;
  - quick switch;
  - copy thread ID;
  - native-open stub;
  - rename/archive capability-gated stubs;
  - storage-shaped no-ops.
- Refactored `src/host/panel-view.js` so `handleMessage` normalizes messages and sends them through one `dispatchMessage` switch.
- Unknown or invalid message types are ignored safely before dispatch.
- Host responses now include `requestId`, `provider`, `ok`, and `error` when the webview supplies a `requestId`.
- Handler failures are recorded in provider-scoped list/detail error state before render.
- Updated `src/host/thread-page.js` so webview messages include request IDs.
- Added `src/host/message-protocol.test.js` for protocol normalization and unknown-message smoke coverage.
- Updated `tasks.json`: `AGHUD-007` is now `completed` with evidence.

## Validation

- `node --check src/host/panel-view.js && node --check src/host/thread-page.js && node --check src/host/message-protocol.js && node --check src/host/message-protocol.test.js`
- `node src/host/message-protocol.test.js && node src/host/providers/codex.test.js && node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/panel-view.js src/host/thread-page.js src/host/message-protocol.js src/host/message-protocol.test.js package.json || true`

## Failed or Deferred

- Cache-first hydration remains deferred to `AGHUD-025`.
- Provider persistence remains deferred to `AGHUD-010`.
- Claude parsing/indexing was not implemented.
- Native-open behavior remains a capability-gated stub until provider-specific actions are implemented.
- No package/dependency changes were made.
- No recovered source extension files were modified.

## Decisions

- The protocol keeps existing simple webview message names to avoid a needless UI rewrite in this slice.
- Request/response shape is opt-in through `requestId`, so old-style messages still work.
- Storage-shaped messages are accepted as no-ops only; durable state still belongs to later storage tasks.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-message-protocol.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-025` is now unblocked and should come before broader provider-contract work.
Implement cache-first Codex thread hydration only: read cached summaries if present, render immediately, refresh adapter data in the background, and keep stale data visible on scan failure.
Do not implement Claude, provider persistence, package changes, Python/FastAPI/local HTTP services, native sqlite, dependencies, or excluded dashboard features.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
Run the lightest relevant validation for changed files.
```
