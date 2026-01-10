# Toolify Troubleshooting Guide

Comprehensive troubleshooting guide for Toolify - AI-powered voice transcription and translation tool for macOS.

## Table of Contents

- [Permission Issues](#permission-issues)
- [Build and Installation Issues](#build-and-installation-issues)
- [Runtime Errors](#runtime-errors)
- [Network and API Issues](#network-and-api-issues)
- [Local Model Issues](#local-model-issues)
- [Recording and Audio Issues](#recording-and-audio-issues)
- [Keyboard Shortcut Issues](#keyboard-shortcut-issues)
- [Update and Installation Issues](#update-and-installation-issues)
- [Clipboard and Auto-paste Issues](#clipboard-and-auto-paste-issues)
- [Diagnostic Information](#diagnostic-information)

---

## Permission Issues

### Accessibility Permission Not Granted

**Symptoms:**

- Keyboard shortcut doesn't work
- Auto-paste feature doesn't work
- Notification on first launch: "Toolify Needs Permission"

**Solutions:**

1. **Via System Settings (Recommended):**

   ```bash
   # Open Accessibility settings directly
   x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility
   ```

   Or manually:
   - Open System Settings > Privacy & Security > Accessibility
   - Find Toolify in the list
   - Toggle the switch to ON

2. **Verify Permission:**
   - Open Toolify
   - Go to Preferences (click tray icon > Preferences)
   - Check if "Accessibility Permission" warning appears
   - If still denied, restart Toolify after granting

3. **Terminal Verification:**
   ```bash
   # Check if Toolify has accessibility access
   osascript -e 'tell application "System Events" to get name of every process whose background only is true'
   ```

### Microphone Permission

**Symptoms:**

- Recording doesn't start
- No audio input detected
- Browser console shows "Permission denied" errors

**Solutions:**

1. **Grant Microphone Access:**
   - System Settings > Privacy & Security > Microphone
   - Enable Toolify

2. **Test Microphone Access:**

   ```bash
   # Test if microphone is accessible
   ffmpeg -f avfoundation -list_devices true -i ""
   ```

3. **Check Audio Input Device:**
   - System Settings > Sound > Input
   - Verify your microphone is selected and working
   - Test with another app (QuickTime, Voice Memos)

### Notification Permission

**Symptoms:**

- No notifications appear when recording completes
- Settings enabled but no alerts shown

**Solutions:**

1. **Grant Notification Access:**
   - System Settings > Notifications
   - Find Toolify
   - Enable "Allow Notifications"

2. **Test Notifications:**
   - Open Toolify Preferences
   - Toggle "Process Notifications" off/on
   - Make a test recording

---

## Build and Installation Issues

### Build Failures

**Symptoms:**

- `npm run build` fails
- Type errors during compilation
- Module not found errors

**Solutions:**

1. **Clean and Rebuild:**

   ```bash
   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install

   # Clean build artifacts
   rm -rf out dist

   # Rebuild
   npm run build
   ```

2. **TypeScript Errors:**

   ```bash
   # Check for type errors
   npm run typecheck

   # Fix linting issues
   npm run lint
   ```

3. **Missing Dependencies:**

   ```bash
   # Ensure all dependencies are installed
   npm install

   # Install app deps (Electron-specific)
   npm run postinstall
   ```

### Electron Builder Issues

**Symptoms:**

- DMG creation fails
- Code signing errors
- Missing executable files

**Solutions:**

1. **Missing Whisper Executables:**

   ```bash
   # The build script automatically copies executables
   # Verify they exist at:
   ls -la build/whisper-executables/main

   # If missing, the prebuild script will fail
   # Check the copy script:
   cat scripts/copy-whisper-executables.js
   ```

2. **Code Signing Errors (Expected):**
   - Toolify is unsigned by design
   - "code object is not signed at all" warnings are normal
   - Users must bypass Gatekeeper on first launch

3. **Build Platform Mismatch:**

   ```bash
   # Only build DMG on macOS
   npm run build:dmg

   # For other platforms:
   npm run build:win   # Windows
   npm run build:linux # Linux
   ```

### Development Mode Issues

**Symptoms:**

- `npm run dev` fails to start
- Hot reload not working
- White screen in window

**Solutions:**

1. **Port Already in Use:**

   ```bash
   # Kill existing Electron processes
   pkill -f "Electron"

   # Or specify a different port
   export PORT=3001
   npm run dev
   ```

2. **Renderer Process Crashes:**
   - Check Console.app for crash logs
   - Look for renderer console logs:

   ```bash
   # In Terminal, filter logs
   log stream --predicate 'process == "Toolify"'
   ```

3. **Clear Cache:**
   ```bash
   # Clear Electron cache
   rm -rf ~/Library/Application\ Support/Toolify
   rm -rf ~/Library/Caches/Toolify
   ```

---

## Runtime Errors

### "API Key Required" Error

**Symptoms:**

- Recording completes but transcription fails
- Notification: "API Key required for online transcription"

**Solutions:**

1. **Add API Key:**
   - Open Toolify Preferences
   - Go to Dictation section
   - Enter your OpenAI API key
   - Save settings

2. **Verify API Key:**

   ```bash
   # Test API key manually
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **Switch to Local Model (No API Key Required):**
   - In Dictation settings
   - Enable "Use Local Model"
   - Download a model (Base is smallest)

### "Local Model Not Found" Error

**Symptoms:**

- Error: "Local model (medium) not found. Please download the model in Settings."
- Using local model setting without downloading model

**Solutions:**

1. **Download Model:**
   - Open Preferences > Dictation
   - Under "Local Model" section
   - Click "Download" button next to your chosen model
   - Wait for download to complete

2. **Verify Model Download:**

   ```bash
   # Check if model files exist
   ls -lh ~/Library/Application\ Support/Toolify/models/

   # Expected files:
   # ggml-base.bin
   # ggml-small.bin
   # ggml-medium.bin
   # ggml-large-v3.bin
   ```

3. **Model Download Fails:**
   - Check internet connection
   - Verify HuggingFace CDN is accessible:
     ```bash
     curl -I https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
     ```
   - Try downloading manually from Settings UI

### "Whisper Executable Not Found" Error

**Symptoms:**

- Error: "Whisper executable not found. Please reinstall the application."
- Local transcription fails immediately

**Solutions:**

1. **Reinstall Application:**

   ```bash
   # Via Homebrew
   brew reinstall --cask toolify

   # Or download fresh DMG from GitHub Releases
   ```

2. **Verify Executable Location:**

   ```bash
   # Check if executable exists in app bundle
   ls -la /Applications/Toolify.app/Contents/Resources/app.asar.unpacked/build/whisper-executables/main

   # For development:
   ls -la node_modules/whisper-node/lib/whisper.cpp/main
   ```

3. **Development Mode Fix:**
   ```bash
   # Reinstall whisper-node
   npm reinstall whisper-node
   ```

### Transcription Returns Empty Text

**Symptoms:**

- Recording completes successfully
- No error notification
- But clipboard is empty or has no text

**Solutions:**

1. **Audio Too Short or Quiet:**
   - Ensure you spoke clearly into microphone
   - Check input volume in System Settings > Sound
   - Try a longer recording (2-3 seconds minimum)

2. **Language Mismatch:**
   - Check "Source Language" setting in Dictation preferences
   - Set to "Auto" for automatic detection
   - Or set to the language you actually spoke

3. **Check Console for Warnings:**

   ```bash
   # Filter for hallucination filter warnings
   log stream --predicate 'process == "Toolify"' | grep -i "filtered"
   ```

4. **Test with Known Good Audio:**
   - Use a different microphone
   - Record in a quiet environment
   - Speak clearly and at normal volume

---

## Network and API Issues

### OpenAI API Errors

**Symptoms:**

- "Transcription failed. Check your API Key or internet connection."
- "401 Unauthorized" or "429 Rate Limit"
- "Insufficient quota" error

**Solutions:**

1. **Verify API Key Validity:**

   ```bash
   # Test your API key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"

   # Expected: JSON list of models
   # Error: 401 Unauthorized = Invalid API key
   ```

2. **Check API Usage/Quota:**
   - Visit https://platform.openai.com/usage
   - Verify you have available credits
   - Check if you've hit rate limits

3. **Network Connectivity:**

   ```bash
   # Test OpenAI API connectivity
   ping api.openai.com

   # Test HTTPS connection
   curl -I https://api.openai.com/v1/models
   ```

4. **Switch to Local Model:**
   - If API issues persist, use local Whisper models
   - No API key required for transcription
   - Still requires API key for translation feature

### Model Download Fails

**Symptoms:**

- Model download progress bar stops
- Error: "Failed to download model from HuggingFace CDN"
- Partial download files

**Solutions:**

1. **Check Internet Connection:**

   ```bash
   # Test HuggingFace CDN access
   curl -I https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

   # Should return HTTP 200
   ```

2. **Free Disk Space:**

   ```bash
   # Check available space
   df -h ~

   # Required space for models:
   # Base: ~150 MB
   # Small: ~500 MB
   # Medium: ~1.5 GB
   # Large V3: ~3 GB
   ```

3. **Clear Partial Downloads:**

   ```bash
   # Remove partial model files
   rm ~/Library/Application\ Support/Toolify/models/*.bin

   # Then retry download from Settings
   ```

4. **Download Manually (Advanced):**

   ```bash
   # Download model manually
   cd ~/Library/Application\ Support/Toolify/models/
   curl -L -o ggml-base.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

   # Verify file size (~142 MB for base model)
   ls -lh ggml-base.bin
   ```

### Update Download Fails

**Symptoms:**

- Update download stalls
- "Failed to check for updates" error
- Update banner shows but can't download

**Solutions:**

1. **Check GitHub Releases Access:**

   ```bash
   # Test GitHub connectivity
   curl -I https://github.com/mehmetsagir/toolify/releases

   # View latest release
   curl https://api.github.com/repos/mehmetsagir/toolify/releases/latest
   ```

2. **Clear Update Cache:**

   ```bash
   # Remove update cache
   rm ~/Library/Application\ Support/Toolify/update-config.json

   # Restart Toolify and check for updates again
   ```

3. **Manual Update:**
   - Visit https://github.com/mehmetsagir/toolify/releases
   - Download latest DMG
   - Replace existing app

---

## Local Model Issues

### Model Download Stuck

**Symptoms:**

- Progress bar stuck at X%
- Download doesn't complete
- No error notification

**Solutions:**

1. **Check Download Progress:**
   - Open Console.app
   - Filter for "Toolify"
   - Look for "Download progress: X%" messages

2. **Verify Network Bandwidth:**
   - Large models (1.5GB - 3GB) take time
   - Check internet speed:
     ```bash
     curl -o /dev/null https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
     ```

3. **Restart Download:**
   - In Settings > Dictation
   - Click "Delete" next to stuck model
   - Click "Download" again

### Model File Corruption

**Symptoms:**

- Model downloads but transcription fails
- "Model file exists but is not readable" error
- Crash during transcription

**Solutions:**

1. **Verify Model File:**

   ```bash
   # Check file size matches expected size
   ls -lh ~/Library/Application\ Support/Toolify/models/

   # Expected sizes:
   # ggml-base.bin: ~142 MB
   # ggml-small.bin: ~466 MB
   # ggml-medium.bin: ~1.5 GB
   # ggml-large-v3.bin: ~2.9 GB
   ```

2. **Re-download Model:**
   - Delete corrupted model in Settings
   - Download again

3. **Check File Permissions:**

   ```bash
   # Verify file is readable
   cat ~/Library/Application\ Support/Toolify/models/ggml-base.bin > /dev/null

   # Fix permissions if needed
   chmod 644 ~/Library/Application\ Support/Toolify/models/*.bin
   ```

### Local Transcription Slow

**Symptoms:**

- Transcription takes very long time
- "Processing" state persists

**Solutions:**

1. **Expected Processing Times (per minute of audio):**
   - Base model: ~10-15 seconds
   - Small model: ~20-30 seconds
   - Medium model: ~45-60 seconds
   - Large V3: ~90-120 seconds

2. **CPU Usage:**

   ```bash
   # Check CPU usage during transcription
   top -pid $(pgrep -f "whisper")

   # Should see high CPU usage (normal)
   # If idle, transcription may have hung
   ```

3. **Use Smaller Model:**
   - Switch from Medium/Large to Base or Small
   - Faster transcription with slightly lower accuracy

4. **Check for Other Processes:**
   - Close other CPU-intensive apps
   - Ensure sufficient system resources

---

## Recording and Audio Issues

### Recording Doesn't Start

**Symptoms:**

- Press keyboard shortcut but nothing happens
- No overlay appears
- No recording notification

**Solutions:**

1. **Check Accessibility Permission:**
   - See [Accessibility Permission](#accessibility-permission-not-granted) section

2. **Verify Keyboard Shortcut:**
   - Open Preferences > Dictation
   - Check "Keyboard Shortcut" setting
   - Try a different shortcut (e.g., Command+Shift+Space)

3. **Check if Already Recording:**
   - If recording indicator is visible, shortcut stops recording
   - Press once to start, press again to stop

4. **Restart Toolify:**
   ```bash
   # Quit and restart
   pkill Toolify
   open /Applications/Toolify.app
   ```

### No Audio Input Detected

**Symptoms:**

- Recording starts but audio level stays at 0
- Overlay doesn't show audio visualization
- Transcription returns empty

**Solutions:**

1. **Check Microphone in System Settings:**
   - System Settings > Sound > Input
   - Verify correct microphone selected
   - Check input level (should move when speaking)

2. **Test Microphone:**

   ```bash
   # Record test audio with ffmpeg
   ffmpeg -f avfoundation -i ":0" -t 3 test.wav

   # Play back to verify
   afplay test.wav
   ```

3. **Check Browser Console:**
   - Open Developer Tools in main window (Cmd+Option+I)
   - Look for microphone permission errors
   - Check for "getUserMedia" errors

4. **Try Different Microphone:**
   - Use built-in microphone
   - External USB microphone
   - AirPods or other Bluetooth headset

### Recording Stops Immediately

**Symptoms:**

- Recording starts but stops within 1 second
- Short or no audio processed

**Solutions:**

1. **Rapid Key Press Detection:**
   - Toolify has rapid-press protection
   - Wait 1-2 seconds between presses
   - Don't spam the shortcut key

2. **Check Cooldown Period:**
   - After recording, there's a 1-second cooldown
   - Wait before starting next recording

3. **Verify No Interference:**
   - Other apps might be intercepting the shortcut
   - Try a different shortcut combination

### Audio Quality Poor

**Symptoms:**

- Transcription has many errors
- Background noise interference
- Muffled or distorted audio

**Solutions:**

1. **Improve Recording Environment:**
   - Record in quiet room
   - Close windows to reduce street noise
   - Turn off fans or AC during recording

2. **Microphone Position:**
   - Keep microphone 6-12 inches from mouth
   - Don't speak directly into microphone (slightly off-center)
   - Use pop filter if available

3. **Check Input Volume:**
   - System Settings > Sound > Input
   - Adjust input level (aim for 70-80% when speaking normally)
   - Not too low (hiss) or too high (distortion)

4. **Use Better Microphone:**
   - Built-in Mac microphone is decent but not great
   - USB microphones provide better quality
   - Headset with boom microphone works well

---

## Keyboard Shortcut Issues

### Shortcut Doesn't Work

**Symptoms:**

- Pressing configured shortcut does nothing
- Shortcut used to work but stopped

**Solutions:**

1. **Verify Accessibility Permission:**
   - Required for global shortcuts
   - See [Permission Issues](#permission-issues)

2. **Check Shortcut Conflicts:**
   - Other apps might be using the same shortcut
   - Try a different shortcut in Preferences
   - Avoid system shortcuts (Cmd+Tab, Cmd+Space default in macOS)

3. **Unsupported Shortcuts:**
   - Single modifier keys don't work (Cmd, Option, Control alone)
   - Use at least two keys: Cmd+Space, Cmd+Shift+R, etc.

4. **Re-register Shortcut:**
   - Open Preferences > Dictation
   - Change to a different shortcut
   - Save settings
   - Change back to desired shortcut
   - Save again

### Right Command Key Doesn't Work

**Symptoms:**

- Right Command doesn't trigger recording
- Left Command works fine

**Solutions:**

1. **macOS-Only Feature:**
   - Right Command only works on macOS
   - On Windows/Linux, use Command+Space or other shortcut

2. **Check uiohook Installation:**

   ```bash
   # In development mode, verify uiohook-napi
   npm list uiohook-napi

   # Reinstall if needed
   npm reinstall uiohook-napi
   ```

3. **Use Alternative Shortcut:**
   - Try Command+Space
   - Or Command+Shift+Space
   - These work more reliably

### ESC Key Doesn't Cancel Recording

**Symptoms:**

- Pressing ESC during recording doesn't cancel
- Recording continues

**Solutions:**

1. **ESC Only Works During Recording:**
   - ESC is only registered while recording
   - Does nothing when idle or processing

2. **Check Focus:**
   - ESC should work regardless of focused app
   - If it doesn't, use the overlay's cancel button instead

3. **Use Alternative Cancel:**
   - Click the X button on recording overlay
   - Or let recording finish and delete result from History

---

## Update and Installation Issues

### "App is Damaged" Error

**Symptoms:**

- "Toolify.app is damaged and can't be opened"
- Gatekeeper blocks app launch

**Solutions:**

1. **Bypass Gatekeeper (First Launch):**

   ```bash
   # Remove quarantine attribute
   sudo xattr -rd com.apple.quarantine /Applications/Toolify.app

   # Or right-click and select "Open" (not double-click)
   ```

2. **Verify Download:**
   - Only download from official GitHub releases
   - Verify SHA256 checksum if provided
   - Don't download from third-party sites

3. **Re-download:**
   - Delete damaged app
   - Download fresh DMG from GitHub
   - Try again

### Update Fails to Install

**Symptoms:**

- Update downloads but "Quit and Install" doesn't work
- App doesn't restart after update

**Solutions:**

1. **Manual Update:**
   - Download latest DMG from GitHub Releases
   - Replace existing app in /Applications
   - Launch new version

2. **Check Update Permissions:**

   ```bash
   # Verify write permissions to /Applications
   ls -la /Applications/Toolify.app

   # Fix if needed
   sudo chown -R $USER:staff /Applications/Toolify.app
   ```

3. **Clear Update Cache:**

   ```bash
   # Remove update cache
   rm ~/Library/Application\ Support/Toolify/update-config.json

   # Download update again
   ```

### Homebrew Installation Fails

**Symptoms:**

- `brew install --cask toolify` fails
- Cask not found error

**Solutions:**

1. **Update Homebrew:**

   ```bash
   brew update
   brew upgrade
   ```

2. **Add Tap:**

   ```bash
   brew tap mehmetsagir/toolify
   brew install --cask toolify
   ```

3. **Manual Installation:**
   - Download DMG from GitHub Releases
   - Install manually if Homebrew fails

---

## Clipboard and Auto-paste Issues

### Text Not Copied to Clipboard

**Symptoms:**

- Recording completes successfully
- "Processing" state ends
- But clipboard still has old content

**Solutions:**

1. **Check Transcription Result:**
   - If transcription failed or returned empty text
   - Clipboard won't be updated
   - Check console for errors

2. **Test Clipboard Manually:**

   ```bash
   # Test clipboard with pbpaste
   pbpaste

   # Should show transcribed text
   ```

3. **Check History:**
   - Open Preferences > History
   - Latest recording should appear
   - Copy manually if needed

### Auto-paste Doesn't Work

**Symptoms:**

- Text copied but not pasted
- Notification: "Text copied but could not auto-paste"

**Solutions:**

1. **Requires Accessibility Permission:**
   - Auto-paste uses AppleScript to simulate Cmd+V
   - See [Accessibility Permission](#accessibility-permission-not-granted)

2. **Check Target App:**
   - Auto-paste only works if text field is focused
   - Click in text field before recording
   - Or paste manually with Cmd+V

3. **Test AppleScript:**

   ```bash
   # Test AppleScript execution
   osascript -e 'tell application "System Events" to keystroke "v" using command down'

   # Should paste clipboard contents
   ```

4. **Disable Auto-paste:**
   - If it doesn't work reliably
   - Use manual paste (Cmd+V) instead
   - Copy from History if needed

---

## Diagnostic Information

### Collecting Diagnostic Logs

When filing bugs or asking for help, collect this information:

1. **System Information:**

   ```bash
   # macOS version
   sw_vers

   # Architecture
   uname -m

   # Available memory
   vm_stat
   ```

2. **Toolify Version:**
   - Check in Preferences (top of sidebar)
   - Or via CLI:
     ```bash
     defaults read /Applications/Toolify.app/Contents/Info.plist CFBundleShortVersionString
     ```

3. **Console Logs:**

   ```bash
   # Filter Toolify logs
   log stream --predicate 'process == "Toolify"' > toolify.log

   # Reproduce issue, then stop with Ctrl+C
   # Share toolify.log when reporting bugs
   ```

4. **Configuration:**

   ```bash
   # View Toolify settings
   cat ~/Library/Application\ Support/Toolify/settings.json

   # Check models
   ls -lh ~/Library/Application\ Support/Toolify/models/

   # Check history
   ls -lh ~/Library/Application\ Support/Toolify/history.json
   ```

5. **Network Diagnostics:**

   ```bash
   # Test OpenAI API
   curl -I https://api.openai.com/v1/models

   # Test HuggingFace CDN
   curl -I https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

   # Test GitHub
   curl -I https://github.com/mehmetsagir/toolify/releases
   ```

### When to File Bugs vs. Configuration Issues

**File a Bug If:**

- App crashes or freezes
- Feature works differently than documented
- Error messages that don't match troubleshooting guide
- Issues persist after trying all solutions
- Reproducible across different systems

**Configuration Issue If:**

- Permission-related (Accessibility, Microphone)
- API key or network connectivity
- User settings (shortcuts, languages)
- System-specific behavior
- Resolved by adjusting settings

**Bug Report Template:**

```markdown
## Description

Brief description of the issue

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- macOS Version:
- Toolify Version:
- Installation Method: [Homebrew / DMG / Source]
- Local/Online Model:

## Logs

[Attach relevant console logs]

## Diagnostics

[Results from diagnostic commands above]
```

### Getting Help

- **GitHub Issues:** https://github.com/mehmetsagir/toolify/issues
- **Documentation:** https://github.com/mehmetsagir/toolify#readme
- **Existing Issues:** Check if your problem is already reported

### Useful Commands

```bash
# Restart Toolify
killall Toolify && open /Applications/Toolify.app

# Open Toolify preferences
open /Applications/Toolify.app --args --settings

# Clear all Toolify data (last resort)
rm -rf ~/Library/Application\ Support/Toolify
rm -rf ~/Library/Caches/Toolify
defaults delete com.toolify.app

# Check for updates manually
brew upgrade --cask toolify  # If installed via Homebrew
# Or download latest from GitHub Releases
```

---

## Additional Resources

### Architecture Understanding

- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [TECH_STACK.md](TECH_STACK.md) for technology details

### Contributing

- See [PRD.md](PRD.md) for product requirements
- See [AGENTS.md](AGENTS.md) for development guidelines

### Performance Tips

1. **For Faster Transcription:**
   - Use Base or Small models instead of Medium/Large
   - Disable translation if not needed
   - Use online API for very long recordings (costs money but faster)

2. **For Better Accuracy:**
   - Use Medium or Large V3 models
   - Record in quiet environment
   - Speak clearly and at natural pace
   - Set correct source language (or use Auto)

3. **For Privacy:**
   - Use local models (no data sent to OpenAI)
   - Disable history if desired
   - Models are downloaded once and stored locally

---

**Last Updated:** January 2025
**Toolify Version:** 0.0.12
**macOS Versions Tested:** 10.12+ (Monterey, Ventura, Sonoma, Sequoia)
