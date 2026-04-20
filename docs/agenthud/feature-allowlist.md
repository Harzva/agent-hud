# AgentHUD Pure Feature Allowlist

Status: accepted for the pure-thread build.

## Purpose

This document is the product guardrail for AgentHUD implementation. If a command,
view, message type, storage key, UI element, or provider capability is not listed
as allowed here, it must not be added to the pure package without updating this
document and `tasks.json`.

The package boundary is defined in `docs/agenthud/package-boundary.md`.

## In Scope

AgentHUD is a provider-tabbed Thread page. The allowed product surface is:

- provider tabs for `Codex` and `Claude`
- provider-neutral thread list
- thread search over cached summaries
- status/project/model filters
- stable sort controls
- selected thread detail
- normalized conversation history
- recent provider events or log previews when locally derivable
- provider health banner scoped to the active provider
- source transcript reveal/open-folder action
- provider-specific native-open action when the provider capability is proven
- quick switch over cached provider/thread summaries
- local UI state persistence for provider, selected thread, filters, sort, query,
  scroll position, and detail tab
- rebuild-index command for AgentHUD-owned cache files

The first screen must be the usable Thread page. It must not be a landing page,
overview dashboard, coordination board, or analytics dashboard.

## Required Thread Page Controls

Every provider Thread page should converge on the same control set:

- provider tab selector
- search input
- status filter
- project/workspace filter when available
- sort selector for updated time, created time, title, and status
- thread list with title, provider, status, project/cwd, updated time, and
  short preview
- detail pane with conversation, events, source, and metadata sections once
  detail tabs are implemented
- refresh action scoped to the selected provider
- source reveal action for the selected thread

Provider-specific labels may differ, but the shared Thread page must consume
normalized provider data rather than Codex-only or Claude-only raw fields.

## Allowed Host Messages

The webview-to-extension-host protocol may include only Thread-page operations:

- `ready`
- `selectProvider`
- `listThreads`
- `selectThread`
- `getThreadDetail`
- `refreshProvider`
- `searchThreads`
- `quickSwitch`
- `openNative`
- `revealSource`
- `copyThreadId`
- `renameThread`
- `archiveThread`
- `restoreThread`
- `saveUiState`
- `loadUiState`
- `rebuildIndex`

Messages must be request/response shaped with provider-scoped errors. A failure
in one provider must not blank the other provider tab.

## Capability Gates

Provider capabilities are the only way to expose optional actions. The UI must
hide or disable unsupported actions from the provider contract instead of showing
optimistic controls.

Minimum capability flags:

- `openNative`
- `revealSource`
- `rename`
- `archive`
- `restore`
- `sendPrompt`
- `liveLogs`
- `rebuildIndex`

Destructive or mutating actions are separately gated:

- `renameThread` requires `rename: true`
- `archiveThread` requires `archive: true`
- `restoreThread` requires `restore: true`
- future delete-like actions require a new explicit capability and confirmation

The pure package must not infer destructive support from provider identity.

## Performance And Failure Requirements

The following behavior is in scope from the first scaffold:

- fast first paint: render the shell before fresh scans complete
- cache-first list hydration: use schema-versioned JSON summaries when present
- background refresh: update changed source files without resetting selection
- fast jumps: provider switches, search results, and selected thread changes must
  update detail without rebuilding the full dashboard
- isolated provider failures: missing, malformed, or unreadable provider sources
  render a provider-local empty/error state
- large-history safety: full transcript text loads only for the selected thread

## Out Of Scope

The following feature families are explicitly forbidden in the pure package:

- board canvas
- board tab assignments
- loop board
- loop daemon page
- auto-loop controls
- team space
- team control panel
- mailbox
- ownership lanes
- handoff workflows
- cross-agent coordination workflows
- usage reports
- token analytics dashboards
- insights dashboard
- topic maps
- word clouds
- vibe advice
- memory card dashboard
- prompt/rule/memo card dashboard
- batch board actions
- service start/probe UI

These names should not appear in contributed commands, activation events, visible
navigation, webview tabs, provider contracts, storage keys, or host message
handlers for AgentHUD.

## Explicitly Not Runtime Features

AgentHUD may read source transcripts and AgentHUD-owned JSON cache files. It must
not require or expose product flows for:

- starting a Python service
- probing a FastAPI endpoint
- selecting an HTTP port
- installing native sqlite modules
- running post-install downloads
- asking the user to install dependencies after VSIX installation

## Acceptance Checklist For Future Tasks

Before adding a command, message, view, storage key, or provider action, check:

- Does it serve provider tabs, thread list, thread detail, history, search,
  filters, source reveal, native open, cache rebuild, or local UI persistence?
- Is the action supported by an explicit provider capability?
- Can the UI render from cache before a fresh scan completes?
- Does a failure stay scoped to one provider?
- Does the change avoid all out-of-scope dashboard, coordination, and analytics
  feature families?

If any answer is no, the feature is outside the current AgentHUD pure-thread
scope.
