/**
 * Sarvam AI — Indian language translation for Oorja chat agent.
 * Uses Sarvam's Mayura model for auto-detection + translation.
 * Supports 12 Indian languages with colloquial modes.
 */

import axios from 'axios';
import { createLogger } from '@p2p/shared';

const logger = createLogger('Sarvam');

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_BASE_URL = 'https://api.sarvam.ai';
const MAX_CHARS = 900; // mayura:v1 limit is 1000, leave margin

// Supported language codes
export type SarvamLangCode =
  | 'en-IN' | 'hi-IN' | 'bn-IN' | 'gu-IN' | 'kn-IN'
  | 'ml-IN' | 'mr-IN' | 'od-IN' | 'pa-IN' | 'ta-IN' | 'te-IN';

/** Unicode script ranges for Indian languages */
const SCRIPT_RANGES: Array<{ lang: SarvamLangCode; ranges: Array<[number, number]> }> = [
  { lang: 'hi-IN', ranges: [[0x0900, 0x097F]] }, // Devanagari (Hindi, Marathi, Sanskrit)
  { lang: 'bn-IN', ranges: [[0x0980, 0x09FF]] }, // Bengali
  { lang: 'gu-IN', ranges: [[0x0A80, 0x0AFF]] }, // Gujarati
  { lang: 'pa-IN', ranges: [[0x0A00, 0x0A7F]] }, // Gurmukhi (Punjabi)
  { lang: 'ta-IN', ranges: [[0x0B80, 0x0BFF]] }, // Tamil
  { lang: 'te-IN', ranges: [[0x0C00, 0x0C7F]] }, // Telugu
  { lang: 'kn-IN', ranges: [[0x0C80, 0x0CFF]] }, // Kannada
  { lang: 'ml-IN', ranges: [[0x0D00, 0x0D7F]] }, // Malayalam
  { lang: 'od-IN', ranges: [[0x0B00, 0x0B7F]] }, // Odia
];

/**
 * Common Hindi/Hinglish words written in Latin script.
 * Used to detect when user is writing Roman Hindi (Hinglish).
 */
const HINGLISH_MARKERS = new Set([
  // Greetings / fillers
  'namaste', 'namaskar', 'bhai', 'bhaiya', 'didi', 'ji', 'haan', 'nahi', 'nah',
  'accha', 'theek', 'sahi', 'chalo', 'acha', 'bilkul', 'zaroor',
  // Verbs
  'karo', 'karna', 'batao', 'bata', 'dikhao', 'dikha', 'chahiye', 'chahte',
  'khareed', 'kharid', 'khareedna', 'bechna', 'bech', 'daal', 'daalo', 'bana',
  'banao', 'dekho', 'dekh', 'samjho', 'samjha', 'suno', 'padho', 'likho',
  'leni', 'deni', 'milegi', 'milega', 'hogi', 'hoga', 'raha', 'rahi',
  // Question words
  'kya', 'kaise', 'kitna', 'kitne', 'kitni', 'kab', 'kahan', 'kaun', 'kyun', 'kyon',
  // Nouns
  'bijli', 'paise', 'paisa', 'kamaya', 'kamayi', 'kamai',
  'daam', 'khata', 'subah', 'dopahar', 'shaam', 'raat', 'kal', 'aaj',
  'abhi', 'pehle', 'baad', 'agle', 'pichle', 'hafte', 'mahine', 'saal',
  // Pronouns / common
  'mujhe', 'mera', 'mere', 'meri', 'aapka', 'aapke', 'aapki', 'humara', 'hamara',
  'yeh', 'ye', 'wo', 'woh', 'unka', 'iska', 'kuch', 'sab', 'bahut', 'zyada',
  // Conjunctions / particles (only unambiguously Hindi ones)
  'aur', 'ya', 'lekin', 'se', 'ke', 'ka', 'ki', 'pe', 'mein', 'tak',
  'ko', 'hai', 'hain', 'tha', 'thi', 'naya', 'purana',
  // Energy/trading domain (only Hindi-specific words)
  'bijli', 'munafa',
]);

