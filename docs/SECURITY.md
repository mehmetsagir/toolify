# Security Documentation

## Overview

Toolify is an AI-powered voice transcription application for macOS. This document outlines the security architecture, data handling practices, and threat model for the application.

**Security Principles:**

- Privacy by design
- Local-first processing when possible
- Minimal external data transmission
- Transparent data handling
- Secure credential management

---

## Security Architecture

### Application Structure

Toolify uses Electron with a three-process architecture:

1. **Main Process** (Node.js): Handles system integration, file operations, and API communications
2. **Renderer Process** (UI): React-based user interface with restricted capabilities
3. **Preload Script**: Secure bridge between main and renderer processes

### Context Isolation Implementation

The application implements **context isolation** for the main application windows:

```typescript
// src/main/utils/windows.ts
webPreferences: {
  sandbox: false,
  nodeIntegration: false,
  contextIsolation: true,
  webSecurity: true
}
```

**Security Measures:**

- `nodeIntegration: false` - Renderer cannot access Node.js APIs directly
- `contextIsolation: true` - Renderer runs in isolated JavaScript context
- Preload script exposes specific APIs via `contextBridge.exposeInMainWorld()`

**Overlay Window Exception:**
The recording overlay window has relaxed security settings for functionality:

```typescript
// src/main/index.ts:349-354
webPreferences: {
  sandbox: false,
  nodeIntegration: true,
  contextIsolation: false,
  webSecurity: false
}
```

**Justification:** The overlay loads local HTML strings directly and requires direct system access for real-time audio visualization. This is acceptable because:

- Only trusted local content is displayed
- No external resources are loaded
- Window is created and controlled entirely by main process
- No user input is processed in the overlay

---

## API Key Storage

### Current Implementation

API keys are stored using **electron-store** in plain text:

```typescript
// src/main/utils/settings.ts
import Store from 'electron-store'

const store = new Store()
// API key stored in settings.json
```

**Storage Location:**

```
~/Library/Application Support/Toolify/settings.json
```

**Security Considerations:**

- Files are protected by macOS user permissions (user-level isolation)
- No encryption at rest
- Accessible to any process running as the user
- Not protected by System Keychain

**Risk Assessment:** MEDIUM

- macOS file permissions provide basic protection
- Vulnerable to malware running as the same user
- No protection against physical device access (if unencrypted)

### Recommended Improvement

Implement macOS Keychain integration for secure credential storage:

```typescript
// Proposed implementation
import keytar from 'keytar'

const SERVICE_NAME = 'com.toolify.app'

export async function saveApiKey(apiKey: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, 'openai-api-key', apiKey)
}

export async function getApiKey(): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, 'openai-api-key')
}
```

**Benefits:**

- Hardware-backed encryption (T2/M1/M2 chips)
- System-managed secure storage
- Protected from other processes
- Survives app reinstall (persists separately)
- Standard macOS security model

---

## Data Flow and External Communications

### Local Transcription Flow (Offline)

```
Audio Input → Microphone → MediaRecorder → WebM Buffer
  → FFmpeg Conversion → WAV File
  → Local Whisper Executable (whisper.cpp)
  → Text Output → Clipboard
```

**Data Sent Externally:** NONE (purely local)

**Privacy Guarantees:**

- Audio never leaves the device
- Processing happens entirely on-device
- No network communication required
- No telemetry or analytics

**Dependencies:**

- HuggingFace CDN (one-time model download over HTTPS)
- Model files stored in `~/Library/Application Support/Toolify/models/`

### Cloud Transcription Flow (Online)

```
Audio Input → Microphone → MediaRecorder → WebM Buffer
  → Temporary File (/tmp/recording-{timestamp}.webm)
  → HTTPS POST to OpenAI API (api.openai.com)
  → Text Response → Clipboard
```

**Data Sent Externally:**

- Audio data (WebM format) to OpenAI API
- API key in HTTP Authorization header
- Language preferences and translation settings

**OpenAI API Usage:**

- Endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1` (hosted by OpenAI)
- Translation: `https://api.openai.com/v1/chat/completions` (gpt-4o-mini)

**Privacy Policy Alignment:**

- Audio data is processed by OpenAI's servers
- OpenAI's data retention policy applies (typically 30 days for API, not used for training)
- User must provide explicit consent via API key entry
- No data is sent until user configures API key

