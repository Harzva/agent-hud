# Large-History Performance Audit Baseline

**Date**: 2026-04-19
**Scope**: AgentHUD extension — read-only audit of performance characteristics under large-history conditions.
**Constraint**: No product logic changes; document + measure only.

---

## 1. Executive Summary

AgentHUD reads Codex (`.codex/sessions/**/rollout-*.jsonl`) and Claude (`~/.claude/projects/*/session.jsonl`) transcript files to display thread lists and detail views. As history grows (hundreds to thousands of session files, multi-MB individual transcripts), several code paths degrade from O(1)/O(log n) to O(n) or worse.

This document identifies **6 hotspots**, quantifies their complexity, and establishes a reproducible measurement baseline so future optimizations can be validated against real numbers.

---

## 2. Architecture Overview (Data Flow)

```
Extension Activation
    |
    v
[ON-DEMAND] ensureProviderList()
    |
    +-- hydrateCodexFromCache()          <--- reads single JSON cache file
    |
    +-- loadCodexList() [background]    <--- scans ALL rollout files, parses ALL
    |
    v
getVisibleThreads()                     <--- copy + filter + sort on every render
    |
    v
selectThread() -> getThreadDetail()    <--- re-scans ALL files, parses matching file
    |
    v
renderThreadPage()                      <--- builds full HTML string
    |
    v
writeProviderSummaries()                <--- rewrites entire cache JSON
```

### Key Constants (Hard Limits)

| Constant | Value | Location |
|----------|-------|----------|
| `DEFAULT_LIMIT` | 500 | `providers/codex.js:7` |
| `DETAIL_MESSAGE_LIMIT` | 400 | `providers/codex.js:8` |
| `EVENT_LIMIT` | 80 | `providers/codex.js:9` |
| `UI_STATE_WRITE_DELAY_MS` | 250 | `panel-view.js:22` |
| `RECENT_WINDOW_MS` | 14 days | `providers/codex.js:10` |

---

## 3. Hotspot Analysis

### HOTSPOT-1: Full Directory Tree Walk on Every Refresh

**Location**: `src/host/providers/codex.js:97-121` (`findRolloutFiles`)
**Complexity**: O(N_files × D_depth) where N_files = total rollout files, D_depth = directory depth
**Trigger**: Every `listCodexThreads()` and `getCodexThreadDetail()` call

```javascript
async function findRolloutFiles(sessionsDir) {
  const files = [];
  await walk(root, files);                          // recursive readdir
  const stats = await Promise.all(files.map(async (file) => {
    const stat = await fs.promises.stat(file);      // stat EVERY file
    return { file, mtimeMs: stat.mtimeMs };
  }));
  return stats.sort((a, b) => b.mtimeMs - a.mtimeMs).map(e => e.file);
}
```

**Problem**: No indexing, no caching of file lists. On each refresh, the entire directory tree is walked and every file is `stat()`-ed. With 1,000 rollout files across 200 session directories, this means ~1,200 syscalls minimum.

**Impact**: Wall-clock time grows linearly with session count. On cold filesystem cache, each `stat()` can take ~1-5ms (HDD) or ~0.1-0.5ms (SSD).

---

### HOTSPOT-2: Full File Read + Parse for Every Thread in List View

**Location**: `src/host/providers/codex.js:30-64` (`listCodexThreads`)
**Complexity**: O(N_files × L_lines_per_file)
**Trigger**: Every thread list load (first view, manual refresh, provider switch)

```javascript
for (const file of files) {
  const parsed = await parseCodexRollout(file, { detail: false, ... });
  // ...
}
```

Even with `detail: false`, `parseCodexRollout` (line 141) reads **the entire file** into memory and splits by newline:

```javascript
raw = await fs.promises.readFile(file, "utf8");
const lines = raw.split(/\r?\n/);
```

A 5MB transcript with 50,000 lines is fully read and iterated just to extract the thread summary (title, preview, message count).

**Impact**: Memory pressure + I/O. With 500 files averaging 2MB = 1GB transient memory during listing.

