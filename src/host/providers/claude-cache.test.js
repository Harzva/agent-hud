"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildClaudeSummaryIndex,
  claudeParseCachePath
} = require("./claude");

async function run() {
  const fixtureRoot = path.resolve(__dirname, "../../../test/fixtures/claude/projects");
  const cacheRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-claude-cache-"));

  const cold = await buildClaudeSummaryIndex({ projectsRoot: fixtureRoot, cacheRoot });
  assert.equal(cold.provider, "claude");
  assert.equal(cold.summaries.length, 6);
  assert.equal(cold.meta.discovered, 6);
  assert.equal(cold.meta.parsed, 6);
  assert.equal(cold.meta.reused, 0);
  assert.equal(cold.meta.invalidated, 0);
  assert.equal(typeof cold.meta.errors, "number");
  assert.equal(cold.meta.cache.rebuilt, true);
  assert.equal(cold.meta.cache.path, claudeParseCachePath(cacheRoot));

  const warm = await buildClaudeSummaryIndex({ projectsRoot: fixtureRoot, cacheRoot });
  assert.equal(warm.summaries.length, 6);
  assert.equal(warm.meta.parsed, 0);
  assert.equal(warm.meta.reused, 6);
  assert.equal(warm.meta.invalidated, 0);
  assert.equal(warm.meta.cache.rebuilt, false);

  const fileToChange = path.join(fixtureRoot, "-home-user-alpha-project", "session-second.jsonl");
  const original = await fs.promises.readFile(fileToChange, "utf8");
  await fs.promises.writeFile(fileToChange, `${original}\n{"type":"assistant","message":{"content":"delta"}}\n`, "utf8");
  try {
    const invalidated = await buildClaudeSummaryIndex({ projectsRoot: fixtureRoot, cacheRoot });
    assert.equal(invalidated.meta.parsed, 1);
    assert.equal(invalidated.meta.reused, 5);
    assert.equal(invalidated.meta.invalidated, 1);
  } finally {
    await fs.promises.writeFile(fileToChange, original, "utf8");
  }

  const cachePath = claudeParseCachePath(cacheRoot);
  await fs.promises.writeFile(cachePath, "{broken json", "utf8");
  const rebuilt = await buildClaudeSummaryIndex({ projectsRoot: fixtureRoot, cacheRoot });
  assert.equal(rebuilt.meta.parsed, 6);
  assert.equal(rebuilt.meta.reused, 0);
  assert.equal(rebuilt.meta.cache.rebuilt, true);

  const forceRebuild = await buildClaudeSummaryIndex({ projectsRoot: fixtureRoot, cacheRoot, forceRebuild: true });
  assert.equal(forceRebuild.meta.parsed, 6);
  assert.equal(forceRebuild.meta.reused, 0);
  assert.equal(forceRebuild.meta.cache.rebuilt, true);

  const leftovers = (await fs.promises.readdir(path.dirname(cachePath))).filter((name) => name.endsWith(".tmp"));
  assert.deepStrictEqual(leftovers, []);

  const scanCapRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-claude-scan-cap-"));
  const fullIndex = await buildClaudeSummaryIndex({ projectsRoot: fixtureRoot, cacheRoot: scanCapRoot });
  assert.equal(fullIndex.summaries.length, 6);
  assert.equal(fullIndex.meta.listScanTruncated, false);

  const cappedWarm = await buildClaudeSummaryIndex({
    projectsRoot: fixtureRoot,
    cacheRoot: scanCapRoot,
    maxSourcesScan: 2
  });
  assert.equal(cappedWarm.meta.discovered, 6);
  assert.equal(cappedWarm.meta.scannedSources, 2);
  assert.equal(cappedWarm.meta.listScanTruncated, true);
  assert.equal(cappedWarm.meta.tailRestoredFromCache, 4);
  assert.equal(cappedWarm.summaries.length, 6);
  assert.equal(cappedWarm.meta.reused, 2);
  assert.equal(cappedWarm.meta.parsed, 0);

  const capColdRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-claude-scan-cold-"));
  const cappedCold = await buildClaudeSummaryIndex({
    projectsRoot: fixtureRoot,
    cacheRoot: capColdRoot,
    maxSourcesScan: 2
  });
  assert.equal(cappedCold.summaries.length, 2);
  assert.equal(cappedCold.meta.tailRestoredFromCache, 0);
  assert.equal(cappedCold.meta.parsed, 2);

  console.log("claude cache fixture OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