### Translation Flow

Translation uses OpenAI's GPT-4o-mini model, even when using local Whisper:

```
Local Transcription Text → HTTPS POST to OpenAI API
  → GPT-4o-mini Translation → Translated Text → Clipboard
```

**Implications:**

- Transcription happens locally (audio stays on device)
- Only text is sent for translation
- Requires API key (no way to translate offline)

---

## macOS Permission Model

### Required Permissions

#### 1. Accessibility Permission

**Required For:**

- Global keyboard shortcuts (Cmd+Space, RightCommand)
- Auto-paste functionality (Command+V simulation)
- System-wide keyboard monitoring via `uiohook-napi`

**System Prompt:**

```
"Toolify would like to control this computer using accessibility features."
```

**Code Location:**

```typescript
// src/main/index.ts:869-873
const { systemPreferences } = require('electron')
const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false)
```

**Security Implications:**

- App can simulate keyboard input (paste Command+V)
- App can monitor global keyboard events
- Required for core functionality
- User can revoke at any time in System Settings
- Revoking disables global shortcuts (app still works with manual clicks)

**Access Method:**

- `uiohook-napi` for Right Command detection
- Electron `globalShortcut` for registered shortcuts
- `child_process.exec('osascript ...')` for Command+V simulation

#### 2. Microphone Permission

**Required For:**

- Audio recording
- Speech-to-text processing

**System Prompt:**

```
"Toolify would like to access the microphone."
```

**Code Location:**

```typescript
// Renderer process (MediaRecorder API)
navigator.mediaDevices.getUserMedia({ audio: true })
```

**Security Implications:**

- Required for core functionality
- Recording indicator visible in macOS menu bar
- User can revoke at any time
- App only records when user initiates (manual click or global shortcut)
- No background recording

#### 3. Notifications Permission

**Required For:**

- Recording status notifications
- Error alerts
- Update notifications

**System Prompt:**

```
"Toolify would like to send you notifications."
```

**Security Implications:**

- Low risk (informational only)
- User can disable in app settings (processNotifications: false)
- No sensitive data in notifications

#### 4. Full Disk Access (Optional)

**Required For:**

- Reading FFmpeg executable (if installed in non-standard location)
- Accessing audio files in user's Documents/Desktop (for file-based transcription - NOT YET IMPLEMENTED)

**Current Status:** NOT REQUIRED

- FFmpeg is expected in system PATH
- No file browsing features implemented yet

---

## Privacy Implications: Local vs Cloud

### Local Transcription (Recommended)

**Data Privacy:** EXCELLENT

| Aspect                | Status                     |
| --------------------- | -------------------------- |
| Audio leaves device   | No                         |
| Text processing       | On-device                  |
| Network required      | No (after model download)  |
| External dependencies | HuggingFace CDN (one-time) |
| Data retention        | User-controlled            |
| Third-party access    | None                       |

**Security Benefits:**

- Air-gapped operation possible (after initial setup)
- No API costs
- No internet connection required
- Works in restricted network environments
  -HIPAA/GDPR-friendly (for transcription)

**Limitations:**

- Lower accuracy than cloud Whisper-1
- Translation requires API key (sent to OpenAI)
- Model files large (150MB - 3GB)
- Slower processing (especially on older Macs)

### Cloud Transcription

**Data Privacy:** DEPENDS ON OPENAI POLICIES

| Aspect                | Status                                       |
| --------------------- | -------------------------------------------- |
| Audio leaves device   | Yes (sent to OpenAI)                         |
| Text processing       | OpenAI servers                               |
| Network required      | Yes                                          |
| External dependencies | OpenAI API                                   |
| Data retention        | Per OpenAI policy (30 days API, no training) |
| Third-party access    | OpenAI                                       |

**Security Trade-offs:**

- Higher accuracy (Whisper-1 > local models)
- Faster processing (GPU-accelerated servers)
- No local storage required
- Ongoing API costs
- Privacy implications (audio sent to external servers)

**Recommendation for Privacy-Conscious Users:**

- Use local models (medium or large-v3)
- Disable translation feature
- Keep app updated for security patches
- Monitor network activity during use

---

