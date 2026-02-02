/**
 * Trading Agent — Creates offers and reports earnings/listings for sellers.
 * Supports language-aware responses (English / Hinglish).
 */

import { prisma, createLogger, publishOfferToCDS, isExternalCDSEnabled, config, snapTimeWindow, checkTradeWindow, validateQuantity, roundQuantity, checkBuyerCapacity } from '@p2p/shared';
import { registerProvider, addCatalogItem, addOffer } from '../seller-catalog';
import axios from 'axios';

const logger = createLogger('TradingAgent');

type LangOption = string | undefined;
function ht(lang: LangOption, en: string, hi: string): string {
  return lang === 'hinglish' ? hi : en;
}

export const mockTradingAgent = {
  /**
   * Create a default sell offer for a newly onboarded user.
   */
  async createDefaultOffer(
    userId: string
  ): Promise<{
    success: boolean;
    offer?: { quantity: number; pricePerKwh: number; startTime: string; endTime: string };
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, error: 'User not found' };

      let providerId = user.providerId;
      if (!providerId) {
        const providerName = `${user.name || 'Solar'} Energy`;
        const provider = await registerProvider(providerName);
        providerId = provider.id;
        await prisma.user.update({
          where: { id: userId },
          data: { providerId },
        });
      }

      const capacity = user.productionCapacity || 100;
      const tradeLimit = (capacity * (user.allowedTradeLimit || 10)) / 100;
      const offerQty = Math.max(1, Math.floor(tradeLimit * 0.5));
      const pricePerKwh = 6.0;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(18, 0, 0, 0);

      const item = await addCatalogItem(
        providerId,
        'SOLAR',
        'SCHEDULED',
        offerQty,
        [],
        ''
      );

      const offer = await addOffer(
        item.id,
        providerId,
        pricePerKwh,
        'INR',
        offerQty,
        { startTime: tomorrow.toISOString(), endTime: endTime.toISOString() }
      );

      // Publish to CDS so the offer appears in discovery/buy page
      if (isExternalCDSEnabled()) {
        const providerName = user.name ? `${user.name} Energy` : 'Solar Energy';
        publishOfferToCDS(
          { id: providerId, name: providerName, trust_score: user.trustScore || 0.5 },
          {
            id: item.id,
            provider_id: item.provider_id,
            source_type: item.source_type,
            delivery_mode: item.delivery_mode,
            available_qty: item.available_qty,
            production_windows: item.production_windows,
            meter_id: item.meter_id,
          },
          {
            id: offer.id,
            item_id: offer.item_id,
            provider_id: offer.provider_id,
            price_value: offer.price.value,
            currency: offer.price.currency,
            max_qty: offer.maxQuantity,
            time_window: offer.timeWindow,
            pricing_model: offer.offerAttributes.pricingModel,
            settlement_type: offer.offerAttributes.settlementType,
          }
        ).then(success => {
          if (success) logger.info(`Offer published to CDS`, { offerId: offer.id });
          else logger.warn(`CDS publish returned false`, { offerId: offer.id });
        }).catch(err => logger.error(`Failed to publish offer to CDS`, { offerId: offer.id, error: err.message }));
      }

      logger.info(`Created default offer for user ${userId}: ${offerQty}kWh at Rs${pricePerKwh}/kWh`);

      return {
        success: true,
        offer: {
          quantity: offerQty,
          pricePerKwh,
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        },
      };
    } catch (error: any) {
      logger.error(`Failed to create default offer: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a custom sell offer with user-specified parameters.
   * Falls back to defaults for any missing values.
   */
  async createCustomOffer(
    userId: string,
    options: { pricePerKwh?: number; quantity?: number; timeDesc?: string }
  ): Promise<{
    success: boolean;
    offer?: { quantity: number; pricePerKwh: number; startTime: string; endTime: string };
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, error: 'User not found' };

      let providerId = user.providerId;
      if (!providerId) {
        const providerName = `${user.name || 'Solar'} Energy`;
        const provider = await registerProvider(providerName);
        providerId = provider.id;
        await prisma.user.update({
          where: { id: userId },
          data: { providerId },
        });
      }

      const capacity = user.productionCapacity || 100;
      const tradeLimit = (capacity * (user.allowedTradeLimit || 10)) / 100;
      const maxQty = Math.max(1, Math.floor(tradeLimit));
      const offerQty = options.quantity ? Math.min(options.quantity, maxQty) : Math.max(1, Math.floor(tradeLimit * 0.5));
      const pricePerKwh = options.pricePerKwh || 6.0;

      // Parse time — default to tomorrow 6AM-6PM
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(6, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(18, 0, 0, 0);

      // Adjust if user specified a time like "today"
      if (options.timeDesc) {
        const td = options.timeDesc.toLowerCase();
        if (td.includes('today') || td.includes('aaj')) {
          const now = new Date();
          startTime.setDate(now.getDate());
          endTime.setDate(now.getDate());
          // If already past 6AM, start from next hour
          if (now.getHours() >= 6) {
            startTime.setHours(now.getHours() + 1, 0, 0, 0);
          }
        }
      }

      const item = await addCatalogItem(
        providerId,
        'SOLAR',
        'SCHEDULED',
        offerQty,
        [],
        ''
      );

      const offer = await addOffer(
        item.id,
        providerId,
        pricePerKwh,
        'INR',
        offerQty,
        { startTime: startTime.toISOString(), endTime: endTime.toISOString() }
      );

      // Publish to CDS
      if (isExternalCDSEnabled()) {
        const providerName = user.name ? `${user.name} Energy` : 'Solar Energy';
        publishOfferToCDS(
          { id: providerId, name: providerName, trust_score: user.trustScore || 0.5 },
          {
            id: item.id,
            provider_id: item.provider_id,
            source_type: item.source_type,
            delivery_mode: item.delivery_mode,
            available_qty: item.available_qty,
            production_windows: item.production_windows,
            meter_id: item.meter_id,
          },
          {
            id: offer.id,
            item_id: offer.item_id,
            provider_id: offer.provider_id,
            price_value: offer.price.value,
            currency: offer.price.currency,
            max_qty: offer.maxQuantity,
            time_window: offer.timeWindow,
            pricing_model: offer.offerAttributes.pricingModel,
            settlement_type: offer.offerAttributes.settlementType,
          }
        ).then(success => {
          if (success) logger.info(`Custom offer published to CDS`, { offerId: offer.id });
          else logger.warn(`CDS publish returned false`, { offerId: offer.id });
        }).catch(err => logger.error(`Failed to publish custom offer to CDS`, { offerId: offer.id, error: err.message }));
      }

      logger.info(`Created custom offer for user ${userId}: ${offerQty}kWh at Rs${pricePerKwh}/kWh`);

      return {
        success: true,
        offer: {
          quantity: offerQty,
          pricePerKwh,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      };
    } catch (error: any) {
      logger.error(`Failed to create custom offer: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get earnings summary for a user.
   */
  async getEarningsSummary(userId: string, lang?: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { providerId: true, balance: true, name: true },
    });

    if (!user?.providerId) {
      return ht(lang,
        'You have not started selling yet. Would you like me to set up trading for you?',
        'Aapne abhi tak selling shuru nahi ki. Kya main trading set up kar dun?'
      );
    }

    const completedOrders = await prisma.order.findMany({
      where: {
        providerId: user.providerId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: { totalPrice: true, totalQty: true },
    });

    const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalKwh = completedOrders.reduce((sum, o) => sum + (o.totalQty || 0), 0);
    const name = user.name || ht(lang, 'friend', 'dost');

    if (completedOrders.length === 0) {
      return ht(lang,
        `No sales yet, ${name}. Your offers are live and waiting for buyers! Wallet: Rs ${user.balance.toFixed(2)}.`,
        `Abhi tak koi sale nahi hui, ${name}. Aapke offers live hain, buyers ka wait kar rahe hain! Wallet: Rs ${user.balance.toFixed(2)}.`
      );
    }

    return ht(lang,
      `Your earnings, ${name}:\n- Orders: ${completedOrders.length}\n- Energy sold: ${totalKwh.toFixed(1)} kWh\n- Earnings: Rs ${totalEarnings.toFixed(2)}\n- Wallet: Rs ${user.balance.toFixed(2)}`,
      `Aapki kamayi, ${name}:\n- Orders: ${completedOrders.length}\n- Energy bechi: ${totalKwh.toFixed(1)} kWh\n- Kamayi: Rs ${totalEarnings.toFixed(2)}\n- Wallet: Rs ${user.balance.toFixed(2)}`
    );
  },

  /**
   * Get order status summary.
   */
  async getOrdersSummary(userId: string, lang?: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { providerId: true, name: true, id: true },
    });

    // Check as seller
    if (user?.providerId) {
      const orders = await prisma.order.findMany({
        where: { providerId: user.providerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, totalQty: true, totalPrice: true, createdAt: true },
      });

      if (orders.length > 0) {
        const lines = orders.map(
          (o, i) =>
            `${i + 1}. ${o.totalQty || 0} kWh — Rs ${(o.totalPrice || 0).toFixed(2)} — ${o.status}`
        );
        return ht(lang,
          `Your recent orders (as seller):\n${lines.join('\n')}`,
          `Aapke recent orders (seller):\n${lines.join('\n')}`
        );
      }
    }

    // Check as buyer
    const buyerOrders = await prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, status: true, totalQty: true, totalPrice: true, createdAt: true },
    });

    if (buyerOrders.length > 0) {
      const lines = buyerOrders.map(
        (o, i) =>
          `${i + 1}. ${o.totalQty || 0} kWh — Rs ${(o.totalPrice || 0).toFixed(2)} — ${o.status}`
      );
      return ht(lang,
        `Your recent orders (as buyer):\n${lines.join('\n')}`,
        `Aapke recent orders (buyer):\n${lines.join('\n')}`
      );
    }

    return ht(lang,
      'No orders yet. Your offers are live — buyers will find them soon!',
      'Abhi tak koi order nahi. Aapke offers live hain — jaldi buyers aayenge!'
    );
  },

  /**
   * Get active listings (catalog offers) for a seller.
   * Also shows total listed vs sold summary.
   */
  async getActiveListings(userId: string, lang?: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { providerId: true, name: true },
    });

    if (!user?.providerId) {
      return ht(lang,
        'You have no listings yet. Would you like me to create one?',
        'Aapki koi listing nahi hai. Kya main ek bana dun?'
      );
    }

    const offers = await prisma.catalogOffer.findMany({
      where: { providerId: user.providerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        maxQty: true,
        priceValue: true,
        timeWindowStart: true,
        timeWindowEnd: true,
        createdAt: true,
      },
    });

    // Get total sold from orders
    const orders = await prisma.order.findMany({
      where: {
        providerId: user.providerId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: { totalQty: true },
    });
    const totalSold = orders.reduce((sum, o) => sum + (o.totalQty || 0), 0);

    if (offers.length === 0) {
      return ht(lang,
        'No active listings. Would you like me to create an offer?',
        'Koi active listing nahi. Kya main ek offer bana dun?'
      );
    }

    const totalListed = offers.reduce((sum, o) => sum + o.maxQty, 0);
    const lines = offers.map((o, i) => {
      const start = new Date(o.timeWindowStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const startTime = new Date(o.timeWindowStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(o.timeWindowEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `${i + 1}. ${o.maxQty} kWh @ Rs ${o.priceValue}/unit — ${start} ${startTime}-${endTime}`;
    });

    return ht(lang,
      `Your listings (${offers.length}):\nTotal listed: ${totalListed} kWh | Sold: ${totalSold} kWh\n\n${lines.join('\n')}`,
      `Aapki listings (${offers.length}):\nKul listed: ${totalListed} kWh | Bika: ${totalSold} kWh\n\n${lines.join('\n')}`
    );
  },

  /**
   * Get sales summary for a specific time period.
   */
  async getSalesByPeriod(userId: string, startDate: Date, endDate: Date, periodLabel: string, lang?: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { providerId: true, name: true },
    });

    if (!user?.providerId) {
      return ht(lang,
        'You have not started selling yet.',
        'Aapne abhi tak selling shuru nahi ki.'
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        providerId: user.providerId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { totalPrice: true, totalQty: true },
    });

    const totalEarnings = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalKwh = orders.reduce((sum, o) => sum + (o.totalQty || 0), 0);

    if (orders.length === 0) {
      return ht(lang,
        `No sales ${periodLabel}.`,
        `${periodLabel} mein koi sale nahi hui.`
      );
    }

    return ht(lang,
      `Sales ${periodLabel}:\n- ${orders.length} order(s)\n- ${totalKwh.toFixed(1)} kWh sold\n- Rs ${totalEarnings.toFixed(2)} earned`,
      `${periodLabel} ki sales:\n- ${orders.length} order\n- ${totalKwh.toFixed(1)} kWh biki\n- Rs ${totalEarnings.toFixed(2)} kamayi`
    );
  },
};

