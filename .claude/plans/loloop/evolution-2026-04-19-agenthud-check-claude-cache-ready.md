# AgentHUD Evolution: Check Claude Cache Ready

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.codex-loop/state/dispatch_contract.json`
- Recent notes under `.claude/plans/loloop/evolution-2026-04-19-agenthud-*.md`

## Review Window

- Latest checker note remains `evolution-2026-04-19-agenthud-check-claude-cache-refresh.md`.
- `tasks.json` still shows `AGHUD-013` as the next dependency-ready planned task.
- No new optimize evolution note landed after `AGHUD-012` parser completion.
- Latest source mtime indicates recent touch on `src/host/panel-view.js`; content review shows no out-of-scope feature insertion.

## Findings

- Scope drift: none found in reviewed host/runtime files; no board/loop/team/mailbox/insights/vibe surfaces reintroduced.
- Validation drift: no breakage detected; focused parser/discovery and ThreadPage guard suites pass.
- Dependency/runtime risk: none found; no Python/FastAPI/local HTTP/native install/post-install behavior introduced.
- Planning state: consistent with a cache-only next slice (`AGHUD-013`) before Claude provider API dispatch (`AGHUD-014`).

## Validation

- `node --check src/host/panel-view.js && node --check src/host/thread-page.js && node --check src/host/providers/claude.js`
- `node src/host/providers/claude-parser.test.js && node src/host/providers/claude.test.js && node src/host/provider-contract.test.js`
- `node src/host/thread-page.test.js && node src/host/message-protocol.test.js && node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop board|team|mailbox|coordination lanes|usage insights|vibe dashboards|FastAPI|Python|localhost|startServer|native install|post-install" src/host/panel-view.js src/host/providers/claude.js src/host/thread-page.js tasks.json || true`

## Task Metadata Adjustment

- None required in this pass. `AGHUD-013` acceptance constraints already enforce cache-only scope.

## Guidance For Implementation Agent

Do `AGHUD-013` only, and keep it strictly parser-cache scoped:

- implement Claude parsed-summary cache entries keyed by `path`, `size`, `mtimeMs`;
- reuse cached parsed outputs for unchanged sources; parse only changed/missing rows;
- use schema-versioned JSON payload and tolerant read + atomic write behavior;
- include cache metadata counters for parsed/reused/invalidated/errors without failing full list refresh;
- add focused tests for cache hit/miss, invalidation on size/mtime changes, and corrupt-cache rebuild.

Do not wire Claude into panel runtime, ThreadPage UI, or provider API dispatch in this slice.  
Do not change package contributions, dependencies, services/backends, native-open depth, pin UI, or excluded dashboard feature families.

## Next Smallest Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-claude-cache-ready.md`, `src/host/providers/claude.js`, and `src/host/json-storage.js`.
Complete `AGHUD-013` only.
Implement Claude parsed-summary cache keyed by path/size/mtime with tolerant rebuild behavior and targeted tests.
Do not wire Claude into panel runtime or ThreadPage UI, and do not implement AGHUD-014 provider API dispatch in this slice.
Update `tasks.json` evidence/status after validation and write one optimize evolution note.
```
