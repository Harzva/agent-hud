"use strict";

/**
 * AGHUD-020: Static audit for stale pure-thread / dashboard feature references
 * in the extension contribution surface and production JS (not *.test.js).
 *
 * Usage: node scripts/audit/check-stale-references.js
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Case-sensitive substring hits only (high precision, low false positives). */
const STALE_SUBSTRINGS = [
  "data-board-tab",
  "data-team-tab",
  "data-loop-tab",
  "data-insight-tab",
  "agenthud.board",
  "agenthud.team",
  "agenthud.insight",
  "webview/board",
  "webview/insights",
  "team-coordination",
  "thread-insight"
];

const SCAN_FILES = [
  path.join(REPO_ROOT, "package.json"),
  path.join(REPO_ROOT, "extension.js")
];

// Docs may quote forbidden markers in rule tables; skip only these paths (see stale-reference-audit.md).
const DOCS_STALE_MARKER_EXCEPTIONS = new Set([
  "docs/agenthud/stale-reference-audit.md",
  "docs/agenthud/removal-map.md"
]);

function isTestFile(filePath) {
  return filePath.endsWith(".test.js");
}

function collectMarkdownFiles(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_error) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      acc.push(full);
    }
  }
}

function collectSrcJsFiles(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_error) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSrcJsFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".js") && !isTestFile(full)) {
      acc.push(full);
    }
  }
}

function checkFile(filePath, text) {
  const hits = [];
  for (const needle of STALE_SUBSTRINGS) {
    let from = 0;
    while (from < text.length) {
      const i = text.indexOf(needle, from);
      if (i === -1) {
        break;
      }
      const line = text.slice(0, i).split(/\r?\n/).length;
      hits.push({ needle, line, filePath });
      from = i + needle.length;
    }
  }
  return hits;
}

function main() {
  const srcRoot = path.join(REPO_ROOT, "src");
  const docsRoot = path.join(REPO_ROOT, "docs");
  const jsFiles = [];
  collectSrcJsFiles(srcRoot, jsFiles);
  const mdFiles = [];
  if (fs.existsSync(docsRoot)) {
    collectMarkdownFiles(docsRoot, mdFiles);
  }

  const docScan = [];
  for (const abs of mdFiles.sort()) {
    const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
    if (DOCS_STALE_MARKER_EXCEPTIONS.has(rel)) {
      continue;
    }
    docScan.push(abs);
  }

  const allHits = [];
  for (const filePath of SCAN_FILES.concat(jsFiles.sort(), docScan)) {
    let raw;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (_error) {
      process.stderr.write(`stale-ref-audit: skip (unreadable): ${filePath}\n`);
      continue;
    }
    allHits.push(...checkFile(filePath, raw));
  }

  if (allHits.length) {
    process.stderr.write("stale-ref-audit: FAILED — forbidden substrings in production surface:\n");
    for (const h of allHits) {
      const rel = path.relative(REPO_ROOT, h.filePath);
      process.stderr.write(`  ${rel}:${h.line}  (${h.needle})\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `stale-ref-audit: OK (package.json, extension.js, ${jsFiles.length} src non-test .js, ${docScan.length} docs .md)\n`
  );
}

main();
