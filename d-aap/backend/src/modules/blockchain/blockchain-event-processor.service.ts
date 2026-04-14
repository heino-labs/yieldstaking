import { Injectable, Logger } from "@nestjs/common";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { ethers } from "ethers";
import { randomUUID } from "crypto";

import { normalizeAddress } from "./utils/event-data.util";
import { PrismaService } from "../../prisma/prisma.service";

interface StakedEventData {
    user: string;
    packageId: number;
    stakeId: number;
    amount: string;
    rewardTotal: string;
}

interface ClaimedEventData {
    user: string;
    packageId: number;
    stakeId: number;
    amount: string;
}

interface WithdrawnEventData {
    user: string;
    packageId: number;
    stakeId: number;
    principal: string;
    reward: string;
}

interface EmergencyWithdrawnEventData {
    user: string;
    packageId: number;
    stakeId: number;
    principal: string;
    rewardPaid: string;
    rewardForfeited: string;
}

interface PackageUpdatedEventData {
    id: number;
    lockPeriod: string | number;
    apy: number;
    enabled: boolean;
}

@Injectable()
export class BlockchainEventProcessorService {
    private readonly logger = new Logger(BlockchainEventProcessorService.name);
    private providers: Map<number, ethers.JsonRpcProvider> = new Map();
    private readonly workerId = `be-${process.pid}-${randomUUID().slice(0, 8)}`;
    private readonly maxAttempts = parseInt(
        process.env.BLOCKCHAIN_MAX_ATTEMPTS || "10",
        10,
    );
    private activeProcessingRun:
        | Promise<{ processed: number; failed: number; errors: string[] }>
        | null = null;

    constructor(private prisma: PrismaService) {}

    private toBigInt(value: string | number | bigint | null | undefined): bigint {
        if (typeof value === "bigint") return value;
        if (typeof value === "number") return BigInt(Math.trunc(value));
        const s = String(value ?? "0").trim();
        if (!s) return 0n;
        return BigInt(s);
    }

    private addAmountString(base: string | null | undefined, delta: string): string {
        const result = this.toBigInt(base) + this.toBigInt(delta);
        return result.toString();
    }

    private subAmountString(base: string | null | undefined, delta: string): string {
        const result = this.toBigInt(base) - this.toBigInt(delta);
        // Never allow negatives in counters
        return (result < 0n ? 0n : result).toString();
    }

