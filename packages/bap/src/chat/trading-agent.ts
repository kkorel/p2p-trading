/**
 * Trading Agent — Creates offers and reports earnings/listings for sellers.
 * Supports language-aware responses (English / Hinglish).
 */

import { prisma, createLogger, publishOfferToCDS, isExternalCDSEnabled } from '@p2p/shared';
import { registerProvider, addCatalogItem, addOffer } from '../seller-catalog';

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
