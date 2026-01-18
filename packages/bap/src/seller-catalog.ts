/**
 * Catalog data access for Seller (BPP) functionality
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from './db';
import { CatalogOffer, Provider, TimeWindow, OfferAttributes, SourceType, DeliveryMode, ItemAttributes, rowToObject } from '@p2p/shared';

export interface CatalogItem {
  id: string;
  provider_id: string;
  source_type: SourceType;
  delivery_mode: DeliveryMode;
  available_qty: number;
  production_windows: TimeWindow[];
  meter_id: string;
}

/**
 * Get an offer by ID (with available blocks)
 */
export function getOfferById(offerId: string): (CatalogOffer & { availableBlocks?: number }) | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM catalog_offers WHERE id = ?', [offerId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = rowToObject(result[0].columns, result[0].values[0]);
  
  // Get available blocks count (gracefully handle if blocks don't exist yet)
  let availableBlocks: number;
  try {
    availableBlocks = getAvailableBlockCount(offerId);
    // If no blocks found, use max_qty as fallback (for backward compatibility with old offers)
    if (availableBlocks === 0) {
      // Check if any blocks exist at all for this offer
      const blockCheck = db.exec('SELECT COUNT(*) as count FROM offer_blocks WHERE offer_id = ?', [offerId]);
      if (blockCheck.length === 0 || blockCheck[0].values.length === 0 || blockCheck[0].values[0][0] === 0) {
        availableBlocks = row.max_qty; // No blocks created yet, use original max_qty
      }
    }
  } catch (error) {
    // If table doesn't exist or error occurs, fallback to max_qty
    availableBlocks = row.max_qty;
  }
  
  return {
    id: row.id,
    item_id: row.item_id,
    provider_id: row.provider_id,
    offerAttributes: JSON.parse(row.offer_attributes_json) as OfferAttributes,
    price: {
      value: row.price_value,
      currency: row.currency,
    },
    maxQuantity: row.max_qty, // Original max quantity
    timeWindow: JSON.parse(row.time_window_json) as TimeWindow,
    availableBlocks, // Available blocks (for catalog/discovery)
  };
}

/**
 * Get item available quantity
 */
export function getItemAvailableQuantity(itemId: string): number | null {
  const db = getDb();
  const result = db.exec('SELECT available_qty FROM catalog_items WHERE id = ?', [itemId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  return result[0].values[0][0] as number;
}

/**
 * Get provider by ID
 */
export function getProvider(providerId: string): Provider | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM providers WHERE id = ?', [providerId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = rowToObject(result[0].columns, result[0].values[0]);
  
  return {
    id: row.id,
    name: row.name,
    trust_score: row.trust_score,
    total_orders: row.total_orders,
    successful_orders: row.successful_orders,
  };
}

/**
 * Update provider statistics after order completion
 */
export function updateProviderStats(providerId: string, wasSuccessful: boolean): void {
  const db = getDb();
  const provider = getProvider(providerId);
  
  if (!provider) return;
  
  const newTotalOrders = provider.total_orders + 1;
  const newSuccessfulOrders = provider.successful_orders + (wasSuccessful ? 1 : 0);
  
  // Calculate new trust score
  const successRate = newSuccessfulOrders / newTotalOrders;
  const baseRating = 0.5;
  const newTrustScore = successRate * 0.7 + baseRating * 0.3;
  
  db.run(
    `UPDATE providers SET total_orders = ?, successful_orders = ?, trust_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newTotalOrders, newSuccessfulOrders, newTrustScore, providerId]
  );
  saveDb();
}

// ==================== SELLER APIs ====================

/**
 * Register a new provider (seller)
 */
export function registerProvider(name: string): Provider {
  const db = getDb();
  const id = `provider-${uuidv4().substring(0, 8)}`;
  
  db.run(
    `INSERT INTO providers (id, name, trust_score, total_orders, successful_orders) VALUES (?, ?, 0.5, 0, 0)`,
    [id, name]
  );
  saveDb();
  
  return {
    id,
    name,
    trust_score: 0.5,
    total_orders: 0,
    successful_orders: 0,
  };
}

/**
 * Get all providers
 */
export function getAllProviders(): Provider[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM providers');
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    return {
      id: row.id,
      name: row.name,
      trust_score: row.trust_score,
      total_orders: row.total_orders,
      successful_orders: row.successful_orders,
    };
  });
}

/**
 * Add a catalog item (energy listing)
 */
export function addCatalogItem(
  providerId: string,
  sourceType: SourceType,
  deliveryMode: DeliveryMode = 'SCHEDULED', // Always scheduled for P2P energy
  availableQty: number,
  productionWindows: TimeWindow[],
  meterId: string
): CatalogItem {
  const db = getDb();
  const id = `item-${sourceType.toLowerCase()}-${uuidv4().substring(0, 6)}`;
  
  const itemAttributes: ItemAttributes = {
    sourceType,
    deliveryMode,
    meterId,
    availableQuantity: availableQty,
    productionWindow: productionWindows,
  };
  
  db.run(
    `INSERT INTO catalog_items (id, provider_id, source_type, delivery_mode, available_qty, production_windows_json, raw_json) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      providerId,
      sourceType,
      deliveryMode,
      availableQty,
      JSON.stringify(productionWindows),
      JSON.stringify(itemAttributes),
    ]
  );
  saveDb();
  
  return {
    id,
    provider_id: providerId,
    source_type: sourceType,
    delivery_mode: deliveryMode,
    available_qty: availableQty,
    production_windows: productionWindows,
    meter_id: meterId,
  };
}

