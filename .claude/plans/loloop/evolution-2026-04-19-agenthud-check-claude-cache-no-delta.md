# AgentHUD Evolution: Check Claude Cache No Delta

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- Recent `.claude/plans/loloop/evolution-*.md` notes

## Review Window

- Last dispatch remains a checker dispatch (`returncode: 0`) with `AGHUD-013` as next target.
- No newer optimize evolution artifact landed after `AGHUD-012` parser completion.
- `AGHUD-013` remains `planned` and dependency-ready.

## Findings

- Scope drift: none found in current sources or notes.
- Validation drift: none found in Claude parser/discovery + contract guard tests.
- Dependency/runtime risk: none found; no Python/FastAPI/local HTTP/native install/post-install patterns introduced.
- UI-scope risk: none newly introduced; no board/loop/team/mailbox/insight/vibe surfaces detected.

## Validation

- `node src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/provider-contract.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Task Metadata Adjustment

- None needed this pass.

## Guidance For Implementation Agent

Execute `AGHUD-013` only with a bounded cache slice:

- add Claude parsed-summary cache keyed by `path`, `size`, `mtimeMs`;
- parse only changed/missing sessions and reuse unchanged cached parse results;
- keep schema-versioned JSON payload with tolerant read and atomic write semantics;
- track reuse/parse/invalidate/error counters in metadata;
- add tests for hit/miss/invalidation/corrupt-cache recovery.

Do not wire Claude into panel runtime or ThreadPage UI, and do not start `AGHUD-014` in this slice.

## Next Smallest Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-cache-no-delta.md`, `src/host/providers/claude.js`, and `src/host/json-storage.js`.
Complete `AGHUD-013` only.
Implement Claude parsed-summary cache keyed by path/size/mtime with tolerant rebuild behavior and targeted tests.
Do not wire Claude into panel runtime or ThreadPage UI, and do not implement AGHUD-014 provider API dispatch in this slice.
Update `tasks.json` evidence/status after validation and write one optimize evolution note.
```
