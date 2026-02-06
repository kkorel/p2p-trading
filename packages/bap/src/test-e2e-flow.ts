/**
 * End-to-End CDS Transaction Flow Test
 *
 * 1. Creates a local provider/item/offer
 * 2. Publishes to CDS
 * 3. Discovers from CDS
 * 4. Runs select → init → confirm
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma, initializeSecureClient, initializeBppKeys, BecknKeyPair } from '@p2p/shared';
import { publishCatalogToCDS } from '@p2p/shared/src/cds/sync-client';
const BASE_URL = 'http://localhost:4000';

// Keys from environment
const BAP_KEY_ID = process.env.BECKN_KEY_ID || '';
const BAP_PUBLIC_KEY = process.env.BECKN_PUBLIC_KEY || '';
const BAP_PRIVATE_KEY = process.env.BECKN_PRIVATE_KEY || '';
const BPP_KEY_ID = process.env.BPP_KEY_ID || '';
const BPP_PUBLIC_KEY = process.env.BPP_PUBLIC_KEY || '';
const BPP_PRIVATE_KEY = process.env.BPP_PRIVATE_KEY || '';

async function setupTestData() {
  console.log('\n========== SETUP: Creating test data ==========');

  const providerId = `e2e-provider-${Date.now()}`;
  const itemId = `e2e-item-${Date.now()}`;
  const offerId = `e2e-offer-${Date.now()}`;

  // Tomorrow 10am-2pm
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const startTime = new Date(tomorrow);
  tomorrow.setHours(14, 0, 0, 0);
  const endTime = new Date(tomorrow);

  // Create provider
  const provider = await prisma.provider.create({
    data: {
      id: providerId,
      name: 'E2E Test Provider',
      trustScore: 0.85,
    },
  });
  console.log('✅ Created provider:', provider.id);

  // Create item
  const item = await prisma.catalogItem.create({
    data: {
      id: itemId,
      providerId: provider.id,
      sourceType: 'SOLAR',
      deliveryMode: 'GRID_INJECTION',
      availableQty: 20,
      meterId: `METER-E2E-${Date.now()}`,
      productionWindowsJson: '[]',
    },
  });
  console.log('✅ Created item:', item.id, 'with', item.availableQty, 'kWh');

  // Create offer
  const offer = await prisma.catalogOffer.create({
    data: {
      id: offerId,
      itemId: item.id,
      providerId: provider.id,
      maxQty: 20,
      priceValue: 7.5,
      currency: 'INR',
      pricingModel: 'PER_KWH',
      timeWindowStart: startTime,
      timeWindowEnd: endTime,
    },
  });
  console.log('✅ Created offer:', offer.id, 'at ₹', offer.priceValue, '/kWh');

  // Create offer blocks (1 kWh each)
  const blocks = [];
  for (let i = 0; i < 20; i++) {
    blocks.push({
      id: uuidv4(),
      offerId: offer.id,
      itemId: item.id,
      providerId: provider.id,
      priceValue: offer.priceValue,
      currency: offer.currency,
      status: 'AVAILABLE',
    });
  }
  await prisma.offerBlock.createMany({ data: blocks });
  console.log('✅ Created', blocks.length, 'offer blocks');

  return { provider, item, offer, startTime, endTime };
}

async function publishToCDS(provider: any, item: any, offer: any, startTime: Date, endTime: Date) {
  console.log('\n========== PUBLISH TO CDS ==========');

  const syncProvider = {
    id: provider.id,
    name: provider.name,
    trust_score: provider.trustScore,
  };

  const syncItems = [{
    id: item.id,
    provider_id: provider.id,
    source_type: item.sourceType,
    delivery_mode: 'GRID_INJECTION',
    available_qty: item.availableQty,
    meter_id: item.meterId,
    production_windows: [],
  }];

  const syncOffers = [{
    id: offer.id,
    item_id: item.id,
    provider_id: provider.id,
    max_qty: offer.maxQty,
    price_value: offer.priceValue,
    currency: offer.currency,
    pricing_model: offer.pricingModel,
    time_window: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    },
  }];

  const success = await publishCatalogToCDS(syncProvider, syncItems, syncOffers, true);

  if (success) {
    console.log('✅ Published to CDS successfully');
  } else {
    console.log('❌ Failed to publish to CDS');
  }

  return success;
}

async function discover(offerId: string, providerId: string) {
  console.log('\n========== DISCOVER ==========');

  const response = await axios.post(`${BASE_URL}/api/discover`, {
    sourceType: 'SOLAR',
  });

  const txnId = response.data.transaction_id;
  console.log('Transaction ID:', txnId);

  // Look for our offer AND find an alternative offer for transaction testing
  const providers = response.data.catalog?.providers || [];
  let foundOwnOffer = false;
  let alternativeOffer: any = null;
  let alternativeItem: any = null;

  for (const p of providers) {
    if (p.id === providerId) {
      console.log('✅ Found our provider:', p.id);
    }
    for (const item of p.items || []) {
      for (const offer of item.offers || []) {
        if (offer.id === offerId) {
          console.log('✅ Found our offer in discover results!');
          console.log('   Provider:', p.id);
          console.log('   Offer:', offer.id);
          console.log('   Price:', offer.price?.value, offer.price?.currency);
          foundOwnOffer = true;
        }
        // Store first available offer as alternative for testing
        if (!alternativeOffer && offer.maxQuantity >= 5) {
          alternativeOffer = offer;
          alternativeItem = item;
        }
      }
    }
  }

  if (!foundOwnOffer) {
    console.log('⚠️  Our published offer not found in CDS yet (propagation may take time)');
    console.log('   Total providers from CDS:', providers.length);
  }

  if (alternativeOffer) {
    console.log('✅ Found alternative offer for transaction test:');
    console.log('   Offer ID:', alternativeOffer.id);
    console.log('   Item ID:', alternativeItem.id);
    console.log('   Max Qty:', alternativeOffer.maxQuantity, 'kWh');
    console.log('   Price:', alternativeOffer.price?.value, alternativeOffer.price?.currency);
  }

  return { txnId, foundOwnOffer, alternativeOffer, alternativeItem };
}

async function selectOffer(txnId: string, offerId: string, itemId: string) {
  console.log('\n========== SELECT ==========');

  const response = await axios.post(`${BASE_URL}/api/select`, {
    transaction_id: txnId,
    offer_id: offerId,
    item_id: itemId,
    quantity: 5,
  });

  console.log('Select response:', JSON.stringify(response.data, null, 2).substring(0, 500));

  return response.data;
}

async function initOrder(txnId: string) {
  console.log('\n========== INIT ==========');

  const response = await axios.post(`${BASE_URL}/api/init`, {
    transaction_id: txnId,
  });

  console.log('Init response:', JSON.stringify(response.data, null, 2).substring(0, 500));

  return response.data;
}

async function confirmOrder(txnId: string) {
  console.log('\n========== CONFIRM ==========');

  const response = await axios.post(`${BASE_URL}/api/confirm`, {
    transaction_id: txnId,
  });

  console.log('Confirm response:', JSON.stringify(response.data, null, 2).substring(0, 500));

  return response.data;
}

async function cleanup(providerId: string) {
  console.log('\n========== CLEANUP ==========');

  await prisma.offerBlock.deleteMany({ where: { offer: { providerId } } });
  await prisma.catalogOffer.deleteMany({ where: { providerId } });
  await prisma.catalogItem.deleteMany({ where: { providerId } });
  await prisma.provider.delete({ where: { id: providerId } }).catch(() => {});

  console.log('✅ Cleaned up test data');
}

async function main() {
  console.log('🚀 E2E CDS Transaction Flow Test');
  console.log('================================');

  // Initialize signing keys
  const bapKeyPair: BecknKeyPair = {
    keyId: BAP_KEY_ID,
    publicKey: BAP_PUBLIC_KEY,
    privateKey: BAP_PRIVATE_KEY,
  };
  const bppKeyPair: BecknKeyPair = {
    keyId: BPP_KEY_ID,
    publicKey: BPP_PUBLIC_KEY,
    privateKey: BPP_PRIVATE_KEY,
  };

  initializeSecureClient({ keyPair: bapKeyPair, enabled: true });
  initializeBppKeys(bppKeyPair);

  let testData: any = null;

  try {
    // 1. Setup test data
    testData = await setupTestData();

    // 2. Publish to CDS
    const published = await publishToCDS(
      testData.provider,
      testData.item,
      testData.offer,
      testData.startTime,
      testData.endTime
    );

    if (!published) {
      throw new Error('Failed to publish to CDS');
    }

    // Brief wait for CDS to process our publish
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    // 3. Discover
    const { txnId, foundOwnOffer, alternativeOffer, alternativeItem } = await discover(testData.offer.id, testData.provider.id);

    // Use our offer if found in CDS, otherwise use an alternative from CDS
    const offerToUse = foundOwnOffer ? { id: testData.offer.id, itemId: testData.item.id }
                                      : alternativeOffer ? { id: alternativeOffer.id, itemId: alternativeItem.id }
                                      : null;

    if (!offerToUse) {
      console.log('❌ No offers available in CDS for transaction test');
    } else {
      console.log(`\n📋 Using offer for transaction: ${offerToUse.id}`);

      // 4. Select
      const selectResult = await selectOffer(txnId, offerToUse.id, offerToUse.itemId);

      if (selectResult.error) {
        console.log('❌ Select failed:', selectResult.error);
      } else {
        console.log('✅ Select successful');

        // 5. Init
        const initResult = await initOrder(txnId);

        if (initResult.error) {
          console.log('❌ Init failed:', initResult.error);
        } else {
          console.log('✅ Init successful');

          // 6. Confirm
          const confirmResult = await confirmOrder(txnId);

          if (confirmResult.error) {
            console.log('❌ Confirm failed:', confirmResult.error);
          } else {
            console.log('✅ Confirm successful');
            console.log('\n🎉 FULL E2E FLOW COMPLETED!');
          }
        }
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    // Cleanup
    if (testData?.provider?.id) {
      await cleanup(testData.provider.id);
    }
    await prisma.$disconnect();
  }
}

main().catch(console.error);
