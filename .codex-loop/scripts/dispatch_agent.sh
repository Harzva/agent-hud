#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
WORKSPACE="/home/clashuser/hzh/work_bo/agent_ui/agent_hud"
STATE_DIR="${WORKSPACE}/.codex-loop/state"
DISPATCH_DIR="${STATE_DIR}/dispatch_logs"

case "${MODE}" in
  optimize)
    AGENT_THREAD_ID="019da180-b86f-7cf2-9e6d-929d6656231e"
    ROLE_LABEL="implementation"
    ;;
  check)
    AGENT_THREAD_ID="019da180-e9d0-7ee1-8d78-e4608f939741"
    ROLE_LABEL="checker"
    ;;
  *)
    echo "usage: $0 optimize|check" >&2
    exit 64
    ;;
esac

mkdir -p "${DISPATCH_DIR}"
cd "${WORKSPACE}"

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
RAW_LOG="${DISPATCH_DIR}/${MODE}_${STAMP}.jsonl"
LAST_MESSAGE_FILE="${DISPATCH_DIR}/${MODE}_${STAMP}_last_message.txt"
PROMPT_FILE="${DISPATCH_DIR}/${MODE}_${STAMP}_prompt.md"

{
  printf 'You are the AgentHUD %s agent for the pure-thread build.\n\n' "${ROLE_LABEL}"
  printf 'Workspace: %s\n' "${WORKSPACE}"
  printf 'Recovered source reference, read-only only: /home/clashuser/hzh/work_bo/codex_manager/vscode-extension/recovered/codex-managed-agent-0.0.71/extension\n\n'
  printf 'This dispatch came from scheduler thread 019da175-eb9b-7ac2-a7b4-1f614f459688.\n'
  printf 'Your thread id is %s.\n\n' "${AGENT_THREAD_ID}"
  printf 'Always read roadmap.md, tasks.json, .claude/plans/ACTIVE_PLAN.md, and recent .claude/plans/loloop/evolution-*.md before acting.\n'
  printf 'Keep all AgentHUD-owned files inside %s.\n' "${WORKSPACE}"
  printf 'Do not modify the recovered source extension.\n'
  printf 'Do not introduce Python, FastAPI, local HTTP services, native install requirements, post-install downloads, board, loop board, team, mailbox, coordination lanes, usage insights, or vibe dashboards.\n\n'

  if [[ "${MODE}" == "optimize" ]]; then
    cat <<'PROMPT'
Mode: optimize

Instructions:

1. Pick the smallest unblocked task by milestone/dependency readiness.
2. Implement or optimize exactly one minimal verifiable slice.
3. You may edit product/source/docs/test files only for that selected task.
4. Update tasks.json status/evidence/blocker.
5. Write one evolution note to .claude/plans/loloop/evolution-YYYY-MM-DD-agenthud-<slug>.md with loop_type: optimize.
6. Run the lightest relevant validation available for changed files.
7. End with the next smallest handoff.
8. Write .codex-loop/state/implementation_report.json with:
   - dispatch_id (from .codex-loop/state/dispatch_contract.json)
   - task_id (from .codex-loop/state/dispatch_contract.json)
   - status ("done" or "blocked")
   - changed_files
   - validation_commands
   - validation_result
   - evidence_summary
   - finished_at
9. If the dispatched task milestone is M4, M5, or M6, implementation_report must also include ui_acceptance_evidence:
   - visual_system
   - information_density
   - motion_and_interaction
   - card_language
   - responsive_layout
   - evidence_artifacts
10. Missing required implementation/UI evidence fields will cause the dispatch to be marked failed by the scheduler.

Current guidance:

- If AGHUD-024 is still incomplete, complete AGHUD-024 only before AGHUD-004.
- Do not scaffold package/runtime files until dependency policy is complete.
PROMPT
  else
    cat <<'PROMPT'
Mode: check

Instructions:

1. Do not edit product/source implementation files.
2. Allowed edits: planning files, tasks.json metadata/evidence/blockers, and .claude/plans/loloop/evolution-*.md guidance notes.
3. Inspect whether recent work drifted from scope, skipped validation, introduced dependency risk, bloated UI scope, or moved too broadly.
4. Write concrete guidance and the next micro-task for the implementation agent.
5. If needed, micro-adjust tasks.json to split, block, clarify, or reprioritize tasks; do not mark implementation tasks completed unless evidence already proves acceptance.
6. Write one evolution note to .claude/plans/loloop/evolution-YYYY-MM-DD-agenthud-<slug>.md with loop_type: check.
7. End with the next smallest handoff.
8. Write .codex-loop/state/check_report.json with:
   - dispatch_id (from .codex-loop/state/dispatch_contract.json)
   - task_id (from .codex-loop/state/dispatch_contract.json)
   - reviewed_dispatch_id (the optimize dispatch_id being reviewed, if any)
   - verdict ("pass", "revise", or "block")
   - next_task_id (the next optimize task id)
   - must_fix (array)
   - guidance (string)
   - finished_at
PROMPT
  fi

  printf '\nScheduler state files to inspect:\n'
  printf '%s\n' '- .codex-loop/agents.json'
  printf '%s\n' '- .codex-loop/state/last_dispatch.json, if present'
  printf '%s\n' '- .codex-loop/state/dispatch_contract.json'
} > "${PROMPT_FILE}"

