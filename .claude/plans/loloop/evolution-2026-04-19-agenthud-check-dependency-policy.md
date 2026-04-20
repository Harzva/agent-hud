# AgentHUD Evolution: Check Dependency Policy Handoff

Date: 2026-04-19

loop_type: check

## Plan Used

- `roadmap.md`
- `tasks.json`
- `.claude/plans/ACTIVE_PLAN.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-three-thread-loop.md`
- `.claude/plans/loloop/evolution-2026-04-19-agenthud-zero-service-runtime.md`

## Review Window

- Latest implementation evidence: `AGHUD-023` completed in `docs/agenthud/zero-service-runtime.md` and `tasks.json`.
- Latest scheduler/config changes: `.codex-loop/prompt.md`, `.codex-loop/agents.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-three-thread-loop.md`.
- No Git repository is present at the workspace root, so latest changed files were checked by filesystem mtime.

## Findings

- Scope drift: none found. Recent changes reinforce the pure Thread-page and zero-service constraints instead of broadening UI/product scope.
- Dependency risk: still unresolved by design. `AGHUD-024` remains the right next task before package scaffolding because `AGHUD-004` will otherwise choose package dependencies without a written policy.
- Validation gap: `AGHUD-023` had lightweight doc/task validation. That is sufficient for the architecture note, but the next implementation pass should add explicit validation commands for the dependency policy artifact.
- Scheduler risk: `.codex-loop/state/last_dispatch.json` records the old single-thread optimize dispatch against the scheduler thread. This is acceptable as bootstrap state because `.codex-loop/agents.json` and `.codex-loop/prompt.md` now define the dedicated implementation/checker threads, but the next scheduler tick should update `last_dispatch.json` with the actual checker dispatch result.
- Product file risk: none found in this check pass. Current changed product artifacts are planning/docs only; no source implementation files exist yet in this workspace.

## Guidance For Implementation Agent

Do `AGHUD-024` next, not `AGHUD-004`.

Keep the slice architecture-only and small:

- create `docs/agenthud/dependency-policy.md`;
- define allowed dependencies as VS Code APIs, Node built-ins, pure JS packages, and bundled static assets;
- define disallowed dependency patterns: Python, FastAPI, native build requirements, install scripts that fetch runtime code, required daemons/sidecars, and native sqlite as a default runtime dependency;
- document the exception process for any future native dependency, including packaging proof across supported VS Code platforms;
- set initial package-size and activation-time budgets before scaffolding, with a simple measurement plan for later package work;
- update only `tasks.json` evidence/status for `AGHUD-024` after the doc satisfies all acceptance criteria;
- run lightweight validation: JSON parse for `tasks.json`, file existence/non-empty check, and `rg` checks for the key allowed/disallowed policy terms.

Avoid creating `package.json`, `src/`, webview files, or runtime code in the same pass. That belongs to `AGHUD-004` after `AGHUD-024` is complete.

## Task Metadata Adjustment

No `tasks.json` micro-adjustment was needed in this check. `AGHUD-024` already has the right dependency on `AGHUD-023` and clear acceptance criteria.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-check-dependency-policy.md`.
Complete `AGHUD-024` only.
Create `docs/agenthud/dependency-policy.md` with allowed/disallowed dependency rules, native-dependency exception requirements, no post-install/runtime-download rule, and initial package-size/activation-time budgets.
Do not scaffold package/runtime files yet.
Update `tasks.json` evidence/status only after acceptance is met.
Write one optimize evolution note and end with the next smallest handoff, likely `AGHUD-004`.
```
