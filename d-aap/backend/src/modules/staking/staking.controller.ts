import {
    Controller,
    Get,
    Param,
    Query,
    Request,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
} from "@nestjs/swagger";

import { GetStakePositionsDto } from "./dto";
import { StakingService } from "./staking.service";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { AuthenticatedRequest } from "../../auth/interface/authenticated-request.interface";

@ApiTags("Staking")
@Controller("staking")
export class StakingController {
    constructor(private readonly stakingService: StakingService) {}

    @Get("contracts")
    @ApiOperation({ summary: "Get all staking contracts" })
    @ApiQuery({ name: "chainId", required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: "Contracts retrieved successfully",
    })
    async getContracts(@Query("chainId") chainId?: number) {
        return this.stakingService.getContracts(chainId);
    }

    @Get("contracts/:id")
    @ApiOperation({ summary: "Get staking contract by ID" })
    @ApiResponse({
        status: 200,
        description: "Contract retrieved successfully",
    })
    async getContractById(@Param("id", ParseIntPipe) id: number) {
        return this.stakingService.getContractById(id);
    }

    @Get("packages")
    @ApiOperation({ summary: "Get all staking packages" })
    @ApiQuery({ name: "contractId", required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: "Packages retrieved successfully",
    })
    async getPackages(@Query("contractId") contractId?: number) {
        return this.stakingService.getPackages(contractId);
    }

    @Get("packages/:id")
    @ApiOperation({ summary: "Get staking package by ID" })
    @ApiResponse({ status: 200, description: "Package retrieved successfully" })
    async getPackageById(@Param("id", ParseIntPipe) id: number) {
        const pkg = await this.stakingService.getPackageById(id);
        return {
            ...pkg,
            lockPeriodDays: Math.floor(pkg.lockPeriod / 86400),
            apyPercentage: `${(pkg.apy / 100).toFixed(2)}%`,
        };
    }

    @Get("statistics")
    @ApiOperation({ summary: "Get global staking statistics" })
    @ApiResponse({
        status: 200,
        description: "Statistics retrieved successfully",
    })
    async getGlobalStatistics() {
        return this.stakingService.getGlobalStatistics();
    }

    @Get("leaderboard")
    @ApiOperation({ summary: "Get staking leaderboard" })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Number of entries (default: 10)",
    })
    @ApiResponse({
        status: 200,
        description: "Leaderboard retrieved successfully",
    })
    async getLeaderboard(@Query("limit") limit?: number) {
        return this.stakingService.getLeaderboard(limit || 10);
    }

    @Get("positions")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Get stake positions for authenticated user" })
    @ApiResponse({
        status: 200,
        description: "Positions retrieved successfully",
    })
    async getMyStakePositions(
        @Request() req: AuthenticatedRequest,
        @Query() query: GetStakePositionsDto,
    ) {
        // Try to get wallet address from query first (for authenticated users viewing a specific wallet)
        // Or default to user's primary wallet
        let walletAddress = query.walletAddress;

        if (!walletAddress) {
            const wallet = await this.stakingService.getUserPrimaryWallet(
                req.user.id,
            );
            if (wallet) {
                walletAddress = wallet.walletAddress;
            }
        }

        if (!walletAddress) {
            return {
                positions: [],
                total: 0,
                page: query.page || 1,
                limit: query.limit || 10,
                totalPages: 0,
            };
        }

        return this.stakingService.getStakePositions(
            walletAddress,
            query,
        );
    }

    @Get("summary")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Get staking summary for authenticated user" })
    @ApiResponse({ status: 200, description: "Summary retrieved successfully" })
    async getMySummary(@Request() req: AuthenticatedRequest, @Query("walletAddress") walletAddress?: string) {
        let effectiveWalletAddress = walletAddress;

        if (!effectiveWalletAddress) {
            const wallet = await this.stakingService.getUserPrimaryWallet(
                req.user.id,
            );
            if (wallet) {
                effectiveWalletAddress = wallet.walletAddress;
            }
        }

        if (!effectiveWalletAddress) {
            return {
                totalActiveStakes: 0,
                totalPrincipalStaked: "0",
                totalRewardEarned: "0",
                totalRewardClaimed: "0",
                totalPendingReward: "0",
                upcomingUnlocks: [],
            };
        }

        return this.stakingService.getStakePositionsSummary(
            effectiveWalletAddress,
        );
    }
}