/**
 * Get all items for a provider
 */
export function getProviderItems(providerId: string): CatalogItem[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM catalog_items WHERE provider_id = ?', [providerId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    return {
      id: row.id,
      provider_id: row.provider_id,
      source_type: row.source_type,
      delivery_mode: row.delivery_mode,
      available_qty: row.available_qty,
      production_windows: JSON.parse(row.production_windows_json || '[]'),
      meter_id: row.meter_id || '',
    };
  });
}

/**
 * Get all items
 */
export function getAllItems(): CatalogItem[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM catalog_items');
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    return {
      id: row.id,
      provider_id: row.provider_id,
      source_type: row.source_type,
      delivery_mode: row.delivery_mode,
      available_qty: row.available_qty,
      production_windows: JSON.parse(row.production_windows_json || '[]'),
      meter_id: '',
    };
  });
}

/**
 * Add an offer for an item
 * Creates the offer and generates individual 1-unit blocks
 */
export function addOffer(
  itemId: string,
  providerId: string,
  pricePerKwh: number,
  currency: string,
  maxQty: number,
  timeWindow: TimeWindow
): CatalogOffer {
  const db = getDb();
  const id = `offer-${uuidv4().substring(0, 8)}`;
  
  const offerAttributes: OfferAttributes = {
    pricingModel: 'PER_KWH',
    settlementType: 'DAILY',
  };
  
  db.run(
    `INSERT INTO catalog_offers (id, item_id, provider_id, offer_attributes_json, price_value, currency, max_qty, time_window_json, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      itemId,
      providerId,
      JSON.stringify(offerAttributes),
      pricePerKwh,
      currency,
      maxQty,
      JSON.stringify(timeWindow),
      JSON.stringify({ offerAttributes, price: { value: pricePerKwh, currency }, maxQty, timeWindow }),
    ]
  );
  
  // Create individual blocks (1 block = 1 unit)
  createBlocksForOffer(id, itemId, providerId, pricePerKwh, currency, timeWindow, maxQty);
  
  saveDb();
  
  return {
    id,
    item_id: itemId,
    provider_id: providerId,
    offerAttributes,
    price: { value: pricePerKwh, currency },
    maxQuantity: maxQty,
    timeWindow,
  };
}

/**
 * Get all offers for a provider (with block stats)
 */
export function getProviderOffers(providerId: string): (CatalogOffer & { blockStats?: BlockStats })[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM catalog_offers WHERE provider_id = ?', [providerId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    const offer: CatalogOffer & { blockStats?: BlockStats } = {
      id: row.id,
      item_id: row.item_id,
      provider_id: row.provider_id,
      offerAttributes: JSON.parse(row.offer_attributes_json) as OfferAttributes,
      price: { value: row.price_value, currency: row.currency },
      maxQuantity: row.max_qty,
      timeWindow: JSON.parse(row.time_window_json) as TimeWindow,
    };
    
    // Add block statistics (gracefully handle if blocks don't exist)
    try {
      offer.blockStats = getBlockStats(row.id);
    } catch (error) {
      // If blocks don't exist yet, create default stats
      offer.blockStats = {
        total: row.max_qty,
        available: row.max_qty,
        reserved: 0,
        sold: 0,
      };
    }
    
    return offer;
  });
}

/**
 * Get all offers (with block stats)
 */
export function getAllOffers(): (CatalogOffer & { blockStats?: BlockStats })[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM catalog_offers');
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    const offer: CatalogOffer & { blockStats?: BlockStats } = {
      id: row.id,
      item_id: row.item_id,
      provider_id: row.provider_id,
      offerAttributes: JSON.parse(row.offer_attributes_json) as OfferAttributes,
      price: { value: row.price_value, currency: row.currency },
      maxQuantity: row.max_qty,
      timeWindow: JSON.parse(row.time_window_json) as TimeWindow,
    };
    
    // Add block statistics (gracefully handle if blocks don't exist)
    try {
      offer.blockStats = getBlockStats(row.id);
    } catch (error) {
      // If blocks don't exist yet, create default stats
      offer.blockStats = {
        total: row.max_qty,
        available: row.max_qty,
        reserved: 0,
        sold: 0,
      };
    }
    
    return offer;
  });
}

/**
 * Update item available quantity
 */
export function updateItemQuantity(itemId: string, newQuantity: number): void {
  const db = getDb();
  db.run('UPDATE catalog_items SET available_qty = ? WHERE id = ?', [newQuantity, itemId]);
  saveDb();
}

/**
 * Delete an offer
 */
export function deleteOffer(offerId: string): boolean {
  const db = getDb();
  // Also delete all blocks for this offer
  db.run('DELETE FROM offer_blocks WHERE offer_id = ?', [offerId]);
  db.run('DELETE FROM catalog_offers WHERE id = ?', [offerId]);
  saveDb();
  return true;
}

// ==================== BLOCK-BASED ORDER BOOK ====================

export interface OfferBlock {
  id: string;
  offer_id: string;
  item_id: string;
  provider_id: string;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  order_id?: string;
  transaction_id?: string;
  price_value: number;
  currency: string;
  time_window: TimeWindow;
  created_at: string;
  reserved_at?: string;
  sold_at?: string;
}

export interface BlockStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

/**
 * Create blocks for an offer (1 block = 1 unit)
 */
export function createBlocksForOffer(
  offerId: string,
  itemId: string,
  providerId: string,
  priceValue: number,
  currency: string,
  timeWindow: TimeWindow,
  quantity: number
): OfferBlock[] {
  const db = getDb();
  const blocks: OfferBlock[] = [];
  const now = new Date().toISOString();
  
  for (let i = 0; i < quantity; i++) {
    const blockId = `block-${offerId}-${i}`;
    db.run(
      `INSERT INTO offer_blocks (id, offer_id, item_id, provider_id, status, price_value, currency, time_window_json, created_at)
       VALUES (?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?)`,
      [blockId, offerId, itemId, providerId, priceValue, currency, JSON.stringify(timeWindow), now]
    );
    
    blocks.push({
      id: blockId,
      offer_id: offerId,
      item_id: itemId,
      provider_id: providerId,
      status: 'AVAILABLE',
      price_value: priceValue,
      currency,
      time_window: timeWindow,
      created_at: now,
    });
  }
  
  saveDb();
  return blocks;
}

/**
 * Atomically claim available blocks for an offer
 * Returns the number of blocks successfully claimed
 */
export function claimBlocks(
  offerId: string,
  quantity: number,
  orderId: string,
  transactionId: string
): OfferBlock[] {
  const db = getDb();
  const now = new Date().toISOString();
  
  // Atomically claim blocks using a transaction-like approach
  const result = db.exec(
    `SELECT id, offer_id, item_id, provider_id, price_value, currency, time_window_json 
     FROM offer_blocks 
     WHERE offer_id = ? AND status = 'AVAILABLE' 
     LIMIT ?`,
    [offerId, quantity]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  const claimedBlocks: OfferBlock[] = [];
  const blockIds: string[] = [];
  
  const cols = result[0].columns;
  for (const row of result[0].values) {
    const block = rowToObject(cols, row);
    blockIds.push(block.id);
    
    claimedBlocks.push({
      id: block.id,
      offer_id: block.offer_id,
      item_id: block.item_id,
      provider_id: block.provider_id,
      status: 'RESERVED',
      order_id: orderId,
      transaction_id: transactionId,
      price_value: block.price_value,
      currency: block.currency,
      time_window: JSON.parse(block.time_window_json),
      created_at: now,
      reserved_at: now,
    });
  }
  
  // Update all claimed blocks to RESERVED status
  if (blockIds.length > 0) {
    const placeholders = blockIds.map(() => '?').join(',');
    db.run(
      `UPDATE offer_blocks 
       SET status = 'RESERVED', order_id = ?, transaction_id = ?, reserved_at = ? 
       WHERE id IN (${placeholders})`,
      [orderId, transactionId, now, ...blockIds]
    );
    saveDb();
  }
  
  return claimedBlocks;
}

/**
 * Mark blocks as SOLD (when order is confirmed)
 */
export function markBlocksAsSold(orderId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE offer_blocks 
     SET status = 'SOLD', sold_at = ? 
     WHERE order_id = ? AND status = 'RESERVED'`,
    [now, orderId]
  );
  saveDb();
}

