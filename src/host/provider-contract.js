"use strict";

const PROVIDER_IDS = Object.freeze(["codex", "claude"]);
const THREAD_STATUSES = Object.freeze(["running", "recent", "idle", "archived", "unknown"]);
const MESSAGE_ROLES = Object.freeze(["user", "assistant", "tool", "system"]);
const DEFAULT_CAPABILITIES = Object.freeze({
  openNative: false,
  rename: false,
  archive: false,
  sendPrompt: false,
  liveLogs: false
});

function normalizeProviderId(value, fallback = "codex") {
  return PROVIDER_IDS.includes(value) ? value : fallback;
}

function normalizeThreadStatus(value, fallback = "unknown") {
  return THREAD_STATUSES.includes(value) ? value : fallback;
}

function normalizeMessageRole(value, fallback = "system") {
  return MESSAGE_ROLES.includes(value) ? value : fallback;
}

function normalizeCapabilities(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    openNative: source.openNative === true,
    rename: source.rename === true,
    archive: source.archive === true,
    sendPrompt: source.sendPrompt === true,
    liveLogs: source.liveLogs === true
  };
}

function isAgentThread(value) {
  return Boolean(
    value
    && typeof value === "object"
    && PROVIDER_IDS.includes(value.provider)
    && typeof value.id === "string"
    && value.id.trim()
    && typeof value.title === "string"
    && THREAD_STATUSES.includes(value.status)
  );
}

function isAgentMessage(value) {
  return Boolean(
    value
    && typeof value === "object"
    && MESSAGE_ROLES.includes(value.role)
    && typeof value.text === "string"
  );
}

function isAgentEvent(value) {
  return Boolean(
    value
    && typeof value === "object"
    && typeof value.text === "string"
  );
}

function isAgentThreadDetail(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isAgentThread(value.thread)
    && Array.isArray(value.messages)
    && value.messages.every(isAgentMessage)
    && (!value.events || (Array.isArray(value.events) && value.events.every(isAgentEvent)))
    && isCapabilitiesObject(value.capabilities)
  );
}

function isCapabilitiesObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.keys(DEFAULT_CAPABILITIES).every((key) => typeof value[key] === "boolean");
}

function cleanSearchField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function driftHasSearchSignal(drift) {
  if (!drift || typeof drift !== "object") {
    return false;
  }
  const unknown = Number(drift.totalUnknownRecords) || 0;
  const fallback = Number(drift.fallbackCount) || 0;
  if (unknown > 0 || fallback > 0) {
    return true;
  }
  if (cleanSearchField(drift.formatVersion)) {
    return true;
  }
  const types = drift.unknownRecordTypes;
  if (types && typeof types === "object" && Object.keys(types).length) {
    return true;
  }
  return false;
}

function formatListDriftSearchLine(drift) {
  const parts = [];
  if (cleanSearchField(drift.formatVersion)) {
    parts.push(`v${drift.formatVersion}`);
  }
  parts.push(`unknown ${Number(drift.totalUnknownRecords) || 0}`);
  parts.push(`fallback ${Number(drift.fallbackCount) || 0}`);
  return parts.join(" · ");
}

function driftSearchBlob(drift) {
  if (!driftHasSearchSignal(drift)) {
    return "";
  }
  const types = drift.unknownRecordTypes && typeof drift.unknownRecordTypes === "object"
    ? Object.keys(drift.unknownRecordTypes).join(" ")
    : "";
  return [types, formatListDriftSearchLine(drift)].filter(Boolean).join(" ");
}

/**
 * Lowercased, space-joined string over provider-neutral list summary fields (Codex + Claude).
 * Used by search-core; keep in sync when thread list rows gain new searchable columns.
 */
function buildThreadSearchCorpus(thread) {
  if (!thread || typeof thread !== "object") {
    return "";
  }
  const status = normalizeThreadStatus(thread.status);
  const parts = [
    thread.title,
    thread.id,
    thread.cwd,
    thread.model,
    status,
    thread.preview,
    thread.projectLabel,
    thread.sourcePath,
    driftSearchBlob(thread.drift)
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

module.exports = {
  PROVIDER_IDS,
  THREAD_STATUSES,
  MESSAGE_ROLES,
  DEFAULT_CAPABILITIES,
  normalizeProviderId,
  normalizeThreadStatus,
  normalizeMessageRole,
  normalizeCapabilities,
  isAgentThread,
  isAgentMessage,
  isAgentEvent,
  isAgentThreadDetail,
  buildThreadSearchCorpus
};

