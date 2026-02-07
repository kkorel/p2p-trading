/**
 * Test publishing with BOTH provider ID formats
 * 1. Simple ID (like debug scripts use)
 * 2. UUID-based ID (like the app uses)
 */
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { initializeSecureClient, initializeBppKeys, createSignedHeaders, BecknKeyPair } from '@p2p/shared';

const CDS_URL = process.env.EXTERNAL_CDS_URL || 'https://34.93.141.21.sslip.io/beckn/catalog';
const BAP_ID = process.env.BECKN_SUBSCRIBER_ID || 'bap.digioorga.org';
const BAP_URI = process.env.BAP_URI || 'https://bap.digioorga.org';
const BPP_ID = process.env.BPP_ID || 'bpp.digioorga.org';
const BPP_URI = process.env.BPP_URI || 'https://bpp.digioorga.org/callbacks';

// TWO PROVIDER IDs TO TEST
const SIMPLE_PROVIDER_ID = `debug-provider-${Date.now()}`;
const UUID_PROVIDER_ID = 'provider-8028fccf-9b04-421d-ace8-550a6db6a3c2'; // User's actual provider ID

const today = new Date();
today.setHours(8, 0, 0, 0);
const startTime = today.toISOString();
today.setHours(12, 0, 0, 0);
const endTime = today.toISOString();

