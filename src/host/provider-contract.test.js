"use strict";

const assert = require("assert");
const {
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
  isAgentThreadDetail
} = require("./provider-contract");

function run() {
  // --- Provider ID normalization ---
  assert.equal(normalizeProviderId("codex"), "codex");
  assert.equal(normalizeProviderId("claude"), "claude");
  assert.equal(normalizeProviderId("unknown"), "codex");
  assert.equal(normalizeProviderId(null), "codex");
  assert.equal(normalizeProviderId(undefined), "codex");
  assert.equal(normalizeProviderId(""), "codex");
  assert.equal(normalizeProviderId(123), "codex");

  // Custom fallback
  assert.equal(normalizeProviderId("bogus", "claude"), "claude");
  assert.equal(normalizeProviderId(null, "claude"), "claude");

  // --- Thread status normalization ---
  assert.equal(normalizeThreadStatus("running"), "running");
  assert.equal(normalizeThreadStatus("recent"), "recent");
  assert.equal(normalizeThreadStatus("idle"), "idle");
  assert.equal(normalizeThreadStatus("archived"), "archived");
  assert.equal(normalizeThreadStatus("unknown"), "unknown");
  assert.equal(normalizeThreadStatus("bogus"), "unknown");
  assert.equal(normalizeThreadStatus(null), "unknown");
  assert.equal(normalizeThreadStatus(undefined), "unknown");
  assert.equal(normalizeThreadStatus(""), "unknown");

  // Custom fallback
  assert.equal(normalizeThreadStatus("x", "idle"), "idle");

  // --- Message role normalization ---
  assert.equal(normalizeMessageRole("user"), "user");
  assert.equal(normalizeMessageRole("assistant"), "assistant");
  assert.equal(normalizeMessageRole("tool"), "tool");
  assert.equal(normalizeMessageRole("system"), "system");
  assert.equal(normalizeMessageRole("other"), "system");
  assert.equal(normalizeMessageRole(null), "system");
  assert.equal(normalizeMessageRole(undefined), "system");

  // --- Capabilities normalization ---
  const caps = normalizeCapabilities({ openNative: true, rename: "yes" });
  assert.equal(caps.openNative, true);
  assert.equal(caps.rename, false);
  assert.equal(caps.archive, false);
  assert.equal(caps.sendPrompt, false);
  assert.equal(caps.liveLogs, false);

  // Empty / null input
  const emptyCaps = normalizeCapabilities(null);
  assert.equal(emptyCaps.openNative, false);
  assert.equal(emptyCaps.rename, false);

  const undefinedCaps = normalizeCapabilities(undefined);
  assert.equal(undefinedCaps.openNative, false);

  // --- isAgentThread validation ---
  const validThread = { provider: "codex", id: "t1", title: "Test", status: "running" };
  assert.equal(isAgentThread(validThread), true);

  // Missing fields
  assert.equal(isAgentThread(null), false);
  assert.equal(isAgentThread({}), false);
  assert.equal(isAgentThread({ provider: "codex", id: "t1", title: "Test" }), false);
  assert.equal(isAgentThread({ provider: "codex", id: "t1", title: "Test", status: "bogus" }), false);
  assert.equal(isAgentThread({ provider: "other", id: "t1", title: "Test", status: "running" }), false);
  assert.equal(isAgentThread({ provider: "codex", id: "", title: "Test", status: "running" }), false);
  assert.equal(isAgentThread({ provider: "codex", id: "  ", title: "Test", status: "running" }), false);

  // --- isAgentMessage validation ---
  assert.equal(isAgentMessage({ role: "user", text: "hello" }), true);
  assert.equal(isAgentMessage({ role: "assistant", text: "hi" }), true);
  assert.equal(isAgentMessage(null), false);
  assert.equal(isAgentMessage({}), false);
  assert.equal(isAgentMessage({ role: "unknown", text: "hi" }), false);
  assert.equal(isAgentMessage({ role: "user", text: 123 }), false);
  assert.equal(isAgentMessage({ role: "user" }), false);

  // --- isAgentEvent validation ---
  assert.equal(isAgentEvent({ text: "something happened" }), true);
  assert.equal(isAgentEvent(null), false);
  assert.equal(isAgentEvent({}), false);
  assert.equal(isAgentEvent({ text: "" }), true);
  assert.equal(isAgentEvent({ text: 123 }), false);

  // --- isAgentThreadDetail validation ---
  const validDetail = {
    thread: validThread,
    messages: [{ role: "user", text: "hi" }],
    capabilities: { openNative: false, rename: false, archive: false, sendPrompt: false, liveLogs: false }
  };
  assert.equal(isAgentThreadDetail(validDetail), true);

  // Thread detail with events
  const detailWithEvents = {
    ...validDetail,
    events: [{ text: "event1" }, { text: "event2" }]
  };
  assert.equal(isAgentThreadDetail(detailWithEvents), true);

  // Invalid thread detail
  assert.equal(isAgentThreadDetail(null), false);
  assert.equal(isAgentThreadDetail({}), false);
  assert.equal(isAgentThreadDetail({ thread: null, messages: [], capabilities: DEFAULT_CAPABILITIES }), false);
  assert.equal(isAgentThreadDetail({
    thread: validThread,
    messages: [{ role: "bad", text: "nope" }],
    capabilities: DEFAULT_CAPABILITIES
  }), false);

  // --- Provider switching: verify both providers are listed ---
  assert.ok(PROVIDER_IDS.includes("codex"));
  assert.ok(PROVIDER_IDS.includes("claude"));
  assert.equal(PROVIDER_IDS.length, 2);

  // --- Thread statuses all present ---
  assert.equal(THREAD_STATUSES.length, 5);
  assert.ok(THREAD_STATUSES.includes("running"));
  assert.ok(THREAD_STATUSES.includes("recent"));
  assert.ok(THREAD_STATUSES.includes("idle"));
  assert.ok(THREAD_STATUSES.includes("archived"));
  assert.ok(THREAD_STATUSES.includes("unknown"));

  // --- Message roles all present ---
  assert.equal(MESSAGE_ROLES.length, 4);

  console.log("provider-contract smoke OK");
}

run();
