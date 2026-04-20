"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline/promises");
const {
  resolveCodexListRolloutScanCap,
  resolveCodexDetailParseCap
} = require("../performance-budget");

const DEFAULT_LIMIT = 500;
const DETAIL_MESSAGE_LIMIT = 400;
const EVENT_LIMIT = 80;
const DEFAULT_LIST_PARSE_CONCURRENCY = Math.min(
  8,
  Math.max(2, Array.isArray(os.cpus()) ? os.cpus().length : 4)
);
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const KNOWN_RECORD_TYPES = new Set(["session_meta", "response_item", "event_msg"]);

function createCodexProvider(options = {}) {
  const codexHome = options.codexHome || path.join(os.homedir(), ".codex");
  const sessionsDir = options.sessionsDir || path.join(codexHome, "sessions");
  const now = typeof options.now === "function" ? options.now : () => Date.now();

  return {
    id: "codex",
    async listThreads(listOptions = {}) {
      return listCodexThreads({ sessionsDir, now, ...listOptions });
    },
    async getThreadDetail(threadId, detailOptions = {}) {
      return getCodexThreadDetail(threadId, { sessionsDir, now, ...detailOptions });
    }
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  if (!items.length) {
    return [];
  }
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Math.min(positiveInt(concurrency, 1), items.length);

  async function worker() {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) {
        return;
      }
      results[i] = await mapper(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

// Text search is applied in the webview (getVisibleThreads + search-core), not in this call — no query option.
async function listCodexThreads(options = {}) {
  const sessionsDir = options.sessionsDir || path.join(os.homedir(), ".codex", "sessions");
  const limit = positiveInt(options.limit, DEFAULT_LIMIT);
  const parseConcurrency = positiveInt(options.parseConcurrency, DEFAULT_LIST_PARSE_CONCURRENCY);
  const allFiles = await findRolloutFiles(sessionsDir);
  const listScanCap = resolveCodexListRolloutScanCap(options);
  const files =
    allFiles.length > listScanCap ? allFiles.slice(0, listScanCap) : allFiles;
  const listScanTruncated = files.length < allFiles.length;
  const skipped = [];
  const threads = [];

  const parsedList = await mapWithConcurrency(files, parseConcurrency, async (file) =>
    parseCodexRollout(file, { detail: false, now: options.now })
  );

  for (const parsed of parsedList) {
    if (parsed.errors.length) {
      skipped.push(...parsed.errors);
    }
    if (parsed.thread) {
      threads.push({
        ...parsed.thread,
        drift: parsed.drift
      });
    }
  }

  threads.sort((a, b) => {
    const left = Date.parse(a.updatedAt || "") || 0;
    const right = Date.parse(b.updatedAt || "") || 0;
    return right - left;
  });

  return {
    provider: "codex",
    threads: threads.slice(0, limit),
    meta: {
      sourceDir: sessionsDir,
      discovered: allFiles.length,
      scannedRollouts: files.length,
      listScanCap,
      listScanTruncated,
      returned: Math.min(threads.length, limit),
      skipped: skipped.length,
      errors: skipped,
      parseConcurrency
    }
  };
}

async function getCodexThreadDetail(threadId, options = {}) {
  const sessionsDir = options.sessionsDir || path.join(os.homedir(), ".codex", "sessions");
  const wanted = String(threadId || "").trim();
  if (!wanted) {
    return null;
  }

  const preferred = cleanString(options.preferredSourcePath);
  if (preferred) {
    try {
      const st = await fs.promises.stat(preferred);
      if (st.isFile()) {
        const parsed = await parseCodexRollout(preferred, { detail: true, now: options.now });
        if (parsed.thread && parsed.thread.id === wanted) {
          return {
            provider: "codex",
            thread: parsed.thread,
            messages: parsed.messages,
            events: parsed.events,
            capabilities: codexCapabilities(),
            meta: {
              sourcePath: preferred,
              errors: parsed.errors,
              drift: parsed.drift,
              detailResolvedVia: "preferredSourcePath"
            }
          };
        }
      }
    } catch (_error) {
      // Fall back to directory scan.
    }
  }

  const files = await findRolloutFiles(sessionsDir);
  const candidates = files.filter((file) => {
    const id = sessionIdFromPath(file);
    return id === wanted || path.basename(file).includes(wanted);
  });
  const toTry = candidates.length ? candidates : files;
  const cap = resolveCodexDetailParseCap(options);
  const limited = toTry.length > cap ? toTry.slice(0, cap) : toTry;

  for (const file of limited) {
    const parsed = await parseCodexRollout(file, { detail: true, now: options.now });
    if (!parsed.thread || parsed.thread.id !== wanted) {
      continue;
    }
    return {
      provider: "codex",
      thread: parsed.thread,
      messages: parsed.messages,
      events: parsed.events,
      capabilities: codexCapabilities(),
      meta: {
        sourcePath: file,
        errors: parsed.errors,
        drift: parsed.drift
      }
    };
  }

  return null;
}

async function findRolloutFiles(sessionsDir) {
  const root = path.resolve(String(sessionsDir || ""));
  try {
    const stat = await fs.promises.stat(root);
    if (!stat.isDirectory()) {
      return [];
    }
  } catch (_error) {
    return [];
  }

  const files = [];
  await walk(root, files);
  const stats = await Promise.all(files.map(async (file) => {
    try {
      const stat = await fs.promises.stat(file);
      return { file, mtimeMs: stat.mtimeMs };
    } catch (_error) {
      return { file, mtimeMs: 0 };
    }
  }));
  return stats
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map((entry) => entry.file);
}

async function walk(dir, files) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (_error) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, files);
    } else if (entry.isFile() && /^rollout-.*\.jsonl$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
}

async function parseCodexRollout(file, options = {}) {
  const detail = options.detail === true;
  const errors = [];
  let stat;

  try {
    stat = await fs.promises.stat(file);
  } catch (error) {
    return {
      thread: null,
      messages: [],
      events: [],
      errors: [sourceError(file, "read_error", error)],
      drift: { unknownRecordTypes: {}, totalUnknownRecords: 0, formatVersion: undefined, fallbackCount: 0 }
    };
  }

  let threadId = sessionIdFromPath(file);
  let sessionMeta = {};
  let firstUserMessage = "";
  let latestAssistantMessage = "";
  let messageCount = 0;
  let totalRecords = 0;
  let fallbackCount = 0;
  let fmtVersion = "";
  const unknownRecordTypes = {};
  let createdAt;
  let updatedAt = stat.mtime;
  const messages = [];
  const events = [];
  const seenMessages = new Set();

  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  try {
    for await (const rawLine of rl) {
      lineNumber += 1;
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      let record;
      try {
        record = JSON.parse(line);
      } catch (error) {
        errors.push(sourceError(file, "malformed_json", error, lineNumber));
        continue;
      }

      const timestamp = normalizeTimestamp(record.timestamp);
      if (timestamp) {
        updatedAt = maxDate(updatedAt, timestamp);
      }

      const payload = record && typeof record.payload === "object" && record.payload
        ? record.payload
        : {};

      totalRecords += 1;
      fmtVersion = cleanString(record.version || record.schema_version || record.format_version) || fmtVersion;

      if (!KNOWN_RECORD_TYPES.has(record.type)) {
        const t = cleanString(record.type) || "unknown";
        unknownRecordTypes[t] = (unknownRecordTypes[t] || 0) + 1;
        fallbackCount += 1;
        continue;
      }

      if (record.type === "session_meta") {
        sessionMeta = payload;
        threadId = cleanString(payload.id) || threadId;
        createdAt = normalizeTimestamp(payload.timestamp) || timestamp || createdAt;
        continue;
      }

      if (record.type === "response_item") {
        const normalized = normalizeResponseItem(payload, timestamp);
        if (!normalized) {
          fallbackCount += 1;
          continue;
        }

        if (normalized.kind === "message") {
          if (normalized.role === "user" && !isEnvironmentContext(normalized.text)) {
            firstUserMessage = firstUserMessage || normalized.text;
          }
          if (normalized.role === "assistant") {
            latestAssistantMessage = normalized.text;
          }
          messageCount += 1;
          if (detail && !isEnvironmentContext(normalized.text)) {
            pushUniqueMessage(messages, normalized, seenMessages);
          }
        } else if (detail) {
          events.push({
            level: "info",
            text: normalized.text,
            timestamp: normalized.timestamp
          });
        }
        continue;
      }

      if (record.type === "event_msg") {
        const event = normalizeEventMessage(payload, timestamp);
        if (!event) {
          fallbackCount += 1;
          continue;
        }
        if (payload.type === "user_message" && event.text && !firstUserMessage) {
          firstUserMessage = event.text;
        }
        if (detail) {
          events.push(event);
        }
      }
    }
  } catch (error) {
    return {
      thread: null,
      messages: [],
      events: [],
      errors: [sourceError(file, "read_error", error)],
      drift: { unknownRecordTypes: {}, totalUnknownRecords: 0, formatVersion: undefined, fallbackCount: 0 }
    };
  }

  if (!threadId) {
    return {
      thread: null,
      messages,
      events,
      errors: errors.concat(sourceError(file, "missing_thread_id")),
      drift: { unknownRecordTypes, totalUnknownRecords: Object.values(unknownRecordTypes).reduce((s, c) => s + c, 0), formatVersion: fmtVersion || undefined, fallbackCount }
    };
  }

  const fallbackCreatedAt = createdAt || stat.birthtime || stat.ctime || stat.mtime;
  const title = truncate(firstUserMessage || cleanString(sessionMeta.source) || threadId, 240);
  const preview = truncate([firstUserMessage, latestAssistantMessage].filter(Boolean).join("\n"), 320);
  const thread = {
    provider: "codex",
    id: threadId,
    title: title || threadId,
    cwd: cleanString(sessionMeta.cwd) || undefined,
    status: codexStatus(updatedAt, options.now),
    createdAt: toIso(fallbackCreatedAt),
    updatedAt: toIso(updatedAt),
    model: cleanString(sessionMeta.model) || undefined,
    sourcePath: file,
    messageCount,
    preview: preview || undefined
  };

  const totalUnknownRecords = Object.values(unknownRecordTypes).reduce((s, c) => s + c, 0);
  const drift = {
    unknownRecordTypes,
    totalUnknownRecords,
    formatVersion: fmtVersion || undefined,
    fallbackCount
  };

  return {
    thread,
    messages: messages.slice(-DETAIL_MESSAGE_LIMIT),
    events: events.slice(-EVENT_LIMIT),
    errors,
    drift
  };
}

function normalizeResponseItem(payload, timestamp) {
  const payloadType = cleanString(payload.type);
  if (payloadType === "message") {
    const role = normalizeRole(payload.role);
    if (!role) {
      return null;
    }
    const text = extractText(payload.content);
    if (!text) {
      return null;
    }
    return {
      role,
      text,
      timestamp: timestamp ? toIso(timestamp) : undefined,
      kind: "message"
    };
  }

  if (payloadType === "function_call") {
    const text = cleanString(payload.name) || cleanString(payload.call_id) || "Tool call";
    return {
      text: `Tool call: ${text}`,
      timestamp: timestamp ? toIso(timestamp) : undefined,
      kind: "tool"
    };
  }

  if (payloadType === "function_call_output") {
    const text = extractText(payload.output) || cleanString(payload.call_id) || "Tool output";
    return {
      text: truncate(`Tool output: ${text}`, 500),
      timestamp: timestamp ? toIso(timestamp) : undefined,
      kind: "tool"
    };
  }

  return null;
}

function normalizeEventMessage(payload, timestamp) {
  const type = cleanString(payload.type);
  let text = cleanString(payload.message)
    || cleanString(payload.msg)
    || extractText(payload.text)
    || extractText(payload.info);
  if (!text && type) {
    text = type.replace(/_/g, " ");
  }
  if (!text || type === "token_count") {
    return null;
  }
  return {
    level: eventLevel(type),
    text: truncate(text, 500),
    timestamp: timestamp ? toIso(timestamp) : undefined
  };
}

function normalizeRole(role) {
  const value = cleanString(role).toLowerCase();
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") {
    return value;
  }
  return null;
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
    if (typeof value.output === "string" || Array.isArray(value.output)) {
      return extractText(value.output);
    }
  }
  return "";
}

