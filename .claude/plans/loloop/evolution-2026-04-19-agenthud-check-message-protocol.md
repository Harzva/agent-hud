# AgentHUD Evolution: Check Message Protocol Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-codex-threadpage.md`

## Review Window

- Last optimize dispatch completed `AGHUD-006`.
- Changed artifacts reviewed:
  - `src/host/panel-view.js`
  - `src/host/thread-page.js`
  - `src/host/thread-page.test.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-codex-threadpage.md`

## Findings

- Scope drift: none found. The work stayed on Codex ThreadPage wiring and kept Claude as a placeholder.
- Dependency risk: none found. No package dependency or script was added.
- Runtime/backend risk: none found. There is no Python, FastAPI, local HTTP, native sqlite, localhost, or service startup path.
- UI scope: acceptable for `AGHUD-006`. The page now renders Codex list/detail, search, status filter, sort, messages, and events without adding dashboard or coordination features.
- Validation: acceptable. Syntax checks, Codex adapter fixture test, ThreadPage render/filter test, `tasks.json` parse, and forbidden-term scan pass.
- Protocol risk: now visible and correctly deferred. The webview currently posts ad hoc messages (`selectProvider`, `refresh`, `selectThread`, `setQuery`, `setStatusFilter`, `setSort`) and the host handles them inline. Before cache, persistence, native actions, or provider expansion add more cases, `AGHUD-007` should turn this into a small allowlisted request/response protocol with provider-scoped error handling.

## Task Metadata Adjustment

- Updated `AGHUD-007.source_refs` to current AgentHUD files: `src/host/panel-view.js`, `src/host/thread-page.js`, and `package.json`.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-007` next before `AGHUD-025`.

The next micro-task is protocol cleanup only:

- define one small allowlist for webview-to-host message types currently needed by the Codex ThreadPage:
  - provider selection;
  - thread selection;
  - refresh;
  - query/filter/sort changes;
  - quick-switch/copy/native-open/storage-shaped messages only as no-op or capability-gated stubs if needed by the task acceptance;
- route messages through a single dispatcher in `src/host/panel-view.js` instead of growing inline `if` cases;
- make unknown message types return/ignore safely without throwing;
- make handler failures provider-scoped in state so Codex list/detail errors render near the affected pane;
- keep message names aligned with the allowlist in `docs/agenthud/feature-allowlist.md` where practical, but do not broaden product scope just to fill future message names.

Do not implement cache-first hydration, persistent UI state, Claude parsing/indexing, provider contract refactor, native-open behavior depth, package/dependency changes, Python/FastAPI/local HTTP services, native sqlite, or any board/team/loop/insight surface.

Suggested validation for `AGHUD-007`:

- `node --check` on changed JavaScript files.
- Run `node src/host/providers/codex.test.js` and `node src/host/thread-page.test.js`.
- Add or update a small protocol smoke test if feasible: known messages mutate the expected state; unknown messages do not throw.
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`.
- Forbidden-term scan over changed source/package files for excluded feature families and backend/server terms.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-message-protocol.md`, `src/host/panel-view.js`, and `src/host/thread-page.js`.
Complete `AGHUD-007` only.
Simplify the webview-to-host message protocol into an allowlisted dispatcher with safe unknown-message handling and provider-scoped errors.
Do not implement cache-first hydration, persistence, Claude, native-open depth, package changes, services/backends, dependencies, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to `AGHUD-025`.
```
