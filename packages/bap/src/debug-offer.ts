import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { prisma } from '@p2p/shared';
import { getOfferById } from './seller-catalog';

async function main() {
  const offerId = 'manual-offer-1770339325490';

  console.log('Checking for offer:', offerId);
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

  const offer = await prisma.catalogOffer.findUnique({
    where: { id: offerId }
  });

  console.log('Prisma findUnique found:', offer ? 'YES' : 'NO');
  if (offer) {
    console.log('Offer details:', JSON.stringify(offer, null, 2));
  }

  // Also test via getOfferById (what the BPP handler uses)
  const offerViaHelper = await getOfferById(offerId);
  console.log('\ngetOfferById found:', offerViaHelper ? 'YES' : 'NO');
  if (offerViaHelper) {
    console.log('Offer via helper:', JSON.stringify(offerViaHelper, null, 2));
  }

  // List all offers
  const allOffers = await prisma.catalogOffer.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('\nRecent offers:', allOffers.map(o => o.id));

  await prisma.$disconnect();
}

main().catch(console.error);
