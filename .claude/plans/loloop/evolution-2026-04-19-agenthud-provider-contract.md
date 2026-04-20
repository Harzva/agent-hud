# AgentHUD Evolution: Provider Contract

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-provider-contract.md`
- `src/host/providers/codex.js`
- `src/host/thread-page.js`
- `src/host/summary-cache.js`

## Bounded Target

Complete `AGHUD-008` only by defining provider-neutral ThreadPage contracts and adding a small dependency-free runtime contract helper.

## Completed Work

- Created `docs/agenthud/provider-contract.md`.
- Documented TypeScript-style shapes for:
  - `AgentProviderId`
  - `AgentThreadStatus`
  - `AgentThread`
  - `AgentMessage`
  - `AgentEvent`
  - `AgentCapabilities`
  - `ProviderIssue`
  - `ListThreadsResult`
  - `AgentThreadDetail`
  - `ThreadDetailResult`
  - `ProviderSummaryCachePayload`
- Documented normalized status semantics, provider-neutral source metadata, message/event boundaries, capability defaults, providers with no native-open or live-log support, adapter result metadata, and summary-cache payload shape.
- Added `src/host/provider-contract.js` with constants, normalizers, default capabilities, and lightweight shape guards.
- Added `src/host/provider-contract.test.js` covering normalization, capability defaults, provider summaries, and detail results for a provider with `liveLogs: false`.
- Updated `tasks.json`: `AGHUD-008` is now `completed` with evidence.

## Validation

- `test -s docs/agenthud/provider-contract.md && rg -n "AgentProviderId|AgentThread|AgentThreadDetail|AgentMessage|AgentEvent|AgentCapabilities|ListThreadsResult|ThreadDetailResult|schema_version|ProviderSummaryCachePayload" docs/agenthud/provider-contract.md`
- `node --check src/host/provider-contract.js && node --check src/host/provider-contract.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/provider-contract.js src/host/provider-contract.test.js || true`

## Failed or Deferred

- `AGHUD-009` was not implemented; ThreadPage still owns its local constants until the dedicated refactor.
- Claude transcript discovery and parsing remain deferred.
- UI state persistence and source manifest storage remain deferred.
- No package, dependency, service/backend, or runtime scaffold changes were made.
- No recovered source extension files were modified.

## Decisions

- The contract doc is the source of truth for cross-module shape names.
- The runtime helper remains intentionally small so later implementation tasks can import it without changing package/runtime policy.
- Capability fields default to `false`; providers without native-open or live event support are valid provider implementations.

## Next Handoff

```text
Complete `AGHUD-009` only.
Refactor `src/host/thread-page.js` to consume the provider contract names and defaults from `src/host/provider-contract.js` while preserving current Codex behavior.
Keep the change minimal: do not implement Claude parsing, storage migration, package changes, new dependencies, services/backends, or native-open depth.
Run the focused ThreadPage, provider-contract, Codex adapter, message-protocol, summary-cache, and tasks.json validations.
```

