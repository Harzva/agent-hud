# AgentHUD Evolution: AGHUD-035 (Agent-B) — Parser drift diagnostics

Date: 2026-04-19

## Context

Parallel slice for **parser drift diagnostics**: surface unknown record counts, a format/version hint, and fallback tallies, with regression tests. Implementation in `claude.js` / `codex.js` was largely present; work completed here wires **thread detail** for Claude and adds **fixture-backed tests**.

## Completed

- **`getClaudeThreadDetail`**: `meta` now includes `drift` from `parseClaudeSession` (aligned with Codex detail).
- **`claude-parser.test.js`**: Asserts drift for `test/fixtures/claude/projects/-home-user-drift-project/session-drift.jsonl` (unknown types, `formatVersion`, `fallbackCount`).
- **`claude.test.js`**: Asserts `getClaudeThreadDetail("session-drift")` exposes the same drift object.
- **`codex.test.js`**: Asserts `parseCodexRollout` and `getCodexThreadDetail` drift for `rollout-2026-04-19T14-00-00-019dbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb.jsonl`.

## Not in scope (this slice)

- UI / panel surfacing of drift (blacklisted files).
- `listClaudeThreads` / index cache entries carrying drift summaries.
- Changing semantics of `fallbackCount` vs unknown-only counts (existing behavior preserved).

## Validation

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/claude-parser.test.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/claude.test.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/codex.test.js
```

All passed after changes.

## Continuation (same task)

- **List + index**: `buildClaudeSummaryIndex` now stores per-entry `drift`, merges `drift` onto each list summary, and bumps **Claude parse cache `schema_version` to 2** (v1 caches rebuild on read). Reused cache rows get `emptyParserDrift()` when `drift` is missing until the next write.
- **Codex list**: `listCodexThreads` attaches `parsed.drift` on each thread object (detail already had `meta.drift`).
- **Fixture**: `test/fixtures/claude/projects/agenthud/index/claude-parse-cache.json` updated to schema 2 with `drift` on entries.
- **Tests**: `claude.test.js` / `codex.test.js` assert list rows carry drift. **`claude-cache.test.js` / `claude-api.test.js`** expectations updated from 3 → **6** discovered sessions so they match the current `projects` fixture tree (required for `node src/host/providers/claude-cache.test.js` and `claude-api.test.js` to pass).

### Validation (full provider set)

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/claude-cache.test.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/claude-api.test.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/claude-parser.test.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/claude.test.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/providers/codex.test.js
```