// --- Buyer-side purchase execution ---

export interface SmartBuyOffer {
  offerId: string;
  providerId: string;
  providerName: string;
  price: number;
  quantity: number;
  subtotal: number;
  timeWindow: string;
}

export interface SmartBuySummary {
  totalQuantity: number;
  totalPrice: number;
  averagePrice: number;
  fullyFulfilled: boolean;
  shortfall: number;
  offersUsed: number;
}

export interface PurchaseResult {
  success: boolean;
  order?: {
    orderId: string;
    transactionId: string;
    quantity: number;
    pricePerKwh: number;
    totalPrice: number;
    providerName: string;
    timeWindow: string;
  };
  // Multi-offer purchase result
  bulkResult?: {
    confirmedCount: number;
    failedCount: number;
  };
  error?: string;
}

export interface DiscoveryResult {
  success: boolean;
  transactionId?: string;
  selectionType?: 'single' | 'multiple';
  // For single offer
  discoveredOffer?: {
    offerId: string;
    providerId: string;
    providerName: string;
    price: number;
    quantity: number;
    timeWindow: string;
  };
  // For smart buy (single or multiple)
  discoveredOffers?: SmartBuyOffer[];
  summary?: SmartBuySummary;
  error?: string;
}

/**
 * Build a time window from a natural language description.
 * Returns { startTime, endTime } ISO strings.
 */