/**
 * Release reserved blocks (if order fails or is cancelled)
 */
export function releaseBlocks(transactionId: string): void {
  const db = getDb();
  
  db.run(
    `UPDATE offer_blocks 
     SET status = 'AVAILABLE', order_id = NULL, transaction_id = NULL, reserved_at = NULL 
     WHERE transaction_id = ? AND status = 'RESERVED'`,
    [transactionId]
  );
  saveDb();
}

/**
 * Get block statistics for an offer
 */
export function getBlockStats(offerId: string): BlockStats {
  const db = getDb();
  
  const result = db.exec(
    `SELECT status, COUNT(*) as count 
     FROM offer_blocks 
     WHERE offer_id = ? 
     GROUP BY status`,
    [offerId]
  );
  
  const stats: BlockStats = {
    total: 0,
    available: 0,
    reserved: 0,
    sold: 0,
  };
  
  if (result.length > 0) {
    const cols = result[0].columns;
    for (const row of result[0].values) {
      const r = rowToObject(cols, row);
      const count = r.count as number;
      stats.total += count;
      
      if (r.status === 'AVAILABLE') stats.available = count;
      else if (r.status === 'RESERVED') stats.reserved = count;
      else if (r.status === 'SOLD') stats.sold = count;
    }
  }
  
  return stats;
}

