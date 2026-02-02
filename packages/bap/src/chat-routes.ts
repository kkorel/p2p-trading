/**
 * Chat Routes — Express endpoints for the Oorja web chat.
 *
 * POST /chat/send      — Send a text message, get agent reply
 * POST /chat/upload    — Upload a PDF (base64), get agent reply
 * GET  /chat/history   — Get message history for a session
 * POST /chat/reset     — Delete session and start fresh
 */

import { Router, Request, Response } from 'express';
import { prisma, createLogger } from '@p2p/shared';
import { optionalAuthMiddleware } from './middleware';
import { processMessage, FileData } from './chat/agent';
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
    }));

    res.json({
      success: true,
      sessionId: platformId,
      messages,
      authToken: response.authToken || undefined,
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
    });
  } catch (error: any) {
    logger.error(`Chat upload error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to process upload' });
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
