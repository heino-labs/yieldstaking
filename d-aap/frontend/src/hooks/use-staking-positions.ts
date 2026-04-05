import { useMemo } from 'react';

import { useMyPositions } from '@/hooks/use-staking';
import { formatTokenAmount } from '@/lib/utils/format';

const DEFAULT_STAKE_DECIMALS = 18;
const DEFAULT_REWARD_DECIMALS = 6;

export interface StakingPositionView {
    id: string;
    packageId: number;
    stakeId: number;
    apy: number;
    principalRaw: bigint;
    rewardTotalRaw: bigint;
    rewardClaimedRaw: bigint;
    claimableRewardRaw: bigint;
    stakeTokenDecimals: number;
    rewardTokenDecimals: number;
    stakeSymbol: string;
    rewardSymbol: string;
    contractAddress?: string;
    lockPeriodLabel: string;
    startDateLabel: string;
    stakedAmount: string;
    totalRewards: string;
    claimedRewards: string;
    pendingRewards: string;
    unlockDateLabel: string;
    lastClaimLabel: string;
    unlockTimestampMs: number;
    unlocked: boolean;
    timeRemaining: string;
    withdrawn: boolean;
    status: 'active' | 'unlocked' | 'completed';
}

function formatDateTime(dateValue?: string | null): string {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatLockPeriod(seconds: number): string {
    const days = seconds / 86400;
    if (days >= 365) {
        const years = Math.floor(days / 365);
        return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    }
    if (days >= 30) {
        const months = Math.floor(days / 30);
        return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
    const wholeDays = Math.floor(days);
    return `${wholeDays} ${wholeDays === 1 ? 'Day' : 'Days'}`;
}

function formatTimeRemaining(unlockTimestampMs: number): string {
    if (!Number.isFinite(unlockTimestampMs)) return '-';

    const remainingMs = unlockTimestampMs - Date.now();
    if (remainingMs <= 0) return 'Ready';

    const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0) return `${days}d ${hours}h`;

    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

export function useStakingPositionsView(
    params: { page?: number; limit?: number } = { page: 1, limit: 200 },
) {
    const query = useMyPositions(params);
    const positions = useMemo<StakingPositionView[]>(() => {
        return (query.data?.positions ?? []).map((position) => {
            const stakeTokenDecimals = position.contract?.stakeTokenDecimals ?? DEFAULT_STAKE_DECIMALS;
            const rewardTokenDecimals =
                position.contract?.rewardTokenDecimals ?? DEFAULT_REWARD_DECIMALS;

            const principalRaw = BigInt(position.principal || '0');
            const rewardTotalRaw = BigInt(position.rewardTotal || '0');
            const rewardClaimedRaw = BigInt(position.rewardClaimed || '0');
            const claimableRewardRaw = BigInt(position.claimableReward || '0');
            const unlockTimestampMs = new Date(position.unlockTimestamp).getTime();
            const unlocked = Number.isFinite(unlockTimestampMs) && unlockTimestampMs <= Date.now();
            const withdrawn = position.isWithdrawn;

            return {
                id: position.id.toString(),
                packageId: position.onChainPackageId,
                stakeId: position.onChainStakeId,
                apy: Number(position.package?.apy ?? 0) / 100,
                principalRaw,
                rewardTotalRaw,
                rewardClaimedRaw,
                claimableRewardRaw,
                stakeTokenDecimals,
                rewardTokenDecimals,
                stakeSymbol: position.contract?.stakeTokenSymbol ?? 'AUR',
                rewardSymbol: position.contract?.rewardTokenSymbol ?? 'USDT',
                contractAddress: position.contract?.address,
                lockPeriodLabel: formatLockPeriod(position.lockPeriod),
                startDateLabel: formatDateTime(position.startTimestamp),
                stakedAmount: formatTokenAmount(principalRaw, stakeTokenDecimals, 2),
                totalRewards: formatTokenAmount(rewardTotalRaw, rewardTokenDecimals, 4),
                claimedRewards: formatTokenAmount(rewardClaimedRaw, rewardTokenDecimals, 4),
                pendingRewards: formatTokenAmount(claimableRewardRaw, rewardTokenDecimals, 4),
                unlockDateLabel: formatDateTime(position.unlockTimestamp),
                lastClaimLabel: formatDateTime(position.lastClaimTimestamp),
                unlockTimestampMs,
                unlocked,
                timeRemaining: formatTimeRemaining(unlockTimestampMs),
                withdrawn,
                status: withdrawn ? 'completed' : unlocked ? 'unlocked' : 'active',
            };
        });
    }, [query.data?.positions]);

    const activePositions = useMemo(
        () => positions.filter((position) => !position.withdrawn),
        [positions],
    );

    const metadata = useMemo(() => {
        const first = positions[0];

        return {
            contractAddress: first?.contractAddress,
            stakeSymbol: first?.stakeSymbol ?? 'AUR',
            rewardSymbol: first?.rewardSymbol ?? 'USDT',
        };
    }, [positions]);

    return {
        ...query,
        positions,
        activePositions,
        metadata,
    };
}
