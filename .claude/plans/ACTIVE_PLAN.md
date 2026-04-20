# ACTIVE_PLAN

Track Status: active

## Project

- name: AgentHUD pure thread workspace
- root: `/home/clashuser/hzh/work_bo/agent_ui/agent_hud`
- source reference: `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension/recovered/codex-managed-agent-0.0.71/extension`

## Main Plan

- `roadmap.md`
- `tasks.json`

## Current Slice

- [x] Run the codex-loop automation as a three-thread scheduler:
  - scheduler thread `019da175-eb9b-7ac2-a7b4-1f614f459688` wakes every 10 minutes;
  - implementation thread `019da180-b86f-7cf2-9e6d-929d6656231e` handles optimize dispatches;
  - checker thread `019da180-e9d0-7ee1-8d78-e4608f939741` handles check/guidance dispatches.

## Operating Constraints

- All AgentHUD files, plans, prompts, notes, code, tests, and generated artifacts must stay inside `/home/clashuser/hzh/work_bo/agent_ui/agent_hud` unless explicitly reading the source reference repo.
- Do not require Python, FastAPI, local HTTP ports, or user-managed dependency installation.
- Use the recovered extension only as a read-only reference unless the user explicitly asks to modify it.
- Prefer Node/VS Code extension-host implementation for runtime behavior.
- Keep the pure AgentHUD scope: Codex Thread page, Claude Thread page, shared provider tabs, thread list/detail/history/events.
- Do not reintroduce board, loop board, team, mailbox, coordination lanes, usage insights, or vibe dashboards.

## Completion Rule

- Continue until every task in `tasks.json` is complete or explicitly blocked with a documented reason and next recovery action.
- When every task is complete or blocked, the scheduler writes `.codex-loop/state/stop.flag` so the daemon stops after the current tick.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and the latest `.claude/plans/loloop/evolution-*.md` note.
Follow `.codex-loop/prompt.md` and `.codex-loop/agents.json`.
The scheduler thread dispatches either the implementation agent or checker agent, alternating by `.codex-loop/state/last_dispatch.json`.
Implementation dispatch completes one bounded, verifiable slice.
Checker dispatch writes guidance and task/plan micro-adjustments only.
Every dispatch updates `tasks.json` when task state/evidence/blocker changes and writes one evolution note in `.claude/plans/loloop/`.
```
