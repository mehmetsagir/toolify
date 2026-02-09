import path from 'path'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
import { app } from 'electron'
import OpenAI from 'openai'
import { getLanguageName, cleanTranslationText } from './utils/transcription-helpers'
import { logger } from './utils/logger'

const isProductionBuild = (): boolean => {
  return (
    app.isPackaged || (!process.env.ELECTRON_RENDERER_URL && process.env.NODE_ENV === 'production')
  )
}

export const getAppleSttPath = (): string => {
  const projectRoot = process.cwd()
  const buildPath = path.join(projectRoot, 'build', 'apple-stt', 'apple-stt')

  if (fs.existsSync(buildPath)) {
    return buildPath
  }

  if (isProductionBuild()) {
    const resourcesPath = process.resourcesPath || app.getAppPath()
    const possiblePaths = [
      path.join(resourcesPath, 'app.asar.unpacked', 'build', 'apple-stt', 'apple-stt')
    ]

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath
      }
    }
  }

  return buildPath
}

// Map ISO 639-1 language codes to locale identifiers for SFSpeechRecognizer
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ru: 'ru-RU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar-SA'
}

export function getLocaleForLanguage(language?: string): string | undefined {
  if (!language || language === 'auto') return undefined
  return LANGUAGE_TO_LOCALE[language] || undefined
}

export interface AppleSttAvailability {
  available: boolean
  permissionGranted: boolean
  supportsOnDevice?: boolean
}

export async function checkAppleSttAvailability(language?: string): Promise<AppleSttAvailability> {
  const executablePath = getAppleSttPath()

  if (!fs.existsSync(executablePath)) {
    return { available: false, permissionGranted: false }
  }

  const locale = getLocaleForLanguage(language)
  const langArg = locale ? ` --language ${locale}` : ''
  const cmd = `"${executablePath}" --check${langArg}`

  return new Promise((resolve) => {
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        logger.log('Apple STT check failed:', stderr || error.message)
        resolve({ available: false, permissionGranted: false })
        return
      }

      try {
        const result = JSON.parse(stdout.trim())
        resolve({
          available: result.available ?? false,
          permissionGranted: result.permissionGranted ?? false,
          supportsOnDevice: result.supportsOnDevice
        })
      } catch {
        logger.log('Apple STT check parse error:', stdout)
        resolve({ available: false, permissionGranted: false })
      }
    })
  })
}

export async function transcribeAppleStt(
  audioBuffer: Buffer,
  options: {
    translate?: boolean
    language?: string
    sourceLanguage?: string
    targetLanguage?: string
    apiKey?: string
  } = {}
): Promise<string> {
  const tempWavPath = path.join(os.tmpdir(), `recording-apple-stt-${Date.now()}.wav`)
  const tempInputPath = path.join(os.tmpdir(), `recording-apple-stt-input-${Date.now()}.webm`)

  try {
    fs.writeFileSync(tempInputPath, audioBuffer)

    // Convert to 16kHz WAV for SFSpeechRecognizer
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

    const wavStats = fs.statSync(tempWavPath)
    logger.log(`Apple STT - WAV file size: ${wavStats.size} bytes`)

    if (wavStats.size < 1000) {
      console.warn('WAV file is suspiciously small!')
    }

    const executablePath = getAppleSttPath()

    if (!fs.existsSync(executablePath)) {
      throw new Error(
        `Apple STT executable not found at: ${executablePath}\n` +
          'Please build the apple-stt tool with: node scripts/build-apple-stt.js'
      )
    }

    logger.log('Using Apple STT executable:', executablePath)

    const locale = getLocaleForLanguage(options.language || options.sourceLanguage)
    const langArg = locale ? ` --language ${locale}` : ''
    const cmd = `"${executablePath}" --file "${tempWavPath}"${langArg}`

    logger.log('Executing Apple STT command:', cmd)

    const result = await new Promise<string>((resolve, reject) => {
      exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          const exitCode = error.code
          if (exitCode === 2) {
            reject(
              new Error(
                'Speech recognition permission denied. Please grant permission in System Settings > Privacy & Security > Speech Recognition.'
              )
            )
          } else if (exitCode === 3) {
            reject(new Error('Speech recognizer is not available for the selected language.'))
          } else if (exitCode === 4) {
            reject(new Error('Audio file not found.'))
          } else {
            console.error('Apple STT execution error:', stderr)
            reject(error)
          }
          return
        }
        resolve(stdout.trim())
      })
    })

    logger.log('Apple STT transcription result:', result)

    // Basic hallucination filter
    if (!result || result.length === 0) {
      return ''
    }

    // If translation is requested, use OpenAI GPT-4o-mini (same pattern as local-whisper.ts)
    if (options.translate === true) {
      if (!options.apiKey || options.apiKey.length === 0) {
        console.warn('Translation requested but API key is missing. Returning original text.')
        return result
      }

      if (!options.targetLanguage) {
        console.warn(
          'Translation requested but target language is missing. Returning original text.'
        )
        return result
      }

      try {
        const openai = new OpenAI({ apiKey: options.apiKey })
        const targetLangName = getLanguageName(options.targetLanguage)

        logger.log(`Translating to ${targetLangName} (source language auto-detected)...`)

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

        logger.log('Translation completed:', cleaned)
        return cleaned || result
      } catch (error) {
        console.error('Translation failed, returning original text:', error)
        return result
      }
    }

    return result
  } catch (error) {
    console.error('Apple STT transcription failed:', error)
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
