# Nexus Console for Linux

A local desktop utility for developers to manage services, packages, listening ports, and terminals on Ubuntu and Pop!_OS.

This project adapts [xDAnkit/Nexus-Console](https://github.com/xDAnkit/Nexus-Console), reusing its React and Tauri foundation while replacing macOS integrations with Linux backends.

## Current status

The Linux desktop foundation includes platform-specific build configuration, capability-based navigation, read-only systemd service discovery and TCP port inspection, a generic terminal, and Settings. macOS integrations are isolated from Linux startup and command registration.

The app builds and launches on Pop!_OS 22.04. Frontend checks, native compilation, Rust tests, and Clippy pass. Service/package controls, process termination, and Linux tray integration are still pending.

## First release

- List system and user systemd services and start, stop, or restart them.
- Browse installed APT packages, search repositories, inspect package details, and apply confirmed package changes.
- Inspect listening ports and terminate processes with explicit controls.
- Use an embedded terminal with the user's shell.
- Configure modules, desktop notifications, and optional close-to-tray behavior.

Doctor health checks, cleanup, Claude chat archiving, Fedora/Arch support, and other package managers are deferred.

## Planned stack and platform

- React, TypeScript, and Tailwind CSS for the interface.
- Tauri 2 and Rust for desktop integration and operating-system access.
- systemd for services; APT and dpkg-query for packages.
- xterm.js and portable-pty for the terminal.
- A narrowly scoped privileged helper authenticated with polkit for administrator operations.

Initial targets: Ubuntu and Pop!_OS 22.04/24.04 on x86_64, where those releases are available. The primary development machine is Pop!_OS 22.04. Distribution and desktop compatibility must be verified before release. Initial delivery will be a `.deb` package.

The app will keep settings and operation history locally, without accounts, telemetry, or a cloud backend. Package-manager operations may access configured repositories.

## Development setup

Use Node >= 22.12 and Rust through rustup. This workspace was checked with its already-installed Node 24.15.0; the machine's default Node 20 does not meet the project's requirement.

```bash
nvm use 24             # if you use nvm and already have Node 24 installed
npm run setup:linux    # read-only prerequisite check; installs nothing
```

If the check reports missing native libraries, install the following explicitly:

```bash
sudo apt-get update
sudo apt-get install build-essential pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev libxdo-dev libssl-dev librsvg2-dev lsof
```

Then:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build          # frontend build only
npm start              # native desktop development; verified on Pop!_OS 22.04
```

Native verification after installing the prerequisites:

```bash
cargo test --locked --manifest-path src-tauri/Cargo.toml
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
npm run release       # Linux .deb build; pending local verification
```

`npm run setup` selects the read-only Linux checker on Linux. Do not run `scripts/setup.sh` directly there; it is the original macOS installer. Browser-only Vite development does not provide Rust operations.

Verified locally: TypeScript, lint, formatting, 58 frontend tests, production frontend build, native compilation, 21 standard Rust tests, Clippy with warnings denied, and separate read-only systemd discovery, disposable-listener, and PTY smoke tests. Full interactive terminal/lifecycle QA and `.deb` packaging remain separate release checks.

On Linux, Control replaces Command for navigation shortcuts. Use `Ctrl+1` through `Ctrl+3` for the visible tabs, `Ctrl+,` for Settings, and Control + backtick or the sidebar button to open the terminal. Existing installations can enable Services in Settings → Features.

### Service discovery

The Services screen lists system and current-user units, with scope, runtime state, enablement, optional process/resource counters, and search/state filters. Enablement is separate from running state; an active oneshot service can show `exited`. CPU time is cumulative, and application health remains unknown.

Discovery merges installed unit files with runtime properties, retaining aliases, templates, and transient services. Installed units whose runtime state was not observed show **Not loaded**, rather than being assumed inactive. A missing user bus or a failed query produces a scope-specific diagnostic and preserves any successfully discovered units. Queries run only while the page is mounted, with polling limited to the focused Services tab at ten-second intervals.

The local read-only integration test found 307 system and 125 user unit entries on Pop!_OS 22.04; counts change with the machine's session. Commands have timeouts and output limits. This milestone exposes no service mutations, administrator helper, boot enablement changes, or service cleanup on app exit.

## Project documents

- [AGENTS.md](AGENTS.md): development conventions and agent instructions.
- [PLAN.md](PLAN.md): agreed architecture, behavior, and release criteria.
- [TASKS.md](TASKS.md): phased implementation checklist.
- [LINUX-AUDIT.md](LINUX-AUDIT.md): platform assumptions, adaptations, and current limitations.

## Upstream attribution

Upstream Nexus Console is MIT licensed, with copyright attributed to Vidhya Skill School. Its complete [license and copyright notice](LICENSE) are preserved.

Imported upstream commit: `3f621dbcbdd0c258f4eedddb6d6a63839df87a16`.

## Fork workflow

- Fork: [amaank23/nexus-console-linux](https://github.com/amaank23/nexus-console-linux) (`origin`).
- Original project: [xDAnkit/Nexus-Console](https://github.com/xDAnkit/Nexus-Console) (`upstream`).
- Development branch: `feat/linux-support`.
- `main` starts at the imported upstream commit. Review upstream updates before merging them into the development branch.

## Upstream macOS documentation

The following documentation describes the imported macOS app. Its setup commands and feature descriptions do not establish Linux support.

---

# Nexus Console

Your Mac's local dev setup, in one window.

![Free](https://img.shields.io/badge/100%25-Free-brightgreen?style=for-the-badge)
![No ads](https://img.shields.io/badge/Ads-None-blue?style=for-the-badge)
![No tracking](https://img.shields.io/badge/Tracking-None-blueviolet?style=for-the-badge)
![Offline](https://img.shields.io/badge/Your%20data-Stays%20on%20your%20Mac-orange?style=for-the-badge)
![MIT license](https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge)

|                                                                 |                                                                                                                 |
| :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| ✅&nbsp;&nbsp;**Free&nbsp;to&nbsp;use**&nbsp;&nbsp;&nbsp;&nbsp; | Every feature. No paid tier, no trial, no locked buttons.                                                       |
| ✅&nbsp;&nbsp;**No&nbsp;ads**&nbsp;&nbsp;&nbsp;&nbsp;           | Nothing is sold to you inside the app. Ever.                                                                    |
| ✅&nbsp;&nbsp;**No&nbsp;tracking**&nbsp;&nbsp;&nbsp;&nbsp;      | No analytics, no telemetry, no account, no server. Your data is never shared, because it never leaves your Mac. |

> The app has no network code of its own. It only talks to your own machine.

Nexus Console is a small macOS app that manages your [Homebrew](https://brew.sh) services and
packages, shows you which ports are busy, checks the health of your machine, and gives you a
terminal. No more remembering ten `brew` commands. Click a button instead.

Built with Tauri (Rust) + React. Runs on macOS 11 or newer.

## Why you'll like it

- **Free, ad-free, and private.** See above. That is the whole deal, no asterisk.
- **Light on resources.** Native Rust core, one small window, lives in the menu bar.
- **Pick what you need.** Turn modules on or off in Settings. The app hides what you don't use.

## What's inside

The app is split into modules. Each one is optional.

### Homebrew

- **Services** shows every Homebrew service with its real state, so a service that says "started"
  but is not actually healthy is marked as starting, not green. Start, stop and restart with one
  click. Install, uninstall, search for new formulae and switch versions.
- **Packages** lists everything you have installed and marks what is outdated. Upgrade one package
  or all of them, run `brew update`, read package info, and see what depends on a package before
  you remove it.
- **Sessions** keeps a simple history of what you ran and how long your services stayed up.

Runs a light check every few seconds so the menu bar count stays correct.

### Ports

See which process is listening on which port, and kill the stuck one by PID. Force kill and admin
escalation are there when a process will not go quietly. Nothing runs in the background.

### Doctor

Read-only health checks for your Mac. It looks at disk and system state, VSCode, browsers, Claude
Code and Ollama, then reports what is slow, what is eating storage, and what is just information.
Two rules it never breaks:

- Probes only read. They never start a daemon just to look at it.
- Every finding is honest about what it does. Cleaning disk space is labelled storage, not speed.

Fixes only happen when you press the button. There is also an optional daily VSCode cleanup that
runs while the app sits in the tray.

### Claude Chats

Browse your Claude Code chat history per project, and archive old chats so they stop piling up.
You choose how long to keep things. Archiving can run daily on its own if you want. This module
only appears if Claude Code is installed.

### Terminal

A real terminal built into the app, so you can drop to the shell without switching windows.

Plus: it sits in the menu bar, keeps your services running when you close the window, and sends
desktop notifications.

## Install and run

On a fresh Mac, three commands. The setup script checks for Xcode Command Line Tools, Homebrew,
Node 22.12 or newer, and Rust, then installs whatever is missing. It asks before each step.

```bash
git clone <this-repo> && cd NexusConsole
sh scripts/setup.sh     # add --yes to skip the prompts
npm start               # runs the app
```

### Using pnpm

pnpm works too, and it is faster. Install it first if you don't have it:

```bash
npm install -g pnpm     # or: corepack enable pnpm
```

Then:

```bash
pnpm install
pnpm start              # runs the app
pnpm release            # build the .app / .dmg
```

Pick one package manager and stick with it. Both `package-lock.json` and `pnpm-lock.yaml` are in
the repo, and switching back and forth just creates noise in your diffs. CI uses npm.

### Notes

- The first Rust build compiles every dependency and takes a few minutes. After that it is fast.
- `npm run dev` (or `pnpm dev`) starts Vite in the browser only. Most features will fail there
  because they need Rust. Use `npm start`.
- Skipping the setup script? You need **Xcode Command Line Tools**, **Homebrew**,
  **Node 22.12+**, and **Rust via [rustup](https://rustup.rs)**. Not `brew install rust`. Tauri
  needs rustup toolchains and the `rustfmt` and `clippy` parts the git hooks use. Then
  `npm install`.

## Everyday commands

```bash
npm start               # develop (Tauri + Vite)
npm run release         # production build
npm test                # vitest
npm run typecheck       # tsc --noEmit
npm run lint            # oxlint
npm run format          # prettier
cargo test   --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Git hooks (lefthook) run lint and format on commit, then typecheck, tests and clippy on push. CI
runs the same set.

## Privacy

Short version: the app has no network code for itself. It does not phone home.

- No accounts, no sign-in, no cloud.
- No analytics, no crash reporting, no usage stats.
- Your settings, sessions and archives are plain files on your own Mac.
- The only network access happens when Homebrew itself downloads a package you asked for.

## Troubleshooting

**Anything toolchain-related.** Run `npm run setup` again. It re-checks everything and fixes what
is missing. Open a **new terminal** afterwards so PATH changes apply.

**`cargo: command not found` when committing (especially from VSCode's Source Control).**
GUI git clients don't load your shell profile, so `~/.cargo/bin` isn't on their PATH.
[.lefthookrc](.lefthookrc) handles that, so make sure you have run `npm install`. In a terminal:
`source "$HOME/.cargo/env"`.

**Homebrew permission errors** (`Permission denied @ … /opt/homebrew`). Usually a Mac where brew
was installed by another user account:

```bash
sudo chown -R "$(whoami)" /opt/homebrew
```

**"Refusing to load formula … from untrusted tap".**
Homebrew 6 won't touch a third-party tap until you trust it. The app shows a **Trust tap** button
on that error. From a terminal it is `brew trust --tap <user/repo>`.

**App shows "Homebrew not detected".** It looks in `/opt/homebrew`, then `/usr/local`, then
`$HOMEBREW_PREFIX`. Install brew and relaunch. There is nothing to configure.

**"Nexus Console can't be opened" or "damaged" when opening a build on another Mac.**
The app is not signed with a paid Apple Developer certificate, so Gatekeeper quarantines a copied
build. Right-click the app, choose **Open**, then **Open** again. Or:

```bash
xattr -dr com.apple.quarantine "/Applications/Nexus Console.app"
```

Building on your own machine never hits this.

**Hook failure blocking an urgent commit.** `LEFTHOOK=0 git commit …` skips the hooks. CI still
runs the same checks, so it only delays the failure.

## License

[MIT](LICENSE). Use it, change it, ship it. Just keep the copyright notice.
