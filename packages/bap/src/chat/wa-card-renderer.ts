/**
 * WhatsApp Card Renderer — Generates premium PNG card images for WhatsApp.
 * Uses @napi-rs/canvas to draw structured AgentMessage data as visual cards.
 * Supports English + Hindi (Devanagari) text via Noto Sans fonts.
 */

import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import * as path from 'path';
import { createLogger } from '@p2p/shared';

const logger = createLogger('WACardRenderer');

// --- Font Registration ---
const FONTS_DIR = path.join(__dirname, 'fonts');
try {
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSans.ttf'), 'Noto Sans');
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSansDevanagari.ttf'), 'Noto Sans Devanagari');
    logger.info('Fonts registered: Noto Sans, Noto Sans Devanagari');
} catch (err: any) {
    logger.warn(`Font registration failed: ${err.message}`);
}

// --- Design Tokens ---
const CARD_WIDTH = 600;
const PADDING = 24;
const FONT_FAMILY = '"Noto Sans", "Noto Sans Devanagari", sans-serif';

const COLORS = {
    bg: '#0f1117',
    cardBg: '#1a1d27',
    cardBorder: '#2a2d3a',
    headerGradientStart: '#1e40af',
    headerGradientEnd: '#7c3aed',
    sellGradientStart: '#047857',
    sellGradientEnd: '#059669',
    buyGradientStart: '#b45309',
    buyGradientEnd: '#d97706',
    successGradient: '#059669',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#60a5fa',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    divider: '#2a2d3a',
    rowAlt: '#1e2130',
};

// --- Helper Functions ---

function drawRoundedRect(
    ctx: SKRSContext2D,
    x: number, y: number, w: number, h: number,
    radius: number
) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawCardBackground(ctx: SKRSContext2D, width: number, height: number) {
    // Full background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Card body with rounded corners
    drawRoundedRect(ctx, 8, 8, width - 16, height - 16, 16);
    ctx.fillStyle = COLORS.cardBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawGradientHeader(
    ctx: SKRSContext2D,
    width: number,
    startColor: string,
    endColor: string,
    title: string,
    emoji: string,
    y: number = 8,
    headerHeight: number = 56
) {
    // Clip to card shape for header
    drawRoundedRect(ctx, 8, y, width - 16, headerHeight, y === 8 ? 16 : 0);
    ctx.save();
    ctx.clip();

    const grad = ctx.createLinearGradient(0, y, width, y);
    grad.addColorStop(0, startColor);
    grad.addColorStop(1, endColor);
    ctx.fillStyle = grad;
    ctx.fillRect(8, y, width - 16, headerHeight);

    ctx.restore();

    // Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 18px ${FONT_FAMILY}`;
    ctx.fillText(`${emoji}  ${title}`, PADDING + 8, y + 35);
}

function drawDivider(ctx: SKRSContext2D, y: number, width: number) {
    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING + 8, y);
    ctx.lineTo(width - PADDING - 8, y);
    ctx.stroke();
}

function drawLabel(ctx: SKRSContext2D, label: string, x: number, y: number) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillText(label, x, y);
}

function drawValue(ctx: SKRSContext2D, value: string, x: number, y: number, color: string = COLORS.text) {
    ctx.fillStyle = color;
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.fillText(value, x, y);
}

function drawLargeValue(ctx: SKRSContext2D, value: string, x: number, y: number, color: string = COLORS.text) {
    ctx.fillStyle = color;
    ctx.font = `bold 24px ${FONT_FAMILY}`;
    ctx.fillText(value, x, y);
}

function drawStatBox(
    ctx: SKRSContext2D,
    x: number, y: number, w: number, h: number,
    label: string, value: string, valueColor: string = COLORS.text
) {
    drawRoundedRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = COLORS.bg;
    ctx.fill();

    drawLabel(ctx, label, x + 10, y + 20);
    drawValue(ctx, value, x + 10, y + 42, valueColor);
}

