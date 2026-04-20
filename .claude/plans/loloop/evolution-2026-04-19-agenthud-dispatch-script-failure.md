# AgentHUD Evolution: Dispatch Script Failure

Date: 2026-04-19

loop_type: scheduler_failure

## Plan Used

- `.codex-loop/agents.json`
- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-dependency-policy.md`
- `.codex-loop/state/status.json`
- `.codex-loop/state/last_dispatch.json`

## Bounded Target

Dispatch exactly one `optimize` action through the required scheduler script:

```bash
.codex-loop/scripts/dispatch_agent.sh optimize
```

## Result

The dispatch failed before the implementation agent ran.

Observed failure:

```text
.codex-loop/scripts/dispatch_agent.sh: line 80: printf: - : invalid option
printf: usage: printf [-v var] format [arguments]
```

No product/source/docs task work was delegated to the implementation thread in
this failed optimize attempt.

## Scheduler State

Updated `.codex-loop/state/last_dispatch.json` with:

- `mode`: `optimize`
- `agent_thread_id`: `019da180-b86f-7cf2-9e6d-929d6656231e`
- `returncode`: `2`
- summary of the dispatch-script failure
- recovery action requiring the next scheduler tick to default to `check`

## Recovery Action

Next scheduler dispatch must be `check`, because the previous dispatch failed.

The checker should verify the dispatch script before another optimize attempt.
Specifically, inspect `.codex-loop/scripts/dispatch_agent.sh` for any `printf`
calls whose first argument can begin with `-`; dash-prefixed prompt lines must be
printed with an explicit format, for example:

```bash
printf '%s\n' '- .codex-loop/agents.json'
```

If the script is already corrected by the time the checker runs, the checker
should record that and hand back to optimize for `AGHUD-024`.

## Recovery Applied

After this failed scheduler tick, `.codex-loop/scripts/dispatch_agent.sh` was
corrected so the dash-prefixed scheduler-state lines use explicit printf
formats:

```bash
printf '%s\n' '- .codex-loop/agents.json'
printf '%s\n' '- .codex-loop/state/last_dispatch.json, if present'
```

`bash -n .codex-loop/scripts/dispatch_agent.sh` now passes. The next check tick
should verify this recovery and then hand back to optimize for `AGHUD-024`.

## Next Handoff

```text
Read `.codex-loop/agents.json`, `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, newest relevant `.claude/plans/loloop/evolution-*.md`, `.codex-loop/state/status.json`, and `.codex-loop/state/last_dispatch.json`.
Because the last dispatch has returncode 2, dispatch `check` next through `.codex-loop/scripts/dispatch_agent.sh check`.
Ask the checker to verify/fix scheduler metadata only: confirm whether `.codex-loop/scripts/dispatch_agent.sh` is safe for dash-prefixed prompt lines, record guidance, and hand back to optimize for `AGHUD-024` if safe.
Do not dispatch optimize again until a check pass has recorded the script recovery state.
```
