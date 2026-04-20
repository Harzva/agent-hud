"use strict";

const assert = require("assert");
const {
  UI_STATE_KEY,
  applyUiState,
  readUiState,
  snapshotUiState,
  writeUiState
} = require("./ui-state");
const { createThreadPageState } = require("./thread-page");

async function run() {
  const base = createThreadPageState("codex");
  base.codex.selectedThreadId = "codex-1";
  base.codex.query = "adapter";
  base.codex.statusFilter = "recent";
  base.codex.sort = "title_asc";
  base.codex.detailTab = "source";
  base.codex.narrowPane = "detail";
  base.claude.selectedThreadId = "claude-1";
  base.claude.query = "notes";

  const snapshot = snapshotUiState(base, () => new Date("2026-04-19T00:00:00.000Z"));
  assert.equal(snapshot.schema_version, 1);
  assert.equal(snapshot.updated_at, "2026-04-19T00:00:00.000Z");
  assert.equal(snapshot.provider, "codex");
  assert.equal(snapshot.providers.codex.selectedThreadId, "codex-1");
  assert.equal(snapshot.providers.codex.statusFilter, "recent");
  assert.equal(snapshot.providers.codex.sort, "title_asc");
  assert.equal(snapshot.providers.codex.detailTab, "source");
  assert.equal(snapshot.providers.codex.narrowPane, "detail");
  assert.equal(snapshot.providers.claude.query, "notes");

  const globalState = fakeGlobalState(snapshot);
  assert.deepStrictEqual(readUiState(globalState), snapshot);

  const restored = applyUiState(createThreadPageState("claude"), {
    ...snapshot,
    provider: "claude"
  });
  assert.equal(restored.provider, "claude");
  assert.equal(restored.codex.selectedThreadId, "codex-1");
  assert.equal(restored.codex.query, "adapter");
  assert.equal(restored.codex.statusFilter, "recent");
  assert.equal(restored.codex.detailTab, "source");
  assert.equal(restored.codex.narrowPane, "detail");
  assert.equal(restored.claude.selectedThreadId, "claude-1");

  const invalid = applyUiState(createThreadPageState("codex"), {
    schema_version: 1,
    provider: "not-real",
    providers: {
      codex: {
        selectedThreadId: " x ",
        query: " q ",
        statusFilter: "raw",
        sort: "raw",
        detailTab: "raw",
        narrowPane: "raw"
      }
    }
  });
  assert.equal(invalid.provider, "codex");
  assert.equal(invalid.codex.selectedThreadId, "x");
  assert.equal(invalid.codex.query, "q");
  assert.equal(invalid.codex.statusFilter, "all");
  assert.equal(invalid.codex.sort, "updated_desc");
  assert.equal(invalid.codex.detailTab, "conversation");
  assert.equal(invalid.codex.narrowPane, "list");

  const writable = fakeGlobalState(null);
  const written = await writeUiState(writable, restored, () => new Date("2026-04-19T01:00:00.000Z"));
  assert.equal(writable.value.updated_at, "2026-04-19T01:00:00.000Z");
  assert.deepStrictEqual(written, writable.value);

  const corrupt = fakeGlobalState({ schema_version: 999 });
  assert.equal(readUiState(corrupt), null);

  console.log("ui state fixture OK");
}

function fakeGlobalState(initial) {
  return {
    value: initial,
    get(key) {
      assert.equal(key, UI_STATE_KEY);
      return this.value;
    },
    async update(key, value) {
      assert.equal(key, UI_STATE_KEY);
      this.value = value;
    }
  };
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