function formatCurrency(amount: number): string {
    if (amount >= 10000) return `₹${(amount / 1000).toFixed(1)}k`;
    return `₹${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function formatKwh(kwh: number): string {
    return `${kwh.toFixed(kwh % 1 === 0 ? 0 : 1)} kWh`;
}

function formatTime(isoString: string): string {
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return isoString;
    }
}

function formatDate(isoString: string): string {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
        return isoString;
    }
}

function energyEmoji(type?: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('SOLAR')) return '☀️';
    if (t.includes('WIND')) return '💨';
    if (t.includes('HYDRO')) return '💧';
    return '⚡';
}

function trustEmoji(score: number): string {
    if (score >= 80) return '⭐';
    if (score >= 60) return '🟢';
    if (score >= 40) return '🟡';
    return '🔴';
}

// --- Card Renderers ---

/**
 * Dashboard Card — Balance, trust score, listings, earnings, buyer stats
 */
export async function renderDashboardCard(data: {
    userName: string;
    balance: number;
    trustScore: number;
    trustTier: { name: string; nameHi: string; emoji: string };
    tradeLimit: number;
    productionCapacity?: number;
    seller?: {
        activeListings: number;
        totalListedKwh: number;
        weeklyEarnings: number;
        weeklyKwh: number;
        totalEarnings: number;
        totalKwh: number;
    };
    buyer?: {
        totalOrders: number;
        totalBoughtKwh: number;
        totalSpent: number;
    };
}): Promise<Buffer> {
    const hasSeller = !!data.seller;
    const hasBuyer = !!data.buyer;
    const height = 280 + (hasSeller ? 120 : 0) + (hasBuyer ? 80 : 0);

    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.headerGradientStart, COLORS.headerGradientEnd, `${data.userName}'s Dashboard`, '📊');

    let y = 84;

    // Balance + Trust row
    const colW = (CARD_WIDTH - 16 - PADDING * 2 - 12) / 2;
    drawStatBox(ctx, PADDING + 8, y, colW, 56, 'WALLET BALANCE', formatCurrency(data.balance), COLORS.success);
    drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 56, 'TRUST SCORE', `${data.trustScore}/100 ${data.trustTier.emoji}`, COLORS.accent);
    y += 72;

    // Trade Limit + Production
    drawStatBox(ctx, PADDING + 8, y, colW, 56, 'TRADE LIMIT', formatKwh(data.tradeLimit), COLORS.text);
    drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 56, 'CAPACITY', data.productionCapacity ? formatKwh(data.productionCapacity) : 'N/A', COLORS.text);
    y += 72;

    // Seller section
    if (data.seller) {
        drawDivider(ctx, y, CARD_WIDTH);
        y += 16;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText('⚡ SELLER STATS', PADDING + 8, y);
        y += 16;

        const col3W = (CARD_WIDTH - 16 - PADDING * 2 - 24) / 3;
        drawStatBox(ctx, PADDING + 8, y, col3W, 56, 'ACTIVE', `${data.seller.activeListings} listings`, COLORS.accent);
        drawStatBox(ctx, PADDING + 8 + col3W + 12, y, col3W, 56, 'THIS WEEK', formatCurrency(data.seller.weeklyEarnings), COLORS.success);
        drawStatBox(ctx, PADDING + 8 + (col3W + 12) * 2, y, col3W, 56, 'TOTAL', formatCurrency(data.seller.totalEarnings), COLORS.success);
        y += 72;
    }

    // Buyer section
    if (data.buyer) {
        drawDivider(ctx, y, CARD_WIDTH);
        y += 16;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText('🛒 BUYER STATS', PADDING + 8, y);
        y += 16;

        const col3W = (CARD_WIDTH - 16 - PADDING * 2 - 24) / 3;
        drawStatBox(ctx, PADDING + 8, y, col3W, 56, 'ORDERS', `${data.buyer.totalOrders}`, COLORS.accent);
        drawStatBox(ctx, PADDING + 8 + col3W + 12, y, col3W, 56, 'BOUGHT', formatKwh(data.buyer.totalBoughtKwh), COLORS.text);
        drawStatBox(ctx, PADDING + 8 + (col3W + 12) * 2, y, col3W, 56, 'SPENT', formatCurrency(data.buyer.totalSpent), COLORS.warning);
    }

    return canvas.toBuffer('image/png');
}

