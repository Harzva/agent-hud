"use strict";

const WEBVIEW_MESSAGE_TYPES = Object.freeze({
  SELECT_PROVIDER: "selectProvider",
  SELECT_THREAD: "selectThread",
  REFRESH: "refresh",
  SET_QUERY: "setQuery",
  SET_STATUS_FILTER: "setStatusFilter",
  SET_SORT: "setSort",
  SET_DETAIL_TAB: "setDetailTab",
  SET_NARROW_PANE: "setNarrowPane",
  QUICK_SWITCH: "quickSwitch",
  APPLY_DEEP_LINK: "applyDeepLink",
  COPY_DEEP_LINK: "copyDeepLink",
  NAV_NEXT_THREAD: "navigateNextThread",
  NAV_PREV_THREAD: "navigatePreviousThread",
  OPEN_SELECTED_THREAD: "openSelectedThread",
  COPY_THREAD_ID: "copyThreadId",
  OPEN_NATIVE: "openNative",
  RENAME_THREAD: "renameThread",
  ARCHIVE_THREAD: "archiveThread",
  SET_PRIVACY_MODE: "setPrivacyMode",
  SET_LIST_LIMIT: "setListLimit",
  SAVE_UI_STATE: "saveUiState",
  LOAD_UI_STATE: "loadUiState",
  DISMISS_PROVIDER_ERROR: "dismissProviderError",
  RETRY_PROVIDER: "retryProvider"
});

const ALLOWED_WEBVIEW_MESSAGE_TYPES = new Set(Object.values(WEBVIEW_MESSAGE_TYPES));

function normalizeWebviewMessage(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.type !== "string") {
    return ignoredMessage("invalid");
  }
  if (!ALLOWED_WEBVIEW_MESSAGE_TYPES.has(raw.type)) {
    return ignoredMessage(raw.type);
  }

  const message = {
    type: raw.type,
    requestId: optionalString(raw.requestId),
    provider: optionalProvider(raw.provider)
  };

  if (raw.type === WEBVIEW_MESSAGE_TYPES.SELECT_PROVIDER) {
    message.provider = optionalProvider(raw.provider) || "codex";
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.SELECT_THREAD) {
    message.threadId = optionalString(raw.threadId);
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_QUERY) {
    message.query = typeof raw.query === "string" ? raw.query : "";
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_STATUS_FILTER) {
    message.statusFilter = optionalString(raw.statusFilter) || "all";
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_SORT) {
    message.sort = optionalString(raw.sort) || "updated_desc";
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_DETAIL_TAB) {
    message.detailTab = optionalDetailTab(raw.detailTab);
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_NARROW_PANE) {
    message.narrowPane = optionalNarrowPane(raw.narrowPane);
  } else if (raw.type === WEBVIEW_MESSAGE_TYPES.APPLY_DEEP_LINK) {
    message.provider = optionalProvider(raw.provider) || "codex";
    message.threadId = optionalString(raw.threadId);
    message.query = typeof raw.query === "string" ? raw.query : "";
    message.detailTab = optionalDetailTab(raw.detailTab);
  } else if (
    raw.type === WEBVIEW_MESSAGE_TYPES.COPY_DEEP_LINK
    || raw.type === WEBVIEW_MESSAGE_TYPES.NAV_NEXT_THREAD
    || raw.type === WEBVIEW_MESSAGE_TYPES.NAV_PREV_THREAD
    || raw.type === WEBVIEW_MESSAGE_TYPES.OPEN_SELECTED_THREAD
    || raw.type === WEBVIEW_MESSAGE_TYPES.COPY_THREAD_ID
    || raw.type === WEBVIEW_MESSAGE_TYPES.OPEN_NATIVE
    || raw.type === WEBVIEW_MESSAGE_TYPES.RENAME_THREAD
    || raw.type === WEBVIEW_MESSAGE_TYPES.ARCHIVE_THREAD
  ) {
    message.threadId = optionalString(raw.threadId);
  }

  if (raw.type === WEBVIEW_MESSAGE_TYPES.RENAME_THREAD) {
    message.title = optionalString(raw.title);
  }

  if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_PRIVACY_MODE) {
    message.privacyMode = raw.privacyMode === true;
  }

  if (raw.type === WEBVIEW_MESSAGE_TYPES.SET_LIST_LIMIT) {
    const limit = Number(raw.listLimit);
    message.listLimit = Number.isInteger(limit) && limit > 0 ? limit : 100;
  }

  if (raw.type === WEBVIEW_MESSAGE_TYPES.DISMISS_PROVIDER_ERROR) {
    message.errorScope = optionalString(raw.errorScope) || "list";
  }

  if (raw.type === WEBVIEW_MESSAGE_TYPES.RETRY_PROVIDER) {
    message.provider = optionalProvider(raw.provider) || "codex";
    message.errorScope = optionalErrorScope(raw.errorScope);
  }

  return {
    ok: true,
    ignored: false,
    message
  };
}

function ignoredMessage(type) {
  return {
    ok: false,
    ignored: true,
    type
  };
}

function optionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalProvider(value) {
  const provider = optionalString(value);
  return provider === "codex" || provider === "claude" ? provider : "";
}

function optionalDetailTab(value) {
  const tab = optionalString(value).toLowerCase();
  if (tab === "events" || tab === "source" || tab === "metadata") {
    return tab;
  }
  return "conversation";
}

function optionalNarrowPane(value) {
  const pane = optionalString(value);
  return pane === "detail" ? "detail" : "list";
}

function optionalErrorScope(value) {
  const scope = optionalString(value);
  return scope === "detail" ? "detail" : "list";
}

module.exports = {
  WEBVIEW_MESSAGE_TYPES,
  ALLOWED_WEBVIEW_MESSAGE_TYPES,
  normalizeWebviewMessage
};
