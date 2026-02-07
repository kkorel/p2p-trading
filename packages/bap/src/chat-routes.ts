/**
 * Chat Routes — Express endpoints for the Oorja web chat.
 *
 * POST /chat/send      — Send a text message, get agent reply
 * POST /chat/upload    — Upload a PDF (base64), get agent reply
 * POST /chat/voice     — Upload audio (base64), transcribe and get agent reply
 * GET  /chat/history   — Get message history for a session
 * POST /chat/reset     — Delete session and start fresh
 */

import { Router, Request, Response } from 'express';
import { prisma, createLogger } from '@p2p/shared';
import { optionalAuthMiddleware } from './middleware';
import { processMessage, FileData, VoiceInputOptions } from './chat/agent';
import { transcribeBase64Audio, isSTTAvailable, STTError } from './chat/sarvam-stt';
import { synthesizeSpeech, isTTSAvailable, TTSError, type TTSSpeaker } from './chat/sarvam-tts';
import { transliterateToNativeScript, type SarvamLangCode } from './chat/sarvam';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('ChatRoutes');
const router = Router();

// All chat routes use optional auth — authenticated users get their userId-based
// platformId; anonymous users get a generated session ID.
router.use(optionalAuthMiddleware);

/**
 * Resolve the web platform ID for this request.
 * Priority: sessionId (for continuity after in-chat auth) > auth token > generate new.
 */
function resolvePlatformId(req: Request, sessionId?: string): string {
  // Prioritize sessionId for session continuity (user may have authenticated mid-chat)
  if (sessionId) return sessionId;
  if (req.user) return `web-${req.user.id}`;
  return `anon-${uuidv4()}`;
}

