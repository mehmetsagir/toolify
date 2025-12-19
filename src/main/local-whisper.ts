import path from 'path'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
import { app } from 'electron'
import OpenAI from 'openai'

// Note: We no longer use whisper-node's createCppCommand due to path quoting issues
// Instead, we build the whisper.cpp command manually with proper path escaping

// Get language name for prompts
function getLanguageName(code: string): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    tr: 'Turkish',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    auto: 'the original language'
  }
  return languageNames[code] || code
}

// Clean translation text - remove unwanted metadata and commentary
function cleanTranslationText(text: string): string {
  if (!text) return text

  // Remove common unwanted patterns
  const unwantedPatterns = [
    /^translate was done with gpt/i,
    /^translation by gpt/i,
    /^translated by/i,
    /^this is a translation/i,
    /^note:.*$/im,
    /^translation:.*$/im,
    /^\[.*translation.*\]/i,
    /^\(.*translation.*\)/i
  ]

  let cleaned = text.trim()

  // Remove unwanted patterns
  for (const pattern of unwantedPatterns) {
    cleaned = cleaned.replace(pattern, '').trim()
  }

  // Remove lines that are clearly metadata
  const lines = cleaned.split('\n')
  const filteredLines = lines.filter((line) => {
    const lowerLine = line.toLowerCase().trim()
    return (
      !lowerLine.startsWith('translation:') &&
      !lowerLine.startsWith('note:') &&
      !lowerLine.includes('translated by') &&
      !lowerLine.includes('translation was done') &&
      !lowerLine.match(/^\[.*\]$/) && // Remove lines that are just brackets
      line.trim().length > 0
    )
  })

  cleaned = filteredLines.join('\n').trim()

  return cleaned || text // Return original if cleaning removed everything
}

// Check if we're in production build (packaged app)
const isProductionBuild = (): boolean => {
  return app.isPackaged || (!process.env.ELECTRON_RENDERER_URL && process.env.NODE_ENV === 'production')
}

// Get the base path for whisper.cpp executables - works in both dev and production
const getBasePath = (): string => {
  // In production, executables are in app.asar.unpacked/build/whisper-executables
  if (isProductionBuild()) {
    const resourcesPath = process.resourcesPath || app.getAppPath()
    
    const possiblePaths = [
      // Unpacked executables location (from build/whisper-executables)
      path.join(resourcesPath, 'app.asar.unpacked', 'build', 'whisper-executables'),
      // Fallback: old location (for backwards compatibility)
      path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'whisper-node', 'lib', 'whisper.cpp'),
      path.join(resourcesPath, 'node_modules', 'whisper-node', 'lib', 'whisper.cpp'),
      path.join(__dirname, '..', '..', 'node_modules', 'whisper-node', 'lib', 'whisper.cpp')
    ]
    
    console.log('Looking for whisper.cpp executables in production build...')
    for (const possiblePath of possiblePaths) {
      console.log(`  Checking: ${possiblePath}`)
      if (fs.existsSync(possiblePath)) {
        const mainPath = path.join(possiblePath, 'main')
        if (fs.existsSync(mainPath)) {
          console.log(`  Found executables at: ${possiblePath}`)
          return possiblePath
        }
      }
    }
    
    console.warn('whisper.cpp executables not found in bundle, using userData fallback')
    // Fallback: use userData directory
    const fallbackPath = path.join(app.getPath('userData'), 'whisper-executables')
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true })
    }
    return fallbackPath
  }
  
  // Development mode - use original location
  const cwd = process.cwd()
  if (cwd.includes('whisper-node/lib/whisper.cpp')) {
    return cwd
  }
  return path.join(cwd, 'node_modules/whisper-node/lib/whisper.cpp')
}

// Get models directory - always use userData (models are downloaded from CDN, never bundled)
const getModelsDir = (): string => {
  // Always store models in userData (never bundle them)
  const modelsDir = path.join(app.getPath('userData'), 'models')
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
  }
  return modelsDir
}

const getModelPath = (modelType: string): string => {
  return path.join(getModelsDir(), `ggml-${modelType}.bin`)
}

// Note: Script-based download is no longer used - we always download from HuggingFace CDN
// This ensures consistent behavior in both dev and production environments

export async function checkLocalModelExists(modelType: string): Promise<boolean> {
  const modelPath = getModelPath(modelType)
  return fs.existsSync(modelPath)
}

export async function downloadLocalModel(modelType: string): Promise<void> {
  const modelsDir = getModelsDir()
  const modelPath = getModelPath(modelType)
  
  console.log(`Downloading model ${modelType} from HuggingFace CDN...`)
  console.log(`Model will be saved to: ${modelPath}`)
  console.log(`Models directory: ${modelsDir}`)
  
  // Always use CDN download for both dev and production
  // This ensures consistent behavior and smaller bundle size
  return downloadWithCurl(modelType, modelPath, modelsDir)
}

