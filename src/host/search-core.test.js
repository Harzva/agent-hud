"use strict";

const assert = require("assert");
const { buildThreadSearchCorpus } = require("./provider-contract");
const {
  normalizeSearchQuery,
  tokenizeSearchQuery,
  threadMatchesSearchQuery,
  scoreThreadSearchMatch,
  rankThreadsBySearchQuery
} = require("./search-core");

function run() {
  assert.equal(normalizeSearchQuery("  Foo   Bar "), "foo bar");
  assert.equal(normalizeSearchQuery(""), "");
  assert.deepStrictEqual(tokenizeSearchQuery("a b"), ["a", "b"]);
  assert.deepStrictEqual(tokenizeSearchQuery(""), []);

  const t1 = {
    id: "x-1",
    title: "Alpha project",
    status: "unknown",
    cwd: "/home/demo",
    model: "gpt-4",
    preview: "hello world"
  };

  assert.ok(threadMatchesSearchQuery(t1, ""), "empty query matches");
  assert.ok(threadMatchesSearchQuery(t1, "alpha"), "single token title");
  assert.ok(threadMatchesSearchQuery(t1, "alpha project"), "AND tokens both in title");
  assert.ok(!threadMatchesSearchQuery(t1, "alpha missingtoken"), "AND requires all tokens");

  assert.ok(threadMatchesSearchQuery(t1, "hello world"), "tokens across title+preview");

  const t2 = { id: "only-id", title: "Z", status: "unknown" };
  assert.ok(threadMatchesSearchQuery(t2, "only-id"), "id substring search");

  const ranked = rankThreadsBySearchQuery(
    [
      { id: "b", title: "Ring beta", status: "unknown", preview: "gamma" },
      { id: "a", title: "Ring alpha gamma", status: "unknown", preview: "notes" },
      { id: "c", title: "Other", status: "unknown", preview: "ring" }
    ],
    "ring gamma"
  );
  assert.equal(ranked.length, 2, "two threads match ring+gamma");
  assert.equal(ranked[0].id, "a", "both tokens in title outrank title+preview");

  const driftThread = {
    id: "d1",
    title: "No drift title",
    status: "unknown",
    drift: {
      formatVersion: "1",
      unknownRecordTypes: { rollout: 2 },
      totalUnknownRecords: 1,
      fallbackCount: 0
    }
  };
  assert.ok(buildThreadSearchCorpus(driftThread).includes("rollout"), "drift types in corpus");
  assert.ok(threadMatchesSearchQuery(driftThread, "rollout"), "search drift vocabulary");

  const projectThread = {
    id: "p1",
    title: "T",
    status: "unknown",
    projectLabel: "my-workspace",
    cwd: "/tmp/x"
  };
  assert.ok(threadMatchesSearchQuery(projectThread, "workspace"), "projectLabel searchable");

  assert.equal(scoreThreadSearchMatch(t1, "alpha"), 4, "single token in title score");

  console.log("search-core smoke OK");
}

run();
