/**
 * Test if server can see offers created by this script
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import axios from 'axios';
import { prisma } from '@p2p/shared';

async function main() {
  const ts = Date.now();
  const offerId = `db-vis-test-offer-${ts}`;
  const providerId = 'db-vis-test-prov';
  const itemId = 'db-vis-test-item';

  console.log('Testing database visibility between script and server...');

  try {
    // Create test data
    await prisma.provider.upsert({
      where: { id: providerId },
      update: {},
      create: { id: providerId, name: 'DB Vis Test Provider', trustScore: 0.8 }
    });

    await prisma.catalogItem.upsert({
      where: { id: itemId },
      update: {},
      create: { id: itemId, providerId, sourceType: 'SOLAR', deliveryMode: 'GRID_INJECTION', availableQty: 10, meterId: 'M1', productionWindowsJson: '[]' }
    });

    const offer = await prisma.catalogOffer.create({
      data: {
        id: offerId,
        itemId,
        providerId,
        maxQty: 10,
        priceValue: 8,
        currency: 'INR',
        pricingModel: 'PER_KWH',
        timeWindowStart: new Date(Date.now() + 86400000),
        timeWindowEnd: new Date(Date.now() + 172800000)
      }
    });

    console.log('✅ Created offer in DB:', offer.id);

    // Verify script can see it
    const scriptCheck = await prisma.catalogOffer.findUnique({ where: { id: offerId } });
    console.log('✅ Script can see offer:', !!scriptCheck);

    // Try to select this offer via API (simulate what E2E test does)
    // First, discover to create a transaction
    const discoverResp = await axios.post('http://localhost:4000/api/discover', {});
    const txnId = discoverResp.data.transaction_id;
    console.log('Transaction ID:', txnId);

    // Now manually update transaction state to include our offer (simulating what discover should do)
    // This won't work because we can't directly modify server state from here
    // Instead, let's see what error the select gives us
    try {
      const selectResp = await axios.post('http://localhost:4000/api/select', {
        transaction_id: txnId,
        offer_id: offerId,
        item_id: itemId,
        quantity: 2,
      });
      console.log('Select response:', JSON.stringify(selectResp.data, null, 2));
    } catch (e: any) {
      console.log('Select error:', e.response?.data || e.message);
    }

    // Cleanup
    await prisma.catalogOffer.delete({ where: { id: offerId } });
    console.log('✅ Cleaned up');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