/**
 * Offer Created Card — Confirmation of a new sell offer
 */
export async function renderOfferCreatedCard(data: {
    quantity: number;
    pricePerKwh: number;
    startTime: string;
    endTime: string;
    energyType?: string;
}): Promise<Buffer> {
    const height = 230;
    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.sellGradientStart, COLORS.sellGradientEnd, 'Offer Created Successfully!', '✅');

    let y = 90;

    const colW = (CARD_WIDTH - 16 - PADDING * 2 - 12) / 2;

    // Energy type + Quantity
    drawStatBox(ctx, PADDING + 8, y, colW, 56, 'ENERGY TYPE', `${energyEmoji(data.energyType)} ${data.energyType || 'SOLAR'}`, COLORS.text);
    drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 56, 'QUANTITY', formatKwh(data.quantity), COLORS.accent);
    y += 72;

    // Price + Time window
    drawStatBox(ctx, PADDING + 8, y, colW, 56, 'PRICE', `₹${data.pricePerKwh}/kWh`, COLORS.success);
    drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 56, 'TIME WINDOW', `${formatTime(data.startTime)} - ${formatTime(data.endTime)}`, COLORS.text);

    return canvas.toBuffer('image/png');
}

/**
 * Active Listings Card — Table of seller's current offers
 */
export async function renderListingsCard(data: {
    listings: Array<{
        id: string;
        quantity: number;
        pricePerKwh: number;
        startTime: string;
        endTime: string;
        energyType: string;
    }>;
    totalListed: number;
    totalSold: number;
    userName: string;
}): Promise<Buffer> {
    const rowHeight = 36;
    const headerArea = 64;
    const summaryArea = 56;
    const tableHeaderHeight = 32;
    const height = headerArea + summaryArea + tableHeaderHeight + data.listings.length * rowHeight + PADDING * 2 + 16;

    const canvas = createCanvas(CARD_WIDTH, Math.min(height, 600));
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, Math.min(height, 600));
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.sellGradientStart, COLORS.sellGradientEnd, `${data.userName}'s Listings`, '📋');

    let y = headerArea + 16;

    // Summary stats
    const colW = (CARD_WIDTH - 16 - PADDING * 2 - 12) / 2;
    drawStatBox(ctx, PADDING + 8, y, colW, 44, 'TOTAL LISTED', formatKwh(data.totalListed), COLORS.accent);
    drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 44, 'TOTAL SOLD', formatKwh(data.totalSold), COLORS.success);
    y += 56;

    // Table header
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, tableHeaderHeight);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.fillText('TYPE', PADDING + 16, y + 20);
    ctx.fillText('QTY', PADDING + 100, y + 20);
    ctx.fillText('PRICE', PADDING + 190, y + 20);
    ctx.fillText('TIME WINDOW', PADDING + 310, y + 20);
    y += tableHeaderHeight;

    // Rows
    const visibleListings = data.listings.slice(0, 10);
    for (let i = 0; i < visibleListings.length; i++) {
        const listing = visibleListings[i];
        if (i % 2 === 1) {
            ctx.fillStyle = COLORS.rowAlt;
            ctx.fillRect(PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, rowHeight);
        }

        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`${energyEmoji(listing.energyType)} ${listing.energyType}`, PADDING + 16, y + 22);
        ctx.fillText(formatKwh(listing.quantity), PADDING + 100, y + 22);
        ctx.fillStyle = COLORS.success;
        ctx.fillText(`₹${listing.pricePerKwh}/kWh`, PADDING + 190, y + 22);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText(`${formatTime(listing.startTime)}-${formatTime(listing.endTime)}`, PADDING + 310, y + 22);
        y += rowHeight;
    }

    if (data.listings.length > 10) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `italic 12px ${FONT_FAMILY}`;
        ctx.fillText(`+${data.listings.length - 10} more listings...`, PADDING + 16, y + 16);
    }

    return canvas.toBuffer('image/png');
}

