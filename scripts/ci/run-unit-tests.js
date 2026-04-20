"use strict";

/**
 * Run all AgentHUD Node unit tests under src/ (auto-discover *.test.js).
 * No npm dependencies required.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SRC_ROOT = path.join(REPO_ROOT, "src");

function collectTestFiles(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_error) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTestFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      acc.push(full);
    }
  }
}

function main() {
  const absFiles = [];
  if (fs.existsSync(SRC_ROOT)) {
    collectTestFiles(SRC_ROOT, absFiles);
  }
  absFiles.sort((a, b) => a.localeCompare(b));

  if (!absFiles.length) {
    process.stderr.write("unit-tests: no *.test.js files under src/\n");
    process.exitCode = 1;
    return;
  }

  for (const abs of absFiles) {
    const r = spawnSync(process.execPath, [abs], {
      cwd: REPO_ROOT,
      stdio: "inherit"
    });
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  }
  process.stdout.write(`unit-tests: OK (${absFiles.length} files)\n`);
}

main();
