# AgentHUD Evolution: Check Dispatch Recovery

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-dispatch-script-failure.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-dependency-policy.md`

## Review Window

- Last scheduler state: optimize dispatch to implementation thread `019da180-b86f-7cf2-9e6d-929d6656231e` failed with return code `2`.
- Failure cause: `.codex-loop/scripts/dispatch_agent.sh` previously used `printf` with a dash-prefixed first argument, causing `printf: - : invalid option`.
- No implementation work was delegated during that failed optimize dispatch.
- Latest changed files are scheduler/check artifacts and planning notes; `tasks.json` still has `AGHUD-024` planned.

## Findings

- Scope drift: none found. The failure was scheduler infrastructure only and did not add product UI, runtime dependencies, or out-of-scope feature families.
- Validation state: the dispatch script now has explicit `printf '%s\n' ...` formats for dash-prefixed scheduler-state lines, and `bash -n .codex-loop/scripts/dispatch_agent.sh` passes.
- Dependency risk: still open only because `AGHUD-024` has not run yet. The next successful optimize dispatch should complete the dependency policy before any package scaffold.
- Task ledger: no `tasks.json` micro-adjustment needed. `AGHUD-024` remains planned, dependency-ready after `AGHUD-023`, and has clear acceptance criteria.

## Guidance For Scheduler

The dispatch script recovery is verified well enough to resume optimize dispatches.

On the next scheduler tick:

- treat this check note as the required recovery check after the failed optimize dispatch;
- dispatch `optimize` to implementation thread `019da180-b86f-7cf2-9e6d-929d6656231e`;
- after the dispatched agent returns, overwrite `.codex-loop/state/last_dispatch.json` with the actual optimize result from that run.

## Guidance For Implementation Agent

Do `AGHUD-024` only.

The micro-task is:

- create `docs/agenthud/dependency-policy.md`;
- document allowed dependencies: VS Code APIs, Node built-ins, pure JS packages, and bundled static assets;
- document forbidden dependency patterns: Python, FastAPI, local HTTP services, native install requirements, post-install downloads, install scripts that fetch runtime code, required daemons/sidecars, and native sqlite as a default runtime dependency;
- document a future native-dependency exception process with packaging proof;
- set initial package-size and activation-time budgets plus how later package work should measure them;
- update `tasks.json` evidence/status only after the acceptance criteria are met;
- write one optimize evolution note.

Do not create `package.json`, `src/`, webview files, command contributions, or runtime code in the same optimize pass.

## Validation Performed

- `bash -n .codex-loop/scripts/dispatch_agent.sh`
- `rg -n "printf '%s|AGHUD-024|Do not scaffold|invalid option" .codex-loop/scripts/dispatch_agent.sh .claude/plans/loloop/evolution-2026-04-19-agenthud-dispatch-script-failure.md .claude/plans/loloop/evolution-2026-04-19-agenthud-check-dependency-policy.md`
- `node -e` JSON parse/query of `tasks.json` for `AGHUD-024`

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-dispatch-recovery.md`.
Dispatch/perform optimize next.
Complete `AGHUD-024` only by creating `docs/agenthud/dependency-policy.md`.
Do not scaffold package/runtime files yet.
Update `tasks.json` evidence/status after validation, write one optimize evolution note, and hand off to `AGHUD-004`.
```
