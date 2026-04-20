# AgentHUD JSON Storage

Date: 2026-04-19

AgentHUD-owned files under VS Code `globalStorageUri` use small schema-versioned JSON payloads. Source transcripts remain the source of truth; these files are rebuildable support state.

## Layout

- `agenthud/index/codex-summaries.json`: cached Codex thread summaries.
- `agenthud/index/claude-summaries.json`: cached Claude thread summaries.
- `agenthud/index/source-manifest.json`: future source parse manifest.
- `agenthud/state.json`: reserved for a future file-backed UI-state migration.

`AGHUD-010` UI preferences continue to use VS Code `globalState` at `agenthud.uiState`. The reserved `state.json` path is documented for a future compatibility migration only; this slice does not move existing UI persistence.

## Rules

- Every file has `schema_version`.
- Summary caches use `generated_at`.
- UI state and manifests use `updated_at`.
- Reads of missing, corrupt, unsupported, or invalid JSON return `null` so callers can rebuild or fall back.
- Writes use a temporary file in the destination directory followed by rename.
- Source manifest entries are keyed by `provider`, `path`, `size`, and `mtimeMs`, with optional `cacheKey`, `parseStatus`, and `lastError`.

