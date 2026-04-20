# AgentHUD — local thread search (design)

## Goal

Improve **local** (in-webview) thread list search without provider-specific logic: one corpus builder and one query engine usable by Codex and Claude summaries.

This document describes the **AGHUD-031** slice: `search-core` + `buildThreadSearchCorpus`. **`getVisibleThreads` in `thread-page.js`** uses `threadMatchesSearchQuery` (AND tokens over `buildThreadSearchCorpus`) while **preserving** status filter and the user’s sort mode (`updated_desc` / `updated_asc` / `title_asc`). Relevance ranking via `rankThreadsBySearchQuery` is optional and not wired (avoids overriding sort UX during search).

## Query model

- User query is normalized: trim, collapse internal whitespace, ASCII lowercase via `normalizeSearchQuery`.
- The query is split on spaces into **AND** tokens: every token must appear as a substring of the combined corpus (order-independent).
- Rationale: multi-word queries behave predictably (`foo bar` matches rows where both appear somewhere in the indexed text), unlike a single long substring match.

## Corpus (`buildThreadSearchCorpus`)

Implemented in `src/host/provider-contract.js`. Parts are joined with spaces and lowercased. Fields included when present:

| Field | Notes |
|--------|--------|
| `title`, `id`, `cwd`, `model` | Core list metadata |
| Normalized `status` | Via `normalizeThreadStatus` |
| `preview` | Summary / snippet |
| `projectLabel`, `sourcePath` | Optional (e.g. Claude); improves project/path discovery |
| Drift blob | Derived from `thread.drift` (same signal as list drift display) |

When list rows gain new columns, update **this corpus** and the thread-row UI together.

## Where filtering runs

| Path | Query handling |
|------|----------------|
| **Webview list** (`thread-page` → `getVisibleThreads`) | Always: `search-core` AND tokens over `buildThreadSearchCorpus` for **both** Codex and Claude rows already loaded into state. |
| **Claude** `listClaudeThreads({ query })` | Optional server-side filter in `filterClaudeThreads`, aligned with the same `threadMatchesSearchQuery` logic as the webview. |
| **Codex** `listCodexThreads` | **No `query` parameter.** The provider returns a scan-limited list; text search applies only after data is in UI state (see comment on `listCodexThreads` in `codex.js`). |

This split avoids duplicating scan/parser work for Codex while keeping one search model in the panel.

## API (`search-core.js`)

| Export | Role |
|--------|------|
| `normalizeSearchQuery` | Shared normalization for future UI + tests |
| `tokenizeSearchQuery` | AND token list |
| `threadMatchesSearchQuery(thread, normalizedQuery)` | Filter predicate |
| `scoreThreadSearchMatch` | Title heavier than id than other fields (ranking) |
| `rankThreadsBySearchQuery(threads, rawQuery)` | Filter + sort; empty query returns input order (copy) |

## Follow-up

- Optional: offer “relevance sort” when query is non-empty (`rankThreadsBySearchQuery`) as a separate UI toggle; until then, sort order stays user-controlled.
- **`filterClaudeThreads`** (`listClaudeThreads` `query` option) uses the same `threadMatchesSearchQuery` + `buildThreadSearchCorpus` path as the webview list (AND tokens). The optional **`project`** filter remains a separate substring match on project labels/paths (unchanged). Regression: `claude-api.test.js` checks `query: "session robustness"` (tokens not contiguous in the flat string) still resolves `session-rich`.
