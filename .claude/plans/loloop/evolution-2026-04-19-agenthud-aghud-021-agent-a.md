# AGHUD-021 (Agent-A): Smoke test coverage — provider switch, empty state, fault tolerance

## Goal

Extend Node smoke tests without changing product behavior: cover provider switching, empty UI states, and tolerant handling of bad/missing inputs and session data.

## What shipped

- **`thread-page.test.js`**: `normalizeProvider` / `createThreadPageState` defaults; empty list and loading copy; list/detail errors; per-provider state when `provider` switches; filters/sorts; null-ish state passed through `renderThreadPage`; synthetic detail with messages. Separate `testErrorBoundaryRendering()` asserts list and detail error strings appear in HTML.
- **`message-protocol.test.js`**: Happy paths for webview message types (including `selectProvider`, navigation, `openNative`, rename/archive, `dismissProviderError`, `retryProvider`, UI state, `quickSwitch`); invalid/null/unknown types ignored; defaults for query/filter/sort/tabs/panes; loop over `WEBVIEW_MESSAGE_TYPES`.
- **`provider-contract.test.js`**: Normalizers with invalid inputs and custom fallbacks; `isAgentThread` / `isAgentMessage` / `isAgentEvent` / `isAgentThreadDetail` edge cases; both provider IDs listed.
- **`codex.test.js`**: Empty/missing session dirs; malformed and unreadable rollout files; meta-only session; `createCodexProvider` + limits; **`futureNow`** so fixture threads are outside the 14-day window and assert `status === "idle"` (avoids brittle 2020 vs 2026 “recent” mismatch). Removed accidental “drift” assertions that assumed non-existent parser fields/fixtures.
- **`claude.test.js`**: Discovery on fixtures; missing roots; `parseClaudeSession` on mixed-error and empty JSONL; `listClaudeThreads` / `getClaudeThreadDetail` bounds; utility edge cases. Removed drift-only block that did not match `claude.js` output.
- **`claude-parser.test.js`**: Rich + variants fixtures unchanged in spirit; added coverage for error-tolerant and empty JSONL fixtures under `test/fixtures/claude/projects/`.
- **Fixtures**: Codex meta-only rollout, malformed line-only file; Claude `session-error.jsonl` (bad line + valid lines), `session-empty.jsonl` (blank file).

## Verification

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud
node src/host/thread-page.test.js
node src/host/message-protocol.test.js
node src/host/provider-contract.test.js
node src/host/providers/codex.test.js
node src/host/providers/claude.test.js
node src/host/providers/claude-parser.test.js
```

All six exited 0 on 2026-04-19.

## Plan alignment (ledger)

- `tasks.json`: **AGHUD-021** set to `completed` with `evidence[]` matching the smoke scripts and `assertPureThreadPageShell` (provider-only tabs, no board/team/loop/insight tab markers).

## Risks / follow-ups

- Smoke tests depend on fixture layout and filenames; if Codex/Claude export formats change, update fixtures and assertions rather than loosening checks blindly.
- `message-protocol` tests assume `message-protocol.js` includes `dismissProviderError` and `retryProvider`; if those are reverted upstream, sync tests or restore types.
