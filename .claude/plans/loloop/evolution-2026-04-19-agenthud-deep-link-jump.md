# AgentHUD Evolution: Deep Link Jump

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-status-grouping-accept.md`

## Bounded Target

Complete `AGHUD-027` only by implementing provider-aware jump/deep-link state handling with optional detail subtab and in-place state application.

## Completed Work

- Updated `src/host/message-protocol.js`:
  - added `setDetailTab`, `applyDeepLink`, `copyDeepLink` message types;
  - normalized deep-link payload fields (`provider`, `threadId`, `query`, `detailTab`).
- Updated `src/host/panel-view.js`:
  - added dispatch handling for detail-tab updates, deep-link copy, and deep-link application;
  - added deep-link serialization (`agenthud://thread?...`) with provider/thread/query/detailTab;
  - deep-link apply path now updates provider-scoped state and optionally selects thread without shell recreation.
- Updated `src/host/thread-page.js`:
  - added detail subtab UI (Conversation/Events) and provider-scoped `detailTab` state handling;
  - added `Copy Deep Link` action in detail header;
  - added hash-driven deep-link bootstrap that posts `applyDeepLink` to host when present;
  - added explicit `:focus-visible` styling for thread rows.
- Updated `src/host/ui-state.js`:
  - persisted/restored per-provider `detailTab` alongside selectedThread/query/filter/sort.
- Updated tests:
  - `src/host/message-protocol.test.js`
  - `src/host/ui-state.test.js`
  - `src/host/thread-page.test.js`
- Updated `tasks.json`:
  - `AGHUD-027` marked `completed` with evidence.

## Validation

- `node --check src/host/message-protocol.js src/host/panel-view.js src/host/thread-page.js src/host/ui-state.js src/host/message-protocol.test.js src/host/thread-page.test.js src/host/ui-state.test.js`
- `node src/host/message-protocol.test.js && node src/host/ui-state.test.js && node src/host/thread-page.test.js`
- `node src/host/providers/codex.test.js && node src/host/providers/claude.test.js && node src/host/providers/claude-api.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Failed or Deferred

- Keyboard next/previous row shortcuts and richer quick-switch ranking remain deferred to `AGHUD-037`.
- No board/loop/team/mailbox/coordination/insight/vibe expansion was added.
- No Python/FastAPI/local HTTP runtime changes were added.

## Next Handoff

```text
Complete `AGHUD-037` only.
Add keyboard-first navigation primitives (next/previous/open selected) and strengthen quick-switch thread/provider jump ergonomics while preserving provider-scoped state continuity.
Keep scope to quick-switch/keyboard navigation only.
```
