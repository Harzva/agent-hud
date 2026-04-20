"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createCodexProvider,
  listCodexThreads,
  getCodexThreadDetail,
  parseCodexRollout,
  findRolloutFiles,
  codexCapabilities
} = require("./codex");

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures/codex/sessions");

async function run() {
  // --- Capabilities ---
  const caps = codexCapabilities();
  assert.equal(caps.openNative, true);
  assert.equal(caps.rename, false);
  assert.equal(caps.archive, false);
  assert.equal(caps.sendPrompt, false);
  assert.equal(caps.liveLogs, false);

  // --- listCodexThreads from fixture ---
  const listed = await listCodexThreads({ sessionsDir: FIXTURES });
  assert.equal(listed.provider, "codex");
  assert.ok(listed.threads.length >= 1);
  assert.ok(listed.meta.discovered >= 1);
  assert.equal(listed.meta.returned, listed.threads.length);

  // --- getCodexThreadDetail from fixture ---
  const threadId = listed.threads[0].id;
  const detail = await getCodexThreadDetail(threadId, { sessionsDir: FIXTURES });
  assert.equal(detail.provider, "codex");
  assert.equal(detail.thread.id, threadId);
  assert.ok(Array.isArray(detail.messages));
  assert.ok(Array.isArray(detail.events));
  assert.ok(detail.capabilities);
  assert.equal(detail.capabilities.openNative, true);

  const row0 = listed.threads[0];
  assert.ok(row0.sourcePath, "list row includes sourcePath for detail fast path");
  const viaPreferred = await getCodexThreadDetail(row0.id, {
    sessionsDir: FIXTURES,
    preferredSourcePath: row0.sourcePath
  });
  assert.ok(viaPreferred);
  assert.equal(viaPreferred.meta.detailResolvedVia, "preferredSourcePath");

  // --- getCodexThreadDetail with unknown ID returns null ---
  const missing = await getCodexThreadDetail("nonexistent-id", { sessionsDir: FIXTURES });
  assert.equal(missing, null);

  // --- getCodexThreadDetail with empty/blank ID returns null ---
  const emptyId = await getCodexThreadDetail("", { sessionsDir: FIXTURES });
  assert.equal(emptyId, null);

  // --- Empty directory: no sessions ---
  const emptyDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agenthud-codex-empty-"));
  const emptyListed = await listCodexThreads({ sessionsDir: emptyDir });
  assert.equal(emptyListed.threads.length, 0);
  assert.equal(emptyListed.meta.discovered, 0);
  assert.equal(emptyListed.meta.returned, 0);

  // --- Non-existent directory ---
  const missingDir = path.join(os.tmpdir(), "agenthud-codex-missing-" + Date.now());
  const missingListed = await listCodexThreads({ sessionsDir: missingDir });
  assert.equal(missingListed.threads.length, 0);
  assert.equal(missingListed.meta.discovered, 0);

  // --- Malformed JSONL file ---
  const malformedFile = path.join(FIXTURES, "2026", "04", "19", "rollout-malformed.jsonl");
  const malformedParsed = await parseCodexRollout(malformedFile);
  assert.ok(malformedParsed.errors.length > 0);
  assert.equal(malformedParsed.errors[0].code, "malformed_json");
  assert.equal(malformedParsed.thread, null);

  // --- File read error (non-existent file) ---
  const readError = await parseCodexRollout("/nonexistent/path/file.jsonl");
  assert.ok(readError.errors.length > 0);
  assert.equal(readError.errors[0].code, "read_error");
  assert.equal(readError.thread, null);
  assert.equal(readError.messages.length, 0);
  assert.equal(readError.events.length, 0);

  // --- Session with only meta, no messages (empty session) ---
  const emptySessionFile = path.join(FIXTURES, "2026", "04", "19", "rollout-2026-04-19T00-00-00-00000000-0000-4000-8000-000000000000.jsonl");
  const emptySession = await parseCodexRollout(emptySessionFile);
  assert.ok(emptySession.thread);
  assert.equal(emptySession.thread.id, "00000000-0000-4000-8000-000000000000");
  assert.equal(emptySession.messages.length, 0);

  // --- findRolloutFiles in empty dir ---
  const emptyFiles = await findRolloutFiles(emptyDir);
  assert.equal(emptyFiles.length, 0);

  // --- findRolloutFiles in non-existent dir ---
  const missingFiles = await findRolloutFiles(missingDir);
  assert.equal(missingFiles.length, 0);

  // --- Provider interface ---
  const provider = createCodexProvider({ sessionsDir: FIXTURES });
  assert.equal(provider.id, "codex");
  const providerListed = await provider.listThreads();
  assert.ok(providerListed.threads.length >= 1);

  // --- List with limit ---
  const limited = await listCodexThreads({ sessionsDir: FIXTURES, limit: 1 });
  assert.ok(limited.threads.length <= 1);

  // --- Bounded parallel list parse: same thread ids as serial (order may tie on updatedAt) ---
  const serialListed = await listCodexThreads({ sessionsDir: FIXTURES, parseConcurrency: 1 });
  const parallelListed = await listCodexThreads({ sessionsDir: FIXTURES, parseConcurrency: 8 });
  assert.equal(serialListed.threads.length, parallelListed.threads.length);
  assert.deepStrictEqual(
    serialListed.threads.map((t) => t.id).sort(),
    parallelListed.threads.map((t) => t.id).sort()
  );
  assert.equal(parallelListed.meta.parseConcurrency, 8);

  // --- List scan cap: parse only first N rollouts (mtime order), meta reports truncation ---
  const scanCapped = await listCodexThreads({ sessionsDir: FIXTURES, maxRolloutFilesScan: 2 });
  assert.ok(scanCapped.meta.discovered >= 3);
  assert.equal(scanCapped.meta.scannedRollouts, 2);
  assert.equal(scanCapped.meta.listScanTruncated, true);
  assert.ok(scanCapped.threads.length <= 2);

  // --- Custom now function: future date makes all fixtures idle ---
  const futureNow = () => new Date("2030-01-01").getTime();
  const futureListed = await listCodexThreads({ sessionsDir: FIXTURES, now: futureNow });
  assert.ok(futureListed.threads.length >= 1);
  for (const thread of futureListed.threads) {
    assert.equal(thread.status, "idle");
  }

  // --- Parser drift: unknown top-level types, version hint, fallback paths ---
  const driftRollout = path.join(
    FIXTURES,
    "2026",
    "04",
    "19",
    "rollout-2026-04-19T14-00-00-019dbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb.jsonl"
  );
  const driftParsed = await parseCodexRollout(driftRollout);
  assert.ok(driftParsed.thread);
  assert.equal(driftParsed.drift.formatVersion, "3.1");
  assert.deepStrictEqual(driftParsed.drift.unknownRecordTypes, { custom_event: 1 });
  assert.equal(driftParsed.drift.totalUnknownRecords, 1);
  assert.equal(driftParsed.drift.fallbackCount, 3);

  const driftDetail = await getCodexThreadDetail("019dbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb", { sessionsDir: FIXTURES });
  assert.ok(driftDetail);
  assert.equal(driftDetail.meta.drift.formatVersion, "3.1");
  assert.equal(driftDetail.meta.drift.totalUnknownRecords, 1);

  const listedDriftThread = listed.threads.find((thread) => thread.id === "019dbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb");
  assert.ok(listedDriftThread && listedDriftThread.drift);
  assert.equal(listedDriftThread.drift.fallbackCount, 3);
  assert.deepStrictEqual(listedDriftThread.drift.unknownRecordTypes, { custom_event: 1 });

  console.log("codex provider smoke OK");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
