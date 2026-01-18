/**
 * Seed data for CDS Mock
 * Mirrors the BPP seed data - in production, CDS would fetch from BPPs
 */

import { initDb, getDb, saveDb, closeDb } from './db';

// Tomorrow's date for realistic time windows
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dateStr = tomorrow.toISOString().split('T')[0];

const SEED_DATA = {
  providers: [
    {
      id: 'provider-solar-alpha',
      name: 'Alpha Solar Energy',
      trust_score: 0.85,
      total_orders: 20,
      successful_orders: 17,
    },
    {
      id: 'provider-solar-beta',
      name: 'Beta Green Power',
      trust_score: 0.60,
      total_orders: 5,
      successful_orders: 3,
    },
  ],
  
  items: [
    {
      id: 'item-solar-001',
      provider_id: 'provider-solar-alpha',
      source_type: 'SOLAR',
      delivery_mode: 'SCHEDULED', // Always scheduled for P2P energy trading
      available_qty: 100,
      meter_id: 'MTR-ALPHA-001',
      production_windows: [
        { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
      ],
    },
  ],
  
  offers: [
    {
      id: 'offer-alpha-morning',
      item_id: 'item-solar-001',
      provider_id: 'provider-solar-alpha',
      price_value: 0.10,
      currency: 'USD',
      max_qty: 50,
      time_window: { startTime: `${dateStr}T10:00:00Z`, endTime: `${dateStr}T14:00:00Z` },
      offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
    },
    {
      id: 'offer-beta-afternoon',
      item_id: 'item-solar-001',
      provider_id: 'provider-solar-beta',
      price_value: 0.08,
      currency: 'USD',
      max_qty: 100,
      time_window: { startTime: `${dateStr}T12:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
      offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
    },
  ],
};

async function seed() {
  console.log('🌱 Seeding CDS Mock database...\n');
  
  await initDb();
  const db = getDb();
  
  // Clear existing data
  db.run('DELETE FROM offer_blocks');
  db.run('DELETE FROM catalog_offers');
  db.run('DELETE FROM catalog_items');
  db.run('DELETE FROM providers');
  db.run('DELETE FROM events');
  
  // Insert providers
  for (const provider of SEED_DATA.providers) {
    db.run(
      `INSERT INTO providers (id, name, trust_score, total_orders, successful_orders) VALUES (?, ?, ?, ?, ?)`,
      [provider.id, provider.name, provider.trust_score, provider.total_orders, provider.successful_orders]
    );
    console.log(`✅ Provider: ${provider.name} (trust: ${provider.trust_score})`);
  }
  
  // Insert items
  for (const item of SEED_DATA.items) {
    db.run(
      `INSERT INTO catalog_items (id, provider_id, source_type, delivery_mode, available_qty, meter_id, production_windows_json, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.provider_id, item.source_type, item.delivery_mode, item.available_qty, item.meter_id, JSON.stringify(item.production_windows), JSON.stringify(item)]
    );
    console.log(`✅ Item: ${item.id} (${item.source_type}, ${item.available_qty} kWh)`);
  }
  
  // Insert offers and create blocks (1 block = 1 unit)
  const now = new Date().toISOString();
  for (const offer of SEED_DATA.offers) {
    db.run(
      `INSERT INTO catalog_offers (id, item_id, provider_id, price_value, currency, max_qty, time_window_json, offer_attributes_json, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [offer.id, offer.item_id, offer.provider_id, offer.price_value, offer.currency, offer.max_qty, JSON.stringify(offer.time_window), JSON.stringify(offer.offer_attributes), JSON.stringify(offer)]
    );
    
    // Create blocks for this offer (1 block = 1 unit of energy)
    for (let i = 0; i < offer.max_qty; i++) {
      const blockId = `block-${offer.id}-${i}`;
      db.run(
        `INSERT INTO offer_blocks (id, offer_id, item_id, provider_id, status, price_value, currency, time_window_json, created_at) VALUES (?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?)`,
        [blockId, offer.id, offer.item_id, offer.provider_id, offer.price_value, offer.currency, JSON.stringify(offer.time_window), now]
      );
    }
    
    console.log(`✅ Offer: ${offer.id} ($${offer.price_value}/kWh, ${offer.max_qty} blocks created)`);
  }
  
  saveDb();
  closeDb();
  
  console.log('\n🎉 CDS Mock seeding complete!');
  console.log(`   - ${SEED_DATA.providers.length} providers`);
  console.log(`   - ${SEED_DATA.items.length} items`);
  console.log(`   - ${SEED_DATA.offers.length} offers`);
}

seed().catch(console.error);
