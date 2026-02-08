/**
 * WhatsApp Bot — Oorja agent on WhatsApp via Cloud API.
 * Uses the official Meta WhatsApp Business Platform (Cloud API).
 * Receives messages via webhooks, sends via graph.facebook.com HTTP API.
 * 
 * Rich UI: Agent responses with structured data (dashboard, offers, earnings, etc.)
 * are rendered as premium image cards via @napi-rs/canvas and sent as WhatsApp images.
 * Native interactive buttons (≤3 options) and list menus (4-10 options) are used
 * instead of numbered text for a polished user experience.
 * 
 * Setup:
 * 1. Create a Meta Developer account & Business app
 * 2. Add WhatsApp product, get Phone Number ID + Access Token
 * 3. Set webhook URL to https://your-domain.com/webhook/whatsapp
 * 4. Subscribe to the "messages" webhook field
 * 5. Set env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { createLogger, prisma } from '@p2p/shared';
import { processMessage, FileData } from './agent';
import { transcribeAudio, isSTTAvailable, STTError } from './sarvam-stt';
import { mapAgentMessages, WAOutboundMessage } from './wa-message-mapper';

const logger = createLogger('WhatsAppBot');

// --- Cloud API Config ---
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const BOT_PHONE = process.env.WHATSAPP_BOT_PHONE || ''; // Actual phone number for wa.me links
const API_BASE = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

function isConfigured(): boolean {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}


function apiHeaders() {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// --- Express Router (webhook endpoints) ---

export const whatsappWebhookRouter = Router();

/**
 * GET /webhook/whatsapp — Webhook verification (Meta sends this on setup).
 * Must respond with the hub.challenge to prove we own the endpoint.
 */
whatsappWebhookRouter.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn(`WhatsApp webhook verification failed (mode=${mode}, token=${token})`);
  return res.sendStatus(403);
});

/**
 * POST /webhook/whatsapp — Incoming messages from WhatsApp users.
 * Meta sends a JSON payload with message data.
 * Must always return 200 quickly to avoid retries.
 */
whatsappWebhookRouter.post('/whatsapp', async (req: Request, res: Response) => {
  // Always respond 200 immediately to prevent Meta retries
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validate this is a WhatsApp message event
    if (body?.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value?.messages) continue;


        const contacts = value.contacts || [];

        for (const message of value.messages) {
          const from = message.from; // phone number (e.g., "919876543210")
          const contactName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || '';

          try {
            await handleIncomingMessage(from, message, contactName);
          } catch (err: any) {
            logger.error(`Error handling WhatsApp message from ${from}: ${err.message}\n${err.stack}`);
            await sendWhatsAppMessage(from, 'Something went wrong. Please try again.');
          }
        }
      }
    }
  } catch (err: any) {
    logger.error(`Webhook processing error: ${err.message}`);
  }
});

// --- Incoming Message Handler ---

/**
 * Route incoming WhatsApp message based on type.
 */
async function handleIncomingMessage(
  from: string,
  message: any,
  contactName: string
): Promise<void> {
  if (!isConfigured()) {
    logger.warn('WhatsApp Cloud API not configured — ignoring message');
    return;
  }

  const chatId = `${from}@s.whatsapp.net`; // Keep consistent with existing session format
  const msgType = message.type;

  logger.info(`WhatsApp message from +${from} (${contactName || 'unknown'}), type: ${msgType}`);

  // Mark message as read
  markAsRead(message.id).catch(() => { });

  switch (msgType) {
    case 'text':
      await handleTextMessage(chatId, message.text?.body || '');
      break;

    case 'audio':
      await handleVoiceMessage(chatId, message.audio);
      break;

    case 'document':
      await handleDocumentMessage(chatId, message.document);
      break;

    case 'image':
      // Image with caption → treat caption as text
      if (message.image?.caption) {
        await handleTextMessage(chatId, message.image.caption);
      } else {
        await sendWhatsAppMessage(from, "I can process text messages, voice messages, and PDF/JSON documents. How can I help?");
      }
      break;

    case 'interactive':
      // Native button/list reply
      await handleInteractiveReply(chatId, message.interactive);
      break;

    case 'button':
      // Quick reply button tap
      await handleTextMessage(chatId, message.button?.text || message.button?.payload || '');
      break;

    default:
      await sendWhatsAppMessage(from, "I can help with text messages, voice messages, and PDF/JSON file uploads. How can I assist you today?");
      break;
  }
}

