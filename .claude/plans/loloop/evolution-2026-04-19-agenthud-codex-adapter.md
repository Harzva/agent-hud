# evolution-2026-04-19-agenthud-codex-adapter.md

Date: 2026-04-19

loop_type: optimize

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-codex-adapter.md`
- read-only reference: recovered `codex_manager/app.py`

## Bounded Target

Complete `AGHUD-005` only by adding the Codex Node thread data adapter for local session/rollout JSONL list/detail normalization.

## Completed Work

- Added `src/host/providers/codex.js`.
- Implemented `createCodexProvider`, `listCodexThreads`, `getCodexThreadDetail`, `parseCodexRollout`, and local rollout discovery.
- The adapter reads `rollout-*.jsonl` files directly from a configurable sessions directory, defaulting to `~/.codex/sessions`.
- Normalized list rows include `provider`, `id`, `title`, `cwd`, `status`, `createdAt`, `updatedAt`, `model`, `sourcePath`, `messageCount`, and `preview`.
- Normalized detail data includes messages, recent events, provider-local source errors, source metadata, and capability flags.
- Missing Codex sessions paths return an empty provider result.
- Malformed JSONL lines are skipped and reported without failing the whole thread.
- Added a sanitized fixture under `test/fixtures/codex/sessions`.
- Added `src/host/providers/codex.test.js` as a Node smoke test for list/detail normalization.
- Updated `tasks.json`: `AGHUD-005` is now `completed` with evidence.

## Validation

- `node --check src/host/providers/codex.js && node --check src/host/providers/codex.test.js`
- `node src/host/providers/codex.test.js`
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`
- `rg -n -i "board|loop|team|mailbox|coordination|insight|vibe|FastAPI|Python|localhost|startServer|server" src/host/providers test/fixtures/codex || true`
- Missing-source smoke:

```bash
node - <<'NODE'
const { createCodexProvider } = require('./src/host/providers/codex');
(async () => {
  const provider = createCodexProvider({ sessionsDir: './test/fixtures/codex/no-such-dir' });
  const list = await provider.listThreads();
  if (list.threads.length !== 0 || list.meta.discovered !== 0) throw new Error('missing sessions handling failed');
  console.log('missing sessions OK');
})();
NODE
```

## Failed or Deferred

- No webview list/detail integration was added; that belongs to `AGHUD-006`.
- No Claude provider, cache-first hydration, storage layer, provider persistence, native-open command implementation, package dependency, or package contribution change was added.
- No recovered source extension files were modified.

## Decisions

- Codex `openNative` is exposed as a capability flag only in this slice.
- Mutating and live capabilities remain false until provider-specific host actions are implemented and gated.
- Status is best-effort from source update time: recent within a short window, otherwise idle.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-codex-adapter.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-006` is now unblocked.
Build the pure Codex ThreadPage slice by wiring the existing shell to the Codex adapter list/detail data, with search/sort/status controls and selected detail, without adding board/team/loop/insight UI.
Do not implement Claude, cache-first hydration, provider contracts beyond the current adapter shape, Python/FastAPI/local HTTP services, native sqlite, package dependencies, or out-of-scope dashboard features.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
Run the lightest relevant validation for changed files.
```
