const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const workspace = process.cwd();
const loopDir = path.join(workspace, '.gemini-loop');
const stateDir = path.join(loopDir, 'state');
const scriptsDir = path.join(loopDir, 'scripts');

fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(scriptsDir, { recursive: true });

function initSession(role) {
  console.log(`Initializing ${role} session...`);
  return crypto.randomUUID();
}

const schedulerSessionId = initSession('scheduler');
const optimizeSessionId = initSession('optimize');
const checkSessionId = initSession('check');

const agentsJson = { scheduler: schedulerSessionId, optimize: optimizeSessionId, check: checkSessionId };
fs.writeFileSync(path.join(loopDir, 'agents.json'), JSON.stringify(agentsJson, null, 2));

const roadmapMd = `# Roadmap

## Project Title
My Project

## Mission
(Define the stable global prior and success definition here.)

## Hard Constraints
- Global direction should be stable.
- Local execution should be adaptive via patches.
- Every iteration must produce observable evidence.
`;
fs.writeFileSync(path.join(loopDir, 'roadmap.md'), roadmapMd);

const activeTaskJson = {
  "task_id": "",
  "objective": "",
  "status": "idle",
  "assumptions": [],
  "risks": [],
  "success_criteria": [],
  "next_action": "",
  "local_patches": []
};
fs.writeFileSync(path.join(stateDir, 'active_task.json'), JSON.stringify(activeTaskJson, null, 2));

const failureBankJson = {
  "failures": []
};
fs.writeFileSync(path.join(stateDir, 'failure_bank.json'), JSON.stringify(failureBankJson, null, 2));

const dispatchAgentSh = `#!/usr/bin/env bash
set -euo pipefail

MODE="\${1:-}"
WORKSPACE="${workspace}"
STATE_DIR="\${WORKSPACE}/.gemini-loop/state"
DISPATCH_DIR="\${STATE_DIR}/dispatch_logs"

case "\${MODE}" in
  optimize)
    AGENT_SESSION_ID="${optimizeSessionId}"
    ROLE_LABEL="implementation"
    ;;
  check)
    AGENT_SESSION_ID="${checkSessionId}"
    ROLE_LABEL="checker"
    ;;
  *)
    echo "usage: \$0 optimize|check" >&2
    exit 64
    ;;
esac

mkdir -p "\${DISPATCH_DIR}"
cd "\${WORKSPACE}"

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
RAW_LOG="\${DISPATCH_DIR}/\${MODE}_\${STAMP}.jsonl"
LAST_MESSAGE_FILE="\${DISPATCH_DIR}/\${MODE}_\${STAMP}_last_message.txt"
PROMPT_FILE="\${DISPATCH_DIR}/\${MODE}_\${STAMP}_prompt.md"

{
  printf 'You are the %s agent for the reflective loop.\n\n' "\${ROLE_LABEL}"
  printf 'Workspace: %s\n' "\${WORKSPACE}"
  printf 'Your session id is %s.\n\n' "\${AGENT_SESSION_ID}"
  printf 'Always read .gemini-loop/roadmap.md (Global Prior), .gemini-loop/state/active_task.json (Local State), and .gemini-loop/state/failure_bank.json (Failure Memory).\n'

  if [[ "\${MODE}" == "optimize" ]]; then
    cat <<\'PROMPT'
Mode: optimize (Forward Pass)
Instructions:
1. Treat active_task.json as your current adapter state.
2. Read any local_patches provided.
3. Implement exactly one verifiable bounded slice based on active_task.json.
4. If an error occurs, write a local patch or failure pattern to failure_bank.json.
5. Write .gemini-loop/state/implementation_report.json detailing evidence and actual outcome.
PROMPT
  else
    cat <<\'PROMPT'
Mode: check (Backward Signal)
Instructions:
1. Do not edit product source implementation files.
2. Inspect the latest implementation_report.json and the actual outcome.
3. Contrast intended objective vs actual result.
4. You MUST extract a reusable local patch (e.g. prompt_patch, scope_patch, verification_patch) and add it to active_task.json's local_patches array.
5. Update active_task.json with the next bounded action.
6. Write .gemini-loop/state/check_report.json with verdict.
PROMPT
  fi
} > "\${PROMPT_FILE}"

set +e
gemini --resume "\${AGENT_SESSION_ID}" \
  --approval-mode yolo \
  --output-format json \
  -p "$(cat "\${PROMPT_FILE}")" > "\${RAW_LOG}"
RC=$?
set -e

jq -r '.response' "\${RAW_LOG}" > "\${LAST_MESSAGE_FILE}" || echo "Failed to extract JSON" > "\${LAST_MESSAGE_FILE}"

FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

node - "\${MODE}" "\${AGENT_SESSION_ID}" "\${STARTED_AT}" "\${FINISHED_AT}" "\${RC}" "\${LAST_MESSAGE_FILE}" "\${RAW_LOG}" <<\'NODE'
const fs = require('fs');
const [mode, agentThreadId, startedAt, finishedAt, rc, lastMessageFile, rawLog] = process.argv.slice(2);
// Simple state update logic
const payload = { mode, agent_thread_id: agentThreadId, started_at: startedAt, finished_at: finishedAt, returncode: Number(rc), last_message_file: lastMessageFile };
fs.writeFileSync('.gemini-loop/state/last_dispatch.json', JSON.stringify(payload, null, 2) + '\n');
process.exit(Number(rc));
NODE
`;

fs.writeFileSync(path.join(scriptsDir, 'dispatch_agent.sh'), dispatchAgentSh);
fs.chmodSync(path.join(scriptsDir, 'dispatch_agent.sh'), '0755');

const promptMd = `You are the main scheduler loop.
Workspace: \`${workspace}\`
Scheduler session: \`${schedulerSessionId}\`

Delegated commands:
- \`.gemini-loop/scripts/dispatch_agent.sh optimize\`
- \`.gemini-loop/scripts/dispatch_agent.sh check\`
`;

fs.writeFileSync(path.join(loopDir, 'prompt.md'), promptMd);
console.log("Reflective Gemini loop scaffolded in .gemini-loop/");