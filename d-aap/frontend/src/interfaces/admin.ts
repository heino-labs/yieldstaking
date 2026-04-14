export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AdminUser {
    id: number;
    email: string | null;
    name: string;
    role: UserRole;
    status: UserStatus;
    authMethod: string;
    createdAt: string;
    wallet: {
        walletAddress: string;
        isPrimary: boolean;
    } | null;
    _count: {
        sessions: number;
    };
}

export interface AdminUsersResponse {
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface StakingContractAdmin {
    id: number;
    chainId: number;
    address: string;
    stakeTokenAddress: string;
    rewardTokenAddress: string;
    stakeTokenSymbol: string;
    rewardTokenSymbol: string;
    stakeTokenDecimals: number;
    rewardTokenDecimals: number;
    minStakeAmount: string;
    maxStakePerUser: string;
    totalLocked: string;
    totalRewardDebt: string;
    isPaused: boolean;
    createdAt: string;
    chain: {
        name: string;
        slug: string;
    };
    packages: {
        id: number;
        packageId: number;
        apy: number;
        lockPeriod: number;
        isEnabled: boolean;
        totalStaked: string;
        stakersCount: number;
    }[];
    _count: {
        stakePositions: number;
    };
}

export interface StakingPackageAdmin {
    id: number;
    contractId: number;
    packageId: number;
    lockPeriod: number;
    apy: number;
    isEnabled: boolean;
    totalStaked: string;
    stakersCount: number;
    contract: {
        address: string;
        chain: {
            name: string;
        };
    };
    _count: {
        stakePositions: number;
    };
}

export interface StakePositionAdmin {
    id: number;
    onChainStakeId: number;
    onChainPackageId: number;
    principal: string;
    rewardTotal: string;
    rewardClaimed: string;
    lockPeriod: number;
    startTimestamp: string;
    unlockTimestamp: string;
    isWithdrawn: boolean;
    wallet: {
        walletAddress: string;
        user: {
            id: number;
            name: string;
            email: string | null;
        };
    };
    contract: {
        address: string;
        stakeTokenSymbol: string;
        rewardTokenSymbol: string;
        stakeTokenDecimals: number;
        rewardTokenDecimals: number;
    };
    package: {
        packageId: number;
        apy: number;
        lockPeriod: number;
    };
}

export interface AdminPositionsResponse {
    positions: StakePositionAdmin[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface AdminTransactionAdmin {
    id: number;
    type: string;
    status: string;
    amount: string;
    txHash: string | null;
    blockNumber: string | null;
    createdAt: string;
    confirmedAt: string | null;
    explorerUrl: string | null;
    wallet: {
        walletAddress: string;
        user: {
            id: number;
            name: string;
            email: string | null;
        };
    };
    chain: {
        name: string;
        explorerUrl: string;
    };
    stakePosition: {
        onChainStakeId: number;
        onChainPackageId: number;
        contract: {
            stakeTokenSymbol: string;
            rewardTokenSymbol: string;
            stakeTokenDecimals: number;
            rewardTokenDecimals: number;
        };
    } | null;
}

export interface AdminTransactionsResponse {
    transactions: AdminTransactionAdmin[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PlatformStatistics {
    users: {
        total: number;
        withWallets: number;
    };
    staking: {
        contracts: number;
        packages: number;
        positions: {
            total: number;
            active: number;
        };
        totalLocked: string;
        totalRewardDebt: string;
        uniqueStakers: number;
    };
    transactions: {
        total: number;
    };
}

export interface BlockchainSyncStatus {
    id: number;
    chainId: number;
    contractAddress: string;
    lastProcessedBlock: string;
    currentBlock: string | null;
    status: string;
    errorMessage: string | null;
    lastSyncAt: string;
    chain: {
        name: string;
    };
}

export interface BlockchainHealth {
    isRunning: boolean;
    providers: Record<number, { connected: boolean }>;
    circuitBreakers: Record<number, { state: string }>;
}
