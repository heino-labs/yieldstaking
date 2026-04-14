import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { GetStakePositionsDto } from "./dto";
import { ERR_MESSAGES } from "../../constants/messages.constant";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StakingService {
    private readonly logger = new Logger(StakingService.name);

    constructor(private prisma: PrismaService) {}

    private sumOutstandingRewards(
        positions: Array<{ rewardTotal: string; rewardClaimed: string }>,
    ): bigint {
        return positions.reduce(
            (sum, position) => {
                const outstanding =
                    BigInt(position.rewardTotal || "0") -
                    BigInt(position.rewardClaimed || "0");
                return sum + (outstanding > 0n ? outstanding : 0n);
            },
            BigInt(0),
        );
    }

    async getUserPrimaryWallet(userId: number) {
        return this.prisma.userWallet.findFirst({
            where: { userId, isPrimary: true },
        });
    }

    async getUserWallets(userId: number) {
        return this.prisma.userWallet.findMany({
            where: { userId },
        });
    }

    async getContracts(chainId?: number) {
        return this.prisma.stakingContract.findMany({
            where: chainId ? { chainId } : undefined,
            include: {
                chain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        explorerUrl: true,
                    },
                },
                packages: {
                    where: { isEnabled: true },
                    orderBy: { packageId: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async getContractById(id: number) {
        const contract = await this.prisma.stakingContract.findUnique({
            where: { id },
            include: {
                chain: true,
                packages: {
                    orderBy: { packageId: "asc" },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException(
                ERR_MESSAGES.STAKING.CONTRACT_NOT_FOUND,
            );
        }

        return contract;
    }

    async getContractByAddress(address: string) {
        const contract = await this.prisma.stakingContract.findFirst({
            where: { address: { equals: address, mode: "insensitive" } },
            include: {
                chain: true,
                packages: {
                    orderBy: { packageId: "asc" },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException(
                ERR_MESSAGES.STAKING.CONTRACT_NOT_FOUND,
            );
        }

        return contract;
    }

    async getPackageByContractAndId(contractId: number, packageId: number) {
        const pkg = await this.prisma.stakingPackage.findUnique({
            where: {
                contractId_packageId: {
                    contractId,
                    packageId,
                },
            },
            include: {
                contract: true,
            },
        });

        if (!pkg) {
            throw new NotFoundException(ERR_MESSAGES.STAKING.PACKAGE_NOT_FOUND);
        }

        return pkg;
    }

    async getStakePositions(
        walletAddress: string,
        query: GetStakePositionsDto,
    ) {
        const { page = 1, limit = 10, isWithdrawn, packageId } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.StakePositionWhereInput = {
            wallet: {
                walletAddress: walletAddress.toLowerCase(),
            },
            ...(isWithdrawn !== undefined && { isWithdrawn }),
            ...(packageId !== undefined && { packageId }),
        };

        const [positions, total] = await Promise.all([
            this.prisma.stakePosition.findMany({
                where,
                include: {
                    package: {
                        select: {
                            packageId: true,
                            lockPeriod: true,
                            apy: true,
                        },
                    },
                    contract: {
                        select: {
                            address: true,
                            stakeTokenSymbol: true,
                            rewardTokenSymbol: true,
                            stakeTokenDecimals: true,
                            rewardTokenDecimals: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.stakePosition.count({ where }),
        ]);

        const now = new Date();
        const positionsWithClaimable = positions.map((pos) => {
            const claimableReward = this.calculateClaimableReward(
                pos.principal,
                pos.rewardTotal,
                pos.rewardClaimed,
                pos.startTimestamp,
                pos.unlockTimestamp,
                now,
            );

            return {
                ...pos,
                claimableReward,
                isUnlocked: now >= pos.unlockTimestamp,
                lockPeriodDays: Math.floor(pos.lockPeriod / 86400),
            };
        });

        return {
            positions: positionsWithClaimable,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getStakePositionById(id: number) {
        const position = await this.prisma.stakePosition.findUnique({
            where: { id },
            include: {
                wallet: {
                    select: {
                        walletAddress: true,
                        userId: true,
                    },
                },
                package: true,
                contract: true,
            },
        });

        if (!position) {
            throw new NotFoundException(
                ERR_MESSAGES.STAKING.POSITION_NOT_FOUND,
            );
        }

        const now = new Date();
        const claimableReward = this.calculateClaimableReward(
            position.principal,
            position.rewardTotal,
            position.rewardClaimed,
            position.startTimestamp,
            position.unlockTimestamp,
            now,
        );

        return {
            ...position,
            claimableReward,
            isUnlocked: now >= position.unlockTimestamp,
            lockPeriodDays: Math.floor(position.lockPeriod / 86400),
        };
    }

    async getStakePositionsSummary(walletAddress: string) {
        const normalizedAddress = walletAddress.toLowerCase();

        const positions = await this.prisma.stakePosition.findMany({
            where: {
                wallet: {
                    walletAddress: normalizedAddress,
                },
                isWithdrawn: false,
            },
            orderBy: { unlockTimestamp: "asc" },
        });

        const now = new Date();
        let totalPrincipalStaked = BigInt(0);
        let totalRewardEarned = BigInt(0);
        let totalRewardClaimed = BigInt(0);
        let totalPendingReward = BigInt(0);

        const upcomingUnlocks: {
            positionId: number;
            unlockTimestamp: Date;
            principal: string;
            reward: string;
        }[] = [];

        for (const pos of positions) {
            const principal = BigInt(pos.principal || "0");
            const rewardTotal = BigInt(pos.rewardTotal || "0");
            const rewardClaimed = BigInt(pos.rewardClaimed || "0");
            
            totalPrincipalStaked += principal;
            totalRewardEarned += rewardTotal;
            totalRewardClaimed += rewardClaimed;

            const claimable = this.calculateClaimableReward(
                pos.principal,
                pos.rewardTotal,
                pos.rewardClaimed,
                pos.startTimestamp,
                pos.unlockTimestamp,
                now,
            );
            totalPendingReward += BigInt(claimable);

            if (pos.unlockTimestamp > now) {
                upcomingUnlocks.push({
                    positionId: pos.id,
                    unlockTimestamp: pos.unlockTimestamp,
                    principal: pos.principal,
                    reward: (rewardTotal - rewardClaimed).toString(),
                });
            }
        }

        return {
            totalActiveStakes: positions.length,
            totalPrincipalStaked: totalPrincipalStaked.toString(),
            totalRewardEarned: totalRewardEarned.toString(),
            totalRewardClaimed: totalRewardClaimed.toString(),
            totalPendingReward: totalPendingReward.toString(),
            upcomingUnlocks: upcomingUnlocks.slice(0, 5),
        };
    }

    private calculateClaimableReward(
        principal: string,
        rewardTotal: string,
        rewardClaimed: string,
        startTimestamp: Date,
        unlockTimestamp: Date,
        now: Date,
    ): string {
        const totalReward = BigInt(rewardTotal);
        const claimedReward = BigInt(rewardClaimed);
        const lockPeriod = unlockTimestamp.getTime() - startTimestamp.getTime();

        if (lockPeriod <= 0) {
            return "0";
        }

        const elapsed = Math.min(
            now.getTime() - startTimestamp.getTime(),
            lockPeriod,
        );

        if (elapsed <= 0) {
            return "0";
        }

        const earnedReward =
            (totalReward * BigInt(elapsed)) / BigInt(lockPeriod);
        const claimable =
            earnedReward > claimedReward
                ? earnedReward - claimedReward
                : BigInt(0);

        return claimable.toString();
    }

    async getGlobalStatistics() {
        const [contracts, totalPositions, activePositions, rewardPositions] = await Promise.all([
            this.prisma.stakingContract.findMany({
                select: {
                    totalLocked: true,
                },
            }),
            this.prisma.stakePosition.count(),
            this.prisma.stakePosition.count({
                where: { isWithdrawn: false },
            }),
            this.prisma.stakePosition.findMany({
                where: { isWithdrawn: false },
                select: {
                    rewardTotal: true,
                    rewardClaimed: true,
                },
            }),
        ]);

        let totalLocked = BigInt(0);

        for (const contract of contracts) {
            totalLocked += BigInt(contract.totalLocked);
        }
        const totalRewardDebt = this.sumOutstandingRewards(rewardPositions);

        const uniqueStakers = await this.prisma.stakePosition.groupBy({
            by: ["walletId"],
            where: { isWithdrawn: false },
        });

        return {
            totalLocked: totalLocked.toString(),
            totalRewardDebt: totalRewardDebt.toString(),
            totalPositions,
            activePositions,
            uniqueStakers: uniqueStakers.length,
            contractsCount: contracts.length,
        };
    }

    async getLeaderboard(limit: number = 10, contractAddress?: string) {
        const normalizedContractAddress = contractAddress?.trim().toLowerCase();

        let contractIdFilter: number | undefined;
        if (normalizedContractAddress) {
            const contract = await this.prisma.stakingContract.findFirst({
                where: { address: normalizedContractAddress },
                select: { id: true },
            });
            if (!contract) {
                return [];
            }
            contractIdFilter = contract.id;
        }

        const positions = await this.prisma.stakePosition.findMany({
            where: {
                isWithdrawn: false,
                ...(contractIdFilter ? { contractId: contractIdFilter } : {}),
            },
            select: {
                walletId: true,
                principal: true,
            },
        });

        const leaderboard = new Map<
            number,
            { walletId: number; totalStaked: bigint; activeStakes: number }
        >();

        for (const position of positions) {
            const current = leaderboard.get(position.walletId) || {
                walletId: position.walletId,
                totalStaked: 0n,
                activeStakes: 0,
            };

            current.totalStaked += BigInt(position.principal);
            current.activeStakes += 1;
            leaderboard.set(position.walletId, current);
        }

        const rankedEntries = [...leaderboard.values()]
            .sort((a, b) => {
                if (b.totalStaked > a.totalStaked) return 1;
                if (b.totalStaked < a.totalStaked) return -1;
                return b.activeStakes - a.activeStakes;
            })
            .slice(0, limit);

        const walletIds = rankedEntries.map((entry) => entry.walletId);
        const wallets = await this.prisma.userWallet.findMany({
            where: { id: { in: walletIds } },
            select: {
                id: true,
                walletAddress: true,
            },
        });

        const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet.walletAddress]));

        return rankedEntries.map((entry, index) => ({
            rank: index + 1,
            walletAddress: walletMap.get(entry.walletId) || "Unknown",
            totalStaked: entry.totalStaked.toString(),
            activeStakes: entry.activeStakes,
        }));
    }
}
