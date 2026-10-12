# Implementation checklist

Only mark an item complete after its output has been verified. Use PLAN.md as the source of architectural decisions.

## 0. Project documentation

- [x] Create the project folder and README.md, AGENTS.md, PLAN.md, and TASKS.md.
- [x] Record the agreed v1 scope, Linux targets, architecture, permissions, and deferred modules.
- [x] Record the initial documentation milestone and update the status after source import.

## 1. Upstream import and Linux build

- [x] Import upstream source and record its exact commit; preserve the complete MIT license and copyright notices.
- [x] Create the GitHub fork, configure `origin`/`upstream`, and prepare `feat/linux-support`.
- [ ] Audit macOS-specific commands, paths, modules, window configuration, and build scripts.
- [ ] Establish Linux build dependencies and configuration without invoking the macOS setup script.
- [ ] Launch the desktop shell on Pop!_OS 22.04 and record verified setup/build commands in README.md.
- [ ] Disable deferred modules in the Linux UI and backend registration.

## 2. Backend boundaries and permissions

- [ ] Add platform capability discovery and typed service/package adapters, retaining platform-selected macOS implementations.
- [ ] Align frontend types and terminology with the Linux adapters.
- [ ] Implement and validate the root-owned helper and polkit policy for allowed administrator operations.
- [ ] Verify invalid requests and canceled authentication cause no mutation in a disposable environment.

## 3. Services and ports

- [ ] Implement system/user service discovery and explicit start, stop, and restart actions.
- [ ] Show accurate unit states, optional metrics, and unknown application health honestly.
- [ ] Implement Linux listening-port/process discovery and permission-limited states.
- [ ] Add validated process termination, explicit force kill, and identity checks.
- [ ] Verify these flows using disposable user services and test listeners.

## 4. Packages

- [ ] Implement installed-package listing, repository search, package details, metadata refresh, and update discovery.
- [ ] Implement transaction previews and confirmed install, remove, and upgrade actions.
- [ ] Handle changed previews, essential-package protection, held packages, dependency conflicts, and package locks.
- [ ] Serialize mutations, stream bounded output, and refresh state after completion or failure.
- [ ] Verify package and privilege behavior in a disposable Ubuntu environment.

## 5. Terminal and desktop integration

- [ ] Adapt shell discovery and PTY lifecycle; verify input, output, resize, and quit cleanup.
- [ ] Adapt Linux window controls, shortcuts, notification behavior, and local settings/history paths.
- [ ] Add opt-in close-to-tray with a usable fallback when tray support is unavailable.
- [ ] Confirm services remain running when the application exits.

## 6. Validation and delivery

- [ ] Add meaningful parser, validation, permissions, transaction, and failure-path tests.
- [ ] Run TypeScript checks, frontend tests, Rust tests, and Clippy.
- [ ] Add Linux CI and retain upstream macOS validation where available.
- [ ] Build a `.deb` containing the protected helper and polkit policy.
- [ ] Verify clean install, launch, removal, and desktop behavior on supported environments.
- [ ] Publish accurate setup instructions, tested compatibility, and known limitations in README.md.

## Deferred

- Doctor health checks and cleanup.
- Claude chat archiving and automation.
- Fedora/Arch adapters and other package managers.
- Repository editing and package version switching.
- Additional distribution formats and architectures.
