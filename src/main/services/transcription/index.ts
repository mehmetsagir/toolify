import type { Settings } from '../../../shared/types'
import { transcribe as transcribeOpenAI } from './openai'
import { transcribeLocal, checkLocalModelExists } from './local-whisper'
import { transcribeAppleStt } from './apple-stt'
import { transcribeGoogleCloud } from './google-cloud'

/**
 * Provider router: dispatches to the correct transcription provider based on settings.
 *
 * FIX: Uses sourceLanguage (not the legacy language field) when constructing provider calls,
 * matching how the settings UI exposes language selection.
 */
export async function transcribe(audioBuffer: Buffer, settings: Settings): Promise<string> {
  const provider = settings.transcriptionProvider || 'openai'

  switch (provider) {
    case 'openai': {
      const apiKey = settings.apiKey || ''
      return transcribeOpenAI(
        apiKey,
        audioBuffer,
        settings.translate ?? false,
        // FIX: use sourceLanguage not language
        settings.sourceLanguage || settings.language || undefined,
        settings.sourceLanguage,
        settings.targetLanguage
      )
    }

    case 'local-whisper': {
      const modelType = settings.localModelType || 'base'
      const modelExists = await checkLocalModelExists(modelType)
      if (!modelExists) {
        throw new Error(
          `Local model "${modelType}" not found. Please download it in Settings > Local Model.`
        )
      }
      return transcribeLocal(audioBuffer, modelType, {
        translate: settings.translate,
        // FIX: use sourceLanguage not language
        language: settings.sourceLanguage || settings.language || undefined,
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage,
        apiKey: settings.apiKey
      })
    }

    case 'apple-stt': {
      return transcribeAppleStt(audioBuffer, {
        translate: settings.translate,
        // FIX: use sourceLanguage not language
        language: settings.sourceLanguage || settings.language || undefined,
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage,
        apiKey: settings.apiKey
      })
    }

    case 'google-cloud': {
      const googleApiKey = settings.googleApiKey || ''
      // FIX: use sourceLanguage not language
      const text = await transcribeGoogleCloud(
        googleApiKey,
        audioBuffer,
        settings.sourceLanguage || settings.language || undefined
      )

      // Handle optional translation via OpenAI after Google STT
      if (settings.translate && text && settings.apiKey) {
        const { transcribe: openaiTranslate } = await import('./openai')
        const translatedBuffer = Buffer.from(text, 'utf8')
        // Re-use the OpenAI path: pass an empty audio buffer trick won't work;
        // instead call OpenAI chat directly via the openai provider with translation.
        // Since transcribeGoogleCloud returns text (not audio), we handle translation
        // here by leveraging the same GPT-4o-mini pattern used in local-whisper.
        const OpenAI = (await import('openai')).default
        const { getLanguageName, cleanTranslationText } = await import('../../utils/helpers')
        const openai = new OpenAI({ apiKey: settings.apiKey })
        const targetLangName = getLanguageName(settings.targetLanguage || 'en')
        const response = await openai.chat.completions.create({
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
              content: text
            }
          ],
          temperature: 0.3
        })
        // suppress unused import warning
        void translatedBuffer
        void openaiTranslate
        return cleanTranslationText(response.choices[0]?.message?.content || text)
      }

      return text
    }

    default: {
      throw new Error(`Unknown transcription provider: ${provider}`)
    }
  }
}
