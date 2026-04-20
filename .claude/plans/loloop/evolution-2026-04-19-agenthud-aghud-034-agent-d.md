# AGHUD-034 (Agent-D): Detail sub-tabs — minimal slice

## PLAN (3–6 steps)

1. **Single source of truth for tab IDs** — Add `DETAIL_TAB_IDS` (`conversation`, `events`, `source`, `metadata`) and `normalizeDetailTab` in `thread-page.js`; export for `panel-view.js` to reuse (remove duplicate normalizer).
2. **Render** — Extend `renderThreadDetail` with four `data-detail-tab` buttons and four `detail-pane` regions; implement `renderSourcePane` (paths + `meta.errors`) and `renderMetadataPane` (thread fields + selected `meta.*` counters).
3. **Protocol + persistence** — Extend `optionalDetailTab` in `message-protocol.js` and `DETAIL_TABS` in `ui-state.js` so postMessage and saved UI state accept the new tabs.
4. **Host** — `panel-view.js` imports `normalizeDetailTab` from `thread-page`; deep links already pass `detailTab` through `serializeDeepLink` / `applyDeepLink`.
5. **Verify** — Update `thread-page.test.js`, `message-protocol.test.js`, and `ui-state.test.js`; run those scripts with Node.

## Implementation notes

- No provider file changes; no `tasks.json` status edits (per instructions).
- Default tab remains `conversation`; unknown values fall back to `conversation`.

## Validation

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud
node src/host/thread-page.test.js
node src/host/message-protocol.test.js
node src/host/ui-state.test.js
```

All three exited 0 on 2026-04-19.

## Follow-up: display caps (risk mitigation)

- **Source pane**: `meta.errors` limited to the first 20 rows; each JSON line capped at 400 chars; paths capped at 1024 chars; footer text `Showing first N of M issues` when truncated.
- **Metadata pane**: all displayed values passed through `truncateDisplay` at 2000 chars.
- Helpers: `truncateDisplay`, `stringifySourceError` (safe JSON).
- Tests in `thread-page.test.js` cover many-error and long-preview cases.

## Follow-up: deep links (shorter URL, query cap)

- `serializeDeepLink` (panel-view): `query` passed through `truncateDeepLinkQuery` (400 chars); non-default detail tab uses **`dt`** (`e`/`s`/`m`) instead of long `detailTab=…`.
- Webview hash bootstrap: resolves `detailTab` (legacy) or `dt`; `params.has("dt")` triggers apply deep link.
- `expandDeepLinkDetailTab` / `truncateDeepLinkQuery` exported from `thread-page.js` for tests and single source of truth.

## Follow-up: centralized deep link + threadId hygiene

- **`serializeAgentHudDeepLink`** lives in `thread-page.js` (was `serializeDeepLink` in panel-view); `copyDeepLink` uses it — unit-testable without VS Code.
- **`sanitizeDeepLinkThreadId`**: strips C0 controls, DEL, CR/LF; used when building URLs and in **`applyDeepLink`** before `selectThread`.
- Webview hash bootstrap strips `\r`/`\n` from `threadId` before `postMessage` (minimal client-side mirror).

## Follow-up: sanitize all host threadId entry points

- `selectCodexThread` / `selectClaudeThread` use `sanitizeDeepLinkThreadId` (replacing trim-only).
- `copyThreadId`, `copyDeepLink` payload, `openNativeForProvider` sanitize resolved ids.
- `applyDeepLink` relies on the above (no duplicate sanitize call).