/**
 * Handle interactive message replies (button taps and list selections).
 */
async function handleInteractiveReply(chatId: string, interactive: any): Promise<void> {
  let text = '';

  if (interactive?.type === 'button_reply') {
    // Reply button: { id, title }
    text = interactive.button_reply?.id || interactive.button_reply?.title || '';
  } else if (interactive?.type === 'list_reply') {
    // List selection: { id, title, description }
    text = interactive.list_reply?.id || interactive.list_reply?.title || '';
  }

  if (text) {
    await handleTextMessage(chatId, text);
  }
}

/**
 * Handle text messages.
 */
async function handleTextMessage(chatId: string, text: string): Promise<void> {
  const from = chatId.replace('@s.whatsapp.net', '');
  const normalized = text.toLowerCase().trim();

  // Detect "start", "hi", "hello" as /start equivalent
  const isStart = ['start', 'hi', 'hello', 'hey', 'help', 'menu', 'begin'].includes(normalized);

  // Handle reset command
  if (['reset', 'restart', 'start over', 'clear'].includes(normalized)) {
    try {
      const session = await prisma.chatSession.findUnique({
        where: { platform_platformId: { platform: 'WHATSAPP', platformId: chatId } },
      });

      if (session) {
        await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
        await prisma.chatSession.delete({ where: { id: session.id } });
      }

      await sendWhatsAppMessage(from, 'Session reset! Send "hi" to start again.');
      return;
    } catch (err: any) {
      logger.error(`WhatsApp reset error: ${err.message}`);
    }
  }

  // Process through agent
  const response = await processMessage(
    'WHATSAPP',
    chatId,
    isStart ? '/start' : text
  );

  // Map agent responses to WhatsApp-native formats (images, text, interactive)
  const waMsgs = await mapAgentMessages(response.messages, response.responseLanguage);
  for (const waMsg of waMsgs) {
    await sendOutboundMessage(from, waMsg);
  }
}

/**
 * Handle voice messages — download, transcribe, and process.
 */
async function handleVoiceMessage(
  chatId: string,
  audio: { id: string; mime_type: string }
): Promise<void> {
  const from = chatId.replace('@s.whatsapp.net', '');

  if (!isSTTAvailable()) {
    await sendWhatsAppMessage(from, "Voice messages aren't available right now. Please type your message instead.");
    return;
  }

  try {
    // Download audio from Cloud API
    const buffer = await downloadMedia(audio.id);
    if (!buffer) {
      throw new Error('Failed to download voice message');
    }

    const mimeType = audio.mime_type || 'audio/ogg; codecs=opus';
    logger.info(`Received WhatsApp voice: ${(buffer.length / 1024).toFixed(1)}KB, mime: ${mimeType}`);

    // Let user know we're processing
    await sendWhatsAppMessage(from, '🎤 Processing your voice message...');

    // Transcribe using Sarvam
    let transcript: string;
    let languageName: string;
    let detectedLanguageCode: string | undefined;
    try {
      const result = await transcribeAudio(buffer, mimeType);
      transcript = result.transcript;
      languageName = result.languageName;
      detectedLanguageCode = result.languageCode;
      logger.info(`WhatsApp voice transcription [${languageName}]: "${transcript.substring(0, 50)}..."`);
    } catch (error) {
      if (error instanceof STTError) {
        logger.warn(`WhatsApp STT error: ${error.type} - ${error.message}`);
        await sendWhatsAppMessage(
          from,
          error.retryable
            ? `${error.message} Please try again.`
            : error.message
        );
        return;
      }
      throw error;
    }

    // Process through agent
    const response = await processMessage('WHATSAPP', chatId, transcript, undefined, undefined, {
      isVoiceInput: true,
      detectedLanguage: detectedLanguageCode,
    });

    // Map and send as rich messages
    const waMsgs = await mapAgentMessages(response.messages, response.responseLanguage);
    for (const waMsg of waMsgs) {
      await sendOutboundMessage(from, waMsg);
    }
  } catch (err: any) {
    logger.error(`WhatsApp voice error: ${err.message}\n${err.stack}`);
    await sendWhatsAppMessage(from, "I had trouble understanding that voice message. Please try again or type your message.");
  }
}

