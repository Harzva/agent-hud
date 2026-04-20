# evolution-2026-04-19-agenthud-removal-map.md

## Loop Type

- type: analysis

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `M0`
- bounded target: complete `AGHUD-003` by mapping recovered source modules, functions, and message types that must be removed from pure AgentHUD.

## Review Window

- reviewed loops: `.claude/plans/loloop/evolution-2026-04-19-agenthud-feature-allowlist.md`
- status: previous tick completed the feature allowlist and made this removal map dependency-ready.

## Completed

- Created `docs/agenthud/removal-map.md`.
- Mapped removable board and loop-board surface:
  `src/webview/board.js`, board CSS/state, board tab/card functions, and board message types.
- Mapped removable loop daemon and auto-loop surface:
  `src/host/auto-continue.js`, loop daemon functions in `src/host/lifecycle.js`, loop UI, and loop message types.
- Mapped removable team/mailbox/coordination surface:
  `src/host/team-coordination.js`, team storage concepts, handoff messages, and coordination UI.
- Mapped removable insights/usage/vibe surface:
  `src/webview/insights.js`, `src/host/thread-insight.js`, `src/host/usage-ledger.js`, analytics UI, and generation messages.
- Mapped removable memory/prompt/rule/memo card surface.
- Mapped removable service-start/probe/dashboard-shell surface.
- Separated Thread-page dependencies that can be reimplemented: drawer shape, thread explorer layout, Codex native open, source reveal, provider-scoped message routing, and local data-source references.
- Updated `tasks.json`: `AGHUD-003` is now `completed` with evidence.

## Validation

- `node -e 'const fs=require("fs"); const t=JSON.parse(fs.readFileSync("tasks.json","utf8")); const a=t.tasks.find(x=>x.id==="AGHUD-003"); console.log(`${a.id} ${a.status}`);'`
- `test -s docs/agenthud/removal-map.md && wc -l docs/agenthud/removal-map.md`
- `rg -n "Board And Loop Board|Loop Daemon And Auto-Loop Controls|Team, Mailbox, And Coordination|Insights, Usage, Topic Maps, Word Clouds, And Vibe Advice|Memory, Prompt, Rule, And Memo Cards|Service Start, Probe, And Dashboard Shell|Message types to exclude|Thread-page separation|renderBoardPane|renderInsightsSections|readTeamCoordination|configureAutoContinue|generateThreadVibeAdvice|rebuildPersistedUsageReport|setHandoffObject|startServer|restartServer" docs/agenthud/removal-map.md`

## Failed or Deferred

- No AgentHUD scaffold files were created in this tick; the task was explicitly analysis-only.
- No recovered source extension files were modified.

## Decisions

- Future source copying must first remove imports for `webview/board`, `webview/insights`, `team-coordination`, `auto-continue`, `thread-insight`, and `usage-ledger`.
- Thread-page code must be reimplemented against provider contracts rather than migrated with dashboard payload assumptions.

## Analysis Checks

- regression risk: low; only docs and the task ledger changed.
- drift risk: low; this hardening tick directly reduces migration ambiguity.
- version safety: acceptable; no runtime scaffold exists yet.
- plan adjustment: none.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-removal-map.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-004` and `AGHUD-023` are unblocked; prefer `AGHUD-023` to lock zero-service runtime architecture before creating package contributions.
Complete one bounded, verifiable slice in `/home/clashuser/hzh/work_bo/agent_ui/agent_hud`.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
End with the next smallest handoff.
```
