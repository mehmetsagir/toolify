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
    ['NSMicrophoneUsageDescription', 'Toolify needs microphone access to record your voice for transcription.'],
    ['NSSpeechRecognitionUsageDescription', 'Toolify uses speech recognition to transcribe your voice recordings.'],
    ['NSDocumentsFolderUsageDescription', 'Application requests access to the Documents folder.'],
    ['NSDownloadsFolderUsageDescription', 'Application requests access to the Downloads folder.']
  ]

  for (const [key, value] of entries) {
    try {
      execSync(`/usr/libexec/PlistBuddy -c "Set :${key} ${value}" "${plistPath}"`, { stdio: 'pipe' })
    } catch {
      execSync(`/usr/libexec/PlistBuddy -c "Add :${key} string ${value}" "${plistPath}"`)
    }
    console.log(`  > set ${key}`)
  }

  console.log('  ✓ Info.plist updated with speech recognition permissions')
}
