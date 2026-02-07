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

const ts = Date.now();
const testProviderId = `digioorja-test-${ts}`;
const testItemId = `item-${ts}`;
const testOfferId = `offer-digioorja-${ts}`;

// Use TODAY's date for the time window
const today = new Date();
today.setHours(7, 0, 0, 0); // 7 AM today
const startTime = today.toISOString();
today.setHours(11, 0, 0, 0); // 11 AM today
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
      'beckn:id': `catalog-${testProviderId}`,
      'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'DigiOorja Test Energy Catalog' },
      'beckn:bppId': BPP_ID,
      'beckn:bppUri': BPP_URI,
      'beckn:isActive': true,
      'beckn:items': [{
        '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
        '@type': 'beckn:Item',
        'beckn:networkId': ['p2p-interdiscom-trading-pilot-network'],
        'beckn:isActive': true,
        'beckn:id': testItemId,
        'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'SOLAR Energy - 25 kWh', 'beckn:shortDesc': 'SOLAR energy from DigiOorja Test' },
        'beckn:provider': {
          'beckn:id': testProviderId,
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'DigiOorja Test' },
          'beckn:providerAttributes': {
            '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
            '@type': 'EnergyCustomer',
            meterId: `der://meter/${testItemId}`,
            utilityId: 'BESCOM',
            utilityCustomerId: 'DIGIOORJA-TEST-001',
          },
        },
        'beckn:itemAttributes': {
          '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
          '@type': 'EnergyResource',
          sourceType: 'SOLAR',
          meterId: `der://meter/${testItemId}`,
        },
      }],
      'beckn:offers': [{
        '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
        '@type': 'beckn:Offer',
        'beckn:id': testOfferId,
        'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'DigiOorja Test Offer - 25 kWh @ Rs9' },
        'beckn:provider': testProviderId,
        'beckn:items': [testItemId],
        'beckn:price': {
          '@type': 'schema:PriceSpecification',
          'schema:price': 9.0,
          'schema:priceCurrency': 'INR',
          unitText: 'kWh',
          applicableQuantity: { unitQuantity: 25, unitText: 'kWh' },
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

async function main() {
  const bppKeyPair: BecknKeyPair = {
    keyId: process.env.BPP_KEY_ID!,
    publicKey: process.env.BPP_PUBLIC_KEY!,
    privateKey: process.env.BPP_PRIVATE_KEY!,
  };

  initializeSecureClient({ keyPair: { keyId: process.env.BECKN_KEY_ID!, publicKey: process.env.BECKN_PUBLIC_KEY!, privateKey: process.env.BECKN_PRIVATE_KEY! }, enabled: true });
  initializeBppKeys(bppKeyPair);

  console.log('========================================');
  console.log('Publishing DigiOorja Test offer to CDS');
  console.log('========================================');
  console.log('Provider: DigiOorja Test');
  console.log('Price: Rs 9/kWh');
  console.log('Quantity: 25 kWh');
  console.log('Time: TODAY Feb 7, 7:00 AM - 11:00 AM');
  console.log('Offer ID:', testOfferId);
  console.log('Start:', startTime);
  console.log('End:', endTime);
  console.log('========================================');

  const signedHeaders = createSignedHeaders(payload, bppKeyPair, 30);
  const response = await axios.post(`${CDS_URL}/publish`, payload, {
    headers: { 'Content-Type': 'application/json', ...signedHeaders },
    timeout: 30000,
  });

  console.log('\nResponse:', JSON.stringify(response.data, null, 2));
  if (response.data?.ack_status === 'ACK') {
    console.log('\n✅ SUCCESS! Look for "DigiOorja Test" on the Buy page');
    console.log('   Provider: DigiOorja Test');
    console.log('   Price: Rs 9/kWh');
    console.log('   Time: Feb 8, 6am-12pm');
  }
}

main().catch(console.error);