## Electron Security Best Practices

### Implemented Practices

#### 1. Content Security Policy (CSP)

**Status:** NOT IMPLEMENTED

**Recommendation:**
Add CSP meta tag to renderer HTML to prevent XSS:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://api.openai.com;"
/>
```

#### 2. Secure IPC Communication

**Status:** IMPLEMENTED

```typescript
// Preload script exposes limited API surface
contextBridge.exposeInMainWorld('api', {
  processAudio: (buffer, duration) => ipcRenderer.send('process-audio', buffer, duration),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings)
  // ... only specific methods exposed
})
```

**Benefits:**

- Renderer cannot execute arbitrary Node.js code
- Limited API surface reduces attack surface
- Clear separation of privileges

#### 3. File Access Control

**Status:** IMPLEMENTED

**Application Data Location:**

```
~/Library/Application Support/Toolify/
```

**Files Stored:**

- `settings.json` - User preferences (contains API key in plaintext)
- `history.json` - Transcription history (audio files + text)
- `models/` - Downloaded Whisper models (GGML format)
- `recordings/` - Audio recordings (MP3 format)
- `update-config.json` - Auto-updater state

**Permissions:**

- All files protected by macOS user permissions
- No world-readable files created
- Temporary files use system `/tmp` directory

**File Cleanup:**

```typescript
// Temporary files cleaned after processing
fs.unlinkSync(tempFilePath) // in finally blocks
```

#### 4. External URL Handling

**Status:** SAFE

**External URLs Used:**

- `https://api.openai.com` - Transcription/Translation API
- `https://huggingface.co` - Model downloads (CDN)
- `x-apple.systempreferences:...` - System Settings deep links (Apple protocol)

**No Arbitrary URL Loading:**

- No `webview` tags used
- No `window.open()` calls
- No `<iframe>` elements with external content
- Shell protocol disabled by default

#### 5. Update Security

**Status:** NEEDS IMPROVEMENT

**Current Implementation:**

```typescript
// src/main/auto-updater.ts
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'mehmetsagir',
  repo: 'toolify'
})
```

**Update Sources:**

