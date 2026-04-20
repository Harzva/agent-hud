"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  claudeCapabilities,
  createClaudeProvider,
  getClaudeThreadDetail,
  listClaudeThreads
} = require("./claude");

async function run() {
  const projectsRoot = path.resolve(__dirname, "../../../test/fixtures/claude/projects");
  const cacheRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-claude-api-"));
  const provider = createClaudeProvider({ projectsRoot, cacheRoot });

  const listed = await provider.listThreads({ limit: 10 });
  assert.equal(listed.provider, "claude");
  assert.equal(listed.threads.length, 6);
  assert.equal(listed.meta.discovered, 6);
  assert.equal(listed.meta.returned, 6);

  const queried = await listClaudeThreads({ projectsRoot, cacheRoot, query: "robustness" });
  assert.equal(queried.threads.length, 1);
  assert.equal(queried.threads[0].id, "session-rich");

  // AND tokens (non-adjacent): "session" in id, "robustness" in summary — contiguous substring would miss.
  const andTokens = await listClaudeThreads({ projectsRoot, cacheRoot, query: "session robustness" });
  assert.equal(andTokens.threads.length, 1);
  assert.equal(andTokens.threads[0].id, "session-rich");

  const filteredProject = await listClaudeThreads({ projectsRoot, cacheRoot, project: "alpha", sort: "title_asc" });
  assert.equal(filteredProject.threads.length, 2);
  assert(filteredProject.threads.every((thread) => (thread.cwd || "").includes("/alpha/")));

  const filteredStatus = await listClaudeThreads({ projectsRoot, cacheRoot, status: "unknown", limit: 2 });
  assert.equal(filteredStatus.threads.length, 2);
  assert(filteredStatus.threads.every((thread) => thread.status === "unknown"));

  const detail = await provider.getThreadDetail("session-rich");
  assert.equal(detail.provider, "claude");
  assert.equal(detail.thread.id, "session-rich");
  assert.equal(detail.thread.projectLabel, "rich-project");
  assert.equal(detail.messages.length, 5);
  assert.deepStrictEqual(detail.capabilities, claudeCapabilities());
  assert.equal(detail.meta.sourcePath.endsWith("session-rich.jsonl"), true);
  assert.equal(detail.meta.hiddenRecords["permission-mode"], 1);
  assert.equal(detail.meta.errors.length, 1);
  assert.equal(detail.capabilities.openNative, true);

  const explicitDetail = await getClaudeThreadDetail("session-main", { projectsRoot });
  assert.equal(explicitDetail.thread.id, "session-main");
  assert.equal(explicitDetail.thread.status, "unknown");

  const missing = await provider.getThreadDetail("missing-session");
  assert.equal(missing, null);

  console.log("claude api fixture OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