    async processEvent(eventId: number) {
        const event = await this.prisma.blockchainEvent.findUnique({
            where: { id: eventId },
            include: {
                chain: true,
            },
        });

        if (!event || event.processed) return;

        this.logger.log(`Processing event ${eventId}: ${event.eventName} (tx: ${event.txHash})`);

        try {
            const rawEventData = event.eventData as any;
            const eventData: Record<string, any> = {};
            
            // Normalize event data keys (handle both direct and nested objects)
            if (rawEventData && typeof rawEventData === 'object') {
                Object.keys(rawEventData).forEach(key => {
                    const value = rawEventData[key];
                    eventData[key] = value;
                    // If it's a BigInt string from ethers/viem, it might be in a specific field
                    if (value && typeof value === 'object' && value.type === 'BigNumber') {
                        eventData[key] = value.hex;
                    }
                });
            }

            console.log(`Processing ${event.eventName} with normalized data:`, JSON.stringify(eventData));

            switch (event.eventName) {
                case "Staked":
                    try {
                        await this.processStakedEvent(
                            event.chainId,
                            event.contractAddress,
                            event.txHash,
                            {
                                user: eventData.user || eventData[0],
                                packageId: Number(eventData.packageId ?? eventData[1] ?? 0),
                                stakeId: Number(eventData.stakeId ?? eventData[2] ?? 0),
                                amount: (eventData.amount ?? eventData[3] ?? "0").toString(),
                                rewardTotal: (eventData.rewardTotal ?? eventData[4] ?? "0").toString(),
                            },
                            event.blockTimestamp ?? undefined,
                        );
                    } catch (error) {
                        this.logger.error(`Error processing Staked event ${event.id}:`, error);
                        throw error; // Rethrow to be caught by the outer catch and handled by markRetry
                    }
                    break;

                case "Claimed":
                    try {
                        await this.processClaimedEvent(
                            event.chainId,
                            event.contractAddress,
                            event.txHash,
                            {
                                user: eventData.user || eventData[0],
                                packageId: Number(eventData.packageId ?? eventData[1] ?? 0),
                                stakeId: Number(eventData.stakeId ?? eventData[2] ?? 0),
                                amount: (eventData.amount ?? eventData[3] ?? "0").toString(),
                            },
                        );
                    } catch (error) {
                        this.logger.error(`Error processing Claimed event ${event.id}:`, error);
                        throw error;
                    }
                    break;

                case "Withdrawn":
                    await this.processWithdrawnEvent(
                        event.chainId,
                        event.contractAddress,
                        event.txHash,
                        {
                            user: eventData.user || eventData[0],
                            packageId: Number(eventData.packageId ?? eventData[1] ?? 0),
                            stakeId: Number(eventData.stakeId ?? eventData[2] ?? 0),
                            principal: (eventData.principal ?? eventData[3] ?? "0").toString(),
                            reward: (eventData.reward ?? eventData[4] ?? "0").toString(),
                        },
                    );
                    break;

                case "EmergencyWithdrawn":
                    await this.processEmergencyWithdrawnEvent(
                        event.chainId,
                        event.contractAddress,
                        event.txHash,
                        {
                            user: eventData.user || eventData[0],
                            packageId: Number(eventData.packageId ?? eventData[1] ?? 0),
                            stakeId: Number(eventData.stakeId ?? eventData[2] ?? 0),
                            principal: (eventData.principal ?? eventData[3] ?? "0").toString(),
                            rewardPaid: (eventData.rewardPaid ?? eventData[4] ?? "0").toString(),
                            rewardForfeited: (eventData.rewardForfeited ?? eventData[5] ?? "0").toString(),
                        },
                    );
                    break;

                case "PackageUpdated":
                    await this.processPackageUpdatedEvent(
                        event.chainId,
                        event.contractAddress,
                        eventData as PackageUpdatedEventData,
                    );
                    break;

                case "Paused":
                    await this.processContractPausedEvent(
                        event.chainId,
                        event.contractAddress,
                        true,
                    );
                    break;

                case "Unpaused":
                    await this.processContractPausedEvent(
                        event.chainId,
                        event.contractAddress,
                        false,
                    );
                    break;

                case "MinStakeAmountUpdated":
                    await this.processConfigUpdatedEvent(
                        event.chainId,
                        event.contractAddress,
                        "minStakeAmount",
                        eventData.newAmount?.toString() || eventData[1]?.toString() || "0",
                    );
                    break;

                case "MaxStakePerUserUpdated":
                    await this.processConfigUpdatedEvent(
                        event.chainId,
                        event.contractAddress,
                        "maxStakePerUser",
                        eventData.newMax?.toString() || eventData[1]?.toString() || "0",
                    );
                    break;

                case "MaxTotalStakedPerPackageUpdated":
                    await this.processConfigUpdatedEvent(
                        event.chainId,
                        event.contractAddress,
                        "maxTotalStakedPerPackage",
                        eventData.newMax?.toString() || eventData[1]?.toString() || "0",
                    );
                    break;

                default:
                    this.logger.debug(`Unknown event type: ${event.eventName}`);
            }

            // Mark event as processed
            await this.prisma.blockchainEvent.update({
                where: { id: eventId },
                data: {
                    processed: true,
                    processedAt: new Date(),
                    lockedAt: null,
                    lockedBy: null,
                    attempts: 0,
                    nextAttemptAt: null,
                },
            });
            return;
        } catch (error) {
            this.logger.error(`Error processing event ${eventId}:`, error);
            // We do NOT update the event here, because the worker/controller
            // that calls processEvent will call markRetry which updates the event.
            throw error;
        }
    }

