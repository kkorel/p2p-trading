/**
 * WhatsApp Message Mapper — Transforms AgentMessage[] into WhatsApp-native message payloads.
 * Decides whether each message should be sent as text, image card, or voice note.
 */

import { createLogger } from '@p2p/shared';
import type { AgentMessage } from './agent';
import { synthesizeSpeech, isTTSAvailable } from './sarvam-tts';
import {
    renderDashboardCard,
    renderOfferCreatedCard,
    renderListingsCard,
    renderTopDealsCard,
    renderMatchedOffersCard,
    renderOrderConfirmationCard,
    renderEarningsCard,
    renderAutoTradeStatusCard,
} from './wa-card-renderer';
import {
    dashboardCaption,
    offerCreatedCaption,
    listingsCaption,
    topDealsCaption,
    matchedOffersCaption,
    orderConfirmationCaption,
    earningsCaption,
    autoTradeCaption,
    sliderPrompt,
    offersListText,
} from './wa-text-formatter';

const logger = createLogger('WAMessageMapper');

/**
 * A single outbound WhatsApp message — can be text, image, or voice.
 */
export interface WAOutboundMessage {
    type: 'text' | 'image' | 'voice';
    /** Text content (for text messages or image captions) */
    text?: string;
    /** PNG image buffer (for image messages) */
    imageBuffer?: Buffer;
    /** Caption for image messages */
    imageCaption?: string;
    /** Audio buffer (for voice notes) */
    audioBuffer?: Buffer;
    /** Numbered button options (appended to text) */
    buttons?: Array<{ text: string; callbackData?: string }>;
}

/**
 * Map an array of AgentMessages to WhatsApp-native outbound messages.
 * Each AgentMessage may produce 1-3 WAOutboundMessages (e.g., image + text + buttons).
 */
export async function mapAgentMessages(
    messages: AgentMessage[],
    responseLanguage?: string
): Promise<WAOutboundMessage[]> {
    const outbound: WAOutboundMessage[] = [];
    const ttsTexts: string[] = []; // Collect text for TTS voice note

    for (const msg of messages) {
        try {
            const mapped = await mapSingleMessage(msg);
            outbound.push(...mapped);

            // Collect readable text for TTS synthesis
            for (const m of mapped) {
                if (m.type === 'text' && m.text) {
                    ttsTexts.push(m.text);
                } else if (m.type === 'image' && m.imageCaption) {
                    ttsTexts.push(m.imageCaption);
                }
            }
        } catch (err: any) {
            logger.error(`Failed to map message: ${err.message}`);
            if (msg.text) {
                outbound.push({ type: 'text', text: msg.text, buttons: msg.buttons });
                ttsTexts.push(msg.text);
            }
        }
    }

    // --- Append TTS voice note ---
    if (isTTSAvailable() && ttsTexts.length > 0) {
        const combinedText = ttsTexts.join('\n\n');
        // Skip TTS for very short texts (e.g., "Session reset!")
        if (combinedText.length >= 10) {
            try {
                const audioBuffer = await synthesizeSpeech(combinedText, responseLanguage || 'en-IN');
                outbound.push({ type: 'voice', audioBuffer });
                logger.info(`TTS voice note appended (${(audioBuffer.length / 1024).toFixed(1)}KB)`);
            } catch (err: any) {
                // TTS failure is non-critical — text was already sent
                logger.warn(`TTS synthesis failed, skipping voice note: ${err.message}`);
            }
        }
    }

    return outbound;
}

/**
 * Map a single AgentMessage to one or more WAOutboundMessages.
 */
