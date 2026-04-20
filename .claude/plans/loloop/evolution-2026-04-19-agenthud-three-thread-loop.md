# AgentHUD Evolution: Three-Thread Codex Loop

Date: 2026-04-19

loop_type: scheduler

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/prompt.md`
- `.codex-loop/agents.json`

## Bounded Target

Switch the AgentHUD loop from one growing implementation thread to a three-thread role model:

- scheduler: `019da175-eb9b-7ac2-a7b4-1f614f459688`
- implementation: `019da180-b86f-7cf2-9e6d-929d6656231e`
- checker: `019da180-e9d0-7ee1-8d78-e4608f939741`

## Completed Work

- Created dedicated implementation and checker Codex threads.
- Added `.codex-loop/agents.json` as the durable role/thread registry.
- Rewrote `.codex-loop/prompt.md` so the main scheduler wakes every 10 minutes and alternates dispatches:
  - optimize dispatch resumes the implementation thread;
  - check dispatch resumes the checker thread;
  - unknown state defaults to check.
- Updated `.claude/plans/ACTIVE_PLAN.md` to make the three-thread scheduler the active operating model.

## Guardrails

- The scheduler thread does not directly implement product work.
- The checker thread must not edit product/source implementation files.
- All AgentHUD-owned files stay under `/home/clashuser/hzh/work_bo/agent_ui/agent_hud`.
- The recovered extension remains read-only reference material.

## Next Handoff

Restart the codex-loop daemon with:

- `CODEX_LOOP_FORCE_THREAD_ID=019da175-eb9b-7ac2-a7b4-1f614f459688`
- `CODEX_LOOP_INTERVAL_MINUTES=10`
- workspace and state dir under `/home/clashuser/hzh/work_bo/agent_ui/agent_hud`

Then verify `tasks.json`, `.codex-loop/agents.json`, and daemon status.
