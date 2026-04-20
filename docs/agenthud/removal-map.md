# AgentHUD Reference Removal Map

Status: accepted for the pure-thread build.

## Scope

This map identifies recovered Codex-Managed-Agent source areas that must not be
copied into AgentHUD, plus the narrow Thread-page dependencies that may be
reimplemented under the pure provider contract.

Reference source, read-only:

```text
/home/clashuser/hzh/work_bo/codex_manager/vscode-extension/recovered/codex-managed-agent-0.0.71/extension
```

AgentHUD-owned replacement code must stay under:

```text
/home/clashuser/hzh/work_bo/agent_ui/agent_hud
```

## Thread-Page Dependencies To Keep Or Reimplement

Keep the concepts, not the feature-heavy recovered structure:

- `src/webview/drawer.js`
  - `renderDrawerShell`: useful detail-pane shape, but should become provider
    detail UI with conversation/events/source/metadata sections.
- `src/webview-template.js`
  - thread explorer CSS and layout concepts around `.thread-explorer-*`,
    `.thread-filter-row`, `.thread-sort-row`, `.thread-row`, drawer actions, and
    selected thread detail.
  - message types that align with the allowlist: `ready`, `selectThread`,
    `threadFilterChanged` as a temporary reference for future `searchThreads`,
    `openInCodexEditor`, `revealInCodexSidebar`, `copyText`, `persistUiState`.
- `src/host/panel-view.js`
  - webview lifecycle and message routing shape, but replace the large
    if-chain with provider-scoped request/response handlers.
- `src/host/codex-link.js`
  - Codex native open/sidebar behavior may be preserved behind Codex
    `openNative` capability.
- `src/host/server.js`
  - use only as a data-source reference. Do not keep FastAPI probing, HTTP
    fetches, or server startup as AgentHUD runtime.
- `src/host/lifecycle.js`
  - `renameThread` may inform a future capability-gated rename action.
  - `showThreadInCodex` may inform Codex native open behavior.
  - `openLogFile` and `openRepoFile` may inform source/log reveal actions.

Pure AgentHUD replacements must consume provider-neutral rows/details and local
Node indexers. Do not preserve recovered Codex-only raw field names in the shared
Thread page.

## Removed Feature Families

### Board And Loop Board

Files/modules to exclude:

- `src/webview/board.js`
  - `renderBoardPane`
  - elements/IDs: `runningBoardPrimary`, `boardDropOverlayPrimary`,
    `boardSubtabs`, `boardTabRailPrimary`, `interventionDockPrimary`,
    `boardTodoPrimary`, `boardPlayPrimary`
  - panes/subviews: `canvas`, `coordination`, `todo`, `play`
- `src/webview-template.js`
  - import `renderBoardPane`
  - board media asset `board-hero.svg`
  - CSS families: `.board-*`, `.running-board-*`, `.board-subtab*`,
    `.board-tab-*`, `.badge-board`, `.mini-action-btn.attach-board`
  - UI state/storage concepts: `boardAttached`, `boardTabAssignments`,
    `boardTabOrder`, `activeBoardTab`, card layout/drag state
- `src/host/lifecycle.js`
  - `editCardLabel`
  - `setCardLabel`
  - `chooseBoardTab`
  - `createBoardTab`
  - `batchSetBoardTab`
  - `pinThreadInPersistedUi`
  - `replacePinnedThreadInPersistedUi` only if it writes board/card state

Message types to exclude:

- `editCardLabel`
- `setCardLabel`
- `chooseBoardTab`
- `createBoardTab`
- `batchSetBoardTab`
- `batchBoardTabPatched`
- `lifecycleBatch` when used for board batches
- any drag/drop, attach-board, layout-lock, or board-tab patch messages

Thread-page separation:

- Pinning can return later only as provider-neutral local UI state.
- Batch board actions must not be reused for Thread-page selection or filtering.

### Loop Daemon And Auto-Loop Controls

Files/modules to exclude:

