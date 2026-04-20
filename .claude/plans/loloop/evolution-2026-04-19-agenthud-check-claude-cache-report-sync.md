# AgentHUD Evolution: Check Claude Cache Report Sync

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- Recent `.claude/plans/loloop/evolution-*.md`

## Review Window

- Latest dispatch is a successful check dispatch for `AGHUD-013`.
- No new optimize artifact was found in this window.
- `AGHUD-013` remains the next dependency-ready implementation task.

## Findings

- Scope drift: none in product/source implementation files.
- Validation drift: none; focused Claude/parser/provider-contract checks pass.
- Dependency/runtime risk: none; no forbidden backend/runtime patterns introduced.
- Planning metadata drift found and corrected: `tasks.json` Claude-task `source_refs` had broadened absolute home paths (`/home/clashuser/.codex`, `/home/clashuser/.claude`) on `AGHUD-013/014/015`. Those were removed to keep references bounded and task intent clear.

## Validation

- `node src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/provider-contract.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Task Metadata Adjustment

- Updated `tasks.json` only:
  - `AGHUD-013.source_refs`: removed `/home/clashuser/.codex`, `/home/clashuser/.claude`
  - `AGHUD-014.source_refs`: removed `/home/clashuser/.codex`, `/home/clashuser/.claude`
  - `AGHUD-015.source_refs`: removed `/home/clashuser/.codex`, `/home/clashuser/.claude`

No implementation task status was changed.

## Guidance For Implementation Agent

Complete `AGHUD-013` only:

- add Claude parsed-summary cache keyed by `path`, `size`, `mtimeMs`;
- parse only changed/missing files and reuse cached parse results for unchanged files;
- keep schema-versioned cache payload with tolerant read and atomic write;
- include parse/reuse/invalidation/error counters in metadata;
- add focused tests for hit/miss, invalidation, and corrupt-cache rebuild.

Do not wire Claude into panel runtime or ThreadPage UI, and do not begin `AGHUD-014` in this slice.

## Next Smallest Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-cache-report-sync.md`, `src/host/providers/claude.js`, and `src/host/json-storage.js`.
Complete `AGHUD-013` only.
Implement Claude parsed-summary cache keyed by path/size/mtime with tolerant rebuild behavior and targeted tests.
Do not wire Claude into panel runtime or ThreadPage UI, and do not implement AGHUD-014 provider API dispatch in this slice.
Update `tasks.json` evidence/status after validation and write one optimize evolution note.
```