    async processUnprocessedEvents(limit = 100) {
        if (this.activeProcessingRun) {
            return this.activeProcessingRun;
        }

        const run = this.processUnprocessedEventsInternal(limit).finally(() => {
            if (this.activeProcessingRun === run) {
                this.activeProcessingRun = null;
            }
        });

        this.activeProcessingRun = run;
        return run;
    }

    private async processUnprocessedEventsInternal(limit = 100) {
        const claimed = await this.claimEvents(limit);
        if (claimed.length === 0) {
            return { processed: 0, failed: 0, errors: [] as string[] };
        }

        const results = {
            processed: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const event of claimed) {
            try {
                await this.processEvent(event.id);
                results.processed++;
            } catch (error) {
                results.failed++;
                const message = error instanceof Error ? error.message : String(error);
                results.errors.push(`Event ${event.id}: ${message}`);
                await this.markRetry(event.id, message);
            }
        }

        return results;
    }

    private async claimEvents(limit: number): Promise<{ id: number }[]> {
        const now = new Date();
        const lockTimeoutMs = 5 * 60 * 1000;
        const lockExpiry = new Date(now.getTime() - lockTimeoutMs);

        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<{ id: number }[]>`
                SELECT "id"
                FROM "blockchain_events"
                WHERE "processed" = false
                  AND "attempts" < ${this.maxAttempts}
                  AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= ${now})
                  AND ("locked_at" IS NULL OR "locked_at" < ${lockExpiry})
                ORDER BY "block_number" ASC, "log_index" ASC
                FOR UPDATE SKIP LOCKED
                LIMIT ${limit}
            `;

            if (rows.length === 0) return [];

            const ids = rows.map((r) => r.id);
            await tx.blockchainEvent.updateMany({
                where: { id: { in: ids } },
                data: { lockedAt: now, lockedBy: this.workerId },
            });

            return rows;
        });
    }

    private async markRetry(eventId: number, errorMessage: string) {
        const event = await this.prisma.blockchainEvent.findUnique({
            where: { id: eventId },
            select: { attempts: true },
        });
        const attempts = (event?.attempts ?? 0) + 1;
        if (attempts >= this.maxAttempts) {
            await this.prisma.blockchainEvent.update({
                where: { id: eventId },
                data: {
                    attempts,
                    nextAttemptAt: null,
                    lockedAt: null,
                    lockedBy: null,
                    errorMessage,
                },
            });
            this.logger.error(
                `Event ${eventId} reached max attempts (${this.maxAttempts}) and will no longer be retried: ${errorMessage}`,
            );
            return;
        }

        const capped = Math.min(attempts, 10);
        const delayMs = Math.min(1000 * 2 ** capped, 10 * 60 * 1000);
        const nextAttemptAt = new Date(Date.now() + delayMs);

        await this.prisma.blockchainEvent.update({
            where: { id: eventId },
            data: {
                attempts,
                nextAttemptAt,
                lockedAt: null,
                lockedBy: null,
                errorMessage,
            },
        });

        this.logger.warn(`Event ${eventId} retry scheduled in ${Math.round(delayMs / 1000)}s: ${errorMessage}`);
    }

    private async processStakedEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: StakedEventData,
        blockTimestamp?: Date,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);
        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        const packageId = Number(data.packageId);
        const existingPackage = await this.prisma.stakingPackage.findUnique({
            where: {
                contractId_packageId: {
                    contractId: contract.id,
                    packageId,
                },
            },
        });
        const onChainPkg = existingPackage
            ? null
            : await this.fetchOnChainPackage(
                  chainId,
                  normalizedContract,
                  packageId,
              );

        await this.prisma.$transaction(
            async (tx) => {
            const wallet = await this.getOrCreateWalletInTx(
                tx,
                chainId,
                userAddress,
            );

            let pkg = await tx.stakingPackage.findUnique({
                where: {
                    contractId_packageId: {
                        contractId: contract.id,
                        packageId,
                    },
                },
            });

            if (!pkg) {
                if (!onChainPkg) {
                    throw new Error(
                        `Package ${packageId} missing for contract ${normalizedContract}`,
                    );
                }

                pkg = await tx.stakingPackage.upsert({
                    where: {
                        contractId_packageId: {
                            contractId: contract.id,
                            packageId,
                        },
                    },
                    update: {
                        lockPeriod: onChainPkg.lockPeriod,
                        apy: onChainPkg.apy,
                        isEnabled: onChainPkg.enabled,
                    },
                    create: {
                        contractId: contract.id,
                        packageId,
                        lockPeriod: onChainPkg.lockPeriod,
                        apy: onChainPkg.apy,
                        isEnabled: onChainPkg.enabled,
                    },
                });
            }

            const stakeTime = blockTimestamp ?? new Date();
            const unlockTimestamp = new Date(
                stakeTime.getTime() + pkg.lockPeriod * 1000,
            );

            const stakePosition = await tx.stakePosition.upsert({
                where: {
                    walletId_contractId_onChainPackageId_onChainStakeId: {
                        walletId: wallet.id,
                        contractId: contract.id,
                        onChainPackageId: Number(data.packageId),
                        onChainStakeId: Number(data.stakeId),
                    },
                },
                update: {
                    principal: data.amount.toString(),
                    rewardTotal: data.rewardTotal.toString(),
                },
                create: {
                    walletId: wallet.id,
                    contractId: contract.id,
                    packageId: pkg.id,
                    onChainStakeId: Number(data.stakeId),
                    onChainPackageId: Number(data.packageId),
                    principal: data.amount.toString(),
                    rewardTotal: data.rewardTotal.toString(),
                    rewardClaimed: "0",
                    lockPeriod: pkg.lockPeriod,
                    startTimestamp: stakeTime,
                    unlockTimestamp,
                    stakeTxHash: txHash,
                },
            });

            this.logger.debug(`StakePosition ${stakePosition.id} saved (walletId: ${wallet.id}, contractId: ${contract.id}, onChainStakeId: ${data.stakeId})`);

            await tx.transaction.upsert({
                where: { txHash },
                update: {
                    walletId: wallet.id,
                    chainId,
                    stakePositionId: stakePosition.id,
                    type: TransactionType.STAKE,
                    amount: data.amount.toString(),
                    status: TransactionStatus.CONFIRMED,
                    confirmedAt: new Date(),
                },
                create: {
                    walletId: wallet.id,
                    chainId,
                    stakePositionId: stakePosition.id,
                    type: TransactionType.STAKE,
                    status: TransactionStatus.CONFIRMED,
                    amount: data.amount.toString(),
                    txHash,
                    confirmedAt: new Date(),
                },
            });

            const pkgTotals = await tx.stakingPackage.findUnique({
                where: { id: pkg.id },
                select: { totalStaked: true },
            });
            await tx.stakingPackage.update({
                where: { id: pkg.id },
                data: {
                    totalStaked: this.addAmountString(
                        pkgTotals?.totalStaked,
                        data.amount.toString(),
                    ),
                    stakersCount: { increment: 1 },
                },
            });

            const contractTotals = await tx.stakingContract.findUnique({
                where: { id: contract.id },
                select: { totalLocked: true, totalRewardDebt: true },
            });
            await tx.stakingContract.update({
                where: { id: contract.id },
                data: {
                    totalLocked: this.addAmountString(
                        contractTotals?.totalLocked,
                        data.amount.toString(),
                    ),
                    totalRewardDebt: this.addAmountString(
                        contractTotals?.totalRewardDebt,
                        data.rewardTotal.toString(),
                    ),
                },
            });

            await this.updateUserStatisticsInTx(
                tx,
                wallet.userId,
                "stake",
                data.amount.toString(),
            );
            },
            { timeout: 20_000 },
        );

        this.logger.log(
            `Processed Staked event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, amount=${data.amount}`,
        );
    }

    private async processClaimedEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: ClaimedEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        const wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: userAddress },
        });

        if (!wallet) {
            this.logger.warn(
                `Wallet ${userAddress} not found for Claimed event`,
            );
            return;
        }

        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        await this.prisma.$transaction(
            async (tx) => {
            // Update stake position
            const stakePosition = await tx.stakePosition.findUnique({
                where: {
                    walletId_contractId_onChainPackageId_onChainStakeId: {
                        walletId: wallet.id,
                        contractId: contract.id,
                        onChainPackageId: Number(data.packageId),
                        onChainStakeId: Number(data.stakeId),
                    },
                },
            });

            if (stakePosition) {
                await tx.stakePosition.update({
                    where: { id: stakePosition.id },
                    data: {
                        rewardClaimed: {
                            set: (
                                BigInt(stakePosition.rewardClaimed) +
                                BigInt(data.amount)
                            ).toString(),
                        },
                        lastClaimTimestamp: new Date(),
                    },
                });

                // Create transaction record
                await tx.transaction.upsert({
                    where: { txHash },
                    update: {
                        walletId: wallet.id,
                        chainId,
                        stakePositionId: stakePosition.id,
                        type: TransactionType.CLAIM,
                        amount: data.amount.toString(),
                        status: TransactionStatus.CONFIRMED,
                        confirmedAt: new Date(),
                    },
                    create: {
                        walletId: wallet.id,
                        chainId,
                        stakePositionId: stakePosition.id,
                        type: TransactionType.CLAIM,
                        status: TransactionStatus.CONFIRMED,
                        amount: data.amount.toString(),
                        txHash,
                        confirmedAt: new Date(),
                    },
                });

                const contractTotals = await tx.stakingContract.findUnique({
                    where: { id: contract.id },
                    select: { totalRewardDebt: true },
                });
                await tx.stakingContract.update({
                    where: { id: contract.id },
                    data: {
                        totalRewardDebt: this.subAmountString(
                            contractTotals?.totalRewardDebt,
                            data.amount.toString(),
                        ),
                    },
                });

                // Update user statistics
                await this.updateUserStatisticsInTx(
                    tx,
                    wallet.userId,
                    "claim",
                    data.amount.toString(),
                );
            }
            },
            { timeout: 20_000 },
        );

        this.logger.log(
            `Processed Claimed event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, amount=${data.amount}`,
        );
    }

    private async processWithdrawnEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: WithdrawnEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        const wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: userAddress },
        });

        if (!wallet) {
            this.logger.warn(
                `Wallet ${userAddress} not found for Withdrawn event`,
            );
            return;
        }

        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        await this.prisma.$transaction(
            async (tx) => {
            // Update stake position
            const stakePosition = await tx.stakePosition.findUnique({
                where: {
                    walletId_contractId_onChainPackageId_onChainStakeId: {
                        walletId: wallet.id,
                        contractId: contract.id,
                        onChainPackageId: Number(data.packageId),
                        onChainStakeId: Number(data.stakeId),
                    },
                },
            });

            if (stakePosition) {
                await tx.stakePosition.update({
                    where: { id: stakePosition.id },
                    data: {
                        isWithdrawn: true,
                        withdrawTxHash: txHash,
                        rewardClaimed: {
                            set: (
                                BigInt(stakePosition.rewardClaimed) +
                                BigInt(data.reward)
                            ).toString(),
                        },
                    },
                });

                // Create transaction record
                const totalAmount = BigInt(data.principal) + BigInt(data.reward);
                await tx.transaction.upsert({
                    where: { txHash },
                    update: {
                        walletId: wallet.id,
                        chainId,
                        stakePositionId: stakePosition.id,
                        type: TransactionType.WITHDRAW,
                        amount: totalAmount.toString(),
                        metadata: {
                            principal: data.principal.toString(),
                            reward: data.reward.toString(),
                        },
                        status: TransactionStatus.CONFIRMED,
                        confirmedAt: new Date(),
                    },
                    create: {
                        walletId: wallet.id,
                        chainId,
                        stakePositionId: stakePosition.id,
                        type: TransactionType.WITHDRAW,
                        status: TransactionStatus.CONFIRMED,
                        amount: totalAmount.toString(),
                        txHash,
                        confirmedAt: new Date(),
                        metadata: {
                            principal: data.principal.toString(),
                            reward: data.reward.toString(),
                        },
                    },
                });

                const pkgTotals = await tx.stakingPackage.findUnique({
                    where: { id: stakePosition.packageId },
                    select: { totalStaked: true },
                });
                await tx.stakingPackage.update({
                    where: { id: stakePosition.packageId },
                    data: {
                        totalStaked: this.subAmountString(
                            pkgTotals?.totalStaked,
                            data.principal.toString(),
                        ),
                    },
                });

                const contractTotals = await tx.stakingContract.findUnique({
                    where: { id: contract.id },
                    select: { totalLocked: true, totalRewardDebt: true },
                });
                await tx.stakingContract.update({
                    where: { id: contract.id },
                    data: {
                        totalLocked: this.subAmountString(
                            contractTotals?.totalLocked,
                            data.principal.toString(),
                        ),
                        totalRewardDebt: this.subAmountString(
                            contractTotals?.totalRewardDebt,
                            data.reward.toString(),
                        ),
                    },
                });

                // Update user statistics
                await this.updateUserStatisticsInTx(
                    tx,
                    wallet.userId,
                    "withdraw",
                    data.principal.toString(),
                );
                await this.updateUserStatisticsInTx(
                    tx,
                    wallet.userId,
                    "claim",
                    data.reward.toString(),
                );
            }
            },
            { timeout: 20_000 },
        );

        this.logger.log(
            `Processed Withdrawn event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, principal=${data.principal}, reward=${data.reward}`,
        );
    }

    private async processEmergencyWithdrawnEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: EmergencyWithdrawnEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        const wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: userAddress },
        });

        if (!wallet) {
            this.logger.warn(
                `Wallet ${userAddress} not found for EmergencyWithdrawn event`,
            );
            return;
        }

        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        await this.prisma.$transaction(
            async (tx) => {
            // Update stake position
            const stakePosition = await tx.stakePosition.findUnique({
                where: {
                    walletId_contractId_onChainPackageId_onChainStakeId: {
                        walletId: wallet.id,
                        contractId: contract.id,
                        onChainPackageId: Number(data.packageId),
                        onChainStakeId: Number(data.stakeId),
                    },
                },
            });

            if (stakePosition) {
                await tx.stakePosition.update({
                    where: { id: stakePosition.id },
                    data: {
                        isWithdrawn: true,
                        isEmergencyWithdrawn: true,
                        withdrawTxHash: txHash,
                        rewardClaimed: this.subAmountString(
                            stakePosition.rewardTotal,
                            data.rewardForfeited.toString(),
                        ),
                    },
                });

                // Create transaction record
                await tx.transaction.upsert({
                    where: { txHash },
                    update: {
                        walletId: wallet.id,
                        chainId,
                        stakePositionId: stakePosition.id,
                        type: TransactionType.EMERGENCY_WITHDRAW,
                        amount: data.principal.toString(),
                        metadata: {
                            principal: data.principal.toString(),
                            rewardPaid: data.rewardPaid.toString(),
                            rewardForfeited: data.rewardForfeited.toString(),
                        },
                        status: TransactionStatus.CONFIRMED,
                        confirmedAt: new Date(),
                    },
                    create: {
                        walletId: wallet.id,
                        chainId,
                        stakePositionId: stakePosition.id,
                        type: TransactionType.EMERGENCY_WITHDRAW,
                        status: TransactionStatus.CONFIRMED,
                        amount: data.principal.toString(),
                        txHash,
                        confirmedAt: new Date(),
                        metadata: {
                            principal: data.principal.toString(),
                            rewardPaid: data.rewardPaid.toString(),
                            rewardForfeited: data.rewardForfeited.toString(),
                        },
                    },
                });

                const pkgTotals = await tx.stakingPackage.findUnique({
                    where: { id: stakePosition.packageId },
                    select: { totalStaked: true },
                });
                await tx.stakingPackage.update({
                    where: { id: stakePosition.packageId },
                    data: {
                        totalStaked: this.subAmountString(
                            pkgTotals?.totalStaked,
                            data.principal.toString(),
                        ),
                    },
                });

                const contractTotals = await tx.stakingContract.findUnique({
                    where: { id: contract.id },
                    select: { totalLocked: true, totalRewardDebt: true },
                });
                const outstandingReward = this.subAmountString(
                    stakePosition.rewardTotal,
                    stakePosition.rewardClaimed,
                );
                await tx.stakingContract.update({
                    where: { id: contract.id },
                    data: {
                        totalLocked: this.subAmountString(
                            contractTotals?.totalLocked,
                            data.principal.toString(),
                        ),
                        totalRewardDebt: this.subAmountString(
                            contractTotals?.totalRewardDebt,
                            outstandingReward,
                        ),
                    },
                });

                // Update user statistics
                await this.updateUserStatisticsInTx(
                    tx,
                    wallet.userId,
                    "withdraw",
                    data.principal.toString(),
                );
            }
            },
            { timeout: 20_000 },
        );

        this.logger.log(
            `Processed EmergencyWithdrawn event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, principal=${data.principal}, rewardPaid=${data.rewardPaid}, rewardForfeited=${data.rewardForfeited}`,
        );
    }

    private async processPackageUpdatedEvent(
        chainId: number,
        contractAddress: string,
        data: PackageUpdatedEventData,
    ) {
        const normalizedContract = normalizeAddress(contractAddress);

        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        await this.prisma.stakingPackage.upsert({
            where: {
                contractId_packageId: {
                    contractId: contract.id,
                    packageId: Number(data.id),
                },
            },
            update: {
                lockPeriod: Number(data.lockPeriod),
                apy: Number(data.apy),
                isEnabled: data.enabled,
            },
            create: {
                contractId: contract.id,
                packageId: Number(data.id),
                lockPeriod: Number(data.lockPeriod),
                apy: Number(data.apy),
                isEnabled: data.enabled,
            },
        });

        this.logger.log(
            `Processed PackageUpdated event: id=${data.id}, lockPeriod=${data.lockPeriod}, apy=${data.apy}, enabled=${data.enabled}`,
        );
    }

    private async processContractPausedEvent(
        chainId: number,
        contractAddress: string,
        isPaused: boolean,
    ) {
        const normalizedContract = normalizeAddress(contractAddress);

        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        await this.prisma.stakingContract.update({
            where: { id: contract.id },
            data: { isPaused },
        });

        this.logger.log(
            `Processed ${isPaused ? "Paused" : "Unpaused"} event for contract ${normalizedContract}`,
        );
    }

    private async processConfigUpdatedEvent(
        chainId: number,
        contractAddress: string,
        field: "minStakeAmount" | "maxStakePerUser" | "maxTotalStakedPerPackage",
        value: string,
    ) {
        const normalizedContract = normalizeAddress(contractAddress);

        const contract = await this.prisma.stakingContract.findFirst({
            where: {
                chainId,
                address: { equals: normalizedContract, mode: "insensitive" },
            },
        });

        if (!contract) {
            throw new Error(
                `Contract ${normalizedContract} not found for chain ${chainId}`,
            );
        }

        await this.prisma.stakingContract.update({
            where: { id: contract.id },
            data: { [field]: value },
        });

        this.logger.log(
            `Processed ${field} update event for contract ${normalizedContract}: ${value}`,
        );
    }

    private async getOrCreateWalletInTx(
        tx: any,
        chainId: number,
        walletAddress: string,
    ) {
        // Use upsert to avoid race conditions when multiple events for the same wallet
        // are processed concurrently.
        return tx.userWallet.upsert({
            where: { walletAddress },
            update: {},
            create: {
                walletAddress,
                isPrimary: true,
                isVerified: true,
                verifiedAt: new Date(),
                chain: {
                    connect: { id: chainId },
                },
                user: {
                    create: {
                        name: `User_${walletAddress.slice(0, 8)}`,
                        authMethod: "WALLET",
                        role: "USER",
                        status: "ACTIVE",
                    },
                },
            },
        });
    }

    private async getProvider(chainId: number): Promise<ethers.JsonRpcProvider> {
        const cached = this.providers.get(chainId);
        if (cached) return cached;

        const chain = await this.prisma.chain.findUnique({ where: { id: chainId } });
        if (!chain?.rpcUrl) {
            throw new Error(`Missing rpcUrl for chain ${chainId}`);
        }

        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        this.providers.set(chainId, provider);
        return provider;
    }

    private async fetchOnChainPackage(
        chainId: number,
        contractAddress: string,
        packageId: number,
    ): Promise<{ lockPeriod: number; apy: number; enabled: boolean }> {
        const provider = await this.getProvider(chainId);
        const contract = new ethers.Contract(
            contractAddress,
            [
                "function packages(uint256) view returns (uint64 lockPeriod, uint32 apy, bool enabled)",
            ],
            provider,
        );

        const result = await contract.packages(packageId);
        const lockPeriod = Number(result.lockPeriod);
        const apy = Number(result.apy);
        const enabled = Boolean(result.enabled);

        if (!Number.isFinite(lockPeriod) || lockPeriod < 0) {
            throw new Error(`Invalid on-chain lockPeriod for package ${packageId}`);
        }
        if (!Number.isFinite(apy) || apy < 0) {
            throw new Error(`Invalid on-chain apy for package ${packageId}`);
        }

        return { lockPeriod, apy, enabled };
    }

    private async updateUserStatisticsInTx(
        tx: any,
        userId: number,
        action: "stake" | "claim" | "withdraw",
        amount: string,
    ) {
        await tx.userStatistics.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                totalStaked: "0",
                totalClaimed: "0",
                totalWithdrawn: "0",
                activeStakes: 0,
                completedStakes: 0,
                pendingRewards: "0",
            },
        });
        const current = await tx.userStatistics.findUnique({
            where: { userId },
            select: {
                totalStaked: true,
                totalClaimed: true,
                totalWithdrawn: true,
            },
        });

        if (!current) return;

        if (action === "stake") {
            await tx.userStatistics.update({
                where: { userId },
                data: {
                    totalStaked: this.addAmountString(current.totalStaked, amount),
                    activeStakes: { increment: 1 },
                },
            });
            return;
        }

        if (action === "claim") {
            await tx.userStatistics.update({
                where: { userId },
                data: {
                    totalClaimed: this.addAmountString(current.totalClaimed, amount),
                },
            });
            return;
        }

        await tx.userStatistics.update({
            where: { userId },
            data: {
                totalWithdrawn: this.addAmountString(current.totalWithdrawn, amount),
                activeStakes: { decrement: 1 },
                completedStakes: { increment: 1 },
            },
        });
    }
}
