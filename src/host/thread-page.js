"use strict";

const {
  PROVIDER_IDS,
  THREAD_STATUSES,
  normalizeCapabilities,
  normalizeProviderId,
  normalizeThreadStatus
} = require("./provider-contract");
const { normalizeSearchQuery, threadMatchesSearchQuery, tokenizeSearchQuery } = require("./search-core");

const PROVIDERS = PROVIDER_IDS;
const PROVIDER_LABELS = Object.freeze({
  codex: "Codex",
  claude: "Claude"
});

const STATUS_OPTIONS = Object.freeze(["all", ...THREAD_STATUSES]);
const SORT_OPTIONS = Object.freeze(["updated_desc", "updated_asc", "title_asc"]);
const GROUP_ORDER = Object.freeze(["running", "recent", "idle", "archived", "unknown"]);
const DETAIL_TAB_IDS = Object.freeze(["conversation", "events", "source", "metadata"]);
const SOURCE_ERROR_MAX_LINES = 20;
const SOURCE_ERROR_LINE_MAX_CHARS = 400;
const SOURCE_PATH_MAX_CHARS = 1024;
const METADATA_VALUE_MAX_CHARS = 2000;
const DEEP_LINK_QUERY_MAX = 400;

function createThreadPageState(provider = "codex") {
  return {
    provider: normalizeProvider(provider),
    privacyMode: false,
    codex: {
      loading: false,
      threads: [],
      meta: {},
      error: "",
      selectedThreadId: "",
      detail: null,
      detailLoading: false,
      detailError: "",
      detailTab: "conversation",
      narrowPane: "list",
      query: "",
      statusFilter: "all",
      sort: "updated_desc"
    },
    claude: {
      loading: false,
      threads: [],
      meta: {},
      error: "",
      selectedThreadId: "",
      detail: null,
      detailLoading: false,
      detailError: "",
      detailTab: "conversation",
      narrowPane: "list",
      query: "",
      statusFilter: "all",
      sort: "updated_desc"
    }
  };
}

