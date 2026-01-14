# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.13] - 2026-01-13

### Added

- API key encryption using Electron's `safeStorage` module for secure storage in system keychain
- Vitest test configuration with watch mode, UI, and CI mode commands
- Metal GPU acceleration support for Apple Silicon local models
- App identity improvements with `CFBundleDisplayName` and `CFBundleName` in Info.plist
- Dynamic section label display in settings sidebar
- Version display in settings footer
- Comprehensive documentation updates including IPC communication patterns and architectural notes

### Changed

- Recording overlay window level changed from `screen-saver` to `floating` to prevent focus stealing
- Overlay now uses `showInactive()` instead of `show()` to avoid stealing focus
- App automatically hides when recording starts to prevent focus stealing on macOS
- Dock icon set for About panel even when dock is hidden
- DictationSettings component translated from Turkish to English
- Improved settings UI with better spacing and typography

### Fixed

- Main window now has `focusable: false` to prevent focus stealing
- Fixed duplicate `showRecordingOverlay` parameter in `saveSettings` calls
- Focus management during recording to prevent overlay from stealing window focus

### Security

- API keys now encrypted with `safeStorage` before persistence
- Automatic migration path from plain text to encrypted storage
- Corrupted encrypted keys are automatically cleared
- Fallback to plain text on unsupported platforms with warning

### Developer

- Added `.claude` directory to `.gitignore`
- Updated CLAUDE.md with comprehensive development documentation
- Homebrew tap reference updated to `mehmetsagir/toolify`

## [0.0.12] - Previous Release
