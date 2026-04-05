import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { RewardHistoryTable, type RewardHistoryItem } from '@/components/tables';
import { useRewardHistory } from '@/hooks/use-reward-history';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { hasAccountAuth } from '@/lib/auth/auth';
import { useStakingPositionsView } from '@/hooks';
import { Button } from '@/components/ui/button';

export default function RewardHistoryPage() {
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const isAuthenticated = hasAccountAuth();
    const [searchParams] = useSearchParams();
    const positionId = searchParams.get('positionId');

    const { data, isLoading, isError } = useRewardHistory({
        page: 1,
        limit: 200,
    });
    
    const { metadata } = useStakingPositionsView();

    const tableData: RewardHistoryItem[] = useMemo(() => {
        const rewards = (data?.rewards ?? []).map((reward) => ({
            id: reward.id.toString(),
            packageId: reward.packageId ?? 0,
            amount: reward.amount,
            claimedAt: reward.claimedAt || new Date().toISOString(),
            apy: reward.apy ?? 0,
            rewardSymbol: metadata.rewardSymbol,
            rewardDecimals: 6,
            txHash: reward.txHash || undefined,
            positionId: reward.positionId || undefined,
        }));

        if (positionId) {
            return rewards.filter(r => r.positionId === Number(positionId));
        }

        return rewards;
    }, [data, metadata, positionId]);

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

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
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {positionId ? `Reward History for Stake #${positionId}` : 'Reward History'}
                    </h1>
                    <p className="text-muted-foreground">Track your staking rewards and earnings</p>
                </div>
                {positionId && (
                    <Button variant="outline" asChild>
                        <Link to="/app/stake-history">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to History
                        </Link>
                    </Button>
                )}
            </div>
            {isLoading && <div className="text-muted-foreground">Loading...</div>}
            {isError && <div className="text-destructive">Failed to load reward history</div>}
            <RewardHistoryTable
                data={tableData}
                explorerUrl={explorerUrl}
            />
        </div>
    );
}
