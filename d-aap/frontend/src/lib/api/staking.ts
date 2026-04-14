import { api } from './client';
import { handleApiError } from '../utils/api-error-handler';
import { normalizeWalletAddress } from '../utils/wallet-address';

export interface StakingContract {
    id: number;
    chainId: number;
    address: string;
    stakeTokenAddress: string;
    rewardTokenAddress: string;
    stakeTokenSymbol: string;
    rewardTokenSymbol: string;
    stakeTokenDecimals: number;
    rewardTokenDecimals: number;
    totalLocked: string;
    isPaused: boolean;
    chain: {
        id: number;
        name: string;
        slug: string;
        explorerUrl: string;
    };
    packages: StakingPackage[];
}

export interface StakingPackage {
    id: number;
    packageId: number;
    lockPeriod: number;
    apy: number;
    isEnabled: boolean;
    totalStaked: string;
    stakersCount: number;
}

export interface StakePosition {
    id: number;
    onChainStakeId: number;
    onChainPackageId: number;
    principal: string;
    rewardTotal: string;
    rewardClaimed: string;
    claimableReward?: string;
    isUnlocked?: boolean;
    lockPeriodDays?: number;
    lockPeriod: number;
    startTimestamp: string;
    unlockTimestamp: string;
    lastClaimTimestamp?: string | null;
    isWithdrawn: boolean;
    isEmergencyWithdrawn?: boolean;
    stakeTxHash?: string | null;
    withdrawTxHash?: string | null;
    package: StakingPackage;
    contract?: {
        address: string;
        stakeTokenSymbol: string;
        rewardTokenSymbol: string;
        stakeTokenDecimals: number;
        rewardTokenDecimals: number;
    };
}

export interface StakePositionsResponse {
    positions: StakePosition[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface StakingSummary {
    totalActiveStakes: number;
    totalPrincipalStaked: string;
    totalRewardEarned: string;
    totalRewardClaimed: string;
    totalPendingReward: string;
    upcomingUnlocks: {
        positionId: number;
        unlockDate: string;
        principal: string;
    }[];
}

export interface GlobalStatistics {
    totalLocked: string;
    totalRewardDistributed: string;
    uniqueStakers: number;
    activePositions: number;
    contractCount: number;
}

export async function fetchStakingContracts(chainId?: number): Promise<StakingContract[]> {
    try {
        const params = chainId ? { chainId } : undefined;
        return await api.get<StakingContract[]>('/v1/staking/contracts', { params });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch staking contracts',
            showToast: false,
        });
    }
}

export async function fetchStakingContract(id: number): Promise<StakingContract> {
    try {
        return await api.get<StakingContract>(`/v1/staking/contracts/${id}`);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch staking contract',
            showToast: false,
        });
    }
}

export async function fetchMyPositions(params?: {
    page?: number;
    limit?: number;
    walletAddress?: string;
}): Promise<StakePositionsResponse> {
    try {
        const normalizedWalletAddress = normalizeWalletAddress(params?.walletAddress);
        const nextParams = {
            ...params,
            walletAddress: normalizedWalletAddress,
        };

        return await api.get<StakePositionsResponse>('/v1/staking/positions', { params: nextParams });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch stake positions',
            showToast: false,
        });
    }
}

export async function fetchMySummary(walletAddress?: string): Promise<StakingSummary> {
    try {
        const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
        const params = normalizedWalletAddress ? { walletAddress: normalizedWalletAddress } : undefined;
        return await api.get<StakingSummary>('/v1/staking/summary', { params });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch staking summary',
            showToast: false,
        });
    }
}

export async function fetchGlobalStatistics(): Promise<GlobalStatistics> {
    try {
        return await api.get<GlobalStatistics>('/v1/staking/statistics');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch global statistics',
            showToast: false,
        });
    }
}

export async function fetchLeaderboard(params?: {
    limit?: number;
    contractAddress?: string;
}): Promise<{
    rank: number;
    walletAddress: string;
    totalStaked: string;
    activeStakes: number;
}[]> {
    try {
        const requestParams = {
            ...(params?.limit ? { limit: params.limit } : {}),
            ...(params?.contractAddress
                ? { contractAddress: params.contractAddress.toLowerCase() }
                : {}),
        };
        return await api.get('/v1/staking/leaderboard', {
            params: Object.keys(requestParams).length ? requestParams : undefined,
        });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch leaderboard',
            showToast: false,
        });
    }
}
