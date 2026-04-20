# AgentHUD Evolution: Claude Parser Fixtures

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`

## Bounded Target

Complete `AGHUD-015` only by adding sanitized Claude parser fixtures and extending parser assertions for transcript variants.

## Completed Work

- Added a new synthetic fixture:
  - `test/fixtures/claude/variants/-home-user-variant-project/session-variants.jsonl`
- The fixture covers required variants:
  - normal chat (`system`/`user`/`assistant`)
  - `tool_use` and `tool_result`
  - hidden meta records (`permission-mode`, `file-history-snapshot`, `last-prompt`)
  - `snapshot` and `sidechain` records
  - malformed JSON line handling
- Extended `src/host/providers/claude-parser.test.js` to validate on the new fixture:
  - title
  - cwd
  - timestamps (`createdAt`, `updatedAt`)
  - model/version behavior
  - normalized message sequence
  - hidden record counters and malformed-line metadata
- Updated `src/host/providers/claude.js` to treat `version` (and nested meta/session variants) as a model fallback for parser normalization.
- Updated `tasks.json`:
  - `AGHUD-015` marked `completed`
  - source refs narrowed to in-repo files
  - evidence recorded for fixtures/tests and sanitization

## Validation

- `node --check src/host/providers/claude.js src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude-parser.test.js`
- `node src/host/providers/claude-cache.test.js && node src/host/providers/claude.test.js && node src/host/providers/claude-api.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Failed or Deferred

- No Claude panel/runtime wiring was added.
- No ThreadPage/UI integration was added.
- No package/runtime/dependency/service changes were made.

## Next Handoff

```text
Complete `AGHUD-016` only.
Add Codex/Claude provider tabs to the shared Thread page and wire tab switching to provider-scoped data/state without full webview reloads.
Keep scope to tab UI/state wiring; do not add provider-native action depth or out-of-scope dashboard features.
```
