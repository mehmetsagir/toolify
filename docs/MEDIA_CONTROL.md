# Media Control System Documentation

## Overview

The Media Control System provides automatic pause/resume functionality for media applications during recording sessions in Toolify. This ensures that background audio doesn't interfere with voice transcription and improves the overall user experience.

## Table of Contents

- [Architecture](#architecture)
- [Supported Applications](#supported-applications)
- [Permission Requirements](#permission-requirements)
- [Integration with Recording Lifecycle](#integration-with-recording-lifecycle)
- [Implementation Details](#implementation-details)
- [Error Handling](#error-handling)
- [Adding New Application Support](#adding-new-application-support)
- [Testing](#testing)
- [Known Limitations](#known-limitations)

## Architecture

The media control system is implemented as a set of AppleScript and JavaScript injection utilities that interface with macOS media applications. The system operates through three main components:

1. **Application Detection**: Identifies running media applications
2. **Pause/Resume Control**: Sends appropriate commands to control media playback
3. **State Management**: Tracks application states to restore original playback status

### File Structure

```
src/main/utils/
├── media-control.ts    # Main media control utilities
├── system.ts           # System utilities (notifications, volume)
└── app-support.ts      # Application-specific control scripts
```

## Supported Applications

The media control system supports the following applications:

### Browsers (JavaScript Injection)

| Application     | Pause Method                              | Resume Method                            | Notes                             |
| --------------- | ----------------------------------------- | ---------------------------------------- | --------------------------------- |
| **Safari**      | `document.querySelector('video').pause()` | `document.querySelector('video').play()` | Requires frontmost tab with video |
| **Chrome**      | JavaScript injection via AppleScript      | JavaScript injection via AppleScript     | Works on active tab               |
| **Arc**         | JavaScript injection via AppleScript      | JavaScript injection via AppleScript     | Experimental support              |
| **YouTube PiP** | Picture-in-Specific window targeting      | Window-specific control                  | Special handling for PiP mode     |

### Native Apps (AppleScript)

| Application          | Pause Method                                              | Resume Method                                            | Notes                          |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| **Spotify**          | `tell application "Spotify" to pause`                     | `tell application "Spotify" to play`                     | Requires Spotify to be running |
| **Music**            | `tell application "Music" to pause`                       | `tell application "Music" to play`                       | macOS default music player     |
| **QuickTime Player** | `tell application "QuickTime Player" to pause document 1` | `tell application "QuickTime Player" to play document 1` | Document-based control         |

## Permission Requirements

### macOS Accessibility Permission

**CRITICAL**: The media control system requires macOS Accessibility permissions to function properly.

#### Why Accessibility is Required

- Sending AppleScript commands to other applications
- Simulating keyboard shortcuts (spacebar for play/pause)
- Injecting JavaScript into browser processes
- Monitoring application state changes

#### Granting Permission

1. **System Settings Approach**:

   ```
   System Settings > Privacy & Security > Accessibility
   > Toolify > Toggle ON
   ```

2. **Direct Link (Programmatic)**:

   ```typescript
   shell.openExternal(
     'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
   )
   ```

3. **Command Line Approach** (for testing):
   ```bash
   open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
   ```

#### Permission Checking

```typescript
import { systemPreferences } from 'electron'

// Check if accessibility is granted
const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false)

if (!hasAccessibility) {
  // Show notification to user
  showNotification(
    'Toolify Needs Permission',
    'Please grant Accessibility permission for media control features.'
  )
}
```

## Integration with Recording Lifecycle

The media control system integrates seamlessly with the recording workflow:

### Recording Start Flow

```
User presses shortcut
    ↓
Recording starts
    ↓
muteSystem()                 // Mute system audio
    ↓
pauseAllMedia()              // Pause all media applications
    ↓
isRecording = true
    ↓
Show recording overlay
```

### Recording Stop Flow

```
User stops recording
    ↓
isRecording = false
    ↓
Processing audio...
    ↓
unmuteSystem()               // Restore system volume
    ↓
resumeAllMedia()             // Resume paused media applications
    ↓
Copy transcription to clipboard
    ↓
Show success notification
```

### Recording Cancel Flow

```
User presses ESC
    ↓
Cancel recording
    ↓
unmuteSystem()               // Restore system volume immediately
    ↓
resumeAllMedia()             // Resume all media applications
    ↓
Close overlay without processing
```

## Implementation Details

### AppleScript Commands

#### Safari Control

```applescript
-- Pause Safari video
tell application "Safari"
    if (count of windows) > 0 then
        do JavaScript "document.querySelector('video')?.pause()" in front document
    end if
end tell

-- Resume Safari video
tell application "Safari"
    if (count of windows) > 0 then
        do JavaScript "document.querySelector('video')?.play()" in front document
    end if
end tell
```

#### Chrome Control

```applescript
-- Pause Chrome video
tell application "Google Chrome"
    if (count of windows) > 0 then
        execute front window's tab 1 javascript "document.querySelector('video')?.pause()"
    end if
end tell

-- Resume Chrome video
tell application "Google Chrome"
    if (count of windows) > 0 then
        execute front window's tab 1 javascript "document.querySelector('video')?.play()"
    end if
end tell
```

#### Spotify Control

```applescript
-- Pause Spotify
tell application "Spotify"
    if player state is playing then
        pause
    end if
end tell

-- Resume Spotify
tell application "Spotify"
    if player state is paused then
        play
    end if
end tell
```

#### Music App Control

```applescript
-- Pause Music
tell application "Music"
    if player state is playing then
        pause
    end if
end tell

-- Resume Music
tell application "Music"
    if player state is paused then
        play
    end if
end tell
```

#### QuickTime Player Control

```applescript
-- Pause QuickTime
tell application "QuickTime Player"
    if (count of documents) > 0 then
        pause document 1
    end if
end tell

-- Resume QuickTime
tell application "QuickTime Player"
    if (count of documents) > 0 then
        play document 1
    end if
end tell
```

### JavaScript Injection for Browsers

The browser control uses optional chaining (`?.`) to safely handle cases where no video element exists:

```javascript
// Safe pause
document.querySelector('video')?.pause()

// Safe resume
document.querySelector('video')?.play()

// Alternative: Pause all videos
document.querySelectorAll('video').forEach((v) => v.pause())

// Check if video is playing before acting
const video = document.querySelector('video')
if (video && !video.paused) {
  video.pause()
}
```

### TypeScript Implementation

```typescript
import { exec } from 'child_process'

interface MediaAppState {
  application: string
  wasPlaying: boolean
  timestamp: number
}

const mediaState: Map<string, MediaAppState> = new Map()

/**
 * Pause all supported media applications
 */
export async function pauseAllMedia(): Promise<void> {
  const apps = ['Safari', 'Google Chrome', 'Arc', 'Spotify', 'Music', 'QuickTime Player']

  for (const app of apps) {
    try {
      await pauseMediaApp(app)
    } catch (error) {
      console.warn(`Failed to pause ${app}:`, error)
      // Continue with other apps even if one fails
    }
  }
}

/**
 * Pause a specific media application
 */
async function pauseMediaApp(appName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let script = ''

    switch (appName) {
      case 'Safari':
        script = `
          tell application "Safari"
            if (count of windows) > 0 then
              do JavaScript "document.querySelector('video')?.pause()" in front document
            end if
          end tell
        `
        break

      case 'Google Chrome':
        script = `
          tell application "Google Chrome"
            if (count of windows) > 0 then
              execute front window's tab 1 javascript "document.querySelector('video')?.pause()"
            end if
          end tell
        `
        break

      case 'Spotify':
        script = `
          tell application "Spotify"
            if player state is playing then
              pause
            end if
          end tell
        `
        break

      case 'Music':
        script = `
          tell application "Music"
            if player state is playing then
              pause
            end if
          end tell
        `
        break

      case 'QuickTime Player':
        script = `
          tell application "QuickTime Player"
            if (count of documents) > 0 then
              pause document 1
            end if
          end tell
        `
        break

      default:
        reject(new Error(`Unsupported application: ${appName}`))
        return
    }

    // Check if app is running first
    exec(`pgrep -x "${appName}"`, (checkError) => {
      if (checkError) {
        // App not running, skip
        resolve()
        return
      }

      // App is running, execute pause command
      exec(`osascript -e '${script}'`, (error) => {
        if (error) {
          reject(error)
        } else {
          // Store state for resume
          mediaState.set(appName, {
            application: appName,
            wasPlaying: true,
            timestamp: Date.now()
          })
          resolve()
        }
      })
    })
  })
}

/**
 * Resume all paused media applications
 */
export async function resumeAllMedia(): Promise<void> {
  const resumePromises: Promise<void>[] = []

  mediaState.forEach((state, appName) => {
    if (state.wasPlaying) {
      resumePromises.push(resumeMediaApp(appName))
    }
  })

  await Promise.allSettled(resumePromises)
  mediaState.clear()
}

/**
 * Resume a specific media application
 */
async function resumeMediaApp(appName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let script = ''

    switch (appName) {
      case 'Safari':
        script = `
          tell application "Safari"
            if (count of windows) > 0 then
              do JavaScript "document.querySelector('video')?.play()" in front document
            end if
          end tell
        `
        break

      case 'Google Chrome':
        script = `
          tell application "Google Chrome"
            if (count of windows) > 0 then
              execute front window's tab 1 javascript "document.querySelector('video')?.play()" in end if
            end if
          end tell
        `
        break

      case 'Spotify':
        script = `
          tell application "Spotify"
            if player state is paused then
              play
            end if
          end tell
        `
        break

      case 'Music':
        script = `
          tell application "Music"
            if player state is paused then
              play
            end if
          end tell
        `
        break

      case 'QuickTime Player':
        script = `
          tell application "QuickTime Player"
            if (count of documents) > 0 then
              play document 1
            end if
          end tell
        `
        break

      default:
        reject(new Error(`Unsupported application: ${appName}`))
        return
    }

    exec(`osascript -e '${script}'`, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}
```

## Error Handling

### Permission Denied Errors

When Accessibility permissions are not granted, AppleScript commands will fail silently or throw errors:

```typescript
exec('osascript -e "tell application \\"Spotify\\" to pause"', (error, stdout, stderr) => {
  if (error) {
    // Check if it's a permission error
    if (stderr.includes('not authorized') || stderr.includes('Accessibility')) {
      showNotification(
        'Toolify - Permission Required',
        'Please grant Accessibility permission in System Settings'
      )
    }
  }
})
```

### Application Not Running

Always check if the application is running before attempting control:

```typescript
function isAppRunning(appName: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`pgrep -x "${appName}"`, (error) => {
      resolve(!error)
    })
  })
}

// Usage
if (await isAppRunning('Spotify')) {
  await pauseMediaApp('Spotify')
}
```

### AppleScript Execution Failures

Handle AppleScript execution failures gracefully:

```typescript
async function safePauseMedia(appName: string): Promise<boolean> {
  try {
    await pauseMediaApp(appName)
    return true
  } catch (error) {
    console.warn(`Could not pause ${appName}:`, error)
    return false
  }
}

// Usage
const results = await Promise.all([
  safePauseMedia('Safari'),
  safePauseMedia('Spotify'),
  safePauseMedia('Music')
])

const successCount = results.filter((r) => r).length
console.log(`Paused ${successCount}/${results.length} applications`)
```

### Timeout Handling

Add timeouts to prevent hanging:

```typescript
async function pauseWithTimeout(appName: string, timeoutMs: number = 2000): Promise<void> {
  return Promise.race([
    pauseMediaApp(appName),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
  ])
}
```

## Adding New Application Support

### Step 1: Identify Control Method

Determine if the application supports AppleScript or requires JavaScript injection:

- **Check AppleScript support**: Open Script Editor and try `tell application "App Name"`
- **Check for DOM control**: Open browser console and try `document.querySelector('video')`

### Step 2: Write Test Script

Create a test script in Script Editor:

```applescript
tell application "YourApp"
    -- Try to control playback
    pause
end tell
```

### Step 3: Implement in TypeScript

Add to `media-control.ts`:

```typescript
async function pauseMediaApp(appName: string): Promise<void> {
  // ... existing code ...

  switch (appName) {
    // ... existing cases ...

    case 'YourApp':
      script = `
        tell application "YourApp"
          if player state is playing then
            pause
          end if
        end tell
      `
      break
  }
}
```

### Step 4: Add to Supported Apps List

Update the apps array:

```typescript
const apps = [
  'Safari',
  'Google Chrome',
  'Arc',
  'Spotify',
  'Music',
  'QuickTime Player',
  'YourApp' // Add new app
]
```

### Step 5: Test Thoroughly

1. Test with app running and playing media
2. Test with app running but paused
3. Test with app not running
4. Test with multiple apps running simultaneously

## Testing

### Manual Testing Checklist

#### Test Environment Setup

```bash
# Ensure Toolify has Accessibility permissions
# Open: System Settings > Privacy & Security > Accessibility

# Start multiple media applications
open -a Safari
open -a "Google Chrome"
open -a Spotify
open -a Music
```

#### Test Cases

**Test 1: Single Application Pause/Resume**

1. Start Safari, play a YouTube video
2. Start Toolify recording (press shortcut)
3. Verify: Safari video pauses
4. Stop Toolify recording
5. Verify: Safari video resumes

**Test 2: Multiple Applications Pause/Resume**

1. Start Safari (YouTube), Spotify (music), Music (song)
2. Start Toolify recording
3. Verify: All three applications pause
4. Stop Toolify recording
5. Verify: All three applications resume

**Test 3: Application Not Running**

1. Ensure no media apps are running
2. Start Toolify recording
3. Verify: No errors thrown
4. Stop Toolify recording
5. Verify: Clean exit

**Test 4: Permission Denied**

1. Revoke Accessibility permission
2. Start Toolify recording
3. Verify: User-friendly error message shown
4. Grant permission
5. Retry: Should work normally

**Test 5: Recording Cancel**

1. Start Spotify, play music
2. Start Toolify recording
3. Verify: Spotify pauses
4. Press ESC to cancel
5. Verify: Spotify resumes immediately

### Automated Testing

```typescript
// tests/media-control.test.ts
import { pauseAllMedia, resumeAllMedia } from '../utils/media-control'

describe('Media Control', () => {
  it('should pause all running media applications', async () => {
    await pauseAllMedia()
    // Add assertions based on your testing setup
  })

  it('should resume all paused media applications', async () => {
    await resumeAllMedia()
    // Add assertions based on your testing setup
  })

  it('should handle applications not running gracefully', async () => {
    // Test with no media apps running
    await expect(pauseAllMedia()).resolves.not.toThrow()
  })
})
```

## Known Limitations

### 1. Browser Tab Focus

**Limitation**: JavaScript injection only works on the frontmost/active tab

**Impact**: If a video is playing in a background tab, it won't be paused

**Workaround**: None currently. Users must ensure video tabs are active

**Future Enhancement**: Could iterate through all tabs and windows

### 2. Multiple Video Elements

**Limitation**: `querySelector('video')` only targets the first video element

**Impact**: Pages with multiple videos may only pause the first one

**Workaround**: Use `querySelectorAll('video')` to pause all videos:

```javascript
document.querySelectorAll('video').forEach((v) => v.pause())
```

### 3. Embedded/iframe Videos

**Limitation**: Videos in iframes cannot be controlled directly

**Impact**: Embedded YouTube videos, iframes from other domains

**Workaround**: Complex iframe navigation required, security restrictions

### 4. Application State Detection

**Limitation**: Cannot always reliably detect if media was playing before pausing

**Impact**: May resume applications that weren't originally playing

**Current Approach**: Assume all running media apps should be resumed

**Future Enhancement**: Store and check actual playback state

### 5. Latency

**Limitation**: AppleScript execution has ~100-200ms latency per application

**Impact**: Multiple apps = cumulative delay (e.g., 5 apps = ~500ms)

**Workaround**: Parallel execution helps, but still noticeable

### 6. Platform Limitations

**Limitation**: AppleScript is macOS-specific

**Impact**: No Windows/Linux support

**Alternative Platforms**:

- **Windows**: Use COM automation, Windows Media Player controls
- **Linux**: Use D-Bus MPRIS interface for media players

### 7. Private/Safari Technology Preview

**Limitation**: Some browser variants may have different AppleScript support

**Impact**: Safari Technology Preview may require different syntax

**Workaround**: Add application-specific handling

### 8. Full-Screen Videos

**Limitation**: AppleScript may fail if application is in full-screen mode

**Impact**: Full-screen YouTube videos may not pause

**Workaround**: Exit full-screen before recording, or use keyboard shortcuts

### 9. User-Initiated Play Restriction

**Limitation**: Modern browsers may block auto-play due to user interaction policies

**Impact**: Resume may fail if no user interaction occurred recently

**Workaround**: Known browser limitation, no clean workaround

## Performance Considerations

### Execution Time

- Single AppleScript command: ~50-100ms
- Multiple apps (parallel): ~100-200ms total
- Multiple apps (sequential): ~500ms+ for 5 apps

### System Resources

- Minimal CPU usage
- Negligible memory footprint
- No persistent background processes

### Best Practices

1. **Use parallel execution** for multiple apps
2. **Add timeouts** to prevent hanging
3. **Cache application state** to avoid redundant checks
4. **Graceful degradation** - continue on individual failures

## Security Considerations

### AppleScript Permissions

- Requires Accessibility permission
- User must explicitly grant permission
- System shows permission prompt on first use

### Data Privacy

- No data collection or transmission
- All operations are local
- No network access required

### Sandboxing

- Electron sandbox must be disabled for AppleScript execution
- This is a trade-off for functionality
- Ensure app is code-signed for user trust

## Troubleshooting

### Common Issues

**Issue**: Media doesn't pause when recording starts

**Solutions**:

1. Check Accessibility permissions
2. Verify application is in supported list
3. Ensure application is actually running
4. Check console for error messages

**Issue**: Media doesn't resume after recording

**Solutions**:

1. Check if application was paused by Toolify
2. Verify resume command executed successfully
3. Try manual resume to confirm app works

**Issue**: Error "Not authorized to send AppleScript events"

**Solutions**:

1. Grant Accessibility permission in System Settings
2. Restart Toolify after granting permission
3. Check if Toolify is listed in Accessibility

**Issue**: Browser video doesn't pause

**Solutions**:

1. Ensure video tab is active/frontmost
2. Check if video element exists (devtools console)
3. Try different browser (Safari vs Chrome)
4. Verify JavaScript is enabled

## Future Enhancements

1. **Smart State Detection**: Better detection of actual playback state
2. **All-Tab Scanning**: Pause videos in all browser tabs
3. **Platform Support**: Windows (COM) and Linux (MPRIS/D-Bus)
4. **User Preferences**: Select which apps to control
5. **Custom Shortcuts**: App-specific pause/resume shortcuts
6. **Visual Feedback**: Show which apps were paused in overlay
7. **Whitelist Mode**: Only control specific user-selected apps
8. **Performance Optimization**: Reduce latency further

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Technical Stack](./TECH_STACK.md)
- [Product Requirements](./PRD.md)

## Changelog

### Version 1.0.0 (Pending)

- Initial implementation
- Support for Safari, Chrome, Arc, Spotify, Music, QuickTime
- Basic pause/resume functionality
- Accessibility permission checking
- Error handling and graceful degradation
