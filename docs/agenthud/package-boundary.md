# AgentHUD Package Boundary

Status: accepted for the pure-thread build.

## Decision

AgentHUD is an isolated VS Code extension package rooted at:

```text
/home/clashuser/hzh/work_bo/agent_ui/agent_hud
```

This directory is the only writable product boundary for AgentHUD-owned code, docs,
plans, tests, cache schemas, fixtures, and generated artifacts. The recovered
Codex-Managed-Agent extension remains read-only reference material at:

```text
/home/clashuser/hzh/work_bo/codex_manager/vscode-extension/recovered/codex-managed-agent-0.0.71/extension
```

AgentHUD should be scaffolded and packaged as its own extension identity rather
than as an in-place edit of the recovered extension. Later implementation may
copy small, reviewed ideas from the reference source, but copied code must land
under this workspace and be stripped to the pure Thread-page scope before use.

## Package Identity

Initial extension identity:

- publisher: `agenthud`
- name: `agenthud`
- display name: `AgentHUD`
- product surface: VS Code extension host plus webview UI
- first contributed command: open AgentHUD Thread page

The package must be installable as a single VSIX. Installing it must not require
the original Codex-Managed-Agent extension to be modified, rebuilt, or present.

## Runtime Boundary

AgentHUD runtime is limited to:

- VS Code extension host code running on Node APIs
- webview UI receiving and sending messages through VS Code `postMessage`
- local Node file indexers for provider transcript discovery and parsing
- VS Code memento/global storage plus rebuildable JSON cache files

The runtime must not require:

- Python
- FastAPI
- local HTTP ports
- native sqlite dependencies
- post-install downloads
- user-managed dependency installation
- any background service outside the VS Code extension host

This preserves a zero-service runtime: opening the webview should create the UI
shell immediately, hydrate from JSON cache when present, then refresh local file
indexes in the extension host.

## Feature Boundary

AgentHUD keeps only the Thread-page product:

- Codex provider tab
- Claude provider tab
- provider-neutral thread list
- search, filters, and sort controls
- selected thread detail
- conversation history
- recent events/log previews when locally derivable
- provider-specific open/reveal actions gated by capabilities

AgentHUD omits the original product families that depend on cross-agent
orchestration or dashboard behavior:

- board and loop board
- team space
- mailbox
- coordination lanes and handoff workflows
- usage insights
- vibe dashboards
- memory/prompt/rule card dashboards
- service start/probe workflows

The boundary intentionally makes these families absent rather than feature
flagged. They should not appear in commands, activation events, webview tabs,
message types, storage state, or provider contracts for the pure package.

## Source And Cache Ownership

Provider source transcripts remain the source of truth. AgentHUD may read local
provider files such as Codex sessions and Claude project JSONL transcripts, but
it does not own or mutate those provider sources.

AgentHUD-owned cache/index state must live under VS Code global storage using
JSON files with explicit schema versions. Cache files are rebuildable and may be
deleted without data loss.

Planned cache families:

- `agenthud/state.json`
- `agenthud/index/codex-summaries.json`
- `agenthud/index/claude-summaries.json`
- `agenthud/index/source-manifest.json`

## Compatibility Rule

This package boundary avoids editing the recovered extension, so the current
Codex-Managed-Agent feature surface is not changed by AgentHUD work. Any later
reference-source migration must be an additive copy into this workspace, followed
by removal of out-of-scope feature hooks before it is wired into AgentHUD.

## Consequences

This decision unlocks the next tasks:

- pure feature allowlist can be written against a fixed package boundary
- minimal VS Code contribution set can be scaffolded without service commands
- zero-service runtime architecture can be hardened independently
- provider contracts and Node indexers can be implemented without FastAPI