- `src/host/auto-continue.js`
  - `configureAutoContinue`
  - `setAutoContinue`
  - `clearAutoContinue`
  - `launchCodexExecResume`
  - `sendPromptToThread`
  - `triggerAutoContinue`
  - `enrichAutoContinueConfigs`
  - `inferAutoContinueResult`
- `src/host/lifecycle.js`
  - `createLoopThread`
  - `setLoopManagedThread`
  - `runLoopIntervalPreset`
  - `promptLoopIntervalPreset`
  - `stopLoopDaemon`
  - `startLoopDaemon`
  - `restartLoopDaemon`
  - `stopLoopDaemonAt`
  - `startLoopDaemonAt`
  - `restartLoopDaemonAt`
  - `installBundledCodexLoopSkill`
  - `generateLoopRotationPrompt`
  - `copyLoopRotationPrompt`
  - `attachLoopTmux`
  - `tailLoopLog`
  - loop helpers such as `loopStateDir`, `workspaceLoopRoot`,
    `resolveLoopStartOptions`, `buildRotationPromptContent`,
    `startLoopDaemonBackend`
- `src/webview-template.js`
  - CSS/UI families: `.loop-*`, `.loop-daemon-*`, `.loop-install-card`,
    `.mini-action-btn.attach-loop`

Message types to exclude:

- `createLoopThread`
- `setLoopManagedThread`
- `runLoopIntervalPreset`
- `promptLoopIntervalPreset`
- `stopLoopDaemon`
- `startLoopDaemon`
- `restartLoopDaemon`
- `stopLoopDaemonAt`
- `startLoopDaemonAt`
- `restartLoopDaemonAt`
- `installBundledCodexLoopSkill`
- `generateLoopRotationPrompt`
- `copyLoopRotationPrompt`
- `attachLoopTmux`
- `tailLoopLog`
- `configureAutoContinue`
- `setAutoContinue`
- `clearAutoContinue`
- `sendPromptToThread`
- `promptQueued`
- `promptQueueFailed`

Thread-page separation:

- Provider detail may show recent events/log previews derived from local
  transcripts.
- It must not launch background prompts, manage daemons, attach tmux sessions,
  install loop skills, or expose auto-continue state.

### Team, Mailbox, And Coordination

Files/modules to exclude:

- `src/host/team-coordination.js`
  - full module is out of scope.
  - exported functions: `readTeamCoordination`, `readTeamSpace`,
    `pathsForWorkspace`, `validateTeamTaskRecord`, `validateTeamAgentRecord`,
    `validateTeamEventRecord`, `validateTeamInboxRecord`,
    `validateTeamSpaceFiles`, `initializeTeamSpace`, `openTeamBrief`,
    `assignTaskToThread`, `claimTaskForThread`, `heartbeatThread`,
    `blockTaskForThread`, `completeTaskForThread`, `markStaleTeamTasks`,
    `updateAgentRolePrompt`
  - storage concepts: team root, tasks, agents, inbox, events log, leases,
    owner, task state, role prompts
- `src/webview-template.js`
  - CSS/UI families: `.team-*`, `.team-health-*`, `intervention-*`,
    handoff/coordination panels, `Needs Human`
- `src/webview/board.js`
  - `data-board-subview="coordination"` and `interventionDockPrimary`

Message types to exclude:

- `initializeTeamSpace`
- `openTeamBrief`
- `assignTeamTask`
- `claimTeamTask`
- `heartbeatTeamTask`
- `blockTeamTask`
- `completeTeamTask`
- `markStaleTeamTasks`
- `updateTeamAgentRolePrompt`
- `setHandoffObject`
- `clearHandoffObject`

Thread-page separation:

- Status grouping may say running/recent/idle/archived/unknown.
- It must not assign owners, route handoffs, maintain team tasks, or expose
  mailbox/inbox records.

### Insights, Usage, Topic Maps, Word Clouds, And Vibe Advice

Files/modules to exclude:

- `src/webview/insights.js`
  - `renderInsightsSections`
  - elements/IDs: `usageReportNote`, `usageActions`, `usageSummary`,
    `tokenTrend`, `tokenThreadRanking`, `usageKeywords`, `topicMap`,
    `vibeAdvice`, `weeklyShift`, `analysisViews`, `interactionHeatmap`,
    `wordCloud`
