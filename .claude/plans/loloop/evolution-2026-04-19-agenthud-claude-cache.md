# AgentHUD Evolution: Claude Cache

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-cache-report-sync.md`
- `src/host/providers/claude.js`
- `src/host/json-storage.js`

## Bounded Target

Complete `AGHUD-013` only by implementing a cache-only Claude parsed-summary index keyed by source path, size, and mtime.

## Completed Work

- Extended `src/host/providers/claude.js` with:
  - `buildClaudeSummaryIndex(options)`
  - `claudeParseCachePath(root)`
  - cache read/write helpers and entry validation
  - provider method `buildSummaryIndex` in `createClaudeProvider`
- Implemented parsed-summary cache behavior:
  - cache key uses `path:size:mtimeMs`;
  - unchanged entries are reused;
  - changed entries are invalidated and reparsed;
  - missing/corrupt/unsupported cache payloads rebuild safely;
  - cache file path is explicit: `globalStorageUri/agenthud/index/claude-parse-cache.json`;
  - writes are atomic via temp-file + rename.
- Added metadata counters for `discovered`, `parsed`, `reused`, `invalidated`, and `errors`, plus cache path/rebuilt state.
- Added `src/host/providers/claude-cache.test.js` with focused coverage for hit/miss, invalidation on size/mtime, corrupt-cache rebuild, force rebuild, and temp-file cleanup.
- Updated `tasks.json`: `AGHUD-013` is now `completed` with evidence.

## Validation

- `node --check src/host/providers/claude.js src/host/providers/claude-cache.test.js src/host/providers/claude.test.js src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude-cache.test.js`
- `node src/host/providers/claude-parser.test.js && node src/host/providers/claude.test.js`
- `node src/host/json-storage.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js && node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/providers/claude.js src/host/providers/claude-cache.test.js src/host/providers/claude.test.js src/host/providers/claude-parser.test.js || true`

## Failed or Deferred

- Claude provider API runtime wiring (`AGHUD-014`) was not implemented.
- ThreadPage/panel Claude UI integration was not implemented.
- Package/dependency/runtime service changes were not made.

## Next Handoff

```text
Complete `AGHUD-014` only.
Expose Claude provider list/detail APIs from the host provider module using discovery + parser + cache outputs and capability flags.
Do not wire Claude into panel runtime or ThreadPage UI in this slice.
```

