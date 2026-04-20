# AgentHUD Provider Contract

Date: 2026-04-19

This contract is the stable boundary between provider adapters, cache files, and the reusable ThreadPage. Adapters may read provider-specific local files, but the UI receives only the normalized shapes below.

## Goals

- Represent Codex and Claude thread summaries with one row shape.
- Keep provider-specific raw transcript fields inside adapters.
- Make capabilities explicit so unsupported actions are hidden or disabled.
- Support providers that only expose cached summaries and source files, with no native-open action or live log stream.
- Keep cache payloads schema-versioned and rebuildable from source transcripts.

## Provider Identity

```ts
type AgentProviderId = "codex" | "claude";
```

Provider IDs are lowercase stable keys. They are used in UI state, cache file names, request messages, and adapter results.

## Status

```ts
type AgentThreadStatus =
  | "running"
  | "recent"
  | "idle"
  | "archived"
  | "unknown";
```

Status is normalized before it reaches ThreadPage:

- `running`: best-effort active session detection.
- `recent`: recently updated but not confirmed active.
- `idle`: older inactive transcript.
- `archived`: provider can prove the thread is archived.
- `unknown`: source exists, but status cannot be inferred.

Adapters must prefer `unknown` over leaking provider-specific state names.

## Thread Summary

```ts
type AgentThread = {
  provider: AgentProviderId;
  id: string;
  title: string;
  cwd?: string;
  status: AgentThreadStatus;
  createdAt?: string;
  updatedAt?: string;
  model?: string;
  sourcePath?: string;
  messageCount?: number;
  preview?: string;
};
```

`AgentThread` is the only shape the list view should need. `sourcePath` is allowed because source reveal and debugging are provider-neutral. Raw record names, transcript offsets, tool payload objects, and source-specific counters stay in adapter metadata.

## Messages

```ts
type AgentMessageRole = "user" | "assistant" | "tool" | "system";

type AgentMessage = {
  role: AgentMessageRole;
  text: string;
  timestamp?: string;
  kind?: string;
};
```

Messages are normalized for reading. Tool calls and tool outputs may use `role: "tool"` or `kind: "tool"` depending on the source record, but ThreadPage should display them without needing the source schema.

## Events

```ts
type AgentEvent = {
  level?: "info" | "warning" | "error" | string;
  text: string;
  timestamp?: string;
};
```

Events are short previews of non-message activity. Providers without event data return an empty array.

## Capabilities

```ts
type AgentCapabilities = {
  openNative: boolean;
  rename: boolean;
  archive: boolean;
  sendPrompt: boolean;
  liveLogs: boolean;
};
```

Every detail result includes capabilities. Missing capability fields default to `false`.

Capability meaning:

- `openNative`: host can open the thread in a provider-specific UI or source view.
- `rename`: provider supports renaming this thread.
- `archive`: provider supports archiving this thread.
- `sendPrompt`: provider supports appending a prompt from AgentHUD.
- `liveLogs`: provider supports a live event stream.

Providers with no native open or live logs are first-class. The UI must render conversation history and source metadata without assuming either capability.

## Adapter Results

```ts
type ProviderIssue = {
  provider: AgentProviderId;
  path?: string;
  code: string;
  line?: number;
  message: string;
};

type ListThreadsResult = {
  provider: AgentProviderId;
  threads: AgentThread[];
  meta?: {
    sourceDir?: string;
    discovered?: number;
    returned?: number;
    skipped?: number;
    errors?: ProviderIssue[];
    cache?: {
      loaded?: boolean;
      stale?: boolean;
      generatedAt?: string;
      readError?: string;
      writeError?: string;
    };
  };
};

type AgentThreadDetail = {
  provider?: AgentProviderId;
  thread: AgentThread;
  messages: AgentMessage[];
  events?: AgentEvent[];
  capabilities: AgentCapabilities;
  meta?: {
    sourcePath?: string;
    errors?: ProviderIssue[];
    [key: string]: unknown;
  };
};

type ThreadDetailResult = AgentThreadDetail | null;
```

`null` detail means the provider could not find the requested thread. Provider read/parse failures that do not prevent a summary or detail from rendering belong in `meta.errors`.

## Summary Cache Payload

AgentHUD-owned summary caches are rebuildable JSON files under:

- `globalStorageUri/agenthud/index/codex-summaries.json`
- `globalStorageUri/agenthud/index/claude-summaries.json`

```ts
type ProviderSummaryCachePayload = {
  schema_version: number;
  provider: AgentProviderId;
  generated_at: string;
  meta?: Record<string, unknown>;
  summaries: AgentThread[];
};
```

Cache readers must ignore payloads with an unsupported `schema_version`, mismatched provider ID, or invalid summary rows. Source transcripts remain the source of truth.

## Current Codex Mapping

`src/host/providers/codex.js` already returns normalized summaries:

- `provider: "codex"`
- `id` from the rollout/session UUID.
- `title` from the first meaningful user message, source label, or ID.
- `cwd`, `model`, `sourcePath`, `messageCount`, and `preview` from local rollout/session records.
- `status` as `recent` or `idle` for the current direct-file implementation.
- `messages` as `AgentMessage[]`.
- `events` as `AgentEvent[]`.
- `capabilities` with `openNative: true` and unsupported mutating/live actions set to `false`.

ThreadPage should continue to consume these normalized fields. Later refactors may import the runtime helper in `src/host/provider-contract.js`, but this task does not require broad renderer changes.

