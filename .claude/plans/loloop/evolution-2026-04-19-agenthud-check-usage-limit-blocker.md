# AgentHUD Evolution: Check Blocked By Usage Limit

Date: 2026-04-19

loop_type: check

## Dispatch

- `dispatch_id`: `dispatch-20260419135541-check-AGHUD-019`
- `task_id`: `AGHUD-019`

## What Happened

The checker dispatch failed because the underlying agent runtime hit a usage/credit limit mid-run.

- `last_dispatch.returncode`: `90`
- `last_dispatch.validation_failures`: `["check_report.dispatch_id_mismatch"]`

Because the run aborted, `.codex-loop/state/check_report.json` was not updated to the new `dispatch_id`, so the scheduler cannot consume a fresh verdict from this attempt.

## Recovery Action

1. Resolve the usage limit (purchase credits or retry after **Apr 20, 2026 00:00** as indicated by the runtime error).
2. Re-run a `check` dispatch so the checker can write a fresh `.codex-loop/state/check_report.json` with:
   - `dispatch_id == dispatch_contract.dispatch_id`
   - a valid `verdict`
   - a valid `next_task_id`

## Scheduler Next Step

Default next dispatch remains `check` until a valid, dispatch-matching `check_report.json` exists.

