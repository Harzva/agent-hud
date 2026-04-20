# Stale feature reference audit (AGHUD-020)

Status: baseline established for the **pure Thread page** product boundary.

## Purpose

Detect accidental reintroduction of **out-of-scope dashboard families** (board, team, loop, insight chrome, legacy webview modules) into:

- `package.json` (contributes, commands, copy)
- `extension.js` (bootstrap)
- Production `src/**/*.js` (**excluding** `*.test.js`)
- `docs/**/*.md` **except** a small denylist of files that intentionally quote markers (this file and `removal-map.md`)

This complements human review and `docs/agenthud/removal-map.md`.

## How to run

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud
npm run verify
```

(`verify` = `audit:stale-refs` then `test`.)

Or run the audit alone:

```bash
npm run audit:stale-refs
```

```bash
node scripts/audit/check-stale-references.js
```

CI (GitHub Actions) runs **`npm run verify`** on **pull requests** (any branch) and on **push** to `main`/`master`, with **Node 20** via `actions/setup-node`, plus **workflow_dispatch** for manual runs. Concurrent runs on the same ref cancel older jobs — see `.github/workflows/ci.yml`. **Dependabot** (monthly) proposes Action version bumps via `.github/dependabot.yml`.

## Rules (substring match, case-sensitive)

The audit fails if any of the following appear in scanned files:

| Marker | Rationale |
|--------|-----------|
| `data-board-tab` | Removed dashboard tab data-attributes |
| `data-team-tab` | Removed team tab marker |
| `data-loop-tab` | Removed loop tab marker |
| `data-insight-tab` | Removed insight tab marker |
| `agenthud.board` | Stale command / config namespace |
| `agenthud.team` | Stale command / config namespace |
| `agenthud.insight` | Stale command / config namespace |
| `webview/board` | Legacy board module path |
| `webview/insights` | Legacy insights module path |
| `team-coordination` | Legacy coordination module stem |
| `thread-insight` | Legacy insight module stem |

## Exclusions

- **Test files** (`*.test.js`) are not scanned — they may assert the *absence* of dashboard markers.
- **Docs**: all `docs/**/*.md` are scanned **except** `docs/agenthud/stale-reference-audit.md` and `docs/agenthud/removal-map.md`, which intentionally list marker strings. If you add a doc that must quote markers, add it to `DOCS_STALE_MARKER_EXCEPTIONS` in `scripts/audit/check-stale-references.js` (prefer keeping exceptions minimal).

## Intentionally not scanned (noise / planning artifacts)

To avoid false positives, these paths are **out of scope** for the substring audit:

- **`tasks.json`** — evidence strings may quote `data-*-tab` markers or legacy paths verbatim.
- **`roadmap.md`** — names removed modules (e.g. `team-coordination.js`) in prose.
- **`.claude/`**, **`.codex-loop/`** — loop/agent notes, not product source.

Product regressions should still be caught in `package.json`, `extension.js`, and `src/**/*.js`.

## Baseline (2026-04-19)

- `npm run audit:stale-refs` → **0 violations** (production JS + package + extension + docs except the two exception files).
- `npm test` → all listed unit tests pass locally; same suite runs in CI.

## When it fails

1. Remove or replace the offending reference in production code or package metadata.
2. If a marker is a **false positive** (extremely rare), narrow the rule in `scripts/audit/check-stale-references.js` with team agreement — do not silence failures locally without updating the script.
