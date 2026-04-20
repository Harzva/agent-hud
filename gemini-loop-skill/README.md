# Gemini Loop Skill (Reflective Edition) 🚀

![AgentHUD Banner](https://raw.githubusercontent.com/Harzva/agent-hud/main/media/agenthud.svg)

An autonomous, self-evolving orchestration loop powered by Gemini CLI. This skill transforms Gemini into a high-order software engineer capable of long-term planning, error reflection, and iterative self-correction.

## 🌟 Epic Version Upgrade: Core Enhancements

This version introduces the **Reflective Loop Architecture**, drawing inspiration from machine learning's "Fast/Slow Weights" and "Backpropagation" metaphors.

### 1. State Separation (Fast/Slow Weights) 🧠
- **Strategic Prior (`roadmap.md`)**: A slow-moving, global roadmap that locks the ultimate objective and prevents goal-drifting.
- **Fast Adapter (`active_task.json`)**: A high-frequency state file that tracks immediate sub-tasks and transient local variables.

### 2. Structured Failure Memory (`failure_bank.json`) 📓
- Agent no longer repeat the same mistakes.
- Every fatal error or tool-call failure is abstracted into a **Pattern** and stored in the "Failure Bank".
- Optimize agents read this bank before every forward pass to proactively avoid known pitfalls.

### 3. Patch-Based Backward Signaling 🛠️
- The **Check Agent** now functions as a "Gradient Descent" engine.
- Instead of simple `pass/fail`, it generates **Local Patches** (Scope, Prompt, or Verification tweaks).
- These patches are dynamically applied to the next **Optimize** cycle, ensuring the loop converges rapidly toward the target state.

---

## 📸 System Insights (Screenshots)

### Real-time Evolution Dashboard
*Place your screenshot here: `media/dashboard-screenshot.png`*
> *Caption: Showing the Python-based daemon streaming real-time [Agent] logs with PID tracking.*

### The Failure Bank in Action
*Place your screenshot here: `media/failure-bank-ui.png`*
> *Caption: Visualization of the failure_bank.json preventing redundant error cycles.*

---

## 🧪 Experimental Evidence

Recent autonomous runs have been captured and archived for transparency:

- **[Implementation Logs](./evidence/logs/)**: Raw traces of Gemini navigating complex file-system tasks and self-correcting regex errors.
- **[Roadmap Evolution](./GEMINI_ROADMAP.md)**: Proof of task progression from M7 through future milestones.

## 🛠️ Getting Started

1. **Install from VSIX**: `agent-hud-0.0.1.vsix`.
2. **Activate Loop**: 
   ```bash
   python3 .gemini-loop/scripts/run_daemon.py
   ```
3. **Monitor**:
   ```bash
   tail -f .gemini-loop/state/active.log
   ```

---

*Built with ❤️ by the AgentHUD Team using Gemini-Reflective-Loop.*
