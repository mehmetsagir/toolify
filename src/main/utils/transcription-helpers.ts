/**
 * Transcription helper functions shared between OpenAI and local Whisper implementations
 */

/**
 * Get full language name from language code for use in translation prompts
 */
export function getLanguageName(code: string): string {
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

/**
 * Clean translation text by removing unwanted metadata and commentary
 * Removes patterns like "Translated by", "Translation:", notes, etc.
 */
export function cleanTranslationText(text: string): string {
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
