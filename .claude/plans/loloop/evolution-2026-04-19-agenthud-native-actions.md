# AgentHUD Evolution: Native Actions

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-provider-tabs-refresh.md`

## Bounded Target

Complete `AGHUD-017` only by enabling provider-specific native actions for Codex and Claude behind capability gating.

## Completed Work

- Updated `src/host/panel-view.js`:
  - implemented `openNativeForProvider` to route native-open actions by selected provider;
  - Codex action path:
    - tries `openai-codex://route/local/<threadId>` URI;
    - tries `chatgpt.openSidebar` command;
    - falls back to opening local transcript source file;
  - Claude action path:
    - opens local transcript source file when available;
    - otherwise reveals project folder in OS (`revealFileInOS`);
  - retained capability checks before action dispatch.
- Updated `src/host/thread-page.js`:
  - added capability-gated action button in detail header;
  - labels are provider-specific (`Open in Codex`, `Open Transcript`);
  - wired `openNative` webview postMessage with provider + thread ID context.
- Updated `src/host/providers/claude.js`:
  - `claudeCapabilities().openNative` set to `true` now that source actions are implemented.
- Updated tests:
  - `src/host/thread-page.test.js` now checks native-open action labels for both providers;
  - `src/host/providers/claude-api.test.js` now asserts Claude `openNative` capability.
- Updated `tasks.json`:
  - `AGHUD-017` marked `completed` with evidence.

## Validation

- `node --check src/host/panel-view.js src/host/thread-page.js src/host/thread-page.test.js src/host/providers/claude.js src/host/providers/claude-api.test.js`
- `node src/host/thread-page.test.js`
- `node src/host/providers/claude-api.test.js && node src/host/providers/claude.test.js && node src/host/providers/codex.test.js`
- `node src/host/message-protocol.test.js && node src/host/ui-state.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Failed or Deferred

- No additional provider command discovery beyond existing Codex URI/command attempt was added.
- No board/loop/team/mailbox/coordination/insight/vibe expansion was added.
- No Python/FastAPI/local HTTP runtime changes were added.

## Next Handoff

```text
Complete `AGHUD-018` only.
Normalize provider status/grouping presentation so Running/Recent/Idle/Archived/Unknown grouping and labels stay provider-neutral, with Codex-only affordances remaining Codex-scoped.
Keep scope to grouping/status behavior only.
```
