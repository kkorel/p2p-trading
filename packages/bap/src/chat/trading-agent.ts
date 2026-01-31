/**
 * Mock Trading Agent — Creates offers and reports earnings on behalf of sellers.
 */

import { prisma, createLogger } from '@p2p/shared';
import { registerProvider, addCatalogItem, addOffer } from '../seller-catalog';

const logger = createLogger('TradingAgent');

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

      // Ensure user has a provider profile
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

      // Calculate offer quantity
      const capacity = user.productionCapacity || 100;
      const tradeLimit = (capacity * (user.allowedTradeLimit || 10)) / 100;
      const offerQty = Math.max(1, Math.floor(tradeLimit * 0.5));
      const pricePerKwh = 6.0;

      // Time window: tomorrow 6 AM to 6 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(18, 0, 0, 0);

      // Create catalog item + offer
      const item = await addCatalogItem(
        providerId,
        'SOLAR',
        'SCHEDULED',
        offerQty,
        [],
        ''
      );

      await addOffer(
        item.id,
        providerId,
        pricePerKwh,
        'INR',
        offerQty,
        { startTime: tomorrow.toISOString(), endTime: endTime.toISOString() }
      );

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
  async getEarningsSummary(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { providerId: true, balance: true, name: true },
    });

    if (!user?.providerId) {
      return 'You have not started selling yet. Would you like me to set up trading for you?';
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

    if (completedOrders.length === 0) {
      return `No sales yet, ${user.name || 'friend'}. Your offers are live and waiting for buyers! Your wallet balance is Rs ${user.balance.toFixed(2)}.`;
    }

    return `Here are your earnings, ${user.name || 'friend'}:\n- Total orders: ${completedOrders.length}\n- Energy sold: ${totalKwh.toFixed(1)} kWh\n- Earnings: Rs ${totalEarnings.toFixed(2)}\n- Wallet balance: Rs ${user.balance.toFixed(2)}`;
  },

  /**
   * Get order status summary.
   */
  async getOrdersSummary(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { providerId: true },
    });

    if (!user?.providerId) {
      return 'No orders yet. Start selling first and buyers will find your offers!';
    }

    const orders = await prisma.order.findMany({
      where: { providerId: user.providerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, status: true, totalQty: true, totalPrice: true, createdAt: true },
    });

    if (orders.length === 0) {
      return 'No orders yet. Your offers are live — buyers will find them soon!';
    }

    const lines = orders.map(
      (o, i) =>
        `${i + 1}. ${o.totalQty || 0} kWh — Rs ${(o.totalPrice || 0).toFixed(2)} — ${o.status}`
    );

    return `Your recent orders:\n${lines.join('\n')}`;
  },
};
