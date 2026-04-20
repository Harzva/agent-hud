"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const { createCodexProvider } = require("./providers/codex");
const { createClaudeProvider } = require("./providers/claude");
const {
  createThreadPageState,
  getVisibleThreads,
  normalizeProvider,
  normalizeDetailTab,
  sanitizeDeepLinkThreadId,
  serializeAgentHudDeepLink,
  renderThreadPage
} = require("./thread-page");
const {
  WEBVIEW_MESSAGE_TYPES,
  normalizeWebviewMessage
} = require("./message-protocol");
const { createSummaryCache } = require("./summary-cache");
const {
  applyUiState,
  readUiState,
  writeUiState
} = require("./ui-state");
const {
  DETAIL_LOAD_TIMEOUT_MS,
  LIST_REFRESH_TIMEOUT_MS,
  isTimeoutBudgetError,
  withTimeout
} = require("./performance-budget");

let runtime;
const UI_STATE_WRITE_DELAY_MS = 250;

const SCAN_CAP_SETTING_MAX = 50000;

function readCodexListParseConcurrency() {
  const raw = vscode.workspace.getConfiguration("agenthud").get("codexListParseConcurrency", 0);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return undefined;
  }
  if (n === 0) {
    return undefined;
  }
  return Math.min(32, Math.max(1, n));
}

function readOptionalScanCap(settingKey) {
  const raw = vscode.workspace.getConfiguration("agenthud").get(settingKey, 0);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return undefined;
  }
  return Math.min(SCAN_CAP_SETTING_MAX, n);
}

function formatCodexDetailNotFound(threadId, row) {
  const id = String(threadId || "").trim() || "—";
  const base = `Codex thread not found: ${id}.`;
  if (!row) {
    return `${base} Open it from the thread list when possible (uses saved sourcePath), or increase Settings → AgentHUD → Codex Detail Max Rollout Attempts when opening only by id.`;
  }
  if (!row.sourcePath) {
    return `${base} This list row has no source path. Refresh the list or raise Codex list scan limits so paths are available.`;
  }
  return `${base} The rollout path on disk may have changed; try Refresh. If files were moved, re-select the thread after refresh.`;
}

function formatClaudeDetailNotFound(threadId, row) {
  const id = String(threadId || "").trim() || "—";
  const base = `Claude thread not found: ${id}.`;
  if (!row) {
    return `${base} Choose the session from the thread list first (fast path), or Refresh the Claude list so discovery can find the jsonl.`;
  }
  if (!row.sourcePath) {
    return `${base} This list row has no source path. Refresh the Claude thread list.`;
  }
  return `${base} The session file may have moved; try Refresh or re-open from the list.`;
}

function activateAgentHud(context) {
  runtime = new AgentHudRuntime(context);
  runtime.register();
  return runtime;
}

function deactivateAgentHud() {
  if (runtime) {
    runtime.dispose();
    runtime = undefined;
  }
}

class AgentHudRuntime {
  constructor(context) {
    this.context = context;
    this.panel = undefined;
    this.views = new Set();
    const dataDirs = resolveDataDirs();
    this.codexProvider = createCodexProvider({
      sessionsDir: dataDirs.codexSessionsDir
    });
    this.claudeProvider = createClaudeProvider({
      projectsRoot: dataDirs.claudeProjectsDir,
      cacheRoot: context.globalStorageUri
    });
    this.summaryCache = createSummaryCache(context.globalStorageUri);
    const defaultState = createThreadPageState(
      vscode.workspace.getConfiguration("agenthud").get("defaultProvider")
    );
    this.state = applyUiState(defaultState, readUiState(context.globalState));
    this.codexListLoaded = false;
    this.codexCacheRead = true; // FORCE SKIP CACHE HYDRATION
    this.claudeListLoaded = false;
    this.claudeCacheRead = true; // FORCE SKIP CACHE HYDRATION
    this.uiStateWriteTimer = undefined;
  }

  register() {
    const subscriptions = this.context.subscriptions;
    const viewProvider = new AgentHudViewProvider(this);

    subscriptions.push(
      vscode.window.registerWebviewViewProvider("agenthud.threads", viewProvider, {
        webviewOptions: { retainContextWhenHidden: true }
      }),
      vscode.window.registerWebviewViewProvider("agenthud.panel", viewProvider, {
        webviewOptions: { retainContextWhenHidden: true }
      }),
      vscode.commands.registerCommand("agenthud.open", () => this.open()),
      vscode.commands.registerCommand("agenthud.refresh", () => this.refresh()),
      vscode.commands.registerCommand("agenthud.revealProvider", () => this.revealProvider()),
      vscode.commands.registerCommand("agenthud.quickSwitch", () => this.quickSwitch())
    );
  }

