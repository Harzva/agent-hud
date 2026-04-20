# AgentHUD Evolution: Check Claude Parser Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-claude-discovery.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-discovery.md`

## Review Window

- Last optimize dispatch completed `AGHUD-011`.
- Changed artifacts reviewed:
  - `src/host/providers/claude.js`
  - `src/host/providers/claude.test.js`
  - `test/fixtures/claude/projects`
  - `src/host/json-storage.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-claude-discovery.md`

## Findings

- Scope drift: none found. The work stayed discovery-only and did not parse Claude messages, build the index cache, wire Claude into the UI, write live source manifests, change package contributions, add dependencies, services/backends, native-open depth, pin UI, or excluded dashboard surfaces.
- Dependency risk: none found. The new Claude provider uses Node built-ins plus the local JSON storage helper only.
- Runtime/backend risk: none found. No Python, FastAPI, local HTTP service, native install requirement, post-install download, localhost path, or service startup path was introduced.
- Discovery behavior: acceptable. The provider returns normalized source rows, detects nested subagents separately, excludes them from the main list by default, and handles missing roots without throwing.
- Manifest boundary: acceptable. Discovery exposes a source-manifest-compatible entry shape without starting real manifest writes or parser work.
- Residual risk: `decodeProjectCwd` is intentionally heuristic and can misread relative names containing hyphens. That is acceptable for discovery, but `AGHUD-012` should prefer transcript metadata over path decoding when richer `cwd` information exists.

## Validation

- `node --check src/host/providers/claude.js && node --check src/host/providers/claude.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/json-storage.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/providers/claude.js src/host/providers/claude.test.js test/fixtures/claude || true`

All checks passed.

## Task Metadata Adjustment

- Updated `AGHUD-012.source_refs` to include current parser inputs and boundaries: `src/host/providers/claude.js`, `src/host/providers/claude.test.js`, `src/host/provider-contract.js`, `test/fixtures/claude/projects`, and `~/.claude/projects/**/*.jsonl`.
- Added an `AGHUD-012` acceptance guard that this slice does not implement the Claude index cache, provider API wiring, or UI integration.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-012` next.

Keep the slice parser-only:

- add tolerant Claude JSONL parsing helpers that consume one discovered session file at a time;
- normalize messages into the provider contract shape, handling string and array content forms;
- recognize and safely classify `user`, `assistant`, `tool_use`, `tool_result`, `system`, `permission-mode`, `file-history-snapshot`, `last-prompt`, and malformed/unknown records;
- hide or collapse noisy wrapper/meta records by default while still preserving enough data for later detail/meta tabs;
- use transcript content, when available, as a better source of `cwd`, title, and summary metadata than the current path-only heuristic;
- extend sanitized fixtures/tests rather than wiring the parser into panel runtime.

Do not implement the Claude hot index cache, provider list/detail runtime integration, ThreadPage/provider-tab UI changes, package changes, dependencies, services/backends, native-open depth, pin UI, or excluded board/loop/team/mailbox/coordination/insight/vibe features.

Suggested validation for `AGHUD-012`:

- `node --check` for any new Claude parser/module tests
- `node src/host/providers/claude.test.js`
- parser-specific fixture test
- existing guard tests: `node src/host/provider-contract.test.js`, `node src/host/json-storage.test.js`, `node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- forbidden-scope scan over changed Claude parser/provider files and fixtures

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-parser.md`, `src/host/providers/claude.js`, `src/host/provider-contract.js`, and `test/fixtures/claude/projects`.
Complete `AGHUD-012` only.
Add the tolerant Claude JSONL parser and parser tests using the discovered Claude source files and sanitized fixtures.
Do not implement the Claude index cache, provider API/runtime wiring, UI integration, package changes, dependencies, services/backends, native-open depth, pin UI, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to the checker.
```
