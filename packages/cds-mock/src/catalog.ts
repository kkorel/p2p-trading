/**
 * Catalog data access for CDS Mock
 */

import { getDb } from './db';
import { 
  CatalogItem, 
  CatalogOffer, 
  Provider, 
  Catalog, 
  ProviderCatalog,
  TimeWindow,
  OfferAttributes
} from '@p2p/shared';

/**
 * Get all catalog items with their offers
 */
export function getCatalog(): Catalog {
  const db = getDb();
  
  // Get all providers
  const providerResult = db.exec('SELECT * FROM providers');
  const providers = new Map<string, Provider>();
  
  if (providerResult.length > 0) {
    const cols = providerResult[0].columns;
    for (const row of providerResult[0].values) {
      const p = rowToObject(cols, row);
      providers.set(p.id, {
        id: p.id,
        name: p.name,
        trust_score: p.trust_score,
        total_orders: p.total_orders,
        successful_orders: p.successful_orders,
      });
    }
  }
  
  // Get all items
  const itemResult = db.exec('SELECT * FROM catalog_items');
  const items: any[] = [];
  if (itemResult.length > 0) {
    const cols = itemResult[0].columns;
    for (const row of itemResult[0].values) {
      items.push(rowToObject(cols, row));
    }
  }
  
  // Get all offers
  const offerResult = db.exec('SELECT * FROM catalog_offers');
  const offers: any[] = [];
  if (offerResult.length > 0) {
    const cols = offerResult[0].columns;
    for (const row of offerResult[0].values) {
      offers.push(rowToObject(cols, row));
    }
  }
  
  // Group items by provider
  const providerCatalogs = new Map<string, ProviderCatalog>();
  
  for (const itemRow of items) {
    if (!providerCatalogs.has(itemRow.provider_id)) {
      const provider = providers.get(itemRow.provider_id);
      providerCatalogs.set(itemRow.provider_id, {
        id: itemRow.provider_id,
        descriptor: provider ? { name: provider.name } : undefined,
        items: [],
      });
    }
    
    const itemOffers = offers
      .filter(o => o.item_id === itemRow.id)
      .map(o => rowToOffer(o));
    
    const item = rowToItem(itemRow, itemOffers);
    providerCatalogs.get(itemRow.provider_id)!.items.push(item);
  }
  
  return {
    providers: Array.from(providerCatalogs.values()),
  };
}

function rowToObject(columns: string[], values: any[]): any {
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

function rowToItem(row: any, offers: CatalogOffer[]): CatalogItem {
  const productionWindows = JSON.parse(row.production_windows_json) as TimeWindow[];
  
  return {
    id: row.id,
    provider_id: row.provider_id,
    itemAttributes: {
      sourceType: row.source_type as any,
      deliveryMode: row.delivery_mode as any,
      meterId: row.meter_id,
      availableQuantity: row.available_qty,
      productionWindow: productionWindows,
    },
    offers,
  };
}

function rowToOffer(row: any): CatalogOffer {
  const db = getDb();
  const timeWindow = JSON.parse(row.time_window_json) as TimeWindow;
  const offerAttributes = JSON.parse(row.offer_attributes_json) as OfferAttributes;
  
  // Get available blocks count (for discovery - shows actual available capacity)
  const blockResult = db.exec(
    `SELECT COUNT(*) as count FROM offer_blocks WHERE offer_id = ? AND status = 'AVAILABLE'`,
    [row.id]
  );
  const availableBlocks = blockResult.length > 0 && blockResult[0].values.length > 0 
    ? blockResult[0].values[0][0] as number 
    : row.max_qty; // Fallback to max_qty if no blocks found (backward compatibility)
  
  return {
    id: row.id,
    item_id: row.item_id,
    provider_id: row.provider_id,
    offerAttributes,
    price: {
      value: row.price_value,
      currency: row.currency,
    },
    maxQuantity: availableBlocks, // Use available blocks for discovery
    timeWindow,
  };
}

/**
 * Get providers map for matching
 */
export function getProviders(): Map<string, Provider> {
  const db = getDb();
  const result = db.exec('SELECT * FROM providers');
  const providers = new Map<string, Provider>();
  
  if (result.length > 0) {
    const cols = result[0].columns;
    for (const row of result[0].values) {
      const p = rowToObject(cols, row);
      providers.set(p.id, {
        id: p.id,
        name: p.name,
        trust_score: p.trust_score,
        total_orders: p.total_orders,
        successful_orders: p.successful_orders,
      });
    }
  }
  
  return providers;
}

// ==================== SYNC APIs (from BPP) ====================

import { saveDb } from './db';

/**
 * Sync a provider from BPP
 */
export function syncProvider(provider: {
  id: string;
  name: string;
  trust_score?: number;
}): void {
  const db = getDb();
  
  // Check if exists
  const existing = db.exec('SELECT id FROM providers WHERE id = ?', [provider.id]);
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    // Update
    db.run(
      'UPDATE providers SET name = ?, trust_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [provider.name, provider.trust_score || 0.5, provider.id]
    );
  } else {
    // Insert
    db.run(
      'INSERT INTO providers (id, name, trust_score, total_orders, successful_orders) VALUES (?, ?, ?, 0, 0)',
      [provider.id, provider.name, provider.trust_score || 0.5]
    );
  }
  saveDb();
}