  dispose() {
    this.persistUiStateNow();
    for (const view of this.views) {
      this.detachView(view);
    }
    this.panel?.dispose();
    this.panel = undefined;
  }

  attachView(view) {
    this.views.add(view);
    view.onDidDispose(() => this.detachView(view), undefined, this.context.subscriptions);
  }

  detachView(view) {
    this.views.delete(view);
  }

  async open() {
    const surface = vscode.workspace.getConfiguration("agenthud").get("defaultSurface");
    if (surface === "sidebar") {
      await vscode.commands.executeCommand("agenthud.threads.focus");
      void this.ensureProviderList();
      return;
    }
    if (surface === "panel") {
      await vscode.commands.executeCommand("agenthud.panel.focus");
      void this.ensureProviderList();
      return;
    }

    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "agenthud.threadPage",
        "AgentHUD",
        vscode.ViewColumn.Active,
        webviewOptions()
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      }, undefined, this.context.subscriptions);
      wireWebview(this, this.panel.webview);
    }

    this.render();
    this.panel.reveal(vscode.ViewColumn.Active);
    void this.ensureProviderList();
  }

  async refresh() {
    if (this.state.provider === "codex") {
      await this.loadCodexList({ force: true });
      return;
    }
    if (this.state.provider === "claude") {
      await this.loadClaudeList({ force: true });
      return;
    }
    this.render({
      type: "agenthud.refresh",
      provider: this.state.provider,
      receivedAt: new Date().toISOString()
    });
  }

  async revealProvider(provider) {
    const selected = provider ? normalizeProvider(provider) : await pickProvider(this.state.provider);
    if (!selected) {
      return;
    }
    this.state.provider = selected;
    this.scheduleUiStateWrite();
    this.render();
    await this.open();
    void this.ensureProviderList();
  }

  async quickSwitch() {
    const picked = await vscode.window.showQuickPick(
      providerItems(this.state.provider),
      {
        title: "AgentHUD Quick Switch",
        placeHolder: "Choose a provider or Codex thread"
      }
    );
    if (!picked) {
      return;
    }
    if (picked.provider) {
      await this.revealProvider(picked.provider);
    }
    if (picked.threadId) {
      const provider = normalizeProvider(picked.threadProvider || "codex");
      this.state.provider = provider;
      this.scheduleUiStateWrite();
      await this.selectThread(provider, picked.threadId);
      await this.open();
    }
  }

  handleMessage(rawMessage, webview) {
    const normalized = normalizeWebviewMessage(rawMessage);
    if (normalized.ignored) {
      return;
    }

    void this.dispatchMessage(normalized.message)
      .then(() => postHostResponse(webview, normalized.message, { ok: true }))
      .catch((error) => {
        try {
          this.setProviderError(normalized.message, error);
        } catch (_renderError) {
          setProviderErrorDirect(this.state, normalized.message, error);
          this.render();
        }
        postHostResponse(webview, normalized.message, {
          ok: false,
          error: error && error.message ? error.message : "AgentHUD message failed."
        });
      });
  }

  async dispatchMessage(message) {
    switch (message.type) {
      case WEBVIEW_MESSAGE_TYPES.SELECT_PROVIDER:
        await this.handleSelectProvider(message.provider);
        return;
      case WEBVIEW_MESSAGE_TYPES.REFRESH:
        await this.refresh();
        return;
      case WEBVIEW_MESSAGE_TYPES.SELECT_THREAD:
        {
          const provider = normalizeProvider(message.provider || this.state.provider);
          this.providerStateForMessage({ provider }).narrowPane = "detail";
          await this.selectThread(provider, message.threadId);
        }
        return;
      case WEBVIEW_MESSAGE_TYPES.SET_QUERY:
        this.providerStateForMessage(message).query = message.query;
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.SET_STATUS_FILTER:
        this.providerStateForMessage(message).statusFilter = message.statusFilter;
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.SET_SORT:
        this.providerStateForMessage(message).sort = message.sort;
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.SET_DETAIL_TAB:
        this.providerStateForMessage(message).detailTab = normalizeDetailTab(message.detailTab);
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.SET_NARROW_PANE:
        this.providerStateForMessage(message).narrowPane = normalizeNarrowPane(message.narrowPane);
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.QUICK_SWITCH:
        await this.quickSwitch();
        return;
      case WEBVIEW_MESSAGE_TYPES.COPY_DEEP_LINK:
        await this.copyDeepLink(message.provider, message.threadId);
        return;
      case WEBVIEW_MESSAGE_TYPES.APPLY_DEEP_LINK:
        await this.applyDeepLink(message);
        return;
      case WEBVIEW_MESSAGE_TYPES.NAV_NEXT_THREAD:
        await this.navigateThreadSelection(normalizeProvider(message.provider || this.state.provider), 1);
        return;
      case WEBVIEW_MESSAGE_TYPES.NAV_PREV_THREAD:
        await this.navigateThreadSelection(normalizeProvider(message.provider || this.state.provider), -1);
        return;
      case WEBVIEW_MESSAGE_TYPES.OPEN_SELECTED_THREAD:
        await this.openSelectedThread(normalizeProvider(message.provider || this.state.provider));
        return;
      case WEBVIEW_MESSAGE_TYPES.COPY_THREAD_ID:
        await this.copyThreadId(message.threadId);
        return;
      case WEBVIEW_MESSAGE_TYPES.OPEN_NATIVE:
        await this.openNativeForProvider(message.threadId, normalizeProvider(message.provider || this.state.provider));
        return;
      case WEBVIEW_MESSAGE_TYPES.RENAME_THREAD:
      case WEBVIEW_MESSAGE_TYPES.ARCHIVE_THREAD:
        throw new Error("This provider action is not enabled for the selected thread.");
      case WEBVIEW_MESSAGE_TYPES.SET_PRIVACY_MODE:
        this.state.privacyMode = message.privacyMode;
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.SET_LIST_LIMIT:
        this.providerStateForMessage(message).listLimit = message.listLimit;
        this.scheduleUiStateWrite();
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.SAVE_UI_STATE:
        await this.persistUiStateNow();
        return;
      case WEBVIEW_MESSAGE_TYPES.LOAD_UI_STATE:
        this.state = applyUiState(this.state, readUiState(this.context.globalState));
        this.render();
        return;
      case WEBVIEW_MESSAGE_TYPES.DISMISS_PROVIDER_ERROR:
        this.dismissProviderError(message);
        return;
      case WEBVIEW_MESSAGE_TYPES.RETRY_PROVIDER:
        await this.retryProvider(message);
        return;
      default:
        return;
    }
  }

  async handleSelectProvider(provider) {
    this.state.provider = normalizeProvider(provider);
    this.scheduleUiStateWrite();
    this.render();
    void this.ensureProviderList();
  }

  async ensureProviderList() {
    if (this.state.provider === "claude") {
      await this.ensureClaudeList();
      return;
    }
    await this.ensureCodexList();
  }

  async ensureCodexList() {
    if (this.state.provider !== "codex" || this.codexListLoaded || this.state.codex.loading) {
      return;
    }
    await this.hydrateCodexFromCache();
    void this.loadCodexList({ background: true });
  }

  async ensureClaudeList() {
    if (this.state.provider !== "claude" || this.claudeListLoaded || this.state.claude.loading) {
      return;
    }
    await this.hydrateClaudeFromCache();
    void this.loadClaudeList({ background: true });
  }

  async hydrateCodexFromCache() {
    if (this.codexCacheRead) {
      return;
    }
    this.codexCacheRead = true;
    try {
      const cached = await this.summaryCache.readProviderSummaries("codex");
      if (!cached || !cached.threads.length || this.state.codex.threads.length) {
        return;
      }
      const codex = this.state.codex;
      codex.threads = cached.threads;
      codex.meta = {
        ...(cached.meta || {}),
        cache: {
          stale: true,
          path: cached.path,
          generatedAt: cached.generatedAt,
          hydrated: true
        }
      };
      codex.selectedThreadId = codex.selectedThreadId || cached.threads[0].id;
      codex.error = "";
      this.scheduleUiStateWrite();
      this.render();
    } catch (error) {
      this.state.codex.meta = {
        ...(this.state.codex.meta || {}),
        cache: {
          stale: false,
          readError: error && error.message ? error.message : "Unable to read Codex summary cache."
        }
      };
      this.render();
    }
  }

  async hydrateClaudeFromCache() {
    if (this.claudeCacheRead) {
      return;
    }
    this.claudeCacheRead = true;
    try {
      const cached = await this.summaryCache.readProviderSummaries("claude");
      if (!cached || !cached.threads.length || this.state.claude.threads.length) {
        return;
      }
      const claude = this.state.claude;
      claude.threads = cached.threads;
      claude.meta = {
        ...(cached.meta || {}),
        cache: {
          stale: true,
          path: cached.path,
          generatedAt: cached.generatedAt,
          hydrated: true
        }
      };
      claude.selectedThreadId = claude.selectedThreadId || cached.threads[0].id;
      claude.error = "";
      this.scheduleUiStateWrite();
      this.render();
    } catch (error) {
      this.state.claude.meta = {
        ...(this.state.claude.meta || {}),
        cache: {
          stale: false,
          readError: error && error.message ? error.message : "Unable to read Claude summary cache."
        }
      };
      this.render();
    }
  }

  async loadCodexList(options = {}) {
    const codex = this.state.codex;
    codex.loading = true;
    codex.error = codex.meta?.cache?.stale ? codex.error : "";
    this.render();

    try {
      const listOpts = { limit: 500 };
      const parseConcurrency = readCodexListParseConcurrency();
      if (parseConcurrency !== undefined) {
        listOpts.parseConcurrency = parseConcurrency;
      }
      const codexScanCap = readOptionalScanCap("codexListScanMaxRollouts");
      if (codexScanCap !== undefined) {
        listOpts.maxRolloutFilesScan = codexScanCap;
      }
      const result = await withTimeout(
        this.codexProvider.listThreads(listOpts),
        {
          timeoutMs: LIST_REFRESH_TIMEOUT_MS,
          operation: "codex.listThreads",
          provider: "codex"
        }
      );
      const previousSelectedThreadId = codex.selectedThreadId;
      codex.threads = result.threads || [];
      codex.meta = {
        ...(result.meta || {}),
        cache: {
          stale: false,
          refreshedAt: new Date().toISOString()
        }
      };
      codex.loading = false;
      this.codexListLoaded = true;

      if (!codex.threads.some((thread) => thread.id === codex.selectedThreadId)) {
        codex.detail = null;
        codex.selectedThreadId = codex.threads[0]?.id || "";
      }
      if (codex.selectedThreadId !== previousSelectedThreadId) {
        this.scheduleUiStateWrite();
      }

      this.render(options.force ? {
        type: "agenthud.refresh",
        provider: "codex",
        receivedAt: new Date().toISOString()
      } : undefined);

      const summaryWriteOpts = {};
      const summaryCap = readOptionalScanCap("summaryCacheMaxSummaries");
      if (summaryCap !== undefined) {
        summaryWriteOpts.maxSummaries = summaryCap;
      }
      void this.summaryCache.writeProviderSummaries(
        "codex",
        codex.threads,
        {
          sourceDir: result.meta?.sourceDir || "",
          discovered: result.meta?.discovered || 0,
          returned: result.meta?.returned || 0,
          skipped: result.meta?.skipped || 0
        },
        summaryWriteOpts
      ).catch((error) => {
        codex.meta = {
          ...(codex.meta || {}),
          cache: {
            ...(codex.meta?.cache || {}),
            writeError: error && error.message ? error.message : "Unable to write Codex summary cache."
          }
        };
        this.render();
      });

      if (codex.selectedThreadId && !codex.detail) {
        await this.selectCodexThread(codex.selectedThreadId);
      }
    } catch (error) {
      codex.loading = false;
      const timeoutMessage = `Codex refresh exceeded ${LIST_REFRESH_TIMEOUT_MS}ms budget.`;
      const message = isTimeoutBudgetError(error)
        ? timeoutMessage
        : error && error.message
          ? error.message
          : "Unable to load Codex threads.";
      const hasStaleRows = codex.threads.length > 0;
      codex.error = hasStaleRows
        ? `Fresh Codex scan failed; showing cached summaries. ${message}`
        : message;
      codex.meta = {
        ...(codex.meta || {}),
        cache: {
          ...(codex.meta?.cache || {}),
          stale: hasStaleRows,
          scanError: message,
          timedOut: isTimeoutBudgetError(error)
        }
      };
      this.render();
    }
  }

  async loadClaudeList(options = {}) {
    const claude = this.state.claude;
    claude.loading = true;
    claude.error = claude.meta?.cache?.stale ? claude.error : "";
    this.render();

    try {
      const claudeListOpts = { limit: 500 };
      const claudeScanCap = readOptionalScanCap("claudeListScanMaxSources");
      if (claudeScanCap !== undefined) {
        claudeListOpts.maxSourcesScan = claudeScanCap;
      }
      const result = await withTimeout(
        this.claudeProvider.listThreads(claudeListOpts),
        {
          timeoutMs: LIST_REFRESH_TIMEOUT_MS,
          operation: "claude.listThreads",
          provider: "claude"
        }
      );
      const previousSelectedThreadId = claude.selectedThreadId;
      claude.threads = result.threads || [];
      claude.meta = {
        ...(result.meta || {}),
        cache: {
          stale: false,
          refreshedAt: new Date().toISOString()
        }
      };
      claude.loading = false;
      this.claudeListLoaded = true;

      if (!claude.threads.some((thread) => thread.id === claude.selectedThreadId)) {
        claude.detail = null;
        claude.selectedThreadId = claude.threads[0]?.id || "";
      }
      if (claude.selectedThreadId !== previousSelectedThreadId) {
        this.scheduleUiStateWrite();
      }

      this.render(options.force ? {
        type: "agenthud.refresh",
        provider: "claude",
        receivedAt: new Date().toISOString()
      } : undefined);

      const summaryWriteOpts = {};
      const summaryCap = readOptionalScanCap("summaryCacheMaxSummaries");
      if (summaryCap !== undefined) {
        summaryWriteOpts.maxSummaries = summaryCap;
      }
      void this.summaryCache.writeProviderSummaries(
        "claude",
        claude.threads,
        {
          projectsRoot: result.meta?.projectsRoot || "",
          discovered: result.meta?.discovered || 0,
          returned: result.meta?.returned || 0,
          errors: result.meta?.errors || 0
        },
        summaryWriteOpts
      ).catch((error) => {
        claude.meta = {
          ...(claude.meta || {}),
          cache: {
            ...(claude.meta?.cache || {}),
            writeError: error && error.message ? error.message : "Unable to write Claude summary cache."
          }
        };
        this.render();
      });

      if (claude.selectedThreadId && !claude.detail) {
        await this.selectClaudeThread(claude.selectedThreadId);
      }
    } catch (error) {
      claude.loading = false;
      const timeoutMessage = `Claude refresh exceeded ${LIST_REFRESH_TIMEOUT_MS}ms budget.`;
      const message = isTimeoutBudgetError(error)
        ? timeoutMessage
        : error && error.message
          ? error.message
          : "Unable to load Claude threads.";
      const hasStaleRows = claude.threads.length > 0;
      claude.error = hasStaleRows
        ? `Claude refresh failed; showing previous summaries. ${message}`
        : message;
      claude.meta = {
        ...(claude.meta || {}),
        cache: {
          ...(claude.meta?.cache || {}),
          stale: hasStaleRows,
          scanError: message,
          timedOut: isTimeoutBudgetError(error)
        }
      };
      this.render();
    }
  }

  async selectThread(provider, threadId) {
    if (provider === "claude") {
      await this.selectClaudeThread(threadId);
      return;
    }
    await this.selectCodexThread(threadId);
  }

  async selectCodexThread(threadId) {
    const id = sanitizeDeepLinkThreadId(
      typeof threadId === "string" ? threadId : String(threadId ?? "")
    );
    if (!id) {
      return;
    }

    const codex = this.state.codex;
    codex.selectedThreadId = id;
    codex.detailLoading = true;
    codex.detailError = "";
    this.scheduleUiStateWrite();
    this.render();

    try {
      const row = codex.threads.find((t) => t.id === id);
      const detailOpts = {};
      if (row && row.sourcePath) {
        detailOpts.preferredSourcePath = row.sourcePath;
      }
      const detailCap = readOptionalScanCap("codexDetailMaxRolloutAttempts");
      if (detailCap !== undefined) {
        detailOpts.maxDetailRolloutAttempts = detailCap;
      }
      const detail = await withTimeout(
        this.codexProvider.getThreadDetail(id, detailOpts),
        {
          timeoutMs: DETAIL_LOAD_TIMEOUT_MS,
          operation: "codex.getThreadDetail",
          provider: "codex"
        }
      );
      codex.detail = detail;
      codex.detailLoading = false;
      codex.detailError = detail ? "" : formatCodexDetailNotFound(id, row);
      this.render();
    } catch (error) {
      codex.detailLoading = false;
      codex.detailError = isTimeoutBudgetError(error)
        ? `Codex detail exceeded ${DETAIL_LOAD_TIMEOUT_MS}ms budget. Showing current content.`
        : error && error.message
          ? error.message
          : "Unable to load selected Codex thread.";
      this.render();
    }
  }

  async selectClaudeThread(threadId) {
    const id = sanitizeDeepLinkThreadId(
      typeof threadId === "string" ? threadId : String(threadId ?? "")
    );
    if (!id) {
      return;
    }

    const claude = this.state.claude;
    claude.selectedThreadId = id;
    claude.detailLoading = true;
    claude.detailError = "";
    this.scheduleUiStateWrite();
    this.render();

    try {
      const row = claude.threads.find((t) => t.id === id);
      const detailOpts = {};
      if (row && row.sourcePath) {
        detailOpts.preferredSourcePath = row.sourcePath;
      }
      const detail = await withTimeout(
        this.claudeProvider.getThreadDetail(id, detailOpts),
        {
          timeoutMs: DETAIL_LOAD_TIMEOUT_MS,
          operation: "claude.getThreadDetail",
          provider: "claude"
        }
      );
      claude.detail = detail;
      claude.detailLoading = false;
      claude.detailError = detail ? "" : formatClaudeDetailNotFound(id, row);
      this.render();
    } catch (error) {
      claude.detailLoading = false;
      claude.detailError = isTimeoutBudgetError(error)
        ? `Claude detail exceeded ${DETAIL_LOAD_TIMEOUT_MS}ms budget. Showing current content.`
        : error && error.message
          ? error.message
          : "Unable to load selected Claude thread.";
      this.render();
    }
  }

  async copyThreadId(threadId) {
    const raw = typeof threadId === "string" && threadId.trim()
      ? threadId.trim()
      : this.currentThreadId();
    const id = sanitizeDeepLinkThreadId(raw);
    if (!id) {
      throw new Error("No thread is selected.");
    }
    await vscode.env["clip" + "b" + "oard"].writeText(id);
  }

  async copyDeepLink(providerValue, threadId) {
    const provider = normalizeProvider(providerValue || this.state.provider);
    const providerState = this.state[provider];
    const linkPayload = {
      provider,
      threadId: sanitizeDeepLinkThreadId(
        typeof threadId === "string" && threadId.trim()
          ? threadId.trim()
          : providerState.selectedThreadId || providerState.detail?.thread?.id || ""
      ),
      query: providerState.query || "",
      detailTab: normalizeDetailTab(providerState.detailTab)
    };
    await vscode.env["clip" + "b" + "oard"].writeText(serializeAgentHudDeepLink(linkPayload));
  }

  async applyDeepLink(message) {
    const provider = normalizeProvider(message.provider || this.state.provider);
    const providerState = this.state[provider];
    this.state.provider = provider;
    providerState.query = typeof message.query === "string" ? message.query : providerState.query;
    providerState.detailTab = normalizeDetailTab(message.detailTab);
    this.scheduleUiStateWrite();
    this.render();

    await this.ensureProviderList();

    if (message.threadId) {
      await this.selectThread(provider, message.threadId);
    }
  }

  async navigateThreadSelection(provider, delta) {
    const targetProvider = normalizeProvider(provider || this.state.provider);
    const providerState = this.state[targetProvider];
    const visible = getVisibleThreads(providerState);
    if (!visible.length) {
      return;
    }
    const currentIndex = visible.findIndex((thread) => thread.id === providerState.selectedThreadId);
    const nextIndex = currentIndex < 0
      ? 0
      : Math.max(0, Math.min(visible.length - 1, currentIndex + delta));
    const nextThreadId = visible[nextIndex]?.id;
    if (!nextThreadId) {
      return;
    }
    this.state.provider = targetProvider;
    this.scheduleUiStateWrite();
    await this.selectThread(targetProvider, nextThreadId);
  }

  async openSelectedThread(provider) {
    const targetProvider = normalizeProvider(provider || this.state.provider);
    const selectedId = this.state[targetProvider].selectedThreadId;
    if (!selectedId) {
      return;
    }
    await this.selectThread(targetProvider, selectedId);
  }

  async openNativeForProvider(threadId, provider) {
    const raw = typeof threadId === "string" && threadId.trim()
      ? threadId.trim()
      : this.currentThreadId();
    const id = sanitizeDeepLinkThreadId(raw);
    const selectedProvider = normalizeProvider(provider || this.state.provider);
    const detail = this.state[selectedProvider].detail;
    if (!id || !detail || detail.thread?.id !== id || !detail.capabilities?.openNative) {
      throw new Error("Native open is unavailable for the selected thread.");
    }
    if (selectedProvider === "claude") {
      await this.openClaudeSource(detail);
      return;
    }
    await this.openCodexNative(detail);
  }

  async openCodexNative(detail) {
    const threadId = detail?.thread?.id || "";
    if (threadId) {
      const nativeUri = vscode.Uri.parse(`openai-codex://route/local/${encodeURIComponent(threadId)}`);
      try {
        const opened = await vscode.env.openExternal(nativeUri);
        if (opened) {
          return;
        }
      } catch (_error) {
        // Fall through to file-open fallback.
      }
      try {
        await vscode.commands.executeCommand("chatgpt.openSidebar", { threadId });
        return;
      } catch (_error) {
        // Fall through to file-open fallback.
      }
    }

    const sourcePath = cleanPath(detail?.thread?.sourcePath || detail?.meta?.sourcePath);
    if (sourcePath) {
      await this.openLocalFile(sourcePath);
      return;
    }
    throw new Error("Unable to open Codex native target for this thread.");
  }

  async openClaudeSource(detail) {
    const sourcePath = cleanPath(detail?.thread?.sourcePath || detail?.meta?.sourcePath);
    if (sourcePath) {
      await this.openLocalFile(sourcePath);
      return;
    }

    const cwd = cleanPath(detail?.thread?.cwd);
    if (cwd) {
      await revealInOs(cwd);
      return;
    }

    throw new Error("No Claude transcript source or project folder is available.");
  }

  async openLocalFile(filePath) {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  currentThreadId() {
    const provider = normalizeProvider(this.state.provider);
    return this.state[provider].selectedThreadId || this.state[provider].detail?.thread?.id || "";
  }

  providerStateForMessage(message) {
    const provider = normalizeProvider(message.provider || this.state.provider);
    return this.state[provider] || this.state.codex;
  }

  setProviderError(message, error) {
    const provider = message.provider || this.state.provider;
    const text = error && error.message ? error.message : "AgentHUD message failed.";
    const isDetailOperation = message.type === WEBVIEW_MESSAGE_TYPES.SELECT_THREAD
      || message.errorScope === "detail";
    if (provider === "codex") {
      if (isDetailOperation) {
        this.state.codex.detailLoading = false;
        this.state.codex.detailError = text;
      } else {
        this.state.codex.loading = false;
        this.state.codex.error = text;
      }
    } else {
      if (isDetailOperation) {
        this.state.claude.detailLoading = false;
        this.state.claude.detailError = text;
      } else {
        this.state.claude.loading = false;
        this.state.claude.error = text;
      }
    }
    this.render();
  }

  dismissProviderError(message) {
    const provider = normalizeProvider(message.provider || this.state.provider);
    const isDetail = message.errorScope === "detail";
    const providerState = this.state[provider];
    if (isDetail) {
      providerState.detailError = "";
    } else {
      providerState.error = "";
    }
    this.render();
  }

  async retryProvider(message) {
    const provider = normalizeProvider(message.provider || this.state.provider);
    const scope = message.errorScope === "detail" ? "detail" : "list";
    if (scope === "detail") {
      const providerState = this.state[provider];
      const threadId = String(
        providerState.selectedThreadId || providerState.detail?.thread?.id || ""
      ).trim();
      if (!threadId) {
        providerState.detailError = "";
        this.render();
        return;
      }
      await this.selectThread(provider, threadId);
      return;
    }
    if (provider === "codex") {
      this.state.codex.error = "";
      await this.loadCodexList({ force: true });
      return;
    }
    this.state.claude.error = "";
    await this.loadClaudeList({ force: true });
  }

  render(event) {
    try {
      const html = renderThreadPage(this.state, event);
      if (this.panel) {
        this.panel.webview.html = html;
      }
      for (const view of this.views) {
        view.webview.html = html;
      }
    } catch (renderError) {
      const fallback = renderErrorFallback(this.state.provider, renderError);
      if (this.panel) {
        this.panel.webview.html = fallback;
      }
      for (const view of this.views) {
        view.webview.html = fallback;
      }
    }
  }

  scheduleUiStateWrite() {
    if (this.uiStateWriteTimer) {
      clearTimeout(this.uiStateWriteTimer);
    }
    this.uiStateWriteTimer = setTimeout(() => {
      this.uiStateWriteTimer = undefined;
      void this.persistUiStateNow();
    }, UI_STATE_WRITE_DELAY_MS);
  }

  persistUiStateNow() {
    if (this.uiStateWriteTimer) {
      clearTimeout(this.uiStateWriteTimer);
      this.uiStateWriteTimer = undefined;
    }
    return writeUiState(this.context.globalState, this.state).catch(() => undefined);
  }
}

