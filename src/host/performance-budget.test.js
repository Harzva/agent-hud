"use strict";

const assert = require("assert/strict");
const {
  CLAUDE_LIST_MAX_SOURCES_SCANNED,
  CODEX_DETAIL_MAX_ROLLOUT_PARSE_ATTEMPTS,
  CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED,
  DETAIL_LOAD_TIMEOUT_MS,
  LIST_REFRESH_TIMEOUT_MS,
  SUMMARY_CACHE_MAX_SUMMARIES,
  TimeoutBudgetError,
  capThreadSummariesForCache,
  isTimeoutBudgetError,
  resolveClaudeListSourceScanCap,
  resolveCodexDetailParseCap,
  resolveCodexListRolloutScanCap,
  withTimeout
} = require("./performance-budget");

async function main() {
  assert.ok(LIST_REFRESH_TIMEOUT_MS > DETAIL_LOAD_TIMEOUT_MS);
  assert.ok(DETAIL_LOAD_TIMEOUT_MS > 0);
  assert.ok(CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED >= 500);
  assert.ok(CLAUDE_LIST_MAX_SOURCES_SCANNED >= 500);
  assert.ok(SUMMARY_CACHE_MAX_SUMMARIES >= 500);
  assert.equal(resolveCodexListRolloutScanCap({ maxRolloutFilesScan: 42 }), 42);
  assert.equal(resolveCodexListRolloutScanCap({}), CODEX_LIST_MAX_ROLLOUT_FILES_SCANNED);
  assert.equal(resolveClaudeListSourceScanCap({ maxSourcesScan: 7 }), 7);
  assert.equal(resolveClaudeListSourceScanCap({}), CLAUDE_LIST_MAX_SOURCES_SCANNED);
  assert.equal(resolveCodexDetailParseCap({ maxDetailRolloutAttempts: 99 }), 99);
  assert.equal(resolveCodexDetailParseCap({}), CODEX_DETAIL_MAX_ROLLOUT_PARSE_ATTEMPTS);

  const capped = capThreadSummariesForCache([{ x: 1 }, { x: 2 }, { x: 3 }], 2);
  assert.equal(capped.threads.length, 2);
  assert.equal(capped.truncated, true);
  assert.equal(capped.appliedCap, 2);

  const full = capThreadSummariesForCache([{ x: 1 }], 50);
  assert.equal(full.truncated, false);
  assert.equal(full.threads.length, 1);

  const fast = await withTimeout(Promise.resolve("ok"), {
    timeoutMs: 50,
    operation: "test.fast",
    provider: "codex"
  });
  assert.equal(fast, "ok");

  let timedOut = false;
  try {
    await withTimeout(new Promise((resolve) => setTimeout(() => resolve("late"), 30)), {
      timeoutMs: 5,
      operation: "test.slow",
      provider: "claude"
    });
  } catch (error) {
    timedOut = true;
    assert.equal(error instanceof TimeoutBudgetError, true);
    assert.equal(isTimeoutBudgetError(error), true);
    assert.equal(error.operation, "test.slow");
    assert.equal(error.provider, "claude");
  }
  assert.equal(timedOut, true);

  console.log("performance budget fixture OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