- GitHub Releases (https://github.com/mehmetsagir/toolify/releases)
- Updates are NOT signed (macOS code signing not configured)
- No signature verification

**Risks:**

- Man-in-the-middle possible (no HTTPS certificate pinning)
- Repository compromise could deliver malicious updates
- No code signature verification

**Recommendations:**

1. Enable code signing for macOS builds
2. Use `electron-builder` code signing
3. Verify update signatures before installation
4. Consider using private update feed with authentication
5. Implement update checksum verification

---

## Third-Party Dependencies

### Security Audit

**Production Dependencies:**

| Package          | Version | Purpose               | Risk Level | Notes                        |
| ---------------- | ------- | --------------------- | ---------- | ---------------------------- |
| electron         | 38.1.2  | App framework         | MEDIUM     | Regular security updates     |
| electron-store   | 8.1.0   | Data persistence      | LOW        | Plaintext storage (noted)    |
| electron-updater | 6.6.2   | Auto-updates          | MEDIUM     | No signature verification    |
| openai           | 6.9.1   | API client            | LOW        | Official SDK                 |
| uiohook-napi     | 1.5.4   | Global keyboard hooks | MEDIUM     | Native module, system access |
| whisper-node     | 1.1.1   | Local transcription   | LOW        | Native executable wrapper    |

**Dependency Vulnerabilities:**

```bash
$ npm audit --production
# No known vulnerabilities (as of audit date)
```

**Update Status:**

- All dependencies up-to-date
- Regular security audits recommended
- Automated dependency updating recommended (Dependabot)

### Security Considerations by Dependency

#### 1. uiohook-napi (MEDIUM RISK)

**Purpose:** Global keyboard event monitoring

**Risks:**

- Native module (C++ binding)
- Requires system-level keyboard access
- Can potentially log all keystrokes if compromised

**Mitigation:**

- Only used for Right Command detection (fallback)
- Source code auditable
- No sensitive data logged
- Can be disabled (use Command+Space instead)

**Alternatives:**

- Electron `globalShortcut` (primary method)
- Native macOS APIs via Objective-C bindings

#### 2. electron-updater (MEDIUM RISK)

**Purpose:** Automatic application updates

**Risks:**

- Downloads and executes code from internet
- Currently no signature verification
- Could deliver malicious updates if feed compromised

**Mitigation:**

- Updates from GitHub (SSL-protected)
- User must manually trigger update installation
- Source code available for verification

**Recommended Improvements:**

- Enable code signing
- Verify signatures before installation
- Use signed update feeds

#### 3. electron-store (LOW-MEDIUM RISK)

**Purpose:** Persistent data storage

**Risks:**

- Stores API keys in plaintext
- No encryption at rest
- Accessible to other processes as same user

**Mitigation:**

- Protected by macOS user permissions
- macOS file permissions provide basic isolation

**Recommended Improvements:**

- Migrate to keytar (macOS Keychain)
- Encrypt sensitive data at rest
- Implement secure credential storage

---

## Threat Model

### Attacker Categories

#### 1. Local Malware (Same User)

**Capabilities:**

- Run as same user as Toolify
- Access user's files
- Read electron-store data
- Inject code into processes

**Attacks:**

- **API Key Theft:** Read `~/Library/Application Support/Toolify/settings.json`
  - **Mitigation:** Use macOS Keychain (keytar)
- **History Access:** Read transcription history and audio files
  - **Mitigation:** Encrypt history at rest
- **Clipboard Monitoring:** Access copied text
  - **Mitigation:** Clear clipboard after paste (user preference)
- **Process Injection:** Inject code into Toolify process
  - **Mitigation:** Enable code signing, hardened runtime

**Risk Level:** MEDIUM

- Possible if user has malware infection
- Requires user-level compromise first
- No privilege escalation (stays at user level)

#### 2. Network Attacker

**Capabilities:**

- Intercept network traffic
- Man-in-the-middle attacks
- DNS spoofing

**Attacks:**

- **API Key Interception:** Capture API key in transit to OpenAI
  - **Mitigation:** HTTPS enforced by OpenAI SDK
  - **Status:** PROTECTED (TLS 1.3)
- **Update Hijacking:** Deliver malicious update
  - **Mitigation:** HTTPS for GitHub, code signing
  - **Status:** PARTIALLY PROTECTED (HTTPS only, no signature verification)
- **Model Download Tampering:** Serve malicious Whisper model
  - **Mitigation:** HTTPS for HuggingFace CDN, checksum verification
  - **Status:** PARTIALLY PROTECTED (HTTPS only, no checksum verification)

**Risk Level:** LOW-MEDIUM

- HTTPS provides protection against passive attackers
- Active attackers (CA compromise) could intercept
- Certificate pinning recommended for high-security use cases

#### 3. Physical Access Attacker

**Capabilities:**

- Access to unlocked device
- Can read user files
- Can run commands as user

**Attacks:**

- **API Key Theft:** Read settings file directly
  - **Mitigation:** macOS Keychain encryption, FileVault full-disk encryption
  - **Status:** NOT PROTECTED (plaintext in electron-store)
- **History Access:** Read all transcriptions
  - **Mitigation:** Encrypt history, use secure delete
  - **Status:** NOT PROTECTED (plaintext)
- **Model File Access:** Extract Whisper models
  - **Risk:** LOW (models are public anyway)

**Risk Level:** MEDIUM

- Requires physical access to device
- Requires device to be unlocked (or weak password)
- Full-disk encryption (FileVault) provides protection

**Recommendations for Users:**

- Enable FileVault (macOS full-disk encryption)
- Use strong password/Touch ID
- Enable screen timeout
- Lock device when not in use

#### 4. Supply Chain Attacker

**Capabilities:**

- Compromise npm registry
- Compromise GitHub repository
- Compromise build infrastructure

**Attacks:**

- **Malicious Dependency:** Publish compromised package
  - **Mitigation:** npm lockfile, CI/CD verification, Dependabot
  - **Status:** PARTIALLY PROTECTED
- **Repository Compromise:** Inject malicious code
  - **Mitigation:** Code reviews, branch protection, signed commits
  - **Status:** PARTIALLY PROTECTED (no signed commits requirement)
- **Build Compromise:** Tamper with build artifacts
  - **Mitigation:** Reproducible builds, CI/CD security
  - **Status:** NOT PROTECTED (local builds)

**Risk Level:** LOW

- Open source code (auditable)
- Small dependency footprint
- No custom native modules (except whisper-node, uiohook-napi)
- Regular security audits

**Recommendations:**

- Enable GitHub branch protection
- Require signed commits
- Implement CI/CD security scanning
- Use Dependabot for automated updates
- Pin dependency versions in package-lock.json

#### 5. Cloud Provider Attacker

**Capabilities:**

- Compromise OpenAI infrastructure
- Access OpenAI API logs
- Modify API responses

**Attacks:**

- **Data Interception:** Access audio data sent to OpenAI API
  - **Mitigation:** OpenAI's security practices
  - **Status:** RELIES ON OPENAI
- **Response Manipulation:** Modify transcriptions/translations
  - **Impact:** Low (user notices incorrect text)
  - **Status:** RELIES ON OPENAI
- **API Key Logging:** Log API keys on server side
  - **Mitigation:** OpenAI's policies (no API key logging)
  - **Status:** RELIES ON OPENAI

**Risk Level:** LOW-MEDIUM

- Requires compromise of OpenAI infrastructure
- OpenAI has strong security practices
- Users can opt-out by using local models
- Audit trail available in OpenAI dashboard

**Mitigation:**

- Prefer local models for sensitive content
- Use API keys with usage limits
- Monitor API usage in OpenAI dashboard
- Rotate API keys regularly

---

## Security Mitigation Strategies

### Immediate Improvements (High Priority)

#### 1. Migrate to macOS Keychain for API Keys

**Current:** API keys stored in plaintext JSON file
**Proposed:** Use keytar for secure credential storage

```typescript
import keytar from 'keytar'

const SERVICE_NAME = 'com.toolify.app'

// Migrate existing keys
async function migrateApiKeyToKeychain(): Promise<void> {
  const settings = getSettings()
  if (settings.apiKey) {
    await keytar.setPassword(SERVICE_NAME, 'openai-api-key', settings.apiKey)
    settings.apiKey = '' // Clear from electron-store
    saveSettings(settings)
  }
}
```

**Benefits:**

- Hardware-backed encryption (T2/M1/M2 chips)
- Protected from other processes
- System-managed secure storage
- Survives app reinstall

#### 2. Enable Code Signing for macOS

**Current:** Unsigned builds
**Proposed:** Sign with Apple Developer certificate

```json
// electron-builder configuration
"mac": {
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "entitlements.mac.plist",
  "entitlementsInherit": "entitlements.mac.plist"
}
```

**Benefits:**

- Prevents process injection
- Enables library validation
- Required for App Store distribution
- Improances user trust

#### 3. Implement Update Signature Verification

**Current:** No signature verification
**Proposed:** Verify updates before installation

```typescript
autoUpdater.on('update-downloaded', async (info) => {
  const signature = await getUpdateSignature(info.path)
  const isValid = await verifySignature(signature, publicKey)

  if (!isValid) {
    console.error('Update signature verification failed!')
    return
  }

  // Proceed with installation
})
```

**Benefits:**

- Prevents malicious updates
- Detects tampered update files
- Ensures update integrity

### Medium-Term Improvements

#### 4. Encrypt History at Rest

**Current:** Plaintext history storage
**Proposed:** Encrypt sensitive fields

```typescript
import crypto from 'crypto'

const ENCRYPTION_KEY = getEncryptionKey() // From Keychain

function encryptHistoryItem(item: HistoryItem): HistoryItem {
  if (item.text) {
    item.text =
      crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY).update(item.text, 'utf8', 'hex') +
      cipher.final('hex')
  }
  return item
}
```

**Benefits:**

- Protection against malware reading history
- Protection against physical device access
- Compliance with privacy regulations (GDPR, HIPAA)

#### 5. Implement Content Security Policy

**Current:** No CSP
**Proposed:** Add CSP meta tag

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://api.openai.com;
               img-src 'self' data:;
               object-src 'none';
               base-uri 'self';
               form-action 'self';"
/>
```

**Benefits:**

- Prevents XSS attacks
- Blocks unauthorized network requests
- Restricts resource loading

#### 6. Add Model Checksum Verification

**Current:** No checksum verification for downloaded models
**Proposed:** Verify SHA256 checksums

```typescript
import crypto from 'crypto'
import { createHash } from 'crypto'

const MODEL_CHECKSUMS = {
  'ggml-medium.bin': 'abc123...',
  'ggml-large-v3.bin': 'def456...'
}

async function verifyModelChecksum(modelPath: string, modelType: string): Promise<boolean> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(modelPath)

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  const checksum = hash.digest('hex')
  const expectedChecksum = MODEL_CHECKSUMS[`${modelType}.bin`]

  return checksum === expectedChecksum
}
```

**Benefits:**

- Ensures downloaded models are not tampered
- Detects corrupted downloads
- Verifies model integrity

### Long-Term Improvements

#### 7. Implement Security Audit Logging

**Proposed:** Log security-relevant events

```typescript
function logSecurityEvent(event: {
  type: 'api_key_access' | 'history_access' | 'update_install'
  timestamp: number
  details: string
}): void {
  const logPath = join(app.getPath('userData'), 'security.log')
  fs.appendFileSync(logPath, JSON.stringify(event) + '\n')
}
```

**Benefits:**

- Detects suspicious activity
- Enables forensic analysis
- Supports compliance auditing

#### 8. Add Privacy Mode

**Proposed:** User-selectable privacy level

```typescript
enum PrivacyMode {
  MAXIMUM = 'maximum', // Local only, no history, no analytics
  BALANCED = 'balanced', // Local transcription, optional cloud translation
  CONVENIENCE = 'convenience' // Cloud transcription, history enabled
}
```

**Benefits:**

- User control over privacy
- Transparent privacy settings
- Supports different threat models

#### 9. Implement Automatic Security Updates

**Current:** Manual update process
**Proposed:** Auto-install security updates

```typescript
autoUpdater.on('update-available', (info) => {
  const isSecurityUpdate = info.version.includes('security')

  if (isSecurityUpdate) {
    // Auto-download and prompt for restart
    autoUpdater.downloadUpdate()
  }
})
```

**Benefits:**

- Faster security patch deployment
- Reduces window of vulnerability
- Improances user security posture

---

## User Data Handling and Retention

### Data Types Stored

#### 1. Settings Data

**Location:** `~/Library/Application Support/Toolify/settings.json`

**Fields:**

- `apiKey`: OpenAI API key (plaintext - SECURITY ISSUE)
- `language`: UI language preference
- `sourceLanguage`: Transcription source language
- `targetLanguage`: Translation target language
- `translate`: Boolean - enable translation
- `useLocalModel`: Boolean - use local Whisper
- `localModelType`: Model size (base/small/medium/large-v3)
- `shortcut`: Global keyboard shortcut
- `trayAnimations`: Boolean - show tray animations
- `processNotifications`: Boolean - show notifications
- `soundAlert`: Boolean - play sound on completion
- `soundType`: Sound effect name
- `autoStart`: Boolean - launch at login
- `showDockIcon`: Boolean - show in Dock
- `showRecordingOverlay`: Boolean - show overlay while recording
- `overlayStyle`: Overlay style ('compact' | 'large')
- `overlayPosition`: Custom overlay position
- `historyAutoDeleteDays`: Auto-delete history after N days
- `historyMaxItems`: Maximum history items (0 = unlimited)

**Retention:** Until app is uninstalled or user deletes manually

**Privacy Risk:** MEDIUM (API key in plaintext)

#### 2. History Data

**Location:** `~/Library/Application Support/Toolify/history.json`

**Fields per Item:**

- `id`: Unique identifier
- `timestamp`: Unix timestamp (milliseconds)
- `text`: Transcribed/translated text (plaintext)
- `isFavorite`: Boolean - user favorited
- `translated`: Boolean - was translation used
- `sourceLanguage`: Source language code
- `targetLanguage`: Target language code
- `provider`: Model used ('OpenAI Whisper-1' or 'Whisper Medium (GGML)')
- `audioPath`: Path to audio recording file
- `duration`: Recording duration (seconds)

**Retention:**

- User-controlled via settings
- Default: 30 days auto-delete
- User can manually delete items
- User can clear all history

**Privacy Risk:** MEDIUM (potentially sensitive transcriptions)

**Recommendations:**

- Implement "Privacy Mode" (no history storage)
- Add "Clear history on quit" option
- Encrypt history at rest
- Secure delete (overwrite) when deleting items

#### 3. Audio Recordings

**Location:** `~/Library/Application Support/Toolify/recordings/`

**Format:** MP3 (converted from WebM using FFmpeg)

**Filename:** `recording-{timestamp}.mp3`

**Retention:** Linked to history items

- Deleted when history item is deleted
- Auto-deleted after 30 days (configurable)
- User can manually delete

**Privacy Risk:** HIGH (voice recordings)

**Recommendations:**

- Implement secure delete (overwrite file before unlink)
- Add "Don't save recordings" option
- Encrypt recordings at rest
- Offer automatic deletion after transcription

#### 4. Model Files

**Location:** `~/Library/Application Support/Toolify/models/`

**Files:**

- `ggml-base.bin` (~142 MB)
- `ggml-small.bin` (~466 MB)
- `ggml-medium.bin` (~1.5 GB)
- `ggml-large-v3.bin` (~2.9 GB)

**Source:** Downloaded from HuggingFace CDN (huggingface.co)

**Retention:** Until deleted by user or uninstalled

**Privacy Risk:** LOW (publicly available models)

**Recommendations:**

- Verify checksums after download
- Offer "Download on demand" (don't pre-download)
- Allow user to delete unused models

#### 5. Temporary Files

**Location:** `/tmp/` (system temporary directory)

**Files:**

- `recording-{timestamp}.webm` (original recording)
- `recording-{timestamp}.wav` (converted for Whisper)
- `recording-input-{timestamp}.webm` (input for local transcription)

**Retention:** Deleted immediately after processing

**Cleanup:**

```typescript
try {
  if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath)
  if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath)
} catch (e) {
  console.error('Failed to cleanup temp files:', e)
}
```

**Privacy Risk:** LOW (cleaned up after use)

**Recommendations:**

- Implement secure delete for temp files
- Use encrypted temporary storage
- Monitor cleanup failures

---

## Security Checklist for Contributors

### Code Review Checklist

Before submitting PR, verify:

- [ ] No sensitive data logged to console
- [ ] API keys never exposed in renderer process
- [ ] File operations use safe paths (no path traversal)
- [ ] IPC handlers validate all inputs
- [ ] No `eval()` or `new Function()` usage
- [ ] External URLs use HTTPS only
- [ ] User input is sanitized before display
- [ ] No hardcoded credentials or secrets
- [ ] Temporary files are cleaned up
- [ ] Error messages don't leak sensitive information

### Dependency Management

Before adding new dependencies:

- [ ] Check npm audit for vulnerabilities
- [ ] Review dependency security practices
- [ ] Prefer maintained, popular packages
- [ ] Check if native module is absolutely necessary
- [ ] Review dependency's source code if possible
- [ ] Add to SECURITY.md documentation

### File Operations

When handling files:

- [ ] Use absolute paths only (no relative paths)
- [ ] Validate file paths are within expected directories
- [ ] Check file existence before operations
- [ ] Handle permissions errors gracefully
- [ ] Clean up temporary files
- [ ] Use secure delete for sensitive files

### IPC Communication

When adding IPC handlers:

- [ ] Validate all input parameters
- [ ] Sanitize data before sending to renderer
- [ ] Use `ipcMain.handle` for requests (not `ipcMain.on`)
- [ ] Implement error handling (don't crash main process)
- [ ] Log security-relevant events
- [ ] Rate-limit expensive operations

---

## Security Update Process

### Vulnerability Disclosure

**Found a Security Issue?**

1. DO NOT create a public GitHub issue
2. Email: security@toolify.app (not yet set up - use GitHub private vulnerability reporting)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

**Response Timeline:**

- Initial response: Within 48 hours
- Investigation: Within 7 days
- Fix deployment: Within 30 days (depending on severity)
- Public disclosure: After fix is deployed

### Security Updates

**Version Numbering:**

- Patch version (0.0.X): Bug fixes, minor improvements
- Minor version (0.X.0): New features
- Major version (X.0.0): Breaking changes

**Security Patches:**

- Security fixes will be clearly marked in release notes
- Security updates will be prioritized over feature work
- Critical vulnerabilities will trigger immediate updates

**Communication:**

- Security advisories published on GitHub
- Update notifications in-app
- Changelog marked with security fixes

---

## Compliance and Regulations

### GDPR (EU General Data Protection Regulation)

**Relevance:** Toolify processes personal data (voice recordings, transcriptions)

**Compliance Status:**

- [ ] Data minimization: Not implemented (stores all history by default)
- [ ] Right to erasure: Partially implemented (can clear history)
- [ ] Right to access: Partially implemented (history export not implemented)
- [ ] Data portability: Not implemented (can't export history)
- [ ] Consent: Partially implemented (no explicit consent for data processing)
- [ ] Data protection: Not implemented (plaintext storage)

**Recommendations:**

- Add privacy policy disclosure
- Implement data export feature
- Add "Do not store history" option
- Implement encryption at rest
- Obtain explicit consent for data processing
- Add DPIA (Data Protection Impact Assessment)

### HIPAA (Health Insurance Portability and Accountability Act)

**Relevance:** Toolify may be used for medical transcription

**Compliance Status:** NOT HIPAA COMPLIANT

**Issues:**

- No access controls (anyone with device access can read history)
- No audit logging (can't track who accessed what)
- No encryption at rest (PHI stored in plaintext)
- No business associate agreement with OpenAI

**Recommendation:**

- Clearly state in privacy policy that Toolify is NOT HIPAA compliant
- Warn users not to use for medical transcription
- Recommend local models only (no data sent to cloud)
- Implement HIPAA-compliant features if targeting healthcare market

### CCPA (California Consumer Privacy Act)

**Relevance:** Toolify processes personal data of California residents

**Compliance Status:** PARTIAL

**Requirements:**

- [ ] Right to know: Partially implemented (can view history)
- [ ] Right to delete: Partially implemented (can clear history)
- [ ] Right to opt-out: Not applicable (no data selling)
- [ ] Right to non-discrimination: Not applicable

**Recommendations:**

- Add "Do not sell my data" disclosure (not applicable, but good practice)
- Implement data export feature
- Add privacy policy disclosure

---

## Additional Resources

### Security Tools for Developers

**Static Analysis:**

```bash
npm install -D @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-security
```

**Dependency Scanning:**

```bash
npm audit
npm audit fix
```

**Secrets Detection:**

```bash
npm install -g git-secrets
git-secrets --install
git-secrets --add 'api_key'
git-secrets --add 'apiKey'
```

### Electron Security Checklist

Based on Electron's official security checklist:

- [ ] Enable context isolation
- [ ] Disable node integration in renderer
- [ ] Enable context isolation in preload
- [ ] Use CSP meta tags
- [ ] Verify webview options
- [ ] Disable allowPrinting in sensitive windows
- [ ] Validate IPC messages
- [ ] Request headers verification
- [ ] Content security policy
- [ ] Same-origin policy enforcement

### Useful Links

- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Electron Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [macOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [OpenAI API Security](https://openai.com/policies/api-data-usage-policies)
- [GDPR Compliance](https://gdpr.eu/)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/index.html)

---

## Summary

**Current Security Posture:** MODERATE

**Strengths:**

- Context isolation enabled for main windows
- Local transcription option available
- HTTPS enforced for external communications
- No known vulnerabilities in dependencies
- Open source code (auditable)

**Weaknesses:**

- API keys stored in plaintext (critical issue)
- No encryption at rest
- Unsigned updates
- No code signing
- Minimal access controls
- No audit logging

**Priority Improvements:**

1. Migrate to macOS Keychain for API keys (CRITICAL)
2. Enable code signing for macOS builds (HIGH)
3. Implement update signature verification (HIGH)
4. Add encryption for history at rest (MEDIUM)
5. Implement Content Security Policy (MEDIUM)

**Overall Risk Assessment:**

- Local transcription: LOW risk (data stays on device)
- Cloud transcription: MEDIUM risk (relies on OpenAI security)
- API key storage: HIGH risk (plaintext in file system)

**User Recommendations:**

- Use local models for sensitive content
- Enable FileVault full-disk encryption
- Keep app updated
- Use strong device password
- Clear history regularly
- Consider using API keys with usage limits

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-10
**Next Review:** 2025-02-10