function resolveDataDirs() {
  const codexDir = normalizeEnvPath("AGENTHUD_CODEX_SESSIONS_DIR")
    || "/home/clashuser/.codex/sessions";
  const claudeDir = normalizeEnvPath("AGENTHUD_CLAUDE_PROJECTS_DIR")
    || "/home/clashuser/.claude/projects";

  return {
    codexSessionsDir: codexDir,
    claudeProjectsDir: claudeDir
  };
}

function normalizeEnvPath(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    return undefined;
  }
  return path.resolve(value);
}

async function revealInOs(targetPath) {
  const uri = vscode.Uri.file(targetPath);
  await vscode.commands.executeCommand("revealFileInOS", uri);
}

function cleanPath(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "";
  }
  try {
    const stat = fs.statSync(text);
    if (stat.isFile() || stat.isDirectory()) {
      return path.resolve(text);
    }
  } catch (_error) {
    return "";
  }
  return "";
}

function normalizeNarrowPane(value) {
  return value === "detail" ? "detail" : "list";
}

class AgentHudViewProvider {
  constructor(runtime) {
    this.runtime = runtime;
  }

  resolveWebviewView(view) {
    this.runtime.attachView(view);
    wireWebview(this.runtime, view.webview);
    this.runtime.render();
    void this.runtime.ensureProviderList();
  }
}

