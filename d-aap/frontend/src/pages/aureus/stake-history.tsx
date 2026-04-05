import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { History } from 'lucide-react';

import { CompletedStakesTable, type CompletedStakeItem } from '@/components/tables';
import { useStakingPositionsView } from '@/hooks';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { hasAccountAuth } from '@/lib/auth/auth';

export default function StakeHistoryPage() {
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const isAuthenticated = hasAccountAuth();
    const { positions, isLoading, isError, metadata } = useStakingPositionsView({
        page: 1,
        limit: 200,
    });

    const tableData: CompletedStakeItem[] = useMemo(
        () =>
            positions
                .filter((position) => position.withdrawn)
                .map((position) => ({
                    id: position.id,
                    packageId: position.packageId,
                    stakeId: position.stakeId,
                    lockPeriod: position.lockPeriodLabel,
                    startDate: position.startDateLabel,
                    apy: position.apy,
                    stakedAmount: position.principalRaw.toString(),
                    totalRewards: position.rewardTotalRaw.toString(),
                    unlockDate: position.unlockDateLabel,
                    withdrawDate: position.lastClaimLabel, // For withdrawn stakes, last claim is usually withdrawal
                    stakeDecimals: position.stakeTokenDecimals,
                    rewardDecimals: position.rewardTokenDecimals,
                    stakeSymbol: position.stakeSymbol,
                    rewardSymbol: position.rewardSymbol,
                })),
        [positions],
    );

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Sign in required</h1>
                    <p className="text-muted-foreground">
                        Please sign in to view your staking history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Stake History</h1>
                <p className="text-muted-foreground">View your completed and withdrawn staking packages</p>
            </div>
            {isLoading && (
                <div className="flex flex-1 items-center justify-center py-20">
                    <div className="text-muted-foreground">Loading history...</div>
                </div>
            )}
            {isError && (
                <div className="flex flex-1 items-center justify-center py-20">
                    <div className="text-destructive">Failed to load stake history</div>
                </div>
            )}
            {!isLoading && !isError && (
                <div className="space-y-6">
                    {tableData.length === 0 ? (
                        <div className="rounded-2xl border bg-card p-12 text-center">
                            <History className="mx-auto mb-4 h-12 w-12 opacity-20" />
                            <h3 className="text-lg font-medium">No history yet</h3>
                            <p className="text-muted-foreground">
                                Your completed staking packages will appear here once you withdraw them.
                            </p>
                        </div>
                    ) : (
                        <CompletedStakesTable
                            data={tableData}
                            explorerUrl={explorerUrl}
                            contractAddress={metadata.contractAddress}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
