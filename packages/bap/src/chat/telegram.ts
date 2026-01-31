/**
 * Telegram Bot — Oorja agent on Telegram.
 * Uses Telegraf for bot framework. Only starts if TELEGRAM_BOT_TOKEN is set.
 */

import { createLogger } from '@p2p/shared';
import { processMessage, FileData } from './agent';

const logger = createLogger('TelegramBot');

let bot: any = null; // Telegraf instance (lazy-imported)

/**
 * Start the Telegram bot (long polling for dev, webhook for prod).
 * No-op if TELEGRAM_BOT_TOKEN is not set.
 */
export async function startTelegramBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.info('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
    return;
  }

  try {
    // Lazy import telegraf so the app doesn't fail if not installed
    const { Telegraf } = await import('telegraf');
    bot = new Telegraf(token);

    // /start command
    bot.start(async (ctx: any) => {
      try {
        const chatId = String(ctx.chat.id);
        const response = await processMessage('TELEGRAM', chatId, '/start');
        for (const msg of response.messages) {
          await sendTelegramMessage(ctx, msg.text, msg.buttons);
        }
      } catch (err: any) {
        logger.error(`Telegram /start error: ${err.message}`);
        await ctx.reply('Something went wrong. Please try again.');
      }
    });

    // Text messages
    bot.on('text', async (ctx: any) => {
      try {
        const chatId = String(ctx.chat.id);
        const text = ctx.message.text;
        const response = await processMessage('TELEGRAM', chatId, text);
        for (const msg of response.messages) {
          await sendTelegramMessage(ctx, msg.text, msg.buttons);
        }
      } catch (err: any) {
        logger.error(`Telegram text error: ${err.message}`);
        await ctx.reply('Something went wrong. Please try again.');
      }
    });

    // Document uploads (PDF)
    bot.on('document', async (ctx: any) => {
      try {
        const chatId = String(ctx.chat.id);
        const doc = ctx.message.document;

        if (!doc.mime_type?.includes('pdf')) {
          await ctx.reply('Please upload a PDF document.');
          return;
        }

        // Download the file
        const fileLink = await ctx.telegram.getFileLink(doc.file_id);
        const axios = (await import('axios')).default;
        const fileResponse = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(fileResponse.data);

        const fileData: FileData = {
          buffer,
          mimeType: doc.mime_type || 'application/pdf',
          fileName: doc.file_name || 'upload.pdf',
        };

        await ctx.reply('Processing your document...');

        const response = await processMessage('TELEGRAM', chatId, '[PDF uploaded]', fileData);
        for (const msg of response.messages) {
          await sendTelegramMessage(ctx, msg.text, msg.buttons);
        }
      } catch (err: any) {
        logger.error(`Telegram document error: ${err.message}`);
        await ctx.reply('I had trouble processing that file. Please try again.');
      }
    });

    // Inline keyboard callback queries
    bot.on('callback_query', async (ctx: any) => {
      try {
        const chatId = String(ctx.chat?.id || ctx.callbackQuery.message?.chat?.id);
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        const response = await processMessage('TELEGRAM', chatId, data);
        for (const msg of response.messages) {
          await sendTelegramMessage(ctx, msg.text, msg.buttons);
        }
      } catch (err: any) {
        logger.error(`Telegram callback error: ${err.message}`);
      }
    });

    // Launch bot (long polling)
    await bot.launch();
    logger.info('Telegram bot started (long polling)');
  } catch (err: any) {
    logger.error(`Failed to start Telegram bot: ${err.message}`);
    bot = null;
  }
}

/**
 * Stop the Telegram bot gracefully.
 */
export function stopTelegramBot(): void {
  if (bot) {
    bot.stop('SIGTERM');
    logger.info('Telegram bot stopped');
    bot = null;
  }
}

/**
 * Send a message with optional inline keyboard buttons.
 */
async function sendTelegramMessage(
  ctx: any,
  text: string,
  buttons?: Array<{ text: string; callbackData?: string }>
): Promise<void> {
  if (!text) return;

  if (buttons && buttons.length > 0) {
    const keyboard = buttons.map((b) => [
      { text: b.text, callback_data: b.callbackData || b.text },
    ]);
    await ctx.reply(text, {
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    await ctx.reply(text);
  }
}