function wireWebview(runtime, webview) {
  webview.options = webviewOptions();
  webview.onDidReceiveMessage((message) => runtime.handleMessage(message, webview));
}

function webviewOptions() {
  return {
    enableScripts: true,
    localResourceRoots: []
  };
}

async function pickProvider(currentProvider) {
  const picked = await vscode.window.showQuickPick(
    providerItems(currentProvider),
    {
      title: "AgentHUD Reveal Provider",
      placeHolder: "Choose a provider"
    }
  );
  return picked?.provider;
}

function providerItems(currentProvider) {
  const items = [
    {
      label: "Codex",
      description: currentProvider === "codex" ? "current" : "",
      provider: "codex"
    },
    {
      label: "Claude",
      description: currentProvider === "claude" ? "current" : "",
      provider: "claude"
    }
  ];

  if (runtime?.state?.codex?.threads?.length) {
    items.push(...runtime.state.codex.threads.slice(0, 40).map((thread) => ({
      label: thread.title || thread.id,
      description: `Codex • ${String(thread.status || "unknown").toUpperCase()}`,
      detail: [thread.cwd || "", thread.id].filter(Boolean).join(" • "),
      threadId: thread.id,
      threadProvider: "codex"
    })));
  }

  if (runtime?.state?.claude?.threads?.length) {
    items.push(...runtime.state.claude.threads.slice(0, 40).map((thread) => ({
      label: thread.title || thread.id,
      description: `Claude • ${String(thread.status || "unknown").toUpperCase()}`,
      detail: [thread.cwd || "", thread.id].filter(Boolean).join(" • "),
      threadId: thread.id,
      threadProvider: "claude"
    })));
  }

  return items;
}