set +e
codex exec resume --json \
  -o "${LAST_MESSAGE_FILE}" \
  --dangerously-bypass-approvals-and-sandbox \
  "${AGENT_THREAD_ID}" \
  - < "${PROMPT_FILE}" | tee "${RAW_LOG}"
RC="${PIPESTATUS[0]}"
set -e

FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

node - "${MODE}" "${AGENT_THREAD_ID}" "${STARTED_AT}" "${FINISHED_AT}" "${RC}" "${LAST_MESSAGE_FILE}" "${RAW_LOG}" <<'NODE'
const fs = require('fs');
const [mode, agentThreadId, startedAt, finishedAt, rc, lastMessageFile, rawLog] = process.argv.slice(2);
let summary = '';
try {
  summary = fs.readFileSync(lastMessageFile, 'utf8').replace(/\s+/g, ' ').trim();
} catch {}
if (!summary) summary = `${mode} dispatch completed; no final message parsed.`;
function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
function nonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function nonEmptyArray(v) {
  return Array.isArray(v) && v.length > 0;
}
function normalizeArray(v) {
  return Array.isArray(v) ? v : [];
}
function detectUiTask(task) {
  const milestone = String(task?.milestone || '');
  return milestone === 'M4' || milestone === 'M5' || milestone === 'M6';
}
function validateImplementationReport(report, contract, task) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    errors.push('implementation_report_missing_or_invalid_json');
    return errors;
  }
  if (!nonEmptyString(report.dispatch_id)) {
    errors.push('implementation_report.dispatch_id_missing');
  } else if (nonEmptyString(contract.dispatch_id) && report.dispatch_id !== contract.dispatch_id) {
    errors.push('implementation_report.dispatch_id_mismatch');
  }
  if (!nonEmptyString(report.task_id)) {
    errors.push('implementation_report.task_id_missing');
  } else if (nonEmptyString(contract.task_id) && report.task_id !== contract.task_id) {
    errors.push('implementation_report.task_id_mismatch');
  }
  if (!(report.status === 'done' || report.status === 'blocked')) {
    errors.push('implementation_report.status_invalid');
  }
  if (!Array.isArray(report.changed_files)) {
    errors.push('implementation_report.changed_files_invalid');
  }
  if (report.status === 'done' && !nonEmptyArray(report.changed_files)) {
    errors.push('implementation_report.changed_files_empty_for_done');
  }
  if (!Array.isArray(report.validation_commands)) {
    errors.push('implementation_report.validation_commands_invalid');
  }
  if (report.status === 'done' && !nonEmptyArray(report.validation_commands)) {
    errors.push('implementation_report.validation_commands_empty_for_done');
  }
  if (!nonEmptyString(report.validation_result)) {
    errors.push('implementation_report.validation_result_missing');
  }
  if (!nonEmptyString(report.evidence_summary)) {
    errors.push('implementation_report.evidence_summary_missing');
  }
  if (!nonEmptyString(report.finished_at)) {
    errors.push('implementation_report.finished_at_missing');
  }

  if (detectUiTask(task)) {
    const ui = report.ui_acceptance_evidence;
    if (!ui || typeof ui !== 'object') {
      errors.push('implementation_report.ui_acceptance_evidence_missing');
      return errors;
    }
    const uiFields = [
      'visual_system',
      'information_density',
      'motion_and_interaction',
      'card_language',
      'responsive_layout'
    ];
    for (const field of uiFields) {
      if (!nonEmptyString(ui[field])) {
        errors.push(`implementation_report.ui_acceptance_evidence.${field}_missing`);
      }
    }
    const artifacts = ui.evidence_artifacts;
    const artifactsValid = nonEmptyArray(artifacts) || nonEmptyString(artifacts);
    if (!artifactsValid) {
      errors.push('implementation_report.ui_acceptance_evidence.evidence_artifacts_missing');
    }
  }
  return errors;
}
function validateCheckReport(report, contract) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    errors.push('check_report_missing_or_invalid_json');
    return errors;
  }
  if (!nonEmptyString(report.dispatch_id)) {
    errors.push('check_report.dispatch_id_missing');
  } else if (nonEmptyString(contract.dispatch_id) && report.dispatch_id !== contract.dispatch_id) {
    errors.push('check_report.dispatch_id_mismatch');
  }
  if (!nonEmptyString(report.task_id)) {
    errors.push('check_report.task_id_missing');
  } else if (nonEmptyString(contract.task_id) && report.task_id !== contract.task_id) {
    errors.push('check_report.task_id_mismatch');
  }
  if (!['pass', 'revise', 'block'].includes(report.verdict)) {
    errors.push('check_report.verdict_invalid');
  }
  if (!nonEmptyString(report.next_task_id)) {
    errors.push('check_report.next_task_id_missing');
  }
  if (!Array.isArray(report.must_fix)) {
    errors.push('check_report.must_fix_invalid');
  }
  if (!nonEmptyString(report.guidance)) {
    errors.push('check_report.guidance_missing');
  }
  if (!nonEmptyString(report.finished_at)) {
    errors.push('check_report.finished_at_missing');
  }
  return errors;
}

