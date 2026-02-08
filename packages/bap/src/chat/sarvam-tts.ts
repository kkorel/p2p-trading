/**
 * Sarvam AI Text-to-Speech Integration
 * 
 * Uses Sarvam's Bulbul v2 model for TTS.
 * Supports 11 Indian languages: Hindi, Bengali, Tamil, Telugu, Kannada,
 * Malayalam, Marathi, Gujarati, Punjabi, Odia, and English.
 * 
 * API Documentation: https://docs.sarvam.ai/api-reference-docs/text-to-speech
 */

import axios from 'axios';
import { createLogger } from '@p2p/shared';

const logger = createLogger('SarvamTTS');

// Configuration
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_CHUNK_LENGTH = 500; // Sarvam TTS limit per request
const MIN_TEXT_LENGTH = 5; // Skip very short texts

/**
 * Available speaker voices for Bulbul v2.
 */
export type TTSSpeaker =
  | 'anushka' | 'manisha' | 'vidya' | 'arya'  // female
  | 'abhilash' | 'karun' | 'hitesh';           // male

/**
 * Error types for TTS operations
 */
export type TTSErrorType =
  | 'api_key_missing'
  | 'text_too_short'
  | 'synthesis_failed'
  | 'network_error'
  | 'rate_limited';

/**
 * TTS Error with detailed information
 */
export class TTSError extends Error {
  type: TTSErrorType;
  retryable: boolean;

  constructor(type: TTSErrorType, message: string, retryable = false) {
    super(message);
    this.name = 'TTSError';
    this.type = type;
    this.retryable = retryable;
  }
}

/**
 * Options for synthesizeSpeech (object form — used by web chat routes).
 */
export interface TTSOptions {
  text: string;
  languageCode: string;
  speaker?: TTSSpeaker;
  pace?: number;
}

/**
 * Result from synthesizeSpeech (object form — used by web chat routes).
 */
export interface TTSResult {
  /** Base64-encoded WAV audio */
  audio: string;
  /** Estimated duration (0 if unknown) */
  durationMs: number;
  /** Language code used */
  languageCode: string;
}

/**
 * Check if TTS is available (same API key as STT).
 */
export function isTTSAvailable(): boolean {
  return !!SARVAM_API_KEY;
}

/**
 * Synthesize speech — overloaded for both web and WhatsApp use cases.
 * 
 * Object form (web routes):
 *   synthesizeSpeech({ text, languageCode, speaker, pace }) → { audio, durationMs, languageCode }
 * 
 * Simple form (WhatsApp mapper):
 *   synthesizeSpeech("hello", "en-IN") → Buffer
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult>;
export async function synthesizeSpeech(text: string, targetLanguageCode?: string): Promise<Buffer>;
export async function synthesizeSpeech(
  textOrOptions: string | TTSOptions,
  targetLanguageCode?: string
): Promise<Buffer | TTSResult> {
  if (typeof textOrOptions === 'object') {
    // Object form (web routes) — WAV output for browser playback
    const { text, languageCode, speaker, pace } = textOrOptions;
    const buffer = await synthesizeSpeechInternal(text, languageCode, speaker, pace);
    return {
      audio: buffer.toString('base64'),
      durationMs: 0,
      languageCode,
    };
  } else {
    // Simple form (WhatsApp mapper) — Opus output for voice notes
    return synthesizeSpeechInternal(textOrOptions, targetLanguageCode || 'en-IN', undefined, undefined, 'opus');
  }
}

/**
 * Internal: run TTS pipeline — clean text, chunk, synthesize, concatenate.
 */
async function synthesizeSpeechInternal(
  text: string,
  languageCode: string,
  speaker?: TTSSpeaker,
  pace?: number,
  codec?: string
): Promise<Buffer> {
  if (!SARVAM_API_KEY) {
    throw new TTSError('api_key_missing', 'Sarvam API key not configured. TTS unavailable.', false);
  }

  // Strip WhatsApp markdown for cleaner speech
  const cleanText = stripWhatsAppMarkdown(text);

  if (cleanText.length < MIN_TEXT_LENGTH) {
    throw new TTSError('text_too_short', 'Text too short to synthesize.', false);
  }

  // Normalize language code — Sarvam expects BCP-47 with region
  const langCode = normalizeLanguageCode(languageCode);

  logger.info(`TTS: ${cleanText.length} chars, lang: ${langCode}, speaker: ${speaker || 'anushka'}, codec: ${codec || 'wav'}`);

  // Split into chunks if text exceeds limit
  const chunks = splitTextIntoChunks(cleanText, MAX_CHUNK_LENGTH);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const buffer = await synthesizeChunk(chunk, langCode, speaker, pace, codec);
    audioBuffers.push(buffer);
  }

  // Concatenate all audio buffers
  const combined = Buffer.concat(audioBuffers);
  logger.info(`TTS complete: ${chunks.length} chunk(s), ${(combined.length / 1024).toFixed(1)}KB`);

  return combined;
}

