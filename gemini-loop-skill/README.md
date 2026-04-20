# Gemini Loop Skill (Reflective Edition) 🚀

![AgentHUD Banner](https://raw.githubusercontent.com/Harzva/agent-hud/main/media/agenthud.svg)

An autonomous, self-evolving orchestration loop powered by Gemini CLI. This skill transforms Gemini into a high-order software engineer capable of long-term planning, error reflection, and iterative self-correction.

## 🏛️ The "Project Command Center" Metaphor (项目指挥部)

To understand this system, imagine it as a high-stakes engineering command center:

### 1. The Commander (Plan ID) 📜
- **Identity**: `PLAN-ID` (defined in `GEMINI_ROADMAP.md`).
- **Role**: The "Soul" of the mission. It defines the strategic objective. Even if agents are swapped or restarted, the **Plan ID remains constant**, ensuring the mission never loses its way.

### 2. The Specialist Staff (Thread/Session IDs) 🪪
- **Identity**: Dedicated `UUID`s for each expert role (Optimization, Checking).
- **Role**: Each Session ID acts as a **Specialist with an ID Card**. 
  - The **Optimizer** remembers code changes.
  - The **Checker** remembers previous critiques.
  - **Memory Persistence**: They are not generic bots; they are experts with independent, long-term memory of their specific contributions to the Plan.

### 3. The Black Box (Audit Trail) 📓
- **Identity**: `active.log` and `dispatch_logs/*.log`.
- **Role**: Every tool call, every regex change, and every internal "thought" is recorded. This provides **100% Traceability**. In this command center, we don't just see the result; we see every expert's action and the rationale behind it.

---

## 🌟 Epic Version Upgrade: Core Enhancements

This version introduces the **Reflective Loop Architecture**, drawing inspiration from machine learning's "Fast/Slow Weights" and "Backpropagation" metaphors.

### 1. State Separation (Fast/Slow Weights) 🧠
- **Strategic Prior (`roadmap.md`)**: A slow-moving, global roadmap that locks the ultimate objective and prevents goal-drifting.
- **Fast Adapter (`active_task.json`)**: A high-frequency state file that tracks immediate sub-tasks and transient local variables.

### 2. Structured Failure Memory (`failure_bank.json`) 📓
- Agent no longer repeat the same mistakes. Every fatal error is abstracted into a **Pattern** and stored in the "Failure Bank".

### 3. Patch-Based Backward Signaling 🛠️
- The **Check Agent** now functions as a "Gradient Descent" engine. Instead of simple `pass/fail`, it generates **Local Patches** (Scope, Prompt, or Verification tweaks) to guide the next Optimize cycle.

---

## 📸 System Insights (Screenshots)

### Real-time Evolution Dashboard
*Place your screenshot here: `media/dashboard-screenshot.png`*
> *Caption: Showing the Python-based daemon streaming real-time [Agent] logs with PID and Plan-ID tracking.*

---

## 🧪 Experimental Evidence
- **[Implementation Logs](./evidence/logs/)**: Raw traces of Specialist Agents navigating complex tasks.
- **[Roadmap Evolution](./GEMINI_ROADMAP.md)**: The Commander's live log of mission progress.

## 🛠️ Getting Started
1. **Activate Loop**: `python3 .gemini-loop/scripts/run_daemon.py`
2. **Monitor**: `tail -f .gemini-loop/state/active.log`

---

*Built with ❤️ by the AgentHUD Team using Gemini-Reflective-Loop.*
