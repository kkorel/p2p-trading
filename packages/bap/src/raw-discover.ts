/**
 * Raw CDS discover - no filters, dump all catalogs
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { initializeSecureClient, createSignedHeaders, BecknKeyPair } from '@p2p/shared';

const CDS_URL = process.env.EXTERNAL_CDS_URL || 'https://34.93.141.21.sslip.io/beckn/catalog';
const BAP_ID = process.env.BECKN_SUBSCRIBER_ID || 'bap.digioorga.org';
const BAP_URI = process.env.BAP_URI || 'https://bap.digioorga.org';
const BPP_ID = process.env.BPP_ID || 'bpp.digioorga.org';
const BPP_URI = process.env.BPP_URI || 'https://bpp.digioorga.org/callbacks';

async function main() {
  const bapKeyPair: BecknKeyPair = {
    keyId: process.env.BECKN_KEY_ID!,
    publicKey: process.env.BECKN_PUBLIC_KEY!,
    privateKey: process.env.BECKN_PRIVATE_KEY!,
  };

  initializeSecureClient({ keyPair: bapKeyPair, enabled: true });

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
      location: { city: { code: 'BLR', name: 'Bangalore' }, country: { code: 'IND', name: 'India' } },
      schema_context: ['https://raw.githubusercontent.com/beckn/protocol-specifications-v2/refs/heads/p2p-trading/schema/EnergyTrade/v0.3/context.jsonld'],
    },
    message: {
      filters: {
        type: 'jsonpath',
        expression: "$[?('p2p-interdiscom-trading-pilot-network' == @.beckn:networkId)]",
      },
    },
  };

  const url = CDS_URL.replace(/\/catalog$/, '/discover');
  const signedHeaders = createSignedHeaders(payload, bapKeyPair, 30);

  console.log('Discovering from:', url);
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json', ...signedHeaders },
    timeout: 30000,
  });

  const catalogs = response.data?.message?.catalogs || [];
  console.log(`\nFound ${catalogs.length} catalogs\n`);

  // Look for user's catalog and offer
  const targetOffers = ['offer-9b6815c0', 'offer-c03613ab'];
  const targetProvider = '8028fccf';

  let foundTarget = false;
  for (const catalog of catalogs) {
    const bppId = catalog['beckn:bppId'];
    const catalogId = catalog['beckn:id'];
    const offers = catalog['beckn:offers'] || [];

    for (const offer of offers) {
      const offerId = offer['beckn:id'];
      if (targetOffers.includes(offerId) || catalogId?.includes(targetProvider)) {
        console.log('>>> FOUND TARGET <<<');
        console.log('Catalog:', catalogId);
        console.log('Offer:', offerId);
        foundTarget = true;
      }
    }
  }

  if (!foundTarget) {
    console.log(`Target offers ${targetOffers.join(', ')} NOT FOUND in ${catalogs.length} catalogs`);

    // List all catalogs from bpp.digioorga.org
    console.log('\nAll catalogs from bpp.digioorga.org:');
    for (const catalog of catalogs) {
      if (catalog['beckn:bppId'] === 'bpp.digioorga.org') {
        const offers = catalog['beckn:offers'] || [];
        console.log(`  Catalog: ${catalog['beckn:id']}`);
        for (const offer of offers) {
          const tw = offer['beckn:offerAttributes']?.deliveryWindow;
          console.log(`    Offer: ${offer['beckn:id']} (${tw?.['schema:startTime']?.substring(11,16)} - ${tw?.['schema:endTime']?.substring(11,16)})`);
        }
      }
    }
  }
}

main().catch(console.error);