---

### HOTSPOT-3: Redundant Full Scan for Thread Detail Lookup

**Location**: `src/host/providers/codex.js:66-95` (`getCodexThreadDetail`)
**Complexity**: Same as HOTSPOT-1 + O(N_candidates × L_lines)
**Trigger**: Selecting a thread for detail view

```javascript
const files = await findRolloutFiles(sessionsDir);  // FULL walk again!
const wanted = String(threadId || "").trim();
const candidates = files.filter(file => {
  const id = sessionIdFromPath(file);
  return id === wanted || path.basename(file).includes(wanted);
});
```

**Problem**: Even though the thread's `sourcePath` is known from the list result (it's stored in `thread.sourcePath`), the detail lookup re-scans the entire directory tree. If the candidate filter fails, it falls back to parsing ALL files.

---

### HOTSPOT-4: O(n) Array Copy + Filter + Sort on Every Render

**Location**: `src/host/thread-page.js:569-596` (`getVisibleThreads`)
**Complexity**: O(n) copy + O(n) filter + O(n log n) sort per render
**Trigger**: Every `render()` call (filter change, sort change, thread selection, refresh)

```javascript
const threads = Array.isArray(providerState.threads)
  ? providerState.threads.slice()    // FULL array copy
  : [];
const filtered = threads.filter(...); // O(n) scan
filtered.sort(...);                   // O(n log n)
```

**Problem**: Every keystroke or UI interaction triggers a full copy + linear scan + sort of all 500 threads. The filter does string concatenation per thread on each call.

---

### HOTSPOT-5: Full Cache Rewrite on Every List Update

**Location**: `src/host/summary-cache.js` (`writeProviderSummaries`)
**Complexity**: O(N_threads) per write
**Trigger**: After every successful `loadCodexList()`

The entire summary JSON (all thread summaries) is serialized and written atomically. With 500 threads, each with ~5 fields, the cache file is ~50-100KB, but the write involves:
1. `JSON.stringify()` of the full array
2. Write to temp file
3. Atomic rename

**Impact**: Modest for 500 threads, but the cost grows linearly and blocks the event loop during serialization.

---

### HOTSPOT-6: No Incremental/Lazy Parsing for Detail View

**Location**: `src/host/providers/codex.js:141-301` (`parseCodexRollout`)
**Complexity**: O(L_lines) even when only first/last N messages are needed
**Trigger**: Every thread detail load

The function reads and parses every line, then slices at the end:

```javascript
return {
  messages: messages.slice(-DETAIL_MESSAGE_LIMIT),  // 400
  events: events.slice(-EVENT_LIMIT)                 // 80
};
```

**Problem**: For a thread with 10,000 messages, only the last 400 are returned — but all 10,000 were parsed and normalized.

---

## 4. Claude Provider Considerations

The Claude provider (`src/host/providers/claude.js`) follows similar patterns:
- Full directory walk of `~/.claude/projects/` tree
- Full file read + line-by-line parse for thread listing
- Same redundant scan for detail lookup
- Additionally handles sub-agent transcript files (nested directory traversal)

Claude transcripts can contain sub-agent references that trigger recursive file reads, compounding the I/O and memory impact.

---

## 5. Mitigations Already in Place

| Mitigation | Mechanism | Effectiveness |
|------------|-----------|---------------|
| Cache-first hydration | `hydrateCodexFromCache()` reads cached JSON for fast first paint | Good for initial load; stale data until background refresh completes |
| Hard thread limit | `DEFAULT_LIMIT = 500` | Prevents unbounded growth but doesn't help with 500 large files |
| Message/event limits | `DETAIL_MESSAGE_LIMIT = 400`, `EVENT_LIMIT = 80` | Caps output but not input work |
| Lazy detail loading | Detail only loaded on thread selection | Avoids loading all details upfront |
| Debounced UI state | 250ms debounce on `globalState` writes | Reduces write frequency |
| Cache file per provider | Separate JSON file per provider | Limits single-write blast radius |