function buildTimeWindow(timeDesc?: string): { startTime: string; endTime: string } {
  const now = new Date();
  const startTime = new Date(now);
  const endTime = new Date(now);

  if (!timeDesc) {
    // Default: tomorrow 6AM-6PM
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(6, 0, 0, 0);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(18, 0, 0, 0);
    return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
  }

  const td = timeDesc.toLowerCase();

  // --- Parse specific hour ranges: "1-6 AM", "6 AM to 6 PM", "2 to 8 PM", "1 se 6 baje" ---
  // Capture AM/PM for both start and end hours separately
  const hourRangeMatch = td.match(
    /(\d{1,2})\s*(am|pm|baje)?\s*(?:-|to|se)\s*(\d{1,2})\s*(am|pm|baje)?/i
  );

  if (hourRangeMatch) {
    let startH = parseInt(hourRangeMatch[1]);
    let endH = parseInt(hourRangeMatch[3]);
    const startSuffix = (hourRangeMatch[2] || '').toLowerCase();
    const endSuffix = (hourRangeMatch[4] || '').toLowerCase();

    // If both start and end have explicit AM/PM, apply individually
    if (startSuffix && endSuffix && startSuffix !== 'baje' && endSuffix !== 'baje') {
      if (startSuffix === 'pm' && startH < 12) startH += 12;
      if (startSuffix === 'am' && startH === 12) startH = 0;
      if (endSuffix === 'pm' && endH < 12) endH += 12;
      if (endSuffix === 'am' && endH === 12) endH = 0;
    } else {
      // Only one or no suffix — use context words to determine AM/PM
      const suffix = endSuffix || startSuffix;
      const hasPm = suffix === 'pm'
        || td.includes('shaam') || td.includes('sham') || td.includes('dopahar')
        || td.includes('evening') || td.includes('afternoon');
      const hasAm = suffix === 'am'
        || td.includes('subah') || td.includes('savere') || td.includes('morning');

      if (hasPm && !hasAm) {
        if (startH < 12) startH += 12;
        if (endH < 12) endH += 12;
      } else if (hasAm && !hasPm) {
        if (startH === 12) startH = 0;
        if (endH === 12) endH = 0;
      }
    }

    const isToday = td.includes('today') || td.includes('aaj');
    const isTomorrow = td.includes('tomorrow') || td.includes('kal');

    // Try to parse an explicit date like "2 Feb 2026", "Feb 2", "3rd March"
    const monthNames: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    // "2 Feb 2026" or "2nd Feb" or "2 February 2026"
    const dateDMY = td.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+(\d{4}))?/i);
    // "Feb 2" or "February 2, 2026"
    const dateMDY = td.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i);
    const dateMatch = dateDMY || dateMDY;

    if (dateMatch) {
      let day: number, month: number, year: number;
      if (dateDMY) {
        day = parseInt(dateDMY[1]);
        month = monthNames[dateDMY[2].substring(0, 3).toLowerCase()];
        year = dateDMY[3] ? parseInt(dateDMY[3]) : now.getFullYear();
      } else {
        month = monthNames[dateMDY![1].substring(0, 3).toLowerCase()];
        day = parseInt(dateMDY![2]);
        year = dateMDY![3] ? parseInt(dateMDY![3]) : now.getFullYear();
      }
      startTime.setFullYear(year, month, day);
      endTime.setFullYear(year, month, day);
      startTime.setHours(startH, 0, 0, 0);
      endTime.setHours(endH, 0, 0, 0);
    } else if (isToday) {
      startTime.setHours(startH, 0, 0, 0);
      endTime.setHours(endH, 0, 0, 0);
      // If the window is already past, fall back to tomorrow
      if (endTime <= now) {
        startTime.setDate(startTime.getDate() + 1);
        endTime.setDate(endTime.getDate() + 1);
      }
    } else if (isTomorrow) {
      startTime.setDate(startTime.getDate() + 1);
      endTime.setDate(endTime.getDate() + 1);
      startTime.setHours(startH, 0, 0, 0);
      endTime.setHours(endH, 0, 0, 0);
    } else {
      // No day specified — default to tomorrow
      startTime.setDate(startTime.getDate() + 1);
      endTime.setDate(endTime.getDate() + 1);
      startTime.setHours(startH, 0, 0, 0);
      endTime.setHours(endH, 0, 0, 0);
    }

    return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
  }

  // Parse time-of-day keywords: morning, afternoon, evening, night
  let startHour: number | null = null;
  let endHour: number | null = null;
  if (td.includes('morning') || td.includes('subah') || td.includes('savere')) {
    startHour = 6; endHour = 12;
  } else if (td.includes('afternoon') || td.includes('dopahar')) {
    startHour = 12; endHour = 17;
  } else if (td.includes('evening') || td.includes('shaam') || td.includes('sham')) {
    startHour = 17; endHour = 21;
  } else if (td.includes('night') || td.includes('raat')) {
    startHour = 21; endHour = 23;
  }

  const isToday = td.includes('today') || td.includes('aaj');
  const isTomorrow = td.includes('tomorrow') || td.includes('kal');

  // Try to parse an explicit date (e.g. "2 Feb 2026", "Feb 2", "3rd March")
  const kwMonths: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const kwDateDMY = td.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+(\d{4}))?/i);
  const kwDateMDY = !kwDateDMY ? td.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i) : null;
  const kwDateMatch = kwDateDMY || kwDateMDY;

  if (kwDateMatch) {
    let day: number, month: number, year: number;
    if (kwDateDMY) {
      day = parseInt(kwDateDMY[1]);
      month = kwMonths[kwDateDMY[2].substring(0, 3).toLowerCase()];
      year = kwDateDMY[3] ? parseInt(kwDateDMY[3]) : now.getFullYear();
    } else {
      month = kwMonths[kwDateMDY![1].substring(0, 3).toLowerCase()];
      day = parseInt(kwDateMDY![2]);
      year = kwDateMDY![3] ? parseInt(kwDateMDY![3]) : now.getFullYear();
    }
    startTime.setFullYear(year, month, day);
    endTime.setFullYear(year, month, day);
    startTime.setHours(startHour ?? 6, 0, 0, 0);
    endTime.setHours(endHour ?? 18, 0, 0, 0);
  } else if (isToday) {
    const dayStart = startHour != null ? startHour : Math.max(now.getHours() + 1, 6);
    const dayEnd = endHour != null ? endHour : 23;
    startTime.setHours(dayStart, 0, 0, 0);
    endTime.setHours(dayEnd, 59, 59, 0);
    // Guard: if endTime <= startTime (e.g., late at night), fall back to tomorrow
    if (endTime <= startTime) {
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(6, 0, 0, 0);
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(18, 0, 0, 0);
    }
  } else if (isTomorrow || !startHour) {
    // Default to tomorrow
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(startHour ?? 6, 0, 0, 0);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(endHour ?? 18, 0, 0, 0);
  } else {
    // Only time-of-day given, no day — assume tomorrow
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(startHour, 0, 0, 0);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(endHour, 0, 0, 0);
  }
  // Snap to 1-hour delivery blocks within 06:00-18:00 per trade rules
  return snapTimeWindow(startTime.toISOString(), endTime.toISOString());
}