/**
 * Synthesize a single text chunk (≤500 chars).
 */
async function synthesizeChunk(
  text: string,
  langCode: string,
  speaker?: TTSSpeaker,
  pace?: number,
  codec?: string
): Promise<Buffer> {
  try {
    // Sarvam API expects lowercase speaker names
    const speakerName = speaker || 'anushka';

    const requestBody: any = {
      text,
      target_language_code: langCode,
      model: 'bulbul:v2',
      speaker: speakerName,
      enable_preprocessing: true,
      pace: pace || 1.0,
      loudness: 1.2,
    };

    // Add codec if specified (e.g., 'opus' for WhatsApp voice notes)
    if (codec) {
      requestBody.output_audio_codec = codec;
    }

    const response = await axios.post(SARVAM_TTS_URL, requestBody, {
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });

    // Handle HTTP errors
    if (response.status !== 200) {
      const errorText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data) || 'Unknown error';

      if (response.status === 429) {
        throw new TTSError('rate_limited', 'Too many requests. Please wait.', true);
      }

      if (response.status >= 500) {
        throw new TTSError('network_error', 'Sarvam TTS service temporarily unavailable.', true);
      }

      logger.error(`Sarvam TTS error [${response.status}]: ${errorText}`);
      throw new TTSError('synthesis_failed', 'Could not synthesize speech.', true);
    }

    // Parse response — audios is an array of base64 strings
    const audios = response.data?.audios;

    if (!audios || !audios.length || !audios[0]) {
      logger.error('Sarvam TTS returned empty audios array');
      throw new TTSError('synthesis_failed', 'No audio returned from TTS.', true);
    }

    // Decode base64 to buffer
    return Buffer.from(audios[0], 'base64');

  } catch (error: unknown) {
    if (error instanceof TTSError) throw error;

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new TTSError('network_error', 'TTS request timed out.', true);
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new TTSError('network_error', 'Network error during TTS.', true);
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Unexpected TTS error: ${message}`);
    throw new TTSError('synthesis_failed', 'Something went wrong with TTS.', true);
  }
}

// --- Utilities ---

/**
 * Strip WhatsApp markdown formatting for cleaner TTS.
 */
function stripWhatsAppMarkdown(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, '$1')          // *bold* → bold
    .replace(/_([^_]+)_/g, '$1')            // _italic_ → italic
    .replace(/~([^~]+)~/g, '$1')            // ~strike~ → strike
    .replace(/```[^`]*```/g, '')            // ```code blocks``` → remove
    .replace(/`([^`]+)`/g, '$1')            // `code` → code
    .replace(/[📊⚡🛒💰🔋🏠✅❌🎯📈📉💵🔄⚙️🎤📄🔊]/g, '') // Remove emojis
    .replace(/\n{3,}/g, '\n\n')             // Collapse excess newlines
    .trim();
}

/**
 * Normalize language code for Sarvam TTS API.
 */
function normalizeLanguageCode(code: string): string {
  if (code.includes('-')) return code;
  const mapping: Record<string, string> = {
    'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN',
    'kn': 'kn-IN', 'ml': 'ml-IN', 'mr': 'mr-IN', 'gu': 'gu-IN',
    'pa': 'pa-IN', 'od': 'od-IN', 'en': 'en-IN',
  };
  return mapping[code] || 'en-IN';
}

/**
 * Split text into chunks at sentence boundaries.
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining.trim());
      break;
    }

    let splitAt = -1;
    const searchRange = remaining.substring(0, maxLength);

    // Try sentence boundaries
    for (const delimiter of ['. ', '? ', '! ', '। ', '\n']) {
      const idx = searchRange.lastIndexOf(delimiter);
      if (idx > maxLength * 0.3) {
        splitAt = idx + delimiter.length;
        break;
      }
    }

    // Fallback: comma or space
    if (splitAt === -1) {
      const commaIdx = searchRange.lastIndexOf(', ');
      if (commaIdx > maxLength * 0.3) {
        splitAt = commaIdx + 2;
      } else {
        const spaceIdx = searchRange.lastIndexOf(' ');
        splitAt = spaceIdx > 0 ? spaceIdx + 1 : maxLength;
      }
    }

    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }

  return chunks.filter(c => c.length > 0);
}
