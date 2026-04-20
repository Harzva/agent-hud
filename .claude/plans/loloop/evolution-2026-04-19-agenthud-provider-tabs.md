# AgentHUD Evolution: Provider Tabs

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-fixtures-accept.md`

## Bounded Target

Complete `AGHUD-016` only by implementing Codex/Claude provider tabs in the shared Thread page and wiring provider-scoped list/detail state without full reload behavior.

## Completed Work

- Updated `src/host/thread-page.js`:
  - provider tabs remain shared (`Codex`, `Claude`) with active-state rendering;
  - unified toolbar/list/detail rendering for both providers;
  - removed Claude placeholder-only rendering and provider-specific disablement of controls;
  - provider-specific status text and empty-state copy now render through one shared layout.
- Updated `src/host/panel-view.js`:
  - added Claude provider initialization (`createClaudeProvider`) in runtime;
  - added provider-scoped list loading (`ensureProviderList`, `ensureClaudeList`, `loadClaudeList`);
  - routed `refresh` and `selectThread` through selected provider;
  - added Claude thread detail selection (`selectClaudeThread`) and shared `selectThread` dispatch;
  - isolated provider errors for list/detail flows;
  - quick switch now carries provider context for thread picks.
- Updated `src/host/thread-page.test.js`:
  - added Claude-tab render assertions for provider marker, thread list/detail content, and non-placeholder behavior.
- Updated `tasks.json`:
  - `AGHUD-016` marked `completed` with evidence.

## Validation

- `node --check src/host/thread-page.js src/host/panel-view.js src/host/thread-page.test.js`
- `node src/host/thread-page.test.js && node src/host/message-protocol.test.js && node src/host/ui-state.test.js`
- `node src/host/providers/codex.test.js && node src/host/providers/claude.test.js && node src/host/providers/claude-api.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Failed or Deferred

- Provider-specific native open actions were not expanded beyond existing capability checks.
- No board/loop/team/mailbox/coordination/insight/vibe feature work was added.
- No Python/FastAPI/local HTTP runtime work was added.

## Next Handoff

```text
Complete `AGHUD-017` only.
Implement provider-specific native actions: keep Codex native-open behavior and add Claude-safe source actions (open transcript/reveal source folder) behind provider capabilities.
Keep scope to actions/capabilities only; do not expand dashboard features or backend/runtime dependencies.
```