/**
 * Handle document uploads (PDF/JSON).
 */
async function handleDocumentMessage(
  chatId: string,
  doc: { id: string; mime_type: string; filename?: string }
): Promise<void> {
  const from = chatId.replace('@s.whatsapp.net', '');
  const fileName = doc.filename || '';
  const mimeType = doc.mime_type || '';

  const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isJson = mimeType.includes('json') || fileName.toLowerCase().endsWith('.json');

  if (!isPdf && !isJson) {
    await sendWhatsAppMessage(from, 'Please upload your ID document (PDF or JSON file from your electricity company).');
    return;
  }

  try {
    await sendWhatsAppMessage(from, '📄 Processing your document...');

    const buffer = await downloadMedia(doc.id);
    if (!buffer) {
      throw new Error('Failed to download document');
    }

    logger.info(`Received WhatsApp document: ${fileName}, ${(buffer.length / 1024).toFixed(1)}KB`);

    const fileData: FileData = {
      buffer,
      mimeType: isJson ? 'application/json' : 'application/pdf',
      fileName: fileName || (isJson ? 'upload.json' : 'upload.pdf'),
    };

    const label = isJson ? '[JSON credential uploaded]' : '[PDF uploaded]';
    const response = await processMessage('WHATSAPP', chatId, label, fileData);

    // Map and send as rich messages
    const waMsgs = await mapAgentMessages(response.messages, response.responseLanguage);
    for (const waMsg of waMsgs) {
      await sendOutboundMessage(from, waMsg);
    }
  } catch (err: any) {
    logger.error(`WhatsApp document error: ${err.message}\n${err.stack}`);
    await sendWhatsAppMessage(from, "I had trouble processing that document. Please try again.");
  }
}

// --- Cloud API: Media Operations ---

/**
 * Download media from WhatsApp Cloud API.
 * Two-step: GET /media/{id} for URL, then GET the URL for binary data.
 */
async function downloadMedia(mediaId: string): Promise<Buffer | null> {
  try {
    // Step 1: Get media URL
    const metaRes = await axios.get(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    const mediaUrl = metaRes.data.url;
    if (!mediaUrl) {
      logger.error(`No URL returned for media ${mediaId}`);
      return null;
    }

    // Step 2: Download the actual file
    const fileRes = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      responseType: 'arraybuffer',
    });

    return Buffer.from(fileRes.data);
  } catch (err: any) {
    logger.error(`Failed to download media ${mediaId}: ${err.message}`);
    return null;
  }
}

/**
 * Upload media to WhatsApp Cloud API.
 * Returns the media_id to use in messages.
 */
async function uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimeType);
    form.append('file', buffer, {
      filename,
      contentType: mimeType,
    });

    const res = await axios.post(`${API_BASE}/media`, form, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        ...form.getHeaders(),
      },
      maxContentLength: 16 * 1024 * 1024, // 16MB limit
    });

    const mediaId = res.data.id;
    logger.info(`Uploaded media: ${filename} (${(buffer.length / 1024).toFixed(1)}KB) → ${mediaId}`);
    return mediaId;
  } catch (err: any) {
    logger.error(`Failed to upload media: ${err.response?.data?.error?.message || err.message}`);
    return null;
  }
}

