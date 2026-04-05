import {
    Controller,
    Get,
    Param,
    Query,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
} from "@nestjs/swagger";

import { GetTransactionsDto } from "./dto/transaction.dto";
import { TransactionService } from "./transaction.service";
import { StakingService } from "../staking/staking.service";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { AuthenticatedRequest } from "../../auth/interface/authenticated-request.interface";

@ApiTags("Transactions")
@Controller("transactions")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("access-token")
export class TransactionController {
    constructor(
        private readonly transactionService: TransactionService,
        private readonly stakingService: StakingService,
    ) {}

    @Get()
    @ApiOperation({ summary: "Get transactions for authenticated user" })
    @ApiResponse({
        status: 200,
        description: "Transactions retrieved successfully",
    })
    async getMyTransactions(
        @Request() req: AuthenticatedRequest,
        @Query() query: GetTransactionsDto,
    ) {
        let walletAddress = query.walletAddress;

        if (!walletAddress) {
            const wallet = await this.transactionService.getUserPrimaryWallet(
                req.user.id,
            );
            if (wallet) {
                walletAddress = wallet.walletAddress;
            }
        }

        if (!walletAddress) {
            return {
                transactions: [],
                total: 0,
                page: query.page || 1,
                limit: query.limit || 10,
                totalPages: 0,
            };
        }

        return this.transactionService.getTransactions(
            walletAddress,
            query,
        );
    }

    @Get("summary")
    @ApiOperation({ summary: "Get transaction summary for authenticated user" })
    @ApiResponse({ status: 200, description: "Summary retrieved successfully" })
    @ApiQuery({ name: "walletAddress", required: false, type: String })
    async getMySummary(@Request() req: AuthenticatedRequest, @Query("walletAddress") walletAddress?: string) {
        let effectiveWalletAddress = walletAddress;

        if (!effectiveWalletAddress) {
            const wallet = await this.transactionService.getUserPrimaryWallet(
                req.user.id,
            );
            if (wallet) {
                effectiveWalletAddress = wallet.walletAddress;
            }
        }

        if (!effectiveWalletAddress) {
            return {
                totalStaked: "0",
                totalClaimed: "0",
                totalWithdrawn: "0",
                transactionCount: 0,
                pendingTransactions: 0,
                recentTransactions: [],
            };
        }

        return this.transactionService.getTransactionSummary(
            effectiveWalletAddress,
        );
    }

    @Get("rewards")
    @ApiOperation({ summary: "Get reward history for authenticated user" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "walletAddress", required: false, type: String })
    @ApiResponse({
        status: 200,
        description: "Reward history retrieved successfully",
    })
    async getMyRewardHistory(
        @Request() req: AuthenticatedRequest,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("walletAddress") walletAddress?: string,
    ) {
        let effectiveWalletAddress = walletAddress;

        if (!effectiveWalletAddress) {
            const wallet = await this.transactionService.getUserPrimaryWallet(
                req.user.id,
            );
            if (wallet) {
                effectiveWalletAddress = wallet.walletAddress;
            }
        }

        if (!effectiveWalletAddress) {
            return {
                rewards: [],
                total: 0,
                page: page || 1,
                limit: limit || 10,
                totalPages: 0,
            };
        }

        return this.transactionService.getRewardHistory(
            effectiveWalletAddress,
            page || 1,
            limit || 10,
        );
    }

    @Get("rewards/summary")
    @ApiOperation({ summary: "Get reward summary for authenticated user" })
    @ApiQuery({ name: "walletAddress", required: false, type: String })
    @ApiResponse({
        status: 200,
        description: "Reward summary retrieved successfully",
    })
    async getMyRewardSummary(@Request() req: AuthenticatedRequest, @Query("walletAddress") walletAddress?: string) {
        let effectiveWalletAddress = walletAddress;

        if (!effectiveWalletAddress) {
            const wallet = await this.transactionService.getUserPrimaryWallet(
                req.user.id,
            );
            if (wallet) {
                effectiveWalletAddress = wallet.walletAddress;
            }
        }

        if (!effectiveWalletAddress) {
            return {
                totalRewardEarned: "0",
                totalRewardClaimed: "0",
                pendingRewards: "0",
            };
        }

        const summary = await this.stakingService.getStakePositionsSummary(
            effectiveWalletAddress,
        );

        return {
            totalRewardEarned: summary.totalRewardEarned,
            totalRewardClaimed: summary.totalRewardClaimed,
            pendingRewards: summary.totalPendingReward,
        };
    }

    @Get(":txHash")
    @ApiOperation({ summary: "Get transaction by hash" })
    @ApiResponse({
        status: 200,
        description: "Transaction retrieved successfully",
    })
    async getTransactionByHash(@Param("txHash") txHash: string) {
        return this.transactionService.getTransactionByTxHash(txHash);
    }
}
