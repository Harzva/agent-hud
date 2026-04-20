# AgentHUD Evolution: Check Codex ThreadPage Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-codex-adapter.md`

## Review Window

- Last optimize dispatch completed `AGHUD-005`.
- Changed artifacts reviewed:
  - `src/host/providers/codex.js`
  - `src/host/providers/codex.test.js`
  - `test/fixtures/codex/sessions/.../rollout-*.jsonl`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-codex-adapter.md`

## Findings

- Scope drift: none found. The work stayed on a Codex Node adapter and did not add Claude parsing, webview expansion, cache hydration, package dependencies, services, or excluded dashboard features.
- Dependency risk: none found. The adapter uses Node built-ins only.
- Runtime/backend risk: none found. It reads local JSONL files directly and does not call FastAPI, Python, HTTP, native sqlite, localhost, or a server startup path.
- Validation: acceptable. `node --check`, the Codex fixture smoke test, missing-source smoke, `tasks.json` JSON parse, and forbidden-term scan all pass.
- Residual parser risk: real Codex rollout schemas may contain variants beyond the sanitized fixture. That is acceptable for `AGHUD-005`; future parser hardening should stay incremental and test-backed.

## Task Metadata Adjustment

- Updated `AGHUD-006.source_refs` to point at current AgentHUD files: `src/host/panel-view.js`, `src/host/providers/codex.js`, and `roadmap.md`.
- Replaced the `AGHUD-006` cache-first acceptance line with: `Initial Codex list data renders from the Node adapter; cache-first hydration remains deferred to AGHUD-025.`

This keeps the next UI slice from absorbing `AGHUD-025` early.

## Guidance For Implementation Agent

Do `AGHUD-006` next, and keep it to a pure Codex ThreadPage slice.

The next micro-task is:

- wire `src/host/panel-view.js` to the existing `src/host/providers/codex.js` adapter for Codex list/detail data;
- render a Codex thread list from adapter rows with search, sort, and status filter controls;
- render selected Codex detail with normalized messages and recent events;
- keep Claude visible only as the existing provider tab/placeholder unless a tiny empty state is needed for tab stability;
- keep provider failures local to the Codex pane or list/detail area;
- keep all actions capability-gated and avoid implementing native-open internals unless the existing adapter flag can be displayed without behavioral depth.

Do not implement cache-first hydration, persistent provider state, Claude parser/indexer, provider contract refactor, broad responsive redesign, package/dependency changes, Python/FastAPI/local HTTP services, native sqlite, board/team/loop/insight UI, or a dashboard/landing page.

Suggested validation for `AGHUD-006`:

- `node --check` on changed JavaScript files.
- Run `node src/host/providers/codex.test.js`.
- Add or run a small host/webview rendering smoke that uses the sanitized fixture adapter path and confirms at least one thread title and one detail message appear in generated HTML or posted state.
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`.
- Forbidden-term scan over changed source/package files for excluded feature families and backend/server terms.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-codex-threadpage.md`, `src/host/panel-view.js`, and `src/host/providers/codex.js`.
Complete `AGHUD-006` only.
Wire the existing shell to Codex adapter list/detail data with search/sort/status controls and selected detail.
Keep Claude as placeholder only; do not implement cache-first hydration, provider persistence, Claude parsing, package changes, services/backends, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and hand off to `AGHUD-007` or `AGHUD-025`, depending on what the implementation reveals.
```