/**
 * Get available block count for an offer (for catalog/discovery)
 */
export function getAvailableBlockCount(offerId: string): number {
  const db = getDb();
  const result = db.exec(
    `SELECT COUNT(*) as count 
     FROM offer_blocks 
     WHERE offer_id = ? AND status = 'AVAILABLE'`,
    [offerId]
  );
  
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0] as number;
  }
  
  return 0;
}

/**
 * Get blocks for an order
 */
export function getBlocksForOrder(orderId: string): OfferBlock[] {
  const db = getDb();
  const result = db.exec(
    `SELECT id, offer_id, item_id, provider_id, status, order_id, transaction_id, 
            price_value, currency, time_window_json, created_at, reserved_at, sold_at
     FROM offer_blocks 
     WHERE order_id = ?`,
    [orderId]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  const cols = result[0].columns;
  return result[0].values.map(values => {
    const row = rowToObject(cols, values);
    return {
      id: row.id,
      offer_id: row.offer_id,
      item_id: row.item_id,
      provider_id: row.provider_id,
      status: row.status,
      order_id: row.order_id,
      transaction_id: row.transaction_id,
      price_value: row.price_value,
      currency: row.currency,
      time_window: JSON.parse(row.time_window_json),
      created_at: row.created_at,
      reserved_at: row.reserved_at,
      sold_at: row.sold_at,
    };
  });
}
