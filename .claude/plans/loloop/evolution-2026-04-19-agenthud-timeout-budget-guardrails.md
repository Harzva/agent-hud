# AgentHUD Evolution: Timeout Budget Guardrails

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-responsive-layout-accept.md`

## Dispatch

- `dispatch_id`: `dispatch-20260419131503-optimize-AGHUD-019`
- `task_id`: `AGHUD-019`
- bounded slice: enforce list/detail timeout budgets so failures keep partial UI instead of blanking.

## Implemented Slice

- Added `src/host/performance-budget.js` with:
  - list refresh timeout budget
  - detail load timeout budget
  - typed timeout classification (`AGENTHUD_TIMEOUT`)
  - promise timeout wrapper (`withTimeout`)
- Updated `src/host/panel-view.js` to apply timeout budgets to:
  - `codexProvider.listThreads`
  - `claudeProvider.listThreads`
  - `codexProvider.getThreadDetail`
  - `claudeProvider.getThreadDetail`
- Timeout paths now retain current list/detail data and present scoped fallback text rather than clearing into blank surfaces.
- Added `src/host/performance-budget.test.js` covering fast resolve and timed rejection classification.

## Task Ledger Update

- Updated `AGHUD-019` in `tasks.json`:
  - kept `status: planned` (task not fully complete yet)
  - added evidence for timeout-budget guardrail slice
  - added blocker note for remaining acceptance items (Claude cache-first cold hydration, paged list rendering)

## Validation

- `node --check src/host/panel-view.js src/host/performance-budget.js src/host/performance-budget.test.js`
- `node src/host/performance-budget.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Deferred / Remaining For AGHUD-019

- hot-refresh optimization beyond current Claude parse-cache reuse
- cache-first cold hydration for Claude summaries
- paged list rendering for very large thread sets

## Next Smallest Handoff

```text
Continue AGHUD-019 with one bounded slice: add Claude cache-first cold hydration in panel-view using summary-cache parity with Codex, while keeping background refresh non-blocking.
```
