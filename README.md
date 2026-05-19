# AgentHUD 🛰️

**AgentHUD** is a preview VS Code extension for browsing local agent threads from **Codex** and **Claude** in one place.

## Why AgentHUD

AgentHUD focuses on a simple workflow: open VS Code, inspect your local agent history, jump between providers quickly, and drill into a thread without starting any extra service.

### Highlights

- **Local-first runtime**: reads local transcript sources directly from the extension host.
- **Zero-service architecture**: no Python daemon, backend server, or extra post-install setup.
- **Unified thread view**: switch between Codex and Claude from the same UI surface.
- **Cache-first experience**: hydrate cached summaries quickly, then refresh in the background.
- **Developer-friendly controls**: commands and settings for provider selection, refresh, quick switch, and scan limits.

## Supported Providers

- **Codex**: scans local session and rollout data.
- **Claude**: indexes local `~/.claude/projects` transcripts.

> The repository also contains Gemini-related workflow assets and skills, but the current extension runtime is centered on Codex and Claude.

## Quick Start

### Run the extension locally

```bash
npm install
```

Then open this repository in VS Code and press `F5` to launch an Extension Development Host.

### Open AgentHUD

Use the Command Palette and run one of the built-in commands:

- `AgentHUD: Open`
- `AgentHUD: Refresh`
- `AgentHUD: Reveal Provider`
- `AgentHUD: Quick Switch`

## Configuration

AgentHUD currently exposes a small set of workspace settings:

- `agenthud.defaultProvider`: choose the provider selected on open.
- `agenthud.defaultSurface`: open in the editor, sidebar, or panel.
- `agenthud.codexListParseConcurrency`: tune Codex parsing parallelism.
- `agenthud.codexListScanMaxRollouts`: cap Codex list refresh scan size.
- `agenthud.claudeListScanMaxSources`: cap Claude indexing work per refresh.
- `agenthud.summaryCacheMaxSummaries`: limit summary cache writes.
- `agenthud.codexDetailMaxRolloutAttempts`: limit Codex detail fallback scans.

## Development

Run the existing repository checks:

```bash
npm test
npm run verify
```

## Documentation

- [Product roadmap](./roadmap.md)
- [Zero-service runtime architecture](./docs/agenthud/zero-service-runtime.md)
- [Provider extension guide](./docs/agenthud/provider-extension-guide.md)
- [Feature allowlist](./docs/agenthud/feature-allowlist.md)
- [Gemini loop skill](./gemini-loop-skill/README.md)

---
Built with VS Code extension APIs and local-first provider adapters.