/**
 * Top Deals Card — Best available offers for buyers
 */
export async function renderTopDealsCard(data: {
    deals: Array<{
        offerId: string;
        providerName: string;
        trustScore: number;
        energyType: string;
        quantity: number;
        pricePerKwh: number;
        savingsPercent: number;
    }>;
    discomRate: number;
}): Promise<Buffer> {
    const dealHeight = 80;
    const height = 80 + data.deals.length * (dealHeight + 8) + PADDING;

    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.buyGradientStart, COLORS.buyGradientEnd, `Top Green Energy Deals`, '🌿');

    let y = 76;

    // DISCOM reference
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillText(`DISCOM grid rate: ₹${data.discomRate}/kWh`, PADDING + 8, y);
    y += 16;

    for (let i = 0; i < data.deals.length; i++) {
        const deal = data.deals[i];

        // Deal card background
        drawRoundedRect(ctx, PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, dealHeight, 10);
        ctx.fillStyle = COLORS.bg;
        ctx.fill();
        ctx.strokeStyle = COLORS.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Deal number
        ctx.fillStyle = COLORS.accent;
        ctx.font = `bold 22px ${FONT_FAMILY}`;
        ctx.fillText(`${i + 1}`, PADDING + 20, y + 35);

        // Provider + trust
        ctx.fillStyle = COLORS.text;
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText(`${energyEmoji(deal.energyType)} ${deal.providerName}`, PADDING + 50, y + 24);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `12px ${FONT_FAMILY}`;
        ctx.fillText(`${trustEmoji(deal.trustScore)} Trust: ${deal.trustScore}/100  •  ${formatKwh(deal.quantity)}`, PADDING + 50, y + 44);

        // Price + savings
        ctx.fillStyle = COLORS.success;
        ctx.font = `bold 18px ${FONT_FAMILY}`;
        const priceText = `₹${deal.pricePerKwh}/kWh`;
        const priceWidth = ctx.measureText(priceText).width;
        ctx.fillText(priceText, CARD_WIDTH - PADDING - 16 - priceWidth, y + 30);

        ctx.fillStyle = COLORS.warning;
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        const savingsText = `Save ${deal.savingsPercent}%`;
        const savingsWidth = ctx.measureText(savingsText).width;
        ctx.fillText(savingsText, CARD_WIDTH - PADDING - 16 - savingsWidth, y + 50);

        // Bottom border pill
        drawRoundedRect(ctx, PADDING + 24, y + dealHeight - 4, CARD_WIDTH - PADDING * 2 - 48, 3, 2);
        ctx.fillStyle = deal.savingsPercent > 30 ? COLORS.success : COLORS.accent;
        ctx.fill();

        y += dealHeight + 8;
    }

    return canvas.toBuffer('image/png');
}

/**
 * Matched Offers Card — Multi-seller offer breakdown for buyer
 */
