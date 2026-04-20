# AgentHUD Evolution: Check Provider Contract Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-cache-hydration.md`

## Review Window

- Last optimize dispatch completed `AGHUD-025`.
- Changed artifacts reviewed:
  - `src/host/summary-cache.js`
  - `src/host/summary-cache.test.js`
  - `src/host/panel-view.js`
  - `src/host/thread-page.js`
  - `src/host/thread-page.test.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-cache-hydration.md`

## Findings

- Scope drift: none found. The work stayed Codex-first and did not implement Claude cache, provider persistence, full source manifests, package changes, or excluded dashboard features.
- Dependency risk: none found. The cache helper uses Node built-ins only.
- Runtime/backend risk: none found. There is no Python, FastAPI, local HTTP service, native sqlite, localhost, or startup service path.
- Cache behavior: acceptable for `AGHUD-025`. The host renders before scanning, reads cached Codex summaries when present, scans in the background, writes refreshed summaries after successful scans, and keeps stale rows visible on scan failure.
- Validation: acceptable. Syntax checks, summary-cache test, message-protocol test, Codex adapter test, ThreadPage render test, `tasks.json` parse, and forbidden-term scan pass.
- Residual risk: the stale-cache failure path has host-code evidence and ThreadPage stale render coverage, but no full VS Code runtime integration test. That is acceptable at this stage; broaden during smoke/hardening tasks.

## Task Metadata Adjustment

- Updated `AGHUD-008.dependencies` from `["AGHUD-006"]` to `["AGHUD-006", "AGHUD-025"]` so the provider contract accounts for the now-existing summary cache shape.
- Updated `AGHUD-008.source_refs` to current AgentHUD files and the intended new contract doc path: `roadmap.md`, `src/host/providers/codex.js`, `src/host/thread-page.js`, `src/host/summary-cache.js`, and `docs/agenthud/provider-contract.md`.
- Updated `AGHUD-009.source_refs` to current AgentHUD files: `src/host/thread-page.js`, `src/host/providers/codex.js`, and `src/host/summary-cache.js`.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-008` next.

The next micro-task is provider-contract definition only:

- create `docs/agenthud/provider-contract.md`;
- add a small runtime contract module if useful, for example `src/host/provider-contract.js`, but keep it lightweight and dependency-free;
- document and export the common shapes for provider ID, thread summary, thread detail, message, event, capabilities, list result, detail result, provider metadata, and summary-cache payload;
- make the contract support providers with no native open, no live logs, no rename/archive/sendPrompt, and missing source folders;
- align the contract with the existing Codex adapter and summary cache without refactoring the whole ThreadPage yet;
- include a tiny contract smoke test only if a runtime module is added.

Do not implement `AGHUD-009` in the same pass. Avoid moving UI rendering code broadly, do not implement Claude parsing, provider persistence, full storage migration, native-open behavior, package changes, dependencies, services/backends, or out-of-scope dashboard features.

Suggested validation for `AGHUD-008`:

- `test -s docs/agenthud/provider-contract.md`.
- `rg` checks for `AgentProviderId`, `AgentThread`, `AgentThreadDetail`, `AgentMessage`, `AgentEvent`, `AgentCapabilities`, `ListThreadsResult`, `ThreadDetailResult`, and summary cache/schema terms.
- `node --check` and a focused test if a JS contract module is added.
- Existing tests: `node src/host/summary-cache.test.js`, `node src/host/message-protocol.test.js`, `node src/host/providers/codex.test.js`, and `node src/host/thread-page.test.js`.
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-provider-contract.md`, `src/host/providers/codex.js`, `src/host/thread-page.js`, and `src/host/summary-cache.js`.
Complete `AGHUD-008` only.
Define provider-neutral contracts in `docs/agenthud/provider-contract.md` and optionally a small dependency-free runtime contract module.
Align with existing Codex adapter and cache shapes, but do not refactor ThreadPage broadly yet.
Do not implement Claude, provider persistence, full storage migration, native-open depth, package changes, services/backends, dependencies, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to `AGHUD-009`.
```
