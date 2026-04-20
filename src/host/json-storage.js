"use strict";

const fs = require("fs");
const path = require("path");

const STORAGE_SCHEMA_VERSION = 1;
const SOURCE_MANIFEST_FILE = "source-manifest.json";
const PROVIDER_SUMMARY_FILES = Object.freeze({
  codex: "codex-summaries.json",
  claude: "claude-summaries.json"
});
const SOURCE_PARSE_STATUSES = Object.freeze(["ok", "skipped", "error", "unknown"]);

function createJsonStorage(globalStorageUri) {
  const root = storageRoot(globalStorageUri);
  return {
    root,
    providerSummaryPath(provider) {
      return providerSummaryPath(root, provider);
    },
    sourceManifestPath() {
      return sourceManifestPath(root);
    },
    async readVersionedJson(file, options = {}) {
      return readVersionedJson(file, options);
    },
    async writeVersionedJson(file, payload) {
      return writeVersionedJson(file, payload);
    },
    async readSourceManifest() {
      return readSourceManifest(root);
    },
    async writeSourceManifest(entries, meta = {}) {
      return writeSourceManifest(root, entries, meta);
    }
  };
}

async function readVersionedJson(file, options = {}) {
  const schemaVersion = positiveInt(options.schemaVersion, STORAGE_SCHEMA_VERSION);
  let raw;
  try {
    raw = await fs.promises.readFile(file, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    if (options.tolerant !== false) {
      return null;
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (options.tolerant !== false) {
      return null;
    }
    throw error;
  }

  if (!parsed || parsed.schema_version !== schemaVersion) {
    return null;
  }
  if (typeof options.validate === "function" && !options.validate(parsed)) {
    return null;
  }
  return parsed;
}

async function writeVersionedJson(file, payload) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.promises.rename(tempFile, file);
  return {
    path: file,
    bytes: Buffer.byteLength(`${JSON.stringify(payload, null, 2)}\n`, "utf8")
  };
}

async function readSourceManifest(root) {
  const file = sourceManifestPath(root);
  const parsed = await readVersionedJson(file, {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    validate: (payload) => Array.isArray(payload.entries)
  });
  if (!parsed) {
    return null;
  }
  return {
    schemaVersion: parsed.schema_version,
    updatedAt: typeof parsed.updated_at === "string" ? parsed.updated_at : "",
    meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
    entries: parsed.entries.map(normalizeSourceManifestEntry).filter(Boolean),
    path: file
  };
}

async function writeSourceManifest(root, entries, meta = {}, now = () => new Date()) {
  const file = sourceManifestPath(root);
  const payload = {
    schema_version: STORAGE_SCHEMA_VERSION,
    updated_at: toIso(now()),
    meta: meta && typeof meta === "object" ? meta : {},
    entries: Array.isArray(entries) ? entries.map(normalizeSourceManifestEntry).filter(Boolean) : []
  };
  await writeVersionedJson(file, payload);
  return {
    path: file,
    count: payload.entries.length,
    updatedAt: payload.updated_at
  };
}

function providerSummaryPath(root, provider) {
  const fileName = PROVIDER_SUMMARY_FILES[provider];
  if (!fileName) {
    throw new Error(`Unsupported provider cache: ${provider}`);
  }
  return path.join(storageRoot(root), "agenthud", "index", fileName);
}

function sourceManifestPath(root) {
  return path.join(storageRoot(root), "agenthud", "index", SOURCE_MANIFEST_FILE);
}

function stateJsonPath(root) {
  return path.join(storageRoot(root), "agenthud", "state.json");
}

function storageRoot(globalStorageUri) {
  if (typeof globalStorageUri === "string") {
    return globalStorageUri;
  }
  if (globalStorageUri && typeof globalStorageUri.fsPath === "string") {
    return globalStorageUri.fsPath;
  }
  throw new Error("A global storage path is required.");
}

function normalizeSourceManifestEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const provider = cleanString(entry.provider);
  const sourcePath = cleanString(entry.path);
  if (!provider || !sourcePath) {
    return null;
  }
  const parseStatus = SOURCE_PARSE_STATUSES.includes(entry.parseStatus)
    ? entry.parseStatus
    : "unknown";
  return {
    provider,
    path: sourcePath,
    size: nonNegativeNumber(entry.size),
    mtimeMs: nonNegativeNumber(entry.mtimeMs),
    cacheKey: cleanString(entry.cacheKey),
    parseStatus,
    lastError: cleanString(entry.lastError)
  };
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

module.exports = {
  STORAGE_SCHEMA_VERSION,
  SOURCE_PARSE_STATUSES,
  createJsonStorage,
  readVersionedJson,
  writeVersionedJson,
  readSourceManifest,
  writeSourceManifest,
  providerSummaryPath,
  sourceManifestPath,
  stateJsonPath,
  storageRoot,
  normalizeSourceManifestEntry
};

