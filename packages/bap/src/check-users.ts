import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { prisma } from '@p2p/shared';

async function main() {
  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, name: true, providerId: true }
  });

  console.log('USERS:');
  for (const u of users) {
    console.log('  ', JSON.stringify(u));
  }

  // Get all providers
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true }
  });

  console.log('\nPROVIDERS:');
  for (const p of providers) {
    const offerCount = await prisma.catalogOffer.count({ where: { providerId: p.id } });
    console.log(`  ${p.id} (${p.name}) -> ${offerCount} offers`);
  }

  // Check which providers are linked to users
  console.log('\nUSER-PROVIDER LINKS:');
  for (const u of users) {
    if (u.providerId) {
      const provider = providers.find(p => p.id === u.providerId);
      const offerCount = await prisma.catalogOffer.count({ where: { providerId: u.providerId } });
      console.log(`  ${u.name || u.phone} -> ${u.providerId} (${provider?.name || 'NOT FOUND'}) -> ${offerCount} offers`);
    } else {
      console.log(`  ${u.name || u.phone} -> NO PROVIDER LINKED`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
