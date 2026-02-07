/**
 * Test publishing with the user's actual provider ID
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

// Use SIMPLE provider ID (no UUID)
const testProviderId = 'aryan-simple-provider';
const testItemId = `item-test-user-${Date.now()}`;
const testOfferId = `offer-test-user-${Date.now()}`;

const today = new Date();
today.setHours(7, 0, 0, 0);
const startTime = today.toISOString();
today.setHours(11, 0, 0, 0);
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
    // NO location or schema_context - those cause CDS to not index!
  },
  message: {
    catalogs: [{
      '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
      '@type': 'beckn:Catalog',
      'beckn:id': `catalog-${testProviderId}`,
      'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Aryan Jain Energy Trading Catalog' },
      'beckn:bppId': BPP_ID,
      'beckn:bppUri': BPP_URI,
      'beckn:isActive': true,
      'beckn:items': [{
        '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-new/refs/heads/main/schema/core/v2/context.jsonld',
        '@type': 'beckn:Item',
        'beckn:networkId': ['p2p-interdiscom-trading-pilot-network'],
        'beckn:isActive': true,
        'beckn:id': testItemId,
        'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'SOLAR Energy - Test', 'beckn:shortDesc': 'Test with user provider' },
        'beckn:provider': {
          'beckn:id': testProviderId,
          'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Aryan Jain' },
          'beckn:providerAttributes': {
            '@context': 'https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld',
            '@type': 'EnergyCustomer',
            meterId: `der://meter/${testItemId}`,
            utilityId: 'BESCOM-KA',
            utilityCustomerId: '80000190019',
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
        'beckn:descriptor': { '@type': 'beckn:Descriptor', 'schema:name': 'Test Offer with User Provider' },
        'beckn:provider': testProviderId,
        'beckn:items': [testItemId],
        'beckn:price': {
          '@type': 'schema:PriceSpecification',
          'schema:price': 7.0,
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

async function main() {
  const bppKeyPair: BecknKeyPair = {
    keyId: process.env.BPP_KEY_ID!,
    publicKey: process.env.BPP_PUBLIC_KEY!,
    privateKey: process.env.BPP_PRIVATE_KEY!,
  };

  initializeSecureClient({ keyPair: { keyId: process.env.BECKN_KEY_ID!, publicKey: process.env.BECKN_PUBLIC_KEY!, privateKey: process.env.BECKN_PRIVATE_KEY! }, enabled: true });
  initializeBppKeys(bppKeyPair);

  console.log('========================================');
  console.log('Publishing with USER PROVIDER ID');
  console.log('========================================');
  console.log('Provider ID:', testProviderId);
  console.log('Catalog ID:', `catalog-${testProviderId}`);
  console.log('Offer ID:', testOfferId);
  console.log('BAP_URI:', BAP_URI);
  console.log('========================================');

  const signedHeaders = createSignedHeaders(payload, bppKeyPair, 30);

  console.log('\nSigned Headers:', {
    Authorization: signedHeaders.Authorization?.substring(0, 80) + '...',
    Digest: signedHeaders.Digest?.substring(0, 40) + '...',
  });

  const response = await axios.post(`${CDS_URL}/publish`, payload, {
    headers: { 'Content-Type': 'application/json', ...signedHeaders },
    timeout: 30000,
  });

  console.log('\nResponse:', JSON.stringify(response.data, null, 2));

  if (response.data?.ack_status === 'ACK') {
    console.log('\n✅ PUBLISHED! Now waiting 3 seconds then discovering...');
    await new Promise(r => setTimeout(r, 3000));

    // Discover
    const discoverPayload = {
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
        location: { city: { code: 'BLR', name: 'Bangalore' }, country: { code: 'IND', name: 'India' } },
        schema_context: ['https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld'],
      },
      message: { filters: { type: 'jsonpath', expression: "$[?('p2p-interdiscom-trading-pilot-network' == @.beckn:networkId)]" } },
    };

    const bapKeyPair: BecknKeyPair = {
      keyId: process.env.BECKN_KEY_ID!,
      publicKey: process.env.BECKN_PUBLIC_KEY!,
      privateKey: process.env.BECKN_PRIVATE_KEY!,
    };
    const discoverHeaders = createSignedHeaders(discoverPayload, bapKeyPair, 30);
    const discoverUrl = CDS_URL.replace(/\/catalog$/, '/discover');

    const discoverRes = await axios.post(discoverUrl, discoverPayload, {
      headers: { 'Content-Type': 'application/json', ...discoverHeaders },
      timeout: 30000,
    });

    const catalogs = discoverRes.data?.message?.catalogs || [];
    console.log(`\nDiscovered ${catalogs.length} catalogs`);

    // Look for our offer
    let found = false;
    for (const cat of catalogs) {
      const offers = cat['beckn:offers'] || [];
      for (const o of offers) {
        if (o['beckn:id'] === testOfferId) {
          console.log('\n✅ FOUND OUR OFFER!');
          console.log('Catalog:', cat['beckn:id']);
          console.log('Offer:', o['beckn:id']);
          found = true;
        }
      }
      // Also check for any catalog with this provider ID
      if (cat['beckn:id']?.includes('8028fccf')) {
        console.log('\nFound catalog with provider 8028fccf:', cat['beckn:id']);
        console.log('Offers:', offers.map((o: any) => o['beckn:id']));
      }
    }

    if (!found) {
      console.log('\n❌ Offer NOT found in discover results');
    }
  }
}

main().catch(console.error);