function pushUniqueMessage(messages, message, seenMessages) {
  const key = `${message.role}\0${message.text}`;
  if (seenMessages.has(key)) {
    return;
  }
  seenMessages.add(key);
  messages.push(message);
}

function codexStatus(updatedAt, now) {
  const updatedMs = updatedAt instanceof Date ? updatedAt.getTime() : Date.parse(updatedAt || "");
  const nowMs = typeof now === "function" ? now() : Date.now();
  if (Number.isFinite(updatedMs) && nowMs - updatedMs <= RECENT_WINDOW_MS) {
    return "recent";
  }
  return "idle";
}

function codexCapabilities() {
  return {
    openNative: true,
    rename: false,
    archive: false,
    sendPrompt: false,
    liveLogs: false
  };
}

function sessionIdFromPath(file) {
  const match = path.basename(String(file || "")).match(UUID_PATTERN);
  return match ? match[1] : "";
}

function normalizeTimestamp(value) {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function maxDate(left, right) {
  const leftDate = normalizeTimestamp(left);
  const rightDate = normalizeTimestamp(right);
  if (!leftDate) {
    return rightDate;
  }
  if (!rightDate) {
    return leftDate;
  }
  return leftDate.getTime() >= rightDate.getTime() ? leftDate : rightDate;
}

function toIso(value) {
  const date = normalizeTimestamp(value);
  return date ? date.toISOString() : undefined;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function truncate(value, maxLength) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function isEnvironmentContext(text) {
  return cleanString(text).startsWith("<environment_context>");
}

function eventLevel(type) {
  const value = cleanString(type).toLowerCase();
  if (value.includes("error") || value.includes("fail")) {
    return "error";
  }
  if (value.includes("warn")) {
    return "warning";
  }
  return "info";
}

function sourceError(file, code, error, line) {
  return {
    provider: "codex",
    path: file,
    code,
    line,
    message: error && error.message ? error.message : code
  };
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  createCodexProvider,
  listCodexThreads,
  getCodexThreadDetail,
  parseCodexRollout,
  findRolloutFiles,
  codexCapabilities
};