const contract = safeReadJson('.codex-loop/state/dispatch_contract.json') || {};
const taskId = typeof contract.task_id === 'string' ? contract.task_id : '';
const dispatchId = typeof contract.dispatch_id === 'string' ? contract.dispatch_id : '';
const tasksDoc = safeReadJson('tasks.json') || {};
const task = Array.isArray(tasksDoc.tasks)
  ? tasksDoc.tasks.find((entry) => String(entry.id || '') === taskId) || null
  : null;
const reportPath = mode === 'optimize'
  ? '.codex-loop/state/implementation_report.json'
  : '.codex-loop/state/check_report.json';
const report = safeReadJson(reportPath);

const toolExitCode = Number(rc);
let finalExitCode = toolExitCode;
const validationFailures = [];

if (mode === 'optimize') {
  validationFailures.push(...validateImplementationReport(report, contract, task));
} else if (mode === 'check') {
  validationFailures.push(...validateCheckReport(report, contract));
}
if (validationFailures.length > 0) {
  finalExitCode = 90;
}

const payload = {
  mode,
  agent_thread_id: agentThreadId,
  started_at: startedAt,
  finished_at: finishedAt,
  returncode: finalExitCode,
  summary: summary.slice(0, 800),
  last_message_file: lastMessageFile,
  raw_log_path: rawLog,
  validation_failures: normalizeArray(validationFailures),
  report_path: reportPath
};
if (toolExitCode !== 0) {
  payload.tool_returncode = toolExitCode;
}
if (taskId) {
  payload.task_id = taskId;
}
if (dispatchId) {
  payload.dispatch_id = dispatchId;
}
if (task && detectUiTask(task)) {
  payload.ui_evidence_required = true;
}
if (validationFailures.length > 0) {
  payload.recovery_action = mode === 'optimize'
    ? 'Fix implementation_report fields (including ui_acceptance_evidence for UI milestones) before next optimize.'
    : 'Fix check_report fields before scheduler consumes verdict.';
}
fs.writeFileSync('.codex-loop/state/last_dispatch.json', JSON.stringify(payload, null, 2) + '\n');
process.exit(finalExitCode);
NODE

RC="$?"
exit "${RC}"
