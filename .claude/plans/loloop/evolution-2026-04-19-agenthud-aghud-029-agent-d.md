# AGHUD-029: Provider Error Boundaries

**Agent**: D | **Date**: 2026-04-19 | **Status**: done

## Goal
Implement provider error boundaries (local error isolation + recovery actions) to avoid global crashes.

## Changes Made

### 1. `src/host/message-protocol.js`
- Added `DISMISS_PROVIDER_ERROR` ("dismissProviderError") and `RETRY_PROVIDER` ("retryProvider") to `WEBVIEW_MESSAGE_TYPES`
- Added normalization for both new types:
  - `dismissProviderError` accepts `errorScope` ("list" default or "detail")
  - `retryProvider` accepts `provider` (defaults to "codex")

### 2. `src/host/panel-view.js`
- **`render()` wrapped in try-catch**: If `renderThreadPage()` throws, falls back to `renderErrorFallback()` — a minimal HTML page showing the error with a Retry button. This prevents render errors from crashing the extension host.
- **`dismissProviderError()` method**: Clears `error` or `detailError` on the target provider's state, then re-renders.
- **`retryProvider()` method**: For **list** scope, clears list `error` and re-invokes `loadCodexList({ force: true })` or `loadClaudeList({ force: true })`. For **detail** scope, clears detail error path by calling `selectThread()` again with the current `selectedThreadId` (or `detail.thread.id`).
- **`setProviderError()` enhanced**: Uses `errorScope` and `isDetailOperation` to correctly categorize errors as list-level or detail-level, preventing miscategorization.
- **`setProviderErrorDirect()` standalone function**: A non-method version used as a fallback when `setProviderError()` itself fails (e.g., double render failure).
- **`handleMessage()` error path hardened**: The `.catch` handler now wraps `setProviderError` in its own try-catch, falling back to `setProviderErrorDirect` if it throws.
- **Dispatch cases added**: `DISMISS_PROVIDER_ERROR` and `RETRY_PROVIDER` message types are dispatched in `dispatchMessage()`.

### 3. `src/host/message-protocol.test.js`
- Tests for `dismissProviderError` normalization (default scope, custom scope, no args)
- Tests for `retryProvider` normalization (with provider, without provider)
- Exhaustive loop iterates all `WEBVIEW_MESSAGE_TYPES` values including new ones

### 4. `src/host/thread-page.test.js`
- `testErrorBoundaryRendering()` asserts list/detail error copy, control `id`s (`dismissListError`, `retryListError`, `dismissDetailError`, `retryDetailError`), provider isolation, and dual errors.

### 5. `src/host/thread-page.js` (follow-up: webview UI)
- **List error**: Below the status line, when `providerState.error` is set, renders `error-banner` with **Dismiss** / **Retry** posting `dismissProviderError` + `errorScope: "list"` and `retryProvider` + `errorScope: "list"`.
- **Detail error**: Replaces the plain detail error div with message text plus **Dismiss** / **Retry** posting `dismissProviderError` + `errorScope: "detail"` and `retryProvider` + `errorScope: "detail"`.
- **Script**: Wires `#dismissListError`, `#retryListError`, `#dismissDetailError`, `#retryDetailError` with the same `post()` helper as other controls.

### 6. Protocol follow-up: `retryProvider` + `errorScope`
- `message-protocol.js`: `retryProvider` messages now carry `errorScope` (`list` default, `detail` for thread detail reload) via `optionalErrorScope()`.

### 7. `renderErrorFallback` cleanup
- Removed redundant `onclick` on the fallback button; Retry uses `acquireVsCodeApi().postMessage({ type: "refresh", ... })` like the main webview.

## Files NOT Changed
- `src/host/providers/**` — not touched
- No new npm dependencies

## Validation
- `node src/host/message-protocol.test.js` → pass
- `node src/host/thread-page.test.js` → pass
- VS Code CLI present on dev machine: `code --version` → `3.1.15` (manual E2E: open folder with `code --extensionDevelopmentPath=<repo>` and exercise Threads view; not automated in CI).
- Parallel report: `.codex-loop/state/parallel-reports/AGHUD-029-agent-d.json`

## Risks
- Automated UI/E2E for the webview is not in-repo (no `@vscode/test-electron` harness); regression coverage is Node smoke tests above.
- Detail **Retry** depends on a resolvable `selectedThreadId` / `detail.thread.id`; if both are empty, host clears `detailError` and re-renders only.
