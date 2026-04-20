"use strict";

const {
  STORAGE_SCHEMA_VERSION,
  providerSummaryPath,
  readVersionedJson,
  storageRoot,
  writeVersionedJson
} = require("./json-storage");
const { capThreadSummariesForCache } = require("./performance-budget");

const CACHE_SCHEMA_VERSION = STORAGE_SCHEMA_VERSION;

function createSummaryCache(globalStorageUri) {
  const root = storageRoot(globalStorageUri);
  return {
    root,
    async readProviderSummaries(provider) {
      return readProviderSummaries(root, provider);
    },
    async writeProviderSummaries(provider, threads, meta = {}, writeOptions = {}) {
      return writeProviderSummaries(root, provider, threads, meta, writeOptions);
    }
  };
}

async function readProviderSummaries(root, provider) {
  const file = providerCachePath(root, provider);
  const parsed = await readVersionedJson(file, {
    schemaVersion: CACHE_SCHEMA_VERSION,
    validate: (payload) => payload.provider === provider
  });
  if (!parsed) {
    return null;
  }

  return {
    provider,
    generatedAt: typeof parsed.generated_at === "string" ? parsed.generated_at : "",
    threads: Array.isArray(parsed.summaries) ? parsed.summaries.filter(isThreadSummary) : [],
    meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
    path: file
  };
}

async function writeProviderSummaries(root, provider, threads, meta = {}, writeOptions = {}) {
  const file = providerCachePath(root, provider);
  const filtered = Array.isArray(threads) ? threads.filter(isThreadSummary) : [];
  const { threads: cappedSummaries, truncated, appliedCap } =
    writeOptions.maxSummaries != null && writeOptions.maxSummaries > 0
      ? capThreadSummariesForCache(filtered, writeOptions.maxSummaries)
      : capThreadSummariesForCache(filtered);
  const payload = {
    schema_version: CACHE_SCHEMA_VERSION,
    provider,
    generated_at: new Date().toISOString(),
    meta: {
      ...meta,
      ...(truncated
        ? {
            cacheWriteTruncated: true,
            cacheWriteCap: appliedCap,
            cacheWriteOmitted: filtered.length - cappedSummaries.length
          }
        : {})
    },
    summaries: cappedSummaries
  };
  await writeVersionedJson(file, payload);
  return {
    path: file,
    count: payload.summaries.length,
    generatedAt: payload.generated_at
  };
}

function providerCachePath(root, provider) {
  return providerSummaryPath(root, provider);
}

function isThreadSummary(value) {
  return Boolean(
    value
    && typeof value === "object"
    && value.provider
    && typeof value.id === "string"
    && typeof value.title === "string"
  );
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  createSummaryCache,
  readProviderSummaries,
  writeProviderSummaries,
  providerCachePath
};
