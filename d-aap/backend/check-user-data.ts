import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetWallet = '0x8fc341361fd05d8d93d69745fd6fecee6927bc27'.toLowerCase();
    
    console.log(`Checking transactions for wallet: ${targetWallet}`);

    const wallet = await prisma.userWallet.findUnique({
        where: { walletAddress: targetWallet },
    });

    if (!wallet) {
        console.log('Wallet not found in database.');
        return;
    }

    console.log(`Wallet ID: ${wallet.id}`);

    const transactions = await prisma.transaction.findMany({
        where: {
            walletId: wallet.id,
            type: 'CLAIM',
        },
    });

    console.log(`Found ${transactions.length} CLAIM transactions.`);
    transactions.forEach(tx => {
        console.log(`- ID: ${tx.id}, Status: ${tx.status}, Amount: ${tx.amount}, ConfirmedAt: ${tx.confirmedAt}`);
    });

    const positions = await prisma.stakePosition.findMany({
        where: {
            walletId: wallet.id,
        },
    });

    console.log(`Found ${positions.length} stake positions.`);
    positions.forEach(pos => {
        console.log(`- Position ID: ${pos.id}, Principal: ${pos.principal}, RewardClaimed: ${pos.rewardClaimed}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