function renderThreadPage(state, event) {
  const pageState = normalizeState(state);
  const provider = pageState.provider;
  const providerState = pageState[provider];
  const filtered = getVisibleThreads(providerState);
  const selectedThread = providerState.detail?.thread
    || providerState.threads.find((thread) => thread.id === providerState.selectedThreadId)
    || null;
  const providerLabel = providerDisplayName(provider);
  const status = statusText(provider, providerState, filtered, event);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AgentHUD</title>
  <style>
    :root {
      color-scheme: light dark;
      --border: color-mix(in srgb, var(--vscode-foreground) 18%, transparent);
      --muted: var(--vscode-descriptionForeground);
      --panel: var(--vscode-sideBar-background);
      --active: var(--vscode-button-background);
      --activeText: var(--vscode-button-foreground);
      --row: color-mix(in srgb, var(--vscode-foreground) 7%, transparent);
      --rowActive: color-mix(in srgb, var(--vscode-button-background) 24%, transparent);
      --danger: var(--vscode-errorForeground);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font: 13px/1.45 var(--vscode-font-family);
    }
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 14px; font-weight: 600; }
    h2 { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
    h3 { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; }
    .tabs {
      display: inline-flex;
      gap: 4px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    button {
      min-height: 28px;
      border: 0;
      border-radius: 4px;
      padding: 0 10px;
      color: var(--vscode-foreground);
      background: transparent;
      cursor: pointer;
      font: inherit;
    }
    button.active {
      color: var(--activeText);
      background: var(--active);
    }
    button:disabled {
      cursor: default;
      opacity: 0.55;
    }
    main {
      display: grid;
      grid-template-columns: minmax(260px, 34%) 1fr;
      min-height: 0;
    }
    aside,
    section {
      min-width: 0;
      padding: 12px;
    }
    aside {
      border-right: 1px solid var(--border);
      background: var(--panel);
      overflow: auto;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .toolbar-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    input,
    select {
      width: 100%;
      min-height: 28px;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 3px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      font: inherit;
    }
    .status {
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .error { color: var(--danger); }
    .error-banner {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 8px 0 4px;
    }
    .error-banner button {
      min-height: 24px;
      padding: 2px 10px;
      font-size: 12px;
    }
    .detail-error-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 12px;
    }
    .empty {
      display: grid;
      place-items: center;
      min-height: 150px;
      border: 1px dashed var(--border);
      border-radius: 6px;
      color: var(--muted);
      text-align: center;
      padding: 16px;
    }
    .thread-list {
      display: grid;
      gap: 6px;
    }
    .thread-group {
      display: grid;
      gap: 6px;
      margin-bottom: 10px;
    }
    .thread-group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      padding: 2px 0;
      border-bottom: 1px solid var(--border);
    }
    .thread-group-count {
      min-width: 24px;
      text-align: right;
    }
    .thread-row {
      width: 100%;
      display: grid;
      gap: 4px;
      min-height: 72px;
      padding: 8px;
      text-align: left;
      border: 1px solid var(--border);
      background: var(--row);
    }
    .thread-row.active {
      border-color: var(--active);
      background: var(--rowActive);
    }
    .thread-row:focus-visible {
      outline: 2px solid var(--active);
      outline-offset: 1px;
    }
    .thread-title {
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .thread-meta,
    .message-meta {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .thread-preview {
      display: block;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.3;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .load-more-container {
      padding: 12px;
      display: flex;
      justify-content: center;
    }
    #loadMore {
      padding: 6px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      width: 100%;
    }
    #loadMore:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    mark {
      background: var(--vscode-editor-findMatchHighlightBackground);
      color: inherit;
      padding: 0;
    }
    .thread-drift {
      font-style: italic;
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .drift-detail-wrap {
      display: grid;
      gap: 10px;
      margin-top: 4px;
    }
    .drift-block {
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-foreground));
    }
    .drift-heading {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin: 0 0 6px;
    }
    .drift-grid {
      display: grid;
      grid-template-columns: minmax(120px, 34%) 1fr;
      gap: 4px 10px;
      font-size: 12px;
      align-items: start;
    }
    .thread-row-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }
    .thread-badges {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
      max-width: 44%;
    }
    .status-chip,
    .affordance-chip {
      display: inline-flex;
      align-items: center;
      min-height: 20px;
      padding: 0 6px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.2;
      white-space: nowrap;
    }
    .status-chip {
      background: color-mix(in srgb, var(--vscode-editor-background) 86%, var(--vscode-foreground));
    }
    .affordance-chip {
      color: var(--activeText);
      background: color-mix(in srgb, var(--active) 85%, transparent);
      border-color: color-mix(in srgb, var(--active) 60%, var(--border));
    }
    .detail {
      display: grid;
      gap: 14px;
      align-content: start;
      overflow: auto;
    }
    .detail-head {
      display: grid;
      gap: 6px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .detail-tabs {
      display: inline-flex;
      gap: 4px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 6px;
      width: fit-content;
    }
    .messages,
    .events {
      display: grid;
      gap: 8px;
    }
    .message,
    .event {
      display: grid;
      gap: 4px;
      padding: 9px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-foreground));
    }
    .message-text,
    .event-text {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .detail-pane { display: grid; gap: 10px; align-content: start; }
    .kv {
      display: grid;
      grid-template-columns: minmax(96px, 140px) 1fr;
      gap: 6px 12px;
      font-size: 12px;
      margin: 0;
    }
    .kv dt { color: var(--muted); margin: 0; }
    .kv dd { margin: 0; overflow-wrap: anywhere; }
    .source-pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 12px;
      margin: 0;
    }
    h4.subheading {
      margin: 8px 0 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
    }
    @media (max-width: 700px) {
      header {
        align-items: stretch;
        flex-direction: column;
      }
      main {
        grid-template-columns: 1fr;
      }
      aside {
        border-right: 0;
      }
      section {
        border-top: 1px solid var(--border);
      }
      body[data-narrow-pane="detail"] aside {
        display: none;
      }
      body[data-narrow-pane="list"] section.detail {
        display: none;
      }
    }
  </style>
