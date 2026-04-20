"use strict";

const assert = require("assert");
const path = require("path");
const { parseClaudeSession } = require("./claude");

async function run() {
  const projectsRoot = path.resolve(__dirname, "../../../test/fixtures/claude/projects");

  // --- Rich fixture (existing) ---
  const file = path.join(projectsRoot, "-home-user-rich-project", "session-rich.jsonl");
  const parsed = await parseClaudeSession(file, { projectsRoot });

  assert(parsed);
  assert.equal(parsed.thread.provider, "claude");
  assert.equal(parsed.thread.id, "session-rich");
  assert.equal(parsed.thread.title, "Need help with parser robustness.");
  assert.equal(parsed.thread.cwd, "/home/user/rich/project");
  assert.equal(parsed.thread.status, "unknown");
  assert.equal(parsed.thread.createdAt, "2026-04-19T00:00:00.000Z");
  assert.equal(parsed.thread.updatedAt, "2026-04-19T00:00:07.000Z");
  assert.equal(parsed.thread.messageCount, 5);
  assert.match(parsed.thread.preview, /Need help with parser robustness\./);
  assert.match(parsed.thread.preview, /Use the provider contract\./);

  assert.deepStrictEqual(parsed.messages.map((message) => ({
    role: message.role,
    kind: message.kind,
    text: message.text
  })), [
    { role: "user", kind: "message", text: "Need help with parser robustness." },
    { role: "assistant", kind: "message", text: "I can help.\nSearching the workspace." },
    { role: "tool", kind: "tool_use", text: "Tool use: rg" },
    { role: "tool", kind: "tool_result", text: "Found matches in claude.js" },
    { role: "assistant", kind: "message", text: "Use the provider contract." }
  ].slice(0, 5));

  assert.equal(parsed.meta.hiddenRecords["permission-mode"], 1);
  assert.equal(parsed.meta.hiddenRecords["file-history-snapshot"], 1);
  assert.equal(parsed.meta.hiddenRecords["last-prompt"], 1);
  assert.equal(parsed.meta.errors.length, 1);
  assert.equal(parsed.meta.errors[0].code, "malformed_json");
  assert.equal(parsed.meta.sourcePath, file);

  // --- Variants fixture (existing) ---
  const variantsRoot = path.resolve(__dirname, "../../../test/fixtures/claude/variants");
  const variantsFile = path.join(variantsRoot, "-home-user-variant-project", "session-variants.jsonl");
  const variants = await parseClaudeSession(variantsFile, { projectsRoot: variantsRoot });

  assert(variants);
  assert.equal(variants.thread.provider, "claude");
  assert.equal(variants.thread.id, "session-variants");
  assert.equal(variants.thread.title, "Summarize current transcript.");
  assert.equal(variants.thread.cwd, "/home/user/variant/project");
  assert.equal(variants.thread.createdAt, "2026-04-19T10:00:00.000Z");
  assert.equal(variants.thread.updatedAt, "2026-04-19T10:00:09.000Z");
  assert.equal(variants.thread.model, "claude-sonnet-4-20260401");
  assert.equal(variants.thread.messageCount, 7);

  assert.deepStrictEqual(variants.messages.map((message) => ({
    role: message.role,
    kind: message.kind,
    text: message.text
  })), [
    { role: "system", kind: "message", text: "Session started." },
    { role: "user", kind: "message", text: "Summarize current transcript." },
    { role: "assistant", kind: "message", text: "Running search." },
    { role: "tool", kind: "tool_use", text: "Tool use: glob" },
    { role: "tool", kind: "tool_result", text: "Matched 4 files" },
    { role: "assistant", kind: "message", text: "Done." },
    { role: "tool", kind: "tool_result", text: "Embedded tool block output" }
  ]);

  assert.equal(variants.meta.hiddenRecords["permission-mode"], 1);
  assert.equal(variants.meta.hiddenRecords["file-history-snapshot"], 1);
  assert.equal(variants.meta.hiddenRecords["last-prompt"], 1);
  assert.equal(variants.meta.hiddenRecords.snapshot, 1);
  assert.equal(variants.meta.hiddenRecords.sidechain, 1);
  assert.equal(variants.meta.errors.length, 1);
  assert.equal(variants.meta.errors[0].code, "malformed_json");
  assert.equal(variants.meta.sourcePath, variantsFile);

  // --- Error-tolerant fixture: mixed good and bad lines ---
  const errorFile = path.join(projectsRoot, "-home-user-error-project", "session-error.jsonl");
  const errorParsed = await parseClaudeSession(errorFile, { projectsRoot });
  assert.ok(errorParsed, "Should return a result even with malformed lines");
  assert.equal(errorParsed.thread.provider, "claude");
  assert.ok(errorParsed.meta.errors.length >= 1, "Should report at least one malformed_json error");
  assert.equal(errorParsed.meta.errors[0].code, "malformed_json");
  assert.ok(errorParsed.messages.length >= 2, "Should still parse valid records after errors");
  assert.equal(errorParsed.messages[0].text, "Hello after error.");
  assert.equal(errorParsed.messages[1].text, "Recovery response.");

  // --- Empty JSONL file ---
  const emptyFile = path.join(projectsRoot, "-home-user-empty-project", "session-empty.jsonl");
  const emptyParsed = await parseClaudeSession(emptyFile, { projectsRoot });
  assert.ok(emptyParsed, "Should return a result for empty file");
  assert.equal(emptyParsed.thread.provider, "claude");
  assert.equal(emptyParsed.messages.length, 0, "No messages from empty file");
  assert.equal(emptyParsed.thread.messageCount, 0);
  assert.equal(emptyParsed.meta.errors.length, 0, "No errors from empty file");

  // --- Drift diagnostics: unknown record counts, format version hint, fallback tally ---
  const driftFile = path.join(projectsRoot, "-home-user-drift-project", "session-drift.jsonl");
  const driftParsed = await parseClaudeSession(driftFile, { projectsRoot });
  assert(driftParsed);
  assert.deepStrictEqual(driftParsed.meta.drift.unknownRecordTypes, {
    unknown_event: 1,
    custom_notification: 1,
    yet_another_type: 1
  });
  assert.equal(driftParsed.meta.drift.totalUnknownRecords, 3);
  assert.equal(driftParsed.meta.drift.formatVersion, "2.0");
  assert.equal(driftParsed.meta.drift.fallbackCount, 4);

  console.log("claude parser fixture OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
