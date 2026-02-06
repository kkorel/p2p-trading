/**
 * CDS Publish & Discover Test
 *
 * Tests the full flow:
 * 1. Publish a catalog to CDS with BPP keys
 * 2. Discover it from CDS with BAP keys
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import signing after env is loaded
import {
  initializeSecureClient,
  initializeBppKeys,
  createSignedHeaders,
  BecknKeyPair
} from '@p2p/shared';

// ==================== Configuration ====================

const CDS_URL = process.env.EXTERNAL_CDS_URL || 'https://34.93.141.21.sslip.io/beckn/catalog';
const BECKN_DOMAIN = 'beckn.one:deg:p2p-trading-interdiscom:2.0.0';
const BECKN_VERSION = '2.0.0';

// BAP keys (for discover)
const BAP_ID = process.env.BECKN_SUBSCRIBER_ID || 'bap.digioorga.org';
const BAP_URI = process.env.BAP_URI || 'https://bap.digioorga.org';
const BAP_KEY_ID = process.env.BECKN_KEY_ID || '';
const BAP_PUBLIC_KEY = process.env.BECKN_PUBLIC_KEY || '';
const BAP_PRIVATE_KEY = process.env.BECKN_PRIVATE_KEY || '';

// BPP keys (for publish)
const BPP_ID = process.env.BPP_ID || 'bpp.digioorga.org';
const BPP_URI = process.env.BPP_URI || 'https://bpp.digioorga.org/callbacks';
const BPP_KEY_ID = process.env.BPP_KEY_ID || '';
const BPP_PUBLIC_KEY = process.env.BPP_PUBLIC_KEY || '';
const BPP_PRIVATE_KEY = process.env.BPP_PRIVATE_KEY || '';

// ==================== Test Data ====================

const testProviderId = `test-provider-${Date.now()}`;
const testItemId = `test-item-${Date.now()}`;
const testOfferId = `test-offer-${Date.now()}`;

// Tomorrow 6am-12pm
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(6, 0, 0, 0);
const startTime = tomorrow.toISOString();
tomorrow.setHours(12, 0, 0, 0);
const endTime = tomorrow.toISOString();

// ==================== Payload Builders ====================

function buildPublishPayload() {
  return {
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
      catalogs: [
        {
          '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
          '@type': 'beckn:Catalog',
          'beckn:id': `catalog-${testProviderId}`,
          'beckn:descriptor': {
            '@type': 'beckn:Descriptor',
            'schema:name': 'Test User Energy Trading Catalog',
          },
          'beckn:bppId': BPP_ID,
          'beckn:bppUri': BPP_URI,
          'beckn:isActive': true,
          'beckn:items': [
            {
              '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
              '@type': 'beckn:Item',
              'beckn:networkId': ['p2p-interdiscom-trading-pilot-network'],
              'beckn:isActive': true,
              'beckn:id': testItemId,
              'beckn:descriptor': {
                '@type': 'beckn:Descriptor',
                'schema:name': 'SOLAR Energy - 20 kWh',
                'beckn:shortDesc': 'SOLAR energy available for trading',
              },
              'beckn:provider': {
                'beckn:id': testProviderId,
                'beckn:descriptor': {
                  '@type': 'beckn:Descriptor',
                  'schema:name': 'Test User',
                },
                'beckn:providerAttributes': {
                  '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
                  '@type': 'EnergyCustomer',
                  meterId: `der://meter/${testItemId}`,
                  utilityId: 'BESCOM',
                  utilityCustomerId: 'CUST-TEST-12345',
                },
              },
              'beckn:itemAttributes': {
                '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
                '@type': 'EnergyResource',
                sourceType: 'SOLAR',
                meterId: `der://meter/${testItemId}`,
              },
            },
          ],
          'beckn:offers': [
            {
              '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
              '@type': 'beckn:Offer',
              'beckn:id': testOfferId,
              'beckn:descriptor': {
                '@type': 'beckn:Descriptor',
                'schema:name': 'Energy Offer - 20 kWh',
              },
              'beckn:provider': testProviderId,
              'beckn:items': [testItemId],
              'beckn:price': {
                '@type': 'schema:PriceSpecification',
                'schema:price': 8.5,
                'schema:priceCurrency': 'INR',
                unitText: 'kWh',
                applicableQuantity: {
                  unitQuantity: 20,
                  unitText: 'kWh',
                },
              },
              'beckn:offerAttributes': {
                '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
                '@type': 'EnergyTradeOffer',
                pricingModel: 'PER_KWH',
                deliveryWindow: {
                  '@type': 'beckn:TimePeriod',
                  'schema:startTime': startTime,
                  'schema:endTime': endTime,
                },
                validityWindow: {
                  '@type': 'beckn:TimePeriod',
                  'schema:startTime': startTime,
                  'schema:endTime': endTime,
                },
              },
            },
          ],
        },
      ],
    },
  };
}

function buildDiscoverPayload() {
  return {
    context: {
      version: BECKN_VERSION,
      action: 'discover',
      timestamp: new Date().toISOString(),
      message_id: uuidv4(),
      transaction_id: uuidv4(),
      bap_id: BAP_ID,
      bap_uri: BAP_URI,
      bpp_id: BPP_ID,
      bpp_uri: BPP_URI,
      ttl: 'PT30S',
      domain: BECKN_DOMAIN,
      location: {
        city: {
          code: 'BLR',
          name: 'Bangalore',
        },
        country: {
          code: 'IND',
          name: 'India',
        },
      },
      schema_context: [
        'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
      ],
    },
    message: {
      filters: {
        type: 'jsonpath',
        expression: "$[?('p2p-interdiscom-trading-pilot-network' == @.beckn:networkId)]",
      },
    },
  };
}

// ==================== Test Functions ====================

async function testPublish(bppKeyPair: BecknKeyPair): Promise<boolean> {
  console.log('\n========== TESTING PUBLISH ==========');

  const payload = buildPublishPayload();
  const url = `${CDS_URL}/publish`;

  console.log('Publish URL:', url);
  console.log('BPP ID:', BPP_ID);
  console.log('BPP URI:', BPP_URI);
  console.log('Test Item ID:', testItemId);
  console.log('Test Offer ID:', testOfferId);
  console.log('Time Window:', startTime, '->', endTime);

  try {
    // Sign with BPP keys
    const signedHeaders = createSignedHeaders(payload, bppKeyPair, 30);

    console.log('\nSigning with BPP key:', bppKeyPair.keyId);
    console.log('Authorization header (first 100 chars):', signedHeaders.Authorization?.substring(0, 100));

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...signedHeaders,
      },
      timeout: 30000,
    });

    console.log('\n✅ PUBLISH RESPONSE:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data?.ack_status === 'ACK') {
      console.log('\n✅ PUBLISH SUCCESS - Catalog acknowledged by CDS');
      return true;
    } else {
      console.log('\n❌ PUBLISH NACK:', response.data?.error);
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ PUBLISH ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testDiscover(bapKeyPair: BecknKeyPair): Promise<boolean> {
  console.log('\n========== TESTING DISCOVER ==========');

  const payload = buildDiscoverPayload();
  // CDS_URL ends with /catalog, replace with /discover
  const url = CDS_URL.replace(/\/catalog$/, '/discover');

  console.log('Discover URL:', url);
  console.log('BAP ID:', BAP_ID);
  console.log('Filter:', payload.message.filters.expression);

  try {
    // Sign with BAP keys
    const signedHeaders = createSignedHeaders(payload, bapKeyPair, 30);

    console.log('\nSigning with BAP key:', bapKeyPair.keyId);

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...signedHeaders,
      },
      timeout: 30000,
    });

    console.log('\n✅ DISCOVER RESPONSE:');
    console.log('Status:', response.status);

    const data = response.data;

    if (data?.message?.catalogs) {
      const catalogs = data.message.catalogs;
      console.log(`\nFound ${catalogs.length} catalog(s)`);

      // Look for our test catalog
      let foundOurCatalog = false;

      for (const catalog of catalogs) {
        const bppId = catalog['beckn:bppId'];
        const items = catalog['beckn:items'] || [];
        const offers = catalog['beckn:offers'] || [];

        console.log(`\n📦 Catalog from BPP: ${bppId}`);
        console.log(`   Items: ${items.length}, Offers: ${offers.length}`);

        if (bppId === BPP_ID) {
          foundOurCatalog = true;
          console.log('   ✅ THIS IS OUR CATALOG!');

          // Check for our specific offer
          for (const offer of offers) {
            console.log(`   - Offer: ${offer['beckn:id']}`);
            if (offer['beckn:id'] === testOfferId) {
              console.log('     ✅ Found our test offer!');
            }
          }
        }
      }

      if (foundOurCatalog) {
        console.log('\n✅ DISCOVER SUCCESS - Found our catalog from bpp.digioorga.org');
        return true;
      } else {
        console.log('\n⚠️  DISCOVER: Did not find our catalog (bpp.digioorga.org)');
        console.log('   Available BPPs:', catalogs.map((c: any) => c['beckn:bppId']).join(', '));
        return false;
      }
    } else {
      console.log('\n❌ DISCOVER: No catalogs in response');
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ DISCOVER ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// ==================== Main ====================

async function main() {
  console.log('🔑 CDS Publish & Discover Test');
  console.log('================================');
  console.log('CDS URL:', CDS_URL);
  console.log('BAP:', BAP_ID);
  console.log('BPP:', BPP_ID);

  // Verify keys are loaded
  if (!BAP_KEY_ID || !BAP_PRIVATE_KEY) {
    console.error('❌ BAP keys not configured in .env');
    process.exit(1);
  }
  if (!BPP_KEY_ID || !BPP_PRIVATE_KEY) {
    console.error('❌ BPP keys not configured in .env');
    process.exit(1);
  }

  console.log('\nBAP Key ID:', BAP_KEY_ID);
  console.log('BPP Key ID:', BPP_KEY_ID);

  // Initialize key pairs
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

  // Initialize the secure client (needed for signing to work)
  initializeSecureClient({ keyPair: bapKeyPair, enabled: true });
  initializeBppKeys(bppKeyPair);

  // Step 1: Publish
  const publishSuccess = await testPublish(bppKeyPair);

  if (!publishSuccess) {
    console.log('\n❌ Publish failed, skipping discover test');
    process.exit(1);
  }

  // Wait a bit for CDS to process
  console.log('\n⏳ Waiting 3 seconds for CDS to process...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 2: Discover
  const discoverSuccess = await testDiscover(bapKeyPair);

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log('Publish:', publishSuccess ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Discover:', discoverSuccess ? '✅ SUCCESS' : '❌ FAILED');

  if (publishSuccess && discoverSuccess) {
    console.log('\n🎉 Full CDS flow working!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

main().catch(console.error);
