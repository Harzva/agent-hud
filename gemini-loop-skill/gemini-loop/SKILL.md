---
name: gemini-loop
description: Sets up and manages an autonomous scheduler loop based on reflective machine learning metaphors (Pretrained Backbone, Local Adapters, Error Banks). Use when asked to setup or manage a gemini-loop.
---

# Gemini Loop Skill (Reflective ML Edition)

This skill provides an automated framework for running an autonomous coding loop using Gemini CLI, heavily inspired by ML training principles.

## Architecture

The loop treats long-horizon agent work as a layered optimization process:

- **`roadmap.md` (Pretrained Backbone):** Slow parameters. Represents the global prior, stable constraints, and overall mission. Only updated when structural failures are proven.
- **`active_task.json` (PEFT/LoRA Adapter):** Fast parameters. Represents the localized execution state. Continually updated with assumed risks, targets, and immediate actions.
- **`failure_bank.json` (Reusable Failure Memory):** A global registry of recurrent patterns and mistakes to prevent looping errors.
- **`optimize` (Forward Pass):** Agent executes precisely one bounded slice of the `active_task.json`.
- **`check` (Backward Signal):** Agent inspects the actual outcome vs the intended objective. Instead of just passing or failing, it produces a **Local Patch** (e.g. `scope_patch`, `prompt_patch`) which is passed into the `active_task.json` for the next forward pass.

## Quick Start

To initialize the reflective loop in the current workspace, run the included initialization script:

```bash
node <path-to-skill-creator>/scripts/init_gemini_loop.cjs
```

*Note to Gemini Agent: When asked to initialize the loop, you can execute the script above directly from the skill's scripts directory, using the path `__DIRNAME__/scripts/init_gemini_loop.cjs`.*
