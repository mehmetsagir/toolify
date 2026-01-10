# Local Whisper Models Documentation

## Overview

Toolify supports offline speech-to-text transcription using local Whisper models powered by [whisper.cpp](https://github.com/ggerganov/whisper.cpp). This enables privacy-focused transcription without requiring internet connectivity or API costs.

## Architecture

### Core Components

- **whisper.cpp**: C++ implementation of OpenAI's Whisper model for efficient CPU inference
- **Model Storage**: User data directory with CDN-based downloads
- **IPC Bridge**: Type-safe communication between main and renderer processes
- **FFmpeg Integration**: Audio format conversion for Whisper compatibility

### File Locations

```
toolify/
├── src/
│   ├── main/
│   │   └── local-whisper.ts          # Core Whisper logic
│   ├── preload/
│   │   └── index.ts                  # IPC bridge
│   ├── renderer/
│   │   └── components/settings/
│   │       └── DictationSettings.tsx # Model management UI
│   └── shared/
│       └── types/
│           ├── local-models.types.ts # Type definitions
│           └── settings.types.ts     # Settings integration
└── node_modules/
    └── whisper-node/
        └── lib/whisper.cpp/
            └── main                   # Executable (dev)
```

### Production Structure

```
Toolify.app/
└── Contents/
    └── Resources/
        └── app.asar.unpacked/
            └── build/
                └── whisper-executables/
                    └── main          # Executable (production)
```

## Available Model Types

| Model Type | Display Name            | Size    | Speed   | Accuracy | Use Case                       |
| ---------- | ----------------------- | ------- | ------- | -------- | ------------------------------ |
| `base`     | Whisper Base            | ~142 MB | Fastest | Good     | Quick transcription, real-time |
| `small`    | Whisper Small           | ~466 MB | Fast    | Better   | Balanced speed/accuracy        |
| `medium`   | Whisper Medium (GGML)   | ~1.5 GB | Medium  | High     | High accuracy needs            |
| `large-v3` | Whisper Large V3 (GGML) | ~2.9 GB | Slowest | Best     | Maximum accuracy, offline      |

### Performance Characteristics

**Speed (relative to base)**:

- base: 1.0x (baseline)
- small: ~1.5x slower
- medium: ~2.5x slower
- large-v3: ~4x slower

**Accuracy (word error rate improvement)**:

- base: baseline
- small: ~15% better
- medium: ~25% better
- large-v3: ~35% better

### Disk Space Considerations

- **Base model**: Suitable for systems with limited storage
- **Small + Medium**: ~2GB total, good for most users
- **Large V3**: Requires 3GB free space for download + additional space during extraction

## Model Download Process

### CDN Source

Models are downloaded from HuggingFace CDN:

```
https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{modelType}.bin
```

### Download Implementation

**Location**: `src/main/local-whisper.ts` → `downloadWithCurl()`

**Process**:

1. Check if models directory exists (`userData/models`)
2. Create directory if missing
3. Execute curl with retry logic:
   ```bash
   curl -L --silent --show-error --fail --retry 3 --retry-delay 2 \
     -o "{modelPath}" "{modelUrl}"
   ```
4. Track progress every 300ms via file size polling
5. Verify download success (file exists, non-zero, readable)
6. Clean up partial downloads on failure

### Progress Tracking

```typescript
interface DownloadProgress {
  percent: number // 0-100
  downloaded: number // Bytes downloaded
  total: number // Expected total bytes
}
```

**IPC Communication**:

- Main process emits `model-download-progress` event
- Renderer process listens via `onModelDownloadProgress()` callback
- Updates UI with download percentage and MB transferred

## Model Storage

### Storage Location

**macOS**: `~/Library/Application Support/Toolify/models/`

**Directory Structure**:

```
~/Library/Application Support/Toolify/models/
├── ggml-base.bin        # 142 MB
├── ggml-small.bin       # 466 MB
├── ggml-medium.bin      # 1.5 GB
└── ggml-large-v3.bin    # 2.9 GB
```

### Storage Management

**Functions**:

- `getModelsDir()`: Returns models directory path
- `getModelPath(modelType)`: Returns full path to model file
- `checkLocalModelExists(modelType)`: Checks if model is downloaded
- `deleteLocalModel(modelType)`: Removes model file
- `getLocalModelsInfo()`: Returns status of all models

**Model Info Interface**:

```typescript
interface LocalModelInfo {
  type: LocalModelType // Model identifier
  displayName: string // Human-readable name
  expectedSizeMB: number // Expected file size
  exists: boolean // Download status
  path: string // Full file path
  fileSizeMB?: number // Actual file size (if exists)
  updatedAt?: number // Last modified timestamp
}
```

## Transcription Process

### Audio Pipeline

```
Audio Input (WebM)
    ↓
FFmpeg Conversion
    ↓
16kHz WAV (mono, PCM s16le)
    ↓
whisper.cpp Inference
    ↓
Raw Transcript (timestamps)
    ↓
Text Parsing & Cleaning
    ↓
Optional Translation (OpenAI)
    ↓
Final Output
```

### Implementation Details

**Location**: `src/main/local-whisper.ts` → `transcribeLocal()`

**Step 1: Audio Conversion**

```bash
ffmpeg -i "input.webm" -ar 16000 -ac 1 -c:a pcm_s16le "output.wav"
```

**Step 2: Whisper Execution**

```bash
"{executablePath}" -l {language} -m "{modelPath}" -f "{wavPath}"
```

**Parameters**:

- `-l {language}`: Language code or 'auto' for detection
- `-m {modelPath}`: Path to GGML model file
- `-f {wavPath}`: Path to 16kHz WAV audio file

**Step 3: Output Parsing**

Raw output format:

```
[00:00:00.000 --> 00:00:02.000]   Hello world
[00:00:02.000 --> 00:00:04.000]   This is a test
```

Parsed result:

```javascript
'Hello world This is a test'
```

**Step 4: Translation (Optional)**

If `translate` option is enabled:

1. Uses OpenAI API (gpt-4o-mini)
2. Auto-detects source language
3. Translates to target language
4. Returns translation or original on failure

### Executable Resolution

**Development Mode**:

```typescript
path.join(cwd, 'node_modules/whisper-node/lib/whisper.cpp/main')
```

**Production Mode** (priority order):

1. `app.asar.unpacked/build/whisper-executables/main`
2. `app.asar.unpacked/node_modules/whisper-node/lib/whisper.cpp/main`
3. `userData/whisper-executables/main` (fallback)

**Detection**: `getBasePath()` checks `app.isPackaged` flag

## IPC Communication

### Main Process Handlers

**Location**: `src/main/index.ts`

```typescript
// Check if model exists
ipcMain.handle('check-local-model', async (_, modelType: string) => {
  return await checkLocalModelExists(modelType)
})

// Download model with progress tracking
ipcMain.handle('download-local-model', async (_, modelType: string) => {
  return await downloadLocalModel(modelType, (progress) => {
    windowToNotify?.webContents.send('model-download-progress', {
      modelType,
      percent: progress.percent,
      downloaded: progress.downloaded,
      total: progress.total
    })
  })
})

// Delete model
ipcMain.handle('delete-local-model', async (_, modelType: string) => {
  return deleteLocalModel(modelType)
})

// Get all models info
ipcMain.handle('get-local-models-info', async () => {
  return getLocalModelsInfo()
})

// Open models folder in Finder
ipcMain.handle('open-models-folder', async () => {
  const dir = getModelsDir()
  await shell.openPath(dir)
  return dir
})
```

### Renderer Process API

**Location**: `src/preload/index.ts`

```typescript
const api = {
  // Check if model is downloaded
  checkLocalModel: (modelType: LocalModelType): Promise<boolean>,

  // Download model
  downloadLocalModel: (modelType: LocalModelType): Promise<void>,

  // Delete model
  deleteLocalModel: (modelType: LocalModelType): Promise<void>,

  // Get all models status
  getLocalModelsInfo: (): Promise<LocalModelInfo[]>,

  // Open models folder
  openModelsFolder: (): Promise<string>,

  // Listen to download progress
  onModelDownloadProgress: (callback: (progress: {
    modelType: LocalModelType
    percent: number
    downloaded: number
    total: number
  }) => void): () => void
}
```

## Settings Integration

### Settings Schema

**Location**: `src/shared/types/settings.types.ts`

```typescript
interface Settings {
  // Use local Whisper vs OpenAI cloud
  useLocalModel?: boolean

  // Which model to use
  localModelType?: LocalModelType
}
```

### UI Components

**Location**: `src/renderer/src/components/settings/DictationSettings.tsx`

**Features**:

- Toggle between Local and Cloud processing
- Model selection cards with size info
- Download/delete buttons
- Real-time download progress
- Status indicators (checking, downloading, ready, missing)
- "Open Models Folder" button

## Adding New Model Types

### Step 1: Update Type Definition

**File**: `src/shared/types/local-models.types.ts`

```typescript
export type LocalModelType = 'base' | 'small' | 'medium' | 'large-v3' | 'new-model'
```

### Step 2: Add Model Metadata

**File**: `src/main/local-whisper.ts`

```typescript
// Display name
const MODEL_LABELS: Record<LocalModelType, string> = {
  // ... existing models
  'new-model': 'Whisper New Model (GGML)'
}

// HuggingFace CDN URL
const MODEL_URLS: Record<LocalModelType, string> = {
  // ... existing models
  'new-model': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-new-model.bin'
}

// Expected size
const MODEL_SIZES: Record<LocalModelType, number> = {
  // ... existing models
  'new-model': 1000 * 1024 * 1024 // ~1 GB
}
```

### Step 3: Update MODEL_TYPES Array

```typescript
export const MODEL_TYPES: LocalModelType[] = [
  'base',
  'small',
  'medium',
  'large-v3',
  'new-model' // Add here
]
```

### Step 4: UI Updates

The UI automatically renders all models in `MODEL_TYPES`, so no changes needed unless you want custom styling or descriptions.

## Error Handling

### Download Failures

**Automatic Retry**: Curl retries 3 times with 2-second delays

**Cleanup**: Partial downloads are automatically deleted on failure

**Error Messages**:

```
Failed to download model {modelType} from HuggingFace CDN: {error}
```

### Model Validation

**Checks**:

1. File exists (`fs.existsSync()`)
2. Non-zero size (`stats.size > 0`)
3. Readable (`fs.accessSync(path, fs.constants.R_OK)`)

**Validation Errors**:

```
Local model not found. Please download the model in Settings.
Model file downloaded but is not accessible
Downloaded file is empty
```

### Transcription Failures

**Common Issues**:

1. Missing model file
2. Corrupted model file
3. Invalid audio format
4. FFmpeg not installed

**Error Handling**:

```typescript
try {
  const result = await transcribeLocal(audioBuffer, modelType, options)
} catch (error) {
  console.error('Local transcription failed:', error)
  throw error
}
```

## whisper.cpp Integration

### Why whisper.cpp?

- **CPU-optimized**: No GPU required
- **Efficient memory usage**: Quantized GGML models
- **Cross-platform**: Works on macOS, Linux, Windows
- **C++ implementation**: Faster than Python-based alternatives

### Model Format

**GGML (GPT-Generated Model Language)**:

- Quantized model weights (4-bit integers)
- Smaller file sizes
- Faster loading
- CPU-optimized inference

### Command-Line Interface

**Basic Usage**:

```bash
./main -m {model} -f {file} -l {language}
```

**Output Format**:

```
whisper_execution_details: {json}
[00:00:00.000 --> 00:00:02.000]   Transcript text
```

### Performance Optimization

**Memory Usage**:

- Base: ~1GB RAM
- Small: ~1.5GB RAM
- Medium: ~2GB RAM
- Large V3: ~3GB RAM

**CPU Usage**:

- Uses all available cores via OpenMP
- Typical usage: 80-100% CPU during transcription

**Transcription Speed** (1 minute audio):

- Base: ~10-15 seconds
- Small: ~15-20 seconds
- Medium: ~25-35 seconds
- Large V3: ~40-60 seconds

## Troubleshooting

### Model Download Issues

**Problem**: Download fails
**Solutions**:

1. Check internet connection
2. Verify HuggingFace CDN is accessible
3. Check disk space (requirements above)
4. Try again (automatic retry)

**Problem**: Download stuck at 0%
**Solutions**:

1. Check if model already exists (may be verification issue)
2. Delete partial download and retry
3. Check permissions on models directory

### Transcription Issues

**Problem**: "Local model not found"
**Solutions**:

1. Open Settings → Dictation
2. Download required model
3. Check `~/Library/Application Support/Toolify/models/`

**Problem**: Poor transcription quality
**Solutions**:

1. Try larger model (small → medium → large-v3)
2. Specify language instead of 'auto'
3. Ensure clear audio input
4. Check for background noise

**Problem**: Slow transcription
**Solutions**:

1. Use smaller model (large-v3 → medium → small → base)
2. Close other applications
3. Check CPU usage
4. Consider using OpenAI cloud for faster results

### Executable Issues

**Problem**: "whisper executable not found"
**Solutions**:

1. Verify app is properly packaged
2. Check `app.asar.unpacked/build/whisper-executables/`
3. Reinstall application
4. Check console for detailed path errors

## Security & Privacy

### Data Flow

**Local Processing**:

1. Audio captured from microphone
2. Processed locally by whisper.cpp
3. No data sent to external servers (unless translation enabled)
4. Models stored in user directory

### Translation Privacy

When translation is enabled:

1. Transcript (not audio) sent to OpenAI API
2. Requires API key in settings
3. OpenAI processes text only
4. No audio data leaves device

### Model Storage

- Models stored in user's home directory
- Accessible via Finder ("Open Models Folder")
- Can be manually deleted
- Re-downloaded as needed

## Best Practices

### Model Selection

**Use Base Model When**:

- Real-time transcription needed
- Limited CPU resources
- Clear audio input
- Casual dictation

**Use Small Model When**:

- Balanced speed/accuracy needed
- General-purpose transcription
- Multiple speakers
- Moderate background noise

**Use Medium Model When**:

- High accuracy important
- Professional use
- Challenging audio conditions
- Time tolerance for slower processing

**Use Large V3 Model When**:

- Maximum accuracy required
- Offline transcription of important content
- Time not critical
- Professional documentation

### Storage Management

**Recommendations**:

1. Keep 1-2 models downloaded (e.g., base + medium)
2. Delete unused models to free space
3. Keep base model as backup
4. Download larger models only when needed

### Performance Tips

1. **Close unused apps** - frees CPU resources
2. **Use appropriate model** - bigger isn't always better
3. **Specify language** - faster than auto-detection
4. **Short recordings** - faster than long ones
5. **Good microphone** - improves accuracy at any model size

## Future Enhancements

### Potential Improvements

1. **GPU Acceleration**: Metal (macOS) or CUDA (Windows)
2. **Model Quantization**: Further reduce model sizes
3. **Streaming Transcription**: Real-time results
4. **Diarization**: Speaker identification
5. **Language Detection**: Improved auto-detection
6. **Model Caching**: Intelligent pre-loading
7. **Batch Processing**: Multiple files at once

### Community Models

Potential to support:

- Multilingual fine-tuned models
- Domain-specific models (medical, legal)
- Faster quantized variants
- Custom trained models

## References

- [whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [GGML Format](https://github.com/ggerganov/ggml)
- [HuggingFace whisper.cpp Models](https://huggingface.co/ggerganov/whisper.cpp)

## Changelog

### Current Implementation

- CDN-based downloads (no bundling)
- Progress tracking via IPC
- Multiple model support
- Production executable resolution
- FFmpeg audio conversion
- Optional OpenAI translation

### Historical Notes

**Script-based download**: Previously used download scripts in dev, CDN in production. Now unified to CDN-only for consistency.

**whisper-node tsToArray bug**: Library shifted first line of transcript. Fixed with custom parsing in `transcribeLocal()`.

**Path quoting issues**: whisper-node's `createCppCommand` had path escaping bugs. Fixed by building command manually with proper quotes.
