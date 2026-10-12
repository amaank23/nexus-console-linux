# Linux adaptation plan

## Goal and boundaries

Adapt Nexus Console into a local Linux desktop utility for a developer managing their machine. Reuse its React/TypeScript/Tailwind interface and Tauri 2/Rust foundation.

Initial targets are Ubuntu and Pop!_OS 22.04/24.04 on x86_64, where available, with Pop!_OS 22.04 as the first validation machine. Deliver a `.deb` package first. Do not claim support for untested distributions or desktop sessions.

V1 includes services, packages, ports, terminal, settings, notifications, and optional tray integration. Doctor, cleanup, Claude chat archiving and automation, additional package managers, repository editing, and package version switching are deferred.

## Core behavior

### Services

Replace Homebrew service management on Linux with systemd. List system and user service units, including installed inactive services, and show their actual state. Support explicit start, stop, and restart actions. Preserve system/user scope in every action so similarly named units cannot be confused.

Do not automatically change boot enablement or stop services when Nexus exits. A running unit is not proof of application health; show health as unknown unless a specific probe establishes it.

### Packages

Use dpkg-query and APT to list installed packages, search configured repositories, show details and available updates, refresh metadata, install, remove, and upgrade individual packages or all upgradable packages.

Preview the resolved transaction and its dependency changes before execution. If the proposed changes differ at execution time, require a fresh preview and confirmation. V1 does not expose purge, autoremove, repository editing, or version switching. Refuse transactions that remove essential packages. Report held packages, dependency conflicts, and external package-manager locks without silently resolving them through unrelated changes.

Serialize package mutations, stream bounded operation output, and refresh relevant state after success or failure. Do not forcibly interrupt a package transaction midway through package configuration; cancellation before execution must leave the machine unchanged.

### Ports and terminal

Adapt listening-port and process discovery for Linux, showing available PID, user, command, and resource details. Mark restricted or missing process details clearly. Support explicit graceful termination and force kill, protecting PID 1 and the app itself and rechecking process identity before signaling.

Reuse xterm.js and portable-pty, adapting shell discovery and removing macOS-specific paths and service launch assumptions. Support interactive input, output, resize, and session exit; clean up owned PTYs on actual quit.

### Desktop integration

Use Linux window controls, keyboard shortcuts, notification integration, and application data paths. Keep settings and operation history local. Make close-to-tray opt-in and provide a usable fallback without tray support. No accounts, telemetry, or cloud backend are required; package tools may access their configured repositories.

## Architecture and interfaces

- Add separate service and package adapters behind typed Tauri commands; select the appropriate backend by platform.
- Extend application context with detected platform capabilities. Replace Linux-facing Homebrew fields and terminology with backend-neutral concepts.
- Represent service scope, operation support, and unavailable data explicitly in Rust responses and matching frontend types.
- Keep blocking work off the UI thread. Invalidate affected caches after mutations and avoid expensive background scans when modules are disabled.
- Retain existing macOS implementations behind platform selection. Remove Homebrew-only actions from Linux screens and disable deferred modules in the Linux build.
- Run the app unprivileged. Package mutations and other required administrator operations use a root-owned helper authenticated through polkit. The helper accepts only independently validated operations and identifiers and invokes fixed commands without a shell.
- Install the helper and polkit policy in protected locations through the `.deb`; never elevate a helper executable from a user-writable project directory. Do not store passwords.
- Preserve upstream license notices and record the source commit when importing code.

## Verification and release acceptance

- Test systemd/APT output parsing, scoped service actions, identifier validation, restricted process visibility, and process identity checks.
- Cover authentication cancellation, missing tools, unsupported environments, package locks, dependency conflicts, changed transaction previews, and subprocess failures.
- On Pop!_OS 22.04, verify discovery, disposable user-service control, a test listener, terminal interaction, settings, and desktop lifecycle.
- Verify package mutations and privileged helper validation in a disposable Ubuntu environment. Confirm authentication failure performs no mutation and the helper rejects invalid operations.
- Run TypeScript checks, frontend tests, Rust tests, and Clippy; use Linux CI and retain upstream macOS checks when available.
- Verify `.deb` installation, launch, helper/policy permissions, and removal in a clean supported environment. Confirm the UI remains usable without tray integration.

The fork imports upstream commit `3f621dbcbdd0c258f4eedddb6d6a63839df87a16`. The initial Linux foundation now builds and launches on Pop!_OS 22.04 with Ports, Terminal, and Settings offered, macOS integrations isolated, and native/frontend checks passing. Next milestones are service/package adapters, protected administrator operations, and full release acceptance. See LINUX-AUDIT.md and TASKS.md for current limitations and verified work.
