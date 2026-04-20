"use strict";

const assert = require("assert");
const {
  createThreadPageState,
  renderThreadPage,
  getVisibleThreads,
  normalizeProvider,
  expandDeepLinkDetailTab,
  truncateDeepLinkQuery,
  DEEP_LINK_QUERY_MAX,
  sanitizeDeepLinkThreadId,
  serializeAgentHudDeepLink
} = require("./thread-page");

function assertPureThreadPageShell(html) {
  assert.match(html, /aria-label="Provider tabs"/);
  const tabs = (html.match(/data-provider-tab="[^"]+"/g) || []).slice().sort();
  assert.deepStrictEqual(tabs, ["data-provider-tab=\"claude\"", "data-provider-tab=\"codex\""]);
  const lower = html.toLowerCase();
  for (const forbidden of ["data-board-tab", "data-team-tab", "data-loop-tab", "data-insight-tab"]) {
    assert.ok(!lower.includes(forbidden), `unexpected out-of-scope tab marker: ${forbidden}`);
  }
}

function run() {
  // --- AGHUD-021: Thread page is provider-only (no board/team/loop/insight tabs) ---
  assertPureThreadPageShell(renderThreadPage(createThreadPageState("codex")));
  assertPureThreadPageShell(renderThreadPage(createThreadPageState("claude")));

  // --- Deep link: short dt + query cap (matches webview hash resolver) ---
  assert.equal(expandDeepLinkDetailTab("m", ""), "metadata");
  assert.equal(expandDeepLinkDetailTab("", "EVENTS"), "events");
  assert.equal(expandDeepLinkDetailTab("m", "events"), "events");
  assert.equal(expandDeepLinkDetailTab("", "bogus"), "conversation");
  const longQ = "q".repeat(DEEP_LINK_QUERY_MAX + 50);
  assert.equal(truncateDeepLinkQuery(longQ).length, DEEP_LINK_QUERY_MAX);
  assert.ok(truncateDeepLinkQuery(longQ).endsWith("..."));
  assert.ok(renderThreadPage(createThreadPageState("codex")).includes('params.has("dt")'));
  assert.equal(sanitizeDeepLinkThreadId("  id-1\n\r"), "id-1");
  assert.equal(sanitizeDeepLinkThreadId("a\nb\rc"), "abc");
  const link = serializeAgentHudDeepLink({
    provider: "codex",
    threadId: "t1",
    query: "x".repeat(DEEP_LINK_QUERY_MAX + 10),
    detailTab: "metadata"
  });
  assert.ok(link.includes("dt=m"));
  assert.ok(!link.includes("detailTab="));
  assert.ok(link.includes("threadId=t1"));
  assert.equal(new URLSearchParams(link.split("?")[1]).get("query").length, DEEP_LINK_QUERY_MAX);

  // --- Provider switching ---
  assert.equal(normalizeProvider("codex"), "codex");
  assert.equal(normalizeProvider("claude"), "claude");
  assert.equal(normalizeProvider("unknown"), "codex");
  assert.equal(normalizeProvider(null), "codex");
  assert.equal(normalizeProvider(undefined), "codex");
  assert.equal(normalizeProvider(""), "codex");

  // --- createThreadPageState defaults ---
  const codexDefault = createThreadPageState("codex");
  assert.equal(codexDefault.provider, "codex");
  assert.equal(codexDefault.codex.loading, false);
  assert.equal(codexDefault.codex.threads.length, 0);
  assert.equal(codexDefault.codex.error, "");
  assert.equal(codexDefault.codex.selectedThreadId, "");
  assert.equal(codexDefault.codex.detail, null);
  assert.equal(codexDefault.claude.loading, false);
  assert.equal(codexDefault.claude.threads.length, 0);

  const claudeDefault = createThreadPageState("claude");
  assert.equal(claudeDefault.provider, "claude");

  // --- Empty state: no threads ---
  const emptyState = createThreadPageState("codex");
  const emptyFiltered = getVisibleThreads(emptyState.codex);
  assert.equal(emptyFiltered.length, 0);

  const emptyHtml = renderThreadPage(emptyState, {});
  assert.ok(emptyHtml.includes("No Codex threads match"));
  assert.ok(!emptyHtml.includes('class="thread-row"'));

  // --- Empty state for Claude ---
  const emptyClaude = createThreadPageState("claude");
  const emptyClaudeFiltered = getVisibleThreads(emptyClaude.claude);
  assert.equal(emptyClaudeFiltered.length, 0);
  const emptyClaudeHtml = renderThreadPage(emptyClaude, {});
  assert.ok(emptyClaudeHtml.includes("No Claude threads match"));

  // --- Loading state (no threads yet) ---
  const loadingState = createThreadPageState("codex");
  loadingState.codex.loading = true;
  const loadingFiltered = getVisibleThreads(loadingState.codex);
  assert.equal(loadingFiltered.length, 0);
  const loadingHtml = renderThreadPage(loadingState, {});
  assert.ok(loadingHtml.includes("Loading Codex threads"));

  // --- Error state ---
  const errorState = createThreadPageState("codex");
  errorState.codex.error = "Connection failed";
  const errorHtml = renderThreadPage(errorState, {});
  assert.ok(errorHtml.includes("Connection failed"));

  // --- Provider switching preserves per-provider state ---
  const switchedState = createThreadPageState("codex");
  switchedState.codex.threads = [{ id: "c1", title: "Codex Thread", status: "unknown", updatedAt: "" }];
  switchedState.claude.threads = [{ id: "l1", title: "Claude Thread", status: "unknown", updatedAt: "" }];
  switchedState.provider = "claude";
  const switchedHtml = renderThreadPage(switchedState, {});
  assert.ok(switchedHtml.includes("Claude Thread"));
  assert.ok(!switchedHtml.includes("Codex Thread"));

  // --- Filtering with query ---
  const state = createThreadPageState("codex");
  state.codex.threads = [
    { id: "1", title: "Alpha thread", status: "unknown", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "2", title: "Beta task", status: "unknown", updatedAt: "2026-01-01T00:00:00.000Z" }
  ];
  state.codex.query = "alpha";
  const filtered = getVisibleThreads(state.codex);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "1");

  // --- Multi-token query (AND): both tokens must appear somewhere in corpus ---
  const andState = createThreadPageState("codex");
  andState.codex.threads = [
    { id: "m1", title: "Only alpha", status: "unknown", updatedAt: "", preview: "foo" },
    { id: "m2", title: "Bridge", status: "unknown", updatedAt: "", preview: "alpha beta gamma" }
  ];
  andState.codex.query = "alpha beta";
  const andFiltered = getVisibleThreads(andState.codex);
  assert.equal(andFiltered.length, 1);
  assert.equal(andFiltered[0].id, "m2");

  // --- Status filter ---
  const statusState = createThreadPageState("codex");
  statusState.codex.threads = [
    { id: "1", title: "Running", status: "running", updatedAt: "" },
    { id: "2", title: "Idle", status: "idle", updatedAt: "" }
  ];
  statusState.codex.statusFilter = "running";
  const statusFiltered = getVisibleThreads(statusState.codex);
  assert.equal(statusFiltered.length, 1);
  assert.equal(statusFiltered[0].id, "1");

  // --- Invalid status filter falls back to "all" ---
  statusState.codex.statusFilter = "nonsense";
  const allFiltered = getVisibleThreads(statusState.codex);
  assert.equal(allFiltered.length, 2);

  // --- Sort: title_asc ---
  const sortState = createThreadPageState("codex");
  sortState.codex.threads = [
    { id: "1", title: "Zebra", status: "unknown", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "2", title: "Alpha", status: "unknown", updatedAt: "2026-01-02T00:00:00.000Z" }
  ];
  sortState.codex.sort = "title_asc";
  const sortedByName = getVisibleThreads(sortState.codex);
  assert.equal(sortedByName[0].id, "2");
  assert.equal(sortedByName[1].id, "1");

  // --- Sort: updated_asc ---
  sortState.codex.sort = "updated_asc";
  const sortedByDateAsc = getVisibleThreads(sortState.codex);
  assert.equal(sortedByDateAsc[0].id, "1");

  // --- Null/undefined state tolerance ---
  const nullState = { provider: null, codex: null, claude: null };
  const nullHtml = renderThreadPage(nullState, {});
  assert.ok(nullHtml.includes("AgentHUD Threads"));

  // --- Detail error state ---
  const detailErrorState = createThreadPageState("codex");
  detailErrorState.codex.detailError = "Failed to load thread";
  const detailErrorHtml = renderThreadPage(detailErrorState, {});
  assert.ok(detailErrorHtml.includes("Failed to load thread"));

  // --- Detail loading state ---
  const detailLoadingState = createThreadPageState("codex");
  detailLoadingState.codex.detailLoading = true;
  const detailLoadingHtml = renderThreadPage(detailLoadingState, {});
  assert.ok(detailLoadingHtml.includes("Loading selected thread"));

  // --- Select a thread and render detail ---
  const detailState = createThreadPageState("codex");
  detailState.codex.threads = [
    { id: "d1", title: "Detail Thread", status: "recent", cwd: "/project", model: "gpt-4", updatedAt: "2026-04-19T00:00:00.000Z", sourcePath: "/path/to/file.jsonl" }
  ];
  detailState.codex.selectedThreadId = "d1";
  detailState.codex.detail = {
    thread: detailState.codex.threads[0],
    messages: [{ role: "user", kind: "message", text: "Hello" }],
    events: [],
    capabilities: { openNative: true, rename: false, archive: false, sendPrompt: false, liveLogs: false }
  };
  const detailHtml = renderThreadPage(detailState, {});
  assert.ok(detailHtml.includes("Detail Thread"));
  assert.ok(detailHtml.includes("Hello"));

  // --- Detail sub-tabs: Conversation / Events / Source / Metadata (AGHUD-034) ---
  const subTabState = createThreadPageState("codex");
  subTabState.codex.threads = [
    {
      id: "sub1",
      title: "Sub tab thread",
      status: "recent",
      sourcePath: "/tmp/rollout.jsonl",
      cwd: "/proj",
      model: "m",
      updatedAt: "2026-01-01T00:00:00.000Z",
      provider: "codex",
      messageCount: 2,
      preview: "preview text"
    }
  ];
  subTabState.codex.selectedThreadId = "sub1";
  subTabState.codex.detail = {
    thread: subTabState.codex.threads[0],
    messages: [{ role: "user", text: "Hi" }],
    events: [{ level: "info", text: "e1" }],
    capabilities: { openNative: false, rename: false, archive: false, sendPrompt: false, liveLogs: false },
    meta: {
      sourcePath: "/tmp/rollout.jsonl",
      errors: [{ code: "malformed_json", message: "bad line" }],
      discovered: 3,
      skipped: 1,
      detailResolvedVia: "preferredSourcePath"
    }
  };
  const fourTabsHtml = renderThreadPage(subTabState, {});
  assert.equal((fourTabsHtml.match(/data-detail-tab="/g) || []).length, 4);
  assert.ok(fourTabsHtml.includes('data-detail-tab="source"'));
  assert.ok(fourTabsHtml.includes('data-detail-tab="metadata"'));

  subTabState.codex.detailTab = "source";
  const sourceHtml = renderThreadPage(subTabState, {});
  assert.ok(sourceHtml.includes("/tmp/rollout.jsonl"));
  assert.ok(sourceHtml.includes("malformed_json"));

  subTabState.codex.detailTab = "metadata";
  const metadataHtml = renderThreadPage(subTabState, {});
  assert.ok(metadataHtml.includes("meta.discovered"));
  assert.ok(metadataHtml.includes("meta.skipped"));
  assert.ok(metadataHtml.includes("meta.detailResolvedVia"));
  assert.ok(metadataHtml.includes("preferredSourcePath"));
  assert.ok(metadataHtml.includes("preview text"));

  // --- Source pane caps long error lists (avoid huge HTML) ---
  const capState = createThreadPageState("codex");
  capState.codex.threads = [{ id: "cap1", title: "Cap", status: "unknown", updatedAt: "", sourcePath: "/x", provider: "codex" }];
  capState.codex.selectedThreadId = "cap1";
  capState.codex.detailTab = "source";
  capState.codex.detail = {
    thread: capState.codex.threads[0],
    messages: [],
    events: [],
    capabilities: { openNative: false, rename: false, archive: false, sendPrompt: false, liveLogs: false },
    meta: {
      errors: Array.from({ length: 25 }, (_, i) => ({ code: `issue-${i}` }))
    }
  };
  const capHtml = renderThreadPage(capState, {});
  assert.ok(capHtml.includes("Showing first 20 of 25 issues"));
  assert.ok(capHtml.includes("issue-19"));
  assert.ok(!capHtml.includes("issue-24"));

  // --- Metadata pane truncates very long values ---
  const longPreview = `${"word ".repeat(600)}PREVIEW_TAIL_UNIQUE`;
  const longMetaState = createThreadPageState("codex");
  longMetaState.codex.threads = [{ id: "long1", title: "Long", status: "unknown", updatedAt: "", preview: "", provider: "codex" }];
  longMetaState.codex.selectedThreadId = "long1";
  longMetaState.codex.detailTab = "metadata";
  longMetaState.codex.detail = {
    thread: { ...longMetaState.codex.threads[0], preview: longPreview },
    messages: [],
    events: [],
    capabilities: { openNative: false, rename: false, archive: false, sendPrompt: false, liveLogs: false },
    meta: {}
  };
  const longMetaHtml = renderThreadPage(longMetaState, {});
  assert.ok(longMetaHtml.includes("..."));
  assert.ok(!longMetaHtml.includes("PREVIEW_TAIL_UNIQUE"));
  assert.ok(!longMetaHtml.includes(longPreview));

  // --- Parser drift: list row (thread.drift) + detail (meta.drift / thread.drift) ---
  const driftState = createThreadPageState("codex");
  driftState.codex.threads = [
    {
      id: "dr1",
      title: "Drifty thread",
      status: "unknown",
      updatedAt: "2026-04-19T00:00:00.000Z",
      drift: {
        unknownRecordTypes: { custom_event: 1 },
        totalUnknownRecords: 1,
        formatVersion: "3.1",
        fallbackCount: 2
      }
    }
  ];
  driftState.codex.selectedThreadId = "dr1";
  const driftListHtml = renderThreadPage(driftState, {});
  assert.ok(driftListHtml.includes("thread.drift"), "list shows thread.drift label");
  assert.ok(driftListHtml.includes("v3.1"), "list drift line shows format hint");
  assert.ok(driftListHtml.includes("unknown 1") && driftListHtml.includes("fallback 2"), "list drift counts");

  driftState.codex.detail = {
    thread: {
      id: "dr1",
      title: "Drifty thread",
      status: "unknown",
      updatedAt: "2026-04-19T00:00:00.000Z",
      drift: driftState.codex.threads[0].drift
    },
    messages: [],
    events: [],
    capabilities: { openNative: false, rename: false, archive: false, sendPrompt: false, liveLogs: false },
    meta: {
      drift: {
        unknownRecordTypes: { custom_event: 1, other: 2 },
        totalUnknownRecords: 3,
        formatVersion: "4.0",
        fallbackCount: 5
      }
    }
  };
  const driftDetailHtml = renderThreadPage(driftState, {});
  assert.ok(driftDetailHtml.includes("meta.drift"), "detail shows meta.drift label");
  assert.ok(driftDetailHtml.includes("other: 2"), "detail meta unknownRecordTypes");
  assert.ok(driftDetailHtml.includes("4.0"), "detail meta formatVersion");

  console.log("thread-page smoke OK");
}

function testErrorBoundaryRendering() {
  // --- List-level error is rendered ---
  const listErrorState = createThreadPageState("codex");
  listErrorState.codex.error = "Scan failed";
  const listErrorHtml = renderThreadPage(listErrorState, {});
  assert.ok(listErrorHtml.includes("Scan failed"), "list error visible");
  assert.ok(listErrorHtml.includes('id="dismissListError"'), "list dismiss control");
  assert.ok(listErrorHtml.includes('id="retryListError"'), "list retry control");

  // --- Detail-level error is rendered ---
  const detailErrorState2 = createThreadPageState("codex");
  detailErrorState2.codex.detailError = "Thread load failed";
  const detailErrorHtml2 = renderThreadPage(detailErrorState2, {});
  assert.ok(detailErrorHtml2.includes("Thread load failed"), "detail error visible");
  assert.ok(detailErrorHtml2.includes('id="dismissDetailError"'), "detail dismiss control");
  assert.ok(detailErrorHtml2.includes('id="retryDetailError"'), "detail retry control");

  // --- Claude list-level error ---
  const claudeListError = createThreadPageState("claude");
  claudeListError.claude.error = "Claude scan failed";
  const claudeListErrorHtml = renderThreadPage(claudeListError, {});
  assert.ok(claudeListErrorHtml.includes("Claude scan failed"), "claude list error visible");

  // --- Error does not cross-contaminate providers ---
  const isolatedState = createThreadPageState("codex");
  isolatedState.codex.error = "Codex down";
  isolatedState.claude.threads = [{ id: "l1", title: "Claude OK", status: "unknown", updatedAt: "" }];
  isolatedState.provider = "codex";
  const isolatedHtml = renderThreadPage(isolatedState, {});
  assert.ok(isolatedHtml.includes("Codex down"), "codex error shown for codex provider");
  // Switch to claude — codex error should not appear
  isolatedState.provider = "claude";
  const claudeViewHtml = renderThreadPage(isolatedState, {});
  assert.ok(!claudeViewHtml.includes("Codex down"), "codex error not leaked into claude view");
  assert.ok(claudeViewHtml.includes("Claude OK"), "claude data still visible");

  // --- List and detail errors coexist independently ---
  const dualErrorState = createThreadPageState("codex");
  dualErrorState.codex.error = "List error";
  dualErrorState.codex.detailError = "Detail error";
  const dualErrorHtml = renderThreadPage(dualErrorState, {});
  assert.ok(dualErrorHtml.includes("List error"), "list error visible alongside detail error");
  assert.ok(dualErrorHtml.includes("Detail error"), "detail error visible alongside list error");
  assert.ok(dualErrorHtml.includes('id="dismissListError"'), "list controls when both errors set");
  assert.ok(dualErrorHtml.includes('id="dismissDetailError"'), "detail controls when both errors set");

  console.log("error boundary rendering OK");
}

function testScanBudgetStatusHints() {
  const codexTrunc = createThreadPageState("codex");
  codexTrunc.codex.threads = [
    { id: "a", title: "A", status: "idle", updatedAt: "2020-01-01T00:00:00.000Z" }
  ];
  codexTrunc.codex.meta = {
    discovered: 100,
    scannedRollouts: 10,
    listScanTruncated: true
  };
  const codexHtml = renderThreadPage(codexTrunc, {});
  assert.ok(codexHtml.includes("List scan limited"), "codex truncation hint");
  assert.ok(codexHtml.includes("10 of 100"), "codex counts");

  const claudeTrunc = createThreadPageState("claude");
  claudeTrunc.claude.threads = [
    { id: "b", title: "B", status: "idle", updatedAt: "2020-01-01T00:00:00.000Z" }
  ];
  claudeTrunc.claude.meta = {
    discovered: 50,
    scannedSources: 5,
    listScanTruncated: true,
    tailRestoredFromCache: 3
  };
  const claudeHtml = renderThreadPage(claudeTrunc, {});
  assert.ok(claudeHtml.includes("fully indexed 5 of 50"), "claude counts");
  assert.ok(
    claudeHtml.includes("3 additional sessions loaded from parse cache"),
    "tail restore hint"
  );

  const cacheTrunc = createThreadPageState("codex");
  cacheTrunc.codex.threads = [
    { id: "c", title: "C", status: "idle", updatedAt: "2020-01-01T00:00:00.000Z" }
  ];
  cacheTrunc.codex.meta = {
    cacheWriteTruncated: true,
    cacheWriteCap: 100,
    cacheWriteOmitted: 5
  };
  const cacheHtml = renderThreadPage(cacheTrunc, {});
  assert.ok(cacheHtml.includes("Summary cache write capped"), "cache write hint");

  console.log("scan budget status hints OK");
}

run();
testErrorBoundaryRendering();
testScanBudgetStatusHints();
