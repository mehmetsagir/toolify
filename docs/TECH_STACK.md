# Toolify Tech Stack

## Overview

Toolify blends an Electron desktop shell with a Swift menu-bar helper. The UI layer is built with React 19 and Tailwind CSS, while the Electron main process relies on Node.js 20 APIs. Local transcription uses `whisper.cpp` binaries, and remote transcription goes through the OpenAI SDK (v6).

## Desktop Layers

- **Electron Main (`src/main`)**: Orchestrates recording, local model downloads, and OpenAI/Whisper commands. Preferences are stored via `electron-store`, global shortcuts are captured with `uiohook-napi`, and `system.ts` pauses media through AppleScript injections.
- **Renderer (`src/renderer`)**: React components (`App.tsx`, `components/Settings`, history lists) render settings, the Local Model Cache, and status views. Tailwind v4 combined with `clsx` supplies styling, and the renderer talks to the main process via the `window.api` IPC bridge.
- **Swift Helper (`ToolifySwift/Toolify`)**: Provides the menu-bar icon and native permission workflows bundled alongside Electron.

## Supporting Modules

- **`src/shared`**: Houses IPC contracts and shared TypeScript definitions such as `LocalModelInfo` and the `SettingsSchema` so both processes stay aligned.
- **`scripts/copy-whisper-executables.js`**: Pre-build hook that places `whisper.cpp` binaries in the unpacked area for distribution.

## Packaging & Distribution

- `electron-vite` bundles both renderer and main code.
- `electron-builder` produces DMG/ZIP artifacts; `prebuild:mac` and `prebuild:dmg` stage Whisper executables inside `app.asar.unpacked`.
- The Homebrew tap is versioned under `homebrew/` for easy installs.

## External Services & APIs

- **OpenAI Whisper API** for cloud transcription and translation.
- **HuggingFace CDN** as the download source for GGML local models.
- **macOS System Events / AppleScript** to pause or resume Safari, Chrome, Arc, Spotify, Music, QuickTime, and YouTube PiP playback.

## Storage & Configuration

- User preferences live in `~/Library/Application Support/Toolify/config.json` via `electron-store`.
- Local models reside under the same directory in `models/ggml-*.bin` files and are never bundled.
- Transcript history and translation results are persisted alongside the settings store.

## Quality & Observability

- Type safety is enforced with `tsconfig.node.json` and `tsconfig.web.json`.
- ESLint (flat config) and Prettier power linting and formatting.
- Manual QA during `npm run dev` should cover recording, model management, media pausing, shortcut handling, and clipboard delivery.
