"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { normalizeSourceManifestEntry } = require("../json-storage");
const { normalizeThreadStatus } = require("../provider-contract");
const { normalizeSearchQuery, threadMatchesSearchQuery } = require("../search-core");
const { resolveClaudeListSourceScanCap } = require("../performance-budget");

const CLAUDE_PARSE_CACHE_SCHEMA_VERSION = 2;
const CLAUDE_PARSE_CACHE_FILE = "claude-parse-cache.json";
const DEFAULT_LIMIT = 500;
const KNOWN_HIDDEN_TYPES = new Set(["permission-mode", "file-history-snapshot", "last-prompt", "system"]);

function createClaudeProvider(options = {}) {
  const projectsRoot = options.projectsRoot || path.join(os.homedir(), ".claude", "projects");
  const cacheRoot = options.cacheRoot || options.globalStorageUri || projectsRoot;
  return {
    id: "claude",
    async discoverSources(discoverOptions = {}) {
      return discoverClaudeSources({ projectsRoot, ...discoverOptions });
    },
    async parseSession(file, parseOptions = {}) {
      return parseClaudeSession(file, { projectsRoot, ...parseOptions });
    },
    async listThreads(listOptions = {}) {
      return listClaudeThreads({
        projectsRoot,
        cacheRoot,
        ...listOptions
      });
    },
    async getThreadDetail(threadId, detailOptions = {}) {
      return getClaudeThreadDetail(threadId, {
        projectsRoot,
        ...detailOptions
      });
    },
    async buildSummaryIndex(indexOptions = {}) {
      return buildClaudeSummaryIndex({
        projectsRoot,
        cacheRoot,
        ...indexOptions
      });
    }
  };
}

async function discoverClaudeSources(options = {}) {
  const projectsRoot = options.projectsRoot || path.join(os.homedir(), ".claude", "projects");
  const includeSubagents = options.includeSubagents === true;
  const root = path.resolve(String(projectsRoot || ""));
  const errors = [];
  const sources = [];
  const subagentSources = [];

  let rootStat;
  try {
    rootStat = await fs.promises.stat(root);
  } catch (_error) {
    return discoveryResult(root, sources, subagentSources, errors);
  }
  if (!rootStat.isDirectory()) {
    return discoveryResult(root, sources, subagentSources, errors);
  }

  const files = [];
  await walk(root, files, errors);

  for (const file of files) {
    const source = await sourceFromFile(root, file);
    if (!source) {
      continue;
    }
    if (source.isSubagent) {
      subagentSources.push(source);
      if (includeSubagents) {
        sources.push(source);
      }
    } else {
      sources.push(source);
    }
  }

  sources.sort(compareSources);
  subagentSources.sort(compareSources);
  return discoveryResult(root, sources, subagentSources, errors);
}

async function walk(dir, files, errors) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (error) {
    errors.push(sourceError(dir, "read_dir_error", error));
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, files, errors);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }
}

async function sourceFromFile(root, file) {
  let stat;
  try {
    stat = await fs.promises.stat(file);
  } catch (_error) {
    return null;
  }

  const relative = path.relative(root, file);
  const segments = relative.split(path.sep).filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  const projectDir = path.join(root, segments[0]);
  const sessionId = sessionIdFromFile(file);
  if (!sessionId) {
    return null;
  }
  const cwd = decodeProjectCwd(segments[0]);
  const projectLabel = projectLabelFromCwd(cwd, segments[0]);
  const isSubagent = segments.includes("subagents");
  const source = {
    provider: "claude",
    projectDir,
    path: file,
    jsonlPath: file,
    sessionId,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    mtime: stat.mtime.toISOString(),
    projectLabel,
    cwd,
    isSubagent,
    manifestEntry: normalizeSourceManifestEntry({
      provider: "claude",
      path: file,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      cacheKey: `${file}:${stat.size}:${Math.trunc(stat.mtimeMs)}`,
      parseStatus: "unknown"
    })
  };
  return source;
}