/**
 * Get a valid auth token for a user (from their latest session).
 */
async function getUserAuthToken(userId: string): Promise<string | null> {
  const session = await prisma.session.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });
  return session?.token || null;
}

/**
 * Small helper: wait for ms milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Phase 1: Discover available offers and select the best match.
 * Returns the best offer info and transactionId without completing the purchase.
 */
export async function discoverBestOffer(
  userId: string,
  params: { quantity: number; maxPrice?: number; timeDesc?: string }
): Promise<DiscoveryResult> {
  const baseUrl = `http://localhost:${config.ports.bap}`;

  const token = await getUserAuthToken(userId);
  if (!token) {
    return { success: false, error: 'No valid session found. Please log in again.' };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Validate quantity (min 1 kWh, round to 2 decimals)
  const qtyError = validateQuantity(params.quantity);
  if (qtyError) {
    return { success: false, error: qtyError };
  }
  params.quantity = roundQuantity(params.quantity);

  const timeWindow = buildTimeWindow(params.timeDesc);

  // Gate closure check: reject if within 4h of delivery start
  const tradeCheck = checkTradeWindow(timeWindow.startTime);
  if (!tradeCheck.allowed) {
    return { success: false, error: tradeCheck.reason || 'Trade not allowed for this time window' };
  }

  // Buyer sanctioned load check
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sanctionedLoadKW: true } });
  const buyerCapError = checkBuyerCapacity(params.quantity, user?.sanctionedLoadKW);
  if (buyerCapError) {
    return { success: false, error: buyerCapError };
  }

  try {
    // Step 1: Discover available offers
    logger.info(`[BuyFlow:Discover] Discovering offers for user ${userId}: ${params.quantity} kWh`);
    const discoverRes = await axios.post(`${baseUrl}/api/discover`, {
      minQuantity: params.quantity,
      timeWindow,
    }, { headers, timeout: 15000 });

    const txId = discoverRes.data.transaction_id;
    if (!txId) {
      return { success: false, error: 'Discovery failed — no transaction ID returned.' };
    }

    const catalog = discoverRes.data.catalog
      || discoverRes.data.ack?.message?.catalog
      || null;
    const providers = catalog?.providers || [];
    const allOffers: any[] = [];
    for (const p of providers) {
      for (const item of (p.items || [])) {
        for (const offer of (item.offers || [])) {
          allOffers.push({
            ...offer,
            providerName: p.descriptor?.name || 'Unknown Seller',
            providerId: p.id,
          });
        }
      }
    }

    if (allOffers.length === 0) {
      return { success: false, error: 'No energy offers found matching your requirements. Try different quantity or time.' };
    }

    // Step 2: Smart buy — automatically picks single or multiple offers
    logger.info(`[BuyFlow:Discover] Smart buy selecting from ${allOffers.length} offers, txId=${txId}`);
    const selectRes = await axios.post(`${baseUrl}/api/select`, {
      transaction_id: txId,
      quantity: params.quantity,
      requestedTimeWindow: { startTime: timeWindow.startTime, endTime: timeWindow.endTime },
      smartBuy: true,
    }, { headers, timeout: 15000 });

    if (selectRes.data.error) {
      return { success: false, error: selectRes.data.error };
    }

    const selectionType: 'single' | 'multiple' = selectRes.data.selectionType || 'single';
    const selectedOffers: any[] = selectRes.data.selectedOffers || [];
    const summary = selectRes.data.summary;

    if (selectedOffers.length === 0) {
      return { success: false, error: 'No matching offer found. Try adjusting quantity or time window.' };
    }

    // Format time window label from the first offer's time window
    const formatTw = (tw: any): string => {
      if (!tw) return 'Flexible';
      try {
        const s = new Date(tw.startTime);
        const e = new Date(tw.endTime);
        return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}-${e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      } catch { return 'Flexible'; }
    };

    // Build discovered offers array
    const discoveredOffers: SmartBuyOffer[] = selectedOffers.map((o: any) => ({
      offerId: o.offer_id,
      providerId: o.provider_id,
      providerName: o.provider_name || 'Seller',
      price: o.unit_price,
      quantity: o.quantity,
      subtotal: o.subtotal,
      timeWindow: formatTw(o.timeWindow),
    }));

    const smartSummary: SmartBuySummary = {
      totalQuantity: summary?.totalQuantity || discoveredOffers.reduce((s, o) => s + o.quantity, 0),
      totalPrice: summary?.totalPrice || discoveredOffers.reduce((s, o) => s + o.subtotal, 0),
      averagePrice: summary?.averagePrice || (summary?.totalPrice / summary?.totalQuantity) || 0,
      fullyFulfilled: summary?.fullyFulfilled ?? true,
      shortfall: summary?.shortfall || 0,
      offersUsed: summary?.offersUsed || discoveredOffers.length,
    };

    // Check max price against average price
    if (params.maxPrice && smartSummary.averagePrice > params.maxPrice) {
      return {
        success: false,
        selectionType,
        discoveredOffers,
        summary: smartSummary,
        transactionId: txId,
        error: `Average price is Rs ${smartSummary.averagePrice.toFixed(2)}/unit, which exceeds your max of Rs ${params.maxPrice}/unit.`,
      };
    }

    // Also build legacy single discoveredOffer for backward compat
    const firstOffer = discoveredOffers[0];
    const discoveredOffer = selectionType === 'single' ? {
      offerId: firstOffer.offerId,
      providerId: firstOffer.providerId,
      providerName: firstOffer.providerName,
      price: firstOffer.price,
      quantity: firstOffer.quantity,
      timeWindow: firstOffer.timeWindow,
    } : undefined;

    logger.info(`[BuyFlow:Discover] Smart buy: ${selectionType} mode, ${smartSummary.offersUsed} offers, ${smartSummary.totalQuantity} kWh @ avg Rs${smartSummary.averagePrice.toFixed(2)}/kWh, txId=${txId}`);

    return {
      success: true,
      transactionId: txId,
      selectionType,
      discoveredOffer,
      discoveredOffers,
      summary: smartSummary,
    };
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message || 'Unknown error';
    logger.error(`[BuyFlow:Discover] Discovery failed: ${msg}`, { userId });
    return { success: false, error: msg };
  }
}