</head>
<body data-provider="${escapeHtml(provider)}" data-narrow-pane="${escapeAttr(normalizeNarrowPane(providerState.narrowPane))}">
  <div class="shell">
    <header>
      <div class="header-left">
        <h1>AgentHUD Threads</h1>
        <nav class="tabs" aria-label="Provider tabs">
          ${renderProviderButton("codex", provider)}
          ${renderProviderButton("claude", provider)}
        </nav>
      </div>
      <div class="header-actions">
        <button type="button" id="privacyToggle" title="${pageState.privacyMode ? "Disable Privacy Mode (Show Previews)" : "Enable Privacy Mode (Hide Previews)"}" aria-pressed="${pageState.privacyMode}">
          ${pageState.privacyMode ? "🔒 Private" : "🔓 Public"}
        </button>
      </div>
    </header>
    <main>
      <aside>
        <div class="toolbar">
          <input id="threadQuery" aria-label="Search threads" placeholder="Search threads" value="${escapeAttr(providerState.query)}">
          <div class="toolbar-row">
            <select id="statusFilter" aria-label="Status filter">
              ${renderStatusOptions(providerState.statusFilter)}
            </select>
            <select id="sortMode" aria-label="Sort threads">
              ${renderSortOptions(providerState.sort)}
            </select>
          </div>
          <button type="button" id="refresh">Refresh</button>
        </div>
        <p class="${providerState.error ? "status error" : "status"}">${escapeHtml(status)}</p>
        ${renderListErrorBanner(providerState)}
        ${renderThreadList(providerLabel, filtered, providerState, provider, pageState)}
      </aside>
      <section class="detail" aria-label="Thread detail">
        ${renderThreadDetail(providerLabel, selectedThread, providerState, provider)}
      </section>
    </main>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    let requestCounter = 0;
    const provider = document.body.dataset.provider || "codex";
    const post = (message) => vscode.postMessage({ ...message, requestId: "webview-" + (++requestCounter) });
    document.querySelectorAll("[data-provider-tab]").forEach((button) => {
      button.addEventListener("click", () => post({ type: "selectProvider", provider: button.dataset.providerTab }));
    });
    document.querySelectorAll("[data-thread-id]").forEach((button) => {
      button.addEventListener("click", () => {
        post({ type: "selectThread", provider, threadId: button.dataset.threadId });
        if (window.matchMedia("(max-width: 700px)").matches) {
          post({ type: "setNarrowPane", provider, narrowPane: "detail" });
        }
      });
    });
    document.querySelectorAll("[data-open-native]").forEach((button) => {
      button.addEventListener("click", () => post({ type: "openNative", provider, threadId: button.dataset.openNative }));
    });
    const privacyToggle = document.getElementById("privacyToggle");
    if (privacyToggle) {
      privacyToggle.addEventListener("click", () => post({ type: "setPrivacyMode", privacyMode: privacyToggle.getAttribute("aria-pressed") !== "true" }));
    }
    const loadMore = document.getElementById("loadMore");
    if (loadMore) {
      loadMore.addEventListener("click", () => post({ type: "setListLimit", provider, listLimit: loadMore.dataset.nextLimit }));
    }
    document.querySelectorAll("[data-detail-tab]").forEach((button) => {
      button.addEventListener("click", () => post({ type: "setDetailTab", provider, detailTab: button.dataset.detailTab }));
    });
    const copyDeepLink = document.getElementById("copyDeepLink");
    if (copyDeepLink) copyDeepLink.addEventListener("click", () => post({ type: "copyDeepLink", provider }));
    const backToList = document.getElementById("backToList");
    if (backToList) backToList.addEventListener("click", () => post({ type: "setNarrowPane", provider, narrowPane: "list" }));
    const refresh = document.getElementById("refresh");
    if (refresh) refresh.addEventListener("click", () => post({ type: "refresh" }));
    const dismissListError = document.getElementById("dismissListError");
    if (dismissListError) dismissListError.addEventListener("click", () => post({ type: "dismissProviderError", provider, errorScope: "list" }));
    const retryListError = document.getElementById("retryListError");
    if (retryListError) retryListError.addEventListener("click", () => post({ type: "retryProvider", provider, errorScope: "list" }));
    const dismissDetailError = document.getElementById("dismissDetailError");
    if (dismissDetailError) dismissDetailError.addEventListener("click", () => post({ type: "dismissProviderError", provider, errorScope: "detail" }));
    const retryDetailError = document.getElementById("retryDetailError");
    if (retryDetailError) retryDetailError.addEventListener("click", () => post({ type: "retryProvider", provider, errorScope: "detail" }));
    const query = document.getElementById("threadQuery");
    if (query) {
      const submitQuery = () => post({ type: "setQuery", query: query.value });
      query.addEventListener("change", submitQuery);
      query.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitQuery();
      });
    }
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) statusFilter.addEventListener("change", () => post({ type: "setStatusFilter", statusFilter: statusFilter.value }));
    const sortMode = document.getElementById("sortMode");
    if (sortMode) sortMode.addEventListener("change", () => post({ type: "setSort", sort: sortMode.value }));
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const tag = target && target.tagName ? String(target.tagName).toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        post({ type: "navigateNextThread", provider });
        return;
      }
      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        post({ type: "navigatePreviousThread", provider });
        return;
      }
      if (event.key === "Enter") {
        post({ type: "openSelectedThread", provider });
      }
    });
    const hash = (window.location.hash || "").replace(/^#/, "");
    if (hash) {
      const params = new URLSearchParams(hash);
      if (params.has("provider") || params.has("threadId") || params.has("query") || params.has("detailTab") || params.has("dt")) {
        const legacy = (params.get("detailTab") || "").trim();
        const short = (params.get("dt") || "").trim().toLowerCase();
        let resolved = "conversation";
        if (legacy) {
          const l = legacy.toLowerCase();
          if (l === "conversation" || l === "events" || l === "source" || l === "metadata") {
            resolved = l;
          } else {
            resolved = "conversation";
          }
        } else if (short === "e") {
          resolved = "events";
        } else if (short === "s") {
          resolved = "source";
        } else if (short === "m") {
          resolved = "metadata";
        } else if (short === "c") {
          resolved = "conversation";
        }
        const rawTid = params.get("threadId") || "";
        const safeTid = rawTid.replace(/\\r?\\n/g, "").trim();
        post({
          type: "applyDeepLink",
          provider: params.get("provider") || provider,
          threadId: safeTid,
          query: params.get("query") || "",
          detailTab: resolved
        });
      }
    }
  </script>
</body>
</html>`;
}

function renderProviderButton(provider, selectedProvider) {
  const isSelected = provider === selectedProvider;
  return `<button type="button" class="${isSelected ? "active" : ""}" data-provider-tab="${provider}" aria-pressed="${isSelected}">${escapeHtml(PROVIDER_LABELS[provider])}</button>`;
}

function renderStatusOptions(selected) {
  return STATUS_OPTIONS.map((status) => {
    const label = status === "all" ? "All statuses" : titleCase(status);
    return `<option value="${status}" ${status === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

function renderSortOptions(selected) {
  const labels = {
    updated_desc: "Newest",
    updated_asc: "Oldest",
    title_asc: "Title"
  };
  return SORT_OPTIONS.map((sort) => {
    return `<option value="${sort}" ${sort === selected ? "selected" : ""}>${escapeHtml(labels[sort])}</option>`;
  }).join("");
}

function renderListErrorBanner(providerState) {
  if (!providerState.error) {
    return "";
  }
  return `<div class="error-banner" role="alert">
    <button type="button" id="dismissListError">Dismiss</button>
    <button type="button" id="retryListError">Retry</button>
  </div>`;
}

function renderThreadList(providerLabel, threads, providerState, provider, pageState) {
  if (providerState.loading && !providerState.threads.length) {
    return `<div class="empty">Loading ${escapeHtml(providerLabel)} threads...</div>`;
  }
  if (!threads.length) {
    return `<div class="empty">No ${escapeHtml(providerLabel)} threads match the current filters.</div>`;
  }
  
  const limit = providerState.listLimit || 100;
  const visible = threads.slice(0, limit);
  const hasMore = threads.length > limit;

  const groups = groupThreadsByStatus(visible);
  const renderedGroups = GROUP_ORDER
    .filter((status) => groups[status].length)
    .map((status) => renderThreadGroup(provider, status, groups[status], providerState.selectedThreadId, providerState, pageState))
    .join("");

  const loadMore = hasMore
    ? `<div class="load-more-container">
        <button type="button" id="loadMore" data-next-limit="${limit + 100}">Load 100 More (${threads.length - limit} remaining)</button>
      </div>`
    : "";

  return `<div class="thread-list">${renderedGroups}${loadMore}</div>`;
}

function renderThreadGroup(provider, status, threads, selectedThreadId, providerState, pageState) {
  return `<section class="thread-group" data-status-group="${escapeAttr(status)}">
    <div class="thread-group-head">
      <span>${escapeHtml(groupTitle(provider, status))}</span>
      <span class="thread-group-count">${threads.length}</span>
    </div>
    ${threads.map((thread) => renderThreadRow(provider, thread, selectedThreadId, providerState, pageState)).join("")}
  </section>`;
}

function renderThreadRow(provider, thread, selectedThreadId, providerState, pageState) {
  const selected = thread.id === selectedThreadId;
  const status = normalizeThreadStatus(thread.status);
  const chips = [
    `<span class="status-chip">${escapeHtml(statusLabel(provider, status))}</span>`
  ];
  if (provider === "codex" && selected && providerState?.detail?.capabilities?.openNative) {
    chips.push('<span class="affordance-chip">Native Open</span>');
  }
  const showPreview = !pageState?.privacyMode && thread.preview;
  const query = providerState.query || "";
  return `<button type="button" class="thread-row ${selected ? "active" : ""}" data-thread-id="${escapeAttr(thread.id)}" aria-pressed="${selected}">
    <span class="thread-row-top">
      <span class="thread-title">${highlightMatches(thread.title || thread.id, query)}</span>
      <span class="thread-badges">${chips.join("")}</span>
    </span>
    <span class="thread-meta">${escapeHtml([thread.model, formatDate(thread.updatedAt)].filter(Boolean).join(" / "))}</span>
    <span class="thread-meta">${escapeHtml(thread.cwd || thread.id)}</span>
    ${showPreview ? `<span class="thread-preview">${highlightMatches(thread.preview, query)}</span>` : ""}
    ${driftHasSignal(thread.drift) ? `<span class="thread-drift">List drift (thread.drift): ${escapeHtml(formatListDriftLine(thread.drift))}</span>` : ""}
  </button>`;
}

function renderThreadDetail(providerLabel, thread, providerState, providerId) {
  if (providerState.detailLoading && !providerState.detail) {
    return '<div class="empty">Loading selected thread...</div>';
  }
  if (providerState.detailError) {
    return `<div class="empty error">
      <div>
        <p>${escapeHtml(providerState.detailError)}</p>
        <div class="detail-error-actions">
          <button type="button" id="dismissDetailError">Dismiss</button>
          <button type="button" id="retryDetailError">Retry</button>
        </div>
      </div>
    </div>`;
  }
  if (!thread) {
    return `<div class="empty">Select a ${escapeHtml(providerLabel)} thread to view conversation history and recent events.</div>`;
  }

  const detail = providerState.detail;
  const detailTab = normalizeDetailTab(providerState.detailTab);
  const messages = Array.isArray(detail?.messages) ? detail.messages : [];
  const events = Array.isArray(detail?.events) ? detail.events : [];
  const caps = normalizeCapabilities(detail?.capabilities);
  const status = normalizeThreadStatus(thread.status);
  return `<div class="detail-head">
    <button type="button" id="backToList">Back to Threads</button>
    <h2>${escapeHtml(thread.title || thread.id)}</h2>
    <p class="status">${escapeHtml([thread.cwd, thread.model, status, formatDate(thread.updatedAt)].filter(Boolean).join(" / "))}</p>
    <p class="status">${escapeHtml(thread.sourcePath || "")}</p>
    ${renderDriftDetailBlocks(thread, detail)}
    ${caps.openNative ? '<p class="status">Native open is available for this provider.</p>' : ""}
    ${caps.openNative ? `<button type="button" data-open-native="${escapeAttr(thread.id)}">${escapeHtml(nativeOpenLabel(providerLabel))}</button>` : ""}
    <button type="button" id="copyDeepLink">Copy Deep Link</button>
    <nav class="detail-tabs" aria-label="Detail tabs">
      <button type="button" class="${detailTab === "conversation" ? "active" : ""}" data-detail-tab="conversation" aria-pressed="${detailTab === "conversation"}">Conversation</button>
      <button type="button" class="${detailTab === "events" ? "active" : ""}" data-detail-tab="events" aria-pressed="${detailTab === "events"}">Events</button>
      <button type="button" class="${detailTab === "source" ? "active" : ""}" data-detail-tab="source" aria-pressed="${detailTab === "source"}">Source</button>
      <button type="button" class="${detailTab === "metadata" ? "active" : ""}" data-detail-tab="metadata" aria-pressed="${detailTab === "metadata"}">Metadata</button>
    </nav>
  </div>
  <div class="detail-pane" data-detail-pane="conversation" ${detailTab === "conversation" ? "" : "hidden"}>
    <h3>Conversation</h3>
    ${messages.length ? messages.map(renderMessage).join("") : '<div class="empty">No normalized messages found for this thread.</div>'}
  </div>
  <div class="detail-pane" data-detail-pane="events" ${detailTab === "events" ? "" : "hidden"}>
    <h3>Recent Events</h3>
    ${events.length ? events.map(renderEvent).join("") : '<div class="empty">No recent events found for this thread.</div>'}
  </div>
  <div class="detail-pane" data-detail-pane="source" ${detailTab === "source" ? "" : "hidden"}>
    <h3>Source</h3>
    ${renderSourcePane(thread, detail)}
  </div>
  <div class="detail-pane" data-detail-pane="metadata" ${detailTab === "metadata" ? "" : "hidden"}>
    <h3>Metadata</h3>
    ${renderMetadataPane(thread, detail, providerId)}
  </div>`;
}

function truncateDisplay(value, maxChars) {
  const text = String(value ?? "");
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

function stringifySourceError(entry) {
  try {
    return JSON.stringify(entry);
  } catch (_error) {
    return String(entry);
  }
}

function renderSourcePane(thread, detail) {
  const primaryRaw = cleanString(thread?.sourcePath || "");
  const detailPathRaw = cleanString(detail?.meta?.sourcePath || "");
  const primary = truncateDisplay(primaryRaw, SOURCE_PATH_MAX_CHARS);
  const detailPath = truncateDisplay(detailPathRaw, SOURCE_PATH_MAX_CHARS);
  const rows = [];
  if (primaryRaw) {
    rows.push({ label: "Recorded path", value: primary });
  }
  if (detailPathRaw && detailPathRaw !== primaryRaw) {
    rows.push({ label: "Detail source", value: detailPath });
  }
  const errors = Array.isArray(detail?.meta?.errors) ? detail.meta.errors : [];
  if (!rows.length && !errors.length) {
    return '<div class="empty">No source path or parse issues recorded for this thread.</div>';
  }
  let body = "";
  if (rows.length) {
    body += `<dl class="kv">${rows.map((r) => `<dt>${escapeHtml(r.label)}</dt><dd><code>${escapeHtml(r.value)}</code></dd>`).join("")}</dl>`;
  }
  if (errors.length) {
    const shown = errors.slice(0, SOURCE_ERROR_MAX_LINES);
    const omitted = errors.length - shown.length;
    const lines = shown.map((e) => truncateDisplay(stringifySourceError(e), SOURCE_ERROR_LINE_MAX_CHARS));
    body += `<h4 class="subheading">Parse / source issues</h4><pre class="source-pre">${escapeHtml(lines.join("\n"))}</pre>`;
    if (omitted > 0) {
      body += `<p class="status">${escapeHtml(`Showing first ${shown.length} of ${errors.length} issues.`)}</p>`;
    }
  }
  return body;
}

function renderMetadataPane(thread, detail, providerId) {
  const meta = detail?.meta && typeof detail.meta === "object" ? detail.meta : {};
  const pid = cleanString(providerId) || cleanString(thread?.provider) || "—";
  const entries = [
    ["Provider", pid],
    ["Thread id", cleanString(thread?.id) || "—"],
    ["Title", cleanString(thread?.title) || "—"],
    ["Status", normalizeThreadStatus(thread?.status)],
    ["cwd", cleanString(thread?.cwd) || "—"],
    ["Model", cleanString(thread?.model) || "—"],
    ["createdAt", cleanString(thread?.createdAt) || "—"],
    ["updatedAt", cleanString(thread?.updatedAt) || "—"],
    ["messageCount", thread?.messageCount != null ? String(thread.messageCount) : "—"],
    ["Preview", cleanString(thread?.preview) || "—"]
  ];
  const extra = [];
  for (const key of [
    "discovered",
    "returned",
    "skipped",
    "sourceDir",
    "detailResolvedVia",
    "detailParseCap",
    "detailSearchTruncated"
  ]) {
    if (meta[key] !== undefined && meta[key] !== null && meta[key] !== "") {
      const val = typeof meta[key] === "object" ? JSON.stringify(meta[key]) : String(meta[key]);
      extra.push([`meta.${key}`, val]);
    }
  }
  const all = entries.concat(extra);
  return `<dl class="kv">${all.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(truncateDisplay(v, METADATA_VALUE_MAX_CHARS))}</dd>`).join("")}</dl>`;
}

function driftHasSignal(drift) {
  if (!drift || typeof drift !== "object") {
    return false;
  }
  const unknown = Number(drift.totalUnknownRecords) || 0;
  const fallback = Number(drift.fallbackCount) || 0;
  if (unknown > 0 || fallback > 0) {
    return true;
  }
  if (cleanString(drift.formatVersion)) {
    return true;
  }
  const types = drift.unknownRecordTypes;
  if (types && typeof types === "object" && Object.keys(types).length) {
    return true;
  }
  return false;
}

function formatListDriftLine(drift) {
  const parts = [];
  if (cleanString(drift.formatVersion)) {
    parts.push(`v${drift.formatVersion}`);
  }
  parts.push(`unknown ${Number(drift.totalUnknownRecords) || 0}`);
  parts.push(`fallback ${Number(drift.fallbackCount) || 0}`);
  return parts.join(" · ");
}

function renderDriftDetailBlocks(thread, detail) {
  const listDrift = thread?.drift;
  const metaDrift = detail?.meta?.drift;
  const blocks = [];
  if (driftHasSignal(listDrift)) {
    blocks.push(renderDriftBlock("List summary — thread.drift", listDrift));
  }
  if (driftHasSignal(metaDrift)) {
    blocks.push(renderDriftBlock("Detail parse — meta.drift", metaDrift));
  }
  if (!blocks.length) {
    return "";
  }
  return `<div class="drift-detail-wrap">${blocks.join("")}</div>`;
}

function renderDriftBlock(title, drift) {
  const types = drift.unknownRecordTypes && typeof drift.unknownRecordTypes === "object"
    ? Object.entries(drift.unknownRecordTypes).map(([key, count]) => `${key}: ${count}`).join(", ")
    : "";
  const version = cleanString(drift.formatVersion) || "—";
  const unknown = String(Number(drift.totalUnknownRecords) || 0);
  const fallback = String(Number(drift.fallbackCount) || 0);
  return `<div class="drift-block">
    <h3 class="drift-heading">${escapeHtml(title)}</h3>
    <div class="drift-grid">
      <span class="thread-meta">formatVersion</span><span>${escapeHtml(version)}</span>
      <span class="thread-meta">totalUnknownRecords</span><span>${escapeHtml(unknown)}</span>
      <span class="thread-meta">fallbackCount</span><span>${escapeHtml(fallback)}</span>
      <span class="thread-meta">unknownRecordTypes</span><span>${escapeHtml(types || "—")}</span>
    </div>
  </div>`;
}

function renderMessage(message) {
  return `<article class="message">
    <div class="message-meta">${escapeHtml([message.role, message.kind, formatDate(message.timestamp)].filter(Boolean).join(" / "))}</div>
    <div class="message-text">${escapeHtml(message.text || "")}</div>
  </article>`;
}

function renderEvent(event) {
  return `<article class="event">
    <div class="message-meta">${escapeHtml([event.level, formatDate(event.timestamp)].filter(Boolean).join(" / "))}</div>
    <div class="event-text">${escapeHtml(event.text || "")}</div>
  </article>`;
}

function getVisibleThreads(providerState) {
  const queryNorm = normalizeSearchQuery(cleanString(providerState.query));
  const statusFilter = STATUS_OPTIONS.includes(providerState.statusFilter) ? providerState.statusFilter : "all";
  const sort = SORT_OPTIONS.includes(providerState.sort) ? providerState.sort : "updated_desc";
  const threads = Array.isArray(providerState.threads) ? providerState.threads.slice() : [];

  const filtered = threads.filter((thread) => {
    const status = normalizeThreadStatus(thread.status);
    if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }
    if (!queryNorm) {
      return true;
    }
    return threadMatchesSearchQuery(thread, queryNorm);
  });

  filtered.sort((a, b) => compareThreads(a, b, sort));
  return filtered;
}

function compareThreads(a, b, sort) {
  if (sort === "title_asc") {
    return cleanString(a.title || a.id).localeCompare(cleanString(b.title || b.id));
  }
  const left = Date.parse(a.updatedAt || "") || 0;
  const right = Date.parse(b.updatedAt || "") || 0;
  return sort === "updated_asc" ? left - right : right - left;
}

function scanBudgetStatusSuffix(provider, providerState) {
  const meta = providerState.meta || {};
  const parts = [];
  if (meta.listScanTruncated) {
    if (provider === "codex") {
      const scanned = meta.scannedRollouts != null ? meta.scannedRollouts : "?";
      const total = meta.discovered != null ? meta.discovered : "?";
      parts.push(
        ` List scan limited: parsed ${scanned} of ${total} rollout files (Settings → AgentHUD → Codex List Scan Max Rollouts; 0 = built-in default).`
      );
    } else {
      const scanned = meta.scannedSources != null ? meta.scannedSources : "?";
      const total = meta.discovered != null ? meta.discovered : "?";
      const tail =
        meta.tailRestoredFromCache > 0
          ? ` ${meta.tailRestoredFromCache} additional sessions loaded from parse cache.`
          : "";
      parts.push(
        ` List scan limited: fully indexed ${scanned} of ${total} Claude sources.${tail} (Settings → Claude List Scan Max Sources; 0 = built-in default).`
      );
    }
  }
  if (meta.cacheWriteTruncated) {
    const cap = meta.cacheWriteCap != null ? meta.cacheWriteCap : "?";
    const omitted = meta.cacheWriteOmitted != null ? meta.cacheWriteOmitted : "?";
    parts.push(
      ` Summary cache write capped at ${cap} rows (${omitted} omitted). Raise Settings → Summary Cache Max Summaries if needed.`
    );
  }
  return parts.join("");
}

function statusText(provider, providerState, visibleThreads, event) {
  const providerLabel = providerDisplayName(provider);
  const cache = providerState.meta?.cache || {};
  if (providerState.error) {
    return providerState.error;
  }
  if (providerState.loading && cache.stale && providerState.threads.length) {
    return `Refreshing ${providerLabel} threads. Showing ${visibleThreads.length} cached summaries.`;
  }
  if (providerState.loading) {
    return `Loading ${providerLabel} thread data.`;
  }
  if (event?.type === "agenthud.refresh") {
    return `Refresh requested at ${event.receivedAt}. Showing ${visibleThreads.length} ${providerLabel} threads.${scanBudgetStatusSuffix(provider, providerState)}`;
  }
  const skipped = Number(providerState.meta?.skipped || 0);
  const skippedSuffix = skipped ? ` ${skipped} source issues skipped.` : "";
  const cacheSuffix = cache.stale
    ? " Cached summaries may be stale."
    : cache.writeError
      ? " Cache write failed; current results are still visible."
      : cache.readError
        ? " Cache read failed; fresh results are visible."
        : "";
  const scanSuffix = scanBudgetStatusSuffix(provider, providerState);
  return `Showing ${visibleThreads.length} of ${providerState.threads.length} ${providerLabel} threads across ${visibleGroupCount(visibleThreads)} status groups.${skippedSuffix}${cacheSuffix}${scanSuffix}`;
}

function normalizeState(state) {
  const base = createThreadPageState(state?.provider);
  return {
    ...base,
    ...state,
    provider: normalizeProvider(state?.provider),
    privacyMode: state?.privacyMode === true,
    codex: {
      ...base.codex,
      ...(state?.codex || {}),
      detailTab: normalizeDetailTab(state?.codex?.detailTab),
      narrowPane: normalizeNarrowPane(state?.codex?.narrowPane)
    },
    claude: {
      ...base.claude,
      ...(state?.claude || {}),
      detailTab: normalizeDetailTab(state?.claude?.detailTab),
      narrowPane: normalizeNarrowPane(state?.claude?.narrowPane)
    }
  };
}

function normalizeProvider(provider) {
  return normalizeProviderId(provider);
}

function normalizeDetailTab(value) {
  const tab = cleanString(String(value || "")).toLowerCase();
  return DETAIL_TAB_IDS.includes(tab) ? tab : "conversation";
}

function truncateDeepLinkQuery(value) {
  return truncateDisplay(value, DEEP_LINK_QUERY_MAX);
}

function expandDeepLinkDetailTab(dtShort, legacyDetailTab) {
  if (cleanString(legacyDetailTab || "")) {
    return normalizeDetailTab(legacyDetailTab);
  }
  const code = cleanString(dtShort || "").toLowerCase();
  if (code === "e") {
    return "events";
  }
  if (code === "s") {
    return "source";
  }
  if (code === "m") {
    return "metadata";
  }
  if (code === "c") {
    return "conversation";
  }
  return "conversation";
}

function sanitizeDeepLinkThreadId(id) {
  return String(id ?? "").replace(/[\r\n\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function serializeAgentHudDeepLink(payload) {
  const params = new URLSearchParams();
  params.set("provider", normalizeProvider(payload?.provider));
  const threadId = sanitizeDeepLinkThreadId(payload?.threadId);
  if (threadId) {
    params.set("threadId", threadId);
  }
  const q = truncateDeepLinkQuery(payload?.query);
  if (q) {
    params.set("query", q);
  }
  const detailTab = normalizeDetailTab(payload?.detailTab);
  if (detailTab === "events") {
    params.set("dt", "e");
  } else if (detailTab === "source") {
    params.set("dt", "s");
  } else if (detailTab === "metadata") {
    params.set("dt", "m");
  }
  return `agenthud://thread?${params.toString()}`;
}

function normalizeNarrowPane(value) {
  return value === "detail" ? "detail" : "list";
}

function providerDisplayName(provider) {
  return PROVIDER_LABELS[normalizeProvider(provider)] || "Provider";
}

function groupThreadsByStatus(threads) {
  const grouped = {
    running: [],
    recent: [],
    idle: [],
    archived: [],
    unknown: []
  };
  for (const thread of threads) {
    const status = normalizeThreadStatus(thread.status);
    grouped[status].push(thread);
  }
  return grouped;
}

function groupTitle(provider, status) {
  return statusLabel(provider, status);
}

function statusLabel(provider, status) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedStatus = normalizeThreadStatus(status);
  if (normalizedProvider === "claude" && normalizedStatus === "running") {
    return "Running (Best-Effort)";
  }
  if (normalizedProvider === "claude" && normalizedStatus === "unknown") {
    return "Unknown (Best-Effort)";
  }
  return titleCase(normalizedStatus);
}

