export type StakingTransactionType = 'STAKE' | 'CLAIM' | 'WITHDRAW' | 'EMERGENCY_WITHDRAW';
export type StakingTransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface StakingTransaction {
    id: number;
    type: StakingTransactionType;
    status: StakingTransactionStatus;
    amount: string;
    txHash: string | null;
    blockNumber: string | null;
    createdAt: string;
    confirmedAt: string | null;
    explorerUrl: string | null;
    stakePosition: {
        id: number;
        onChainStakeId: number;
        onChainPackageId: number;
    } | null;
    chain: {
        id: number;
        name: string;
        slug: string;
        explorerUrl: string;
    };
}

export interface StakingTransactionListResponse {
    transactions: StakingTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface TransactionSummary {
    totalStaked: string;
    totalClaimed: string;
    totalWithdrawn: string;
    stakeCount: number;
    claimCount: number;
    withdrawCount: number;
}

export interface RewardHistoryItem {
    id: number;
    amount: string;
    txHash: string | null;
    explorerUrl: string | null;
    packageId: number | null;
    positionId: number | null;
    apy: number | null;
    claimedAt: string | null;
}

export interface RewardHistoryResponse {
    rewards: RewardHistoryItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface RewardSummary {
    totalRewardEarned: string;
    totalRewardClaimed: string;
    pendingRewards: string;
}
