# Gemini Loop Skill (Reflective ML Edition)

This repository contains the `gemini-loop` skill for Gemini CLI, which sets up and manages an autonomous scheduler loop for continuous task execution. 

This version heavily borrows from **Reflective Task Optimization** and **Machine Learning Training Metaphors**.

## Overview

The loop relies on three distinct agent roles and a fast/slow state architecture:
1. **Scheduler**: Evaluates the global state and routes traffic.
2. **Optimize (Forward Pass)**: Implements features using a localized, fast-moving state adapter (`active_task.json`).
3. **Check (Backward Signal)**: Reviews the implementation, computes the "mismatch/error" and generates reusable **Local Patches** (e.g. `verification_patch`) instead of just issuing pass/fail verdicts.

State Management:
- **`roadmap.md`**: Global Prior. Stable. Rarely updated.
- **`active_task.json`**: Local Adapter. Fast. Frequently updated.
- **`failure_bank.json`**: Shared Memory. Prevents recurring failure modes.

## Installation

Install this skill globally with Gemini CLI:
```bash
gemini skills install /path/to/gemini-loop.skill --scope user
```

Then reload skills in your Gemini CLI session:
```
/skills reload
```

## Usage

In any project directory, ask Gemini CLI to initialize the loop:
> "Please setup a gemini-loop for this project"

This will create a `.gemini-loop` folder with all necessary setup (roadmap template, fast state adapters, failure banks, and bash scripts) for background autonomous operation.
