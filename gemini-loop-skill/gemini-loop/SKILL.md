---
name: gemini-loop
description: Sets up and manages an autonomous scheduler loop (optimize and check) for continuous task execution, translating the Codex-loop architecture for Gemini CLI. Use when asked to setup or manage a gemini-loop.
---

# Gemini Loop Skill

This skill provides an automated framework for running an autonomous coding loop using Gemini CLI, mirroring the architecture of `.codex-loop`.

## Overview

The loop relies on three distinct roles, each maintaining its own persistent session ID:
1. **Scheduler**: Evaluates the state and decides whether to dispatch `optimize` or `check`.
2. **Optimize**: Implements features by editing source files.
3. **Check**: Reviews the implementation and updates task guidance.

## Quick Start

To initialize the loop in the current workspace, run the included initialization script. This will set up the `.gemini-loop/` folder, generate persistent session IDs for all agents, and write the appropriate dispatch bash scripts.

```bash
node <path-to-skill-creator>/scripts/init_gemini_loop.cjs
```

*Note to Gemini Agent: When asked to initialize the loop, you can execute the script above directly from the skill's scripts directory, using the path `__DIRNAME__/scripts/init_gemini_loop.cjs`.*