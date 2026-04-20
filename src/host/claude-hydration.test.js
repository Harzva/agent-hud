"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 1. Mock vscode
const vscodeMock = {
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => defaultValue
    })
  },
  window: {
    registerWebviewViewProvider: () => ({ dispose: () => {} }),
    createWebviewPanel: () => ({ onDidDispose: () => {}, reveal: () => {}, dispose: () => {} })
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} })
  },
  EventEmitter: class {
    constructor() { this.event = () => {}; }
    fire() {}
  },
  ViewColumn: { Active: 1 },
  Uri: {
    file: (p) => ({ fsPath: p, scheme: "file" }),
    parse: (p) => ({ fsPath: p, scheme: "parse" })
  }
};

const Module = require("module");
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "vscode") {
    return vscodeMock;
  }
  return originalLoad.apply(this, arguments);
};

// 2. Mock providers
const codexProviderMock = {
  createCodexProvider: () => ({
    id: "codex",
    listThreads: async () => ({ threads: [], meta: {} })
  })
};
const claudeProviderMock = {
  createClaudeProvider: () => ({
    id: "claude",
    listThreads: async () => ({ threads: [], meta: {} })
  })
};

// Use Module._load for local providers as well to be safe or just standard require.cache if they resolve
Module._load = (original => function(request, parent, isMain) {
  if (request === "vscode") return vscodeMock;
  if (request === "./providers/codex") return codexProviderMock;
  if (request === "./providers/claude") return claudeProviderMock;
  return original.apply(this, arguments);
})(Module._load);

// 3. Import AgentHudRuntime from panel-view.js
const { activateAgentHud } = require("./panel-view");

async function run() {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-hydration-test-"));
  const context = {
    subscriptions: [],
    globalStorageUri: tmpDir,
    globalState: {
      get: () => undefined,
      update: async () => {}
    }
  };

  const runtime = activateAgentHud(context);
  
  // Test case 1: Successful hydration from cache
  const testThread = {
    provider: "claude",
    id: "session-123",
    title: "Cached Claude Thread",
    status: "recent",
    updatedAt: new Date().toISOString()
  };
  
  const cacheDir = path.join(tmpDir, "agenthud", "index");
  await fs.promises.mkdir(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, "claude-summaries.json");
  const cachePayload = {
    schema_version: 1,
    provider: "claude",
    generated_at: new Date().toISOString(),
    summaries: [testThread]
  };
  await fs.promises.writeFile(cacheFile, JSON.stringify(cachePayload), "utf8");

  // Initial state check
  assert.strictEqual(runtime.claudeCacheRead, false);
  assert.strictEqual(runtime.state.claude.threads.length, 0);

  // Trigger hydration
  await runtime.hydrateClaudeFromCache();

  assert.strictEqual(runtime.claudeCacheRead, true);
  assert.strictEqual(runtime.state.claude.threads.length, 1);
  assert.strictEqual(runtime.state.claude.threads[0].title, "Cached Claude Thread");
  assert.strictEqual(runtime.state.claude.meta.cache.hydrated, true);
  assert.strictEqual(runtime.state.claude.meta.cache.stale, true);

  // Test case 2: Skipping when claudeCacheRead is already true
  runtime.state.claude.threads = [];
  await runtime.hydrateClaudeFromCache();
  assert.strictEqual(runtime.state.claude.threads.length, 0, "Should skip if already read");

  // Test case 3: Handling read error
  runtime.claudeCacheRead = false;
  const originalRead = runtime.summaryCache.readProviderSummaries;
  runtime.summaryCache.readProviderSummaries = async () => { throw new Error("Disk Failure"); };
  
  await runtime.hydrateClaudeFromCache();
  assert.strictEqual(runtime.claudeCacheRead, true);
  assert.strictEqual(runtime.state.claude.threads.length, 0);
  assert.strictEqual(runtime.state.claude.meta.cache.readError, "Disk Failure", "Should capture read error");
  
  runtime.summaryCache.readProviderSummaries = originalRead;

  console.log("Claude hydration tests passed!");
  
  // Cleanup
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
