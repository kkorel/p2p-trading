/**
 * Catalog data access for CDS Mock
 * Using Prisma ORM for PostgreSQL persistence
 */

import { prisma } from './db';
import { 
  CatalogItem, 
  CatalogOffer, 
  Provider, 
  Catalog, 
  ProviderCatalog,
  TimeWindow,
  OfferAttributes,
} from '@p2p/shared';

/**
 * Get all catalog items with their offers
 */
export async function getCatalog(): Promise<Catalog> {
  // Get all providers
  const providers = await prisma.provider.findMany();
  const providerMap = new Map<string, Provider>();
  
  for (const p of providers) {
    providerMap.set(p.id, {
      id: p.id,
      name: p.name,
      trust_score: p.trustScore,
      total_orders: p.totalOrders,
      successful_orders: p.successfulOrders,
    });
  }
  
  // Get all items with their offers
  const items = await prisma.catalogItem.findMany({
    include: {
      offers: true,
    },
  });
  
  // Group items by provider
  const providerCatalogs = new Map<string, ProviderCatalog>();
  
  for (const item of items) {
    if (!providerCatalogs.has(item.providerId)) {
      const provider = providerMap.get(item.providerId);
      providerCatalogs.set(item.providerId, {
        id: item.providerId,
        descriptor: provider ? { name: provider.name } : undefined,
        items: [],
      });
    }
    
    // Convert offers for this item
    const itemOffers: CatalogOffer[] = [];
    for (const offer of item.offers) {
      // Get available blocks count
      const availableBlocks = await prisma.offerBlock.count({
        where: {
          offerId: offer.id,
          status: 'AVAILABLE',
        },
      });
      
      itemOffers.push({
        id: offer.id,
        item_id: offer.itemId,
        provider_id: offer.providerId,
        offerAttributes: {
          pricingModel: offer.pricingModel as 'PER_KWH' | 'FLAT_RATE',
          settlementType: offer.settlementType as 'DAILY' | 'WEEKLY' | 'MONTHLY',
        },
        price: {
          value: offer.priceValue,
          currency: offer.currency,
        },
        maxQuantity: availableBlocks > 0 ? availableBlocks : offer.maxQty,
        timeWindow: {
          startTime: offer.timeWindowStart.toISOString(),
          endTime: offer.timeWindowEnd.toISOString(),
        },
      });
    }
    
    const productionWindows = JSON.parse(item.productionWindowsJson || '[]') as TimeWindow[];
    
    const catalogItem: CatalogItem = {
      id: item.id,
      provider_id: item.providerId,
      itemAttributes: {
        sourceType: item.sourceType as any,
        deliveryMode: item.deliveryMode as any,
        meterId: item.meterId || undefined,
        availableQuantity: item.availableQty,
        productionWindow: productionWindows,
      },
      offers: itemOffers,
    };
    
    providerCatalogs.get(item.providerId)!.items.push(catalogItem);
  }
  
  return {
    providers: Array.from(providerCatalogs.values()),
  };
}

/**
 * Get providers map for matching
 */
export async function getProviders(): Promise<Map<string, Provider>> {
  const providers = await prisma.provider.findMany();
  const providerMap = new Map<string, Provider>();
  
  for (const p of providers) {
    providerMap.set(p.id, {
      id: p.id,
      name: p.name,
      trust_score: p.trustScore,
      total_orders: p.totalOrders,
      successful_orders: p.successfulOrders,
    });
  }
  
  return providerMap;
}

// ==================== SYNC APIs (from BPP) ====================

/**
 * Sync a provider from BPP
 */
export async function syncProvider(provider: {
  id: string;
  name: string;
  trust_score?: number;
}): Promise<void> {
  await prisma.provider.upsert({
    where: { id: provider.id },
    create: {
      id: provider.id,
      name: provider.name,
      trustScore: provider.trust_score ?? 0.5,
      totalOrders: 0,
      successfulOrders: 0,
    },
    update: {
      name: provider.name,
      trustScore: provider.trust_score ?? 0.5,
    },
  });
}

/**
 * Sync a catalog item from BPP
 */
