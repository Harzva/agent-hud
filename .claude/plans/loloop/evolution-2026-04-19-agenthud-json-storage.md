# AgentHUD Evolution: JSON Storage

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-json-storage.md`
- `src/host/summary-cache.js`
- `src/host/ui-state.js`
- `docs/agenthud/provider-contract.md`

## Bounded Target

Complete `AGHUD-026` only by adding a small schema-versioned JSON storage helper and documenting the compatibility boundary with existing `globalState` UI persistence.

## Completed Work

- Added `src/host/json-storage.js`.
- Added `src/host/json-storage.test.js`.
- Added `docs/agenthud/json-storage.md`.
- Refactored `src/host/summary-cache.js` to use the shared JSON storage helper for provider summary paths, tolerant versioned reads, and atomic writes.
- Updated `src/host/summary-cache.test.js` to assert corrupt provider summary JSON returns `null`.
- The storage helper now provides:
  - `createJsonStorage`
  - `readVersionedJson`
  - `writeVersionedJson`
  - `providerSummaryPath`
  - `sourceManifestPath`
  - `stateJsonPath`
  - `readSourceManifest`
  - `writeSourceManifest`
  - `normalizeSourceManifestEntry`
- Source manifest entries normalize `provider`, `path`, `size`, `mtimeMs`, `cacheKey`, `parseStatus`, and `lastError`.
- The reserved `agenthud/state.json` path is documented, but `AGHUD-010` UI preferences remain in VS Code `globalState`.
- Updated `tasks.json`: `AGHUD-026` is now `completed` with evidence.

## Validation

- `node --check src/host/json-storage.js src/host/json-storage.test.js src/host/summary-cache.js src/host/summary-cache.test.js src/host/ui-state.js`
- `node src/host/json-storage.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/ui-state.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/json-storage.js src/host/json-storage.test.js src/host/summary-cache.js src/host/summary-cache.test.js src/host/ui-state.js docs/agenthud/json-storage.md || true`

## Failed or Deferred

- Claude source discovery and parsing were not implemented.
- Hot indexing and provider-tab integration were not implemented.
- File-backed UI-state migration was not implemented; `agenthud/state.json` is reserved and documented only.
- Pin UI/state was not implemented.
- No package, dependency, service/backend, native-open depth, or runtime scaffold changes were made.
- No recovered source extension files were modified.

## Decisions

- Summary cache now shares the same tolerant read and atomic write primitives as future AgentHUD JSON files.
- Corrupt or unsupported provider-summary files return `null` and can be rebuilt from source transcripts.
- UI state remains separated from rebuildable provider indexes: current preferences stay in `globalState`, while provider summaries and source manifests live under `agenthud/index`.

## Next Handoff

```text
Pick the next smallest dependency-ready task in milestone order.
`AGHUD-011` is now the next unblocked task: discover Claude transcript sources under ~/.claude/projects and return project directory, JSONL path, session ID, size, mtime, and likely cwd/project label.
Keep the slice discovery-only. Do not implement Claude parsing, hot index cache, provider API integration, package changes, dependencies, services/backends, native-open depth, pin UI, or excluded dashboard features.
```