/**
 * Phase 2: Complete a purchase by running init → confirm on an already-selected offer.
 */
export async function completePurchase(
  userId: string,
  transactionId: string,
  discoveredOffer: DiscoveryResult['discoveredOffer'],
  quantity: number
): Promise<PurchaseResult> {
  const baseUrl = `http://localhost:${config.ports.bap}`;

  const token = await getUserAuthToken(userId);
  if (!token) {
    return { success: false, error: 'No valid session found. Please log in again.' };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  try {
    logger.info(`[BuyFlow:Complete] Init order, txId=${transactionId}`);
    await axios.post(`${baseUrl}/api/init`, {
      transaction_id: transactionId,
    }, { headers, timeout: 15000 });

    await sleep(2000);

    logger.info(`[BuyFlow:Complete] Confirming order, txId=${transactionId}`);
    const confirmRes = await axios.post(`${baseUrl}/api/confirm`, {
      transaction_id: transactionId,
    }, { headers, timeout: 15000 });

    await sleep(1000);

    // Handle bulk mode confirm response
    if (confirmRes.data.bulk_mode) {
      const confirmedCount = confirmRes.data.total_confirmed || 0;
      const failedCount = confirmRes.data.total_failed || 0;
      logger.info(`[BuyFlow:Complete] Bulk purchase: ${confirmedCount} confirmed, ${failedCount} failed, txId=${transactionId}`);

      return {
        success: confirmedCount > 0,
        order: {
          orderId: transactionId,
          transactionId,
          quantity,
          pricePerKwh: discoveredOffer?.price || 0,
          totalPrice: (discoveredOffer?.price || 0) * quantity,
          providerName: discoveredOffer?.providerName || 'Multiple Sellers',
          timeWindow: discoveredOffer?.timeWindow || 'Flexible',
        },
        bulkResult: { confirmedCount, failedCount },
        error: failedCount > 0 ? `${failedCount} order(s) failed to confirm` : undefined,
      };
    }

    // Single order confirm response
    const orderId = confirmRes.data.order_id;
    const price = discoveredOffer?.price || 0;
    const totalPrice = price * quantity;
    logger.info(`[BuyFlow:Complete] Purchase complete: order=${orderId}, ${quantity}kWh at Rs${price}/kWh = Rs${totalPrice}`);

    return {
      success: true,
      order: {
        orderId: orderId || transactionId,
        transactionId,
        quantity,
        pricePerKwh: price,
        totalPrice,
        providerName: discoveredOffer?.providerName || 'Solar Seller',
        timeWindow: discoveredOffer?.timeWindow || 'Flexible',
      },
    };
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message || 'Unknown error';
    logger.error(`[BuyFlow:Complete] Purchase completion failed: ${msg}`, { userId, transactionId });
    return { success: false, error: msg };
  }
}

/**
 * Execute a full buyer purchase flow: discover → select → init → confirm.
 * Convenience wrapper that calls both phases sequentially.
 */
export async function executePurchase(
  userId: string,
  params: { quantity: number; maxPrice?: number; timeDesc?: string }
): Promise<PurchaseResult> {
  const discovery = await discoverBestOffer(userId, params);
  if (!discovery.success || !discovery.transactionId) {
    return {
      success: false,
      error: discovery.error,
    };
  }

  const offer = discovery.discoveredOffer || (discovery.discoveredOffers?.[0] ? {
    offerId: discovery.discoveredOffers[0].offerId,
    providerId: discovery.discoveredOffers[0].providerId,
    providerName: discovery.discoveredOffers[0].providerName,
    price: discovery.discoveredOffers[0].price,
    quantity: discovery.discoveredOffers[0].quantity,
    timeWindow: discovery.discoveredOffers[0].timeWindow,
  } : undefined);

  if (!offer) {
    return { success: false, error: discovery.error || 'No offers found' };
  }

  return completePurchase(userId, discovery.transactionId, offer, params.quantity);
}

/**
 * Parse a time period from natural language.
 * Returns { startDate, endDate, label } or null.
 */
export function parseTimePeriod(message: string): { startDate: Date; endDate: Date; label: string } | null {
  const lower = message.toLowerCase();
  const now = new Date();

  if (lower.includes('today') || lower.includes('aaj')) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: now, label: 'today' };
  }

  if (lower.includes('yesterday') || lower.includes('kal') || lower.includes('parso')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: 'yesterday' };
  }

  if (lower.includes('this week') || lower.includes('is hafte') || lower.includes('is week')) {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: now, label: 'this week' };
  }

  if (lower.includes('last week') || lower.includes('pichle hafte') || lower.includes('pichhle week')) {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: 'last week' };
  }

  if (lower.includes('this month') || lower.includes('is mahine') || lower.includes('is month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start, endDate: now, label: 'this month' };
  }

  if (lower.includes('last month') || lower.includes('pichle mahine') || lower.includes('pichhle month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end, label: 'last month' };
  }

  // "last N days"
  const daysMatch = lower.match(/last\s+(\d+)\s*days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: now, label: `last ${days} days` };
  }

  return null;
}

