# AgentHUD Evolution: Check Cache Hydration Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-message-protocol.md`

## Review Window

- Last optimize dispatch completed `AGHUD-007`.
- Changed artifacts reviewed:
  - `src/host/message-protocol.js`
  - `src/host/message-protocol.test.js`
  - `src/host/panel-view.js`
  - `src/host/thread-page.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-message-protocol.md`

## Findings

- Scope drift: none found. The protocol work stayed within the pure ThreadPage message surface.
- Dependency risk: none found. No package dependency or script was added.
- Runtime/backend risk: none found. There is no Python, FastAPI, local HTTP, native sqlite, localhost, or service startup path.
- Protocol quality: acceptable. Webview messages now pass through `normalizeWebviewMessage` and a single host dispatcher; invalid or unknown messages are ignored safely; request/response shape is available through `requestId`.
- Deferred behavior: acceptable. Native open remains a capability-gated stub, storage-shaped messages are no-ops, and persistent state remains deferred.
- Validation: acceptable. Protocol, Codex adapter, ThreadPage tests, syntax checks, `tasks.json` parse, and forbidden-term scan pass.

## Task Metadata Adjustment

- Updated `AGHUD-025.description` to clarify this is Codex-first cache hydration using provider-neutral cache shapes for later Claude support.
- Updated `AGHUD-025.source_refs` to current AgentHUD files: `src/host/panel-view.js`, `src/host/thread-page.js`, `src/host/providers/codex.js`, and `roadmap.md`.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-025` next.

The next micro-task is cache-first Codex hydration only:

- add a small cache helper under `src/host/` that reads/writes rebuildable JSON summaries under `context.globalStorageUri/agenthud/index/codex-summaries.json`;
- use a schema-versioned provider-neutral shape, but only implement Codex data now;
- render cached Codex summaries immediately when present, before a fresh adapter scan completes;
- run the Codex adapter scan in the background after shell render and patch the in-memory list when fresh data returns;
- write refreshed summaries back to cache after successful scans;
- if the scan fails, keep stale cached rows visible and show a provider-scoped stale/error indicator;
- avoid blocking provider tab switching or initial shell creation on cache read/write failure.

Keep this smaller than the full storage/migration milestone:

- do not implement Claude cache files;
- do not implement UI state persistence from `AGHUD-010`;
- do not implement the full source manifest/migration layer from `AGHUD-026`;
- do not add dependencies, package changes, native sqlite, Python/FastAPI/local HTTP services, or out-of-scope dashboard features.

Suggested validation for `AGHUD-025`:

- `node --check` on changed JavaScript files.
- Existing tests: `node src/host/message-protocol.test.js`, `node src/host/providers/codex.test.js`, and `node src/host/thread-page.test.js`.
- Add a temp-directory cache smoke test proving:
  - cached summaries read into state;
  - successful fresh scan writes cache;
  - scan failure leaves stale cache visible with an error/stale state.
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`.
- Forbidden-term scan over changed source/package files for excluded feature families and backend/server terms.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-cache-hydration.md`, `src/host/panel-view.js`, `src/host/thread-page.js`, and `src/host/providers/codex.js`.
Complete `AGHUD-025` only.
Implement cache-first Codex thread hydration using a small schema-versioned JSON cache under `context.globalStorageUri/agenthud/index/codex-summaries.json`.
Render stale cached summaries before fresh scan completion; keep stale cache visible on scan failure with provider-scoped error/stale state.
Do not implement Claude cache, full source manifest/migration, UI state persistence, package changes, services/backends, dependencies, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to `AGHUD-008`.
```
