# AgentHUD Evolution: State Persistence

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-state-persistence.md`
- `src/host/panel-view.js`
- `src/host/thread-page.js`
- `src/host/message-protocol.js`

## Bounded Target

Complete `AGHUD-010` only by adding schema-versioned, debounced UI state persistence through VS Code `globalState`.

## Completed Work

- Added `src/host/ui-state.js`.
- Added `src/host/ui-state.test.js`.
- The UI-state payload is stored under `agenthud.uiState` and includes:
  - `schema_version`
  - `updated_at`
  - selected `provider`
  - per-provider `selectedThreadId`
  - per-provider `query`
  - per-provider `statusFilter`
  - per-provider `sort`
- Runtime construction in `src/host/panel-view.js` now applies persisted UI state before first render.
- Writes are debounced for provider selection, thread selection, search/filter/sort changes, cached Codex hydration selection, and refresh-driven selected-thread replacement.
- `saveUiState` flushes the current payload.
- `loadUiState` reapplies the persisted payload and re-renders.
- Missing, invalid, or unsupported persisted payloads fall back to the default ThreadPage state.
- Updated `tasks.json`: `AGHUD-010` is now `completed` with evidence.

## Validation

- `node --check src/host/ui-state.js && node --check src/host/ui-state.test.js && node --check src/host/panel-view.js`
- `node --check src/host/panel-view.js src/host/ui-state.js src/host/ui-state.test.js src/host/thread-page.js src/host/message-protocol.js`
- `node src/host/ui-state.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/summary-cache.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/panel-view.js src/host/thread-page.js src/host/message-protocol.js src/host/ui-state.js src/host/ui-state.test.js || true`

## Failed or Deferred

- The generic file-backed JSON storage layer, source manifest, and migration policy remain deferred to `AGHUD-026`.
- Claude source discovery and parsing were not implemented.
- Pin UI/state was not implemented.
- No package, dependency, service/backend, native-open depth, or runtime scaffold changes were made.
- No recovered source extension files were modified.

## Decisions

- UI state uses VS Code `globalState` for this slice because it is small user preference state and avoids the broader storage layer.
- Persisted state includes only navigation and filters, not provider rows, details, transcripts, cache metadata, or source manifests.
- Writes are intentionally best-effort; persistence errors do not block rendering or provider refresh.

## Next Handoff

```text
Pick the next smallest dependency-ready task in milestone order.
`AGHUD-026` is now unblocked: design the small JSON storage and migration layer for UI state, provider summaries, and future source manifests under VS Code globalStorageUri.
Keep the slice limited to the storage helper/migration policy and tests. Do not implement Claude parsing, provider tabs beyond the placeholder, package changes, dependencies, services/backends, native-open depth, pin UI, or excluded dashboard features.
```