/**
 * POST /chat/send
 * Body: { message: string, sessionId?: string }
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const platformId = resolvePlatformId(req, sessionId);
    const response = await processMessage('WEB', platformId, message.trim(), undefined, req.user?.id);

    // Map agent messages to a simpler shape for the frontend
    const messages = response.messages.map((m) => ({
      role: 'agent' as const,
      content: m.text,
      buttons: m.buttons || undefined,
      offers: m.offers || undefined,
    }));

    res.json({
      success: true,
      sessionId: platformId,
      messages,
      authToken: response.authToken || undefined,
      responseLanguage: response.responseLanguage,
      voiceOutputEnabled: response.voiceOutputEnabled,
    });
  } catch (error: any) {
    logger.error(`Chat send error: ${error.message}\n${error.stack}`);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

/**
 * POST /chat/upload
 * Body: { pdfBase64: string, sessionId?: string, fileName?: string }
 * Accepts both PDF and JSON credential files.
 */
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, sessionId, fileName } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'pdfBase64 is required' });
    }

    const platformId = resolvePlatformId(req, sessionId);
    const buffer = Buffer.from(pdfBase64, 'base64');

    // Detect mimeType from file extension
    const name = fileName || 'upload.pdf';
    const isJson = name.toLowerCase().endsWith('.json');
    const mimeType = isJson ? 'application/json' : 'application/pdf';

    const fileData: FileData = {
      buffer,
      mimeType,
      fileName: name,
    };

    const label = isJson ? '[JSON credential uploaded]' : '[PDF uploaded]';
    const response = await processMessage('WEB', platformId, label, fileData, req.user?.id);

    const messages = response.messages.map((m) => ({
      role: 'agent' as const,
      content: m.text,
      buttons: m.buttons || undefined,
    }));

    res.json({
      success: true,
      sessionId: platformId,
      messages,
      authToken: response.authToken || undefined,
      responseLanguage: response.responseLanguage,
      voiceOutputEnabled: response.voiceOutputEnabled,
    });
  } catch (error: any) {
    logger.error(`Chat upload error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to process upload' });
  }
});

/**
 * POST /chat/voice
 * Body: { audio: string (base64), mimeType: string, sessionId?: string }
 * 
 * Transcribes audio using Sarvam AI and sends the transcript to the agent.
 * Returns both the transcript and the agent's response.
 */
router.post('/voice', async (req: Request, res: Response) => {
  try {
    const { audio, mimeType, sessionId } = req.body;

    // Validate input
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'audio (base64) is required',
        errorType: 'invalid_input',
      });
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'mimeType is required',
        errorType: 'invalid_input',
      });
    }

    // Check if STT is available
    if (!isSTTAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Voice input is not available. Please type your message instead.',
        errorType: 'service_unavailable',
      });
    }

    const platformId = resolvePlatformId(req, sessionId);

    // Transcribe the audio
    let transcription;
    try {
      transcription = await transcribeBase64Audio(audio, mimeType);
    } catch (error) {
      if (error instanceof STTError) {
        logger.warn(`STT error: ${error.type} - ${error.message}`);
        return res.status(error.type === 'rate_limited' ? 429 : 400).json({
          success: false,
          error: error.message,
          errorType: error.type,
          retryable: error.retryable,
        });
      }
      throw error;
    }

    logger.info(`Voice transcription: "${transcription.transcript.substring(0, 50)}..." [${transcription.languageName}]`);

    // Get user's language preference from session (for transliteration)
    const existingSession = await prisma.chatSession.findUnique({
      where: { platform_platformId: { platform: 'WEB', platformId } },
    });
    const sessionCtx = existingSession?.contextJson ? JSON.parse(existingSession.contextJson) : {};
    const userLanguage = (sessionCtx.language || transcription.languageCode) as SarvamLangCode;

    // Transliterate transcript to user's selected language script
    // This converts Roman script names (e.g., "Aryan") to native script (e.g., "अर्यन")
    let displayTranscript = transcription.transcript;
    if (userLanguage !== 'en-IN' && userLanguage !== transcription.languageCode) {
      displayTranscript = await transliterateToNativeScript(transcription.transcript, userLanguage);
      if (displayTranscript !== transcription.transcript) {
        logger.info(`Transliterated transcript: "${transcription.transcript}" → "${displayTranscript}"`);
      }
    }

    // Send the transcript to the agent with voice language info
    const voiceOptions: VoiceInputOptions = {
      detectedLanguage: transcription.languageCode,
      isVoiceInput: true,
    };
    const response = await processMessage('WEB', platformId, transcription.transcript, undefined, req.user?.id, voiceOptions);

    // Map agent messages to frontend format
    const messages = response.messages.map((m) => ({
      role: 'agent' as const,
      content: m.text,
      buttons: m.buttons || undefined,
    }));

    res.json({
      success: true,
      sessionId: platformId,
      transcript: displayTranscript, // Use transliterated transcript for display
      language: transcription.languageCode,
      languageName: transcription.languageName,
      processingTimeMs: transcription.processingTimeMs,
      messages,
      authToken: response.authToken || undefined,
      responseLanguage: response.responseLanguage || userLanguage,
      voiceOutputEnabled: response.voiceOutputEnabled,
      autoVoice: response.autoVoice, // Auto-play voice when input was voice
    });
  } catch (error: any) {
    logger.error(`Chat voice error: ${error.message}\n${error.stack}`);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice message',
      errorType: 'server_error',
      retryable: true,
    });
  }
});

/**
 * POST /chat/tts
 * Body: { text: string, languageCode: string, speaker?: string, pace?: number }
 * 
 * Converts text to speech using Sarvam Bulbul model.
 * Returns base64 encoded WAV audio.
 */
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, languageCode, speaker, pace } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'text is required',
        errorType: 'invalid_input',
      });
    }

    if (!languageCode || typeof languageCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'languageCode is required',
        errorType: 'invalid_input',
      });
    }

    // Check if TTS is available
    if (!isTTSAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Voice output is not available.',
        errorType: 'service_unavailable',
      });
    }

    // Synthesize speech
    let result;
    try {
      result = await synthesizeSpeech({
        text: text.trim(),
        languageCode,
        speaker: (speaker as TTSSpeaker) || 'anushka',
        pace: pace ? parseFloat(pace) : undefined,
      });
    } catch (error) {
      if (error instanceof TTSError) {
        logger.warn(`TTS error: ${error.type} - ${error.message}`);
        return res.status(error.type === 'rate_limited' ? 429 : 400).json({
          success: false,
          error: error.message,
          errorType: error.type,
          retryable: error.retryable,
        });
      }
      throw error;
    }

    res.json({
      success: true,
      audio: result.audio,
      mimeType: 'audio/wav',
      durationMs: result.durationMs,
      languageCode: result.languageCode,
    });
  } catch (error: any) {
    logger.error(`Chat TTS error: ${error.message}\n${error.stack}`);
    res.status(500).json({
      success: false,
      error: 'Failed to generate speech',
      errorType: 'server_error',
      retryable: true,
    });
  }
});

/**
 * GET /chat/history?sessionId=...
 * Returns all messages for the session, oldest first.
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const platformId = resolvePlatformId(req, req.query.sessionId as string | undefined);

    const session = await prisma.chatSession.findUnique({
      where: { platform_platformId: { platform: 'WEB', platformId } },
      select: { id: true, state: true },
    });

    if (!session) {
      return res.json({ success: true, messages: [], state: null });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, metadataJson: true, createdAt: true },
    });

    const formatted = messages.map((m) => {
      const meta = m.metadataJson ? JSON.parse(m.metadataJson) : undefined;
      return {
        role: m.role as 'agent' | 'user',
        content: m.content,
        buttons: meta?.buttons || undefined,
        createdAt: m.createdAt,
      };
    });

    res.json({ success: true, messages: formatted, state: session.state });
  } catch (error: any) {
    logger.error(`Chat history error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

/**
 * POST /chat/reset
 * Deletes the current session so the user starts fresh.
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const platformId = resolvePlatformId(req, req.body?.sessionId);

    const session = await prisma.chatSession.findUnique({
      where: { platform_platformId: { platform: 'WEB', platformId } },
    });

    if (session) {
      await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
      await prisma.chatSession.delete({ where: { id: session.id } });
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Chat reset error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to reset chat' });
  }
});

export default router;
