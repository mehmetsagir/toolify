import OpenAI from 'openai'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getLanguageName, cleanTranslationText } from '../../utils/helpers'

/**
 * Transcribe audio using the OpenAI Whisper API.
 * If translate is true, transcribes first (auto-detecting source language) then
 * translates the result with gpt-4o-mini to targetLanguage.
 * The temp file written to disk is always cleaned up in the finally block.
 */
export async function transcribe(
  apiKey: string,
  audioBuffer: Buffer,
  translate: boolean,
  language?: string,
  _sourceLanguage?: string, // Not used when translating (auto-detected)
  targetLanguage?: string
): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const tempFilePath = path.join(os.tmpdir(), `recording-${Date.now()}.webm`)
  fs.writeFileSync(tempFilePath, audioBuffer)

  try {
    let text = ''

    if (translate) {
      const fileStream1 = fs.createReadStream(tempFilePath)
      // Always auto-detect source language when translating
      const transcriptionPrompt = `Transcribe the audio accurately. Write naturally and preserve the meaning. Do not add any commentary or metadata.`
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: fileStream1,
        model: 'whisper-1',
        language: undefined, // Auto-detect source language
        prompt: transcriptionPrompt
      })
      const sourceText = cleanTranslationText(transcriptionResponse.text)

      const targetLangName = getLanguageName(targetLanguage || 'en')
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
            content: sourceText
          }
        ],
        temperature: 0.3
      })
      text = cleanTranslationText(translationResponse.choices[0]?.message?.content || sourceText)
    } else {
      const fileStream2 = fs.createReadStream(tempFilePath)
      const transcriptionPrompt =
        'Transcribe exactly what is said. Write naturally and accurately. Do not add any commentary, explanations, or metadata. Only return the transcription itself.'
      const response = await openai.audio.transcriptions.create({
        file: fileStream2,
        model: 'whisper-1',
        language: language || undefined,
        prompt: transcriptionPrompt
      })
      text = cleanTranslationText(response.text)
    }

    return text
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw error
  } finally {
    try {
      fs.unlinkSync(tempFilePath)
    } catch (e) {
      console.error('Failed to delete temp file', e)
    }
  }
}
