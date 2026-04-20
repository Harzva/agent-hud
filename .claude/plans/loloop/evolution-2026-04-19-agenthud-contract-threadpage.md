# AgentHUD Evolution: Contract ThreadPage

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-contract-refactor.md`
- `src/host/provider-contract.js`
- `src/host/thread-page.js`
- `src/host/thread-page.test.js`

## Bounded Target

Complete `AGHUD-009` only by making ThreadPage consume the provider-contract helper while preserving current Codex behavior.

## Completed Work

- Updated `src/host/thread-page.js` to import:
  - `PROVIDER_IDS`
  - `THREAD_STATUSES`
  - `normalizeCapabilities`
  - `normalizeProviderId`
  - `normalizeThreadStatus`
- Replaced local provider/status assumptions with contract-derived values where behavior stays identical.
- Status filter options now use the contract status list plus `all`.
- Thread rows and search filtering normalize raw provider status values to the contract fallback.
- Detail metadata normalizes status before rendering.
- Detail capability rendering now uses `normalizeCapabilities`, so missing capability fields default to `false`.
- Updated `src/host/thread-page.test.js` to cover partial capabilities and raw status fallback.
- Updated `tasks.json`: `AGHUD-009` is now `completed` with evidence.

## Validation

- `node --check src/host/thread-page.js && node --check src/host/thread-page.test.js && node --check src/host/provider-contract.js`
- `node src/host/thread-page.test.js`
- `node src/host/provider-contract.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/summary-cache.test.js`
- `node src/host/message-protocol.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/thread-page.js src/host/provider-contract.js src/host/thread-page.test.js || true`

## Failed or Deferred

- Claude source discovery and parsing were not implemented.
- Provider state persistence remains deferred to `AGHUD-010`.
- Storage migration and source manifest work remain deferred to `AGHUD-026`.
- No package, dependency, service/backend, native-open depth, or runtime scaffold changes were made.
- No recovered source extension files were modified.

## Decisions

- ThreadPage should normalize provider data at render/filter boundaries, but adapters remain responsible for returning the contract shape when possible.
- Capability-driven UI should consume normalized capability defaults rather than raw optional fields.
- Raw provider statuses should display and filter as `unknown` until an adapter maps them into the shared status set.

## Next Handoff

```text
Pick the next smallest dependency-ready task in milestone order.
`AGHUD-010` is now unblocked: add provider state persistence for selected provider, selected thread IDs, search/filter/sort per provider, and schema-versioned UI state without adding storage migration/source-manifest scope.
Keep the slice minimal and do not implement Claude parsing, storage migration, package changes, dependencies, services/backends, or excluded dashboard features.
```

