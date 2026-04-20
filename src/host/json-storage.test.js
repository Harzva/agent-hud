"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  STORAGE_SCHEMA_VERSION,
  createJsonStorage,
  normalizeSourceManifestEntry,
  providerSummaryPath,
  readVersionedJson,
  sourceManifestPath,
  stateJsonPath,
  writeVersionedJson
} = require("./json-storage");

async function run() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-storage-"));
  const storage = createJsonStorage({ fsPath: root });

  assert.equal(storage.providerSummaryPath("codex"), providerSummaryPath(root, "codex"));
  assert.equal(storage.providerSummaryPath("claude"), path.join(root, "agenthud", "index", "claude-summaries.json"));
  assert.equal(storage.sourceManifestPath(), sourceManifestPath(root));
  assert.equal(stateJsonPath(root), path.join(root, "agenthud", "state.json"));

  const file = path.join(root, "agenthud", "fixture.json");
  const payload = {
    schema_version: STORAGE_SCHEMA_VERSION,
    generated_at: "2026-04-19T00:00:00.000Z",
    value: "ok"
  };
  const written = await writeVersionedJson(file, payload);
  assert.equal(written.path, file);
  assert.match(await fs.promises.readFile(file, "utf8"), /\n$/);
  assert.deepStrictEqual(await readVersionedJson(file), payload);

  await fs.promises.writeFile(file, "{not json", "utf8");
  assert.equal(await readVersionedJson(file), null);

  await fs.promises.writeFile(file, JSON.stringify({ schema_version: 99 }), "utf8");
  assert.equal(await readVersionedJson(file), null);

  const entry = normalizeSourceManifestEntry({
    provider: "codex",
    path: " /tmp/source.jsonl ",
    size: 42,
    mtimeMs: 1234,
    cacheKey: "cache-key",
    parseStatus: "ok",
    lastError: ""
  });
  assert.deepStrictEqual(entry, {
    provider: "codex",
    path: "/tmp/source.jsonl",
    size: 42,
    mtimeMs: 1234,
    cacheKey: "cache-key",
    parseStatus: "ok",
    lastError: ""
  });
  assert.equal(normalizeSourceManifestEntry({ provider: "codex" }), null);

  const manifestWrite = await storage.writeSourceManifest([entry, { provider: "claude", path: "/tmp/claude.jsonl" }], { source: "fixture" });
  assert.equal(manifestWrite.path, sourceManifestPath(root));
  assert.equal(manifestWrite.count, 2);
  const manifest = await storage.readSourceManifest();
  assert.equal(manifest.schemaVersion, STORAGE_SCHEMA_VERSION);
  assert.equal(manifest.meta.source, "fixture");
  assert.equal(manifest.entries.length, 2);
  assert.equal(manifest.entries[1].parseStatus, "unknown");

  const leftovers = (await fs.promises.readdir(path.dirname(file))).filter((name) => name.endsWith(".tmp"));
  assert.deepStrictEqual(leftovers, []);

  console.log("json storage fixture OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

