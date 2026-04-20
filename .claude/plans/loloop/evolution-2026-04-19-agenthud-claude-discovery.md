# AgentHUD Evolution: Claude Discovery

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-discovery.md`
- `src/host/json-storage.js`
- `src/host/providers/codex.js`

## Bounded Target

Complete `AGHUD-011` only by adding discovery-only Claude transcript source scanning.

## Completed Work

- Added `src/host/providers/claude.js`.
- Added `src/host/providers/claude.test.js`.
- Added sanitized fixtures under `test/fixtures/claude/projects`.
- The Claude discovery module now:
  - defaults to `~/.claude/projects`;
  - accepts a configurable `projectsRoot`;
  - finds `.jsonl` files under project directories;
  - returns normalized rows with `provider`, `projectDir`, `path`, `jsonlPath`, `sessionId`, `size`, `mtimeMs`, `mtime`, `projectLabel`, `cwd`, and `isSubagent`;
  - includes a source-manifest-compatible `manifestEntry`;
  - detects nested `subagents` files separately;
  - excludes subagent files from the main `sources` list unless `includeSubagents` is true;
  - handles missing roots without throwing.
- Updated `tasks.json`: `AGHUD-011` is now `completed` with evidence.

## Validation

- `node --check src/host/providers/claude.js && node --check src/host/providers/claude.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/json-storage.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/providers/claude.js src/host/providers/claude.test.js test/fixtures/claude || true`

## Failed or Deferred

- Claude message parsing was not implemented.
- Claude hot index cache was not implemented.
- Claude provider API integration was not wired into the panel runtime or ThreadPage.
- Source manifests are not written during discovery.
- No package, dependency, service/backend, native-open depth, pin UI, or runtime scaffold changes were made.
- No recovered source extension files were modified.

## Decisions

- Discovery rows include both `path` and `jsonlPath` for compatibility with provider-neutral storage and Claude-specific readability.
- Likely `cwd` is inferred from the encoded project directory name only; transcript metadata parsing is deferred.
- Subagent transcripts are visible to the discovery layer but excluded from the main list by default.

## Next Handoff

```text
Pick the next smallest dependency-ready task in milestone order.
`AGHUD-012` is now unblocked: build a tolerant Claude JSONL parser that turns discovered Claude sessions into normalized messages and summary metadata.
Keep the slice parser-only. Do not build the hot index cache, wire Claude into the UI, change package contributions, add dependencies, services/backends, native-open depth, pin UI, or excluded dashboard features.
```

