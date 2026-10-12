# Linux integration audit

Imported base: `xDAnkit/Nexus-Console` at `3f621dbcbdd0c258f4eedddb6d6a63839df87a16`.

## Initial desktop shell

| Area       | Upstream assumption                                    | Linux foundation                                                                                                              |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Setup      | Xcode and Homebrew installation                        | Read-only prerequisite checker; platform dispatcher prevents running the Mac setup script on Linux                            |
| Packaging  | `.app` and `.dmg`, overlay titlebar                    | Linux config override selects `.deb`, a separate application identifier, and native window decorations                        |
| Startup    | Homebrew discovery and Doctor scheduler                | macOS startup is compiled only on macOS; Linux advertises its available modules explicitly                                    |
| Navigation | Homebrew, Doctor, and Claude modules offered           | Unsupported modules are filtered before onboarding, navigation, polling, or Settings panels mount                             |
| Services   | Homebrew and launchctl; stop unlinked services on quit | No Linux service actions yet; macOS-only quit cleanup cannot run on Linux                                                     |
| Packages   | Homebrew formulae, taps, and versions                  | No Linux package actions yet; APT adapter and protected helper remain pending                                                 |
| Ports      | lsof/ps; administrator escalation through osascript    | Shared read-only discovery; missing commands produce an error; Linux process mutations are not registered or offered          |
| Terminal   | Homebrew clients/logs and fallback `/bin/zsh`          | Generic Linux login shell using an existing absolute SHELL path or `/bin/sh`; service log sessions rejected until implemented |
| Lifecycle  | Always hide to tray on close                           | Normal Linux close/quit; application-owned PTYs are cleaned up, system services are untouched                                 |
| Shortcuts  | Command modifier                                       | Control on Linux, Command on macOS; terminal programs keep their own Control shortcuts                                        |
| CI         | macOS only                                             | Frontend checks on Ubuntu; native Rust checks on Ubuntu 22.04/24.04 and macOS                                                 |

## Current limitations

- Initial Linux availability is Ports, Terminal, and Settings. Port inspection covers TCP sockets visible to the current user, not every process on the machine.
- systemd/APT adapters, transaction previews, process identity checks, the polkit helper, and optional Linux tray behavior still need implementation.
- Deferred modules are excluded from Linux backend command registration. Their frontend source remains available for macOS builds.
- Native compilation and desktop launch are verified on Pop!_OS 22.04. The `.deb` has not yet been built or tested.
- The native Ports and Settings screens were inspected directly. The browser execution tool is unavailable in this session; full terminal interaction and close/reopen QA remain release acceptance items.

## Verification

Frontend type checking, lint, formatting, 50 tests, and the production web build pass using the installed Node 24 toolchain. The native `cargo check`, 13 standard Rust tests, and Clippy with `-D warnings` pass. Explicit local smoke tests also verified a disposable TCP listener and portable PTY output.

The prerequisite check initially reported missing libraries without installing anything. After the owner installed the reported packages, the check passed and `npm start -- --no-watch` launched the native app. Exact reproduction commands are in README.md.

System dependencies follow the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/). The standard Tauri platform override file selects Linux settings automatically.
