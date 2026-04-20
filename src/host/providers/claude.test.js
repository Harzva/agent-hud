"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createClaudeProvider,
  decodeProjectCwd,
  discoverClaudeSources,
  sessionIdFromFile,
  parseClaudeSession,
  listClaudeThreads,
  getClaudeThreadDetail
} = require("./claude");

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures/claude/projects");

async function run() {
  // --- discovery from fixture ---
  const discovered = await discoverClaudeSources({ projectsRoot: FIXTURES });
  assert.equal(discovered.provider, "claude");
  assert.equal(discovered.projectsRoot, FIXTURES);
  assert.ok(discovered.sources.length >= 3);
  assert.equal(discovered.meta.subagents, 1);

  const first = discovered.sources.find((source) => source.sessionId === "session-main");
  assert(first);
  assert.equal(first.provider, "claude");
  assert.equal(first.isSubagent, false);
  assert.equal(first.cwd, "/home/user/alpha/project");
  assert.equal(first.projectLabel, "project");
  assert.equal(first.manifestEntry.provider, "claude");
  assert.equal(first.manifestEntry.parseStatus, "unknown");

  // --- subagent filtering ---
  assert(!discovered.sources.some((source) => source.sessionId === "session-subagent"));
  assert.equal(discovered.subagentSources[0].sessionId, "session-subagent");
  assert.equal(discovered.subagentSources[0].isSubagent, true);

  const withSubagents = await discoverClaudeSources({ projectsRoot: FIXTURES, includeSubagents: true });
  assert.equal(withSubagents.sources.length, discovered.sources.length + 1);
  assert(withSubagents.sources.some((source) => source.sessionId === "session-subagent"));

  // --- provider interface ---
  const provider = createClaudeProvider({ projectsRoot: FIXTURES });
  assert.equal(provider.id, "claude");
  const viaProvider = await provider.discoverSources();
  assert.ok(viaProvider.sources.length >= 3);

  // --- missing directory returns empty ---
  const missingRoot = path.join(await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-claude-")), "missing");
  const missing = await discoverClaudeSources({ projectsRoot: missingRoot });
  assert.equal(missing.sources.length, 0);
  assert.equal(missing.subagentSources.length, 0);
  assert.deepStrictEqual(missing.meta.errors, []);

  // --- non-existent directory ---
  const nonexistentRoot = path.join(os.tmpdir(), "agenthud-claude-nonexistent-" + Date.now());
  const nonexistent = await discoverClaudeSources({ projectsRoot: nonexistentRoot });
  assert.equal(nonexistent.sources.length, 0);
  assert.equal(nonexistent.subagentSources.length, 0);

  // --- parseClaudeSession with error-tolerant fixture ---
  const errorRoot = path.resolve(__dirname, "../../../test/fixtures/claude/projects");
  const errorFile = path.join(errorRoot, "-home-user-error-project", "session-error.jsonl");
  const errorParsed = await parseClaudeSession(errorFile, { projectsRoot: errorRoot });
  assert.ok(errorParsed);
  assert.equal(errorParsed.thread.provider, "claude");
  assert.ok(errorParsed.meta.errors.length > 0);
  assert.equal(errorParsed.meta.errors[0].code, "malformed_json");
  // Even with error, valid records should still be parsed
  assert.ok(errorParsed.messages.length >= 1);
  assert.ok(errorParsed.thread.messageCount >= 1);

  // --- parseClaudeSession with empty file ---
  const emptyRoot = path.resolve(__dirname, "../../../test/fixtures/claude/projects");
  const emptyFile = path.join(emptyRoot, "-home-user-empty-project", "session-empty.jsonl");
  const emptyParsed = await parseClaudeSession(emptyFile, { projectsRoot: emptyRoot });
  assert.ok(emptyParsed);
  assert.equal(emptyParsed.thread.provider, "claude");
  assert.equal(emptyParsed.messages.length, 0);
  assert.equal(emptyParsed.thread.messageCount, 0);

  // --- parseClaudeSession with non-existent file ---
  const readErrorParsed = await parseClaudeSession("/nonexistent/session.jsonl", { projectsRoot: emptyRoot });
  // Should return a result with read_error (returns baseThread from sourceFromFile)
  // If sourceFromFile returns null (no file stat), returns null
  assert.ok(readErrorParsed === null || (readErrorParsed.meta && readErrorParsed.meta.errors.length > 0));

  // --- listClaudeThreads ---
  const listed = await listClaudeThreads({ projectsRoot: FIXTURES, cacheRoot: FIXTURES });
  assert.equal(listed.provider, "claude");
  assert.ok(Array.isArray(listed.threads));
  assert.ok(listed.threads.length >= 1);
  assert.equal(listed.meta.listScanTruncated, false);
  assert.equal(listed.meta.scannedSources, listed.meta.discovered);

  // --- listClaudeThreads with query filter ---
  const filtered = await listClaudeThreads({ projectsRoot: FIXTURES, cacheRoot: FIXTURES, query: "Inspect" });
  assert.ok(filtered.threads.length <= listed.threads.length);

  // --- listClaudeThreads with limit ---
  const limited = await listClaudeThreads({ projectsRoot: FIXTURES, cacheRoot: FIXTURES, limit: 1 });
  assert.ok(limited.threads.length <= 1);

  // --- listClaudeThreads includes parser drift on each summary (cache v2) ---
  const listedDrift = await listClaudeThreads({ projectsRoot: FIXTURES, cacheRoot: FIXTURES });
  const driftRow = listedDrift.threads.find((thread) => thread.id === "session-drift");
  assert.ok(driftRow && driftRow.drift);
  assert.equal(driftRow.drift.totalUnknownRecords, 3);
  assert.equal(driftRow.drift.formatVersion, "2.0");
  assert.equal(driftRow.drift.fallbackCount, 4);

  // --- getClaudeThreadDetail ---
  const detail = await getClaudeThreadDetail("session-rich", { projectsRoot: FIXTURES });
  assert.ok(detail);
  assert.equal(detail.provider, "claude");
  assert.equal(detail.thread.id, "session-rich");

  const richPath = path.join(FIXTURES, "-home-user-rich-project", "session-rich.jsonl");
  const viaPreferred = await getClaudeThreadDetail("session-rich", {
    projectsRoot: FIXTURES,
    preferredSourcePath: richPath
  });
  assert.ok(viaPreferred);
  assert.equal(viaPreferred.meta.detailResolvedVia, "preferredSourcePath");
  assert.ok(Array.isArray(detail.messages));
  assert.ok(detail.capabilities);

  // --- getClaudeThreadDetail with non-existent ID returns null ---
  const missingDetail = await getClaudeThreadDetail("nonexistent-session", { projectsRoot: FIXTURES });
  assert.equal(missingDetail, null);

  // --- getClaudeThreadDetail with empty ID returns null ---
  const emptyDetail = await getClaudeThreadDetail("", { projectsRoot: FIXTURES });
  assert.equal(emptyDetail, null);

  // --- getClaudeThreadDetail with null ID returns null ---
  const nullDetail = await getClaudeThreadDetail(null, { projectsRoot: FIXTURES });
  assert.equal(nullDetail, null);

  // --- getClaudeThreadDetail exposes parser drift (parity with parse meta) ---
  const driftDetail = await getClaudeThreadDetail("session-drift", { projectsRoot: FIXTURES });
  assert.ok(driftDetail);
  assert.deepStrictEqual(driftDetail.meta.drift.unknownRecordTypes, {
    unknown_event: 1,
    custom_notification: 1,
    yet_another_type: 1
  });
  assert.equal(driftDetail.meta.drift.totalUnknownRecords, 3);
  assert.equal(driftDetail.meta.drift.formatVersion, "2.0");
  assert.equal(driftDetail.meta.drift.fallbackCount, 4);

  // --- Utility functions ---
  assert.equal(decodeProjectCwd("-home-user-work"), "/home/user/work");
  assert.equal(decodeProjectCwd("relative-project"), "relative/project");
  assert.equal(decodeProjectCwd(""), "");
  assert.equal(decodeProjectCwd(null), "");
  assert.equal(sessionIdFromFile("/tmp/abc.jsonl"), "abc");
  assert.equal(sessionIdFromFile("session-name.jsonl"), "session-name");
  assert.equal(sessionIdFromFile(""), "");
  assert.equal(sessionIdFromFile(null), "");

  // --- Capabilities ---
  const caps = detail.capabilities;
  assert.equal(caps.openNative, true);
  assert.equal(caps.rename, false);
  assert.equal(caps.archive, false);

  console.log("claude discovery fixture OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
