# Project instructions

## Context and communication

- The project owner is Aman Khan, a mid-level full-stack engineer in Karachi.
- Use direct, practical, simple English. Explain the purpose of a change and relevant tradeoffs.
- Prefer concise, step-by-step explanations. Report what changed, what was verified, and any concrete limitations.
- Respect established architectural decisions in PLAN.md; keep TASKS.md current as milestones are completed.

## Project scope

- Adapt the existing Nexus Console codebase rather than rebuilding from scratch.
- Target Ubuntu and Pop!_OS first, with the core modules listed in README.md.
- Keep the application local. No accounts, telemetry, or cloud backend are planned.
- Preserve upstream MIT license and copyright notices when importing code.
- Use npm, matching upstream CI and package-lock.json; avoid lockfile churn from switching package managers.
- Use AGENTS.md and PLAN.md for Linux adaptation decisions. Upstream CLAUDE.md and PRODUCT.md describe the existing macOS app; retain their applicable code conventions without treating macOS-only behavior as a Linux requirement.

## Architecture and code

- Prefer TypeScript for frontend code and Rust for Tauri backend operations.
- Keep React, Tauri 2, and Tailwind; reuse upstream components where practical.
- Use reusable, readable modules and feature-based organization where useful. Avoid speculative abstractions and unnecessary dependencies.
- Keep systemd service access and APT package access behind separate typed backend adapters.
- Keep platform-specific implementations separate; retain macOS behavior behind platform selection.
- Treat Tauri commands as the boundary between the UI and operating-system operations. Validate inputs in Rust and keep frontend types aligned with backend responses.
- Run blocking subprocess and filesystem work off the UI thread. Use bounded output, caching, and polling appropriate to the visible workflow.
- Serialize package mutations and handle external package-manager locks explicitly.

## Permissions and destructive operations

- Run the desktop application as the normal user.
- Authenticate required administrator operations through polkit and a root-owned helper installed in a protected location.
- The helper must independently validate allowed operations and arguments. Never accept arbitrary elevated commands, shell snippets, or executable paths from the UI.
- Invoke fixed executables with argument arrays rather than interpolated shell commands. Reject option-like or invalid identifiers.
- Never capture or store administrator passwords in the application.
- Show the proposed package transaction before applying it. Enforce required destructive confirmations at the backend boundary.
- Do not run installs, upgrades, removals, service mutations, or process termination on the developer's host merely to test the app without explicit authorization. Use fixtures and disposable environments for those checks.
- Keep discovery read-only; do not silently install tools, change repositories, or modify service enablement.

## UI and lifecycle

- Build an accessible, responsive developer utility with restrained styling and minimal animation.
- Pair status colors with text or icons. Distinguish unavailable information from empty results.
- Show useful progress and errors for long operations without blocking navigation.
- Close-to-tray is opt-in. Preserve a usable window/quit path when a desktop lacks tray support.
- Do not stop systemd services when the application exits. Clean up application-owned PTY sessions on actual quit.

## Validation and documentation

- Verify setup commands against the imported code and Linux environment before publishing them as working instructions.
- Run appropriate TypeScript checks, frontend tests, Rust tests, and Clippy once the codebase is present; document actual outcomes.
- Focus tests on parsing, backend validation, permissions, transaction behavior, and lifecycle failures rather than mirroring implementation details.
- Validate package mutations and privileged operations in a disposable environment.
- Do not add tests for documentation-only changes; check links, scope consistency, and checklist accuracy instead.
- Prefer maintainability, production behavior, and developer experience over clever shortcuts.
