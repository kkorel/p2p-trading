/**
 * Simple E2E CDS Transaction Flow Test
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

async function main() {
  console.log('🚀 Simple E2E CDS Transaction Flow Test');
  console.log('========================================\n');

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

  const timestamp = Date.now();
  const providerId = `e2e-provider-${timestamp}`;
  const itemId = `e2e-item-${timestamp}`;
  const offerId = `e2e-offer-${timestamp}`;

  // Tomorrow 10am-2pm
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const startTime = new Date(tomorrow);
  tomorrow.setHours(14, 0, 0, 0);
  const endTime = new Date(tomorrow);

  try {
    // ===== STEP 1: Create local data =====
    console.log('1️⃣  Creating local test data...');

    const provider = await prisma.provider.create({
      data: {
        id: providerId,
        name: 'E2E Test Provider',
        trustScore: 0.85,
      },
    });
    console.log(`   ✅ Provider: ${provider.id}`);

    const item = await prisma.catalogItem.create({
      data: {
        id: itemId,
        providerId: provider.id,
        sourceType: 'SOLAR',
        deliveryMode: 'GRID_INJECTION',
        availableQty: 10,
        meterId: `METER-E2E-${timestamp}`,
        productionWindowsJson: '[]',
      },
    });
    console.log(`   ✅ Item: ${item.id} (10 kWh SOLAR)`);

    const offer = await prisma.catalogOffer.create({
      data: {
        id: offerId,
        itemId: item.id,
        providerId: provider.id,
        maxQty: 10,
        priceValue: 7.5,
        currency: 'INR',
        pricingModel: 'PER_KWH',
        timeWindowStart: startTime,
        timeWindowEnd: endTime,
      },
    });
    console.log(`   ✅ Offer: ${offer.id} at ₹${offer.priceValue}/kWh`);

    // Create offer blocks
    const blocks = [];
    for (let i = 0; i < 10; i++) {
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
    console.log(`   ✅ Created ${blocks.length} offer blocks`);

    // ===== STEP 2: Publish to CDS =====
    console.log('\n2️⃣  Publishing to CDS...');

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

    const published = await publishCatalogToCDS(syncProvider, syncItems, syncOffers, true);
    if (!published) {
      throw new Error('Failed to publish to CDS');
    }
    console.log('   ✅ Published to CDS');

    // ===== STEP 3: Wait and Discover =====
    // CDS may take 10-30 seconds to propagate - poll until found or timeout
    console.log('\n3️⃣  Polling CDS for offer propagation (max 30s)...');
    let foundOffer = false;
    let txnId = '';
    const startPoll = Date.now();
    const maxWait = 30000;

    while (!foundOffer && (Date.now() - startPoll) < maxWait) {
      await new Promise(r => setTimeout(r, 3000));

      const discoverResp = await axios.post(`${BASE_URL}/api/discover`, {
        sourceType: 'SOLAR',
      });
      txnId = discoverResp.data.transaction_id;

      const providers = discoverResp.data.catalog?.providers || [];
      for (const p of providers) {
        for (const itm of p.items || []) {
          for (const off of itm.offers || []) {
            if (off.id === offerId) {
              foundOffer = true;
              console.log(`   ✅ Found our offer in CDS after ${Math.round((Date.now() - startPoll) / 1000)}s!`);
              console.log(`      Provider: ${p.id}`);
              console.log(`      BPP: ${p.bpp_id}`);
              console.log(`      Price: ₹${off.price?.value}/kWh`);
            }
          }
        }
      }

      if (!foundOffer) {
        console.log(`   ... polling (${Math.round((Date.now() - startPoll) / 1000)}s elapsed, ${providers.length} providers)`);
      }
    }

    console.log(`   Transaction ID: ${txnId}`);

    if (!foundOffer) {
      console.log(`   ⚠️  Offer not found in CDS after ${maxWait/1000}s`);
      console.log('   Checking if offer shows up in CDS without filtering...');

      // Debug: try without sourceType filter
      const debugResp = await axios.post(`${BASE_URL}/api/discover`, {});
      const allProviders = debugResp.data.catalog?.providers || [];
      const ourBppOffers = allProviders
        .filter((p: any) => p.bpp_id === 'bpp.digioorga.org')
        .flatMap((p: any) => (p.items || []).flatMap((i: any) => (i.offers || []).map((o: any) => o.id)));
      console.log(`   Offers from our BPP in CDS:`, ourBppOffers);

      // Also check directly with CDS using test-cds-flow approach
      console.log('   Testing direct CDS query...');
      const { createSignedHeaders, getBppKeyPair } = await import('@p2p/shared');
      const cdsUrl = process.env.EXTERNAL_CDS_URL?.replace(/\/catalog$/, '/discover') || '';
      const directPayload = {
        context: {
          version: '2.0.0',
          action: 'discover',
          timestamp: new Date().toISOString(),
          message_id: uuidv4(),
          transaction_id: uuidv4(),
          bap_id: 'bap.digioorga.org',
          bap_uri: 'https://bap.digioorga.org',
          ttl: 'PT30S',
          domain: 'beckn.one:deg:p2p-trading-interdiscom:2.0.0',
        },
        message: {
          filters: {
            type: 'jsonpath',
            expression: "$[?('p2p-interdiscom-trading-pilot-network' == @.beckn:networkId)]",
          },
        },
      };

      const bapKeyPair: BecknKeyPair = {
        keyId: BAP_KEY_ID,
        publicKey: BAP_PUBLIC_KEY,
        privateKey: BAP_PRIVATE_KEY,
      };
      const signedHeaders = createSignedHeaders(directPayload, bapKeyPair, 30);
      const directResp = await axios.post(cdsUrl, directPayload, {
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
      });

      const cdsCatalogs = directResp.data?.message?.catalogs || [];
      const cdsOfferIds = cdsCatalogs
        .filter((c: any) => c['beckn:bppId'] === 'bpp.digioorga.org')
        .flatMap((c: any) => (c['beckn:offers'] || []).map((o: any) => o['beckn:id']));
      console.log(`   Direct CDS query - offers from our BPP:`, cdsOfferIds);
      console.log(`   Looking for: ${offerId}`);

      throw new Error('CDS propagation timeout - offer not found');
    }

    // ===== STEP 4: Select =====
    console.log('\n4️⃣  Selecting offer...');
    const selectResp = await axios.post(`${BASE_URL}/api/select`, {
      transaction_id: txnId,
      offer_id: offerId,
      item_id: itemId,
      quantity: 3,
    });

    if (selectResp.data.ack?.ack?.ack_status === 'NACK') {
      throw new Error(`Select NACK: ${selectResp.data.ack.ack.error?.message}`);
    }
    console.log(`   ✅ Select successful`);
    console.log(`      Selected: ${selectResp.data.selected_offer?.quantity} kWh`);
    console.log(`      Price: ₹${selectResp.data.selected_offer?.price?.value}/kWh`);

    // ===== STEP 5: Init =====
    console.log('\n5️⃣  Initializing order...');
    const initResp = await axios.post(`${BASE_URL}/api/init`, {
      transaction_id: txnId,
    });

    if (initResp.data.ack?.ack?.ack_status === 'NACK') {
      throw new Error(`Init NACK: ${initResp.data.ack.ack.error?.message}`);
    }
    console.log(`   ✅ Init successful`);
    console.log(`      Order ID: ${initResp.data.order?.id || 'pending'}`);

    // ===== STEP 6: Confirm =====
    console.log('\n6️⃣  Confirming order...');
    const confirmResp = await axios.post(`${BASE_URL}/api/confirm`, {
      transaction_id: txnId,
    });

    if (confirmResp.data.ack?.ack?.ack_status === 'NACK') {
      throw new Error(`Confirm NACK: ${confirmResp.data.ack.ack.error?.message}`);
    }
    console.log(`   ✅ Confirm successful`);
    console.log(`      Order ID: ${confirmResp.data.order?.id}`);
    console.log(`      Status: ${confirmResp.data.order?.status || 'CONFIRMED'}`);

    // ===== SUCCESS =====
    console.log('\n🎉 FULL E2E TRANSACTION COMPLETED!');
    console.log('====================================');
    console.log(`Provider: ${providerId}`);
    console.log(`Offer: ${offerId}`);
    console.log(`Quantity: 3 kWh`);
    console.log(`Total: ₹${3 * 7.5}`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.offerBlock.deleteMany({ where: { providerId } });
    await prisma.catalogOffer.deleteMany({ where: { providerId } });
    await prisma.catalogItem.deleteMany({ where: { providerId } });
    await prisma.provider.delete({ where: { id: providerId } }).catch(() => {});
    console.log('   ✅ Cleaned up');

    await prisma.$disconnect();
  }
}

main().catch(console.error);
