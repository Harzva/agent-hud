# AgentHUD Evolution: Check State Persistence Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-contract-threadpage.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-contract-refactor.md`

## Review Window

- Last optimize dispatch completed `AGHUD-009`.
- Changed artifacts reviewed:
  - `src/host/thread-page.js`
  - `src/host/thread-page.test.js`
  - `src/host/provider-contract.js`
  - `src/host/panel-view.js`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-contract-threadpage.md`

## Findings

- Scope drift: none found. The change stayed within ThreadPage contract consumption and did not implement Claude parsing, provider persistence, storage migration, native-open behavior, package changes, dependencies, or excluded dashboard surfaces.
- Dependency risk: none found. ThreadPage imports the existing local provider-contract helper only.
- Runtime/backend risk: none found. No Python, FastAPI, local HTTP service, native install requirement, post-install download, localhost path, or service startup path was introduced.
- UI scope: unchanged. The Codex page remains functional, Claude remains a placeholder, and no board/loop/team/mailbox/coordination/insight/vibe UI appeared.
- Contract use: acceptable. Provider and status options derive from the contract helper, raw provider statuses fall back to `unknown`, and missing capability fields now default to `false` through `normalizeCapabilities`.
- Residual risk: provider labels and Codex-only enablement are still hard-coded in ThreadPage. That is acceptable before Claude adapter work, but later provider-tab tasks should move labels/actions into provider metadata instead of growing conditionals.

## Validation

- `node --check src/host/thread-page.js && node --check src/host/thread-page.test.js && node --check src/host/provider-contract.js`
- `node src/host/thread-page.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/message-protocol.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/thread-page.js src/host/provider-contract.js src/host/thread-page.test.js || true`

All checks passed.

## Task Metadata Adjustment

- Updated `AGHUD-010.description` to defer pinned rows until a concrete pure ThreadPage pin UI exists.
- Replaced stale `AGHUD-010.source_refs` entry `src/webview-template.js` with current pure workspace files: `src/host/panel-view.js`, `src/host/thread-page.js`, and `src/host/message-protocol.js`.
- Added an `AGHUD-010` acceptance criterion clarifying that the generic JSON storage migration/source-manifest layer remains reserved for `AGHUD-026`.

No implementation task was marked complete by this check pass.

## Guidance For Implementation Agent

Do `AGHUD-010` next.

Keep the slice limited to UI state persistence:

- persist selected provider, selected Codex thread ID, and per-provider query/status/sort state from `src/host/panel-view.js`;
- load that state during runtime construction before first render;
- use a schema-versioned payload and tolerate missing/corrupt/unsupported state by falling back to `createThreadPageState`;
- debounce writes triggered by provider selection, thread selection, query/status/sort changes, and refresh-driven selection changes;
- preserve cache-first Codex hydration and existing message protocol behavior;
- add focused tests with a fake VS Code context/globalState or a small persistence helper if needed.

Do not implement source manifests, cache migrations, `globalStorageUri/agenthud/state.json`, Claude parsing/discovery, provider tabs beyond the placeholder, pin UI, package changes, dependencies, services/backends, native-open depth, or excluded dashboard features.

Suggested validation for `AGHUD-010`:

- `node --check src/host/panel-view.js src/host/thread-page.js src/host/message-protocol.js`
- focused persistence/helper test if a helper is added;
- `node src/host/thread-page.test.js`
- `node src/host/message-protocol.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/summary-cache.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/panel-view.js src/host/thread-page.js src/host/message-protocol.js || true`

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-state-persistence.md`, `src/host/panel-view.js`, `src/host/thread-page.js`, and `src/host/message-protocol.js`.
Complete `AGHUD-010` only.
Persist selected provider, selected thread per provider, and search/status/sort per provider with a schema-versioned, debounced UI-state payload.
Do not implement AGHUD-026 storage migration/source manifests, Claude parsing, package changes, dependencies, services/backends, native-open depth, pin UI, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and then hand off to the checker.
```