function buildPayload(providerId: string, offerId: string, itemId: string) {
  return {
    context: {
      version: '2.0.0',
      action: 'catalog_publish',
      timestamp: new Date().toISOString(),
      message_id: uuidv4(),
      transaction_id: uuidv4(),
      bap_id: BAP_ID,
      bap_uri: BAP_URI,
      bpp_id: BPP_ID,
      bpp_uri: BPP_URI,
      ttl: 'PT30S',
      domain: 'beckn.one:deg:p2p-trading-interdiscom:2.0.0',
      // NO location or schema_context!
    },
    message: {
      catalogs: [{
        '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
        '@type': 'beckn:Catalog',
        'beckn:id': `catalog-${providerId}`,
        'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': `Test Catalog - ${providerId.substring(0, 20)}` },
        'beckn:bppId': BPP_ID,
        'beckn:bppUri': BPP_URI,
        'beckn:isActive': true,
        'beckn:items': [{
          '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
          '@type': 'beckn:Item',
          'beckn:networkId': ['p2p-interdiscom-trading-pilot-network'],
          'beckn:isActive': true,
          'beckn:id': itemId,
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'SOLAR Test' },
          'beckn:provider': {
            'beckn:id': providerId,
            'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Test Provider' },
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
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Test Offer' },
          'beckn:provider': providerId,
          'beckn:items': [itemId],
          'beckn:price': { '@type': 'schema:PriceSpecification', 'schema:price': 8, 'schema:priceCurrency': 'INR', unitText: 'kWh', applicableQuantity: { unitQuantity: 50, unitText: 'kWh' } },
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
}

async function publish(providerId: string, offerId: string, itemId: string, bppKeyPair: BecknKeyPair): Promise<boolean> {
  const payload = buildPayload(providerId, offerId, itemId);
  const signedHeaders = createSignedHeaders(payload, bppKeyPair, 30);

  try {
    const response = await axios.post(`${CDS_URL}/publish`, payload, {
      headers: { 'Content-Type': 'application/json', ...signedHeaders },
      timeout: 30000,
    });
    console.log(`  Publish response: ${response.data?.ack_status}`);
    return response.data?.ack_status === 'ACK';
  } catch (e: any) {
    console.log(`  Publish error: ${e.message}`);
    return false;
  }
}

async function discover(bapKeyPair: BecknKeyPair): Promise<any[]> {
  const payload = {
    context: {
      version: '2.0.0',
      action: 'discover',
      timestamp: new Date().toISOString(),
      message_id: uuidv4(),
      transaction_id: uuidv4(),
      bap_id: BAP_ID,
      bap_uri: BAP_URI,
      bpp_id: BPP_ID,
      bpp_uri: BPP_URI,
      ttl: 'PT30S',
      domain: 'beckn.one:deg:p2p-trading-interdiscom:2.0.0',
    },
    message: { filters: { type: 'jsonpath', expression: "$[?('p2p-interdiscom-trading-pilot-network' == @.beckn:networkId)]" } },
  };

  const signedHeaders = createSignedHeaders(payload, bapKeyPair, 30);
  const url = CDS_URL.replace(/\/catalog$/, '/discover');

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json', ...signedHeaders },
    timeout: 30000,
  });

  return response.data?.message?.catalogs || [];
}

async function main() {
  const bppKeyPair: BecknKeyPair = {
    keyId: process.env.BPP_KEY_ID!,
    publicKey: process.env.BPP_PUBLIC_KEY!,
    privateKey: process.env.BPP_PRIVATE_KEY!,
  };
  const bapKeyPair: BecknKeyPair = {
    keyId: process.env.BECKN_KEY_ID!,
    publicKey: process.env.BECKN_PUBLIC_KEY!,
    privateKey: process.env.BECKN_PRIVATE_KEY!,
  };

  initializeSecureClient({ keyPair: bapKeyPair, enabled: true });
  initializeBppKeys(bppKeyPair);

  const simpleOfferId = `offer-simple-${Date.now()}`;
  const uuidOfferId = `offer-uuid-${Date.now()}`;
  const simpleItemId = `item-simple-${Date.now()}`;
  const uuidItemId = `item-uuid-${Date.now()}`;

  console.log('========================================');
  console.log('Testing BOTH provider ID formats');
  console.log('========================================');
  console.log(`Simple Provider ID: ${SIMPLE_PROVIDER_ID}`);
  console.log(`UUID Provider ID:   ${UUID_PROVIDER_ID}`);
  console.log('========================================\n');

  // Publish with SIMPLE provider ID
  console.log('1. Publishing with SIMPLE provider ID...');
  const simpleSuccess = await publish(SIMPLE_PROVIDER_ID, simpleOfferId, simpleItemId, bppKeyPair);

  // Publish with UUID provider ID
  console.log('2. Publishing with UUID provider ID...');
  const uuidSuccess = await publish(UUID_PROVIDER_ID, uuidOfferId, uuidItemId, bppKeyPair);

  console.log('\nWaiting 3 seconds for CDS to index...\n');
  await new Promise(r => setTimeout(r, 3000));

  // Discover
  console.log('3. Discovering...');
  const catalogs = await discover(bapKeyPair);
  console.log(`   Found ${catalogs.length} total catalogs\n`);

  // Check for our offers
  let simpleFound = false;
  let uuidFound = false;

  for (const cat of catalogs) {
    const offers = cat['beckn:offers'] || [];
    for (const o of offers) {
      if (o['beckn:id'] === simpleOfferId) {
        simpleFound = true;
        console.log(`✅ SIMPLE offer FOUND: ${simpleOfferId}`);
      }
      if (o['beckn:id'] === uuidOfferId) {
        uuidFound = true;
        console.log(`✅ UUID offer FOUND: ${uuidOfferId}`);
      }
    }
  }

  if (!simpleFound) console.log(`❌ SIMPLE offer NOT found: ${simpleOfferId}`);
  if (!uuidFound) console.log(`❌ UUID offer NOT found: ${uuidOfferId}`);

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Simple Provider (${SIMPLE_PROVIDER_ID.substring(0, 20)}...): Publish=${simpleSuccess ? '✅' : '❌'}, Discover=${simpleFound ? '✅' : '❌'}`);
  console.log(`UUID Provider (${UUID_PROVIDER_ID.substring(0, 20)}...): Publish=${uuidSuccess ? '✅' : '❌'}, Discover=${uuidFound ? '✅' : '❌'}`);

  // WHERE DOES PROVIDER ID COME FROM?
  console.log('\n========================================');
  console.log('WHERE DOES PROVIDER ID COME FROM?');
  console.log('========================================');
  console.log('In the app, provider ID is created when a user uploads a Generation/Storage VC.');
  console.log('It\'s stored in the Provider table and linked to the User via user.providerId.');
  console.log('Format: provider-{uuid} where uuid is auto-generated.');
  console.log('');
  console.log('Your provider ID: provider-8028fccf-9b04-421d-ace8-550a6db6a3c2');
  console.log('This was created when you completed your seller profile/VC upload.');
}

main().catch(console.error);