// HuggingFace CDN URLs for Whisper models
const MODEL_URLS: Record<string, string> = {
  'tiny': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  'base': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  'small': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  'medium': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
  'large-v3': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
}

// Helper function to download model using curl from HuggingFace CDN
// Works in both dev and production environments - always downloads from CDN
function downloadWithCurl(
  modelType: string,
  modelPath: string,
  modelsDir: string
): Promise<void> {
  const modelUrl = MODEL_URLS[modelType] || `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelType}.bin`
  
  if (!MODEL_URLS[modelType]) {
    console.warn(`Unknown model type: ${modelType}, using default URL pattern`)
  }
  
  return new Promise((resolve, reject) => {
    console.log(`Downloading model ${modelType} from HuggingFace CDN...`)
    console.log(`URL: ${modelUrl}`)
    console.log(`Saving to: ${modelPath}`)
    
    // Ensure models directory exists
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true })
      console.log(`Created models directory: ${modelsDir}`)
    }
    
    // Use curl with progress indicator and retry logic
    // -L: Follow redirects
    // --progress-bar: Show progress bar
    // --fail: Fail silently on HTTP errors
    // --retry 3: Retry up to 3 times
    // --retry-delay 2: Wait 2 seconds between retries
    // -o: Output file
    const curlCommand = `curl -L --progress-bar --fail --retry 3 --retry-delay 2 -o "${modelPath}" "${modelUrl}"`
    
    console.log('Starting download...')
    exec(curlCommand, { maxBuffer: 1024 * 1024 * 100 }, (error, _stdout, stderr) => {
      if (error) {
        console.error('Model download failed:', stderr)
        // Clean up partial download
        if (fs.existsSync(modelPath)) {
          try {
            fs.unlinkSync(modelPath)
            console.log('Cleaned up partial download')
          } catch (e) {
            console.error('Failed to clean up partial download:', e)
          }
        }
        reject(new Error(`Failed to download model ${modelType} from HuggingFace CDN: ${stderr || error.message}`))
      } else {
        // Verify file was downloaded successfully
        if (fs.existsSync(modelPath)) {
          const stats = fs.statSync(modelPath)
          if (stats.size > 0) {
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
            console.log(`✓ Model download successful: ${sizeMB} MB`)
            console.log(`  Saved to: ${modelPath}`)
            resolve()
          } else {
            reject(new Error('Downloaded file is empty'))
          }
        } else {
          reject(new Error('Downloaded file not found'))
        }
      }
    })
  })
}

export async function deleteLocalModel(modelType: string): Promise<void> {
  const modelPath = getModelPath(modelType)
  if (fs.existsSync(modelPath)) {
    fs.unlinkSync(modelPath)
    console.log(`Deleted model: ${modelPath}`)
  }
}

