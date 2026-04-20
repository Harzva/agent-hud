"use strict";

const { buildThreadSearchCorpus } = require("./provider-contract");

/**
 * Trim, collapse internal whitespace, lowercase (list/search bar parity).
 */
function normalizeSearchQuery(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Whitespace-separated tokens; empty query → [].
 */
function tokenizeSearchQuery(normalized) {
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean);
}

function threadMatchesSearchQuery(thread, normalizedQuery) {
  const tokens = tokenizeSearchQuery(normalizedQuery);
  if (!tokens.length) {
    return true;
  }
  const corpus = buildThreadSearchCorpus(thread);
  return tokens.every((token) => corpus.includes(token));
}

/**
 * Higher = better. Zero if any token missing from corpus (no partial multi-token match).
 */
function scoreThreadSearchMatch(thread, normalizedQuery) {
  const tokens = tokenizeSearchQuery(normalizedQuery);
  if (!tokens.length) {
    return 0;
  }
  const corpus = buildThreadSearchCorpus(thread);
  if (!tokens.every((token) => corpus.includes(token))) {
    return 0;
  }
  const title = String(thread?.title || "").toLowerCase();
  const id = String(thread?.id || "").toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 4;
    } else if (id.includes(token)) {
      score += 2;
    } else {
      score += 1;
    }
  }
  return score;
}

function compareSearchRank(stableIndex) {
  return (a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return stableIndex.get(a.thread) - stableIndex.get(b.thread);
  };
}

/**
 * Filter by AND tokens; sort by score desc, stable for ties.
 * Empty / whitespace-only query → original order (shallow copy).
 */
function rankThreadsBySearchQuery(threads, rawQuery) {
  const list = Array.isArray(threads) ? threads : [];
  const normalized = normalizeSearchQuery(rawQuery);
  if (!tokenizeSearchQuery(normalized).length) {
    return list.slice();
  }
  const stableIndex = new Map();
  list.forEach((t, i) => stableIndex.set(t, i));
  const ranked = list
    .filter((t) => threadMatchesSearchQuery(t, normalized))
    .map((t) => ({ thread: t, score: scoreThreadSearchMatch(t, normalized) }));
  ranked.sort(compareSearchRank(stableIndex));
  return ranked.map((entry) => entry.thread);
}

module.exports = {
  normalizeSearchQuery,
  tokenizeSearchQuery,
  threadMatchesSearchQuery,
  scoreThreadSearchMatch,
  rankThreadsBySearchQuery
};
