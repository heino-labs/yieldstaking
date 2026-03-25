import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const getEnvAddress = (key: string): string => {
    const raw = process.env[key];
    if (!raw) throw new Error(`Missing environment variable: ${key}`);
    const addr = raw.trim();
    if (!ethers.isAddress(addr)) throw new Error(`Invalid address for ${key}: ${addr}`);
    return addr.toLowerCase();
};

async function main() {
    const sepolia = await prisma.chain.upsert({
        where: { id: 11155111 },
        update: {},
        create: {
            id: 11155111,
            name: 'Sepolia Testnet',
            slug: 'sepolia',
            rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
            explorerUrl: 'https://sepolia.etherscan.io',
            isActive: true,
        },
    });

    const contractAddress = getEnvAddress('YIELD_STAKING_ADDRESS');
    const usdtAddress = getEnvAddress('USDT_ADDRESS');
    const aureusAddress = getEnvAddress('AUREUS_ADDRESS');

    const stakingContract = await prisma.stakingContract.upsert({
        where: { address: contractAddress },
        update: {},
        create: {
            chainId: sepolia.id,
            address: contractAddress,
            stakeTokenAddress: aureusAddress,
            rewardTokenAddress: usdtAddress,
            stakeTokenSymbol: 'AUR',
            rewardTokenSymbol: 'USDT',
            stakeTokenDecimals: 18,
            rewardTokenDecimals: 6,
            minStakeAmount: (100n * 10n ** 18n).toString(),
            maxStakePerUser: '0',
            totalLocked: '0',
            totalRewardDebt: '0',
            isPaused: false,
        },
    });

    // Mirror the 4 packages defined in YieldStaking constructor
    const packagesData = [
        { packageId: 0, lockPeriod: 90 * 86400,  apy: 2000 },
        { packageId: 1, lockPeriod: 180 * 86400, apy: 2500 },
        { packageId: 2, lockPeriod: 270 * 86400, apy: 3500 },
        { packageId: 3, lockPeriod: 360 * 86400, apy: 5000 },
    ];

    for (const pkg of packagesData) {
        await prisma.stakingPackage.upsert({
            where: {
                contractId_packageId: {
                    contractId: stakingContract.id,
                    packageId: pkg.packageId,
                },
            },
            update: { lockPeriod: pkg.lockPeriod, apy: pkg.apy, isEnabled: true },
            create: {
                contractId: stakingContract.id,
                packageId: pkg.packageId,
                lockPeriod: pkg.lockPeriod,
                apy: pkg.apy,
                isEnabled: true,
                totalStaked: '0',
                maxTotalStaked: '0',
                stakersCount: 0,
            },
        });
    }

    const hashedPassword = await bcrypt.hash('123', 12);

    const usersData = [
        {
            email: 'admin@yieldstaking.com',
            name: 'Platform Admin',
            role: 'ADMIN' as const,
            walletAddress: '0x237Dee4c976E3c4861fE6a99fBa1D60f0E72F464',
        },
        {
            email: 'user1@yieldstaking.com',
            name: 'User One',
            role: 'USER' as const,
            walletAddress: '0x8fC341361fD05D8D93D69745FD6FeCeE6927Bc27',
        },
        {
            email: 'user2@yieldstaking.com',
            name: 'User Two',
            role: 'USER' as const,
            walletAddress: '0x16C750389a585545cd7D52Feba7640cFD7c77Ef7',
        },
    ];

    for (const userData of usersData) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                email: userData.email,
                password: hashedPassword,
                name: userData.name,
                authMethod: 'EMAIL_PASSWORD',
                role: userData.role,
                status: 'ACTIVE',
                emailVerified: true,
                emailVerifiedAt: new Date(),
            },
        });

        await prisma.userWallet.upsert({
            where: { walletAddress: userData.walletAddress.toLowerCase() },
            update: {},
            create: {
                userId: user.id,
                chainId: sepolia.id,
                walletAddress: userData.walletAddress.toLowerCase(),
                isVerified: true,
                isPrimary: true,
                verifiedAt: new Date(),
                walletType: 'MetaMask',
            },
        });
    }

    console.log('\nSeed completed!');
    console.log('Chain: Sepolia (11155111)');
    console.log(`Contract: ${contractAddress}`);
    console.log(`USDT: ${usdtAddress}`);
    console.log(`AUREUS: ${aureusAddress}`);
    console.log('\nCredentials:');
    console.log('  admin@yieldstaking.com / 123  ->  ' + usersData[0].walletAddress);
    console.log('  user1@yieldstaking.com / 123  ->  ' + usersData[1].walletAddress);
    console.log('  user2@yieldstaking.com / 123  ->  ' + usersData[2].walletAddress);
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