async function parseClaudeSession(file, options = {}) {
  const source = options.source || await sourceFromFile(
    path.resolve(String(options.projectsRoot || path.join(os.homedir(), ".claude", "projects"))),
    file
  );
  if (!source) {
    return null;
  }

  let raw;
  try {
    raw = await fs.promises.readFile(file, "utf8");
  } catch (error) {
    return {
      thread: baseClaudeThread(source),
      messages: [],
      meta: {
        sourcePath: file,
        hiddenRecords: {},
        errors: [sourceError(file, "read_error", error)],
        drift: { unknownRecordTypes: {}, totalUnknownRecords: 0, formatVersion: undefined, fallbackCount: 0 }
      }
    };
  }

  const messages = [];
  const hiddenRecords = {};
  const errors = [];
  const unknownRecordTypes = {};
  let fmtVersion = "";
  let fallbackCount = 0;
  let createdAt = "";
  let updatedAt = source.mtime;
  let title = "";
  let previewFirstUser = "";
  let previewLastAssistant = "";
  let cwd = source.cwd;
  let projectLabel = source.projectLabel;
  let model = "";

  const lines = raw.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      errors.push(sourceError(file, "malformed_json", error, index + 1));
      continue;
    }

    const timestamp = toIso(record.timestamp || record.created_at || record.updated_at);
    if (timestamp) {
      createdAt = createdAt || timestamp;
      updatedAt = laterIso(updatedAt, timestamp);
    }

    cwd = extractCwd(record) || cwd;
    projectLabel = cleanString(record.project_label) || projectLabel;
    model = extractModel(record) || model;
    fmtVersion = cleanString(record.version || record.schema_version || record.format_version) || fmtVersion;

    const normalized = normalizeClaudeRecord(record, timestamp);
    if (!normalized.visible) {
      hiddenRecords[normalized.kind] = (hiddenRecords[normalized.kind] || 0) + 1;
      if (normalized.unrecognized) {
        unknownRecordTypes[normalized.kind] = (unknownRecordTypes[normalized.kind] || 0) + 1;
      }
      if (normalized.fallback) {
        fallbackCount += 1;
      }
      continue;
    }

    for (const message of normalized.messages) {
      messages.push(message);
      if (message.role === "user" && !previewFirstUser) {
        previewFirstUser = message.text;
        title = title || message.text;
      }
      if (message.role === "assistant") {
        previewLastAssistant = message.text;
      }
    }
  }

  const preview = truncate([previewFirstUser, previewLastAssistant].filter(Boolean).join("\n"), 320);
  const thread = {
    ...baseClaudeThread(source),
    title: truncate(title || projectLabel || source.sessionId, 240) || source.sessionId,
    projectLabel: projectLabel || source.projectLabel || undefined,
    cwd: cwd || undefined,
    createdAt: createdAt || undefined,
    updatedAt: updatedAt || undefined,
    model: model || undefined,
    messageCount: messages.length,
    preview: preview || undefined,
    status: normalizeThreadStatus("unknown")
  };

  const totalUnknownRecords = Object.values(unknownRecordTypes).reduce((sum, c) => sum + c, 0);
  const drift = {
    unknownRecordTypes,
    totalUnknownRecords,
    formatVersion: fmtVersion || undefined,
    fallbackCount
  };

  return {
    thread,
    messages,
    meta: {
      sourcePath: file,
      hiddenRecords,
      errors,
      drift
    }
  };
}

