# AgentHUD Evolution: Check Contract Refactor Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-provider-contract.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-provider-contract.md`

## Review Window

- Last optimize dispatch completed `AGHUD-008`.
- Changed artifacts reviewed:
  - `docs/agenthud/provider-contract.md`
  - `src/host/provider-contract.js`
  - `src/host/provider-contract.test.js`
  - `src/host/thread-page.js`
  - `src/host/providers/codex.js`
  - `src/host/summary-cache.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-provider-contract.md`

## Findings

- Scope drift: none found. The implementation stayed on the provider contract and did not refactor ThreadPage broadly, implement Claude parsing, add persistence, alter package contributions, or introduce excluded dashboard features.
- Dependency risk: none found. The runtime helper is dependency-free and uses only local constants, normalizers, and shape guards.
- Runtime/backend risk: none found. No Python, FastAPI, local HTTP service, native install step, post-install download, localhost path, or service startup path was introduced.
- UI scope: unchanged. The current ThreadPage remains Codex-only with a Claude placeholder, which is appropriate until `AGHUD-009` and later Claude tasks.
- Contract quality: acceptable. The doc names the shared provider shapes and the helper exports normalized providers, statuses, message roles, default capabilities, and lightweight guards.
- Residual risk: `isAgentThreadDetail` expects a fully materialized capability object, while the contract says missing capability fields default to `false`. The next implementation should normalize detail capabilities at the boundary with `normalizeCapabilities` before rendering or guarding.

## Validation

- `test -s docs/agenthud/provider-contract.md && rg -n "AgentProviderId|AgentThread|AgentThreadDetail|AgentMessage|AgentEvent|AgentCapabilities|ListThreadsResult|ThreadDetailResult|schema_version|ProviderSummaryCachePayload" docs/agenthud/provider-contract.md`
- `node --check src/host/provider-contract.js && node --check src/host/provider-contract.test.js && node --check src/host/thread-page.js`
- `node src/host/provider-contract.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/thread-page.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/provider-contract.js src/host/provider-contract.test.js docs/agenthud/provider-contract.md || true`

All checks passed.

## Task Metadata Adjustment

- Updated `AGHUD-009.description` so the next implementation explicitly consumes the provider-contract helper.
- Updated `AGHUD-009.source_refs` to include `src/host/provider-contract.js` and `docs/agenthud/provider-contract.md`.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-009` next.

The next micro-task is a narrow ThreadPage contract refactor:

- import provider/status/capability helpers from `src/host/provider-contract.js` in `src/host/thread-page.js`;
- replace ThreadPage-local provider and status assumptions with contract exports where it keeps behavior identical;
- normalize detail capabilities with `normalizeCapabilities` before rendering capability-driven UI;
- keep Codex list/detail rendering behavior unchanged;
- update `src/host/thread-page.test.js` only for contract consumption coverage if needed.

Do not implement Claude parsing, source discovery, provider persistence, storage migration, native-open depth, package changes, dependencies, backend/service code, or excluded board/loop/team/mailbox/coordination/insight/vibe surfaces.

Suggested validation for `AGHUD-009`:

- `node --check src/host/thread-page.js src/host/thread-page.test.js src/host/provider-contract.js`
- `node src/host/thread-page.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/message-protocol.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/thread-page.js src/host/provider-contract.js src/host/thread-page.test.js || true`

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-contract-refactor.md`, `src/host/thread-page.js`, and `src/host/provider-contract.js`.
Complete `AGHUD-009` only.
Refactor ThreadPage to consume provider-contract helpers and normalize capabilities while preserving current Codex behavior.
Do not implement Claude, provider persistence, storage migration, native-open depth, package changes, dependencies, services/backends, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to the checker.
```
