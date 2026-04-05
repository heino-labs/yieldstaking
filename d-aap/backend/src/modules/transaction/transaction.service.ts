import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, TransactionType, TransactionStatus } from "@prisma/client";

import { GetTransactionsDto } from "./dto/transaction.dto";
import { ERR_MESSAGES } from "../../constants/messages.constant";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name);

    constructor(private prisma: PrismaService) {}

    async getUserPrimaryWallet(userId: number) {
        return this.prisma.userWallet.findFirst({
            where: { userId, isPrimary: true },
        });
    }

    async getTransactions(walletAddress: string, query: GetTransactionsDto) {
        const { page = 1, limit = 10, type, status } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionWhereInput = {
            wallet: {
                walletAddress: walletAddress.toLowerCase(),
            },
            ...(type && { type }),
            ...(status && { status }),
        };

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                include: {
                    wallet: {
                        select: {
                            walletAddress: true,
                        },
                    },
                    chain: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            explorerUrl: true,
                        },
                    },
                    stakePosition: {
                        select: {
                            id: true,
                            onChainStakeId: true,
                            onChainPackageId: true,
                            principal: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.transaction.count({ where }),
        ]);

        const formattedTransactions = transactions.map((tx) => ({
            id: tx.id,
            walletId: tx.walletId,
            walletAddress: tx.wallet.walletAddress,
            chainId: tx.chainId,
            chainName: tx.chain.name,
            chainSlug: tx.chain.slug,
            stakePositionId: tx.stakePositionId,
            stakePosition: tx.stakePosition,
            type: tx.type,
            status: tx.status,
            amount: tx.amount,
            txHash: tx.txHash,
            explorerUrl:
                tx.txHash && tx.chain.explorerUrl
                    ? `${tx.chain.explorerUrl}/tx/${tx.txHash}`
                    : null,
            blockNumber: tx.blockNumber,
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            errorMessage: tx.errorMessage,
            metadata: tx.metadata,
            createdAt: tx.createdAt,
            confirmedAt: tx.confirmedAt,
        }));

        return {
            transactions: formattedTransactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getTransactionById(id: number) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                wallet: {
                    select: {
                        walletAddress: true,
                        userId: true,
                    },
                },
                chain: true,
                stakePosition: {
                    include: {
                        package: true,
                    },
                },
            },
        });

        if (!transaction) {
            throw new NotFoundException(ERR_MESSAGES.TRANSACTION.NOT_FOUND);
        }

        return {
            ...transaction,
            explorerUrl:
                transaction.txHash && transaction.chain.explorerUrl
                    ? `${transaction.chain.explorerUrl}/tx/${transaction.txHash}`
                    : null,
        };
    }

    async getTransactionByTxHash(txHash: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { txHash },
            include: {
                wallet: {
                    select: {
                        walletAddress: true,
                    },
                },
                chain: true,
                stakePosition: true,
            },
        });

        if (!transaction) {
            throw new NotFoundException(ERR_MESSAGES.TRANSACTION.NOT_FOUND);
        }

        return transaction;
    }

    async getTransactionSummary(walletAddress: string) {
        const normalizedAddress = walletAddress.toLowerCase();

        const [totalCount, pendingCount, typeGroups] = await Promise.all([
            this.prisma.transaction.count({
                where: {
                    wallet: { walletAddress: normalizedAddress },
                    status: TransactionStatus.CONFIRMED,
                },
            }),
            this.prisma.transaction.count({
                where: {
                    wallet: { walletAddress: normalizedAddress },
                    status: TransactionStatus.PENDING,
                },
            }),
            this.prisma.transaction.findMany({
                where: {
                    wallet: { walletAddress: normalizedAddress },
                    status: TransactionStatus.CONFIRMED,
                },
                select: {
                    type: true,
                    amount: true,
                },
            }),
        ]);

        let totalStaked = BigInt(0);
        let totalClaimed = BigInt(0);
        let totalWithdrawn = BigInt(0);

        for (const tx of typeGroups) {
            const amount = BigInt(tx.amount || "0");
            switch (tx.type) {
                case TransactionType.STAKE:
                    totalStaked += amount;
                    break;
                case TransactionType.CLAIM:
                    totalClaimed += amount;
                    break;
                case TransactionType.WITHDRAW:
                case TransactionType.EMERGENCY_WITHDRAW:
                    totalWithdrawn += amount;
                    break;
            }
        }

        const recentTransactions = await this.prisma.transaction.findMany({
            where: {
                wallet: { walletAddress: normalizedAddress },
            },
            include: {
                chain: {
                    select: {
                        name: true,
                        slug: true,
                        explorerUrl: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        });

        return {
            totalStaked: totalStaked.toString(),
            totalClaimed: totalClaimed.toString(),
            totalWithdrawn: totalWithdrawn.toString(),
            transactionCount: totalCount,
            pendingTransactions: pendingCount,
            recentTransactions: recentTransactions.map((tx) => ({
                id: tx.id,
                type: tx.type,
                status: tx.status,
                amount: tx.amount,
                txHash: tx.txHash,
                explorerUrl:
                    tx.txHash && tx.chain.explorerUrl
                        ? `${tx.chain.explorerUrl}/tx/${tx.txHash}`
                        : null,
                createdAt: tx.createdAt,
            })),
        };
    }

    async getRewardHistory(
        walletAddress: string,
        page: number = 1,
        limit: number = 10,
    ) {
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionWhereInput = {
            wallet: {
                walletAddress: walletAddress.toLowerCase(),
            },
            type: TransactionType.CLAIM,
            status: TransactionStatus.CONFIRMED,
        };

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                include: {
                    chain: {
                        select: {
                            name: true,
                            explorerUrl: true,
                        },
                    },
                    stakePosition: {
                        select: {
                            onChainPackageId: true,
                            package: {
                                select: {
                                    lockPeriod: true,
                                    apy: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { confirmedAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            rewards: transactions.map((tx) => ({
                id: tx.id,
                amount: tx.amount,
                txHash: tx.txHash,
                explorerUrl:
                    tx.txHash && tx.chain.explorerUrl
                        ? `${tx.chain.explorerUrl}/tx/${tx.txHash}`
                        : null,
                packageId: tx.stakePosition?.onChainPackageId,
                positionId: tx.stakePositionId,
                apy: tx.stakePosition?.package?.apy,
                claimedAt: tx.confirmedAt,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