---

## 6. Measurement Baseline

See `scripts/perf/measure-large-history-baseline.js` for the reproducible measurement script.

### Methodology

The script creates synthetic session data at increasing scales (50, 100, 200, 500 threads) and measures:

1. **Discovery time**: Directory walk + stat (HOTSPOT-1)
2. **List parse time**: Full file read + parse for listing (HOTSPOT-2)
3. **Detail parse time**: Full file read + parse for detail (HOTSPOT-6)
4. **Filter+sort time**: getVisibleThreads overhead (HOTSPOT-4)
5. **Memory delta**: RSS change during operations

### Expected Baseline Curves

Based on code analysis (not yet measured — script must be run):

| Threads | Discovery (est.) | List Parse (est.) | Detail Parse (est.) | Filter+Sort (est.) |
|---------|-------------------|--------------------|----------------------|---------------------|
| 50      | ~25ms             | ~500ms             | ~10ms                | <1ms                |
| 100     | ~50ms             | ~1s                | ~10ms                | <1ms                |
| 200     | ~100ms            | ~2s                | ~10ms                | ~2ms                |
| 500     | ~250ms            | ~5s                | ~10ms                | ~5ms                |

*These estimates assume SSD, ~2MB average file size, warm filesystem cache. Actual measurements required.*

---

## 7. Recommendations (Future Work — Not in Scope)

1. **File list index**: Cache `findRolloutFiles()` results with mtime-based invalidation
2. **Header-only parsing**: For list view, read only first/last N lines instead of full file
3. **Source path reuse**: Use `thread.sourcePath` for detail lookup instead of re-scanning
4. **Incremental cache**: Append new summaries instead of rewriting entire cache
5. **Virtual scrolling**: Render only visible thread rows in the webview
6. **Lazy line parsing**: For detail view, seek to end of file and parse backward for last N messages

---

## 8. Measurement Reproducibility

```bash
# From project root:
node scripts/perf/measure-large-history-baseline.js

# Real provider data on this machine (default paths):
#   Codex:  ~/.codex/sessions
#   Claude: ~/.claude/projects  (uses a temp parse-cache dir, then deletes it)
node scripts/perf/measure-large-history-baseline.js --real

# Only one provider, or custom roots:
node scripts/perf/measure-large-history-baseline.js --real-codex
node scripts/perf/measure-large-history-baseline.js --real-claude
node scripts/perf/measure-large-history-baseline.js --codex-sessions="$HOME/.codex/sessions"
node scripts/perf/measure-large-history-baseline.js --claude-projects="$HOME/.claude/projects"

# Combine real runs with the synthetic sweep (for A/B vs. controlled scales):
node scripts/perf/measure-large-history-baseline.js --real --with-synthetic

# With custom output:
node scripts/perf/measure-large-history-baseline.js --json > baseline-results.json

# Cleanup synthetic data only (no benchmark):
node scripts/perf/measure-large-history-baseline.js --cleanup

# Run a custom scale then delete the temp tree:
node scripts/perf/measure-large-history-baseline.js --scales=10 --cleanup

# CLI reference:
node scripts/perf/measure-large-history-baseline.js --help
```

**Note:** `~/.claude/sessions/*.json` is session metadata only, not `session.jsonl` transcripts; Claude measurements always use `~/.claude/projects/**` as in the extension.

---

## Appendix A: File Size Reference

Typical Codex session file sizes observed:
- Short session (< 20 messages): 5-50 KB
- Medium session (20-100 messages): 50 KB - 2 MB
- Long session (100-500 messages): 2-20 MB
- Extended session (500+ messages): 20+ MB

## Appendix B: Glossary

- **Discovery**: The `findRolloutFiles()` recursive directory walk + stat sort
- **List parse**: `parseCodexRollout(file, { detail: false })` — full read, partial extraction
- **Detail parse**: `parseCodexRollout(file, { detail: true })` — full read, full extraction
- **Filter+sort**: `getVisibleThreads()` — array copy + filter + sort
