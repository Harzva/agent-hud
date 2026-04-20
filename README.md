# AgentHUD 🛰️

**AgentHUD** is a high-performance VS Code extension for inspecting and managing local agent threads from **Codex**, **Claude**, and now **Gemini**.

## 🚀 Project Status: Autonomous Evolution

AgentHUD has transitioned into an **Autonomous Engineering Workspace**. It is currently being developed and maintained by a self-evolving **Gemini Reflective Loop**.

### 🏛️ The "Project Command Center" Architecture
This project follows a strict multi-agent orchestration pattern:
- **Commander (Plan ID)**: Guided by `GEMINI_ROADMAP.md`, ensuring long-term strategic consistency.
- **Specialists (Expert Threads)**: Dedicated Gemini sessions for Implementation and Checking, each with independent memory.
- **Black Box (Audit Trail)**: 100% traceability through `active.log` and detailed dispatch logs.

## 🛠️ Supported Providers

- **Codex**: Local rollout scanning with zero-service architecture.
- **Claude**: High-speed JSONL transcript indexing and parser.
- **Gemini**: (New) Reflective loop integration with evolution-based thread tracking.

## 💻 Development & Operations

### 1. Verification
Ensure the integrity of the core and adapters:
```bash
npm run verify
```

### 2. Autonomous Loop (Gemini)
To activate the self-healing development cycle:
```bash
python3 .gemini-loop/scripts/run_daemon.py
```
Monitor the commander's log:
```bash
tail -f .gemini-loop/state/active.log
```

## 📖 Documentation
- [Gemini Roadmap](./GEMINI_ROADMAP.md): Current mission status and milestones.
- [Provider Guide](./docs/agenthud/provider-extension-guide.md): How to add new agent sources.
- [Reflective Loop Skill](./gemini-loop-skill/README.md): Deep dive into the autonomous engine.

---
*Built with ❤️ and Gemini CLI.*
