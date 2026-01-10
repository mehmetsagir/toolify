# Deployment Guide

Complete guide for building, releasing, and maintaining Toolify.

## Table of Contents

- [Build Process Overview](#build-process-overview)
- [Creating Releases](#creating-releases)
- [Homebrew Tap Management](#homebrew-tap-management)
- [GitHub Releases Workflow](#github-releases-workflow)
- [Code Signing Considerations](#code-signing-considerations)
- [Auto-Update Mechanism](#auto-update-mechanism)
- [Versioning Strategy](#versioning-strategy)
- [DMG vs ZIP Distribution](#dmg-vs-zip-distribution)
- [Testing Production Builds](#testing-production-builds)
- [Rollback Procedures](#rollback-procedures)

## Build Process Overview

Toolify uses Electron Builder to create distributable packages for macOS. The build process involves:

### Build Architecture

```
Source Code → Electron-Vite → JavaScript → Electron Builder → Distribution Files
```

### Build Steps

1. **Pre-build**: Copy Whisper executables (via `scripts/copy-whisper-executables.js`)
2. **Compile**: Electron-Vite bundles the application
3. **Package**: Electron Builder creates distributables (DMG/ZIP)
4. **Metadata**: Generate `latest-mac.yml` for auto-updates

### Build Scripts

| Script                      | Purpose                               |
| --------------------------- | ------------------------------------- |
| `npm run build`             | Type-check + compile application      |
| `npm run build:skip-check`  | Compile without type checking         |
| `npm run build:mac`         | Build macOS packages (no publish)     |
| `npm run build:mac:publish` | Build + publish to GitHub releases    |
| `npm run build:dmg`         | Build DMG only (fast)                 |
| `npm run build:unpack`      | Build without packaging (for testing) |

### Build Outputs

**Location**: `/Users/mehmetsagir/Developer/macos-apps/toolify/dist/`

**Artifacts Generated**:

- `Toolify-{version}-arm64.dmg` - ARM64 disk image (Apple Silicon)
- `Toolify-{version}-x64.dmg` - x64 disk image (Intel)
- `Toolify-{version}-arm64.zip` - ARM64 archive (for auto-updates)
- `Toolify-{version}-x64.zip` - x64 archive (for auto-updates)
- `latest-mac.yml` - Update metadata for electron-updater

### Build Configuration

**File**: `electron-builder.yml`

**Key Settings**:

- **App ID**: `com.toolify.app`
- **Publish Provider**: GitHub
- **Code Signing**: Disabled (see [Code Signing](#code-signing-considerations))
- **Architectures**: ARM64 and x64
- **Formats**: DMG and ZIP

## Creating Releases

### Prerequisites

1. **Git Status**: Clean working directory

   ```bash
   git status
   # Should show: "nothing to commit, working tree clean"
   ```

2. **Current Branch**: `master` or `main`

   ```bash
   git branch
   # Should show: * master
   ```

3. **GitHub Token**: Available in environment (for automated builds)

### Release Process

#### Option 1: Automated Release (Recommended)

Uses GitHub Actions to build and publish automatically.

**Steps**:

1. **Bump Version**

   ```bash
   # Interactive version bump
   npm version patch  # or minor, or major

   # Or use the version script
   ./scripts/version.sh patch
   ```

2. **Commit Version Change**

   ```bash
   git add package.json package-lock.json
   git commit -m "chore: bump version to x.x.x"
   ```

3. **Create and Push Tag**

   ```bash
   git tag -a vx.x.x -m "Release x.x.x"
   git push origin master
   git push origin vx.x.x
   ```

4. **Monitor GitHub Actions**
   - Navigate to: https://github.com/mehmetsagir/toolify/actions
   - Wait for "Build and Release" workflow to complete
   - Release will be automatically created with artifacts

5. **Update Homebrew Tap** (see [Homebrew Tap Management](#homebrew-tap-management))

#### Option 2: Manual Release

Build locally and upload to GitHub.

**Steps**:

1. **Bump Version**

   ```bash
   npm version patch
   ```

2. **Build Packages**

   ```bash
   npm run build:mac:publish
   ```

3. **Create GitHub Release**
   ```bash
   gh release create vx.x.x \
     dist/*.dmg \
     dist/*.zip \
     dist/latest-mac.yml \
     --title "Release x.x.x" \
     --notes "See CHANGELOG.md for details"
   ```

### Version Bumping Strategy

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., `0.0.12` → `1.0.0`)
  - Incompatible API changes
  - Removed features
  - Major redesigns

- **MINOR**: New features (e.g., `0.0.12` → `0.1.0`)
  - Backward-compatible additions
  - New functionality
  - Feature enhancements

- **PATCH**: Bug fixes (e.g., `0.0.12` → `0.0.13`)
  - Bug fixes
  - Small improvements
  - Documentation updates

**Current Version**: `0.0.12` (pre-release phase)

## Homebrew Tap Management

Homebrew users install Toolify via the custom tap repository.

### Tap Repository

**URL**: https://github.com/mehmetsagir/homebrew-toolify
**Local Location**: `/Users/mehmetsagir/Developer/macos-apps/toolify/homebrew/`

### Cask File

**File**: `homebrew/toolify.rb`

**Contents**:

```ruby
cask "toolify" do
  version "0.0.12"
  sha256 "6b6a90260ffab443200f88bffd01910e96a260857bbc86dde58932831e81516d"

  url "https://github.com/mehmetsagir/toolify/releases/download/v#{version}/Toolify-#{version}-arm64.dmg"
  name "Toolify"
  desc "AI-powered voice transcription and translation tool"
  homepage "https://github.com/mehmetsagir/toolify"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true

  app "Toolify.app"

  zap trash: [
    "~/Library/Application Support/Toolify",
    "~/Library/Caches/com.toolify.app",
    "~/Library/Caches/com.toolify.app.ShipIt",
    "~/Library/Logs/Toolify",
    "~/Library/Preferences/com.toolify.app.plist",
    "~/Library/Saved Application State/com.toolify.app.savedState",
  ]
end
```

### Updating Homebrew Tap

After each release, update the cask file:

**Steps**:

1. **Calculate SHA256**

   ```bash
   # Download the DMG first
   curl -L -o Toolify-0.0.12-arm64.dmg \
     "https://github.com/mehmetsagir/toolify/releases/download/v0.0.12/Toolify-0.0.12-arm64.dmg"

   # Calculate SHA256
   shasum -a 256 Toolify-0.0.12-arm64.dmg
   # Output: 6b6a90260ffab443200f88bffd01910e96a260857bbc86dde58932831e81516d
   ```

2. **Update Cask File**

   ```bash
   # Edit homebrew/toolify.rb
   # Update version and sha256 values
   ```

3. **Commit and Push to Tap**

   ```bash
   cd /path/to/homebrew-toolify
   git add toolify.rb
   git commit -m "toolify: update to version x.x.x"
   git push origin master
   ```

4. **Verify Update**
   ```bash
   # For users
   brew upgrade --cask toolify
   ```

### Homebrew Tap Commands

```bash
# Add tap
brew tap mehmetsagir/toolify

# Install
brew install --cask toolify

# Upgrade
brew upgrade --cask toolify

# Uninstall
brew uninstall --cask toolify

# Reinstall
brew reinstall --cask toolify
```

## GitHub Releases Workflow

### Automated Release Workflow

**File**: `.github/workflows/release.yml`

**Trigger**: Git tags matching `v*` pattern (e.g., `v0.0.12`)

**Workflow Steps**:

1. **Checkout Code**: Pull repository
2. **Setup Node.js**: Install Node.js 20
3. **Install Dependencies**: `npm ci`
4. **Build App**: `npm run build:mac:publish`
5. **Create Release**: Upload artifacts to GitHub

**Permissions**:

- `contents: write` (required for creating releases)

### Release Artifacts

Each release includes:

1. **DMG Files** (for new users)
   - `Toolify-{version}-arm64.dmg`
   - `Toolify-{version}-x64.dmg`

2. **ZIP Files** (for auto-updates)
   - `Toolify-{version}-arm64.zip`
   - `Toolify-{version}-x64.zip`

3. **Update Metadata**
   - `latest-mac.yml` (used by electron-updater)

### Manual Release Creation

If GitHub Actions fails, create manually:

```bash
# Build locally
npm run build:mac

# Create release via GitHub CLI
gh release create vx.x.x \
  dist/*.dmg \
  dist/*.zip \
  dist/latest-mac.yml \
  --title "Release x.x.x" \
  --notes "Release notes here"

# Or via GitHub web interface
# 1. Go to https://github.com/mehmetsagir/toolify/releases
# 2. Click "Draft a new release"
# 3. Tag: vx.x.x
# 4. Upload files from dist/
# 5. Publish release
```

## Code Signing Considerations

### Current Status: Unsigned

Toolify is **NOT code signed**. This is intentional for the current development phase.

**Configuration** (`electron-builder.yml`):

```yaml
mac:
  notarize: false
  gatekeeperAssess: false
  hardenedRuntime: false
```

### Impact

**For Users**:

- macOS will show a security warning on first launch
- Users must bypass Gatekeeper (see README for instructions)
- No automatic notarization

**For Distribution**:

- Cannot distribute via Mac App Store
- Cannot use certain macOS APIs without triggering warnings
- Auto-updates require special handling (see [Auto-Update Mechanism](#auto-update-mechanism))

### Why Unsigned?

1. **Cost**: Apple Developer Certificate costs $99/year
2. **Complexity**: Notarization process requires additional setup
3. **Development Phase**: Project is in early development (0.0.x versions)
4. **Open Source**: Community project without commercial backing

### Future Signing (If Needed)

**Requirements**:

- Apple Developer Account ($99/year)
- Developer Certificate from Apple
- Developer ID Application certificate
- Notarization via Xcode or `notarytool`

**Implementation**:

```yaml
mac:
  identity: 'Developer ID Application: Your Name (TEAM_ID)'
  notarize: true
  gatekeeperAssess: false
  hardenedRuntime: true
```

**Process**:

1. Obtain Developer Certificate
2. Configure electron-builder with certificate identity
3. Enable notarization
4. Submit to Apple Notary Service
5. Staple notarization ticket to app

## Auto-Update Mechanism

Toolify uses `electron-updater` to provide automatic updates.

### Architecture

**Component**: `src/main/auto-updater.ts`

**Update Source**: GitHub Releases

```typescript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'mehmetsagir',
  repo: 'toolify'
})
```

### Update Flow

```
App Launch → Check for Updates → Update Available?
  → NO: Notify "You're on latest"
  → YES: Notify user → Download Update → Install on Quit
```

### Auto-Update Configuration

**Settings**:

- `autoDownload`: `false` (user must approve download)
- `autoInstallOnAppQuit`: `true` (install when app quits)
- `allowDowngrade`: `false` (prevent downgrading)
- `allowPrerelease`: `false` (only stable releases)

### Special Handling for Unsigned Apps

**Challenge**: Unsigned apps cannot use macOS auto-update APIs directly

**Solution**:

1. Download ZIP file to user cache directory
2. Use `app.relaunch()` to restart after update
3. Fallback mechanism for unsigned app limitations

**Code** (`auto-updater.ts`):

```typescript
// For macOS unsigned apps
app.relaunch({ args: process.argv.slice(1).concat(['--updated']) })
autoUpdater.quitAndInstall(false, true)
```

### Update Metadata File

**File**: `latest-mac.yml` (generated during build)

**Location**: GitHub Releases

**Contents**:

```yaml
version: 0.0.12
files:
  - url: Toolify-0.0.12-arm64.zip
    sha512: [hash]
    size: 12345678
  - url: Toolify-0.0.12-x64.zip
    sha512: [hash]
    size: 12345678
path: Toolify-0.0.12-arm64.zip
sha512: [hash]
releaseDate: 2025-01-10T00:00:00.000Z
```

### User Update Experience

1. **Check Available**: Settings → "Check for Updates" button
2. **Notification**: System notification shows new version
3. **Download**: User clicks "Download Update" in Settings
4. **Progress**: Download progress shown in UI
5. **Install**: User clicks "Quit and Install"
6. **Restart**: App closes, updates, and relaunches

## Versioning Strategy

### Current Phase: Pre-Release (0.0.x)

**Characteristics**:

- Rapid development
- Breaking changes may occur
- No API stability guarantees
- Active feature development

**Version Bumps**:

- Use `patch` for most changes
- Use `minor` for significant new features
- Reserve `major` for 1.0 release

### Release Cadence

**When to Release**:

- ✅ New feature completed and tested
- ✅ Bug fixes for critical issues
- ✅ Security updates
- ❌ Incomplete features
- ❌ Untested code

**Testing Before Release**:

1. Run locally: `npm run build:mac`
2. Test built app: Open `dist/Toolify.app`
3. Verify auto-update: Test update flow
4. Check DMG installation: Test on clean system

### Changelog Maintenance

**Keep Users Informed**:

- Document breaking changes
- List new features
- Note bug fixes
- Include migration guides if needed

**Format**:

```markdown
## [0.0.12] - 2025-01-10

### Added

- New feature X
- New feature Y

### Fixed

- Bug fix A
- Bug fix B

### Changed

- Updated dependency Z

### Breaking Changes

- None
```

## DMG vs ZIP Distribution

Toolify distributes both DMG and ZIP formats for different purposes.

### DMG (Disk Image)

**Purpose**: New user installations

**File**: `Toolify-{version}-{arch}.dmg`

**User Experience**:

- Double-click to mount
- Drag app to Applications
- Eject DMG
- Launch app from Applications

**Advantages**:

- Familiar macOS installation method
- Professional presentation
- Can include license agreement
- Shows app icon

**Use Cases**:

- First-time users
- Manual downloads from GitHub
- Homebrew cask installations

**Build Target**:

```yaml
dmg:
  artifactName: ${name}-${version}-${arch}.${ext}
  title: ${productName} ${version}
  contents:
    - x: 410
      y: 150
      type: link
      path: /Applications
    - x: 130
      y: 150
      type: file
```

### ZIP Archive

**Purpose**: Auto-updates only

**File**: `Toolify-{version}-{arch}.zip`

**User Experience**:

- Automatically downloaded by electron-updater
- Extracted in background
- Replaces existing app
- User never interacts with ZIP directly

**Advantages**:

- Smaller file size
- Faster download
- Better for automated updates
- Can replace running app

**Use Cases**:

- Auto-updates via electron-updater
- Update downloads in Settings

**Not Recommended For**:

- Manual distribution (use DMG instead)

### Architecture-Specific Builds

**ARM64** (Apple Silicon):

- M1, M2, M3, M4 chips
- File: `Toolify-{version}-arm64.dmg/zip`

**x64** (Intel):

- Older Intel Macs
- File: `Toolify-{version}-x64.dmg/zip`

**Universal Binary** (Future):

- Combine ARM64 + x64
- Single download for all Macs
- File: `Toolify-{version}-universal.dmg`

### File Size Comparison

Typical sizes (version 0.0.12):

- DMG (ARM64): ~120 MB
- ZIP (ARM64): ~115 MB
- DMG (x64): ~125 MB
- ZIP (x64): ~120 MB

## Testing Production Builds

### Pre-Release Checklist

**Before Creating Release**:

- [ ] All tests pass: `npm test` (if available)
- [ ] Type check passes: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build:mac`
- [ ] Manual testing completed
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG updated (if maintained)
- [ ] Git history clean

### Local Build Testing

**1. Build Application**

```bash
npm run build:mac
```

**2. Verify Artifacts**

```bash
ls -lh dist/
# Should see:
# Toolify-0.0.12-arm64.dmg
# Toolify-0.0.12-x64.dmg
# Toolify-0.0.12-arm64.zip
# Toolify-0.0.12-x64.zip
# latest-mac.yml
```

**3. Test DMG Installation**

```bash
# Open DMG
open dist/Toolify-0.0.12-arm64.dmg

# Drag to Applications manually
# Launch from Applications
# Verify app opens and functions correctly
```

**4. Test App Functionality**

- Launch app
- Check settings/preferences work
- Test core functionality (recording, transcription)
- Verify keyboard shortcuts work
- Check auto-update mechanism
- Test notifications

**5. Test Auto-Update**

```bash
# Simulate update check
# In Settings, click "Check for Updates"
# Verify it communicates with GitHub
# Should show "You're on the latest version" or offer update
```

**6. Test Gatekeeper Warning**

```bash
# On fresh system, verify Gatekeeper warning appears
# Test bypass methods (right-click, System Settings)
```

### Production Build Testing

**After Release**:

**1. Fresh Installation Test**

- Download DMG from GitHub release
- Install on clean macOS system
- Verify first-launch experience
- Test all bypass methods for unsigned app

**2. Auto-Update Test**

- Install previous version
- Trigger update check
- Verify update downloads
- Test "Quit and Install" flow
- Confirm app updates and restarts

**3. Homebrew Install Test**

```bash
brew tap mehmetsagir/toolify
brew install --cask toolify
# Verify installation works
```

**4. Cross-Architecture Test**

- Test on Apple Silicon (ARM64)
- Test on Intel (x64) if available
- Verify correct architecture is downloaded

### Beta Testing (Optional)

**For Major Releases**:

1. Create GitHub pre-release
2. Share with beta testers
3. Collect feedback
4. Fix critical issues
5. Create full release

## Rollback Procedures

### When to Rollback

- **Critical Bugs**: App crashes, data loss
- **Security Issues**: Vulnerabilities discovered
- **Breaking Changes**: Major regressions
- **Update Failures**: Auto-update broken

### Rollback Strategies

#### Option 1: GitHub Release Rollback

**If Release is Recent**:

1. **Delete Release**

   ```bash
   # Via GitHub CLI
   gh release delete vx.x.x --yes

   # Delete tag (optional)
   git tag -d vx.x.x
   git push origin :refs/tags/vx.x.x
   ```

2. **Yank Version** (if published to npm)

   ```bash
   npm deprecate toolify@"x.x.x" "Critical bug, please use x.x.(x-1)"
   ```

3. **Revert to Previous Version**
   - Users can manually install previous version
   - Auto-update will not downgrade (prevented by config)

#### Option 2: Hotfix Release

**Recommended Approach**:

1. **Create Hotfix Branch**

   ```bash
   git checkout -b hotfix/critical-bug
   ```

2. **Fix Issue**
   - Implement fix
   - Test thoroughly
   - Commit changes

3. **Release Hotfix**

   ```bash
   npm version patch
   git commit -m "hotfix: fix critical bug"
   git tag -a vx.x.(x+1) -m "Hotfix release"
   git push origin master
   git push origin vx.x.(x+1)
   ```

4. **Monitor**
   - Ensure hotfix works
   - Verify auto-update offers hotfix

#### Option 3: Homebrew Rollback

**Update Cask to Previous Version**:

```bash
# Edit homebrew/toolify.rb
# Change version to previous version
# Update sha256 to previous release

git commit -m "toolify: rollback to x.x.(x-1)"
git push origin master

# Users can then reinstall
brew reinstall --cask toolify
```

### Verifying Rollback

**After Rollback**:

1. **Verify Release Page**: GitHub releases shows correct version
2. **Test Download**: Previous version downloads correctly
3. **Test Install**: Previous version installs and runs
4. **Auto-Update**: Ensure broken version is not offered

### Communication

**Inform Users**:

- Update GitHub release notes
- Post issue announcement
- Update README if needed
- Document what went wrong

**Example**:

```markdown
## ⚠️ Update Rollback Notice

Version 0.0.12 has been rolled back due to a critical bug.
Please update to 0.0.13 which fixes this issue.

**Affected Users**: Anyone who installed 0.0.12
**Action Required**: Update to 0.0.13 via Settings
```

### Preventing Future Rollbacks

**Better Testing**:

- Comprehensive pre-release testing
- Beta testing for major versions
- Automated test suite
- CI/CD improvements

**Gradual Rollout**:

- Release to subset of users first
- Monitor error logs
- Expand rollout if stable

## Quick Reference

### Essential Commands

```bash
# Build
npm run build:mac              # Build without publishing
npm run build:dmg              # Build DMG only (fast)
npm run build:mac:publish      # Build + publish to GitHub

# Version
npm version patch              # Bump patch version
npm version minor              # Bump minor version
npm version major              # Bump major version

# Git
git tag -a vx.x.x -m "Release" # Create tag
git push origin vx.x.x         # Push tag

# Homebrew
shasum -a 256 file.dmg         # Calculate SHA256

# Testing
open dist/Toolify.app          # Open built app
npm run dev                    # Development mode
```

### Release Checklist

```markdown
## Pre-Release

- [ ] Tests pass
- [ ] Build succeeds
- [ ] Manual testing complete
- [ ] Version bumped
- [ ] Git tag created
- [ ] Tag pushed

## Post-Release

- [ ] GitHub release created
- [ ] Artifacts uploaded
- [ ] Homebrew tap updated
- [ ] Users notified (optional)
```

### File Locations

```
Toolify/
├── dist/                          # Build output
│   ├── Toolify-{version}-*.dmg
│   ├── Toolify-{version}-*.zip
│   └── latest-mac.yml
├── homebrew/
│   └── toolify.rb                 # Homebrew cask
├── .github/workflows/
│   └── release.yml                # Release automation
├── electron-builder.yml           # Build configuration
├── package.json                   # Version & scripts
└── scripts/
    ├── version.sh                 # Version bump script
    └── copy-whisper-executables.js
```

## Troubleshooting

### Build Fails

**Issue**: Build fails with errors

**Solutions**:

```bash
# Clear cache
rm -rf dist/ node_modules/
npm install

# Check Xcode (macOS)
xcode-select --install

# Verify electron-builder
npx electron-builder --version
```

### Auto-Update Not Working

**Issue**: App doesn't detect new version

**Solutions**:

1. Verify `latest-mac.yml` exists in release
2. Check GitHub release is published (not draft)
3. Verify version in `package.json` matches tag
4. Check console logs for errors

### DMG Won't Open

**Issue**: DMG shows "damaged" error

**Solutions**:

```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine file.dmg

# Rebuild DMG
npm run build:dmg
```

### Homebrew Update Fails

**Issue**: `brew upgrade` fails

**Solutions**:

```bash
# Update tap
brew tap mehmetsagir/toolify --force-update

# Clear cache
brew cleanup --cask toolify

# Reinstall
brew reinstall --cask toolify
```

## Additional Resources

- **Electron Builder Docs**: https://www.electron.build/
- **electron-updater Docs**: https://www.electron.build/auto-update
- **Homebrew Cask Docs**: https://docs.brew.sh/Cask-Cookbook
- **macOS Code Signing**: https://developer.apple.com/support/code-signing

## Support

For deployment issues:

1. Check GitHub Issues: https://github.com/mehmetsagir/toolify/issues
2. Review this documentation
3. Check Electron Builder troubleshooting guide

---

**Last Updated**: 2025-01-10
**Document Version**: 1.0
**Maintainer**: Mehmet Sagir