export async function syncItem(item: {
  id: string;
  provider_id: string;
  source_type: string;
  delivery_mode: string;
  available_qty: number;
  production_windows?: TimeWindow[];
  meter_id?: string;
}): Promise<void> {
  await prisma.catalogItem.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      providerId: item.provider_id,
      sourceType: item.source_type,
      deliveryMode: item.delivery_mode,
      availableQty: item.available_qty,
      meterId: item.meter_id || null,
      productionWindowsJson: JSON.stringify(item.production_windows || []),
    },
    update: {
      sourceType: item.source_type,
      deliveryMode: item.delivery_mode,
      availableQty: item.available_qty,
      meterId: item.meter_id || null,
      productionWindowsJson: JSON.stringify(item.production_windows || []),
    },
  });
}

/**
 * Sync an offer from BPP (creates blocks if new offer)
 */
export async function syncOffer(offer: {
  id: string;
  item_id: string;
  provider_id: string;
  price_value: number;
  currency: string;
  max_qty: number;
  time_window: TimeWindow;
  offer_attributes?: OfferAttributes;
}): Promise<void> {
  const offerAttributes = offer.offer_attributes || {
    pricingModel: 'PER_KWH',
    settlementType: 'DAILY',
  };
  
  // Check if exists
  const existing = await prisma.catalogOffer.findUnique({
    where: { id: offer.id },
  });
  
  if (existing) {
    // Update existing offer
    await prisma.catalogOffer.update({
      where: { id: offer.id },
      data: {
        priceValue: offer.price_value,
        currency: offer.currency,
        maxQty: offer.max_qty,
        timeWindowStart: new Date(offer.time_window.startTime),
        timeWindowEnd: new Date(offer.time_window.endTime),
        pricingModel: offerAttributes.pricingModel,
        settlementType: offerAttributes.settlementType,
      },
    });
  } else {
    // Create new offer
    await prisma.catalogOffer.create({
      data: {
        id: offer.id,
        itemId: offer.item_id,
        providerId: offer.provider_id,
        priceValue: offer.price_value,
        currency: offer.currency,
        maxQty: offer.max_qty,
        timeWindowStart: new Date(offer.time_window.startTime),
        timeWindowEnd: new Date(offer.time_window.endTime),
        pricingModel: offerAttributes.pricingModel,
        settlementType: offerAttributes.settlementType,
      },
    });
    
    // Create blocks for new offer (1 block = 1 unit)
    const blockData = Array.from({ length: offer.max_qty }, (_, i) => ({
      id: `block-${offer.id}-${i}`,
      offerId: offer.id,
      itemId: offer.item_id,
      providerId: offer.provider_id,
      status: 'AVAILABLE',
      priceValue: offer.price_value,
      currency: offer.currency,
    }));
    
    await prisma.offerBlock.createMany({
      data: blockData,
    });
  }
}

/**
 * Update block status in CDS (when blocks are sold/reserved in BPP)
 */
export async function updateBlockStatus(
  offerId: string,
  blockIds: string[],
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD',
  orderId?: string,
  transactionId?: string
): Promise<void> {
  if (blockIds.length === 0) return;
  
  const now = new Date();
  
  if (status === 'AVAILABLE') {
    await prisma.offerBlock.updateMany({
      where: { id: { in: blockIds } },
      data: {
        status: 'AVAILABLE',
        orderId: null,
        transactionId: null,
        reservedAt: null,
        soldAt: null,
      },
    });
  } else if (status === 'RESERVED') {
    await prisma.offerBlock.updateMany({
      where: { id: { in: blockIds } },
      data: {
        status: 'RESERVED',
        orderId: orderId || null,
        transactionId: transactionId || null,
        reservedAt: now,
      },
    });
  } else if (status === 'SOLD') {
    await prisma.offerBlock.updateMany({
      where: { id: { in: blockIds } },
      data: {
        status: 'SOLD',
        orderId: orderId || null,
        transactionId: transactionId || null,
        soldAt: now,
      },
    });
  }
}

/**
 * Delete an offer (also deletes blocks)
 */
export async function deleteOffer(offerId: string): Promise<void> {
  // Delete blocks first (cascade should handle this, but being explicit)
  await prisma.offerBlock.deleteMany({
    where: { offerId },
  });
  
  await prisma.catalogOffer.delete({
    where: { id: offerId },
  });
}
