import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { initializeSecureClient, initializeBppKeys, createSignedHeaders, BecknKeyPair } from '@p2p/shared';

const CDS_URL = process.env.EXTERNAL_CDS_URL || '';
const BAP_ID = process.env.BECKN_SUBSCRIBER_ID || '';

async function searchCDS() {
  const bapKeyPair: BecknKeyPair = {
    keyId: process.env.BECKN_KEY_ID || '',
    publicKey: process.env.BECKN_PUBLIC_KEY || '',
    privateKey: process.env.BECKN_PRIVATE_KEY || '',
  };
  initializeSecureClient({ keyPair: bapKeyPair, enabled: true });

  const discoverPayload = {
    context: {
      version: '2.0.0',
      action: 'discover',
      timestamp: new Date().toISOString(),
      message_id: uuidv4(),
      transaction_id: uuidv4(),
      bap_id: BAP_ID,
      bap_uri: process.env.BAP_URI || '',
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

  const discoverUrl = CDS_URL.replace(/\/catalog$/, '/discover');
  const signedHeaders = createSignedHeaders(discoverPayload, bapKeyPair, 30);

  const response = await axios.post(discoverUrl, discoverPayload, {
    headers: { 'Content-Type': 'application/json', ...signedHeaders },
    timeout: 15000,
  });

  const catalogs = response.data?.message?.catalogs || [];
  console.log('Searching for WIND offers at Rs 5...');
  console.log('Total catalogs:', catalogs.length);

  for (const cat of catalogs) {
    const bppId = cat['beckn:bppId'];
    const offers = cat['beckn:offers'] || [];
    for (const offer of offers) {
      const price = offer['beckn:price']?.['schema:price'];
      const items = cat['beckn:items'] || [];
      for (const item of items) {
        const sourceType = item['beckn:sourceType'];
        if ((sourceType && sourceType.toLowerCase().includes('wind')) ||
            (price && parseFloat(price) === 5)) {
          console.log('\n=== FOUND POTENTIAL MATCH ===');
          console.log('BPP:', bppId);
          console.log('Catalog ID:', cat['beckn:id']);
          console.log('Item:', item['beckn:id'], '-', sourceType);
          console.log('Offer:', offer['beckn:id']);
          console.log('Price:', price);
          console.log('Qty:', offer['beckn:price']?.applicableQuantity?.unitQuantity);
        }
      }
    }
  }

  // Also show all our BPP's catalogs
  console.log('\n=== ALL OUR BPP CATALOGS ===');
  for (const cat of catalogs) {
    if (cat['beckn:bppId'] === 'bpp.digioorga.org') {
      const offers = cat['beckn:offers'] || [];
      const items = cat['beckn:items'] || [];
      console.log(`Catalog: ${cat['beckn:id']}`);
      for (const item of items) {
        console.log(`  Item: ${item['beckn:id']} - ${item['beckn:sourceType']}`);
      }
      for (const offer of offers) {
        const price = offer['beckn:price']?.['schema:price'];
        const qty = offer['beckn:price']?.applicableQuantity?.unitQuantity;
        console.log(`  Offer: ${offer['beckn:id']} - ${qty} kWh @ Rs ${price}`);
      }
    }
  }
}

searchCDS().catch(console.error);
