# AgentHUD Pure Thread Roadmap

## Intent

Build a clean AgentHUD from the current `Codex-Managed-Agent` extension, but keep only the Thread-page product:

- Codex thread page
- Claude thread page
- Provider tabs for `Codex` and `Claude`
- Thread list, search, filters, details, history, recent logs, and provider-specific open actions

Do not carry forward board, loop board, team space, mailbox, coordination lanes, usage insights, vibe analysis, or multi-agent orchestration. Those are useful in the original product, but they are outside this pure AgentHUD.

Task details live in [tasks.json](./tasks.json). This Markdown file is the main spine; the JSON file is the model-readable task ledger.

## Repository Read

The current extension is a VS Code workspace extension with three main layers:

- `package.json` contributes the VS Code commands, left sidebar view, bottom panel view, editor webview panel, configuration, and activation events.
- `src/panel.js` creates a large `CodexAgentPanel` facade. It wires server access, state refresh, Codex links, lifecycle actions, loop actions, team coordination, usage insights, and webview messaging into one object.
- `src/host/*` contains host-side services:
  - `server.js`: HTTP client, service probing, FastAPI launch, dashboard fetch, thread detail fetch.
  - `state-sync.js`: periodic refresh, selected thread detail, Codex tab state broadcast, loop daemon discovery, payload enrichment.
  - `codex-link.js`: opens Codex editor/sidebar via `openai-codex` and `chatgpt` commands and reads VS Code tabs to detect open Codex thread IDs.
  - `lifecycle.js`: archive/delete/rename/new thread plus board, loop, team, and terminal helper actions.
  - `auto-continue.js`: detached `codex exec resume` prompt sending and auto-loop state.
  - `team-coordination.js`, `thread-insight.js`, `usage-ledger.js`: higher-level features to remove from pure AgentHUD.
- `src/webview-template.js` is the main webview shell. It currently renders `Overview`, `Threads`, `Board`, `Team`, `Loop`, `Insights`, and `Live`. The Thread Explorer is already present, but it is entangled with board tabs, loop state, handoff cues, team badges, insight cards, and Codex-only naming.
- `codex_manager/app.py` is a FastAPI service that reads Codex data from local `~/.codex` sources:
  - `state_*.sqlite` for thread rows.
  - `logs_*.sqlite` for recent log/process previews.
  - `sessions/**/rollout-*.jsonl` for missing session import and message history.
  - `session_index.jsonl` for title overrides.
  - `history.jsonl` and local ledgers for usage reports.

The useful AgentHUD kernel is therefore: `package.json` + a smaller panel host + provider data sources + a smaller webview focused on provider tabs and thread detail.

For the pure AgentHUD release, do not keep FastAPI/Python as a runtime dependency. Treat `codex_manager/app.py` as a reference implementation for how Codex data was previously discovered, then reimplement the needed thread indexing in the VS Code extension host using Node APIs. Users should install one VSIX and get a working UI without creating a Python environment, installing packages, or starting a separate service.

## Product Shape

The first screen should be the usable AgentHUD, not a landing page.

Recommended information architecture:

- Top-level provider tabs: `Codex` and `Claude`.
- Each provider tab shows the same Thread page layout:
  - left or top filter/search/sort controls
  - thread list grouped by status/project
  - selected thread detail
  - conversation history
  - recent logs/events when available
  - provider-specific action rail
- Optional sub-tabs inside each provider page:
  - `All`
  - `Running` or `Recent`
  - `Archived` if the provider supports it

This is better than separate pages for `Codex Threads` and `Claude Threads` because the user's mental model is "which agent provider am I inspecting?" first, and "which thread state?" second. Route-level page grouping can still exist internally for deep links, for example `agenthud.provider=codex&thread=<id>`.

## Experience Requirements

The first version must feel fast and calm. Design the runtime around these constraints from day one:

