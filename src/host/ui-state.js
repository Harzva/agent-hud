"use strict";

const { THREAD_STATUSES, normalizeProviderId } = require("./provider-contract");

const UI_STATE_SCHEMA_VERSION = 1;
const UI_STATE_KEY = "agenthud.uiState";
const STATUS_OPTIONS = Object.freeze(["all", ...THREAD_STATUSES]);
const SORT_OPTIONS = Object.freeze(["updated_desc", "updated_asc", "title_asc"]);
const DETAIL_TABS = Object.freeze(["conversation", "events", "source", "metadata"]);
const NARROW_PANES = Object.freeze(["list", "detail"]);

function readUiState(globalState) {
  const raw = globalState && typeof globalState.get === "function"
    ? globalState.get(UI_STATE_KEY)
    : null;
  if (!raw || typeof raw !== "object" || raw.schema_version !== UI_STATE_SCHEMA_VERSION) {
    return null;
  }
  return normalizePayload(raw);
}

async function writeUiState(globalState, state, now = () => new Date()) {
  if (!globalState || typeof globalState.update !== "function") {
    return null;
  }
  const payload = snapshotUiState(state, now);
  await globalState.update(UI_STATE_KEY, payload);
  return payload;
}

function applyUiState(baseState, savedState) {
  if (!baseState || typeof baseState !== "object" || !savedState) {
    return baseState;
  }
  const normalized = normalizePayload(savedState);
  if (!normalized) {
    return baseState;
  }

  return {
    ...baseState,
    provider: normalized.provider,
    privacyMode: normalized.privacyMode,
    codex: applyProviderUiState(baseState.codex, normalized.providers.codex),
    claude: applyProviderUiState(baseState.claude, normalized.providers.claude)
  };
}

function snapshotUiState(state, now = () => new Date()) {
  const timestamp = toIso(now());
  return {
    schema_version: UI_STATE_SCHEMA_VERSION,
    updated_at: timestamp,
    provider: normalizeProviderId(state?.provider),
    privacyMode: state?.privacyMode === true,
    providers: {
      codex: snapshotProviderState(state?.codex),
      claude: snapshotProviderState(state?.claude)
    }
  };
}

function normalizePayload(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return {
    schema_version: UI_STATE_SCHEMA_VERSION,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "",
    provider: normalizeProviderId(raw.provider),
    privacyMode: raw.privacyMode === true,
    providers: {
      codex: normalizeProviderState(raw.providers?.codex),
      claude: normalizeProviderState(raw.providers?.claude)
    }
  };
}

function snapshotProviderState(providerState) {
  return normalizeProviderState({
    selectedThreadId: providerState?.selectedThreadId,
    query: providerState?.query,
    statusFilter: providerState?.statusFilter,
    sort: providerState?.sort,
    detailTab: providerState?.detailTab,
    narrowPane: providerState?.narrowPane,
    listLimit: providerState?.listLimit
  });
}

function normalizeProviderState(providerState) {
  const source = providerState && typeof providerState === "object" ? providerState : {};
  const listLimit = Number(source.listLimit);
  return {
    selectedThreadId: cleanString(source.selectedThreadId),
    query: cleanString(source.query),
    statusFilter: STATUS_OPTIONS.includes(source.statusFilter) ? source.statusFilter : "all",
    sort: SORT_OPTIONS.includes(source.sort) ? source.sort : "updated_desc",
    detailTab: DETAIL_TABS.includes(source.detailTab) ? source.detailTab : "conversation",
    narrowPane: NARROW_PANES.includes(source.narrowPane) ? source.narrowPane : "list",
    listLimit: Number.isInteger(listLimit) && listLimit > 0 ? listLimit : 100
  };
}

function applyProviderUiState(baseProviderState, savedProviderState) {
  const base = baseProviderState && typeof baseProviderState === "object" ? baseProviderState : {};
  const saved = normalizeProviderState(savedProviderState);
  return {
    ...base,
    selectedThreadId: saved.selectedThreadId,
    query: saved.query,
    statusFilter: saved.statusFilter,
    sort: saved.sort,
    detailTab: saved.detailTab,
    narrowPane: saved.narrowPane
  };
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

module.exports = {
  UI_STATE_SCHEMA_VERSION,
  UI_STATE_KEY,
  readUiState,
  writeUiState,
  applyUiState,
  snapshotUiState
};
