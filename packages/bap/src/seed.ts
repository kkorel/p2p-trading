/**
 * Seed data for Prosumer App (Combined BAP + BPP)
 * Uses shared seed data for consistency with CDS
 */

import { initDb, getDb, saveDb, closeDb } from './db';
import { generateSeedData } from '@p2p/shared';

async function seed() {
  console.log('🌱 Seeding Prosumer database...\n');

  const SEED_DATA = generateSeedData();

  await initDb();
  const db = getDb();

  // Clear existing data
  db.run('DELETE FROM offer_blocks');
  db.run('DELETE FROM catalog_offers');
  db.run('DELETE FROM catalog_items');
  db.run('DELETE FROM providers');
  db.run('DELETE FROM orders');
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

  const totalBlocks = SEED_DATA.offers.reduce((sum, o) => sum + o.max_qty, 0);
  console.log('\n🎉 Prosumer database seeding complete!');
  console.log(`   - ${SEED_DATA.providers.length} providers`);
  console.log(`   - ${SEED_DATA.items.length} items`);
  console.log(`   - ${SEED_DATA.offers.length} offers`);
  console.log(`   - ${totalBlocks} total blocks`);
}

seed().catch(console.error);
