# evolution-2026-04-19-agenthud-codex-threadpage.md

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-codex-threadpage.md`
- `src/host/panel-view.js`
- `src/host/providers/codex.js`

## Bounded Target

Complete `AGHUD-006` only by wiring the existing AgentHUD shell to Codex adapter list/detail data with search, sort, status filter, selected detail, messages, and recent events.

## Completed Work

- Refactored `src/host/panel-view.js` so the extension host owns a Codex provider instance.
- Codex list data now loads from `src/host/providers/codex.js` when AgentHUD opens, refreshes, or returns to the Codex tab.
- Selecting a Codex thread loads detail through the adapter and re-renders the selected detail pane.
- Added `src/host/thread-page.js` as a testable pure renderer for:
  - provider tabs;
  - Codex search;
  - status filter;
  - sort control;
  - thread list;
  - selected detail;
  - normalized messages;
  - recent events.
- Kept Claude as a placeholder tab only.
- Added `src/host/thread-page.test.js` for fixture-backed render/filter smoke coverage.
- Updated `tasks.json`: `AGHUD-006` is now `completed` with evidence.

## Validation

- `node --check src/host/panel-view.js && node --check src/host/thread-page.js && node --check src/host/thread-page.test.js`
- `node src/host/providers/codex.test.js && node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/panel-view.js src/host/thread-page.js src/host/thread-page.test.js src/host/providers/codex.js src/host/providers/codex.test.js test/fixtures/codex || true`

## Failed or Deferred

- Cache-first hydration remains deferred to `AGHUD-025`.
- Provider persistence remains deferred to `AGHUD-010`.
- The host message protocol is still broader than the final shape and should be simplified in `AGHUD-007`.
- Claude parsing/indexing was not implemented.
- Native-open behavior was not implemented beyond displaying the Codex capability flag.
- No recovered source extension files were modified.

## Decisions

- The first Codex ThreadPage renders from fresh adapter data rather than cache, matching the checker's task adjustment.
- Search/filter/sort are local over loaded adapter rows.
- The renderer is isolated from VS Code APIs so it can be smoke-tested with sanitized fixtures.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-codex-threadpage.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-007` is now unblocked.
Simplify the host message protocol only: keep provider selection, thread selection, refresh, native open/copy/quick-switch/storage-shaped actions as appropriate, ignore unknown messages safely, and avoid adding out-of-scope feature messages.
Do not implement Claude, cache-first hydration, provider persistence, package changes, Python/FastAPI/local HTTP services, native sqlite, dependencies, or excluded dashboard features.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
Run the lightest relevant validation for changed files.
```
