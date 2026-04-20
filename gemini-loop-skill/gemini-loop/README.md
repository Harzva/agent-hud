# Gemini Loop Component: Reflective ML Architecture 🛰️

This sub-package implements the core logic for the **Gemini Reflective Loop**. It is designed to minimize logical drift in long-running agentic workflows by applying reinforcement learning and backpropagation metaphors to plan execution.

## 🧠 Core Methodology: The Reflective Loop

Unlike linear task executors, this skill treats task completion as an **iterative optimization problem**.

### 1. The Forward Pass (Optimize Agent)
The implementation agent is strictly bounded by the `active_task.json`. Before every action, it performs a **Global-to-Local Context Mapping**:
- Reads the **Strategic Prior** (`roadmap.md`) to lock the goal.
- Injects the **Local Adapter** (`active_task.json`) which contains temporary "learned" variables and current patches.
- Scans the **Failure Bank** (`failure_bank.json`) to adjust its probability distribution away from known error patterns (e.g., specific regex pitfalls or API timeout issues).

### 2. The Backward Signal (Check Agent)
The checker does not merely validate; it computes a **Loss Function** between the intended output and the actual file state.
- **Output**: A **Local Patch**.
- **Patch Types**:
  - `prompt_patch`: Injects specific behavioral hints into the next Optimize cycle.
  - `scope_patch`: Tightens or expands the allowed file-editing radius.
  - `verification_patch`: Adds additional shell commands to the next validation phase.

### 3. State Weighting
| State File | Analogous to... | Update Frequency | Purpose |
| :--- | :--- | :--- | :--- |
| `roadmap.md` | Slow Weights / Pre-training | Low | Ensures global consistency. |
| `active_task.json` | Fast Weights / LoRA | High | Adapts to immediate blockers. |
| `failure_bank.json` | Replay Buffer / Experience | Continuous | Prevents catastrophic forgetting of errors. |

## 🛠️ Technical Components

- **`scripts/init_gemini_loop.cjs`**: Bootstraps the ML-style state environment.
- **`SKILL.md`**: The system-level instruction set that defines role boundaries and patch generation rules.
- **State Schema**: Versioned JSON structures for deterministic parsing by the scheduler.

## 🚀 Deployment

1. **Package**: 
   ```bash
   gemini skills package .
   ```
2. **Installation**:
   ```bash
   gemini skills install gemini-loop.skill
   ```

---

*Part of the AgentHUD Autonomous Engineering Suite.*
