# evolution-2026-04-19-agenthud-package-scaffold.md

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `docs/agenthud/dependency-policy.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-package-scaffold.md`

## Bounded Target

Complete `AGHUD-004` only by creating the minimal AgentHUD VS Code contribution scaffold. Do not implement provider indexers, deep webview UI, or any excluded feature family.

## Completed Work

- Created `package.json` for the standalone `agenthud` VS Code extension.
- Contributed only these commands:
  - `agenthud.open`
  - `agenthud.refresh`
  - `agenthud.revealProvider`
  - `agenthud.quickSwitch`
- Added AgentHUD thread webview surfaces:
  - activity bar view `agenthud.threads`
  - panel view `agenthud.panel`
  - editor webview panel opened by `agenthud.open`
- Added `extension.js` as the minimal activation entry.
- Added `src/host/panel-view.js` with the smallest host runtime needed to open a Thread-page shell, switch Codex/Claude provider tabs, and handle refresh messages.
- Added `media/agenthud.svg` as a bundled static icon asset.
- Updated `tasks.json`: `AGHUD-004` is now `completed` with evidence.

## Validation

- `node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8")); console.log("package.json OK")'`
- `node --check extension.js && node --check src/host/panel-view.js`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" package.json extension.js src media || true`
- `node - <<'NODE'
const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
console.log(pkg.contributes.commands.map((c) => c.command).join('\n'));
NODE`

## Failed or Deferred

- No Codex provider adapter was implemented; that belongs to `AGHUD-005`.
- No Claude provider adapter, provider contract, cache layer, or parser was implemented.
- No `.vscodeignore` was added in this slice because packaging hygiene can be handled when package/manual QA tasks need it.
- No recovered source extension files were modified.

## Decisions

- The first scaffold uses no runtime dependencies and no package scripts.
- The first opened surface is a Thread-page shell, not a dashboard or marketing page.
- Provider commands are present but intentionally shallow until provider adapters and contracts exist.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-package-scaffold.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-005` is now unblocked.
Implement only the Codex Node thread data adapter slice needed for normalized list/detail data from local Codex session/rollout files.
Do not add Python, FastAPI, local HTTP services, native sqlite requirements, post-install downloads, board, loop board, team, mailbox, coordination lanes, usage insights, or vibe dashboards.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
Run the lightest relevant validation for changed files.
```
