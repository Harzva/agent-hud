# AgentHUD Evolution: Check AGHUD-019 Dispatch 230905 Failure

Date: 2026-04-20

loop_type: check

## Dispatch

- `dispatch_id`: `dispatch-20260419230905-check-AGHUD-019`
- `task_id`: `AGHUD-019`
- `mode`: `check`

## Failure

The delegated checker dispatch terminated early due to checker-thread usage limit before writing a dispatch-aligned `check_report.json`.

- observed `returncode`: `90`
- error: usage limit reached in delegated thread
- state symptom: `check_report.dispatch_id_mismatch`

## Scheduler Recovery Action

1. Keep scheduler defaulting to `check` on the next tick.
2. Rerun `.codex-loop/scripts/dispatch_agent.sh check` after checker-thread quota resets.
3. Require `check_report.json.dispatch_id == dispatch_contract.dispatch_id` and valid `verdict` before considering optimize eligibility.

## Next Smallest Handoff

```text
Retry one bounded check dispatch for AGHUD-019 after usage reset; produce a dispatch-aligned check_report with valid verdict/next_task_id and no dispatch_id mismatch.
```
