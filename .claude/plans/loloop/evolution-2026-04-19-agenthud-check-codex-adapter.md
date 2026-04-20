# AgentHUD Evolution: Check Codex Adapter Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.codex-loop/agents.json`
- `.codex-loop/state/last_dispatch.json`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-package-scaffold.md`

## Review Window

- Last optimize dispatch completed `AGHUD-004`.
- Changed implementation artifacts reviewed:
  - `package.json`
  - `extension.js`
  - `src/host/panel-view.js`
  - `media/agenthud.svg`
  - `tasks.json`
  - `.claude/plans/loloop/evolution-2026-04-19-agenthud-package-scaffold.md`

## Findings

- Scope drift: none found. The scaffold stayed on the pure Thread-page surface and did not add board, loop board, team, mailbox, coordination, insights, or vibe dashboard features.
- Dependency risk: none found. `package.json` has no dependencies and no package scripts.
- Runtime risk: acceptable for the scaffold. There is no Python, FastAPI, local HTTP service, localhost probe, native sqlite dependency, post-install download, or server startup workflow.
- UI scope: slightly more than a blank stub but still acceptable for `AGHUD-004`; the webview is a disabled Thread-page shell with Codex/Claude tabs, placeholder search/filter controls, refresh wiring, and a detail placeholder.
- Validation: acceptable. Syntax checks pass for `extension.js` and `src/host/panel-view.js`, JSON parses for `package.json` and `tasks.json`, and a forbidden-term scan over package/source/media returned no matches.
- Task ledger: `AGHUD-004` completion evidence is supported. No `tasks.json` correction is needed in this check.

## Guidance For Implementation Agent

Do `AGHUD-005` next, and keep the slice adapter-only.

The next micro-task is:

- add a Codex provider adapter module under `src/host/` or `src/host/providers/`;
- read local Codex session/rollout JSONL files directly from the filesystem, starting with `~/.codex/sessions`;
- produce normalized list rows and selected-thread detail data shaped by the roadmap provider model:
  - `provider`, `id`, `title`, `cwd`, `status`, `createdAt`, `updatedAt`, `model`, `sourcePath`, `messageCount`, `preview`;
  - detail messages with normalized `role`, `text`, optional `timestamp`, and optional `kind`;
  - capabilities with Codex `openNative` allowed only as a flag, not a full native-open implementation in this slice unless it is already trivial and capability-gated;
- tolerate missing `~/.codex` or empty sessions by returning an empty provider result rather than throwing through the whole webview;
- parse malformed JSONL defensively and expose per-file skipped/error metadata for later source-manifest work, without building the full cache layer yet.

Do not expand the webview beyond what is needed to call or manually exercise the adapter. Do not implement Claude parsing, provider tabs beyond the existing shell, cache-first hydration, provider state persistence, package/dependency changes, or any service/backend path.

Suggested validation for `AGHUD-005`:

- `node --check` on every changed JavaScript file.
- A small Node smoke command that imports the adapter and runs list/detail against a temporary sanitized JSONL fixture under the workspace, not the user’s real `~/.codex` data.
- `node -e 'JSON.parse(require("fs").readFileSync("tasks.json","utf8")); console.log("tasks.json OK")'`.
- Forbidden-term scan over changed source/package files for excluded feature families and backend/server terms.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-codex-adapter.md`, and use the recovered extension only as read-only reference.
Complete `AGHUD-005` only.
Implement the Codex Node thread data adapter for local session/rollout JSONL list/detail normalization.
Keep missing/malformed source handling provider-local.
Do not implement Claude, cache hydration, broad webview UI, package changes, Python/FastAPI/local HTTP services, native sqlite, or out-of-scope dashboard features.
Update `tasks.json` evidence/status after validation.
Write one optimize evolution note and hand off to `AGHUD-006`.
```
