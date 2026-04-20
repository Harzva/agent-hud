# AgentHUD Evolution: Claude Parser

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-parser.md`
- `src/host/providers/claude.js`
- `src/host/provider-contract.js`
- `test/fixtures/claude/projects`

## Bounded Target

Complete `AGHUD-012` only by adding a tolerant Claude JSONL parser.

## Completed Work

- Extended `src/host/providers/claude.js` with `parseClaudeSession`.
- Added `src/host/providers/claude-parser.test.js`.
- Added a richer sanitized parser fixture at `test/fixtures/claude/projects/-home-user-rich-project/session-rich.jsonl`.
- The Claude parser now:
  - parses one discovered session file at a time;
  - accepts string content and array content;
  - extracts normalized `user`, `assistant`, `tool`, and `system` messages;
  - emits tool messages for `tool_use` and `tool_result`;
  - hides `permission-mode`, `file-history-snapshot`, and `last-prompt` by default while counting hidden records;
  - hides wrapper-style noisy system records by default;
  - uses transcript metadata, when present, to improve `cwd`, `title`, `preview`, timestamps, and model;
  - tolerates malformed JSON lines and records them in parser metadata.
- Updated `tasks.json`: `AGHUD-012` is now `completed` with evidence.

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

## Failed or Deferred

- Claude hot index caching was not implemented.
- Claude provider API/runtime wiring was not implemented.
- Claude UI integration was not implemented.
- No package, dependency, service/backend, native-open depth, pin UI, or runtime scaffold changes were made.
- No recovered source extension files were modified.

## Decisions

- Parser metadata carries hidden-record counts and malformed-line errors so later detail/meta tabs can surface them without showing the noisy records in the main conversation view.
- Tool-use and tool-result records normalize into tool-role messages, matching the shared provider-contract message model.
- Hidden meta records still contribute to `updatedAt` because they are part of the session timeline.

## Next Handoff

```text
Pick the next smallest dependency-ready task in milestone order.
`AGHUD-013` is now unblocked: implement the Claude index cache keyed by path, size, and mtime so refreshes do not rescan every Claude transcript.
Keep the slice cache-only. Do not wire Claude into panel runtime or ThreadPage, change package contributions, add dependencies, services/backends, native-open depth, pin UI, or excluded dashboard features.
```