async function buildClaudeSummaryIndex(options = {}) {
  const projectsRoot = options.projectsRoot || path.join(os.homedir(), ".claude", "projects");
  const cacheRoot = options.cacheRoot || options.globalStorageUri || projectsRoot;
  const forceRebuild = options.forceRebuild === true;

  const discovery = await discoverClaudeSources({ projectsRoot });
  const allSources = discovery.sources;
  const sourceScanCap = resolveClaudeListSourceScanCap(options);
  const headSources = allSources.slice(0, Math.min(sourceScanCap, allSources.length));
  const tailSources = allSources.slice(headSources.length);
  const listScanTruncated = tailSources.length > 0;

  const cacheFile = claudeParseCachePath(cacheRoot);
  const cachePayload = forceRebuild ? null : await readClaudeParseCache(cacheFile);
  const cacheByPath = new Map(
    Array.isArray(cachePayload?.entries)
      ? cachePayload.entries.map((entry) => [entry.path, entry])
      : []
  );
  const summaries = [];
  const nextEntries = [];

  let parsedCount = 0;
  let reusedCount = 0;
  let invalidatedCount = 0;
  let parserErrorCount = 0;
  let tailRestoredFromCache = 0;

  for (const source of headSources) {
    const cacheKey = cacheKeyForSource(source);
    const cached = cacheByPath.get(source.path);
    const hasStaleEntry = Boolean(cached && cached.cacheKey !== cacheKey);
    if (hasStaleEntry) {
      invalidatedCount += 1;
    }

    if (cached && cached.cacheKey === cacheKey && cached.summary) {
      reusedCount += 1;
      const drift = cached.drift || emptyParserDrift();
      summaries.push({
        ...cached.summary,
        drift
      });
      nextEntries.push({
        ...cached,
        drift
      });
      continue;
    }

    parsedCount += 1;
    const parsed = await parseClaudeSession(source.path, { projectsRoot, source });
    if (!parsed || !parsed.thread) {
      parserErrorCount += 1;
      continue;
    }
    parserErrorCount += Array.isArray(parsed.meta?.errors) ? parsed.meta.errors.length : 0;
    summaries.push({
      ...parsed.thread,
      drift: parsed.meta?.drift || emptyParserDrift()
    });
    nextEntries.push({
      path: source.path,
      size: source.size,
      mtimeMs: source.mtimeMs,
      cacheKey,
      summary: parsed.thread,
      hiddenRecords: parsed.meta?.hiddenRecords || {},
      errorCount: Array.isArray(parsed.meta?.errors) ? parsed.meta.errors.length : 0,
      drift: parsed.meta?.drift || emptyParserDrift()
    });
  }

  const seenPaths = new Set(nextEntries.map((entry) => entry.path));
  for (const source of tailSources) {
    const cacheKey = cacheKeyForSource(source);
    const cached = cacheByPath.get(source.path);
    if (!cached || cached.cacheKey !== cacheKey || !cached.summary) {
      continue;
    }
    if (seenPaths.has(source.path)) {
      continue;
    }
    seenPaths.add(source.path);
    tailRestoredFromCache += 1;
    const drift = cached.drift || emptyParserDrift();
    summaries.push({
      ...cached.summary,
      drift
    });
    nextEntries.push({
      ...cached,
      drift
    });
  }

  const writePayload = {
    schema_version: CLAUDE_PARSE_CACHE_SCHEMA_VERSION,
    provider: "claude",
    updated_at: new Date().toISOString(),
    entries: nextEntries
  };
  await writeJsonAtomic(cacheFile, writePayload);

  return {
    provider: "claude",
    summaries,
    meta: {
      discovered: allSources.length,
      scannedSources: headSources.length,
      listSourceScanCap: sourceScanCap,
      listScanTruncated,
      tailRestoredFromCache,
      parsed: parsedCount,
      reused: reusedCount,
      invalidated: invalidatedCount,
      errors: parserErrorCount,
      cache: {
        path: cacheFile,
        rebuilt: forceRebuild || !cachePayload
      },
      discovery: discovery.meta
    }
  };
}

async function listClaudeThreads(options = {}) {
  const limit = positiveInt(options.limit, DEFAULT_LIMIT);
  const indexed = await buildClaudeSummaryIndex(options);
  const filtered = filterClaudeThreads(indexed.summaries, options);
  filtered.sort((left, right) => compareClaudeThreads(left, right, options.sort));
  const threads = filtered.slice(0, limit);

  return {
    provider: "claude",
    threads,
    meta: {
      ...(indexed.meta || {}),
      returned: threads.length
    }
  };
}