- No Python dependency: all indexing, parsing, caching, and provider actions run inside the VS Code extension host with Node.
- No extra user downloads: dependencies must be bundled in the extension package or avoided.
- No backend server requirement: the webview talks to the extension host through `postMessage`; the host reads local files directly.
- No blank screen failure: provider failures render an isolated empty/error state while the other provider tab still works.
- Fast first paint: show the shell immediately, then hydrate provider summaries from cache, then refresh changed files in the background.
- Fast jumps: selecting a provider, thread, search result, or deep link should update the detail pane without a full dashboard rebuild.
- Stable navigation: provider tab, selected thread, filters, search, sort, scroll position, and detail subtab are persisted separately per provider.
- Large-history safe: lists are paged or virtualized; full transcript text is loaded only for the selected thread.
- Honest capability UI: actions appear only when a provider can really support them.

## Runtime Architecture

Use a single-process VS Code extension architecture:

- `extension host`: owns provider adapters, file indexing, cache reads/writes, provider capability discovery, native-open actions, and error isolation.
- `webview`: owns layout, local interaction state, keyboard shortcuts, fast tab switching, virtualized lists, and rendering.
- `provider adapters`: expose the same list/detail/search contract for Codex and Claude.
- `storage layer`: persists UI state in VS Code mementos and provider indexes under the extension `globalStorageUri`.

Avoid an HTTP service for the pure version. It adds port discovery, startup races, Python packaging problems, and another failure mode between the user and the Thread page.

## Navigation Model

The UI should support quick movement without feeling like a dashboard maze:

- Provider tabs at the top: `Codex`, `Claude`.
- Thread list and detail are visible together on desktop.
- On narrow panels, selecting a thread pushes into detail with a clear back action.
- `Ctrl/Cmd+K` opens a provider-aware quick switcher over cached thread titles and IDs.
- `j/k` or arrow keys move through visible threads; `Enter` opens detail.
- Deep links are represented as serializable state: `provider`, `threadId`, optional `query`, optional `detailTab`.
- Search is local over cached summaries first; background refresh refines results without resetting selection.

## Storage Format

Use JSON, not sqlite, for AgentHUD-owned state:

- `globalStorageUri/agenthud/state.json`: UI preferences, selected provider, selected thread IDs, filter/sort/search state, schema version.
- `globalStorageUri/agenthud/index/codex-summaries.json`: Codex cached thread summaries.
- `globalStorageUri/agenthud/index/claude-summaries.json`: Claude cached thread summaries.
- `globalStorageUri/agenthud/index/source-manifest.json`: source path, provider, file size, mtime, parse status, last error, and cache key.
- Optional detail cache files per provider/thread only after the summary flow is stable.

Keep source transcripts as the source of truth. Cache files are rebuildable and should include `schema_version` so future migrations are explicit.

Codex should initially index local rollout/session files directly instead of relying on the legacy sqlite path. The sqlite/log DB can be an optional enhancement only if it is implemented without native install steps.

## Keep / Remove

Keep:

- VS Code webview panel/sidebar/bottom surfaces.
- Refresh loop and provider health banner, simplified.
- Thread list fetch.
- Selected thread detail fetch.
- Search, sort, status filters.
- Pinning if it stays local and provider-neutral.
- Conversation history rendering.
- Recent events/previews when the provider can derive them locally.
- Provider-specific "open in native UI" action.

Remove from pure AgentHUD:

- Board canvas and board tab assignments.
- Loop daemon page and auto-loop controls.
- Team control panel, mailbox, handoff, ownership lanes.
- Usage report, insights, word cloud, topic map, vibe advice.
- Memory cards and prompt/rule/memo cards.
- Batch board actions.
- Cross-agent coordination language.

## Provider Model

Introduce a provider-neutral contract before rewriting UI:

```ts
type AgentProviderId = "codex" | "claude";

type AgentThread = {
  provider: AgentProviderId;
  id: string;
  title: string;
  cwd?: string;
  status: "running" | "recent" | "idle" | "archived" | "unknown";
  createdAt?: string;
  updatedAt?: string;
  model?: string;
  sourcePath?: string;
  messageCount?: number;
  preview?: string;
};

type AgentThreadDetail = {
  thread: AgentThread;
  messages: Array<{
    role: "user" | "assistant" | "tool" | "system";
    text: string;
    timestamp?: string;
    kind?: string;
  }>;
  events?: Array<{
    level?: string;
    text: string;
    timestamp?: string;
  }>;
  capabilities: {
    openNative: boolean;
    rename: boolean;
    archive: boolean;
    sendPrompt: boolean;
    liveLogs: boolean;
  };
};
```

Codex and Claude should both use local Node indexers behind this contract. Codex can reuse knowledge from the existing sqlite/log/rollout implementation, but the pure runtime should prefer direct transcript/session files so the extension does not depend on Python, FastAPI, ports, or native sqlite installation.

## Claude Page Difficulty

Claude is not just "copy the Codex page and change colors."

The hard parts:

- Source discovery: Codex has legacy sqlite indexes and rollout/session files in `~/.codex`; Claude local history appears under `~/.claude/projects/<encoded-project>/<session>.jsonl`, with optional nested `subagents/` files. The pure version should parse local files directly instead of depending on a service.
- Schema normalization: Claude JSONL records include `permission-mode`, `file-history-snapshot`, `last-prompt`, `system`, `user`, `assistant`, tool calls, tool results, meta messages, sidechains, and content as either strings or arrays. The UI needs clean messages, not raw events.
- Project identity: Claude stores project folders as path-like encoded directory names. The indexer must recover a display project label and preferably the original `cwd` from records.
- Running detection: Codex can use log process UUID and sqlite logs. Claude may need mtime, session env files, todo files, lock/process hints, or native CLI/plugin state if available. Treat "running" as best-effort until proven.
- Native open action: Codex has `openai-codex://route/local/<threadId>` and `chatgpt.openSidebar`. Claude does not have a confirmed public VS Code command/URI here. Phase 1 should expose "open transcript/source file" and only add native open after command discovery.
- Privacy/noise filtering: Claude transcripts can contain command caveats, tool outputs, file snapshots, plugin routing prompts, and subagent internals. The Thread page must hide or collapse these by default.
- Performance: Claude may have hundreds or thousands of JSONL files. Full rescans on every 4-second refresh would be too expensive. Use an index cache keyed by file path, size, and mtime.
- Version drift: Claude Code transcript schemas can change. The parser must be tolerant and test against fixture variants.

## Tab Strategy

Use provider tabs visually:

- `Codex` tab: selected provider is `codex`; thread list comes from Codex source.
- `Claude` tab: selected provider is `claude`; thread list comes from Claude source.

Use page grouping internally:

- `ThreadPage(providerId)` is one reusable UI component.
- Provider-specific actions are injected through capabilities.
- Provider-specific status labels are normalized before reaching the component.

This gives the cleanest UI while keeping the code testable. It also leaves room for future providers without reintroducing team/board complexity.

## More Optimization Directions

These directions are worth considering while the plan is still cheap to change:

- Search quality: support title, ID, project path, first user prompt, latest assistant summary, and model filters. Keep the first version local and deterministic; fuzzy search can be added without model calls.
- Thread previews: cache one short preview per thread so the list is useful before detail loads. Preview should come from first meaningful user message plus latest meaningful assistant message.
- Detail tabs: split selected detail into `Conversation`, `Events`, `Source`, and `Metadata` instead of one long drawer. This keeps Claude tool noise and source-path debugging available without crowding the main chat view.
- Source reveal: every parsed thread should expose "open source transcript" or "reveal source folder" for debugging. This is especially important before Claude native open is proven.
- Privacy mode: add a local toggle that hides full prompts in list previews and only reveals content inside selected detail. This matters because AgentHUD reads local agent transcripts.
- Rebuild index command: make cache corruption boring. A command should delete/rebuild AgentHUD-owned indexes without touching original Codex or Claude files.
- Provider health panel: keep it tiny but clear: source folder found/missing, indexed count, skipped count, stale cache age, last scan error.
- Import/export settings: export UI preferences and provider index metadata, not transcript contents. This helps reproduce bugs without leaking conversations.
- Testing fixtures: commit sanitized Codex and Claude transcript fixtures early. Parser stability is the product foundation.
- Accessibility and keyboard flow: provider tabs, quick switcher, list navigation, and detail tabs should work without mouse.
- Multi-root awareness: group by workspace/project path, because both Codex and Claude histories may include many unrelated projects.
- Source schema watch: record parser version and source format hints so future schema drift can be diagnosed from the UI.