export async function transcribeLocal(
  audioBuffer: Buffer,
  modelType: string = 'base',
  options: { 
    translate?: boolean; 
    language?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    apiKey?: string;
  } = {}
): Promise<string> {
  const tempWavPath = path.join(os.tmpdir(), `recording-${Date.now()}.wav`)
  const tempInputPath = path.join(os.tmpdir(), `recording-input-${Date.now()}.webm`)

  try {
    fs.writeFileSync(tempInputPath, audioBuffer)

    // Convert to 16kHz WAV for Whisper using ffmpeg
    // -ar 16000: Set audio sample rate to 16kHz
    // -ac 1: Set audio channels to 1 (mono)
    // -c:a pcm_s16le: Set audio codec to PCM signed 16-bit little-endian
    await new Promise<void>((resolve, reject) => {
      exec(
        `ffmpeg -i "${tempInputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${tempWavPath}"`,
        (error) => {
          if (error) {
            console.error('FFmpeg conversion failed:', error)
            reject(error)
          } else {
            resolve()
          }
        }
      )
    })

    const inputStats = fs.statSync(tempInputPath)
    const wavStats = fs.statSync(tempWavPath)
    console.log(`Audio file sizes - Input: ${inputStats.size} bytes, WAV: ${wavStats.size} bytes`)

    if (wavStats.size < 1000) {
        console.warn('WAV file is suspiciously small!')
    }

    console.log('Starting local transcription with model:', modelType)
    
    // whisper-node takes file path strings
    const modelPath = getModelPath(modelType)
    console.log('Using local model path:', modelPath)

    if (!fs.existsSync(modelPath)) {
        throw new Error(`Local model not found: ${modelType}. Please download it in Settings.`)
    }
    
    // Execute directly to bypass whisper-node's buggy parsing (it shifts/removes the first line!)
    const transcript = await new Promise<string>((resolve, reject) => {
        // Find the main executable
        const whisperDir = getBasePath() // this points to whisper.cpp folder

        let executablePath = path.join(whisperDir, 'main')
        if (!fs.existsSync(executablePath)) {
          // Try alternative paths
          const altPaths = [
            path.join(process.resourcesPath || app.getAppPath(), 'app.asar.unpacked', 'build', 'whisper-executables', 'main'),
            path.join(process.resourcesPath || app.getAppPath(), 'app.asar.unpacked', 'node_modules', 'whisper-node', 'lib', 'whisper.cpp', 'main'),
            path.join(process.resourcesPath || app.getAppPath(), 'whisper-main'),
            path.join(__dirname, '../../whisper-main'),
            'whisper-main' // fallback to PATH
          ]

          for (const altPath of altPaths) {
            if (fs.existsSync(altPath) || altPath === 'whisper-main') {
              executablePath = altPath
              break
            }
          }
        }

        console.log('Using whisper executable:', executablePath)
        console.log('Model path:', modelPath)
        console.log('Audio file:', tempWavPath)

        // Build command manually with proper quoting for paths with spaces
        const language = options.language || 'auto'
        const finalCmd = `"${executablePath}" -l ${language} -m "${modelPath}" -f "${tempWavPath}"`

        console.log('Executing whisper command:', finalCmd)
        
        // cmd is like "./main ...", so we need to run it from whisperDir
        exec(finalCmd, { cwd: whisperDir }, (error, stdout, stderr) => {
             // whisper.cpp prints details to stderr, and result to stdout (usually)
             // But if it fails, error will be set.
             // If code is 0, we take stdout.
             if (error) {
                 console.error('Whisper execution error:', stderr)
                 console.error('Error details:', error)
                 reject(error)
             } else {
                 console.log('Whisper execution raw stdout:', stdout)
                 resolve(stdout)
             }
        })
    })

    // Custom parsing logic (fixed from whisper-node's tsToArray)
    // Format: [00:00:00.000 --> 00:00:02.000]   Hello world
    const lines = transcript.match(/\[[0-9:.]+\s-->\s[0-9:.]+\].*/g) || []
    
    // Do NOT shift!
    // lines.shift() <--- This was the bug in whisper-node

    const result = lines.map(line => {
        let speech = line.split(']  ')[1]
        if (speech) {
            speech = speech.replace(/\n/g, '').trim()
            return speech
        }
        return ''
    }).join(' ').trim()

    console.log('Local transcription parsed result:', result)
    
    // Basic hallucination filter
    if (/^\[?Music\]?$/i.test(result) || /^\[?Subtitle\]?$/i.test(result)) {
            console.log('Filtered out hallucination')
            return ''
    }
    
    // If translation is requested, use OpenAI API to translate
    console.log('Translation check:', {
      translate: options.translate,
      translateType: typeof options.translate,
      hasApiKey: !!options.apiKey,
      apiKeyLength: options.apiKey?.length || 0,
      targetLanguage: options.targetLanguage,
      sourceLanguage: options.sourceLanguage
    })
    
    if (options.translate === true) {
      if (!options.apiKey || options.apiKey.length === 0) {
        console.warn('Translation requested but API key is missing. Returning original text.')
        return result
      }
      
      if (!options.targetLanguage) {
        console.warn('Translation requested but target language is missing. Returning original text.')
        return result
      }
      
      try {
        const openai = new OpenAI({ apiKey: options.apiKey })
        
        const targetLangName = getLanguageName(options.targetLanguage)
        
        console.log(`Translating to ${targetLangName} (source language auto-detected)...`)
        console.log('Source text:', result)
        
        const translationResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text to ${targetLangName}. The source language will be automatically detected from the text.

Important guidelines:
- Understand the full meaning and context of what is being said
- Provide a natural, fluent translation that sounds like it was originally written in ${targetLangName}
- Do NOT translate word-for-word - translate meaning-for-meaning
- Preserve the tone, style, and intent of the original
- Do not add, remove, or change the meaning
- Do not add any commentary, explanations, or metadata
- Only return the translation itself, nothing else`
            },
            {
              role: 'user',
              content: result
            }
          ],
          temperature: 0.3
        })
        
        const translatedText = translationResponse.choices[0]?.message?.content || result
        const cleaned = cleanTranslationText(translatedText)
        
        console.log('Translation completed:', cleaned)
        return cleaned || result
      } catch (error) {
        console.error('Translation failed, returning original text:', error)
        return result
      }
    }
    
    return result

  } catch (error) {
    console.error('Local transcription failed:', error)
    throw error
  } finally {
    try {
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath)
      if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath)
    } catch (e) {
      console.error('Failed to cleanup temp files:', e)
    }
  }
}