export async function renderMatchedOffersCard(data: {
    selectionType: 'single' | 'multiple';
    offers: Array<{
        offerId: string;
        providerId: string;
        providerName: string;
        trustScore: number;
        energyType: string;
        quantity: number;
        pricePerKwh: number;
        subtotal: number;
        timeWindow: string;
    }>;
    summary: {
        totalQuantity: number;
        totalPrice: number;
        averagePrice: number;
        fullyFulfilled: boolean;
        shortfall: number;
        offersUsed: number;
    };
    timeWindow: string;
    transactionId: string;
}): Promise<Buffer> {
    const offerRowH = 44;
    const height = 160 + data.offers.length * offerRowH + 100;

    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.buyGradientStart, COLORS.buyGradientEnd,
        data.selectionType === 'single' ? 'Best Match Found' : `Smart Buy — ${data.summary.offersUsed} Sellers`, '🔍');

    let y = 80;

    // Time window
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillText(`⏰ ${data.timeWindow}`, PADDING + 8, y);
    y += 24;

    // Offer rows
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, 28);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.fillText('SELLER', PADDING + 16, y + 18);
    ctx.fillText('QTY', PADDING + 220, y + 18);
    ctx.fillText('PRICE', PADDING + 310, y + 18);
    ctx.fillText('SUBTOTAL', PADDING + 420, y + 18);
    y += 28;

    for (let i = 0; i < data.offers.length; i++) {
        const offer = data.offers[i];
        if (i % 2 === 1) {
            ctx.fillStyle = COLORS.rowAlt;
            ctx.fillRect(PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, offerRowH);
        }

        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`${energyEmoji(offer.energyType)} ${offer.providerName}`, PADDING + 16, y + 18);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `11px ${FONT_FAMILY}`;
        ctx.fillText(`${trustEmoji(offer.trustScore)} ${offer.trustScore}`, PADDING + 16, y + 34);

        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(formatKwh(offer.quantity), PADDING + 220, y + 26);
        ctx.fillStyle = COLORS.success;
        ctx.fillText(`₹${offer.pricePerKwh}`, PADDING + 310, y + 26);
        ctx.fillStyle = COLORS.warning;
        ctx.fillText(formatCurrency(offer.subtotal), PADDING + 420, y + 26);
        y += offerRowH;
    }

    y += 12;
    drawDivider(ctx, y, CARD_WIDTH);
    y += 20;

    // Summary
    const summaryColW = (CARD_WIDTH - 16 - PADDING * 2 - 24) / 3;
    drawStatBox(ctx, PADDING + 8, y, summaryColW, 52, 'TOTAL', formatKwh(data.summary.totalQuantity), COLORS.accent);
    drawStatBox(ctx, PADDING + 8 + summaryColW + 12, y, summaryColW, 52, 'AVG PRICE', `₹${data.summary.averagePrice.toFixed(1)}/kWh`, COLORS.text);
    drawStatBox(ctx, PADDING + 8 + (summaryColW + 12) * 2, y, summaryColW, 52, 'TOTAL COST', formatCurrency(data.summary.totalPrice), COLORS.warning);

    if (!data.summary.fullyFulfilled) {
        y += 64;
        ctx.fillStyle = COLORS.danger;
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillText(`⚠️ Shortfall: ${formatKwh(data.summary.shortfall)} — partial fulfillment`, PADDING + 8, y);
    }

    return canvas.toBuffer('image/png');
}

/**
 * Order Confirmation Card — Purchase receipt
 */
