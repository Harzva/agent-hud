# AgentHUD Evolution: Check Claude Cache Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-claude-parser.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-dispatch-blocked.md`

## Review Window

- Last successful optimize dispatch completed `AGHUD-012`.
- Last recorded dispatch was a blocked check (`returncode: 1`) before checker work started.
- Changed artifacts reviewed:
  - `src/host/providers/claude.js`
  - `src/host/providers/claude.test.js`
  - `src/host/providers/claude-parser.test.js`
  - `test/fixtures/claude/projects/-home-user-rich-project/session-rich.jsonl`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-claude-parser.md`

## Findings

- Scope drift: none found. The optimize slice stayed parser-only and did not add Claude index caching, provider API/runtime wiring, UI integration, package/dependency changes, backend/service behavior, or out-of-scope dashboard features.
- Dependency risk: none found. The parser uses existing local helpers and Node built-ins only.
- Runtime/backend risk: none found. No Python, FastAPI, local HTTP service, native install path, post-install download, localhost path, or service startup was introduced.
- Validation coverage: acceptable. The parser test exercises array + string content, tool use/result normalization, hidden meta record counting, malformed JSON tolerance, and summary metadata extraction.
- Residual risk: parser and discovery currently co-reside in `src/host/providers/claude.js`, so the next cache pass should avoid widening this module’s responsibility with runtime UI wiring.

## Validation

- `node --check src/host/providers/claude.js src/host/providers/claude-parser.test.js src/host/providers/claude.test.js`
- `node src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/json-storage.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/providers/claude.js src/host/providers/claude.test.js src/host/providers/claude-parser.test.js test/fixtures/claude || true`

All checks passed.

## Task Metadata Adjustment

- Updated `AGHUD-013.source_refs` to current pure workspace paths: `src/host/providers/claude.js`, `src/host/providers/claude-parser.test.js`, `src/host/json-storage.js`, `test/fixtures/claude/projects`, and `~/.claude/projects`.
- Added an `AGHUD-013` acceptance guard that this slice does not wire Claude into panel runtime, ThreadPage UI, or provider API dispatch.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-013` next.

Keep the slice cache-only:

- add Claude parsed-summary cache keyed by `path`, `size`, and `mtimeMs` (compatible with the existing JSON storage helper);
- read discovery rows from `discoverClaudeSources`, parse only cache misses/changed files, and reuse cached summary results for unchanged files;
- keep cache payload schema-versioned and rebuildable with tolerant reads/atomic writes;
- record skip/error counts in cache metadata without failing the whole list;
- add focused tests for cache hit/miss behavior, invalidation on `size`/`mtimeMs` change, and corrupt cache recovery.

Do not wire Claude provider into panel runtime or ThreadPage, implement `AGHUD-014` API dispatch, change package contributions, add dependencies, add services/backends, implement native-open depth, pin UI, or add out-of-scope board/loop/team/mailbox/coordination/insight/vibe features.

Suggested validation for `AGHUD-013`:

- `node --check` for changed Claude provider/cache files
- focused Claude cache test suite
- `node src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/json-storage.test.js`
- `node src/host/provider-contract.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- forbidden-scope scan over changed Claude/cache files

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-cache.md`, `src/host/providers/claude.js`, and `src/host/json-storage.js`.
Complete `AGHUD-013` only.
Implement Claude parsed-summary caching keyed by path/size/mtime with tolerant rebuild behavior and targeted tests.
Do not wire Claude into panel runtime or ThreadPage UI, and do not implement AGHUD-014 API dispatch in this slice.
Do not change package contributions, dependencies, services/backends, native-open depth, pin UI, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to the checker.
```
