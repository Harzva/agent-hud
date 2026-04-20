# evolution-2026-04-19-agenthud-zero-service-runtime.md

## Loop Type

- type: architecture

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `M0`
- bounded target: complete `AGHUD-023` by locking the zero-service runtime architecture before package scaffolding.

## Review Window

- reviewed loops: `.claude/plans/loloop/evolution-2026-04-19-agenthud-removal-map.md`
- status: previous tick completed the removal map and highlighted service-start/probe/dashboard shell code to exclude.

## Completed

- Created `docs/agenthud/zero-service-runtime.md`.
- Defined AgentHUD as a single-process VS Code extension runtime: extension host, webview `postMessage`, local Node provider adapters, and JSON cache/index files.
- Explicitly excluded Python startup, FastAPI startup, local HTTP port selection, localhost probing, HTTP dashboard/list/detail fetches, native sqlite install requirements, post-install downloads, user-managed dependency installation, and required daemons/sidecars.
- Replaced recovered `ensureServer`/`probeServer`/`startServer`/HTTP fetch concepts with direct extension-host provider functions.
- Documented initial load, thread selection, and refresh flows.
- Documented missing Codex and Claude source folder behavior as provider-local empty states.
- Documented malformed/unreadable source file behavior through `source-manifest.json`.
- Documented that any future backend must be optional and cannot replace the extension-host default runtime path.
- Updated `tasks.json`: `AGHUD-023` is now `completed` with evidence.

## Validation

- `node -e 'const fs=require("fs"); const t=JSON.parse(fs.readFileSync("tasks.json","utf8")); const a=t.tasks.find(x=>x.id==="AGHUD-023"); console.log(`${a.id} ${a.status}`);'`
- `test -s docs/agenthud/zero-service-runtime.md && wc -l docs/agenthud/zero-service-runtime.md`
- `rg -n "Python startup|FastAPI startup|local HTTP port selection|localhost probing|HTTP dashboard/list/detail fetches|direct JavaScript function calls|not HTTP calls|Optional Backend Rule|extension-host provider functions remain the default runtime path|Missing Source Folder Behavior|Codex missing|Claude missing|source-manifest.json|provider-scoped" docs/agenthud/zero-service-runtime.md`

## Failed or Deferred

- No package scaffold files were created in this tick; the task was an architecture lock.
- No recovered source extension files were modified.

## Decisions

- AgentHUD must not import recovered `server.js` as runtime code.
- Provider list/detail/search/refresh are direct host function calls.
- Provider health is source/index health, not service health.

## Analysis Checks

- regression risk: low; only architecture docs and task ledger changed.
- drift risk: low; service-start and HTTP runtime paths are now explicitly forbidden before scaffolding.
- version safety: acceptable; runtime package files are still not created.
- plan adjustment: none.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-zero-service-runtime.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-024` and `AGHUD-004` are unblocked; prefer `AGHUD-024` to define packaged dependency policy before scaffolding package files.
Complete one bounded, verifiable slice in `/home/clashuser/hzh/work_bo/agent_ui/agent_hud`.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
End with the next smallest handoff.
```
