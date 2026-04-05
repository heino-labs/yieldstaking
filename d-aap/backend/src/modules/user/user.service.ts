import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    UnauthorizedException,
} from "@nestjs/common";
import { ethers } from "ethers";

import { ERR_MESSAGES } from "../../constants/messages.constant";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private prisma: PrismaService) {}

    async findUserForAuth(where: { email?: string; id?: number }) {
        const user = await this.prisma.user.findFirst({
            where: {
                ...where,
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true,
                status: true,
                wallets: {
                    where: { isPrimary: true },
                    select: {
                        walletAddress: true,
                    },
                    take: 1,
                },
            },
        });

        if (!user) {
            return null;
        }

        return {
            ...user,
            walletAddress: user.wallets[0]?.walletAddress,
        };
    }

    async findById(id: number) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            include: {
                wallets: {
                    where: { isPrimary: true },
                    take: 1,
                },
                statistics: true,
            },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return user;
    }

    async getProfile(userId: number) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                wallets: {
                    where: { isPrimary: true },
                    take: 1,
                    select: {
                        walletAddress: true,
                        chain: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
                statistics: true,
            },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return {
            ...user,
            walletAddress: user.wallets[0]?.walletAddress,
        };
    }

    async updateProfile(
        userId: number,
        data: { name?: string; avatar?: string; bio?: string },
    ) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async getUserStatistics(userId: number) {
        await this.findById(userId);

        let stats = await this.prisma.userStatistics.findUnique({
            where: { userId },
        });

        if (!stats) {
            stats = await this.prisma.userStatistics.create({
                data: {
                    userId,
                    totalStaked: "0",
                    totalClaimed: "0",
                    totalWithdrawn: "0",
                    activeStakes: 0,
                    completedStakes: 0,
                    pendingRewards: "0",
                },
            });
        }

        return stats;
    }

    async getProfileWithStats(userId: number) {
        const [user, stats] = await Promise.all([
            this.getProfile(userId),
            this.getUserStatistics(userId),
        ]);

        const [activeStakesCount, stakePositions] = await Promise.all([
            this.prisma.stakePosition.count({
                where: {
                    wallet: { userId },
                    isWithdrawn: false,
                },
            }),
            this.prisma.stakePosition.findMany({
                where: {
                    wallet: { userId },
                    isWithdrawn: false,
                },
                select: {
                    principal: true,
                    rewardTotal: true,
                    rewardClaimed: true,
                },
            }),
        ]);

        const totalActiveStaked = stakePositions.reduce(
            (sum, pos) => sum + BigInt(pos.principal || "0"),
            BigInt(0),
        );

        const totalPendingRewards = stakePositions.reduce(
            (sum, pos) =>
                sum + (BigInt(pos.rewardTotal || "0") - BigInt(pos.rewardClaimed || "0")),
            BigInt(0),
        );

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                role: user.role,
                walletAddress: user.walletAddress,
                createdAt: user.createdAt,
            },
            stats: {
                totalStaked: stats.totalStaked,
                totalClaimed: stats.totalClaimed,
                totalWithdrawn: stats.totalWithdrawn,
                activeStakes: activeStakesCount,
                completedStakes: stats.completedStakes,
                pendingRewards: totalPendingRewards.toString(),
                currentActiveStaked: totalActiveStaked.toString(),
            },
        };
    }

    async linkWallet(
        userId: number,
        walletAddress: string,
        signature: string,
        message: string,
    ) {
        const normalizedAddress = walletAddress.toLowerCase();

        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                throw new UnauthorizedException(
                    ERR_MESSAGES.AUTH.SIGNATURE_INVALID,
                );
            }
        } catch (error) {
            this.logger.error("Signature verification failed:", error);
            throw new UnauthorizedException(
                ERR_MESSAGES.AUTH.SIGNATURE_INVALID,
            );
        }

        const existingWallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: normalizedAddress },
            include: { user: true },
        });

        // Case 1: Wallet already linked to THIS user
        if (existingWallet && existingWallet.userId === userId) {
            return {
                success: true,
                message: "Wallet is already linked to your account",
                wallet: existingWallet,
            };
        }

        // Case 2: Wallet linked to ANOTHER user
        if (existingWallet && existingWallet.userId !== userId) {
            const otherUser = (existingWallet as any).user;
            
            // If the other user is a wallet-only user, we can merge them
            if (otherUser.authMethod === "WALLET") {
                this.logger.log(`Merging wallet-only user ${otherUser.id} into email user ${userId}`);
                
                // Start a transaction to merge
                return await this.prisma.$transaction(async (tx) => {
                    // 1. Delete the other user's wallet record (to satisfy uniqueness)
                    await tx.userWallet.delete({
                        where: { id: existingWallet.id }
                    });

                    // 2. Delete any existing wallet for the current user
                    await tx.userWallet.deleteMany({
                        where: { userId }
                    });

                    // 3. Create the new wallet record for the current user
                    const chain = await tx.chain.findFirst({
                        where: { isActive: true },
                    });
                    
                    if (!chain) {
                        throw new BadRequestException(ERR_MESSAGES.AUTH.NO_ACTIVE_CHAIN);
                    }

                    const newWallet = await tx.userWallet.create({
                        data: {
                            userId,
                            chainId: chain.id,
                            walletAddress: normalizedAddress,
                            isPrimary: true,
                            isVerified: true,
                            verifiedAt: new Date(),
                        },
                    });

                    // 4. Transfer any stake positions and transactions from the old wallet to the new wallet
                    // Note: StakePosition and Transaction refer to walletId
                    await (tx as any).stakePosition.updateMany({
                        where: { walletId: existingWallet.id },
                        data: { walletId: newWallet.id }
                    });

                    await (tx as any).transaction.updateMany({
                        where: { walletId: existingWallet.id },
                        data: { walletId: newWallet.id }
                    });

                    // 5. Delete the now-empty other user
                    await tx.user.delete({
                        where: { id: otherUser.id }
                    });

                    return {
                        success: true,
                        message: "Wallet merged and linked successfully",
                        wallet: newWallet,
                    };
                });
            } else {
                // If the other user has an email, we can't merge automatically
                throw new BadRequestException(
                    "This wallet is already linked to another email account.",
                );
            }
        }

        // Case 3: Wallet not linked to anyone yet
        const user = await this.findById(userId);

        const chain = await this.prisma.chain.findFirst({
            where: { isActive: true },
        });

        if (!chain) {
            throw new BadRequestException(ERR_MESSAGES.AUTH.NO_ACTIVE_CHAIN);
        }

        return await this.prisma.$transaction(async (tx) => {
            // Delete any existing wallet for the current user
            await tx.userWallet.deleteMany({
                where: { userId }
            });

            // Create the new wallet record
            const newWallet = await tx.userWallet.create({
                data: {
                    userId,
                    chainId: chain.id,
                    walletAddress: normalizedAddress,
                    isPrimary: true,
                    isVerified: true,
                    verifiedAt: new Date(),
                },
            });

            return {
                success: true,
                message: "Wallet linked successfully",
                wallet: newWallet,
            };
        });
    }

    async getWallet(userId: number) {
        const wallet = await this.prisma.userWallet.findFirst({
            where: { userId },
            include: {
                chain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        explorerUrl: true,
                    },
                },
            },
        });

        return wallet;
    }
}
