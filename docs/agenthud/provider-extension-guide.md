# AgentHUD Provider Extension Guide

This guide documents how to add a new agent thread provider to AgentHUD.

## Architecture

AgentHUD uses a provider-neutral architecture where the UI (`thread-page.js`) and host logic (`panel-view.js`) consume a common contract defined in `src/host/provider-contract.js`.

To add a new provider, you must implement the `AgentProvider` interface.

## The AgentProvider Interface

A provider must be an object with the following methods:

### `id: string`
The unique identifier for the provider (e.g., `"codex"`, `"claude"`, `"gemini"`).

### `capabilities: AgentCapabilities`
An object defining what the provider supports:
- `openNative: boolean` (Can reveal the source transcript in VS Code/OS)
- `rename: boolean` (Can rename threads)
- `archive: boolean` (Can archive threads)
- `sendPrompt: boolean` (Can send new messages to the thread)
- `liveLogs: boolean` (Can stream live tool logs)

### `listThreads(options): Promise<ListThreadsResult>`
Scans for available threads and returns a list of summary rows.
- `options.limit`: Max threads to return.
- `options.maxSourcesScan`: Max files/sources to parse.

Returns:
- `threads: AgentThread[]`
- `meta: object` (Provider-specific diagnostic metadata)

### `getThreadDetail(threadId, options): Promise<ThreadDetailResult>`
Loads full transcript and metadata for a specific thread.
- `threadId`: The unique ID of the thread.

Returns:
- `thread: AgentThread`
- `messages: AgentMessage[]`
- `events?: AgentEvent[]`
- `capabilities: AgentCapabilities`
- `meta: object`

## Implementation Steps

1.  **Define a new provider module:** Create `src/host/providers/my-provider.js`.
2.  **Implement the interface:** Export a factory function `createMyProvider()`.
3.  **Register the provider:**
    - Add the new provider ID to `PROVIDER_IDS` in `src/host/provider-contract.js`.
    - Import and instantiate the provider in `AgentHudRuntime` constructor in `src/host/panel-view.js`.
    - Update `ensureProviderList`, `refresh`, `selectThread`, `retryProvider`, etc. in `panel-view.js` to route to the new provider.
4.  **Update UI (optional):**
    - Add a new tab button in `renderProviderButton` in `src/host/thread-page.js`.
    - Add CSS styles if specific branding is needed.
5.  **Add Configuration:** Add provider-specific settings to `package.json` under `agenthud` configuration.

## Best Practices

- **Local First:** Providers should scan local file systems or caches. Avoid heavy network calls during list refresh.
- **Tolerant Parsing:** Use `readVersionedJson` and handle corrupt files gracefully (return `null` or partial data instead of crashing).
- **Timeout Budget:** Use `withTimeout` for all provider operations to prevent the UI from hanging on slow I/O.
- **Normalized Status:** Map internal provider states to the standard `AgentThreadStatus` values: `running`, `recent`, `idle`, `archived`, `unknown`.
