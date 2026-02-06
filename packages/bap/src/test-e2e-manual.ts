/**
 * E2E Test with Manual Publish (same approach as test-cds-flow.ts)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma, initializeSecureClient, initializeBppKeys, BecknKeyPair, createSignedHeaders } from '@p2p/shared';

const BASE_URL = 'http://localhost:4000';
const CDS_URL = process.env.EXTERNAL_CDS_URL || '';
const BECKN_DOMAIN = 'beckn.one:deg:p2p-trading-interdiscom:2.0.0';
const BECKN_VERSION = '2.0.0';

const BAP_ID = process.env.BAP_ID || 'bap.digioorga.org';
const BAP_URI = process.env.BAP_URI || 'https://bap.digioorga.org';
const BAP_KEY_ID = process.env.BECKN_KEY_ID || '';
const BAP_PUBLIC_KEY = process.env.BECKN_PUBLIC_KEY || '';
const BAP_PRIVATE_KEY = process.env.BECKN_PRIVATE_KEY || '';
const BPP_ID = process.env.BPP_ID || 'bpp.digioorga.org';
const BPP_URI = process.env.BPP_URI || 'https://bpp.digioorga.org/callbacks';
const BPP_KEY_ID = process.env.BPP_KEY_ID || '';
const BPP_PUBLIC_KEY = process.env.BPP_PUBLIC_KEY || '';
const BPP_PRIVATE_KEY = process.env.BPP_PRIVATE_KEY || '';

async function main() {
  console.log('🚀 E2E Test with Manual CDS Publish');
  console.log('====================================\n');

  const bapKeyPair: BecknKeyPair = { keyId: BAP_KEY_ID, publicKey: BAP_PUBLIC_KEY, privateKey: BAP_PRIVATE_KEY };
  const bppKeyPair: BecknKeyPair = { keyId: BPP_KEY_ID, publicKey: BPP_PUBLIC_KEY, privateKey: BPP_PRIVATE_KEY };

  initializeSecureClient({ keyPair: bapKeyPair, enabled: true });
  initializeBppKeys(bppKeyPair);

  const ts = Date.now();
  const providerId = `manual-provider-${ts}`;
  const itemId = `manual-item-${ts}`;
  const offerId = `manual-offer-${ts}`;

  // Tomorrow 10am-2pm
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const startTime = tomorrow.toISOString();
  tomorrow.setHours(14, 0, 0, 0);
  const endTime = tomorrow.toISOString();

  try {
    // 1. Create local data
    console.log('1️⃣  Creating local test data...');
    const provider = await prisma.provider.create({ data: { id: providerId, name: 'Manual Test Provider', trustScore: 0.85 } });
    const item = await prisma.catalogItem.create({ data: { id: itemId, providerId, sourceType: 'SOLAR', deliveryMode: 'GRID_INJECTION', availableQty: 10, meterId: `METER-${ts}`, productionWindowsJson: '[]' } });
    const offer = await prisma.catalogOffer.create({ data: { id: offerId, itemId, providerId, maxQty: 10, priceValue: 7.5, currency: 'INR', pricingModel: 'PER_KWH', timeWindowStart: new Date(startTime), timeWindowEnd: new Date(endTime) } });
    for (let i = 0; i < 10; i++) {
      await prisma.offerBlock.create({ data: { id: uuidv4(), offerId, itemId, providerId, priceValue: 7.5, currency: 'INR', status: 'AVAILABLE' } });
    }
    console.log(`   ✅ Created: ${providerId}, ${itemId}, ${offerId}`);

    // Small delay to ensure data is committed
    await new Promise(r => setTimeout(r, 500));

    // 2. Manual CDS publish (same format as test-cds-flow.ts)
    console.log('\n2️⃣  Publishing to CDS (manual payload)...');
    const publishPayload = {
      context: {
        version: BECKN_VERSION,
        action: 'catalog_publish',
        timestamp: new Date().toISOString(),
        message_id: uuidv4(),
        transaction_id: uuidv4(),
        bap_id: BAP_ID,
        bap_uri: BAP_URI,
        bpp_id: BPP_ID,
        bpp_uri: BPP_URI,
        ttl: 'PT30S',
        domain: BECKN_DOMAIN,
      },
      message: {
        catalogs: [{
          '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
          '@type': 'beckn:Catalog',
          'beckn:id': `catalog-${providerId}`,
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Manual Test Catalog' },
          'beckn:bppId': BPP_ID,
          'beckn:bppUri': BPP_URI,
          'beckn:isActive': true,
          'beckn:items': [{
            '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
            '@type': 'beckn:Item',
            'beckn:networkId': ['p2p-interdiscom-trading-pilot-network'],
            'beckn:isActive': true,
            'beckn:id': itemId,
            'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'SOLAR Energy - 10 kWh', 'beckn:shortDesc': 'SOLAR energy for trading' },
            'beckn:provider': {
              'beckn:id': providerId,
              'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Manual Test Provider' },
              'beckn:providerAttributes': {
                '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
                '@type': 'EnergyCustomer',
                meterId: `der://meter/${itemId}`,
                utilityId: 'BESCOM',
                utilityCustomerId: 'CUST-MANUAL-001',
              },
            },
            'beckn:itemAttributes': {
              '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
              '@type': 'EnergyResource',
              sourceType: 'SOLAR',
              meterId: `der://meter/${itemId}`,
            },
          }],
          'beckn:offers': [{
            '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
            '@type': 'beckn:Offer',
            'beckn:id': offerId,
            'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Energy Offer - 10 kWh' },
            'beckn:provider': providerId,
            'beckn:items': [itemId],
            'beckn:price': {
              '@type': 'schema:PriceSpecification',
              'schema:price': 7.5,
              'schema:priceCurrency': 'INR',
              unitText: 'kWh',
              applicableQuantity: { unitQuantity: 10, unitText: 'kWh' },
            },
            'beckn:offerAttributes': {
              '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
              '@type': 'EnergyTradeOffer',
              pricingModel: 'PER_KWH',
              deliveryWindow: { '@type': 'beckn:TimePeriod', 'schema:startTime': startTime, 'schema:endTime': endTime },
              validityWindow: { '@type': 'beckn:TimePeriod', 'schema:startTime': startTime, 'schema:endTime': endTime },
            },
          }],
        }],
      },
    };

    const signedHeaders = createSignedHeaders(publishPayload, bppKeyPair, 30);
    const publishUrl = `${CDS_URL}/publish`;
    const publishResp = await axios.post(publishUrl, publishPayload, {
      headers: { 'Content-Type': 'application/json', ...signedHeaders },
      timeout: 30000,
    });

    if (publishResp.data?.ack_status !== 'ACK') {
      throw new Error(`Publish NACK: ${JSON.stringify(publishResp.data)}`);
    }
    console.log('   ✅ Published to CDS');

    // 3. Wait and discover
    console.log('\n3️⃣  Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('   Discovering from CDS...');
    const discoverResp = await axios.post(`${BASE_URL}/api/discover`, { sourceType: 'SOLAR' });
    const txnId = discoverResp.data.transaction_id;

    let foundOffer = false;
    for (const p of discoverResp.data.catalog?.providers || []) {
      for (const itm of p.items || []) {
        for (const off of itm.offers || []) {
          if (off.id === offerId) {
            foundOffer = true;
            console.log(`   ✅ Found our offer in CDS!`);
          }
        }
      }
    }

    if (!foundOffer) {
      console.log('   ⚠️  Offer not found in /api/discover, checking direct CDS...');
      const directPayload = {
        context: { version: '2.0.0', action: 'discover', timestamp: new Date().toISOString(), message_id: uuidv4(), transaction_id: uuidv4(), bap_id: BAP_ID, bap_uri: BAP_URI, ttl: 'PT30S', domain: BECKN_DOMAIN },
        message: { filters: { type: 'jsonpath', expression: "$[?('p2p-interdiscom-trading-pilot-network' == @.beckn:networkId)]" } },
      };
      const directHeaders = createSignedHeaders(directPayload, bapKeyPair, 30);
      const directResp = await axios.post(CDS_URL.replace(/\/catalog$/, '/discover'), directPayload, {
        headers: { 'Content-Type': 'application/json', ...directHeaders },
      });
      const catalogs = directResp.data?.message?.catalogs || [];
      for (const cat of catalogs) {
        for (const off of cat['beckn:offers'] || []) {
          if (off['beckn:id'] === offerId) {
            foundOffer = true;
            console.log(`   ✅ Found our offer in direct CDS query!`);
          }
        }
      }
    }

    if (!foundOffer) {
      throw new Error('Offer not found in CDS');
    }

    // 4. Select
    console.log('\n4️⃣  Selecting offer...');

    // Verify offer exists in DB before select
    const dbOffer = await prisma.catalogOffer.findUnique({ where: { id: offerId } });
    if (!dbOffer) {
      throw new Error('Offer not found in local database before select!');
    }
    console.log(`   DB check: Offer ${offerId} exists in database`);

    console.log(`   Calling /api/select with offer_id=${offerId}, item_id=${itemId}`);
    const selectResp = await axios.post(`${BASE_URL}/api/select`, { transaction_id: txnId, offer_id: offerId, item_id: itemId, quantity: 3 });
    console.log('   Select response:', JSON.stringify(selectResp.data, null, 2).substring(0, 1000));
    if (selectResp.data.ack?.ack?.ack_status === 'NACK') {
      throw new Error(`Select NACK: ${selectResp.data.ack.ack.error?.message}`);
    }
    console.log('   ✅ Select successful');

    // 5. Init
    console.log('\n5️⃣  Initializing order...');
    const initResp = await axios.post(`${BASE_URL}/api/init`, { transaction_id: txnId });
    if (initResp.data.ack?.ack?.ack_status === 'NACK') {
      throw new Error(`Init NACK: ${initResp.data.ack.ack.error?.message}`);
    }
    console.log('   ✅ Init successful');

    // 6. Confirm
    console.log('\n6️⃣  Confirming order...');
    const confirmResp = await axios.post(`${BASE_URL}/api/confirm`, { transaction_id: txnId });
    if (confirmResp.data.ack?.ack?.ack_status === 'NACK') {
      throw new Error(`Confirm NACK: ${confirmResp.data.ack.ack.error?.message}`);
    }
    console.log('   ✅ Confirm successful');

    console.log('\n🎉 FULL E2E TRANSACTION COMPLETED!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    if (error.response?.data) console.error('Response:', JSON.stringify(error.response.data, null, 2));
  } finally {
    // Don't cleanup yet - leave data for debugging
    console.log('\n📋 Test data left in DB for debugging:');
    console.log('   Provider:', providerId);
    console.log('   Item:', itemId);
    console.log('   Offer:', offerId);
    console.log('   Run cleanup manually when done.');
    await prisma.$disconnect();
  }
}

main().catch(console.error);
