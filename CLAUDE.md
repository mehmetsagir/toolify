# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Toolify** is an AI-powered voice transcription and translation macOS desktop application. It combines Electron, React, and a native Swift menu-bar helper to provide global shortcut recording with automatic transcription via OpenAI Whisper API or local whisper.cpp models.

**Tech Stack**: Electron 38.1.2, React 19.1.1, TypeScript 5.9.2, Tailwind CSS 4.1.17, Vite 7.1.6

**Platform**: macOS-only (requires Accessibility permissions for media control)

## Essential Commands

### Development

```bash
npm run dev                    # Hot reload for both main and renderer processes
npm run start                  # Preview production build
npm run typecheck              # Type-check all TypeScript (node + web)
npm run typecheck:node         # Type-check main process only
npm run typecheck:web          # Type-check renderer only
npm run lint                   # Run ESLint
npm run format                 # Format code with Prettier
npm test                       # Run vitest in watch mode
npm run test:ui                # Run vitest with UI
npm run test:run               # Run vitest once (CI mode)
```

### Building

```bash
npm run build                  # Full type-check + bundle
npm run build:skip-check       # Bundle without type-checking
npm run build:mac              # Build macOS .app and .zip
npm run build:dmg              # Build DMG installer (fast, skips typecheck)
npm run build:mac:publish      # Build and publish to GitHub releases
```

### Pre-build Hooks

- `prebuild:mac` / `prebuild:dmg` execute `scripts/copy-whisper-executables.js` to copy whisper.cpp binaries

## Architecture

### High-Level Structure

```
src/
├── main/           # Electron main process (Node.js context)
├── preload/        # Context bridge for type-safe IPC
├── renderer/       # React UI (web context)
└── shared/         # Shared TypeScript types
ToolifySwift/       # Native Swift menu-bar helper
```

### Key Architectural Patterns

**Type-Safe IPC Bridge**: All renderer-to-main communication flows through `window.api` exposed via `contextBridge` in `src/preload/index.ts`. The renderer never directly accesses Node.js APIs. Bidirectional patterns: `invoke()` for requests, `on()` for events.

**Dual Transcription Providers**:

- Remote: OpenAI Whisper API (`src/main/openai.ts`)
- Local: whisper.cpp binaries (`src/main/local-whisper.ts`)
- User toggles via `useLocalModel` setting
- Models downloaded on-demand from HuggingFace CDN (never bundled)

**Recording Lifecycle**:

1. Global shortcut triggers (via `uiohook-napi`)
2. Main process pauses all media via AppleScript injection
3. Audio recorded through Swift helper
4. On stop: media resumes, transcription starts
5. Result copied to clipboard, notification sent, history updated

**Settings Auto-Save**: No explicit "Save" button. Changes propagate immediately via `window.api.saveSettings()` and persist to `~/Library/Application Support/Toolify/config.json`.

**API Key Security**: API keys are encrypted using Electron's `safeStorage` module before being persisted. Keys are stored securely in the system keychain and decrypted on-demand.

**Local Model Management**:

- Models stored in `~/Library/Application Support/Toolify/models/`
- Download progress tracked via IPC events
- UI shows size, status, and supports re-download/deletion
- Model types: `base`, `small`, `medium`, `large-v3`

**Media Control System** (`src/main/utils/system.ts`):

- Pauses Safari, Chrome, Arc, Spotify, Music, QuickTime, YouTube PiP
- Uses AppleScript/JavaScript injection via osascript
- Requires macOS Accessibility permission

**Multi-Window Architecture**: Managed via `src/main/utils/windows.ts`

- Main window (hidden by default)
- Settings window (modal, resizable)
- Recording overlay (compact/large styles)

### Component Locations

**Main Process** (`src/main/`):

- `index.ts` (44KB) - Main entry, recording lifecycle, IPC handlers
- `openai.ts` - OpenAI Whisper API wrapper
- `local-whisper.ts` (18KB) - Local whisper.cpp model management
- `auto-updater.ts` - GitHub-based auto-update system
- `utils/system.ts` - Media pausing, notifications, sound
- `utils/windows.ts` - Window management
- `utils/settings.ts` - Settings persistence via electron-store
- `utils/history.ts` - Transcript history CRUD
- `utils/overlay-template.ts` (37KB) - Recording overlay HTML generation

**Renderer** (`src/renderer/`):

