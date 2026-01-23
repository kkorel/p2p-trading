import { prisma, redis, createSession } from '@p2p/shared';

async function main() {
    // Get first user
    const user = await prisma.user.findFirst({
        include: { provider: true }
    });

    if (!user) {
        console.log('No users found');
        return;
    }

    console.log('User:', user.name, user.id);

    // Create session
    const token = await createSession({ userId: user.id });
    console.log('Token:', token);

    await prisma.$disconnect();
    await redis.quit();
}

main().catch(console.error);
