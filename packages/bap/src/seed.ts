/**
 * Seed data for Prosumer App (Combined BAP + BPP)
 * Uses shared seed data for consistency with CDS
 * Includes AI Trading Agent seeding
 */

import { initDb, getDb, saveDb, closeDb } from './db';
import { generateSeedData } from '@p2p/shared';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding Prosumer database...\n');

  const SEED_DATA = generateSeedData();

  await initDb();
  const db = getDb();

  // Clear existing data
  db.run('DELETE FROM agent_logs');
  db.run('DELETE FROM trade_proposals');
  db.run('DELETE FROM agents');
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

  // ==================== AI AGENTS ====================
  console.log('\n🤖 Seeding AI Trading Agents...\n');
  
  const agentNow = new Date().toISOString();
  
  // Platform Agent - Smart Buyer
  const platformBuyerAgentId = uuidv4();
  const platformBuyerConfig = {
    maxPricePerKwh: 0.12,
    minTrustScore: 0.5,
    maxQuantity: 50,
    riskTolerance: 'medium',
    preferredSources: ['SOLAR', 'WIND'],
    customInstructions: 'Focus on finding the best price-to-trust ratio. Prefer renewable sources. Always explain your reasoning clearly.'
  };
  
  db.run(
    `INSERT INTO agents (id, name, owner_id, type, status, execution_mode, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [platformBuyerAgentId, 'Platform Smart Buyer', 'platform', 'buyer', 'stopped', 'approval', JSON.stringify(platformBuyerConfig), agentNow, agentNow]
  );
  console.log(`✅ Platform Agent: Smart Buyer (id: ${platformBuyerAgentId.substring(0, 8)}...)`);
  
  // Platform Agent - Market Analyzer
  const platformAnalyzerAgentId = uuidv4();
  const platformAnalyzerConfig = {
    riskTolerance: 'low',
    minTrustScore: 0.6,
    customInstructions: 'Analyze the market carefully and only propose trades when there are exceptional opportunities. Prioritize trust scores over price.'
  };
  
  db.run(
    `INSERT INTO agents (id, name, owner_id, type, status, execution_mode, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [platformAnalyzerAgentId, 'Conservative Analyzer', 'platform', 'buyer', 'stopped', 'approval', JSON.stringify(platformAnalyzerConfig), agentNow, agentNow]
  );
  console.log(`✅ Platform Agent: Conservative Analyzer (id: ${platformAnalyzerAgentId.substring(0, 8)}...)`);
  
  // Demo User Agent
  const demoAgentId = uuidv4();
  const demoAgentConfig = {
    maxPricePerKwh: 0.10,
    minTrustScore: 0.7,
    maxQuantity: 30,
    dailyLimit: 100,
    riskTolerance: 'low',
    customInstructions: 'Only buy solar energy. Never trade if trust score is below 70%.'
  };
  
  db.run(
    `INSERT INTO agents (id, name, owner_id, type, status, execution_mode, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [demoAgentId, 'My Solar Buyer', 'user', 'buyer', 'stopped', 'approval', JSON.stringify(demoAgentConfig), agentNow, agentNow]
  );
  console.log(`✅ Demo Agent: My Solar Buyer (id: ${demoAgentId.substring(0, 8)}...)`);

  saveDb();
  closeDb();

  const totalBlocks = SEED_DATA.offers.reduce((sum, o) => sum + o.max_qty, 0);
  console.log('\n🎉 Prosumer database seeding complete!');
  console.log(`   - ${SEED_DATA.providers.length} providers`);
  console.log(`   - ${SEED_DATA.items.length} items`);
  console.log(`   - ${SEED_DATA.offers.length} offers`);
  console.log(`   - ${totalBlocks} total blocks`);
  console.log(`   - 3 AI agents (2 platform, 1 demo)`);
}

seed().catch(console.error);
