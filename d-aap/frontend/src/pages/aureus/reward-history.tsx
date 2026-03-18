import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import { formatUnits } from 'viem';

import { RewardHistoryTable, type RewardHistoryItem } from '@/components/tables';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { fetchMyPositions } from '@/lib/api/staking';
import { hasAccountAuth } from '@/lib/auth/auth';

const DEFAULT_STAKE_DECIMALS = 18;
const DEFAULT_REWARD_DECIMALS = 18;

function formatDate(dateValue?: string | null): string {
    if (!dateValue) return '-';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatLockPeriod(seconds: number): string {
    const days = seconds / 86400;
    if (days >= 365) return `${Math.floor(days / 365)} Year`;
    if (days >= 30) return `${Math.floor(days / 30)} Months`;
    return `${Math.floor(days)} Days`;
}

function isUnlocked(unlockTimestampIso: string): boolean {
    const unlock = new Date(unlockTimestampIso).getTime();
    return Date.now() >= unlock;
}

export default function RewardHistoryPage() {
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const isAuthenticated = hasAccountAuth();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['staking', 'my-positions', { page: 1, limit: 200 }],
        queryFn: () => fetchMyPositions({ page: 1, limit: 200 }),
        enabled: isAuthenticated,
        staleTime: 30_000,
    });

    const positions = data?.positions ?? [];

    const tableData: RewardHistoryItem[] = useMemo(
        () =>
            positions.map((pos) => {
            const stakeTokenDecimals =
                pos.contract?.stakeTokenDecimals ?? DEFAULT_STAKE_DECIMALS;
            const rewardTokenDecimals =
                pos.contract?.rewardTokenDecimals ?? DEFAULT_REWARD_DECIMALS;

            const principal = BigInt(pos.principal || '0');
            const rewardTotal = BigInt(pos.rewardTotal || '0');
            const rewardClaimed = BigInt(pos.rewardClaimed || '0');
            const claimableReward = BigInt(pos.claimableReward || '0');

            const unlocked = isUnlocked(pos.unlockTimestamp);
            const completed = pos.isWithdrawn;

            return {
                id: `${pos.onChainPackageId}-${pos.onChainStakeId}`,
                packageId: pos.onChainPackageId,
                stakeId: pos.onChainStakeId,
                lockPeriod: formatLockPeriod(pos.lockPeriod),
                apy: Number(pos.package?.apy ?? 0) / 100,
                stakedAmount: parseFloat(formatUnits(principal, stakeTokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                totalRewards: parseFloat(formatUnits(rewardTotal, rewardTokenDecimals)).toFixed(4),
                claimed: parseFloat(formatUnits(rewardClaimed, rewardTokenDecimals)).toFixed(4),
                pending: parseFloat(formatUnits(claimableReward, rewardTokenDecimals)).toFixed(4),
                lastClaim: formatDate(pos.lastClaimTimestamp),
                status: completed ? 'completed' : unlocked ? 'unlocked' : 'active',
            };
            }),
        [positions],
    );

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];
    const stakingAddress = positions[0]?.contract?.address;
    const stakeSymbol = positions[0]?.contract?.stakeTokenSymbol || 'USDT';
    const rewardSymbol = positions[0]?.contract?.rewardTokenSymbol || 'AUR';

    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Sign in required</h1>
                    <p className="text-muted-foreground">
                        Please sign in to view your reward history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Reward History</h1>
                <p className="text-muted-foreground">Track your staking rewards and earnings</p>
            </div>
            {isLoading && (
                <div className="text-muted-foreground">Loading...</div>
            )}
            {isError && (
                <div className="text-destructive">Failed to load reward history</div>
            )}
            <RewardHistoryTable 
                data={tableData} 
                explorerUrl={explorerUrl}
                contractAddress={stakingAddress}
                stakeSymbol={stakeSymbol}
                rewardSymbol={rewardSymbol}
            />
        </div>
    );
}
