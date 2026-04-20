# AGHUD-030: Large-History Performance Audit Baseline

**Agent**: C | **Date**: 2026-04-19 | **Status**: done

## Goal

Establish a **read-only** large-history performance baseline: documentation plus a reproducible Node measurement script. No product logic or host code changes.

## Changes Made

### 1. `docs/agenthud/large-history-perf-audit-baseline.md`

- Describes data flow from activation through list/detail render and summary cache writes.
- Six hotspots with locations, complexity, and triggers (Codex + Claude notes).
- Mitigations already in the codebase, future recommendations (out of scope), glossary.
- Measurement reproducibility commands: synthetic sweep, **real** `~/.codex/sessions` + `~/.claude/projects`, `--help`.

### 2. `scripts/perf/measure-large-history-baseline.js`

- Synthetic Codex-style JSONL under `$TMPDIR/agenthud-perf-baseline` at scales 50 / 100 / 200 / 500 (default).
- **Real data**: `--real` / `--real-codex` / `--real-claude`, or `--codex-sessions=` / `--claude-projects=`. Claude list uses `forceRebuild` and a **temp** `cacheRoot` under `$TMPDIR` (removed after the run) so the benchmark does not write into VS Code `globalStorage`.
- Measures discovery, list, detail, and UI filter/sort by **requiring** existing `src/host` providers + `thread-page` (no edits there).
- **`--json`** output strips embedded `threads` arrays from `listParse` to keep payloads small.
- **CLI fix**: `--cleanup` with no other flags → cleanup only. Any other flag (e.g. `--scales=`) → run benchmark, then remove synthetic temp data if `--cleanup` is present.

## Files NOT Changed (per whitelist / task)

- `src/host/**`, `extension.js`, `package.json`, `tasks.json`, `.codex-loop/state/*.json` (root state files) — not touched for product logic.
- No new npm dependencies, Python, FastAPI, or local HTTP servers.

## Validation

- `node scripts/perf/measure-large-history-baseline.js --scales=2 --cleanup` → exit 0; synthetic temp dir removed.
- `node scripts/perf/measure-large-history-baseline.js --real-codex` / `--real-claude` → exit 0 on dev machine (184 Codex rollouts, 140 Claude threads in one sample run; numbers vary by disk and history).
- `node scripts/perf/measure-large-history-baseline.js --cleanup` → exit 0 (cleanup-only idempotent when dir absent).

## Risks

- Synthetic JSONL may diverge from real Codex rollout shapes over time; re-validate against production captures if parsers change.
- Benchmark imports extension host code; Node version and machine I/O dominate absolute numbers — use for **relative** before/after comparisons on the same host.

## Next Steps

- Run full default scales on a representative machine and archive `--json` output for regression comparison.
- Optional follow-up tasks: optimize hotspots listed in §7 of the baseline doc (requires whitelist changes to `src/host/**`).
