"use strict";

const LIST_REFRESH_TIMEOUT_MS = 12000;
const DETAIL_LOAD_TIMEOUT_MS = 8000;
const TIMEOUT_ERROR_CODE = "AGENTHUD_TIMEOUT";

/** Max Codex rollout files parsed per list refresh (after mtime sort). Detail lookup unchanged. */
const CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED = 2500;

/** Max Claude session.jsonl sources fully processed per list index build (head); tail uses disk cache only. */
const CLAUDE_LIST_MAX_SOURCES_SCANNED = 2500;

/** Max thread summaries persisted per provider cache file (global storage write bound). */
const SUMMARY_CACHE_MAX_SUMMARIES = 2500;

/** Max Codex rollout files to parse when resolving thread detail without a matching preferred path. */
const CODEX_DETAIL_MAX_ROLLOUT_PARSE_ATTEMPTS = 400;

class TimeoutBudgetError extends Error {
  constructor(operation, provider, timeoutMs) {
    super(`${operation} timed out after ${timeoutMs}ms.`);
    this.name = "TimeoutBudgetError";
    this.code = TIMEOUT_ERROR_CODE;
    this.operation = String(operation || "operation");
    this.provider = String(provider || "unknown");
    this.timeoutMs = Number(timeoutMs) || 0;
  }
}

function withTimeout(promise, options = {}) {
  const timeoutMs = positiveInt(options.timeoutMs, 0);
  if (!timeoutMs) {
    return Promise.resolve(promise);
  }
  const operation = cleanString(options.operation) || "operation";
  const provider = cleanString(options.provider) || "unknown";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutBudgetError(operation, provider, timeoutMs));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isTimeoutBudgetError(error) {
  return Boolean(error && (error.code === TIMEOUT_ERROR_CODE || error.name === "TimeoutBudgetError"));
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveCodexListRolloutScanCap(options = {}) {
  const raw = options.maxRolloutFilesScan;
  if (raw !== undefined && raw !== null) {
    const parsed = Number.parseInt(String(raw), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED;
}

function resolveClaudeListSourceScanCap(options = {}) {
  const raw = options.maxSourcesScan;
  if (raw !== undefined && raw !== null) {
    const parsed = Number.parseInt(String(raw), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return CLAUDE_LIST_MAX_SOURCES_SCANNED;
}

function resolveCodexDetailParseCap(options = {}) {
  const raw = options.maxDetailRolloutAttempts;
  if (raw !== undefined && raw !== null) {
    const parsed = Number.parseInt(String(raw), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(50000, parsed);
    }
  }
  return CODEX_DETAIL_MAX_ROLLOUT_PARSE_ATTEMPTS;
}

function capThreadSummariesForCache(threads, maxCount = SUMMARY_CACHE_MAX_SUMMARIES) {
  const cap = positiveInt(maxCount, SUMMARY_CACHE_MAX_SUMMARIES);
  const list = Array.isArray(threads) ? threads : [];
  if (list.length <= cap) {
    return { threads: list, truncated: false, appliedCap: cap };
  }
  return {
    threads: list.slice(0, cap),
    truncated: true,
    appliedCap: cap
  };
}

module.exports = {
  LIST_REFRESH_TIMEOUT_MS,
  DETAIL_LOAD_TIMEOUT_MS,
  TIMEOUT_ERROR_CODE,
  CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED,
  CLAUDE_LIST_MAX_SOURCES_SCANNED,
  SUMMARY_CACHE_MAX_SUMMARIES,
  CODEX_DETAIL_MAX_ROLLOUT_PARSE_ATTEMPTS,
  TimeoutBudgetError,
  isTimeoutBudgetError,
  withTimeout,
  resolveCodexListRolloutScanCap,
  resolveClaudeListSourceScanCap,
  resolveCodexDetailParseCap,
  capThreadSummariesForCache
};
