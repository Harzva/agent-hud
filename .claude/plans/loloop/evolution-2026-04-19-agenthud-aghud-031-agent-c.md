# AGHUD-031 — local search quality (Agent-C)

**Task** `AGHUD-031` | **Agent** C | **Date** 2026-04-19  
**Scope**: Provider-neutral search core + tests only (no UI / thread-page / panel-view).

## Preconditions / gap check

- `src/host/search-core.js`, `search-core.test.js`, `docs/agenthud/search-design.md`: **missing** — create.
- `src/host/provider-contract.js`: had no shared thread search corpus — extend minimally.
- List filtering today lives in `thread-page.js` (substring `includes`); **not modified** this slice; core is ready for a later wiring task.

## PLAN (3–6 steps)

1. **Contract**: Add neutral `buildThreadSearchCorpus(thread)` + small drift helpers in `provider-contract.js` (mirror list-row fields + optional `projectLabel` / `sourcePath` when present).
2. **Core**: Implement `search-core.js` — normalize query, whitespace-split **AND** tokens, match against corpus, light relevance score (title > id > other), `rankThreadsBySearchQuery`.
3. **Tests**: `search-core.test.js` — AND semantics, ranking, drift in corpus, empty query behavior.
4. **Design doc**: `docs/agenthud/search-design.md` — goals, corpus fields, API surface, explicit “UI integration follow-up”.
5. **Validate**: `node src/host/search-core.test.js`.
6. **Report**: Write `.codex-loop/state/parallel-reports/AGHUD-031-agent-c.json` (status `done`, not “task completed” flag beyond this slice).

## Implementation notes

- **`provider-contract.js`**: `buildThreadSearchCorpus(thread)` plus private drift helpers (`driftSearchBlob`, etc., mirroring list drift search text in `thread-page.js`). Corpus adds `projectLabel` and `sourcePath` when present.
- **`search-core.js`**: `normalizeSearchQuery`, `tokenizeSearchQuery`, AND-token `threadMatchesSearchQuery`, `scoreThreadSearchMatch` (title 4 / id 2 / else 1 per matched token), `rankThreadsBySearchQuery` with stable tie-break.
- **`search-core.test.js`**: Normalization, AND semantics, ranking, drift, `projectLabel`.
- **`docs/agenthud/search-design.md`**: Corpus table, API table, follow-up to wire UI.

## Validation

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/search-core.test.js
```

Result: **exit 0**, prints `search-core smoke OK`.

## Risks / next steps

- **`thread-page.js` / `panel-view.js` not updated** — search bar still uses inline `includes` on a locally built corpus; integrating `rankThreadsBySearchQuery` is a separate change. **Orchestrator marks overall task completion**; this slice only delivers the core + tests.
- Scoring weights are heuristic; revisit after UX feedback.
- Provider list API (`filterClaudeThreads`) still uses single-string `includes`; optional alignment later.
