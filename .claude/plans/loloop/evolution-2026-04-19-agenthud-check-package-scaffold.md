# AgentHUD Evolution: Check Package Scaffold Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-dependency-policy.md`

## Review Window

- Last optimize dispatch completed `AGHUD-024`.
- Changed artifacts reviewed:
  - `docs/agenthud/dependency-policy.md`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-dependency-policy.md`
- Scheduler state reports implementation thread `019da180-b86f-7cf2-9e6d-929d6656231e` returned `0`.

## Findings

- Scope drift: none found. The dependency policy stayed architecture-only and did not scaffold package/runtime files.
- Dependency risk: reduced. The policy explicitly allows VS Code APIs, extension-host Node APIs, pure JavaScript, bundled static assets, and rebuildable JSON cache; it prohibits Python, FastAPI, local HTTP services, native sqlite as a runtime dependency, post-install downloads, runtime CDN assets, and first-run setup commands.
- Validation: acceptable for a doc/task-ledger slice. The optimize note recorded JSON parse, artifact existence, and key policy term checks.
- UI bloat: none found. No webview or product UI files were added.
- Scheduler state: healthy. The failed dispatch recovery was followed by a successful optimize dispatch.

## Task Metadata Adjustment

- Updated `AGHUD-004.dependencies` from `["AGHUD-001"]` to `["AGHUD-001", "AGHUD-024"]` so the package scaffold is explicitly gated by the completed dependency policy.
- Updated `AGHUD-024.source_refs` to point to `roadmap.md` and `docs/agenthud/dependency-policy.md` instead of the non-existent `docs/agenthud/roadmap.md`.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-004` next, and keep it strictly to the minimal contribution set.

The next micro-task is:

- create the smallest valid VS Code extension scaffold needed for AgentHUD:
  - `package.json`;
  - a minimal extension entry file only if required by the contribution/activation shape;
  - minimal host panel/view file only if needed to satisfy the open command behavior;
  - `.vscodeignore` only if packaging hygiene is needed now;
- contribute only AgentHUD open, refresh, reveal provider/source, and quick-switch commands as the task allows;
- ensure activation events do not mention service startup, Python, FastAPI, local HTTP ports, board, loop board, team, mailbox, coordination, insights, or vibe dashboards;
- make the opened surface land on a Thread-page shell or placeholder, not a landing page or dashboard;
- do not implement provider indexers, Codex parsing, Claude parsing, cache hydration, broad webview layout, or native-open action internals in this task.

Suggested validation for `AGHUD-004`:

- `node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8")); console.log("package.json OK")'`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" package.json src .vscodeignore` should return no forbidden contribution/runtime terms, except any deliberately documented negative test text.
- If code is added, run the lightest syntax check available for the entry files.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `docs/agenthud/dependency-policy.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-package-scaffold.md`.
Complete `AGHUD-004` only.
Create the minimal AgentHUD VS Code contribution scaffold with no server/startup workflow and no board/team/loop/insight surface.
Do not implement provider indexers or deep webview UI yet.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and hand off to `AGHUD-005`.
```