- `App.tsx` (26KB) - Main app component, settings state management
- `components/Settings.tsx` (24KB) - Main settings container
- `components/History.tsx` - Transcript history viewer
- `components/Status.tsx` - Recording status display
- `components/settings/` - Modular settings panels (General, Dictation, Audio, History, UpdateBanner)

**Shared Types** (`src/shared/types/`):

- `settings.types.ts` - Settings interface
- `local-models.types.ts` - LocalModelType, LocalModelInfo
- `history.types.ts` - HistoryItem, HistorySettings
- `update.types.ts` - UpdateInfo, progress types

## Critical Conventions

1. **Never bundle Whisper models** - Always downloaded post-install to keep bundle small (critical for distribution)
2. **Settings auto-save** - No save button, changes are immediate via `window.api.saveSettings()`
3. **Type-safe IPC** - Always keep `src/shared/types` in sync with preload layer (`src/preload/index.ts`)
4. **macOS-only** - Uses AppleScript/osascript for media control
5. **Accessibility permission critical** - Media pausing fails without it
6. **Context isolation enforced** - Renderer cannot access Node directly (security requirement)
7. **Swift helper bundled** - ToolifySwift project built alongside Electron
8. **Global shortcut cooldown** - 1-second cooldown between recordings, 1.5-second penalty for rapid presses
9. **Whisper executables path** - Different in dev vs production (handled in `local-whisper.ts`)
10. **Metal GPU acceleration** - `ggml-metal.metal` library bundled for local model performance on Apple Silicon
11. **API key encryption** - All API keys encrypted with `safeStorage` before persistence

## Coding Standards

- **TypeScript**: Strict mode enforced
- **Formatting**: Prettier with specific config (singleQuote: true, semi: false, printWidth: 100, trailingComma: none)
- **React**: Components use PascalCase; hooks/utilities use camelCase
- **Tailwind**: Class lists composed with `clsx` + `tailwind-merge`
- **Enums**: Use shared enums from `src/shared/types/settings.types.ts` instead of magic numbers
- **Path Aliases**: Use `@renderer` or `@` for renderer imports (configured in vitest.config.ts)

## Git Workflow

- Follow Conventional Commits: `feat(scope): description`
- Examples: `feat(ui): redesign local model management`, `chore: change settings saving type`

## Testing

**Vitest configured** but minimal test coverage exists. Test setup at `src/renderer/src/test/setup.ts` with jsdom environment for React component testing.

**Manual QA required**:

1. Test OpenAI ↔ Local Whisper switching
2. Verify Local Model download/re-download actions
3. Confirm "Pause Media While Recording" stops/resumes Safari/Chrome/Spotify
4. Validate clipboard + notification handling
5. Test Metal GPU acceleration for local models (macOS)
6. Verify API key encryption/decryption flow
7. Always run `npm run typecheck` and `npm run lint` before commits

## Distribution

- GitHub releases as update source (auto-updater via `electron-updater`)
- Homebrew tap: `mehmetsagir/toolify` formula
- DMG and ZIP artifacts for macOS arm64/x64
- Not code-signed (user must bypass Gatekeeper with right-click > Open)
- Version display and GitHub link shown in settings UI

## Important Development Notes

### Electron Builder Configuration

The `electron-builder.yml` file contains critical exclusion patterns to keep bundle size small:

- Excludes ALL model files (`*.bin`, `*.ggml`, etc.) - models downloaded post-install only
- Excludes whisper-node dev dependencies - only dist files and executables copied via prebuild script
- Unpacks `resources/**`, `build/whisper-node-dist/**`, and `build/whisper-executables/**` from ASAR

### Recent Architectural Changes

- **Dock Icon Feature Removed** (commit 3de81e6): The `showDockIcon` setting was removed from the codebase. Don't re-implement unless explicitly requested.
- **API Key Security Enhancement** (commit c69d49d): API keys now encrypted with Electron `safeStorage` instead of plain text storage
- **Metal GPU Acceleration** (commit b85cb65): Added `ggml-metal.metal` library for Apple Silicon GPU acceleration on local models
- **Tailwind Design Tokens** (commit 484660d): Extended design system with custom tokens - follow existing patterns in `tailwind.config.js`

### IPC Communication Pattern

All renderer → main communication follows this pattern:

1. Define types in `src/shared/types/`
2. Expose methods in `src/preload/index.ts` via `contextBridge`
3. Implement handlers in `src/main/index.ts` via `ipcMain.on()` or `ipcMain.handle()`
4. Call from renderer via `window.api.[method]()`

Never bypass this pattern or directly access Node.js APIs from renderer.