- `src/host/thread-insight.js`
  - full module is out of scope.
  - exports: `THREAD_INSIGHT_CACHE_KEY`, `buildThreadInsight`,
    `generateThreadVibeAdvice`
  - generated-advice helpers: `buildAdvicePrompt`, `runCodexExecForAdvice`,
    `parseAdviceText`, `coerceAdviceItems`
- `src/host/usage-ledger.js`
  - full module is out of scope.
  - exports: `reportPath`, `ledgerPath`, `rebuildPersistedUsageReport`,
    `ingestUsageEvent`, `ingestKnownCliUsageLogs`,
    `readLatestThreadUsageEvent`
- `src/webview-template.js`
  - import `renderInsightsSections`
  - CSS/UI families: `.insights-*`, `.summary-deck-insights`,
    `.topic-map-board`, `.word-cloud-board`, `.token-*`,
    `.interaction-heatmap-*`, `.insight-*`

Message types to exclude:

- `generateUsageInsights`
- `generateThreadVibeAdvice`
- any usage-report, token-ranking, topic-map, word-cloud, heatmap, weekly-shift,
  analysis-view, or advice patch message

Thread-page separation:

- Thread previews and recent events can be deterministic parser outputs.
- AgentHUD must not run model-generated advice, usage analytics, token
  dashboards, topic clustering, or vibe interpretation.

### Memory, Prompt, Rule, And Memo Cards

Files/modules to exclude:

- `src/webview-template.js`
  - CSS/UI families: `.memory-shell-*`
  - card types: prompt, rule, memo
  - any memory/prompt/rule/memo dashboard panels or card grids

Message types to exclude:

- any memory-card create/update/delete action
- any prompt/rule/memo card persistence action

Thread-page separation:

- Provider source transcripts remain source of truth.
- AgentHUD may persist UI preferences and rebuildable indexes only; it must not
  add a separate memory-card product surface.

### Service Start, Probe, And Dashboard Shell

Files/modules to exclude or replace:

- `src/host/server.js`
  - server probing, HTTP dashboard fetches, FastAPI launch, endpoint refresh,
    and port discovery must not be kept as runtime behavior.
- `src/host/panel-view.js`
  - message handlers: `startServer`, `restartServer`, `openExternal`,
    service/dashboard commands, and any server-health actions tied to FastAPI.
- `src/webview-template.js`
  - dashboard/overview/live shells outside the Thread page.
  - shell actions such as `maximizeDashboard` when they imply dashboard mode.

Message types to exclude:

- `startServer`
- `restartServer`
- server probe/status messages
- dashboard-only overview/live navigation messages

Thread-page separation:

- Provider health is allowed only as local source/index status:
  source folder found/missing, indexed count, skipped count, stale cache age,
  and last scan error.
- No AgentHUD command may start or probe a local HTTP service.

## Message Protocol Split

Allowed as-is or as close references:

- `ready`
- `selectThread`
- `copyText`
- `openInCodexEditor`
- `revealInCodexSidebar`
- `persistUiState`
- `renameThread`, only when provider capability `rename` is true
- `openLogFile` and `openRepoFile`, renamed to provider-neutral source reveal

Replace with provider-neutral names:

- `threadFilterChanged` -> `searchThreads` / `saveUiState`
- `reload` -> `refreshProvider`
- `scanCodexSessions` -> `rebuildIndex` or provider refresh
- `showThreadInCodex` -> Codex-only `openNative`

Remove all other dashboard, board, loop, team, mailbox, coordination, usage,
insight, memory, service-start, and batch-board messages listed above.

## Implementation Rule For Future Copying

When copying from the recovered source into AgentHUD:

1. Copy only into this workspace.
2. Remove imports for `webview/board`, `webview/insights`, `team-coordination`,
   `auto-continue`, `thread-insight`, and `usage-ledger`.
3. Replace dashboard payload assumptions with provider contract objects.
4. Keep source reveal/native-open behavior capability-gated.
5. Validate that forbidden names do not appear in contributed commands, webview
   tabs, storage keys, or host message handlers.
