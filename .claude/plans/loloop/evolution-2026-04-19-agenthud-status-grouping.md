# AgentHUD Evolution: Status Grouping

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-native-actions-accept.md`

## Bounded Target

Complete `AGHUD-018` only by normalizing provider status/grouping presentation with consistent group headers/chips and provider-scoped affordances.

## Completed Work

- Updated `src/host/thread-page.js`:
  - introduced fixed status group order: `running`, `recent`, `idle`, `archived`, `unknown`;
  - rendered grouped thread sections with stable headers/counts (`data-status-group` markers);
  - added consistent status-chip and affordance-chip layout for row readability at higher density;
  - kept Codex-only affordance chip (`Native Open`) scoped to Codex row context;
  - added explicit Claude best-effort status labels for uncertain/running states;
  - updated list status summary to include visible status-group counts.
- Updated `src/host/thread-page.test.js`:
  - asserts grouped rendering markers;
  - asserts Codex native affordance chip visibility only in Codex context;
  - asserts Claude best-effort status labeling and absence of Codex-only affordance badge.
- Updated `tasks.json`:
  - `AGHUD-018` marked `completed` with evidence.

## Validation

- `node --check src/host/thread-page.js src/host/thread-page.test.js src/host/panel-view.js`
- `node src/host/thread-page.test.js`
- `node src/host/providers/codex.test.js && node src/host/providers/claude.test.js && node src/host/providers/claude-api.test.js`
- `node src/host/message-protocol.test.js && node src/host/ui-state.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`

## Failed or Deferred

- No new provider-running inference logic was added in provider adapters; this slice is presentation normalization only.
- No board/loop/team/mailbox/coordination/insight/vibe expansion was added.
- No Python/FastAPI/local HTTP runtime changes were added.

## Next Handoff

```text
Complete `AGHUD-027` only.
Add provider-aware deep-link state handling (`provider`, `threadId`, optional query/detail tab) so tab/thread selection can be restored/shared without full reload.
Keep scope to deep-link/state wiring only.
```
