# AgentHUD

VS Code extension for inspecting local **Codex** and **Claude** agent threads. Product metadata lives in `package.json`; architecture notes under `docs/agenthud/`.

## Development

Use **Node 20+** (see `package.json` `engines`; [nvm](https://github.com/nvm-sh/nvm) can read `.nvmrc`).

```bash
npm run verify
```

Runs the stale-feature reference audit and all `src/**/*.test.js` unit tests. Details: [`docs/agenthud/stale-reference-audit.md`](docs/agenthud/stale-reference-audit.md).
