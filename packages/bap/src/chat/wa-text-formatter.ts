/**
 * WhatsApp Text Formatter — Rich text formatting for WhatsApp messages.
 * Uses WhatsApp's built-in markdown: *bold*, _italic_, ~strikethrough~, `monospace`.
 * Designed for premium-looking text-only cards as captions or standalone messages.
 */

// --- Formatting Helpers ---

export function bold(text: string): string {
    return `*${text}*`;
}

export function italic(text: string): string {
    return `_${text}_`;
}

export function strikethrough(text: string): string {
    return `~${text}~`;
}

export function mono(text: string): string {
    return `\`${text}\``;
}

export function divider(): string {
    return '━━━━━━━━━━━━━━━━━━━';
}

export function line(): string {
    return '─────────────────────';
}

// --- Energy Emoji ---

export function energyEmoji(type?: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('SOLAR')) return '☀️';
    if (t.includes('WIND')) return '💨';
    if (t.includes('HYDRO')) return '💧';
    return '⚡';
}

export function trustBadge(score: number): string {
    if (score >= 80) return '⭐ Gold';
    if (score >= 60) return '🟢 Silver';
    if (score >= 40) return '🟡 Bronze';
    return '🔴 New';
}

// --- Currency / Unit Formatting ---

export function fmtCurrency(amount: number): string {
    if (amount >= 10000) return `₹${(amount / 1000).toFixed(1)}k`;
    return `₹${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

export function fmtKwh(kwh: number): string {
    return `${kwh.toFixed(kwh % 1 === 0 ? 0 : 1)} kWh`;
}

export function fmtTime(isoString: string): string {
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return isoString;
    }
}

export function fmtDate(isoString: string): string {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
        return isoString;
    }
}

// --- Text Card Generators (for captions or fallback) ---

/**
 * Dashboard text caption — brief summary alongside the image card.
 */
export function dashboardCaption(data: {
    userName: string;
    balance: number;
    trustScore: number;
    trustTier: { name: string; emoji: string };
}): string {
    return [
        `📊 ${bold(`${data.userName}'s Dashboard`)}`,
        `💰 ${fmtCurrency(data.balance)} balance  •  ${data.trustTier.emoji} Trust: ${data.trustScore}/100`,
    ].join('\n');
}

/**
 * Offer created text caption.
 */
export function offerCreatedCaption(data: {
    quantity: number;
    pricePerKwh: number;
    startTime: string;
    endTime: string;
    energyType?: string;
}): string {
    return [
        `✅ ${bold('Offer Created!')}`,
        `${energyEmoji(data.energyType)} ${fmtKwh(data.quantity)} @ ₹${data.pricePerKwh}/kWh`,
        `⏰ ${fmtTime(data.startTime)} - ${fmtTime(data.endTime)}`,
    ].join('\n');
}

/**
 * Listings text caption.
 */
export function listingsCaption(data: {
    userName: string;
    totalListed: number;
    totalSold: number;
    count: number;
}): string {
    return [
        `📋 ${bold(`${data.userName}'s Listings`)} (${data.count})`,
        `Listed: ${fmtKwh(data.totalListed)} | Sold: ${fmtKwh(data.totalSold)}`,
    ].join('\n');
}

/**
 * Top deals caption.
 */
export function topDealsCaption(dealsCount: number): string {
    return [
        `🌿 ${bold(`Top ${dealsCount} Green Energy Deals`)}`,
        `Reply with a number to select a deal`,
    ].join('\n');
}

/**
 * Matched offers caption.
 */
export function matchedOffersCaption(data: {
    totalQuantity: number;
    totalPrice: number;
    offersUsed: number;
}): string {
    return [
        `🔍 ${bold('Offers Matched')} — ${data.offersUsed} seller${data.offersUsed > 1 ? 's' : ''}`,
        `Total: ${fmtKwh(data.totalQuantity)} for ${fmtCurrency(data.totalPrice)}`,
    ].join('\n');
}

/**
 * Order confirmation caption.
 */
export function orderConfirmationCaption(data: {
    success: boolean;
    totalQuantity: number;
    totalPrice: number;
}): string {
    if (data.success) {
        return [
            `🎉 ${bold('Order Confirmed!')}`,
            `${fmtKwh(data.totalQuantity)} for ${fmtCurrency(data.totalPrice)}`,
        ].join('\n');
    }
    return `❌ ${bold('Order Failed')} — Please try again.`;
}

/**
 * Earnings caption.
 */
export function earningsCaption(data: {
    userName: string;
    totalEarnings: number;
    totalOrders: number;
}): string {
    return [
        `💰 ${bold(`${data.userName}'s Earnings`)}`,
        `${fmtCurrency(data.totalEarnings)} from ${data.totalOrders} order${data.totalOrders !== 1 ? 's' : ''}`,
    ].join('\n');
}

/**
 * Auto trade status caption.
 */
export function autoTradeCaption(data: {
    sellerEnabled?: boolean;
    buyerEnabled?: boolean;
}): string {
    const parts = ['🤖 ' + bold('Auto-Trade Status')];
    if (data.sellerEnabled !== undefined) {
        parts.push(`⚡ Auto-Sell: ${data.sellerEnabled ? '🟢 Active' : '🔴 Off'}`);
    }
    if (data.buyerEnabled !== undefined) {
        parts.push(`🛒 Auto-Buy: ${data.buyerEnabled ? '🟢 Active' : '🔴 Off'}`);
    }
    return parts.join('\n');
}

/**
 * Slider replacement — text-based prompt for numeric input.
 */
export function sliderPrompt(data: {
    type: 'quantity' | 'price';
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
}): string {
    const label = data.type === 'quantity' ? 'quantity' : 'price';
    const suggestions: string[] = [];

    // Generate 3-5 good suggestion values
    const range = data.max - data.min;
    const steps = [0.25, 0.5, 0.75, 1.0];
    for (const pct of steps) {
        const val = Math.round((data.min + range * pct) / data.step) * data.step;
        if (val >= data.min && val <= data.max && !suggestions.includes(String(val))) {
            suggestions.push(String(val));
        }
    }

    return [
        `📏 ${bold(`Choose ${label}`)} (${data.unit})`,
        ``,
        `Range: ${mono(`${data.min}`)} → ${mono(`${data.max}`)} ${data.unit}`,
        `Default: ${mono(String(data.defaultValue))} ${data.unit}`,
        ``,
        `Quick picks: ${suggestions.map(s => mono(s)).join(' • ')}`,
        ``,
        italic(`Reply with a number (e.g. ${data.defaultValue})`),
    ].join('\n');
}

/**
 * Offers list — formatted text version of discoverable offers.
 */
export function offersListText(offers: Array<{
    sellerName: string;
    sellerTrustScore: number;
    energyType: string;
    pricePerUnit: number;
    quantity: number;
    totalPrice: number;
    timeWindow: string;
    savingsPercent?: number;
}>): string {
    if (offers.length === 0) return 'No offers available right now.';

    const lines = offers.map((o, i) => [
        `${bold(`${i + 1}.`)} ${energyEmoji(o.energyType)} ${bold(o.sellerName)}`,
        `   💰 ₹${o.pricePerUnit}/kWh × ${fmtKwh(o.quantity)} = ${fmtCurrency(o.totalPrice)}`,
        `   ${trustBadge(o.sellerTrustScore)} (${o.sellerTrustScore}/100)${o.savingsPercent ? ` • Save ${o.savingsPercent}%` : ''}`,
    ].join('\n'));

    return [
        `⚡ ${bold('Available Offers')}`,
        divider(),
        ...lines,
    ].join('\n');
}
