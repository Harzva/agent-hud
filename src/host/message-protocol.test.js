"use strict";

const assert = require("assert");
const { spawnSync } = require("child_process");
const path = require("path");
const {
  WEBVIEW_MESSAGE_TYPES,
  normalizeWebviewMessage
} = require("./message-protocol");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const STALE_REF_AUDIT = path.join(REPO_ROOT, "scripts", "audit", "check-stale-references.js");

function run() {
  // --- Valid message types ---
  const selectProvider = normalizeWebviewMessage({ type: "selectProvider", provider: "claude" });
  assert.equal(selectProvider.ok, true);
  assert.equal(selectProvider.ignored, false);
  assert.equal(selectProvider.message.type, "selectProvider");
  assert.equal(selectProvider.message.provider, "claude");

  const selectThread = normalizeWebviewMessage({ type: "selectThread", provider: "codex", threadId: "t1" });
  assert.equal(selectThread.ok, true);
  assert.equal(selectThread.message.threadId, "t1");

  const setQuery = normalizeWebviewMessage({ type: "setQuery", query: "search term" });
  assert.equal(setQuery.ok, true);
  assert.equal(setQuery.message.query, "search term");

  const setStatusFilter = normalizeWebviewMessage({ type: "setStatusFilter", statusFilter: "running" });
  assert.equal(setStatusFilter.ok, true);
  assert.equal(setStatusFilter.message.statusFilter, "running");

  const setSort = normalizeWebviewMessage({ type: "setSort", sort: "title_asc" });
  assert.equal(setSort.ok, true);
  assert.equal(setSort.message.sort, "title_asc");

  const setDetailTab = normalizeWebviewMessage({ type: "setDetailTab", detailTab: "events" });
  assert.equal(setDetailTab.ok, true);
  assert.equal(setDetailTab.message.detailTab, "events");

  const setNarrowPane = normalizeWebviewMessage({ type: "setNarrowPane", narrowPane: "detail" });
  assert.equal(setNarrowPane.ok, true);
  assert.equal(setNarrowPane.message.narrowPane, "detail");

  const refresh = normalizeWebviewMessage({ type: "refresh" });
  assert.equal(refresh.ok, true);

  const applyDeepLink = normalizeWebviewMessage({ type: "applyDeepLink", provider: "claude", threadId: "t2", query: "q", detailTab: "events" });
  assert.equal(applyDeepLink.ok, true);
  assert.equal(applyDeepLink.message.provider, "claude");
  assert.equal(applyDeepLink.message.threadId, "t2");
  assert.equal(applyDeepLink.message.query, "q");
  assert.equal(applyDeepLink.message.detailTab, "events");

  // --- Invalid / null / undefined inputs ---
  const nullInput = normalizeWebviewMessage(null);
  assert.equal(nullInput.ok, false);
  assert.equal(nullInput.ignored, true);
  assert.equal(nullInput.type, "invalid");

  const undefinedInput = normalizeWebviewMessage(undefined);
  assert.equal(undefinedInput.ok, false);
  assert.equal(undefinedInput.ignored, true);

  const emptyObj = normalizeWebviewMessage({});
  assert.equal(emptyObj.ok, false);
  assert.equal(emptyObj.ignored, true);

  const noType = normalizeWebviewMessage({ type: 123 });
  assert.equal(noType.ok, false);
  assert.equal(noType.ignored, true);

  const unknownType = normalizeWebviewMessage({ type: "hackThePlanet" });
  assert.equal(unknownType.ok, false);
  assert.equal(unknownType.ignored, true);
  assert.equal(unknownType.type, "hackThePlanet");

  // --- Provider switch messages ---
  const switchToClaude = normalizeWebviewMessage({ type: "selectProvider", provider: "claude" });
  assert.equal(switchToClaude.message.provider, "claude");

  const switchToCodex = normalizeWebviewMessage({ type: "selectProvider", provider: "codex" });
  assert.equal(switchToCodex.message.provider, "codex");

  const switchInvalidProvider = normalizeWebviewMessage({ type: "selectProvider", provider: "bogus" });
  assert.equal(switchInvalidProvider.message.provider, "codex");

  const switchNoProvider = normalizeWebviewMessage({ type: "selectProvider" });
  assert.equal(switchNoProvider.message.provider, "codex");

  // --- Missing optional fields get safe defaults ---
  const noQuery = normalizeWebviewMessage({ type: "setQuery" });
  assert.equal(noQuery.message.query, "");

  const noStatusFilter = normalizeWebviewMessage({ type: "setStatusFilter" });
  assert.equal(noStatusFilter.message.statusFilter, "all");

  const noSort = normalizeWebviewMessage({ type: "setSort" });
  assert.equal(noSort.message.sort, "updated_desc");

  const noDetailTab = normalizeWebviewMessage({ type: "setDetailTab" });
  assert.equal(noDetailTab.message.detailTab, "conversation");

  const invalidDetailTab = normalizeWebviewMessage({ type: "setDetailTab", detailTab: "invalid" });
  assert.equal(invalidDetailTab.message.detailTab, "conversation");

  const sourceTab = normalizeWebviewMessage({ type: "setDetailTab", detailTab: "source" });
  assert.equal(sourceTab.message.detailTab, "source");

  const metadataTab = normalizeWebviewMessage({ type: "setDetailTab", detailTab: "metadata" });
  assert.equal(metadataTab.message.detailTab, "metadata");

  const sourceTabUpper = normalizeWebviewMessage({ type: "setDetailTab", detailTab: "SOURCE" });
  assert.equal(sourceTabUpper.message.detailTab, "source");

  const applySource = normalizeWebviewMessage({
    type: "applyDeepLink",
    provider: "codex",
    threadId: "t1",
    detailTab: "metadata"
  });
  assert.equal(applySource.message.detailTab, "metadata");

  const noNarrowPane = normalizeWebviewMessage({ type: "setNarrowPane" });
  assert.equal(noNarrowPane.message.narrowPane, "list");

  const invalidNarrowPane = normalizeWebviewMessage({ type: "setNarrowPane", narrowPane: "invalid" });
  assert.equal(invalidNarrowPane.message.narrowPane, "list");

  // --- Thread action messages ---
  const openNative = normalizeWebviewMessage({ type: "openNative", provider: "codex", threadId: "t1" });
  assert.equal(openNative.ok, true);
  assert.equal(openNative.message.threadId, "t1");

  const copyDeepLink = normalizeWebviewMessage({ type: "copyDeepLink", provider: "claude" });
  assert.equal(copyDeepLink.ok, true);

  const navNext = normalizeWebviewMessage({ type: "navigateNextThread", provider: "codex" });
  assert.equal(navNext.ok, true);

  const navPrev = normalizeWebviewMessage({ type: "navigatePreviousThread", provider: "codex" });
  assert.equal(navPrev.ok, true);

  const openSelected = normalizeWebviewMessage({ type: "openSelectedThread", provider: "codex" });
  assert.equal(openSelected.ok, true);

  // --- Copy thread ID ---
  const copyThreadId = normalizeWebviewMessage({ type: "copyThreadId", threadId: "abc" });
  assert.equal(copyThreadId.ok, true);
  assert.equal(copyThreadId.message.threadId, "abc");

  // --- Rename thread ---
  const renameThread = normalizeWebviewMessage({ type: "renameThread", threadId: "abc", title: "New Title" });
  assert.equal(renameThread.ok, true);
  assert.equal(renameThread.message.threadId, "abc");
  assert.equal(renameThread.message.title, "New Title");

  // --- Archive thread ---
  const archiveThread = normalizeWebviewMessage({ type: "archiveThread", threadId: "abc" });
  assert.equal(archiveThread.ok, true);
  assert.equal(archiveThread.message.threadId, "abc");

  // --- Dismiss provider error ---
  const dismissError = normalizeWebviewMessage({ type: "dismissProviderError" });
  assert.equal(dismissError.ok, true);
  assert.equal(dismissError.message.errorScope, "list");

  const dismissErrorCustomScope = normalizeWebviewMessage({ type: "dismissProviderError", errorScope: "detail" });
  assert.equal(dismissErrorCustomScope.ok, true);
  assert.equal(dismissErrorCustomScope.message.errorScope, "detail");

  // --- Retry provider ---
  const retryProvider = normalizeWebviewMessage({ type: "retryProvider", provider: "claude" });
  assert.equal(retryProvider.ok, true);
  assert.equal(retryProvider.message.provider, "claude");

  const retryNoProvider = normalizeWebviewMessage({ type: "retryProvider" });
  assert.equal(retryNoProvider.ok, true);
  assert.equal(retryNoProvider.message.provider, "codex");
  assert.equal(retryNoProvider.message.errorScope, "list");

  const retryDetailScope = normalizeWebviewMessage({ type: "retryProvider", provider: "codex", errorScope: "detail" });
  assert.equal(retryDetailScope.ok, true);
  assert.equal(retryDetailScope.message.errorScope, "detail");

  // --- Save/Load UI state ---
  const saveUiState = normalizeWebviewMessage({ type: "saveUiState" });
  assert.equal(saveUiState.ok, true);

  const loadUiState = normalizeWebviewMessage({ type: "loadUiState" });
  assert.equal(loadUiState.ok, true);

  // --- Quick switch ---
  const quickSwitch = normalizeWebviewMessage({ type: "quickSwitch" });
  assert.equal(quickSwitch.ok, true);

  // --- requestId always present ---
  const withRequestId = normalizeWebviewMessage({ type: "refresh", requestId: "req-1" });
  assert.equal(withRequestId.message.requestId, "req-1");

  const withoutRequestId = normalizeWebviewMessage({ type: "refresh" });
  assert.equal(withoutRequestId.message.requestId, "");

  // --- All WEBVIEW_MESSAGE_TYPES values produce ok messages ---
  for (const messageType of Object.values(WEBVIEW_MESSAGE_TYPES)) {
    const result = normalizeWebviewMessage({ type: messageType });
    assert.equal(result.ok, true, `Expected ok for type: ${messageType}`);
    assert.equal(result.ignored, false, `Expected not ignored for type: ${messageType}`);
  }

  // --- AGHUD-020: stale dashboard / legacy module references (production surface) ---
  const audit = spawnSync(process.execPath, [STALE_REF_AUDIT], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
  assert.equal(audit.status, 0, audit.stderr || audit.stdout || "stale-ref-audit failed");

  console.log("message-protocol smoke OK");
}

run();