// --- Cloud API: Sending Messages ---

/**
 * Send a text message.
 * If buttons are provided, sends native interactive buttons (≤3)
 * or a list menu (4-10), falling back to numbered text for >10.
 */
async function sendWhatsAppMessage(
  to: string,
  text: string,
  buttons?: Array<{ text: string; callbackData?: string }>
): Promise<void> {
  if (!isConfigured() || !text) return;

  await sleep(200 + Math.random() * 300);

  try {
    if (buttons && buttons.length > 0 && buttons.length <= 3) {
      // Native reply buttons (up to 3)
      await sendInteractiveButtons(to, text, buttons);
    } else if (buttons && buttons.length > 3 && buttons.length <= 10) {
      // Native list menu (4-10 options)
      await sendInteractiveList(to, text, buttons);
    } else if (buttons && buttons.length > 10) {
      // Too many for native — fall back to numbered text
      const buttonText = buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
      const fullText = `${text}\n\nReply with a number:\n${buttonText}`;
      await sendTextMessage(to, fullText);
    } else {
      await sendTextMessage(to, text);
    }
  } catch (err: any) {
    logger.error(`Failed to send WhatsApp message: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Send a plain text message via Cloud API.
 */
async function sendTextMessage(to: string, text: string): Promise<void> {
  await axios.post(`${API_BASE}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  }, { headers: apiHeaders() });
}

/**
 * Send interactive reply buttons (up to 3 buttons).
 */
async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: Array<{ text: string; callbackData?: string }>
): Promise<void> {
  const interactiveButtons = buttons.slice(0, 3).map((b, i) => ({
    type: 'reply',
    reply: {
      id: b.callbackData || b.text.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 256),
      title: b.text.slice(0, 20), // WhatsApp limit: 20 chars
    },
  }));

  await axios.post(`${API_BASE}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body.slice(0, 1024) }, // WhatsApp limit
      action: {
        buttons: interactiveButtons,
      },
    },
  }, { headers: apiHeaders() });

  logger.info(`Sent interactive buttons to ${to} (${buttons.length} buttons)`);
}

/**
 * Send an interactive list menu (4-10 options).
 */
async function sendInteractiveList(
  to: string,
  body: string,
  options: Array<{ text: string; callbackData?: string }>
): Promise<void> {
  const rows = options.slice(0, 10).map((o, i) => ({
    id: o.callbackData || o.text.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 200),
    title: o.text.slice(0, 24), // WhatsApp limit: 24 chars
  }));

  await axios.post(`${API_BASE}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body.slice(0, 1024) },
      action: {
        button: 'Choose an option',
        sections: [{
          title: 'Options',
          rows,
        }],
      },
    },
  }, { headers: apiHeaders() });

  logger.info(`Sent interactive list to ${to} (${options.length} options)`);
}

/**
 * Send an image message.
 * Uploads the PNG buffer first, then sends with the media ID.
 */