/**
 * Get a welcome-back data summary for a returning user.
 * Returns structured data (always English) for LLM composition.
 */
export async function getWelcomeBackData(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, balance: true, providerId: true, productionCapacity: true, allowedTradeLimit: true },
  });
  if (!user) return '';

  const parts: string[] = [];
  parts.push(`User name: ${user.name || 'friend'}`);
  parts.push(`Wallet balance: Rs ${user.balance.toFixed(2)}`);

  if (user.providerId) {
    // Active listings
    const offers = await prisma.catalogOffer.findMany({
      where: { providerId: user.providerId },
      select: { maxQty: true, priceValue: true },
    });
    const totalListed = offers.reduce((sum, o) => sum + o.maxQty, 0);
    parts.push(`Active listings: ${offers.length} (total ${totalListed} kWh)`);

    // Recent orders (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentOrders = await prisma.order.findMany({
      where: {
        providerId: user.providerId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        createdAt: { gte: weekAgo },
      },
      select: { totalPrice: true, totalQty: true },
    });

    if (recentOrders.length > 0) {
      const recentEarnings = recentOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const recentKwh = recentOrders.reduce((sum, o) => sum + (o.totalQty || 0), 0);
      parts.push(`Last 7 days: ${recentOrders.length} order(s), ${recentKwh.toFixed(1)} kWh sold, Rs ${recentEarnings.toFixed(2)} earned`);
    } else {
      parts.push('Last 7 days: No new orders');
    }

    // All-time totals
    const allOrders = await prisma.order.findMany({
      where: {
        providerId: user.providerId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: { totalPrice: true, totalQty: true },
    });
    const totalEarnings = allOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalKwh = allOrders.reduce((sum, o) => sum + (o.totalQty || 0), 0);
    parts.push(`All-time: ${allOrders.length} order(s), ${totalKwh.toFixed(1)} kWh sold, Rs ${totalEarnings.toFixed(2)} total earnings`);
  } else {
    // Buyer — check buyer orders
    const buyerOrders = await prisma.order.findMany({
      where: { buyerId: userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { totalPrice: true, totalQty: true },
    });
    if (buyerOrders.length > 0) {
      const totalSpent = buyerOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalKwh = buyerOrders.reduce((sum, o) => sum + (o.totalQty || 0), 0);
      parts.push(`Purchases: ${buyerOrders.length} order(s), ${totalKwh.toFixed(1)} kWh bought, Rs ${totalSpent.toFixed(2)} spent`);
    } else {
      parts.push('No orders yet');
    }
  }

  return parts.join('\n');
}
