# evolution-2026-04-19-agenthud-cache-hydration.md

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-cache-hydration.md`
- `src/host/panel-view.js`
- `src/host/thread-page.js`
- `src/host/providers/codex.js`

## Bounded Target

Complete `AGHUD-025` only by implementing cache-first Codex thread hydration with a small schema-versioned JSON summary cache.

## Completed Work

- Added `src/host/summary-cache.js`.
- Added `src/host/summary-cache.test.js`.
- The cache helper reads and writes provider summary files under:
  - `context.globalStorageUri/agenthud/index/codex-summaries.json`
- Cache payloads use `schema_version: 1`, `provider`, `generated_at`, `meta`, and `summaries`.
- `src/host/panel-view.js` now:
  - renders the shell before Codex scans complete;
  - hydrates Codex rows from cache when present;
  - starts the fresh Codex adapter scan in the background;
  - replaces in-memory rows when fresh data returns;
  - writes refreshed summaries back to cache after successful scans;
  - keeps stale rows visible with provider-scoped error metadata when a fresh scan fails.
- `src/host/thread-page.js` now surfaces cached/stale status, cache read/write indicators, and stale-cache refresh state.
- `src/host/thread-page.test.js` now asserts stale cached summaries are visible during refresh.
- Updated `tasks.json`: `AGHUD-025` is now `completed` with evidence.

## Validation

- `node --check src/host/panel-view.js && node --check src/host/thread-page.js && node --check src/host/summary-cache.js && node --check src/host/summary-cache.test.js`
- `node src/host/summary-cache.test.js && node src/host/message-protocol.test.js && node src/host/providers/codex.test.js && node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/panel-view.js src/host/thread-page.js src/host/thread-page.test.js src/host/summary-cache.js src/host/summary-cache.test.js package.json || true`

## Failed or Deferred

- Claude cache files were not implemented.
- Full source manifest and migration layer remain deferred to `AGHUD-026`.
- UI state persistence remains deferred to `AGHUD-010`.
- Provider-neutral contract documentation remains deferred to `AGHUD-008`.
- No package/dependency changes were made.
- No recovered source extension files were modified.

## Decisions

- The Codex cache stores summary rows only; selected detail still loads from the source transcript through the adapter.
- Cache read/write errors do not block shell rendering or fresh scans.
- Fresh scan success replaces the cached/in-memory list wholesale for now; finer row patching can be optimized later if needed.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-cache-hydration.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-008` is now unblocked.
Define the provider-neutral contracts by documenting and exporting the common thread/detail/message/event/capability shapes without refactoring the whole UI yet.
Do not implement Claude, full storage migration, provider persistence, package changes, Python/FastAPI/local HTTP services, native sqlite, dependencies, or excluded dashboard features.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
Run the lightest relevant validation for changed files.
```