/**
 * Sync a catalog item from BPP
 */
export function syncItem(item: {
  id: string;
  provider_id: string;
  source_type: string;
  delivery_mode: string;
  available_qty: number;
  production_windows?: TimeWindow[];
  meter_id?: string;
}): void {
  const db = getDb();
  
  // Check if exists
  const existing = db.exec('SELECT id FROM catalog_items WHERE id = ?', [item.id]);
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    // Update
    db.run(
      `UPDATE catalog_items SET 
        source_type = ?, delivery_mode = ?, available_qty = ?, 
        production_windows_json = ?, raw_json = ?
       WHERE id = ?`,
      [
        item.source_type,
        item.delivery_mode,
        item.available_qty,
        JSON.stringify(item.production_windows || []),
        JSON.stringify(item),
        item.id
      ]
    );
  } else {
    // Insert
    db.run(
      `INSERT INTO catalog_items (id, provider_id, source_type, delivery_mode, available_qty, production_windows_json, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.provider_id,
        item.source_type,
        item.delivery_mode,
        item.available_qty,
        JSON.stringify(item.production_windows || []),
        JSON.stringify(item)
      ]
    );
  }
  saveDb();
}

/**
 * Sync an offer from BPP (creates blocks if new offer)
 */
export function syncOffer(offer: {
  id: string;
  item_id: string;
  provider_id: string;
  price_value: number;
  currency: string;
  max_qty: number;
  time_window: TimeWindow;
  offer_attributes?: OfferAttributes;
}): void {
  const db = getDb();
  
  const offerAttributes = offer.offer_attributes || {
    pricingModel: 'PER_KWH',
    settlementType: 'DAILY',
  };
  
  // Check if exists
  const existing = db.exec('SELECT id FROM catalog_offers WHERE id = ?', [offer.id]);
  const isNew = existing.length === 0 || existing[0].values.length === 0;
  
  if (!isNew) {
    // Update existing offer
    db.run(
      `UPDATE catalog_offers SET 
        price_value = ?, currency = ?, max_qty = ?, 
        time_window_json = ?, offer_attributes_json = ?, raw_json = ?
       WHERE id = ?`,
      [
        offer.price_value,
        offer.currency,
        offer.max_qty,
        JSON.stringify(offer.time_window),
        JSON.stringify(offerAttributes),
        JSON.stringify(offer),
        offer.id
      ]
    );
  } else {
    // Insert new offer
    db.run(
      `INSERT INTO catalog_offers (id, item_id, provider_id, offer_attributes_json, price_value, currency, max_qty, time_window_json, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offer.id,
        offer.item_id,
        offer.provider_id,
        JSON.stringify(offerAttributes),
        offer.price_value,
        offer.currency,
        offer.max_qty,
        JSON.stringify(offer.time_window),
        JSON.stringify(offer)
      ]
    );
    
    // Create blocks for new offer (1 block = 1 unit)
    const now = new Date().toISOString();
    for (let i = 0; i < offer.max_qty; i++) {
      const blockId = `block-${offer.id}-${i}`;
      db.run(
        `INSERT INTO offer_blocks (id, offer_id, item_id, provider_id, status, price_value, currency, time_window_json, created_at)
         VALUES (?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?)`,
        [blockId, offer.id, offer.item_id, offer.provider_id, offer.price_value, offer.currency, JSON.stringify(offer.time_window), now]
      );
    }
  }
  saveDb();
}

/**
 * Update block status in CDS (when blocks are sold/reserved in BPP)
 */
export function updateBlockStatus(
  offerId: string,
  blockIds: string[],
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD',
  orderId?: string,
  transactionId?: string
): void {
  const db = getDb();
  const now = new Date().toISOString();
  
  if (blockIds.length === 0) return;
  
  const placeholders = blockIds.map(() => '?').join(',');
  const updateFields: string[] = ['status = ?'];
  const updateValues: any[] = [status];
  
  if (status === 'RESERVED' || status === 'SOLD') {
    updateFields.push('order_id = ?', 'transaction_id = ?');
    updateValues.push(orderId || null, transactionId || null);
    
    if (status === 'RESERVED') {
      updateFields.push('reserved_at = ?');
      updateValues.push(now);
    } else if (status === 'SOLD') {
      updateFields.push('sold_at = ?');
      updateValues.push(now);
    }
  } else {
    // AVAILABLE - clear order references
    updateFields.push('order_id = NULL', 'transaction_id = NULL', 'reserved_at = NULL', 'sold_at = NULL');
  }
  
  updateValues.push(...blockIds);
  
  db.run(
    `UPDATE offer_blocks SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`,
    updateValues
  );
  saveDb();
}

/**
 * Delete an offer (also deletes blocks)
 */
export function deleteOffer(offerId: string): void {
  const db = getDb();
  db.run('DELETE FROM offer_blocks WHERE offer_id = ?', [offerId]);
  db.run('DELETE FROM catalog_offers WHERE id = ?', [offerId]);
  saveDb();
}
