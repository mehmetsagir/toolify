# Repository Guidelines

## Project Structure & Module Organization
Toolify combines Electron, React, and Swift. `src/main` hosts the Electron main process, OpenAI and Local Whisper providers, system-permission helpers, and media-control scripts. `src/renderer` contains the Tailwind-powered UI, Settings logic, Local Model Cache, and history panels. Shared IPC types and schemas live in `src/shared`. The menu-bar helper and native prompts sit inside `ToolifySwift/Toolify` (Xcode project). Distribution assets belong to `resources/`, while build helpers and Whisper copy scripts live in `scripts/`. There is no dedicated test folder; co-locate mocks and fixtures beside the feature components.

## Build, Test, and Development Commands
- `npm run dev`: Hot reload for both main and renderer.
- `npm run start`: Preview a signed-like build to test production conditions.
- `npm run build`: Type-checks, then bundles multi-platform artifacts.
- `npm run build:mac` / `npm run build:dmg`: Produce shipping-ready `.app` or DMG (runs `scripts/copy-whisper-executables.js`).
- `npm run typecheck`, `npm run lint`, `npm run format`: Enforce TS, ESLint (flat config), and Prettier before opening a PR.

## Coding Style & Naming Conventions
The project runs TypeScript in strict mode with Prettier enforcing two-space indentation. React components use PascalCase; hooks/utilities stick to camelCase (e.g., `usePauseMedia.ts`). IPC channel constants and shared interfaces must stay in sync with `src/shared/types`. Tailwind class lists should be composed with `clsx` + `tailwind-merge`, and shared enums (such as in `src/shared/types/settings.types.ts`) should replace magic numbers.

## Testing Guidelines
Because there are no automated suites yet, `npm run dev` manual QA plus `lint`/`typecheck` are mandatory. Verify recording flows end-to-end: (1) OpenAI ↔ Local Whisper switching, (2) Local Model Cache download/re-download actions, (3) "Pause Media While Recording" stopping and resuming Safari/Chrome/Spotify, and (4) clipboard + notification handling. Document behavior whenever macOS Script Editor or Accessibility permissions are missing.

## Commit & Pull Request Guidelines
Git history follows Conventional Commits (e.g., `feat(ui): redesign local model management`), so keep that pattern. PR descriptions should call out scope, affected screens, local test commands, and include screenshots or short clips when UI changes exist. Never bundle Whisper models inside the build; instruct users to fetch them on demand and keep large binaries ignored.

## Local Model & Media Control Notes
Local models are cached under `~/Library/Application Support/Toolify`; keep them opt-in downloads rather than bundling. Starting a recording pauses media everywhere, so note in release docs that Swift + AppleScript calls require macOS Accessibility permission. If you redesign the Local Model area, prefer collapsible sections and only list models that are already downloaded to avoid clutter.
