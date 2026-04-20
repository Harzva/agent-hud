# AgentHUD Evolution: Check Claude Discovery Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-json-storage.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-json-storage.md`

## Review Window

- Last optimize dispatch completed `AGHUD-026`.
- Changed artifacts reviewed:
  - `src/host/json-storage.js`
  - `src/host/json-storage.test.js`
  - `src/host/summary-cache.js`
  - `src/host/summary-cache.test.js`
  - `src/host/ui-state.js`
  - `docs/agenthud/json-storage.md`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-json-storage.md`

## Findings

- Scope drift: none found. The work stayed within the JSON storage/helper layer and did not implement Claude parsing, hot indexing, provider-tab integration, package changes, services/backends, native-open depth, pin UI, or excluded dashboard features.
- Dependency risk: none found. The new storage helper uses Node built-ins only and adds no package dependency.
- Runtime/backend risk: none found. No Python, FastAPI, local HTTP service, native install requirement, post-install download, localhost path, or service startup path was introduced.
- Storage behavior: acceptable. Provider summaries now share tolerant schema-versioned reads and temp-file rename writes; corrupt summary JSON returns `null` and can be rebuilt.
- Source manifest: acceptable for the planned boundary. The helper defines path/read/write/normalization but does not start indexing or parsing provider transcripts.
- UI-state boundary: preserved. `AGHUD-010` globalState preferences remain in place; `agenthud/state.json` is reserved and documented only.
- Residual risk: `writeVersionedJson` assumes the caller supplies the correct `schema_version`; current call sites do. Future call sites should either set `schema_version` at construction or add a focused test around their payload builders.

## Validation

- `node --check src/host/json-storage.js src/host/json-storage.test.js src/host/summary-cache.js src/host/summary-cache.test.js src/host/ui-state.js`
- `node src/host/json-storage.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/ui-state.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/json-storage.js src/host/json-storage.test.js src/host/summary-cache.js src/host/summary-cache.test.js src/host/ui-state.js docs/agenthud/json-storage.md || true`

All checks passed.

## Task Metadata Adjustment

- Updated `AGHUD-011.source_refs` to include current planned files: `src/host/providers/claude.js`, `src/host/providers/claude.test.js`, and `src/host/json-storage.js`, while keeping `~/.claude/projects`.
- Added an `AGHUD-011` acceptance guard that this slice does not parse transcript messages, build the Claude index cache, or wire Claude into the UI.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-011` next.

Keep the slice discovery-only:

- add a small Claude provider/discovery module under `src/host/providers/claude.js`;
- discover JSONL session files under a configurable Claude projects root, defaulting to `~/.claude/projects`;
- return normalized discovery rows with provider/project directory, JSONL path, session ID, size, mtime/mtimeMs, likely project label, and likely cwd when cheaply inferable from path or shallow metadata;
- detect nested `subagents` files but exclude them from the main list by default;
- handle missing `~/.claude/projects`, unreadable directories, and malformed filenames without throwing through callers;
- add sanitized fixture tests in `src/host/providers/claude.test.js` or local test fixtures.

Do not parse conversation messages, normalize Claude transcript records, create the hot index cache, write source manifests from real scans, wire Claude into ThreadPage/panel runtime, change package contributions, add dependencies, add services/backends, implement native-open depth, pin UI, or add excluded dashboard surfaces.

Suggested validation for `AGHUD-011`:

- `node --check src/host/providers/claude.js src/host/providers/claude.test.js`
- `node src/host/providers/claude.test.js`
- existing guard tests: `node src/host/json-storage.test.js`, `node src/host/provider-contract.test.js`, `node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- forbidden-scope scan over new Claude provider/test files

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-discovery.md`, `src/host/json-storage.js`, and the existing provider pattern in `src/host/providers/codex.js`.
Complete `AGHUD-011` only.
Add discovery-only Claude transcript source discovery under `src/host/providers/claude.js` with tests and sanitized fixtures.
Do not parse Claude messages, build the hot index cache, wire Claude into the UI, write live source manifests, change package contributions, add dependencies, services/backends, native-open depth, pin UI, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to the checker.
```