async function getClaudeThreadDetail(threadId, options = {}) {
  const wanted = cleanString(threadId);
  if (!wanted) {
    return null;
  }

  const projectsRoot = path.resolve(
    String(options.projectsRoot || path.join(os.homedir(), ".claude", "projects"))
  );
  const preferred = cleanString(options.preferredSourcePath);
  if (preferred) {
    try {
      const st = await fs.promises.stat(preferred);
      if (st.isFile()) {
        const source = await sourceFromFile(projectsRoot, preferred);
        if (source) {
          const parsed = await parseClaudeSession(preferred, { projectsRoot, source });
          if (parsed && parsed.thread && parsed.thread.id === wanted) {
            return {
              provider: "claude",
              thread: parsed.thread,
              messages: parsed.messages,
              events: [],
              capabilities: claudeCapabilities(),
              meta: {
                sourcePath: source.path,
                projectDir: source.projectDir,
                hiddenRecords: parsed.meta?.hiddenRecords || {},
                errors: parsed.meta?.errors || [],
                drift: parsed.meta?.drift,
                detailResolvedVia: "preferredSourcePath"
              }
            };
          }
        }
      }
    } catch (_error) {
      // Fall back to full discovery.
    }
  }

  const discovery = await discoverClaudeSources({
    projectsRoot: options.projectsRoot,
    includeSubagents: options.includeSubagents === true
  });
  const source = discovery.sources.find((item) => item.sessionId === wanted);
  if (!source) {
    return null;
  }

  const parsed = await parseClaudeSession(source.path, {
    projectsRoot: options.projectsRoot,
    source
  });
  if (!parsed) {
    return null;
  }
  return {
    provider: "claude",
    thread: parsed.thread,
    messages: parsed.messages,
    events: [],
    capabilities: claudeCapabilities(),
    meta: {
      sourcePath: source.path,
      projectDir: source.projectDir,
      hiddenRecords: parsed.meta?.hiddenRecords || {},
      errors: parsed.meta?.errors || [],
      drift: parsed.meta?.drift
    }
  };
}

function filterClaudeThreads(threads, options) {
  const queryNorm = normalizeSearchQuery(cleanString(options.query));
  const wantedStatus = normalizeStatusFilter(options.status);
  const wantedProject = cleanString(options.project).toLowerCase();

  return (Array.isArray(threads) ? threads : []).filter((thread) => {
    const status = normalizeThreadStatus(thread.status);
    if (wantedStatus !== "all" && status !== wantedStatus) {
      return false;
    }

    if (wantedProject) {
      const projectCorpus = [thread.projectLabel, thread.cwd, thread.sourcePath]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!projectCorpus.includes(wantedProject)) {
        return false;
      }
    }

    if (!queryNorm) {
      return true;
    }
    return threadMatchesSearchQuery(thread, queryNorm);
  });
}

function compareClaudeThreads(left, right, sort) {
  const mode = cleanString(sort) || "updated_desc";
  if (mode === "title_asc") {
    return cleanString(left.title || left.id).localeCompare(cleanString(right.title || right.id));
  }
  const leftMs = Date.parse(left.updatedAt || "") || 0;
  const rightMs = Date.parse(right.updatedAt || "") || 0;
  if (mode === "updated_asc") {
    return leftMs - rightMs;
  }
  return rightMs - leftMs;
}

function normalizeStatusFilter(value) {
  const candidate = cleanString(value);
  if (!candidate || candidate === "all") {
    return "all";
  }
  return normalizeThreadStatus(candidate);
}

function claudeCapabilities() {
  return {
    openNative: true,
    rename: false,
    archive: false,
    sendPrompt: false,
    liveLogs: false
  };
}

function claudeParseCachePath(root) {
  return path.join(storageRoot(root), "agenthud", "index", CLAUDE_PARSE_CACHE_FILE);
}