async function mapSingleMessage(msg: AgentMessage): Promise<WAOutboundMessage[]> {
    const results: WAOutboundMessage[] = [];

    // --- Dashboard Card ---
    if (msg.dashboard) {
        try {
            const imageBuffer = await renderDashboardCard(msg.dashboard);
            const caption = dashboardCaption({
                userName: msg.dashboard.userName,
                balance: msg.dashboard.balance,
                trustScore: msg.dashboard.trustScore,
                trustTier: msg.dashboard.trustTier,
            });
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Dashboard card render failed, using text fallback: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
    }

    // --- Offer Created Card ---
    else if (msg.offerCreated) {
        try {
            const imageBuffer = await renderOfferCreatedCard(msg.offerCreated);
            const caption = offerCreatedCaption(msg.offerCreated);
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Offer card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
    }

    // --- Listings Card ---
    else if (msg.listings) {
        try {
            const imageBuffer = await renderListingsCard(msg.listings);
            const caption = listingsCaption({
                userName: msg.listings.userName,
                totalListed: msg.listings.totalListed,
                totalSold: msg.listings.totalSold,
                count: msg.listings.listings.length,
            });
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Listings card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
    }

    // --- Top Deals Card ---
    else if (msg.topDeals) {
        try {
            const imageBuffer = await renderTopDealsCard(msg.topDeals);
            const caption = topDealsCaption(msg.topDeals.deals.length);
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Top deals card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
        // Add button text for deal selection
        if (msg.buttons && msg.buttons.length > 0) {
            results.push({ type: 'text', text: 'Reply with a number to select:', buttons: msg.buttons });
        }
    }

    // --- Matched Offers Card ---
    else if (msg.matchedOffers) {
        try {
            const imageBuffer = await renderMatchedOffersCard(msg.matchedOffers);
            const caption = matchedOffersCaption({
                totalQuantity: msg.matchedOffers.summary.totalQuantity,
                totalPrice: msg.matchedOffers.summary.totalPrice,
                offersUsed: msg.matchedOffers.summary.offersUsed,
            });
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Matched offers card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
        // Add confirm/reject buttons as text
        if (msg.buttons && msg.buttons.length > 0) {
            results.push({ type: 'text', text: 'Confirm this purchase?', buttons: msg.buttons });
        }
    }

    // --- Order Confirmation Card ---
    else if (msg.orderConfirmation) {
        try {
            const imageBuffer = await renderOrderConfirmationCard(msg.orderConfirmation);
            const caption = orderConfirmationCaption({
                success: msg.orderConfirmation.success,
                totalQuantity: msg.orderConfirmation.summary.totalQuantity,
                totalPrice: msg.orderConfirmation.summary.totalPrice,
            });
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Order confirmation card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
    }

    // --- Earnings Card ---
    else if (msg.earnings) {
        try {
            const imageBuffer = await renderEarningsCard(msg.earnings);
            const caption = earningsCaption({
                userName: msg.earnings.userName,
                totalEarnings: msg.earnings.totalEarnings,
                totalOrders: msg.earnings.totalOrders,
            });
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Earnings card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
    }

    // --- Auto-Trade Status Card ---
    else if (msg.autoTradeStatus) {
        try {
            const imageBuffer = await renderAutoTradeStatusCard(msg.autoTradeStatus);
            const caption = autoTradeCaption({
                sellerEnabled: msg.autoTradeStatus.seller?.enabled,
                buyerEnabled: msg.autoTradeStatus.buyer?.enabled,
            });
            results.push({ type: 'image', imageBuffer, imageCaption: caption });
        } catch (err: any) {
            logger.warn(`Auto-trade card render failed: ${err.message}`);
            results.push({ type: 'text', text: msg.text });
        }
    }

    // --- Slider → Text Prompt ---
    else if (msg.slider) {
        const prompt = sliderPrompt(msg.slider);
        // Combine the original text (question) with the slider prompt
        const fullText = msg.text ? `${msg.text}\n\n${prompt}` : prompt;
        results.push({ type: 'text', text: fullText });
    }

    // --- Offers List (from buy flow) ---
    else if (msg.offers && msg.offers.length > 0) {
        const offersText = offersListText(msg.offers.map(o => ({
            sellerName: o.sellerName,
            sellerTrustScore: o.sellerTrustScore,
            energyType: o.energyType,
            pricePerUnit: o.pricePerUnit,
            quantity: o.quantity,
            totalPrice: o.totalPrice,
            timeWindow: o.timeWindow,
            savingsPercent: o.savingsPercent,
        })));
        const fullText = msg.text ? `${msg.text}\n\n${offersText}` : offersText;
        results.push({ type: 'text', text: fullText, buttons: msg.buttons });
    }

    // --- Plain text + buttons (default) ---
    else if (msg.text) {
        results.push({ type: 'text', text: msg.text, buttons: msg.buttons });
    }

    return results;
}