export async function renderOrderConfirmationCard(data: {
    success: boolean;
    orderId?: string;
    offers: Array<{
        providerName: string;
        quantity: number;
        pricePerKwh: number;
        subtotal: number;
    }>;
    summary: {
        totalQuantity: number;
        totalPrice: number;
        averagePrice: number;
        ordersConfirmed: number;
    };
    timeWindow: string;
}): Promise<Buffer> {
    const rowH = 36;
    const height = 200 + data.offers.length * rowH + 60;

    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);

    if (data.success) {
        drawGradientHeader(ctx, CARD_WIDTH, COLORS.sellGradientStart, COLORS.sellGradientEnd, 'Order Confirmed!', '🎉');
    } else {
        drawGradientHeader(ctx, CARD_WIDTH, '#dc2626', '#ef4444', 'Order Failed', '❌');
    }

    let y = 80;

    if (data.orderId) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `11px ${FONT_FAMILY}`;
        ctx.fillText(`Order ID: ${data.orderId}`, PADDING + 8, y);
        y += 8;
    }

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillText(`⏰ ${data.timeWindow}`, PADDING + 8, y + 8);
    y += 28;

    // Offer rows
    for (let i = 0; i < data.offers.length; i++) {
        const offer = data.offers[i];
        if (i % 2 === 0) {
            drawRoundedRect(ctx, PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, rowH, 6);
            ctx.fillStyle = COLORS.bg;
            ctx.fill();
        }

        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`⚡ ${offer.providerName}`, PADDING + 16, y + 22);
        ctx.fillText(`${formatKwh(offer.quantity)}`, PADDING + 230, y + 22);
        ctx.fillStyle = COLORS.success;
        ctx.fillText(`₹${offer.pricePerKwh}/kWh`, PADDING + 340, y + 22);
        ctx.fillStyle = COLORS.warning;
        ctx.fillText(formatCurrency(offer.subtotal), PADDING + 460, y + 22);
        y += rowH;
    }

    y += 12;
    drawDivider(ctx, y, CARD_WIDTH);
    y += 20;

    // Total box
    drawRoundedRect(ctx, PADDING + 8, y, CARD_WIDTH - PADDING * 2 - 16, 52, 10);
    const totalGrad = ctx.createLinearGradient(PADDING + 8, y, CARD_WIDTH - PADDING - 8, y);
    totalGrad.addColorStop(0, '#1e3a5f');
    totalGrad.addColorStop(1, '#1e40af30');
    ctx.fillStyle = totalGrad;
    ctx.fill();

    ctx.fillStyle = COLORS.text;
    ctx.font = `bold 15px ${FONT_FAMILY}`;
    ctx.fillText(`TOTAL: ${formatKwh(data.summary.totalQuantity)}`, PADDING + 20, y + 32);

    ctx.fillStyle = COLORS.success;
    ctx.font = `bold 20px ${FONT_FAMILY}`;
    const totalText = formatCurrency(data.summary.totalPrice);
    const totalW = ctx.measureText(totalText).width;
    ctx.fillText(totalText, CARD_WIDTH - PADDING - 20 - totalW, y + 34);

    return canvas.toBuffer('image/png');
}

/**
 * Earnings Card — Seller earnings summary
 */
export async function renderEarningsCard(data: {
    userName: string;
    hasStartedSelling: boolean;
    totalOrders: number;
    totalEnergySold: number;
    totalEarnings: number;
    walletBalance: number;
}): Promise<Buffer> {
    const height = data.hasStartedSelling ? 260 : 160;

    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.sellGradientStart, COLORS.sellGradientEnd, `${data.userName}'s Earnings`, '💰');

    let y = 84;

    if (!data.hasStartedSelling) {
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `15px ${FONT_FAMILY}`;
        ctx.fillText('No sales yet. Create a listing to start earning!', PADDING + 8, y + 16);
        return canvas.toBuffer('image/png');
    }

    // Big earnings number
    drawLargeValue(ctx, formatCurrency(data.totalEarnings), PADDING + 8, y + 8, COLORS.success);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillText('TOTAL EARNINGS', PADDING + 8, y + 28);
    y += 48;

    // Stats row
    const col3W = (CARD_WIDTH - 16 - PADDING * 2 - 24) / 3;
    drawStatBox(ctx, PADDING + 8, y, col3W, 56, 'ORDERS', `${data.totalOrders}`, COLORS.accent);
    drawStatBox(ctx, PADDING + 8 + col3W + 12, y, col3W, 56, 'SOLD', formatKwh(data.totalEnergySold), COLORS.text);
    drawStatBox(ctx, PADDING + 8 + (col3W + 12) * 2, y, col3W, 56, 'BALANCE', formatCurrency(data.walletBalance), COLORS.success);

    return canvas.toBuffer('image/png');
}

/**
 * Auto-Trade Status Card — Config display for auto-sell and auto-buy
 */
