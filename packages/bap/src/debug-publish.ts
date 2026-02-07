/**
 * Debug CDS Publishing - prints full request details for comparison
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { initializeSecureClient, initializeBppKeys, createSignedHeaders, BecknKeyPair } from '@p2p/shared';

const CDS_URL = process.env.EXTERNAL_CDS_URL || 'https://34.93.141.21.sslip.io/beckn/catalog';
const BPP_ID = process.env.BPP_ID || 'bpp.digioorga.org';
const BPP_URI = process.env.BPP_URI || 'https://bpp.digioorga.org/callbacks';
const BAP_ID = process.env.BECKN_SUBSCRIBER_ID || 'bap.digioorga.org';
const BAP_URI = process.env.BAP_URI || 'https://bap.digioorga.org';

async function main() {
  const bppKeyPair: BecknKeyPair = {
    keyId: process.env.BPP_KEY_ID!,
    publicKey: process.env.BPP_PUBLIC_KEY!,
    privateKey: process.env.BPP_PRIVATE_KEY!,
  };

  initializeSecureClient({ keyPair: { keyId: process.env.BECKN_KEY_ID!, publicKey: process.env.BECKN_PUBLIC_KEY!, privateKey: process.env.BECKN_PRIVATE_KEY! }, enabled: true });
  initializeBppKeys(bppKeyPair);

  const ts = Date.now();
  const providerId = `debug-provider-${ts}`;
  const itemId = `item-${ts}`;
  const offerId = `offer-debug-${ts}`;

  const today = new Date();
  today.setHours(9, 0, 0, 0);
  const startTime = today.toISOString();
  today.setHours(14, 0, 0, 0);
  const endTime = today.toISOString();

  const payload = {
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
    },
    message: {
      catalogs: [{
        '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
        '@type': 'beckn:Catalog',
        'beckn:id': `catalog-${providerId}`,
        'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Debug Test Catalog' },
        'beckn:bppId': BPP_ID,
        'beckn:bppUri': BPP_URI,
        'beckn:isActive': true,
        'beckn:items': [{
          '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
          '@type': 'beckn:Item',
          'beckn:networkId': ['p2p-interdiscom-trading-pilot-network'],
          'beckn:isActive': true,
          'beckn:id': itemId,
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'SOLAR Energy - Debug', 'beckn:shortDesc': 'Debug test item' },
          'beckn:provider': {
            'beckn:id': providerId,
            'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Debug Provider' },
            'beckn:providerAttributes': {
              '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
              '@type': 'EnergyCustomer',
              meterId: `der://meter/${itemId}`,
              utilityId: 'BESCOM',
              utilityCustomerId: 'DEBUG-001',
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
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Debug Offer - 50 kWh @ Rs 5' },
          'beckn:provider': providerId,
          'beckn:items': [itemId],
          'beckn:price': {
            '@type': 'schema:PriceSpecification',
            'schema:price': 5.0,
            'schema:priceCurrency': 'INR',
            unitText: 'kWh',
            applicableQuantity: { unitQuantity: 50, unitText: 'kWh' },
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

  const signedHeaders = createSignedHeaders(payload, bppKeyPair, 30);

  console.log('='.repeat(80));
  console.log('LOCAL WORKING PUBLISH - Compare with your server logs');
  console.log('='.repeat(80));
  console.log('\n--- REQUEST URL ---');
  console.log(`${CDS_URL}/publish`);
  console.log('\n--- HEADERS ---');
  console.log(JSON.stringify({
    'Content-Type': 'application/json',
    ...signedHeaders,
  }, null, 2));
  console.log('\n--- BODY (truncated for readability) ---');
  console.log(JSON.stringify({
    context: payload.context,
    message: {
      catalogs: [{
        '@type': payload.message.catalogs[0]['@type'],
        'beckn:id': payload.message.catalogs[0]['beckn:id'],
        'beckn:bppId': payload.message.catalogs[0]['beckn:bppId'],
        'beckn:bppUri': payload.message.catalogs[0]['beckn:bppUri'],
        'beckn:isActive': payload.message.catalogs[0]['beckn:isActive'],
        'beckn:items': ['... 1 item ...'],
        'beckn:offers': ['... 1 offer ...'],
      }],
    },
  }, null, 2));

  console.log('\n--- FULL BODY (for exact comparison) ---');
  console.log(JSON.stringify(payload, null, 2));

  console.log('\n--- SENDING REQUEST ---');
  try {
    const response = await axios.post(`${CDS_URL}/publish`, payload, {
      headers: { 'Content-Type': 'application/json', ...signedHeaders },
      timeout: 30000,
    });
    console.log('\n--- RESPONSE ---');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('\n--- ERROR ---');
    console.log('Message:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main().catch(console.error);