/**
 * Detect if text is Hinglish (Hindi written in Latin/Roman script).
 * Returns a confidence score 0-1. Score > 0.2 likely Hinglish.
 */
export function detectHinglish(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let hinglishCount = 0;
  for (const word of words) {
    if (HINGLISH_MARKERS.has(word)) {
      hinglishCount++;
    }
  }

  return hinglishCount / words.length;
}

/**
 * Detect language from text using Unicode script analysis.
 * Also detects Hinglish (Roman Hindi) via keyword matching.
 * Returns the detected language code, 'hinglish', or 'en-IN'.
 */
export function detectLanguage(text: string): SarvamLangCode | 'hinglish' {
  const counts: Record<string, number> = {};

  for (const char of text) {
    const code = char.codePointAt(0)!;
    for (const { lang, ranges } of SCRIPT_RANGES) {
      for (const [start, end] of ranges) {
        if (code >= start && code <= end) {
          counts[lang] = (counts[lang] || 0) + 1;
        }
      }
    }
  }

  // Find the script with the most characters
  let maxLang: SarvamLangCode = 'en-IN';
  let maxCount = 0;
  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang as SarvamLangCode;
    }
  }

  // Need at least 2 Indic characters to consider it a native script
  if (maxCount >= 2) return maxLang;

  // Check for Hinglish (Roman Hindi) — need both ratio and minimum count
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const hinglishScore = detectHinglish(text);
  const hinglishCount = Math.round(hinglishScore * words.length);
  // Require at least 2 Hindi words AND 30% ratio to avoid false positives on short English sentences
  if (hinglishCount >= 2 && hinglishScore >= 0.3) return 'hinglish';

  return 'en-IN';
}

/**
 * Translate text using Sarvam AI's Mayura model.
 * Returns original text if translation fails or is not configured.
 */
async function translate(
  text: string,
  sourceLang: SarvamLangCode | 'auto',
  targetLang: SarvamLangCode,
  mode: 'formal' | 'modern-colloquial' = 'modern-colloquial'
): Promise<string> {
  if (!SARVAM_API_KEY) {
    logger.debug('Sarvam API key not set — skipping translation');
    return text;
  }

  // Don't translate if source and target are the same
  if (sourceLang === targetLang) return text;
  if (sourceLang !== 'auto' && sourceLang === targetLang) return text;

  // Truncate to max length
  const input = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;

  try {
    const response = await axios.post(
      `${SARVAM_BASE_URL}/translate`,
      {
        input,
        source_language_code: sourceLang,
        target_language_code: targetLang,
        speaker_gender: 'Male',
        mode,
        model: 'mayura:v1',
        enable_preprocessing: true,
      },
      {
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const translated = response.data?.translated_text;
    if (translated) {
      logger.debug(`Translated [${sourceLang} → ${targetLang}]: "${input.substring(0, 30)}..." → "${translated.substring(0, 30)}..."`);
      return translated;
    }

    return text;
  } catch (error: any) {
    logger.warn(`Translation failed [${sourceLang} → ${targetLang}]: ${error.message}`);
    return text;
  }
}

/**
 * Translate user message to English for processing by the state machine.
 */
export async function translateToEnglish(text: string, sourceLang: SarvamLangCode): Promise<string> {
  if (sourceLang === 'en-IN') return text;
  return translate(text, sourceLang, 'en-IN', 'formal');
}

/**
 * Translate agent response from English to user's language.
 * Uses modern-colloquial mode for a warm, natural tone.
 */
export async function translateFromEnglish(text: string, targetLang: SarvamLangCode): Promise<string> {
  if (targetLang === 'en-IN') return text;
  return translate(text, 'en-IN', targetLang, 'modern-colloquial');
}

/**
 * Check if Sarvam translation is available.
 */
export function isTranslationAvailable(): boolean {
  return !!SARVAM_API_KEY;
}