export async function renderAutoTradeStatusCard(data: {
    seller?: {
        enabled: boolean;
        capacityKwh: number;
        pricePerKwh: number;
        energyType: string;
        lastRun?: {
            executedAt: string;
            status: string;
            listedQuantity: number;
            weatherMultiplier: number;
        };
    };
    buyer?: {
        enabled: boolean;
        targetQuantity: number;
        maxPrice: number;
        preferredTime: string | null;
        lastRun?: {
            executedAt: string;
            status: string;
            quantityBought: number;
            pricePerUnit: number;
            totalSpent: number;
        };
    };
}): Promise<Buffer> {
    const hasSeller = !!data.seller;
    const hasBuyer = !!data.buyer;
    const sellerH = hasSeller ? (data.seller!.lastRun ? 180 : 120) : 0;
    const buyerH = hasBuyer ? (data.buyer!.lastRun ? 180 : 120) : 0;
    const height = 80 + sellerH + buyerH + (hasSeller && hasBuyer ? 16 : 0);

    const canvas = createCanvas(CARD_WIDTH, height);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, CARD_WIDTH, height);
    drawGradientHeader(ctx, CARD_WIDTH, COLORS.headerGradientStart, COLORS.headerGradientEnd, 'Auto-Trade Status', '🤖');

    let y = 80;
    const colW = (CARD_WIDTH - 16 - PADDING * 2 - 12) / 2;

    // Seller section
    if (data.seller) {
        const statusText = data.seller.enabled ? '🟢 ACTIVE' : '🔴 OFF';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText(`⚡ AUTO-SELL  ${statusText}`, PADDING + 8, y);
        y += 16;

        drawStatBox(ctx, PADDING + 8, y, colW, 52, 'CAPACITY', formatKwh(data.seller.capacityKwh), COLORS.accent);
        drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 52, 'PRICE', `₹${data.seller.pricePerKwh}/kWh`, COLORS.success);
        y += 64;

        if (data.seller.lastRun) {
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = `12px ${FONT_FAMILY}`;
            const weatherIcon = data.seller.lastRun.weatherMultiplier >= 0.8 ? '☀️' : data.seller.lastRun.weatherMultiplier >= 0.5 ? '⛅' : '☁️';
            ctx.fillText(`Last run: ${formatDate(data.seller.lastRun.executedAt)} — ${data.seller.lastRun.status}`, PADDING + 8, y);
            y += 18;
            ctx.fillText(`${weatherIcon} Weather factor: ${(data.seller.lastRun.weatherMultiplier * 100).toFixed(0)}% → Listed ${formatKwh(data.seller.lastRun.listedQuantity)}`, PADDING + 8, y);
            y += 24;
        }
    }

    // Buyer section
    if (data.buyer) {
        if (hasSeller) {
            drawDivider(ctx, y, CARD_WIDTH);
            y += 16;
        }

        const statusText = data.buyer.enabled ? '🟢 ACTIVE' : '🔴 OFF';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText(`🛒 AUTO-BUY  ${statusText}`, PADDING + 8, y);
        y += 16;

        drawStatBox(ctx, PADDING + 8, y, colW, 52, 'TARGET', formatKwh(data.buyer.targetQuantity), COLORS.accent);
        drawStatBox(ctx, PADDING + 8 + colW + 12, y, colW, 52, 'MAX PRICE', `₹${data.buyer.maxPrice}/kWh`, COLORS.warning);
        y += 64;

        if (data.buyer.lastRun) {
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = `12px ${FONT_FAMILY}`;
            ctx.fillText(`Last run: ${formatDate(data.buyer.lastRun.executedAt)} — ${data.buyer.lastRun.status}`, PADDING + 8, y);
            y += 18;
            ctx.fillText(`Bought ${formatKwh(data.buyer.lastRun.quantityBought)} @ ₹${data.buyer.lastRun.pricePerUnit}/kWh = ${formatCurrency(data.buyer.lastRun.totalSpent)}`, PADDING + 8, y);
        }
    }

    return canvas.toBuffer('image/png');
}
