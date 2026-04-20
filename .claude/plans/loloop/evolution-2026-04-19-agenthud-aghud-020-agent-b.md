# AgentHUD Evolution: AGHUD-020 (Agent-B) — Stale feature references (static audit slice)

Date: 2026-04-19  
Task: Remove stale feature references — **this slice**: static audit + contribution-surface hook only.

## PLAN (3–6 steps)

1. **Define rules**: Encode high-precision markers for removed dashboard families (board/team/loop/insight tabs, legacy module paths, forbidden command prefixes) in `scripts/audit/check-stale-references.js`.
2. **Scope scans**: Walk `package.json`, repo-root `extension.js`, and `src/**/*.js` **excluding** `*.test.js` (tests may mention forbidden strings negatively).
3. **Document baseline**: Add `docs/agenthud/stale-reference-audit.md` describing scope, rules, exclusions, and how to interpret failures.
4. **Wire npm**: Add `audit:stale-refs` script to `package.json` (no new dependencies).
5. **Regression hook**: Extend `src/host/message-protocol.test.js` to run the audit subprocess and fail CI if violations appear.
6. **Validate**: `node scripts/audit/check-stale-references.js`, `node src/host/message-protocol.test.js`, spot-check other tests if needed.

## Out of scope (this slice)

- Editing blacklisted runtime files (`extension.js`, `panel-view.js`, `thread-page.js`, etc.).
- Marking `tasks.json` entries completed.
- Removing hits under `docs/**` that are **intentional** documentation of removals (audit does not scan `docs/` in v1 to avoid noise).

## Completion notes

- Added `scripts/audit/check-stale-references.js`: scans `package.json`, `extension.js`, and all non-test `src/**/*.js` for high-precision stale substrings; **exit 0** on clean tree.
- Added `docs/agenthud/stale-reference-audit.md`: scope, rule table, exclusions, baseline note.
- `package.json`: `scripts.audit:stale-refs` → `node scripts/audit/check-stale-references.js` (no new deps).
- `src/host/message-protocol.test.js`: subprocess guard so regressions fail `node src/host/message-protocol.test.js`.

### Validation

```bash
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node scripts/audit/check-stale-references.js
cd /home/clashuser/hzh/work_bo/agent_ui/agent_hud && node src/host/message-protocol.test.js
```
