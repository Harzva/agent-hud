# evolution-2026-04-19-agenthud-dependency-policy.md

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- recent `.claude/plans/loloop/evolution-*.md` notes

## Bounded Target

Complete `AGHUD-024` only by defining the packaged dependency policy before `AGHUD-004` creates any package/runtime scaffold.

## Completed Work

- Created `docs/agenthud/dependency-policy.md`.
- Documented the default single-VSIX runtime: VS Code APIs, Node APIs available in the extension host, bundled AgentHUD source/assets, and rebuildable JSON cache under `globalStorageUri`.
- Defined allowed dependencies as pure JavaScript, VS Code APIs, or bundled static assets.
- Explicitly prohibited Python, FastAPI, local HTTP services, native sqlite bindings, sidecar daemons, post-install downloads, runtime CDN assets, and user-managed setup commands in the shipped runtime path.
- Added a native dependency exception checklist requiring platform coverage, bundled-binary proof, no-build/no-download install proof, package-size and activation-time impact, and rollback plan.
- Documented package-size and activation-time budgets.
- Updated `tasks.json`: `AGHUD-024` is now `completed` with evidence.

## Validation

- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `test -s docs/agenthud/dependency-policy.md && wc -l docs/agenthud/dependency-policy.md`
- `rg -n "Allowed Dependencies|Native Dependency Exception|Install Scripts And Downloads|Package Budget|Activation Budget|Packaging Checklist|pure JavaScript|VS Code APIs|bundled|postinstall|Activation target|VSIX target" docs/agenthud/dependency-policy.md`

## Failed or Deferred

- No package/runtime scaffold was created; `AGHUD-004` remains the next implementation task.
- No recovered source extension files were modified.
- No dependency was added in this slice.

## Decisions

- New runtime dependencies must be justified against the dependency policy before being added to `package.json`.
- Native dependencies remain disallowed unless a task explicitly documents and accepts the exception proof.
- Initial provider adapters should prefer built-in Node/VS Code APIs and local helpers.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-dependency-policy.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-004` is now unblocked and should create the minimal AgentHUD VS Code contribution set only.
Do not add provider indexers, webview feature depth, board/team/loop/insight surface, Python/FastAPI/local HTTP services, native install requirements, or post-install downloads.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
Run the lightest relevant validation for changed files.
```
