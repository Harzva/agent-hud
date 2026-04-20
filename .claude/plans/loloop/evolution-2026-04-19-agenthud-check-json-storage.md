# AgentHUD Evolution: Check JSON Storage Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-state-persistence.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-state-persistence.md`

## Review Window

- Last optimize dispatch completed `AGHUD-010`.
- Changed artifacts reviewed:
  - `src/host/ui-state.js`
  - `src/host/ui-state.test.js`
  - `src/host/panel-view.js`
  - `src/host/message-protocol.js`
  - `src/host/thread-page.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-state-persistence.md`

## Findings

- Scope drift: none found. The implementation stayed on small UI-state persistence and did not implement `AGHUD-026` file-backed storage, source manifests, Claude parsing, provider tabs, pin UI, package changes, services/backends, or excluded dashboard surfaces.
- Dependency risk: none found. The new UI-state helper uses only existing local modules and VS Code `globalState`.
- Runtime/backend risk: none found. No Python, FastAPI, local HTTP service, native install requirement, post-install download, localhost path, or service startup path was introduced.
- Storage boundary: acceptable. `AGHUD-010` persists only navigation/filter state under `agenthud.uiState`; provider rows, details, transcripts, cache metadata, source manifests, and migrations remain deferred.
- Error handling: acceptable for this slice. Missing, invalid, and unsupported persisted state falls back to `createThreadPageState`; write failures are best-effort and do not block rendering.
- Residual risk: `dispose()` triggers a best-effort async write without awaiting completion. That is acceptable for UI preferences at this stage, but `AGHUD-026` should make file-backed writes atomic and test corrupt/partial JSON handling.

## Validation

- `node --check src/host/ui-state.js && node --check src/host/ui-state.test.js && node --check src/host/panel-view.js && node --check src/host/thread-page.js && node --check src/host/message-protocol.js`
- `node src/host/ui-state.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/summary-cache.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/panel-view.js src/host/thread-page.js src/host/message-protocol.js src/host/ui-state.js src/host/ui-state.test.js || true`

All checks passed.

## Task Metadata Adjustment

- Updated `AGHUD-026.source_refs` from stale recovered-source paths to current pure workspace files: `roadmap.md`, `src/host/summary-cache.js`, `src/host/ui-state.js`, and `docs/agenthud/provider-contract.md`.
- Added an `AGHUD-026` acceptance guard: preserve `AGHUD-010` globalState UI persistence unless a compatibility path is documented and tested.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-026` next.

Keep the slice limited to the JSON storage and migration layer:

- introduce a small dependency-free storage helper for `globalStorageUri/agenthud/...` JSON files;
- define schema-versioned payload handling for provider summaries and future source manifests, reusing the existing summary-cache shape where practical;
- document or encode the migration boundary between `AGHUD-010` memento UI state and future file-backed `agenthud/state.json`;
- implement atomic temp-file write plus tolerant read behavior for missing/corrupt/unsupported JSON;
- add focused tests for path layout, schema rejection, corrupt JSON fallback, source-manifest entry shape, and atomic-write behavior.

Do not implement Claude source discovery/parsing, hot indexing, provider tabs beyond the placeholder, package changes, dependencies, services/backends, native-open depth, pin UI, or excluded board/loop/team/mailbox/coordination/insight/vibe features.

Suggested validation for `AGHUD-026`:

- `node --check` for any new storage helper/test plus `src/host/summary-cache.js` and `src/host/ui-state.js`
- focused storage helper test
- `node src/host/summary-cache.test.js`
- `node src/host/ui-state.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- forbidden-scope scan over changed host files and docs

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-json-storage.md`, `src/host/summary-cache.js`, `src/host/ui-state.js`, and `docs/agenthud/provider-contract.md`.
Complete `AGHUD-026` only.
Add the small schema-versioned JSON storage/migration helper for AgentHUD-owned globalStorageUri files, with atomic writes and tolerant reads.
Preserve AGHUD-010 globalState UI persistence unless a documented/tested compatibility path is part of the tiny slice.
Do not implement Claude parsing, provider tabs beyond placeholder, package changes, dependencies, services/backends, native-open depth, pin UI, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to the checker.
```
