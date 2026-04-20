# evolution-2026-04-19-agenthud-feature-allowlist.md

## Loop Type

- type: analysis

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `M0`
- bounded target: complete `AGHUD-002` by defining the pure AgentHUD feature allowlist and explicit exclusion list.

## Review Window

- reviewed loops: `.claude/plans/loloop/evolution-2026-04-19-agenthud-package-boundary.md`
- status: previous tick completed the package boundary and zero-service-compatible package identity.

## Completed

- Created `docs/agenthud/feature-allowlist.md`.
- Documented the allowed provider-tabbed Thread page product surface.
- Explicitly placed provider tabs, thread list, selected detail, conversation history, search, filters, quick switch, source reveal, provider health, cache rebuild, and native-open actions in scope.
- Documented the required Thread page controls and allowed host message types.
- Documented destructive and mutating actions as provider-capability gated.
- Explicitly excluded board, loop board, team, mailbox, handoff/coordination workflows, usage reports, insights dashboards, topic maps, word clouds, vibe advice, memory/prompt/rule cards, batch board actions, and service start/probe UI.
- Documented fast first paint, cache-first list hydration, background refresh, fast jumps, isolated provider failures, and large-history safety as required behavior.
- Updated `tasks.json`: `AGHUD-002` is now `completed` with evidence.

## Validation

- `node -e 'const fs=require("fs"); const t=JSON.parse(fs.readFileSync("tasks.json","utf8")); const a=t.tasks.find(x=>x.id==="AGHUD-002"); console.log(`${a.id} ${a.status}`);'`
- `test -s docs/agenthud/feature-allowlist.md && wc -l docs/agenthud/feature-allowlist.md`
- `rg -n "thread list|selected thread detail|conversation history|thread search|status/project/model filters|provider tabs|native-open|renameThread|archiveThread|restoreThread|fast first paint|fast jumps|isolated provider failures|board canvas|loop board|team space|mailbox|usage reports|insights dashboard|cross-agent coordination" docs/agenthud/feature-allowlist.md`

## Failed or Deferred

- No implementation scaffold was created in this tick; the allowlist was intentionally completed before adding contributed commands or webview code.
- No recovered source extension files were modified.

## Decisions

- Future command, view, storage, provider-contract, and host-message additions must fit the allowlist or update it deliberately.
- Unsupported provider actions must be hidden or disabled through explicit capability flags, not inferred from provider identity.

## Analysis Checks

- regression risk: low; this tick added a product guardrail and updated only AgentHUD-owned docs/tasks.
- drift risk: lower than before; the allowlist turns broad roadmap constraints into implementation checks.
- version safety: acceptable; no runtime package files exist yet.
- plan adjustment: none.

## Next Handoff

```text
Read `roadmap.md`, `tasks.json`, `.claude/plans/ACTIVE_PLAN.md`, and `.claude/plans/loloop/evolution-2026-04-19-agenthud-feature-allowlist.md`.
Pick the next smallest dependency-ready task in milestone order. `AGHUD-003`, `AGHUD-004`, and `AGHUD-023` are unblocked; prefer `AGHUD-003` to map removable modules/message types before scaffolding or copying reference code.
Complete one bounded, verifiable slice in `/home/clashuser/hzh/work_bo/agent_ui/agent_hud`.
Update `tasks.json` with status/evidence or blocker notes.
Write one new evolution note in `.claude/plans/loloop/`.
End with the next smallest handoff.
```