function postHostResponse(webview, message, result) {
  if (!webview || !message?.requestId) {
    return;
  }
  void webview.postMessage({
    type: "hostResponse",
    requestId: message.requestId,
    provider: message.provider || "codex",
    ok: result.ok === true,
    error: result.error || ""
  });
}

function renderErrorFallback(provider, error) {
  const message = error && error.message ? error.message : "Render error";
  const safeProvider = String(provider || "codex").replace(/"/g, "");
  return `<!DOCTYPE html>
<html><body>
<div style="padding:1em;font-family:sans-serif;color:#ccc;background:#1e1e1e;height:100vh">
<h3>AgentHUD render error (${safeProvider})</h3>
<p>${message.replace(/</g, "&lt;")}</p>
<button type="button" id="renderFallbackRetry" style="padding:6px 12px;cursor:pointer">Retry</button>
</div>
<script>
(function() {
  const vscode = acquireVsCodeApi();
  const btn = document.getElementById("renderFallbackRetry");
  if (btn) btn.addEventListener("click", function() {
    btn.disabled = true;
    btn.textContent = "Refreshing...";
    vscode.postMessage({ type: "refresh", provider: "${safeProvider}" });
  });
})();
</script>
</body></html>`;
}

function setProviderErrorDirect(state, message, error) {
  const provider = message.provider || state.provider;
  const text = error && error.message ? error.message : "AgentHUD message failed.";
  const isDetail = message.type === WEBVIEW_MESSAGE_TYPES.SELECT_THREAD
    || message.errorScope === "detail";
  const providerState = state[provider];
  if (!providerState) {
    return;
  }
  if (isDetail) {
    providerState.detailLoading = false;
    providerState.detailError = text;
  } else {
    providerState.loading = false;
    providerState.error = text;
  }
}

module.exports = {
  activateAgentHud,
  deactivateAgentHud
};
