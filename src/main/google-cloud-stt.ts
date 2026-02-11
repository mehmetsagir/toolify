/**
 * ISO 639-1 → BCP-47 language code mapping for Google Cloud Speech-to-Text.
 * Google STT does not support auto-detection; defaults to 'en-US'.
 */
const LANGUAGE_MAP: Record<string, string> = {
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
  zh: 'zh',
  ar: 'ar-SA'
}

function toBcp47(language?: string): string {
  if (!language || language === 'auto') return 'en-US'
  return LANGUAGE_MAP[language] || `${language}-${language.toUpperCase()}`
}

export async function transcribeGoogleCloud(
  apiKey: string,
  audioBuffer: Buffer,
  language?: string
): Promise<string> {
  const content = audioBuffer.toString('base64')
  const languageCode = toBcp47(language)

  const body = {
    config: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode,
      enableAutomaticPunctuation: true
    },
    audio: { content }
  }

  const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; status?: string }
    }
    const msg = errorData?.error?.message || response.statusText
    throw new Error(`Google Cloud STT error (${response.status}): ${msg}`)
  }

  const data = (await response.json()) as {
    results?: Array<{ alternatives?: Array<{ transcript?: string }> }>
  }

  if (!data.results || data.results.length === 0) {
    return ''
  }

  return data.results
    .map((r) => r.alternatives?.[0]?.transcript || '')
    .join(' ')
    .trim()
}