## Real Data Roots

Use real local provider data during development and QA, not fixtures only:

- Codex root: `/home/clashuser/.codex`
- Claude root: `/home/clashuser/.claude`

Rules:

- Keep fixture tests for deterministic parser/unit checks.
- Run UI and integration validation against real roots before marking M4+ tasks complete.
- Real-data scans must remain local-only, no remote upload, and no transcript export by default.

## UI Design Sprint Criteria

When executing M4-M6 tasks, treat visual quality as a first-class acceptance gate.

Required UI outcomes:

- A defined visual system: typography scale, spacing scale, color tokens, border/radius tokens, and state colors.
- Information-dense but readable thread list and detail layout suitable for long agent histories.
- Clear card language for thread rows, selected detail sections, event rows, and provider health surfaces.
- Motion language with restrained transitions for provider switch, list-to-detail navigation, and tab changes.
- Consistent empty/loading/error states that preserve context and avoid full-page flicker.

Do not mark UI tasks complete if functionality works but the visual system, density, interaction rhythm, and card hierarchy remain placeholder quality.

## Why Markdown Plus JSON

JSON is better for a large model when the task list must be parsed, filtered, resumed, or updated mechanically. It has stable IDs, dependencies, statuses, and acceptance criteria.

Markdown is better for the long-lived reasoning spine: product intent, architectural judgment, tradeoffs, and "why we are not doing X." A pure JSON roadmap tends to lose nuance and becomes painful for humans to review.

Use both:

- `roadmap.md`: narrative, decisions, constraints, phase order.
- `tasks.json`: structured task graph that future agents can consume directly.

## Orchestration Governance

Thread roles are fixed:

- Scheduler thread: `019da175-eb9b-7ac2-a7b4-1f614f459688`
- Implementation thread: `019da180-b86f-7cf2-9e6d-929d6656231e`
- Checker thread: `019da180-e9d0-7ee1-8d78-e4608f939741`

Loop contract:

1. Scheduler writes one `dispatch_contract` for exactly one bounded task.
2. Implementation handles only `mode=optimize` and writes one `implementation_report`.
3. Checker handles only `mode=check` and writes one `check_report` with a strict verdict: `pass`, `revise`, or `block`.
4. Scheduler may dispatch `optimize` only when a valid `check_report.verdict == "pass"` exists for the same `task_id`.
5. If `check_report` is missing, stale, `revise`, or `block`, scheduler must run `check` and must not run `optimize`.

State files:

- `.codex-loop/state/dispatch_contract.json`
- `.codex-loop/state/implementation_report.json`
- `.codex-loop/state/check_report.json`
- `.codex-loop/state/last_dispatch.json`

Required safety rules:

- One tick, one delegated action.
- One delegated action, one task id.
- Check thread must not edit product/source implementation files.
- Implementation thread must not bypass acceptance criteria or validation evidence.
- Scheduler must stop when all tasks are completed or blocked with documented recovery.

## Milestones

### M0: Extraction Decision

Goal: decide whether AgentHUD is a new extension package or a branch/fork inside this repo, and lock the no-Python runtime architecture.

Recommendation: start as a new extension package or a clearly isolated `agenthud` subtree. The current webview and host facade are too feature-heavy to trim safely in place.

