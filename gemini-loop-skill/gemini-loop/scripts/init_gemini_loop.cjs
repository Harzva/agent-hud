const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspace = process.cwd();
const loopDir = path.join(workspace, '.gemini-loop');
const stateDir = path.join(loopDir, 'state');
const scriptsDir = path.join(loopDir, 'scripts');

fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(scriptsDir, { recursive: true });

function initSession(role) {
  console.log(`Initializing ${role} session...`);
  try {
    const output = execSync(`gemini -p "Initialize ${role} session. Reply OK." --output-format stream-json`, { encoding: 'utf8' });
    const match = output.match(/"type":"init".*?"sessionId":"([^"]+)"/);
    if (match) return match[1];
  } catch (e) {
    console.log(`Failed to init session for ${role}, using fallback placeholder.`);
  }
  return 'SESSION_ID_PLACEHOLDER';
}

const schedulerSessionId = initSession('scheduler');
const optimizeSessionId = initSession('optimize');
const checkSessionId = initSession('check');

const agentsJson = { scheduler: schedulerSessionId, optimize: optimizeSessionId, check: checkSessionId };
fs.writeFileSync(path.join(loopDir, 'agents.json'), JSON.stringify(agentsJson, null, 2));

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
  printf 'You are the AgentHUD %s agent for the pure-thread build.\n\n' "\${ROLE_LABEL}"
  printf 'Workspace: %s\n' "\${WORKSPACE}"
  printf 'Your session id is %s.\n\n' "\${AGENT_SESSION_ID}"
  printf 'Always read roadmap.md, tasks.json, .claude/plans/ACTIVE_PLAN.md, and recent .claude/plans/loloop/evolution-*.md before acting.\n'
  printf 'Keep all AgentHUD-owned files inside %s.\n' "\${WORKSPACE}"

  if [[ "\${MODE}" == "optimize" ]]; then
    cat <<\'PROMPT'
Mode: optimize
Instructions:
1. Pick the smallest unblocked task.
2. Implement exactly one verifiable slice.
3. Update tasks.json and write an evolution note.
4. Write .gemini-loop/state/implementation_report.json.
PROMPT
  else
    cat <<\'PROMPT'
Mode: check
Instructions:
1. Do not edit product/source implementation files.
2. Inspect recent work for drift.
3. Write concrete guidance and next micro-task.
4. Write .gemini-loop/state/check_report.json.
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

const promptMd = `You are the AgentHUD main scheduler loop.
Workspace: \`${workspace}\`
Scheduler session: \`${schedulerSessionId}\`

Delegated commands:
- \`.gemini-loop/scripts/dispatch_agent.sh optimize\`
- \`.gemini-loop/scripts/dispatch_agent.sh check\`
`;

fs.writeFileSync(path.join(loopDir, 'prompt.md'), promptMd);
console.log("Gemini loop scaffolded in .gemini-loop/");