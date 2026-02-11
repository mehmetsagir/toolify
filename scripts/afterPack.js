const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

exports.default = async function afterPack(context) {
  console.log('  > afterPack hook running...')

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)
  const plistPath = path.join(appPath, 'Contents', 'Info.plist')

  console.log(`  > plist path: ${plistPath}`)

  if (!fs.existsSync(plistPath)) {
    console.error(`  ✗ Info.plist not found at ${plistPath}`)
    return
  }

  const entries = [
    [
      'NSMicrophoneUsageDescription',
      'Toolify needs microphone access to record your voice for transcription.'
    ],
    [
      'NSSpeechRecognitionUsageDescription',
      'Toolify uses speech recognition to transcribe your voice recordings.'
    ],
    ['NSDocumentsFolderUsageDescription', 'Application requests access to the Documents folder.'],
    ['NSDownloadsFolderUsageDescription', 'Application requests access to the Downloads folder.']
  ]

  for (const [key, value] of entries) {
    try {
      execSync(`/usr/libexec/PlistBuddy -c "Set :${key} ${value}" "${plistPath}"`, {
        stdio: 'pipe'
      })
    } catch {
      execSync(`/usr/libexec/PlistBuddy -c "Add :${key} string ${value}" "${plistPath}"`)
    }
    console.log(`  > set ${key}`)
  }

  console.log('  ✓ Info.plist updated with speech recognition permissions')

  // Copy apple-stt binaries to Resources directory.
  // extraResources doesn't reliably handle .app bundles, so we copy manually.
  const nativeSttDir = path.join(__dirname, '..', 'native', 'apple-stt')
  const targetSttDir = path.join(appPath, 'Contents', 'Resources', 'apple-stt')

  if (fs.existsSync(nativeSttDir)) {
    function copyDirSync(src, dest) {
      fs.mkdirSync(dest, { recursive: true })
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          copyDirSync(srcPath, destPath)
        } else {
          fs.copyFileSync(srcPath, destPath)
          const stat = fs.statSync(srcPath)
          fs.chmodSync(destPath, stat.mode)
        }
      }
    }
    copyDirSync(nativeSttDir, targetSttDir)

    // Re-sign the .app bundle inside the packaged app
    const innerAppBundle = path.join(targetSttDir, 'apple-stt.app')
    if (fs.existsSync(innerAppBundle)) {
      try {
        execSync(`codesign --force --deep --sign - "${innerAppBundle}"`, { stdio: 'pipe' })
        console.log('  ✓ Copied and signed apple-stt.app in Resources')
      } catch (e) {
        console.warn('  ⚠ Codesign of inner apple-stt.app failed:', e.message)
      }
    }
  } else {
    console.warn('  ⚠ native/apple-stt not found, skipping copy')
  }
}
