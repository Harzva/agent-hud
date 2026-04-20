# AgentHUD Evolution: Claude API

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-parser.md`
- `src/host/providers/claude.js`

## Bounded Target

Complete `AGHUD-014` only by exposing Claude provider list/detail APIs from the extension host.

## Completed Work

- Extended `src/host/providers/claude.js` with:
  - `listClaudeThreads(options)`
  - `getClaudeThreadDetail(threadId, options)`
  - `claudeCapabilities()`
  - provider methods `listThreads` and `getThreadDetail` on `createClaudeProvider`
- Claude list API now supports:
  - `limit`
  - `query`
  - `sort` (`updated_desc`, `updated_asc`, `title_asc`)
  - `project` filter
  - `status` filter
- Claude list API reuses the `AGHUD-013` cache index path and parsed-summary reuse/invalidation flow.
- Claude detail API returns normalized thread/messages + source metadata and parser hidden/error metadata.
- Added `src/host/providers/claude-api.test.js` with coverage for list filters/sort/limit, detail payload shape, capabilities, and missing-thread behavior.
- Updated `tasks.json`: `AGHUD-014` is now `completed` with evidence.

## Validation

- `node --check src/host/providers/claude.js src/host/providers/claude-api.test.js src/host/providers/claude.test.js src/host/providers/claude-parser.test.js src/host/providers/claude-cache.test.js`
- `node src/host/providers/claude-api.test.js`
- `node src/host/providers/claude-cache.test.js && node src/host/providers/claude-parser.test.js && node src/host/providers/claude.test.js`
- `node src/host/json-storage.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js && node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/providers/claude.js src/host/providers/claude-api.test.js src/host/providers/claude-cache.test.js src/host/providers/claude-parser.test.js src/host/providers/claude.test.js || true`

## Failed or Deferred

- Claude panel/runtime dispatch wiring was not implemented.
- ThreadPage/UI integration for Claude data was not implemented.
- Package/dependency/service/runtime policy boundaries were unchanged.

## Next Handoff

```text
Complete `AGHUD-015` only.
Add additional sanitized Claude parser fixtures and focused parser assertions for variant records (normal chat, tool calls/results, meta records, snapshots, sidechains, malformed lines).
Keep the slice fixture-and-test-only. Do not wire Claude into panel runtime or ThreadPage UI.
```

