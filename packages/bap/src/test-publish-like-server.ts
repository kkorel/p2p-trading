/**
 * Test CDS Publishing using the same code path as the server
 * This helps diagnose why offers from the app don't appear in CDS
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env before imports
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import {
  initializeSecureClient,
  initializeBppKeys,
  BecknKeyPair,
  publishOfferToCDS,
  SyncProvider,
  SyncItem,
  SyncOffer,
} from '@p2p/shared';

async function main() {
  console.log('===========================================');
  console.log('Testing CDS Publish (Server Code Path)');
  console.log('===========================================\n');

  // Check env vars
  console.log('Environment Variables Check:');
  console.log('  BECKN_SIGNING_ENABLED:', process.env.BECKN_SIGNING_ENABLED);
  console.log('  BECKN_KEY_ID:', process.env.BECKN_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('  BECKN_PRIVATE_KEY:', process.env.BECKN_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
  console.log('  BPP_KEY_ID:', process.env.BPP_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('  BPP_PRIVATE_KEY:', process.env.BPP_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
  console.log('  EXTERNAL_CDS_URL:', process.env.EXTERNAL_CDS_URL);
  console.log('');

  // Initialize keys exactly like the server does
  if (process.env.BECKN_KEY_ID && process.env.BECKN_PRIVATE_KEY) {
    const bapKeyPair: BecknKeyPair = {
      keyId: process.env.BECKN_KEY_ID!,
      publicKey: process.env.BECKN_PUBLIC_KEY || '',
      privateKey: process.env.BECKN_PRIVATE_KEY!,
    };
    initializeSecureClient({
      keyPair: bapKeyPair,
      enabled: process.env.BECKN_SIGNING_ENABLED === 'true',
    });
    console.log('✅ BAP signing initialized (enabled:', process.env.BECKN_SIGNING_ENABLED === 'true', ')');
  } else {
    console.log('❌ BAP keys missing - signing NOT initialized');
  }

  if (process.env.BPP_KEY_ID && process.env.BPP_PRIVATE_KEY) {
    const bppKeyPair: BecknKeyPair = {
      keyId: process.env.BPP_KEY_ID!,
      publicKey: process.env.BPP_PUBLIC_KEY || '',
      privateKey: process.env.BPP_PRIVATE_KEY!,
    };
    initializeBppKeys(bppKeyPair);
    console.log('✅ BPP keys initialized');
  } else {
    console.log('❌ BPP keys missing - catalog_publish will fail or use BAP keys');
  }

  console.log('\n');

  // Create test offer like the app would
  const ts = Date.now();
  const testProviderId = `test-server-path-${ts}`;
  const testItemId = `item-${ts}`;
  const testOfferId = `offer-server-path-${ts}`;

  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const startTime = today.toISOString();
  today.setHours(12, 0, 0, 0);
  const endTime = today.toISOString();

  const provider: SyncProvider = {
    id: testProviderId,
    name: 'Server Path Test Provider',
    trust_score: 0.8,
  };

  const item: SyncItem = {
    id: testItemId,
    provider_id: testProviderId,
    source_type: 'SOLAR',
    delivery_mode: 'GRID_INJECTION',
    available_qty: 50,
    production_windows: [{ startTime, endTime }],
    meter_id: `der://meter/${testItemId}`,
    utility_id: 'BESCOM',
    utility_customer_id: 'TEST-CUST-001',
  };

  const offer: SyncOffer = {
    id: testOfferId,
    item_id: testItemId,
    provider_id: testProviderId,
    price_value: 5.0,
    currency: 'INR',
    max_qty: 50,
    time_window: { startTime, endTime },
    pricing_model: 'PER_KWH',
    settlement_type: 'NET_BILLING',
  };

  console.log('Publishing test offer:');
  console.log('  Provider:', provider.name);
  console.log('  Offer ID:', testOfferId);
  console.log('  Price: Rs', offer.price_value, '/kWh');
  console.log('  Quantity:', offer.max_qty, 'kWh');
  console.log('  Time Window:', startTime.substring(11, 16), '-', endTime.substring(11, 16));
  console.log('');

  try {
    // This is the EXACT same function the server calls
    const success = await publishOfferToCDS(provider, item, offer);

    if (success) {
      console.log('\n✅ SUCCESS - Offer published using server code path');
      console.log('\nNow run discovery to verify:');
      console.log('  npx ts-node packages/bap/src/test-cds-flow.ts');
      console.log('\nLook for:', testOfferId);
    } else {
      console.log('\n❌ FAILED - publishOfferToCDS returned false');
      console.log('Check logs above for NACK or error details');
    }
  } catch (error: any) {
    console.error('\n❌ ERROR publishing offer:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main().catch(console.error);
