import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- CLEANING UP MULTIPLE WALLETS PER USER ---');

    const users = await prisma.user.findMany({
        include: { wallets: true }
    });

    for (const user of users) {
        if (user.wallets.length > 1) {
            console.log(`User ${user.email || user.id} has ${user.wallets.length} wallets. Cleaning up...`);
            
            // Keep the primary wallet, or the latest one if no primary
            const primaryWallet = user.wallets.find(w => w.isPrimary) || user.wallets[user.wallets.length - 1];
            
            const walletsToDelete = user.wallets.filter(w => w.id !== primaryWallet.id);
            const idsToDelete = walletsToDelete.map(w => w.id);

            await prisma.userWallet.deleteMany({
                where: { id: { in: idsToDelete } }
            });

            // Ensure the remaining wallet is marked as primary
            await prisma.userWallet.update({
                where: { id: primaryWallet.id },
                data: { isPrimary: true }
            });

            console.log(`   ✅ Kept wallet: ${primaryWallet.walletAddress}, deleted: ${idsToDelete.length} wallets.`);
        }
    }

    console.log('\n--- CLEANUP COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