function visibleGroupCount(threads) {
  const groups = new Set((threads || []).map((thread) => normalizeThreadStatus(thread.status)));
  return groups.size;
}

function nativeOpenLabel(providerLabel) {
  if (providerLabel === "Claude") {
    return "Open Transcript";
  }
  return "Open in Codex";
}

function titleCase(value) {
  const text = cleanString(value);
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightMatches(text, query) {
  const safeText = escapeHtml(text);
  const normalized = normalizeSearchQuery(query);
  const tokens = tokenizeSearchQuery(normalized);
  if (!tokens.length) {
    return safeText;
  }

  // Create regex pattern for all tokens
  const pattern = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (!pattern) {
    return safeText;
  }

  const regex = new RegExp(`(${pattern})`, "gi");
  // Since we already escaped HTML, we need to be careful if tokens overlap with &amp; etc.
  // But our search query tokens are likely plain text.
  return safeText.replace(regex, "<mark>$1</mark>");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

module.exports = {
  createThreadPageState,
  renderThreadPage,
  getVisibleThreads,
  normalizeProvider,
  normalizeDetailTab,
  DETAIL_TAB_IDS,
  DEEP_LINK_QUERY_MAX,
  truncateDeepLinkQuery,
  expandDeepLinkDetailTab,
  sanitizeDeepLinkThreadId,
  serializeAgentHudDeepLink
};
