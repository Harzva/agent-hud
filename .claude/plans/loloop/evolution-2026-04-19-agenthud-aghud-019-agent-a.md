# AGHUD-019 — Agent-A — Performance budget & scan limits (slice)

**loop_type**: parallel_task  
**task_id**: AGHUD-019  
**agent**: Agent-A  
**date**: 2026-04-19  
**status**: slice delivered (orchestrator marks task completion; not updating tasks.json)

## PLAN (3–6 steps)

1. **Extend `performance-budget.js`**: Add documented constants for Codex list rollout scan cap, Claude list source scan cap, and summary-cache write cap; export small helpers to read caps with optional per-call overrides (for tests).
2. **Codex `listCodexThreads`**: After `findRolloutFiles` (already mtime-sorted), slice to the cap before parallel parse; set `meta` fields: `discovered` = full tree count, `scannedRollouts` = parsed file count, `listScanTruncated` when truncated.
3. **Claude `buildClaudeSummaryIndex`**: Process only the first *N* discovered sources with the existing parse/cache-hit loop; for remaining sources, **reuse existing parse-cache entries only** (no new parse) so `writeJsonAtomic` does not drop previously stored tail entries on disk.
4. **`summary-cache.js` `writeProviderSummaries`**: Before `writeVersionedJson`, cap `summaries` length using the same budget module to bound global-storage write size.
5. **Tests**: Update/add cases in `performance-budget.test.js`, `codex.test.js`, and `claude-cache.test.js` so truncation / tail-preservation behavior is locked without touching UI or panel-view.

## changed_files

- `src/host/performance-budget.js`
- `src/host/performance-budget.test.js`
- `src/host/providers/codex.js`
- `src/host/providers/codex.test.js`
- `src/host/providers/claude.js`
- `src/host/providers/claude.test.js`
- `src/host/providers/claude-cache.test.js`
- `src/host/summary-cache.js`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-aghud-019-agent-a.md`
- `.codex-loop/state/parallel-reports/AGHUD-019-agent-a.json`

## validation

- `node src/host/performance-budget.test.js`
- `node src/host/providers/codex.test.js`
- `node src/host/providers/claude.test.js`
- `node src/host/providers/claude-cache.test.js`

## result

- **Budget module**: Exported `CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED`, `CLAUDE_LIST_MAX_SOURCES_SCANNED`, `SUMMARY_CACHE_MAX_SUMMARIES` (all 2500), plus `resolveCodexListRolloutScanCap`, `resolveClaudeListSourceScanCap`, `capThreadSummariesForCache`.
- **Codex list**: Parses at most N newest rollouts; `meta.discovered` = full count; `meta.scannedRollouts`, `meta.listScanCap`, `meta.listScanTruncated`. Override: `maxRolloutFilesScan` in list options.
- **Claude index**: Head of discovery list fully processed; tail rows restored from existing parse-cache entries when keys match (avoids shrinking on-disk cache); `meta.scannedSources`, `meta.listSourceScanCap`, `meta.listScanTruncated`, `meta.tailRestoredFromCache`. Override: `maxSourcesScan`.
- **Summary cache writes**: Thread summaries capped before JSON write; `meta.cacheWriteTruncated` / `cacheWriteCap` / `cacheWriteOmitted` when truncated.

## next_handoff

- **UI / settings** (out of this slice): Surface truncation flags in status copy or settings if product wants user-visible warnings (`panel-view` / `thread-page` blacklisted here).
- **Detail paths**: `getCodexThreadDetail` / `getClaudeThreadDetail` still walk full discovery where applicable; a follow-up slice could add optional detail scan budgets if needed.
- **Orchestrator**: Set task completion in `tasks.json` if this slice satisfies AGHUD-019 scope for the parallel batch.
