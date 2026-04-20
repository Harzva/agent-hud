"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  CACHE_SCHEMA_VERSION,
  providerCachePath,
  readProviderSummaries,
  writeProviderSummaries
} = require("./summary-cache");

async function run() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-cache-"));
  const thread = {
    provider: "codex",
    id: "thread-1",
    title: "Cached thread",
    status: "recent",
    updatedAt: "2026-04-19T00:00:00.000Z"
  };

  const missing = await readProviderSummaries(root, "codex");
  assert.equal(missing, null);

  const written = await writeProviderSummaries(root, "codex", [thread], { source: "fixture" });
  assert.equal(written.count, 1);
  assert.equal(written.path, providerCachePath(root, "codex"));

  const cached = await readProviderSummaries(root, "codex");
  assert.equal(cached.provider, "codex");
  assert.equal(cached.threads.length, 1);
  assert.equal(cached.threads[0].title, "Cached thread");
  assert.equal(cached.meta.source, "fixture");

  const raw = JSON.parse(await fs.promises.readFile(providerCachePath(root, "codex"), "utf8"));
  assert.equal(raw.schema_version, CACHE_SCHEMA_VERSION);
  assert.equal(raw.provider, "codex");
  assert.equal(raw.summaries.length, 1);

  await fs.promises.writeFile(providerCachePath(root, "codex"), "{not json", "utf8");
  assert.equal(await readProviderSummaries(root, "codex"), null);

  console.log("summary cache fixture OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
