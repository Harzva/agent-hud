# AgentHUD Packaged Dependency Policy

AgentHUD must install as one VSIX and run inside the VS Code extension host without user-managed setup. This policy applies before any `package.json`, runtime scaffold, webview bundle, parser, cache, or provider adapter dependency is added.

## Runtime Rule

The default runtime is:

- VS Code extension APIs.
- Node APIs available in the VS Code extension host.
- AgentHUD source files shipped in the VSIX.
- Static webview assets shipped in the VSIX.
- Rebuildable JSON cache files written under the extension `globalStorageUri`.

The default runtime must not require Python, FastAPI, a local HTTP service, native sqlite bindings, a sidecar daemon, a post-install download, or a separate command the user must run after installing the extension.

## Allowed Dependencies

A dependency is allowed when all of these are true:

- It is pure JavaScript or plain static assets.
- It runs in the VS Code extension host, the webview, or both without native compilation.
- It is bundled into the VSIX or is already provided by VS Code/Node.
- It does not fetch runtime code during install, activation, or first use.
- It does not start a background service, open a local port, or require an external daemon.
- It has a clear purpose tied to provider indexing, JSON parsing, webview rendering, search, virtualization, testing, or packaging.

Prefer no new dependency when the built-in VS Code, Node, or browser API is enough. Provider adapters should start with `fs`, `path`, `os`, `crypto`, `vscode`, and small local helpers before considering packages.

## Native Dependency Exception

Native dependencies are disallowed by default. A native dependency may be proposed only with an explicit exception note that includes:

- The exact package name, version, and native component.
- Why a pure JavaScript or VS Code API alternative is not acceptable.
- Platform coverage for macOS, Linux, and Windows.
- Proof that the VSIX contains all required binaries or that VS Code already provides them.
- Proof that installation does not run build scripts, download binaries, or require system toolchains.
- Package-size and activation-time impact.
- A rollback plan if packaging or platform support fails.

No native dependency may be merged into AgentHUD without this exception being documented and accepted in the task ledger.

## Install Scripts And Downloads

AgentHUD dependencies must not use install scripts to fetch runtime code for the user. In particular, avoid dependencies that depend on:

- `postinstall`, `preinstall`, or `install` scripts that download binaries or generated runtime files.
- Optional native packages used for normal runtime behavior.
- Runtime CDN fetches for webview scripts, styles, fonts, models, parsers, or worker bundles.
- First-run setup commands that install Python, Node packages, CLIs, daemons, or language servers.

Development-only tooling may use normal local development commands, but the packaged VSIX must contain everything needed for the shipped runtime path.

## Package Budget

Budgets are guardrails, not excuses to add low-value packages:

- Initial packaged VSIX target: under 5 MB.
- Hard review threshold: 10 MB packaged VSIX or any single dependency contributing more than 1 MB after bundling.
- Webview first-paint assets target: under 250 KB compressed for the initial shell.
- Provider parser/indexer code target: small local modules; avoid broad frameworks for JSONL scanning.

Crossing a threshold requires an evolution note with the measured size, reason, and rejected smaller alternatives.

## Activation Budget

AgentHUD should activate quickly and defer file scans:

- Activation target: under 150 ms before opening the webview shell on a typical warm VS Code session.
- Hard review threshold: 300 ms activation attributable to AgentHUD code.
- No provider scan, transcript parse, cache rebuild, or source discovery may block initial activation.
- Heavy work must run after shell creation and report provider-scoped progress or stale-cache status.

Any new dependency used during activation must document why it cannot be lazy-loaded after the Thread page shell is visible.

## Packaging Checklist

Before adding a dependency or packaged asset:

- Confirm it fits the pure Thread-page scope.
- Confirm it does not reintroduce board, loop board, team, mailbox, coordination lanes, usage insights, or vibe dashboards.
- Confirm it runs without Python, FastAPI, local HTTP ports, native builds, post-install downloads, or user setup.
- Confirm it is compatible with VS Code extension host and webview security constraints.
- Confirm it will be bundled or otherwise present in the VSIX.
- Record any budget threshold crossing in `tasks.json` evidence or blocker notes.

This policy should be revisited before `AGHUD-004` creates package contributions and before any later task adds dependencies.