Exit criteria:

- New extension identity chosen.
- Existing modified files are left untouched unless explicitly migrated.
- Minimal package contribution list defined.
- Runtime has no Python, FastAPI, external server, or post-install download requirement.

### M1: Pure Codex Thread Page

Goal: reproduce only the Codex Thread page from the current product.

Keep Codex behavior that already works:

- thread list from a Node local indexer
- selected detail
- history
- recent events/previews when available from local files
- open Codex editor/sidebar
- rename/archive/delete only if the UX remains simple

Remove all board/loop/team/insight affordances from this page.

Exit criteria:

- The app opens directly to the Codex Thread page.
- No board, team, loop, or insight elements render.
- Codex thread detail works end to end.

### M2: Provider Contract

Goal: make the Thread page provider-neutral before Claude UI lands.

Exit criteria:

- Thread UI reads `AgentThread` and `AgentThreadDetail`, not raw Codex payloads.
- Provider capability flags control actions.
- Codex uses an adapter and still behaves the same.

### M3: Claude Local Indexer

Goal: read Claude transcripts into the provider contract.

Minimum viable Claude data:

- session ID
- title inferred from first meaningful user message or summary
- cwd/project label
- updated timestamp
- model/version when available
- normalized message history
- source JSONL path

Exit criteria:

- Claude threads appear in the Claude provider tab.
- Selecting a Claude thread shows readable conversation history.
- Parser ignores obvious metadata and command wrapper noise by default.

### M4: Unified Provider Tabs

Goal: make Codex and Claude feel like two tabs of the same AgentHUD.

Exit criteria:

- `Codex` and `Claude` tabs share layout, search, filters, and detail view.
- Provider-specific actions do not leak into the wrong tab.
- State persistence remembers selected provider and selected thread per provider.

### M5: Hardening

Goal: make the product dependable on large local histories.

Exit criteria:

- Indexed reads are incremental.
- First paint uses cached state before background refresh.
- Parser fixtures cover Codex rollout and Claude JSONL variants.
- Webview has no stale board/loop/team references.
- Refresh does not stall on large Claude directories.

### M6: Polish and Extensibility

Goal: make the minimal product feel intentional and future-proof without expanding into team/board mode.

Exit criteria:

- Quick switcher and keyboard navigation are pleasant enough for daily use.
- Provider health and source reveal make indexing issues explainable.
- Privacy mode exists for list previews.
- Parser/source fixtures cover common drift cases.
- Future providers can plug into the same provider contract without changing ThreadPage.

## Open Decisions

- Whether any optional sqlite/log enhancement is worth bundling later. The first pure version should not require Python, native sqlite, or a server.
- Whether destructive lifecycle actions belong in pure AgentHUD. Recommendation: keep archive/rename for Codex only at first, avoid delete in the first clean release.
- Whether Claude native open can be supported. Treat this as optional until a stable command/URI is discovered.
- Whether subagent JSONL files should appear as separate Claude threads or nested child runs. Recommendation: hide them in M3, then expose as child runs later only if useful.
- Whether privacy mode should be default-on for list previews. Recommendation: default off for local-only MVP, but make it one click and persist the choice.
- Whether search should be pure in-memory fuzzy search or backed by a persisted mini-index. Recommendation: start in-memory over summaries; add a persisted search index only if large-history tests require it.

## Non-Goals

- No shared team workspace.
- No board.
- No loop board.
- No mailbox.
- No provider orchestration.
- No attempt to control unofficial provider internals.
- No new landing page before the actual Thread page.
- No Python service.
- No user-managed dependency installation.
- No required local HTTP port.

## Next Slice

Start with `AGHUD-001` through `AGHUD-006`, plus `AGHUD-023` and `AGHUD-024`, from [tasks.json](./tasks.json). That gives a small but real pure Codex AgentHUD with the correct no-Python runtime before Claude risk enters the system.
