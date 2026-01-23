process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/p2p_trading';
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const crypto = require('crypto');

async function main() {
    const prisma = new PrismaClient();
    const redis = new Redis();

    const user = await prisma.user.findFirst({ include: { provider: true } });
    if (!user) { console.log('No users'); process.exit(1); }

    console.log('User:', user.name, user.id);

    const token = crypto.randomBytes(32).toString('hex');
    const sessionData = { userId: user.id, createdAt: Date.now() };
    await redis.set('session:' + token, JSON.stringify(sessionData), 'EX', 86400);

    console.log('Token:', token);

    await prisma.$disconnect();
    redis.quit();
}
main().catch(console.error);
