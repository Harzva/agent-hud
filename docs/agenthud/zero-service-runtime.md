# AgentHUD Zero-Service Runtime Architecture

Status: accepted for the pure-thread build.

## Decision

AgentHUD is a single-process VS Code extension runtime. The extension host owns
provider discovery, source indexing, cache reads/writes, thread list/detail
functions, provider capability checks, and native/source open actions. The
webview owns layout and interaction state, and it talks to the host only through
VS Code `postMessage`.

There is no required runtime backend between the webview and local provider
sources.

## Explicit Exclusions

AgentHUD runtime must not include:

- Python startup
- FastAPI startup
- local HTTP port selection
- localhost probing
- HTTP dashboard/list/detail fetches
- native sqlite install requirements
- post-install runtime downloads
- user-managed dependency installation
- a daemon, sidecar, or service that must be running before the webview works

Recovered source areas such as `ensureServer`, `probeServer`, `startServer`,
`httpGetJson`, `fetchDashboardState`, `fetchThreadDetail`, base URL settings,
and port scan helpers are reference material only. They must be replaced by
extension-host functions in AgentHUD.

## Runtime Components

### Extension Host

Responsibilities:

- register the AgentHUD webview surfaces and commands
- load UI state from VS Code memento/global storage
- read schema-versioned AgentHUD JSON caches under `globalStorageUri`
- discover provider source folders
- index provider source transcripts with local Node file APIs
- normalize provider records into the provider contract
- serve list/detail/search requests through in-process functions
- isolate provider scan, parse, cache, and native-open errors
- write rebuildable cache/index JSON
- perform provider-specific source reveal or native-open actions when capability
  flags allow them

The extension host must expose functions shaped like:

```ts
type ProviderRuntime = {
  listThreads(input: ListThreadsInput): Promise<ListThreadsResult>;
  getThreadDetail(input: ThreadDetailInput): Promise<ThreadDetailResult>;
  refresh(input: RefreshProviderInput): Promise<RefreshProviderResult>;
  search(input: SearchThreadsInput): Promise<ListThreadsResult>;
  revealSource(input: ThreadActionInput): Promise<ActionResult>;
  openNative(input: ThreadActionInput): Promise<ActionResult>;
};
```

These are direct JavaScript function calls in the extension host. They are not
HTTP calls and do not require a server URL.

### Webview

Responsibilities:

- render the Thread page shell immediately
- switch provider tabs without reloading the whole webview
- show cached provider summaries as soon as the host returns them
- request fresh provider refreshes in the background
- keep provider-local UI state such as selected thread, query, filters, sort,
  scroll position, and detail tab
- render provider-scoped empty/error states
- hide unsupported provider actions from capability flags

The webview sends only allowlisted messages such as `ready`, `selectProvider`,
`listThreads`, `getThreadDetail`, `refreshProvider`, `searchThreads`,
`quickSwitch`, `revealSource`, `openNative`, `saveUiState`, and `rebuildIndex`.

### Provider Adapters

Provider adapters are local Node modules behind the same contract.

Codex adapter:

- source discovery starts with local Codex session/rollout transcript files
- optional sqlite/log enrichment is allowed only if it needs no native install
  and does not become required for list/detail behavior
- Codex native open may use known VS Code commands/URI behavior only behind the
  `openNative` capability

Claude adapter:

- source discovery starts with `~/.claude/projects`
- missing source folders are normal and produce an empty provider state
- subagent files can be detected but excluded from the main list by default
- native open is not assumed; source reveal is the first safe action

## Request Flow

Initial load:

1. Webview posts `ready`.
2. Host loads UI state and cached summaries from JSON.
3. Host replies with shell state, provider health, and cached list summaries.
4. Webview renders provider tabs, list, and empty/detail placeholder.
5. Host starts a background refresh for the selected provider.
6. Host posts provider-scoped list patches or refresh results.

Thread selection:

1. Webview posts `getThreadDetail` with provider and thread ID.
2. Host asks that provider adapter to parse/load only the selected transcript.
3. Host returns normalized messages, events, metadata, source path, and
   capabilities.
4. Webview updates the detail pane without rebuilding unrelated panes.

Refresh:

1. Webview posts `refreshProvider`.
2. Host reads source manifests and reparses only changed files where possible.
3. Host writes updated JSON cache files with schema versions.
4. Host returns a provider-scoped result with counts, skipped files, and errors.

## Missing Source Folder Behavior

Missing provider folders are expected states, not fatal errors.

Codex missing:

- provider tab remains visible
- list renders an empty state: source folder not found
- health shows source path checked, indexed count `0`, skipped count `0`, and no
  cache age unless stale cache exists
- actions shown: refresh, reveal configured source parent when available,
  rebuild index if cache exists

Claude missing:

- provider tab remains visible
- list renders an empty state: `~/.claude/projects` not found
- Codex tab remains usable
- no native-open action is shown

Malformed or unreadable files:

- affected file is recorded in `source-manifest.json` with parse status and last
  error
- valid cached rows remain visible with a stale/error indicator
- selected detail failure renders only the detail pane error, not a blank page

## Cache And Storage

AgentHUD-owned storage lives under VS Code `globalStorageUri`:

- `agenthud/state.json`: UI state, schema version, selected provider, selected
  thread per provider, filters, sort, query, scroll/detail state
- `agenthud/index/codex-summaries.json`: rebuildable Codex summaries
- `agenthud/index/claude-summaries.json`: rebuildable Claude summaries
- `agenthud/index/source-manifest.json`: provider, path, size, mtime, parse
  status, last error, cache key, parser version

Source transcripts remain the source of truth. Cache deletion or corruption must
not delete user/provider data; it should trigger a rebuild or a provider-local
error state.

## Optional Backend Rule

A future backend may be added only as an optional enhancement after the pure
extension-host path works. It must satisfy all of these conditions:

- the extension-host provider functions remain the default runtime path
- opening AgentHUD does not require the backend
- provider list/detail/search still work without a server URL
- packaging still produces a usable single VSIX
- missing backend state is indistinguishable from the backend not being
  installed

Any future backend support must be capability-gated and documented as optional.

## Implementation Implications

- Do not add `startServer`, `restartServer`, base URL, port, Python path, or
  server root settings to the AgentHUD package.
- Do not contribute commands that mention server startup or service probing.
- Do not import recovered `server.js` as a runtime module.
- Do not couple refresh state to a dashboard payload.
- Do make provider failures local to `providerId`.
- Do make list/detail calls pure extension-host operations.
- Do keep cache files JSON, schema-versioned, and rebuildable.
