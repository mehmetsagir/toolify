# Toolify Product Requirements Document (PRD)

## Background

Toolify helps macOS users capture speech quickly and turn it into text through Whisper-based engines. The app must let people switch between OpenAI’s managed Whisper API and local Whisper models without shipping massive binaries, while automatically pausing noisy media so transcripts stay clean.

## Problem Statement

Creators, streamers, and note-takers need one shortcut to start recording, but permissions, model downloads, and mixed playback often break the flow. Toolify should orchestrate models that are downloaded post-installation, keep bundle size small, and silence competing media so users can focus on their voice input.

## Goals & Metrics

- Onboarding (brew install + API key) finishes in under 5 minutes.
- End-to-end latency from stop-recording to transcript is under 15 seconds for cloud or base local models.
- Local model downloads succeed ≥95%, with actionable errors otherwise.
- The "Pause Media" feature earns ≥4/5 satisfaction from active users.

## Target Users

- Content creators who need fast captions.
- Professionals capturing meeting notes without cloud-only constraints.
- Privacy-sensitive teams that prefer on-device transcription.

## User Scenarios

1. Press the global shortcut, the system pauses media, recording runs, and playback resumes once transcription completes.
2. Switch between OpenAI and Local Whisper inside Settings, downloading only the desired GGML model; API key entry becomes optional when fully local.
3. After each recording, a transcript (and optional translation) is copied to the clipboard and listed in history for future reference.

## Functional Requirements

- macOS menu-bar experience plus an Electron window for Settings/history.
- Settings auto-save with no explicit Save button.
- Local Model Cache UI that fetches models from HuggingFace, shows size/status, and supports re-download if needed.
- System-wide media control (Safari, Chrome, Arc, Spotify, Music, QuickTime) to pause/resume during the recording lifecycle.
- Notifications and clipboard updates when transcription finishes.

## Constraints & Risks

- Without Accessibility permission, media pausing fails; users must see a clear warning.
- Whisper models reach 2.9 GB, so disk-space checks and alerts are necessary.
- OpenAI requests may hit rate limits; handle and surface API errors promptly.

## Open Questions

- Should Toolify auto-select the best local model based on hardware or language?
- Is streaming transcription required for long-running sessions in the future?
