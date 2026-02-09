const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectDir = path.join(__dirname, 'apple-stt')
const targetDir = path.join(__dirname, '..', 'build', 'apple-stt')
const binaryName = 'apple-stt'

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

// Copy binary to build directory
const targetBinary = path.join(targetDir, binaryName)
fs.copyFileSync(releaseBinary, targetBinary)
fs.chmodSync(targetBinary, 0o755)
console.log(`  ✓ Copied ${binaryName} to ${targetDir}`)

console.log('Done building Apple STT')