async function readClaudeParseCache(file) {
  let raw;
  try {
    raw = await fs.promises.readFile(file, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed
      || parsed.schema_version !== CLAUDE_PARSE_CACHE_SCHEMA_VERSION
      || parsed.provider !== "claude"
      || !Array.isArray(parsed.entries)
    ) {
      return null;
    }
    return {
      ...parsed,
      entries: parsed.entries.filter(isCacheEntry)
    };
  } catch (_error) {
    return null;
  }
}

function isCacheEntry(value) {
  return Boolean(
    value
    && typeof value === "object"
    && typeof value.path === "string"
    && Number.isFinite(Number(value.size))
    && Number.isFinite(Number(value.mtimeMs))
    && typeof value.cacheKey === "string"
    && value.summary
    && typeof value.summary === "object"
    && value.summary.provider === "claude"
    && typeof value.summary.id === "string"
    && typeof value.summary.title === "string"
  );
}

function emptyParserDrift() {
  return {
    unknownRecordTypes: {},
    totalUnknownRecords: 0,
    formatVersion: undefined,
    fallbackCount: 0
  };
}

function cacheKeyForSource(source) {
  return `${source.path}:${source.size}:${Math.trunc(source.mtimeMs)}`;
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

async function writeJsonAtomic(file, payload) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.promises.rename(tempFile, file);
}

function discoveryResult(root, sources, subagentSources, errors) {
  return {
    provider: "claude",
    projectsRoot: root,
    sources,
    subagentSources,
    meta: {
      discovered: sources.length,
      subagents: subagentSources.length,
      errors
    }
  };
}

function compareSources(a, b) {
  const left = Number(a.mtimeMs) || 0;
  const right = Number(b.mtimeMs) || 0;
  if (right !== left) {
    return right - left;
  }
  return String(a.path || "").localeCompare(String(b.path || ""));
}

function sessionIdFromFile(file) {
  return path.basename(String(file || ""), ".jsonl").trim();
}

function decodeProjectCwd(projectDirName) {
  const name = String(projectDirName || "").trim();
  if (!name) {
    return "";
  }
  if (name.startsWith("-")) {
    const parts = name.slice(1).split("-").filter(Boolean);
    return parts.length ? `/${parts.join("/")}` : "";
  }
  return name.replace(/-/g, "/");
}

function projectLabelFromCwd(cwd, fallback) {
  const normalized = String(cwd || "").replace(/\/+$/g, "");
  if (!normalized) {
    return fallback;
  }
  return path.basename(normalized) || normalized || fallback;
}

function baseClaudeThread(source) {
  return {
    provider: "claude",
    id: source.sessionId,
    title: source.projectLabel || source.sessionId,
    projectLabel: source.projectLabel || undefined,
    cwd: source.cwd || undefined,
    status: "unknown",
    updatedAt: source.mtime || undefined,
    sourcePath: source.path,
    preview: undefined
  };
}

function normalizeClaudeRecord(record, timestamp) {
  const type = cleanString(record.type).toLowerCase();
  const text = extractText(record.message?.content ?? record.content ?? record.text);

  if (type === "user" || type === "assistant" || type === "system") {
    if (isHiddenSystemRecord(type, text)) {
      return hiddenRecord(type || "system", false);
    }
    const role = type === "system" ? "system" : type;
    const messages = [];
    const blocks = extractMessageBlocks(record.message?.content ?? record.content);
    const textBlocks = blocks.filter((block) => block.type === "text" && block.text);
    if (textBlocks.length) {
      const merged = truncate(textBlocks.map((block) => block.text).join("\n"), 4000);
      if (merged) {
        messages.push({ role, text: merged, timestamp, kind: "message" });
      }
    } else if (text) {
      messages.push({ role, text: truncate(text, 4000), timestamp, kind: "message" });
    }
    for (const block of blocks) {
      if (block.type === "tool_use") {
        messages.push({
          role: "tool",
          text: truncate(`Tool use: ${block.name || "tool"}`, 4000),
          timestamp,
          kind: "tool_use"
        });
      }
      if (block.type === "tool_result" && block.text) {
        messages.push({
          role: "tool",
          text: truncate(block.text, 4000),
          timestamp,
          kind: "tool_result"
        });
      }
    }
    if (!messages.length) {
      return hiddenRecord(type || "message", true);
    }
    return { visible: true, kind: type || "message", messages };
  }

  if (type === "tool_use") {
    return visibleMessages(type, [{
      role: "tool",
      text: truncate(`Tool use: ${cleanString(record.name) || "tool"}`, 4000),
      timestamp,
      kind: "tool_use"
    }]);
  }

  if (type === "tool_result") {
    const resultText = extractText(record.message?.content ?? record.content ?? record.result);
    if (!resultText) {
      return hiddenRecord(type, true);
    }
    return visibleMessages(type, [{
      role: "tool",
      text: truncate(resultText, 4000),
      timestamp,
      kind: "tool_result"
    }]);
  }

  if (
    type === "permission-mode"
    || type === "file-history-snapshot"
    || type === "last-prompt"
  ) {
    return hiddenRecord(type, false);
  }

  return hiddenRecord(type || "unknown", true, true);
}

