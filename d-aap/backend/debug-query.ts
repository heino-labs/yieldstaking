import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetWallet = '0xeEf28E4C0db920aB5b21ba256fD02F46f7Ed2993'.toLowerCase();
    
    console.log('--- DEBUGGING PRISMA QUERY ---');
    console.log(`Target Wallet Address: ${targetWallet}`);

    // 1. Kiểm tra ví trong database
    const wallet = await prisma.userWallet.findUnique({
        where: { walletAddress: targetWallet },
        include: { user: true }
    });

    if (!wallet) {
        console.log('❌ KHÔNG TÌM THẤY VÍ TRONG DATABASE!');
        return;
    }

    console.log('✅ Tìm thấy ví:');
    console.log(`   - Wallet ID: ${wallet.id}`);
    console.log(`   - User ID: ${wallet.userId}`);
    console.log(`   - isPrimary: ${wallet.isPrimary}`);
    console.log(`   - User Email: ${wallet.user.email}`);

    // 1.1. Liệt kê tất cả ví của user này
    console.log('\n1.1. Liệt kê tất cả ví của User ID 2:');
    const userWallets = await prisma.userWallet.findMany({
        where: { userId: wallet.userId }
    });
    userWallets.forEach(w => {
        console.log(`   - ID: ${w.id}, Address: ${w.walletAddress}, isPrimary: ${w.isPrimary}`);
    });

    // 2. Thử truy vấn StakePosition bằng quan hệ wallet (Cách tôi đã viết)
    console.log('\n2. Thử truy vấn bằng quan hệ (wallet: { walletAddress: ... }):');
    try {
        const positions = await prisma.stakePosition.findMany({
            where: {
                wallet: {
                    walletAddress: targetWallet
                }
            }
        });
        console.log(`✅ Thành công! Tìm thấy ${positions.length} vị thế.`);
        if (positions.length > 0) {
            console.log(`   Vị thế đầu tiên ID: ${positions[0].id}, walletId: ${positions[0].walletId}`);
        }
    } catch (error) {
        console.error('❌ Lỗi khi truy vấn bằng quan hệ:', error);
    }

    // 3. Thử truy vấn bằng walletId trực tiếp
    console.log('\n3. Thử truy vấn bằng walletId trực tiếp:');
    const positionsById = await prisma.stakePosition.findMany({
        where: { walletId: wallet.id }
    });
    console.log(`✅ Tìm thấy ${positionsById.length} vị thế.`);

    // 4. Liệt kê tất cả StakePosition hiện có để đối chiếu
    console.log('\n4. Liệt kê tất cả StakePosition trong DB để đối chiếu:');
    const allPositions = await prisma.stakePosition.findMany({
        take: 20,
        orderBy: { id: 'desc' }
    });
    
    allPositions.forEach(p => {
        console.log(`   - ID: ${p.id}, walletId: ${p.walletId}, onChainStakeId: ${p.onChainStakeId}, principal: ${p.principal}`);
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
