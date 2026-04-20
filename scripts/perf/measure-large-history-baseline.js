#!/usr/bin/env node
"use strict";

/**
 * Large-History Performance Baseline Measurement Script
 *
 * Creates synthetic Codex session data at increasing scales and measures
 * the cost of each hotspot. Designed for reproducible benchmarking —
 * no external dependencies, uses only Node.js built-ins.
 *
 * Usage:
 *   node scripts/perf/measure-large-history-baseline.js            # synthetic scales (default)
 *   node scripts/perf/measure-large-history-baseline.js --real     # real ~/.codex/sessions + ~/.claude/projects
 *   node scripts/perf/measure-large-history-baseline.js --real-codex
 *   node scripts/perf/measure-large-history-baseline.js --real-claude
 *   node scripts/perf/measure-large-history-baseline.js --codex-sessions=/path/to/sessions
 *   node scripts/perf/measure-large-history-baseline.js --claude-projects=/path/to/projects
 *   node scripts/perf/measure-large-history-baseline.js --with-synthetic  # add synthetic after real
 *   node scripts/perf/measure-large-history-baseline.js --json     # JSON output
 *   node scripts/perf/measure-large-history-baseline.js --cleanup  # cleanup only (synthetic temp tree)
 *   node scripts/perf/measure-large-history-baseline.js --scales=10 --cleanup  # run then cleanup
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_SCALES = [50, 100, 200, 500];
const MESSAGES_PER_THREAD = 200; // average messages per synthetic thread
const TMP_DIR = path.join(os.tmpdir(), "agenthud-perf-baseline");

// Import real provider code for measurement
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const codexModule = require(path.join(PROJECT_ROOT, "src", "host", "providers", "codex"));
const claudeModule = require(path.join(PROJECT_ROOT, "src", "host", "providers", "claude"));
const threadPageModule = require(path.join(PROJECT_ROOT, "src", "host", "thread-page"));

// ---------------------------------------------------------------------------
// Synthetic Data Generation
// ---------------------------------------------------------------------------

function makeUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function generateSessionFile(sessionDir, sessionId, messageCount) {
  const filePath = path.join(sessionDir, `rollout-${sessionId}.jsonl`);
  const lines = [];

  // session_meta record
  lines.push(JSON.stringify({
    type: "session_meta",
    version: "1.0",
    timestamp: new Date().toISOString(),
    payload: {
      id: sessionId,
      cwd: `/home/user/project-${sessionId.slice(0, 8)}`,
      model: "gpt-5.4",
      source: `agent-perf-test-${sessionId.slice(0, 8)}`
    }
  }));

  for (let i = 0; i < messageCount; i++) {
    // User message
    lines.push(JSON.stringify({
      type: "response_item",
      timestamp: new Date(Date.now() - (messageCount - i) * 60000).toISOString(),
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "text", text: `User prompt ${i + 1}: Explain the architecture of distributed system patterns in detail.` }]
      }
    }));

    // Assistant message
    lines.push(JSON.stringify({
      type: "response_item",
      timestamp: new Date(Date.now() - (messageCount - i) * 30000).toISOString(),
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: `Assistant response ${i + 1}: ${"Lorem ipsum dolor sit amet ".repeat(20).trim()}` }]
      }
    }));

    // Event message every 5 turns
    if (i % 5 === 0) {
      lines.push(JSON.stringify({
        type: "event_msg",
        timestamp: new Date(Date.now() - (messageCount - i) * 15000).toISOString(),
        payload: {
          type: "info",
          message: `Processing step ${i + 1} of ${messageCount}`
        }
      }));
    }

    // Tool call every 10 turns
    if (i % 10 === 0) {
      lines.push(JSON.stringify({
        type: "response_item",
        timestamp: new Date(Date.now() - (messageCount - i) * 20000).toISOString(),
        payload: {
          type: "function_call",
          name: `tool_${i}`,
          call_id: `call-${makeUuid()}`
        }
      }));

      lines.push(JSON.stringify({
        type: "response_item",
        timestamp: new Date(Date.now() - (messageCount - i) * 18000).toISOString(),
        payload: {
          type: "function_call_output",
          call_id: `call-${makeUuid()}`,
          output: "Tool execution completed successfully."
        }
      }));
    }
  }

  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"));
  return filePath;
}

function generateSyntheticData(scale, baseDir) {
  const sessionsDir = path.join(baseDir, `scale-${scale}`, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });

  const files = [];
  for (let i = 0; i < scale; i++) {
    const sessionId = makeUuid();
    const sessionDir = path.join(sessionsDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    const filePath = generateSessionFile(sessionDir, sessionId, MESSAGES_PER_THREAD);
    files.push(filePath);
  }
  return { sessionsDir, files };
}

// ---------------------------------------------------------------------------
// Measurement Helpers
// ---------------------------------------------------------------------------

function hrToMs(hr) {
  return hr[0] * 1000 + hr[1] / 1e6;
}

function measureSync(fn) {
  const start = process.hrtime();
  const result = fn();
  const elapsed = process.hrtime(start);
  return { result, elapsedMs: hrToMs(elapsed) };
}

async function measureAsync(fn) {
  const start = process.hrtime();
  const result = await fn();
  const elapsed = process.hrtime(start);
  return { result, elapsedMs: hrToMs(elapsed) };
}

function getRssKb() {
  return Math.round(process.memoryUsage().rss / 1024);
}

function getHeapKb() {
  return Math.round(process.memoryUsage().heapUsed / 1024);
}

// ---------------------------------------------------------------------------
// Hotspot Measurements
// ---------------------------------------------------------------------------

async function measureDiscovery(sessionsDir) {
  // HOTSPOT-1: Full directory walk + stat sort
  if (typeof global.gc === "function") global.gc();
  const rssBefore = getRssKb();
  const { result: files, elapsedMs } = await measureAsync(() =>
    codexModule.findRolloutFiles(sessionsDir)
  );
  const rssAfter = getRssKb();
  return { elapsedMs, fileCount: files.length, rssDeltaKb: rssAfter - rssBefore };
}

async function measureListParse(sessionsDir) {
  // HOTSPOT-2: Full file read + parse for listing
  if (typeof global.gc === "function") global.gc();
  const rssBefore = getRssKb();
  const { result, elapsedMs } = await measureAsync(() =>
    codexModule.listCodexThreads({ sessionsDir, limit: 500 })
  );
  const rssAfter = getRssKb();
  return {
    elapsedMs,
    threadCount: result.threads.length,
    discovered: result.meta.discovered,
    rssDeltaKb: rssAfter - rssBefore,
    threads: result.threads
  };
}

async function measureClaudeDiscovery(projectsRoot) {
  if (typeof global.gc === "function") global.gc();
  const rssBefore = getRssKb();
  const { result, elapsedMs } = await measureAsync(() =>
    claudeModule.discoverClaudeSources({ projectsRoot })
  );
  const rssAfter = getRssKb();
  return {
    elapsedMs,
    fileCount: result.sources.length,
    subagentFiles: result.subagentSources ? result.subagentSources.length : 0,
    rssDeltaKb: rssAfter - rssBefore
  };
}

async function measureClaudeList(projectsRoot, cacheRoot) {
  if (typeof global.gc === "function") global.gc();
  const rssBefore = getRssKb();
  const { result, elapsedMs } = await measureAsync(() =>
    claudeModule.listClaudeThreads({
      projectsRoot,
      cacheRoot,
      limit: 500,
      forceRebuild: true
    })
  );
  const rssAfter = getRssKb();
  return {
    elapsedMs,
    threadCount: result.threads.length,
    discovered: result.meta && result.meta.discovered,
    parsed: result.meta && result.meta.parsed,
    rssDeltaKb: rssAfter - rssBefore,
    threads: result.threads
  };
}

async function measureClaudeDetail(projectsRoot, threadId) {
  if (typeof global.gc === "function") global.gc();
  const rssBefore = getRssKb();
  const { result, elapsedMs } = await measureAsync(() =>
    claudeModule.getClaudeThreadDetail(threadId, { projectsRoot })
  );
  const rssAfter = getRssKb();
  return {
    elapsedMs,
    found: result !== null,
    messageCount: result && result.messages ? result.messages.length : 0,
    eventCount: result && result.events ? result.events.length : 0,
    rssDeltaKb: rssAfter - rssBefore
  };
}

async function measureDetailParse(sessionsDir, threadId) {
  // HOTSPOT-3 + HOTSPOT-6: Redundant scan + full detail parse
  if (typeof global.gc === "function") global.gc();
  const rssBefore = getRssKb();
  const { result, elapsedMs } = await measureAsync(() =>
    codexModule.getCodexThreadDetail(threadId, { sessionsDir })
  );
  const rssAfter = getRssKb();
  return {
    elapsedMs,
    found: result !== null,
    messageCount: result ? result.messages.length : 0,
    eventCount: result ? result.events.length : 0,
    rssDeltaKb: rssAfter - rssBefore
  };
}

function measureFilterSort(threads) {
  // HOTSPOT-4: O(n) copy + filter + sort
  if (typeof global.gc === "function") global.gc();
  const providerState = {
    threads,
    query: "",
    statusFilter: "all",
    sort: "updated_desc"
  };

  const { elapsedMs: noFilterMs } = measureSync(() =>
    threadPageModule.getVisibleThreads(providerState)
  );

  const providerStateFiltered = {
    ...providerState,
    query: "project",
    statusFilter: "all",
    sort: "updated_desc"
  };
  const { result: filtered, elapsedMs: withFilterMs } = measureSync(() =>
    threadPageModule.getVisibleThreads(providerStateFiltered)
  );

  const providerStateSorted = {
    ...providerState,
    query: "",
    statusFilter: "all",
    sort: "title_asc"
  };
  const { elapsedMs: withSortMs } = measureSync(() =>
    threadPageModule.getVisibleThreads(providerStateSorted)
  );

  return {
    threadCount: threads.length,
    noFilterMs,
    withFilterMs,
    filteredCount: filtered.length,
    withSortMs
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runScale(scale) {
  const scaleDir = path.join(TMP_DIR, `scale-${scale}`);
  console.error(`  Generating ${scale} synthetic threads...`);
  const { sessionsDir } = generateSyntheticData(scale, TMP_DIR);

  console.error(`  Measuring HOTSPOT-1 (discovery)...`);
  const discovery = await measureDiscovery(sessionsDir);

  console.error(`  Measuring HOTSPOT-2 (list parse)...`);
  const listParse = await measureListParse(sessionsDir);

  const targetThread =
    listParse.threadCount > 0 && listParse.threads && listParse.threads[0]
      ? listParse.threads[0]
      : null;

  let detailParse = null;
  if (targetThread) {
    console.error(`  Measuring HOTSPOT-3+6 (detail parse)...`);
    detailParse = await measureDetailParse(sessionsDir, targetThread.id);
  }

  console.error(`  Measuring HOTSPOT-4 (filter+sort)...`);
  const filterSort = measureFilterSort(listParse.threads || []);

  return {
    mode: "synthetic-codex",
    scale,
    dataRoot: sessionsDir,
    messagesPerThread: MESSAGES_PER_THREAD,
    hotspots: {
      discovery,
      listParse,
      detailParse,
      filterSort
    }
  };
}

function assertDir(p, label) {
  let st;
  try {
    st = fs.statSync(p);
  } catch (_e) {
    throw new Error(`${label} is not readable: ${p}`);
  }
  if (!st.isDirectory()) {
    throw new Error(`${label} is not a directory: ${p}`);
  }
}

async function runRealCodex(sessionsDir) {
  assertDir(sessionsDir, "Codex sessions directory");
  console.error(`\nReal Codex data: ${sessionsDir}`);

  console.error(`  Measuring HOTSPOT-1 (discovery)...`);
  const discovery = await measureDiscovery(sessionsDir);

  console.error(`  Measuring HOTSPOT-2 (list parse)...`);
  const listParse = await measureListParse(sessionsDir);

  const targetThread =
    listParse.threadCount > 0 && listParse.threads && listParse.threads[0]
      ? listParse.threads[0]
      : null;

  let detailParse = null;
  if (targetThread) {
    console.error(`  Measuring HOTSPOT-3+6 (detail parse)…`);
    detailParse = await measureDetailParse(sessionsDir, targetThread.id);
  }

  console.error(`  Measuring HOTSPOT-4 (filter+sort)…`);
  const filterSort = measureFilterSort(listParse.threads || []);

  return {
    mode: "real-codex",
    dataRoot: sessionsDir,
    messagesPerThread: null,
    hotspots: {
      discovery,
      listParse,
      detailParse,
      filterSort
    }
  };
}

async function runRealClaude(projectsRoot) {
  assertDir(projectsRoot, "Claude projects root");
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agenthud-claude-perf-"));
  console.error(`\nReal Claude data: ${projectsRoot}`);
  console.error(`  (isolated parse cache: ${cacheRoot})`);

  try {
    console.error(`  Measuring discovery (walk + session.jsonl index)…`);
    const discovery = await measureClaudeDiscovery(projectsRoot);

    console.error(`  Measuring list/index (full parse, forceRebuild)…`);
    const listParse = await measureClaudeList(projectsRoot, cacheRoot);

    const targetThread =
      listParse.threadCount > 0 && listParse.threads && listParse.threads[0]
        ? listParse.threads[0]
        : null;

    let detailParse = null;
    if (targetThread) {
      console.error(`  Measuring detail parse (selected thread)…`);
      detailParse = await measureClaudeDetail(projectsRoot, targetThread.id);
    }

    console.error(`  Measuring filter+sort (UI path)…`);
    const filterSort = measureFilterSort(listParse.threads || []);

    return {
      mode: "real-claude",
      dataRoot: projectsRoot,
      cacheRoot,
      messagesPerThread: null,
      hotspots: {
        discovery,
        listParse,
        detailParse,
        filterSort
      }
    };
  } finally {
    try {
      fs.rmSync(cacheRoot, { recursive: true, force: true });
    } catch (_e) {
      console.error(`  Warning: could not remove temp cache ${cacheRoot}`);
    }
  }
}

async function runAllScales(scales) {
  const results = [];
  for (const scale of scales) {
    console.error(`\nScale: ${scale} threads`);
    const result = await runScale(scale);
    results.push(result);
  }
  return results;
}

function cleanup() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    console.error(`Cleaned up ${TMP_DIR}`);
  }
}

function formatResults(results) {
  const lines = [];
  lines.push("╔══════════════════════════════════════════════════════════════════════╗");
  lines.push("║        AgentHUD Large-History Performance Baseline Results          ║");
  lines.push("╚══════════════════════════════════════════════════════════════════════╝");
  lines.push("");

  for (const r of results) {
    const title =
      r.mode === "synthetic-codex"
        ? `Synthetic Codex: ${r.scale} threads × ${r.messagesPerThread} messages`
        : r.mode === "real-codex"
          ? `Real Codex: ${r.dataRoot}`
          : r.mode === "real-claude"
            ? `Real Claude: ${r.dataRoot}`
            : String(r.mode || "run");
    lines.push(title);
    lines.push("─".repeat(72));

    const h = r.hotspots;
    const discLabel =
      r.mode === "real-claude"
        ? `sources: ${h.discovery.fileCount} (+${h.discovery.subagentFiles || 0} subagent files)`
        : `files: ${h.discovery.fileCount}`;
    lines.push(
      `  HOTSPOT-1 Discovery:    ${h.discovery.elapsedMs.toFixed(1)}ms  (${discLabel}, RSS Δ: ${h.discovery.rssDeltaKb}KB)`
    );
    const listExtra =
      r.mode === "real-claude" && h.listParse.parsed != null
        ? `, parsed: ${h.listParse.parsed}`
        : "";
    lines.push(
      `  HOTSPOT-2 List Parse:   ${h.listParse.elapsedMs.toFixed(1)}ms  (threads: ${h.listParse.threadCount}${listExtra}, RSS Δ: ${h.listParse.rssDeltaKb}KB)`
    );

    if (h.detailParse) {
      lines.push(
        `  HOTSPOT-3+6 Detail:     ${h.detailParse.elapsedMs.toFixed(1)}ms  (msgs: ${h.detailParse.messageCount}, events: ${h.detailParse.eventCount}, RSS Δ: ${h.detailParse.rssDeltaKb}KB)`
      );
    }

    const fs_ = h.filterSort;
    lines.push(
      `  HOTSPOT-4 Filter+Sort:  noFilter=${fs_.noFilterMs.toFixed(2)}ms  withFilter=${fs_.withFilterMs.toFixed(2)}ms  withSort=${fs_.withSortMs.toFixed(2)}ms`
    );
    lines.push("");
  }

  lines.push("Summary Table (milliseconds):");
  lines.push("─".repeat(72));
  lines.push("Run                      | Discovery | ListParse | DetailParse | Filter+Sort");
  lines.push("-------------------------|-----------|-----------|-------------|------------");
  for (const r of results) {
    const h = r.hotspots;
    const d = h.discovery.elapsedMs.toFixed(0).padStart(9);
    const l = h.listParse.elapsedMs.toFixed(0).padStart(9);
    const dp = h.detailParse ? h.detailParse.elapsedMs.toFixed(0).padStart(11) : "N/A".padStart(11);
    const f = h.filterSort.noFilterMs.toFixed(2).padStart(10);
    let runLabel;
    if (r.mode === "synthetic-codex") {
      runLabel = `syn:${r.scale}`;
    } else if (r.mode === "real-codex") {
      runLabel = `codex:${h.listParse.threadCount}thr`;
    } else if (r.mode === "real-claude") {
      runLabel = `claude:${h.listParse.threadCount}thr`;
    } else {
      runLabel = String(r.mode || "?").slice(0, 22);
    }
    lines.push(`${runLabel.padEnd(24)} | ${d} | ${l} | ${dp} | ${f}`);
  }
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(args, prefix) {
  const raw = args.find((a) => a.startsWith(prefix));
  if (!raw) {
    return null;
  }
  return raw.slice(prefix.length);
}

function jsonSafeResults(results) {
  return results.map((r) => {
    const copy = JSON.parse(JSON.stringify(r));
    if (copy.hotspots && copy.hotspots.listParse && copy.hotspots.listParse.threads) {
      delete copy.hotspots.listParse.threads;
    }
    return copy;
  });
}

function printHelp() {
  console.log(`AgentHUD large-history baseline (Codex + Claude provider code, no extension host).

Synthetic (default):
  node scripts/perf/measure-large-history-baseline.js [--scales=50,100,200,500] [--json] [--cleanup]

Real data (paths must exist):
  node scripts/perf/measure-large-history-baseline.js --real
  node scripts/perf/measure-large-history-baseline.js --real-codex [--codex-sessions=DIR]
  node scripts/perf/measure-large-history-baseline.js --real-claude [--claude-projects=DIR]
  node scripts/perf/measure-large-history-baseline.js --real --with-synthetic   # also run synthetic

Defaults: codex sessions = ~/.codex/sessions, Claude projects = ~/.claude/projects
Claude list timing uses forceRebuild + a temp cache directory (removed after the run).
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const isJson = args.includes("--json");
  const isCleanup = args.includes("--cleanup");
  const scalesArg = argValue(args, "--scales=");
  const scales = scalesArg
    ? scalesArg.split(",").map(Number)
    : DEFAULT_SCALES;

  const nonCleanupArgs = args.filter((a) => a !== "--cleanup");
  const cleanupOnly = isCleanup && nonCleanupArgs.length === 0;

  if (cleanupOnly) {
    cleanup();
    console.log("Cleanup complete.");
    return;
  }

  const home = os.homedir();
  let codexReal = argValue(args, "--codex-sessions=");
  let claudeReal = argValue(args, "--claude-projects=");
  if (codexReal) {
    codexReal = path.resolve(codexReal);
  }
  if (claudeReal) {
    claudeReal = path.resolve(claudeReal);
  }
  if (args.includes("--real")) {
    if (!codexReal) {
      codexReal = path.join(home, ".codex", "sessions");
    }
    if (!claudeReal) {
      claudeReal = path.join(home, ".claude", "projects");
    }
  } else {
    if (args.includes("--real-codex") && !codexReal) {
      codexReal = path.join(home, ".codex", "sessions");
    }
    if (args.includes("--real-claude") && !claudeReal) {
      claudeReal = path.join(home, ".claude", "projects");
    }
  }

  const anyReal = Boolean(codexReal || claudeReal);
  const runSynthetic = !anyReal || args.includes("--with-synthetic");

  console.error("AgentHUD Large-History Performance Baseline");
  if (anyReal) {
    console.error("Mode: real provider data" + (runSynthetic ? " + synthetic" : ""));
    if (codexReal) {
      console.error(`  Codex sessions: ${codexReal}`);
    }
    if (claudeReal) {
      console.error(`  Claude projects: ${claudeReal}`);
    }
  } else {
    console.error("Mode: synthetic only");
    console.error(`Scales: ${scales.join(", ")} threads`);
    console.error(`Temp dir: ${TMP_DIR}`);
    console.error(`Messages per thread: ${MESSAGES_PER_THREAD}`);
  }
  console.error("");

  const results = [];

  if (anyReal) {
    if (codexReal) {
      try {
        results.push(await runRealCodex(codexReal));
      } catch (error) {
        console.error(`Real Codex run failed: ${error.message || error}`);
        throw error;
      }
    }
    if (claudeReal) {
      try {
        results.push(await runRealClaude(claudeReal));
      } catch (error) {
        console.error(`Real Claude run failed: ${error.message || error}`);
        throw error;
      }
    }
  }

  if (runSynthetic) {
    const syn = await runAllScales(scales);
    for (const row of syn) {
      results.push(row);
    }
  }

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          scales: runSynthetic ? scales : [],
          results: jsonSafeResults(results)
        },
        null,
        2
      )
    );
  } else {
    console.log(formatResults(results));
  }

  if (isCleanup && runSynthetic) {
    cleanup();
    console.error("\nSynthetic data removed (--cleanup after run).");
  } else if (!isCleanup && runSynthetic) {
    console.error("\nDone. Run with `--cleanup` alone to remove synthetic temp data.");
  } else {
    console.error("\nDone.");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