function visibleMessages(kind, messages) {
  return {
    visible: true,
    kind,
    messages,
    fallback: false
  };
}

function hiddenRecord(kind, fallback = false, unrecognized = false) {
  return {
    visible: false,
    kind: kind || "unknown",
    messages: [],
    fallback: Boolean(fallback),
    unrecognized: Boolean(unrecognized)
  };
}

function extractMessageBlocks(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const type = cleanString(item.type).toLowerCase() || "text";
    if (type === "text") {
      return { type, text: cleanString(item.text || item.content) };
    }
    if (type === "tool_use") {
      return { type, name: cleanString(item.name) };
    }
    if (type === "tool_result") {
      return { type, text: extractText(item.content || item.text || item.result) };
    }
    return null;
  }).filter(Boolean);
}

function extractText(value) {
  if (typeof value === "string") {
    return cleanString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).filter(Boolean).join("\n").trim();
  }
  if (value && typeof value === "object") {
    if (typeof value.text === "string") {
      return cleanString(value.text);
    }
    if (typeof value.content === "string" || Array.isArray(value.content)) {
      return extractText(value.content);
    }
    if (typeof value.message === "string") {
      return cleanString(value.message);
    }
    if (typeof value.prompt === "string") {
      return cleanString(value.prompt);
    }
    if (typeof value.result === "string" || Array.isArray(value.result)) {
      return extractText(value.result);
    }
  }
  return "";
}

function extractCwd(record) {
  return cleanString(
    record.cwd
    || record.message?.cwd
    || record.meta?.cwd
    || record.session?.cwd
  );
}

function extractModel(record) {
  return cleanString(
    record.model
    || record.version
    || record.meta?.model
    || record.meta?.version
    || record.session?.model
    || record.session?.version
  );
}

function isHiddenSystemRecord(type, text) {
  if (type !== "system") {
    return false;
  }
  const value = text.toLowerCase();
  return value.startsWith("reminder:")
    || value.includes("file-history")
    || value.includes("permission mode")
    || value.includes("plugin routing");
}

function laterIso(left, right) {
  const leftMs = Date.parse(left || "") || 0;
  const rightMs = Date.parse(right || "") || 0;
  return rightMs > leftMs ? right : left;
}

function truncate(value, maxLength) {
  const text = cleanString(value).replace(/\s+\n/g, "\n");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function toIso(value) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sourceError(file, code, error, line) {
  return {
    provider: "claude",
    path: file,
    code,
    line,
    message: error && error.message ? error.message : code
  };
}

module.exports = {
  createClaudeProvider,
  discoverClaudeSources,
  parseClaudeSession,
  buildClaudeSummaryIndex,
  listClaudeThreads,
  getClaudeThreadDetail,
  claudeCapabilities,
  claudeParseCachePath,
  decodeProjectCwd,
  sessionIdFromFile
};
