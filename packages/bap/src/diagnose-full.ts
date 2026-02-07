/**
 * Full System Diagnosis
 * Run with: npx ts-node packages/bap/src/diagnose-full.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma, initializeSecureClient, initializeBppKeys, createSignedHeaders, BecknKeyPair } from '@p2p/shared';

const CDS_URL = process.env.EXTERNAL_CDS_URL || '';
const BAP_ID = process.env.BECKN_SUBSCRIBER_ID || '';
const BPP_ID = process.env.BPP_ID || '';

async function diagnose() {
  console.log('='.repeat(60));
  console.log('FULL SYSTEM DIAGNOSIS');
  console.log('='.repeat(60));

  // 1. Check environment
  console.log('\n1️⃣  ENVIRONMENT CHECK');
  console.log('─'.repeat(40));
  const envVars = [
    'DATABASE_URL',
    'BECKN_SIGNING_ENABLED',
    'BECKN_SUBSCRIBER_ID',
    'BECKN_KEY_ID',
    'BECKN_PUBLIC_KEY',
    'BECKN_PRIVATE_KEY',
    'BPP_ID',
    'BPP_KEY_ID',
    'BPP_PUBLIC_KEY',
    'BPP_PRIVATE_KEY',
    'EXTERNAL_CDS_URL',
  ];

  let missingEnv = false;
  for (const v of envVars) {
    const val = process.env[v];
    const status = val ? '✓ SET' : '✗ MISSING';
    if (!val) missingEnv = true;
    console.log(`  ${v}: ${status}`);
  }

  if (missingEnv) {
    console.log('\n  ⚠️  Some environment variables are missing!');
  }

  // 2. Check database
  console.log('\n2️⃣  DATABASE CHECK');
  console.log('─'.repeat(40));

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('  ✓ Database connection OK');

    const userCount = await prisma.user.count();
    const providerCount = await prisma.provider.count();
    const itemCount = await prisma.catalogItem.count();
    const offerCount = await prisma.catalogOffer.count();
    const blockCount = await prisma.offerBlock.count();
    const orderCount = await prisma.order.count();

    console.log(`  Users: ${userCount}`);
    console.log(`  Providers: ${providerCount}`);
    console.log(`  Items: ${itemCount}`);
    console.log(`  Offers: ${offerCount}`);
    console.log(`  Blocks: ${blockCount}`);
    console.log(`  Orders: ${orderCount}`);

    // Show recent offers
    if (offerCount > 0) {
      const recentOffers = await prisma.catalogOffer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { blocks: true } } },
      });
      console.log('\n  Recent offers:');
      for (const o of recentOffers) {
        console.log(`    - ${o.id} | Provider: ${o.providerId} | ${o.maxQty} kWh @ ₹${o.priceValue} | ${o._count.blocks} blocks`);
      }
    }

    // Check for orphaned blocks
    const orphanedBlocks = await prisma.offerBlock.findMany({
      where: {
        offer: null,
      },
    });
    if (orphanedBlocks.length > 0) {
      console.log(`\n  ⚠️  Found ${orphanedBlocks.length} orphaned blocks (no parent offer)`);
    }

    // Show user-provider mappings
    const usersWithProviders = await prisma.user.findMany({
      where: { providerId: { not: null } },
      select: { id: true, phone: true, name: true, providerId: true },
    });
    console.log('\n  User-Provider mappings:');
    for (const u of usersWithProviders) {
      const offersByProvider = await prisma.catalogOffer.count({ where: { providerId: u.providerId! } });
      console.log(`    - ${u.name || u.phone} -> Provider: ${u.providerId} (${offersByProvider} offers)`);
    }

  } catch (err: any) {
    console.log(`  ✗ Database error: ${err.message}`);
  }

  // 3. Check CDS connectivity
  console.log('\n3️⃣  CDS CONNECTIVITY CHECK');
  console.log('─'.repeat(40));

  if (!CDS_URL) {
    console.log('  ✗ EXTERNAL_CDS_URL not set');
  } else {
    console.log(`  CDS URL: ${CDS_URL}`);

    // Initialize keys
    const bapKeyPair: BecknKeyPair = {
      keyId: process.env.BECKN_KEY_ID || '',
      publicKey: process.env.BECKN_PUBLIC_KEY || '',
      privateKey: process.env.BECKN_PRIVATE_KEY || '',
    };
    const bppKeyPair: BecknKeyPair = {
      keyId: process.env.BPP_KEY_ID || '',
      publicKey: process.env.BPP_PUBLIC_KEY || '',
      privateKey: process.env.BPP_PRIVATE_KEY || '',
    };

    initializeSecureClient({ keyPair: bapKeyPair, enabled: true });
    initializeBppKeys(bppKeyPair);

    // Try to discover from CDS
    const discoverPayload = {
      context: {
        version: '2.0.0',
        action: 'discover',
        timestamp: new Date().toISOString(),
        message_id: uuidv4(),
        transaction_id: uuidv4(),
        bap_id: BAP_ID,
        bap_uri: process.env.BAP_URI || '',
        bpp_id: BPP_ID,
        bpp_uri: process.env.BPP_URI || '',
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

    try {
      const discoverUrl = CDS_URL.replace(/\/catalog$/, '/discover');
      const signedHeaders = createSignedHeaders(discoverPayload, bapKeyPair, 30);

      const response = await axios.post(discoverUrl, discoverPayload, {
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        timeout: 15000,
      });

      console.log('  ✓ CDS discover request successful');

      const catalogs = response.data?.message?.catalogs || [];
      console.log(`  Found ${catalogs.length} catalogs in CDS`);

      // Count catalogs by BPP
      const bppCounts: Record<string, number> = {};
      for (const cat of catalogs) {
        const bpp = cat['beckn:bppId'] || 'unknown';
        bppCounts[bpp] = (bppCounts[bpp] || 0) + 1;
      }

      console.log('  Catalogs by BPP:');
      for (const [bpp, count] of Object.entries(bppCounts)) {
        const isOurs = bpp === BPP_ID ? ' ← OUR BPP' : '';
        console.log(`    - ${bpp}: ${count} catalog(s)${isOurs}`);
      }

      // Show our catalogs' offers
      const ourCatalogs = catalogs.filter((c: any) => c['beckn:bppId'] === BPP_ID);
      if (ourCatalogs.length > 0) {
        console.log(`\n  Our BPP has ${ourCatalogs.length} catalog(s) in CDS:`);
        for (const cat of ourCatalogs) {
          const offers = cat['beckn:offers'] || [];
          const items = cat['beckn:items'] || [];
          console.log(`    - Catalog: ${cat['beckn:id']} | ${items.length} items, ${offers.length} offers`);
          for (const offer of offers.slice(0, 3)) {
            const price = offer['beckn:price']?.['schema:price'] || 'N/A';
            const qty = offer['beckn:price']?.applicableQuantity?.unitQuantity || 'N/A';
            console.log(`      → Offer: ${offer['beckn:id']} | ${qty} kWh @ ₹${price}`);
          }
          if (offers.length > 3) {
            console.log(`      ... and ${offers.length - 3} more offers`);
          }
        }
      } else {
        console.log(`\n  ⚠️  No catalogs from our BPP (${BPP_ID}) found in CDS`);
      }

    } catch (err: any) {
      console.log(`  ✗ CDS discover failed: ${err.message}`);
      if (err.response?.data) {
        console.log(`    Response: ${JSON.stringify(err.response.data).substring(0, 200)}`);
      }
    }
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

diagnose().catch(console.error);
