# Toolify Architecture Overview

## High-Level Flow
1. The user hits the global shortcut captured via `uiohook-napi`.
2. The main process starts recording and media helpers pause every audible player.
3. Audio frames flow from the Swift menu helper into Electron, then `openai.ts` or `local-whisper.ts` handles transcription depending on the selected mode.
4. Transcripts (and optional translations) return to the renderer through IPC, get copied to the clipboard, and are stored in history.
5. When recording stops, media resumes and a notification confirms completion.

## Components
- **Recorder Service**: Lives in `src/main/index.ts`, managing the recording lifecycle, error handling, and queueing.
- **Transcription Providers**:
  - `openai.ts`: Wraps Whisper API calls, translation parameters, and token/credit tracking.
  - `local-whisper.ts`: Builds `whisper.cpp` commands, manages CDN downloads, and reports download progress.
- **Media Controller (`utils/system.ts`)**: Injects AppleScript/JavaScript to pause and resume Safari, Chrome, Spotify, Music, QuickTime, and PiP videos.
- **Renderer UI**: Modular components under `src/renderer/src/components` (Settings, Local Model Cache, HistoryList) read/write state exclusively through IPC rather than a standalone client store.
- **Shared Store**: `electron-store` persists settings plus history. Schemas live in `src/shared/types/settings.types.ts`, and auto-save routes through `window.api.saveSettings`.

## Data & State Management
- Type-safe IPC channels exposed on `window.api` ensure the renderer only requests the fields it needs.
- Settings include the API key, translation language, shortcut, local/remote model preference, and the "Pause Media" toggle.
- The Local Model Cache tracks an array of `LocalModelInfo` entries with download state, file size, and timestamps.

## Security & Permissions
- macOS Accessibility permission is required for media pausing; Surface warnings when missing.
- OpenAI keys live in the Keychain; `electron-store` keeps only user preferences and history metadata.
- Local model binaries stay under the user’s Application Support folder so they can be deleted from the UI when needed.

## Extension Points
- Adding new model types only requires updating `MODEL_TYPES`, `MODEL_URLS`, and `MODEL_LABELS`; the UI renders them automatically.
- Future GPU-accelerated or multi-channel recording could pass extra flags (e.g., `--gpu`) through `local-whisper.ts`.
- Media control can evolve toward smarter targeting, such as focusing on audible tabs or driving a browser extension/WebSocket bridge.
