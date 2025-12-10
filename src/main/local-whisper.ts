import path from 'path'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
// @ts-ignore
const { whisper } = require('whisper-node')
// @ts-ignore
const { createCppCommand } = require('whisper-node/dist/whisper')


const getBasePath = (): string => {
  const cwd = process.cwd()
  if (cwd.includes('whisper-node/lib/whisper.cpp')) {
    return cwd
  }
  return path.join(cwd, 'node_modules/whisper-node/lib/whisper.cpp')
}

const getModelPath = (modelType: string): string => {
  return path.join(getBasePath(), 'models', `ggml-${modelType}.bin`)
}

const getDownloadScriptPath = (): string => {
  return path.join(getBasePath(), 'models', 'download-ggml-model.sh')
}

export async function checkLocalModelExists(modelType: string): Promise<boolean> {
  const modelPath = getModelPath(modelType)
  return fs.existsSync(modelPath)
}

export async function downloadLocalModel(modelType: string): Promise<void> {
  const scriptPath = getDownloadScriptPath()
  
  // Ensure script is executable
  try {
    fs.chmodSync(scriptPath, '755')
  } catch (e) { 
    // ignore
  }

  return new Promise((resolve, reject) => {
    // Run the script in the models directory so it outputs there
    const modelsDir = path.dirname(scriptPath)
    
    console.log(`Downloading model ${modelType} to ${modelsDir}...`)
    
    // The script expects the model name as the first argument
    exec(`"${scriptPath}" ${modelType}`, { cwd: modelsDir }, (error, stdout, stderr) => {
      if (error) {
        console.error('Model download failed:', stderr)
        reject(error)
      } else {
        console.log('Model download success:', stdout)
        resolve()
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
  options: { translate?: boolean; language?: string } = {}
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
    
    // Log the intended command
    let cmd = ''
    try {
        cmd = createCppCommand({
            filePath: tempWavPath,
            modelPath: modelPath,
            modelName: undefined,
            options: {
                language: options.language || 'auto',
                word_timestamps: false
            }
        })
        console.log('DEBUG COMPORSED COMMAND:', cmd)
    } catch (e) {
        console.log('Error creating debug command:', e)
        throw e
    }

    // Execute directly to bypass whisper-node's buggy parsing (it shifts/removes the first line!)
    const transcript = await new Promise<string>((resolve, reject) => {
        // whisper-node shell.js uses shelljs, but we used child_process.exec above.
        // We need to run in the directory of whisper.cpp main executable
        const whisperDir = getBasePath() // this points to whisper.cpp folder
        
        // cmd is like "./main ...", so we need to run it from whisperDir
        exec(cmd, { cwd: whisperDir }, (error, stdout, stderr) => {
             // whisper.cpp prints details to stderr, and result to stdout (usually)
             // But if it fails, error will be set.
             // If code is 0, we take stdout.
             if (error) {
                 console.error('Whisper execution error:', stderr)
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