async function sendImageMessage(
  to: string,
  imageBuffer: Buffer,
  caption?: string
): Promise<void> {
  if (!isConfigured()) return;

  await sleep(200 + Math.random() * 300);

  try {
    // Upload the image
    const mediaId = await uploadMedia(imageBuffer, 'image/png', 'card.png');
    if (!mediaId) {
      // Fallback: send caption as text
      if (caption) await sendWhatsAppMessage(to, caption);
      return;
    }

    // Send the image message
    await axios.post(`${API_BASE}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        id: mediaId,
        caption: caption || undefined,
      },
    }, { headers: apiHeaders() });

    logger.info(`Sent image card to ${to} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
  } catch (err: any) {
    logger.error(`Failed to send WhatsApp image: ${err.response?.data?.error?.message || err.message}`);
    // Fallback: send caption as text
    if (caption) {
      await sendWhatsAppMessage(to, caption);
    }
  }
}

/**
 * Send a voice note (audio message).
 * Uploads the audio buffer first, then sends with the media ID.
 */
async function sendVoiceMessage(
  to: string,
  audioBuffer: Buffer
): Promise<void> {
  if (!isConfigured()) return;

  await sleep(200 + Math.random() * 300);

  try {
    const mediaId = await uploadMedia(audioBuffer, 'audio/ogg; codecs=opus', 'voice.ogg');
    if (!mediaId) return;

    await axios.post(`${API_BASE}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'audio',
      audio: { id: mediaId },
    }, { headers: apiHeaders() });

    logger.info(`Sent voice note to ${to} (${(audioBuffer.length / 1024).toFixed(1)}KB)`);
  } catch (err: any) {
    logger.error(`Failed to send WhatsApp voice note: ${err.response?.data?.error?.message || err.message}`);
  }
}

/**
 * Dispatch a WAOutboundMessage to the right send function.
 */
async function sendOutboundMessage(
  to: string,
  msg: WAOutboundMessage
): Promise<void> {
  switch (msg.type) {
    case 'image':
      if (msg.imageBuffer) {
        await sendImageMessage(to, msg.imageBuffer, msg.imageCaption);
      }
      break;

    case 'voice':
      if (msg.audioBuffer) {
        await sendVoiceMessage(to, msg.audioBuffer);
      }
      break;

    case 'text':
    default:
      if (msg.text) {
        await sendWhatsAppMessage(to, msg.text, msg.buttons);
      }
      break;
  }
}

/**
 * Mark a message as read (shows blue ticks).
 */
async function markAsRead(messageId: string): Promise<void> {
  try {
    await axios.post(`${API_BASE}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }, { headers: apiHeaders() });
  } catch {
    // Non-critical — ignore errors
  }
}

// --- Public API (for proactive messages, etc.) ---

/**
 * Check if WhatsApp Cloud API is configured.
 */
export function isWhatsAppConnected(): boolean {
  return isConfigured();
}

/**
 * Get WhatsApp connection state.
 * Cloud API is stateless — configured means ready.
 */
export function getWhatsAppState(): 'disconnected' | 'connecting' | 'connected' {
  return isConfigured() ? 'connected' : 'disconnected';
}

/**
 * Send a proactive message to a user by phone number.
 * Used for notifications (order updates, welcome messages, etc.)
 * 
 * @param phoneNumber - Phone number (with or without + prefix, e.g., "919876543210")
 * @param text - Message text
 * @param buttons - Optional buttons
 * @returns true if sent successfully, false otherwise
 */
export async function sendProactiveMessage(
  phoneNumber: string,
  text: string,
  buttons?: Array<{ text: string; callbackData?: string }>
): Promise<boolean> {
  if (!isConfigured()) {
    logger.warn('Cannot send proactive message: WhatsApp Cloud API not configured');
    return false;
  }

  if (!phoneNumber || !text) {
    logger.warn('Cannot send proactive message: missing phone number or text');
    return false;
  }

  // Normalize phone number — remove non-digits and leading +
  let normalized = phoneNumber.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }

  if (!normalized || normalized.length < 7) {
    logger.warn(`Cannot send proactive message: invalid phone number "${phoneNumber}"`);
    return false;
  }

  logger.info(`Sending proactive message to ${normalized}`);

  try {
    await sendWhatsAppMessage(normalized, text, buttons);
    logger.info(`Proactive message sent successfully to ${normalized}`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to send proactive message to ${normalized}: ${err.message}`);
    return false;
  }
}

/**
 * Get the bot's WhatsApp number (for deep links).
 */
export function getWhatsAppBotNumber(): string | null {
  if (isConfigured() && BOT_PHONE) {
    return BOT_PHONE;
  }
  return null;
}

/**
 * No-op for Cloud API (no persistent connection to stop).
 * Kept for API compatibility with index.ts shutdown handler.
 */
export function stopWhatsAppBot(): void {
  logger.info('WhatsApp Cloud API does not require shutdown');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
