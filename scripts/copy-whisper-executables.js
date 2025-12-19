const fs = require('fs')
const path = require('path')

// Copy whisper-node dist files and executables to build directory
// This avoids bundling the entire whisper-node directory (including models)
const whisperNodeDir = path.join(__dirname, '..', 'node_modules', 'whisper-node')
const sourceExecDir = path.join(whisperNodeDir, 'lib', 'whisper.cpp')
const sourceDistDir = path.join(whisperNodeDir, 'dist')
const targetExecDir = path.join(__dirname, '..', 'build', 'whisper-executables')
const targetDistDir = path.join(__dirname, '..', 'build', 'whisper-node-dist')

// Create target directories
if (!fs.existsSync(targetExecDir)) {
  fs.mkdirSync(targetExecDir, { recursive: true })
}
if (!fs.existsSync(targetDistDir)) {
  fs.mkdirSync(targetDistDir, { recursive: true })
}

// Copy executables
console.log('Copying whisper.cpp executables...')
const executables = [
  'main',
  'main-avx',
  'main-avx2',
  'main-f16c',
  'main-fma',
  'main-sse3'
]

executables.forEach(exec => {
  const sourcePath = path.join(sourceExecDir, exec)
  const targetPath = path.join(targetExecDir, exec)
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath)
    fs.chmodSync(targetPath, 0o755) // Make executable
    console.log(`  ✓ Copied ${exec}`)
  } else {
    console.warn(`  ⚠ ${exec} not found, skipping`)
  }
})

// Copy dist files recursively
console.log('Copying whisper-node dist files...')
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠ Source directory not found: ${src}`)
    return
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true })
      }
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

copyRecursive(sourceDistDir, targetDistDir)
console.log('Done copying files')

