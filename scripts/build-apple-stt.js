const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectDir = path.join(__dirname, 'apple-stt')
const targetDir = path.join(__dirname, '..', 'build', 'apple-stt')
const nativeDir = path.join(__dirname, '..', 'native', 'apple-stt')
const binaryName = 'apple-stt'
const appBundleName = 'apple-stt.app'

console.log('Building Apple STT Swift CLI tool...')

// Create target directory
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// Build the Swift package
try {
  execSync('swift build -c release', {
    cwd: projectDir,
    stdio: 'inherit'
  })
  console.log('  ✓ Swift build succeeded')
} catch (error) {
  console.error('  ✗ Swift build failed:', error.message)
  process.exit(1)
}

// Find the built binary
const releaseBinary = path.join(projectDir, '.build', 'release', binaryName)

if (!fs.existsSync(releaseBinary)) {
  console.error(`  ✗ Binary not found at: ${releaseBinary}`)
  process.exit(1)
}

// Copy binary to build directory (for non-permission operations)
const targetBinary = path.join(targetDir, binaryName)
fs.copyFileSync(releaseBinary, targetBinary)
fs.chmodSync(targetBinary, 0o755)
console.log(`  ✓ Copied ${binaryName} to ${targetDir}`)

// Create .app bundle for permission requests
// macOS requires a proper .app bundle with Info.plist for requestAuthorization() to work
const appBundlePath = path.join(targetDir, appBundleName)
const appContentsPath = path.join(appBundlePath, 'Contents')
const appMacOSPath = path.join(appContentsPath, 'MacOS')

fs.mkdirSync(appMacOSPath, { recursive: true })

// Copy binary into .app bundle
const appBinaryPath = path.join(appMacOSPath, binaryName)
fs.copyFileSync(releaseBinary, appBinaryPath)
fs.chmodSync(appBinaryPath, 0o755)

// Write Info.plist for the .app bundle
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleIdentifier</key>
	<string>com.toolify.apple-stt</string>
	<key>CFBundleName</key>
	<string>Toolify Speech</string>
	<key>CFBundleExecutable</key>
	<string>${binaryName}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>LSBackgroundOnly</key>
	<true/>
	<key>NSSpeechRecognitionUsageDescription</key>
	<string>Toolify needs access to Speech Recognition to transcribe your voice recordings using Apple Speech.</string>
	<key>NSMicrophoneUsageDescription</key>
	<string>Toolify needs microphone access for voice recording and live transcription.</string>
</dict>
</plist>`

fs.writeFileSync(path.join(appContentsPath, 'Info.plist'), infoPlist)
console.log(`  ✓ Created ${appBundleName} bundle for permission requests`)

// Ad-hoc codesign the .app bundle so macOS LaunchServices can launch it.
// Without signing, `open` fails with RBSRequestErrorDomain Code=5.
try {
  execSync(`codesign --force --deep --sign - "${appBundlePath}"`, {
    stdio: 'inherit'
  })
  console.log(`  ✓ Ad-hoc signed ${appBundleName}`)
} catch (error) {
  console.warn(`  ⚠ Codesign failed (non-fatal): ${error.message}`)
}

// Copy everything to native/ directory for electron-builder extraResources.
// The build/ directory is reserved as buildResources by electron-builder,
// so extraResources must source from a different directory.
if (!fs.existsSync(nativeDir)) {
  fs.mkdirSync(nativeDir, { recursive: true })
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      // Preserve executable permissions
      const stat = fs.statSync(srcPath)
      fs.chmodSync(destPath, stat.mode)
    }
  }
}

copyDirSync(targetDir, nativeDir)

// Re-sign the copy in native/ as well
const nativeAppBundle = path.join(nativeDir, appBundleName)
try {
  execSync(`codesign --force --deep --sign - "${nativeAppBundle}"`, {
    stdio: 'inherit'
  })
} catch (error) {
  console.warn(`  ⚠ Codesign of native copy failed (non-fatal): ${error.message}`)
}

console.log(`  ✓ Copied to ${nativeDir} for packaging`)

console.log('Done building Apple STT')
