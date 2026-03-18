import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { ArrowDownToLine, Clock, Loader2, Unlock, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WalletDisplay } from '@/components/wallet';
import { StakedPackagesTable, type StakedPackageItem } from '@/components/tables';
import { useYieldStaking } from '@/hooks/use-yield-staking';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { fetchMyPositions } from '@/lib/api/staking';
import { hasAccountAuth } from '@/lib/auth/auth';

const DEFAULT_STAKE_DECIMALS = 18;
const DEFAULT_REWARD_DECIMALS = 18;

function formatDate(timestamp: bigint): string {
    if (timestamp === BigInt(0)) return '-';
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatLockPeriod(seconds: bigint): string {
    const days = Number(seconds) / 86400;
    if (days >= 365) return `${Math.floor(days / 365)} Year`;
    if (days >= 30) return `${Math.floor(days / 30)} Months`;
    return `${Math.floor(days)} Days`;
}

function isUnlocked(unlockTimestamp: bigint): boolean {
    return Date.now() / 1000 >= Number(unlockTimestamp);
}

function getTimeRemaining(unlockTimestamp: bigint): string {
    const now = Date.now() / 1000;
    const remaining = Number(unlockTimestamp) - now;
    if (remaining <= 0) return 'Ready';
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
}

export default function WithdrawalsPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const [selectedStake, setSelectedStake] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'claim' | 'withdraw' | null>(null);
    const isAuthenticated = hasAccountAuth();

    const {
        tokenDecimals,
        tokenSymbol,
        rewardTokenDecimals,
        rewardSymbol,
        stakingAddress,
        claim,
        withdraw,
        isWritePending,
        isConfirming,
        isConfirmed,
        reset,
        refetchAll,
    } = useYieldStaking();

    const { data: positionsResp } = useQuery({
        queryKey: ['staking', 'my-positions', { page: 1, limit: 200 }],
        queryFn: () => fetchMyPositions({ page: 1, limit: 200 }),
        enabled: isAuthenticated,
        staleTime: 30_000,
    });

    const positions = positionsResp?.positions ?? [];

    const tableData: StakedPackageItem[] = useMemo(
        () =>
            positions
                .filter((p) => !p.isWithdrawn)
                .map((pos) => {
                const stakeTokenDecimals =
                    pos.contract?.stakeTokenDecimals ??
                    stakeTokenDecimalsFromBackend ??
                    tokenDecimals ??
                    DEFAULT_STAKE_DECIMALS;
                const rewardDecimals =
                    pos.contract?.rewardTokenDecimals ??
                    rewardTokenDecimalsFromBackend ??
                    rewardTokenDecimals ??
                    DEFAULT_REWARD_DECIMALS;

                const principal = BigInt(pos.principal || '0');
                const claimable = BigInt(pos.claimableReward || '0');

                const unlockTs = new Date(pos.unlockTimestamp).getTime();
                const unlockTimestamp = BigInt(Math.floor(unlockTs / 1000));

                return {
                    id: `${pos.onChainPackageId}-${pos.onChainStakeId}`,
                    packageId: pos.onChainPackageId,
                    stakeId: pos.onChainStakeId,
                    lockPeriod: formatLockPeriod(BigInt(pos.lockPeriod)),
                    apy: Number(pos.package?.apy ?? 0) / 100,
                    stakedAmount: parseFloat(formatUnits(principal, stakeTokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                    claimable: parseFloat(formatUnits(claimable, rewardDecimals)).toFixed(4),
                    unlockDate: formatDate(unlockTimestamp),
                    timeRemaining: getTimeRemaining(unlockTimestamp),
                    isUnlocked: isUnlocked(unlockTimestamp),
                };
                }),
        [positions, tokenDecimals, rewardTokenDecimals],
    );

    const selected = useMemo(() => {
        if (!selectedStake) return positions[0] || null;
        return (
            positions.find(
                (p) =>
                    `${p.onChainPackageId}-${p.onChainStakeId}` === selectedStake,
            ) || null
        );
    }, [selectedStake, positions]);

    useEffect(() => {
        if (isConfirmed) {
            toast.success(actionType === 'claim' ? 'Rewards claimed!' : 'Withdrawal successful!');
            setProcessingId(null);
            setActionType(null);
            reset();
            refetchAll();
        }
    }, [isConfirmed, actionType, reset, refetchAll]);

    const handleClaim = () => {
        if (!selected) return;
        setProcessingId(`${selected.onChainPackageId}-${selected.onChainStakeId}-claim`);
        setActionType('claim');
        claim(selected.onChainPackageId, selected.onChainStakeId);
    };

    const handleWithdraw = () => {
        if (!selected) return;
        setProcessingId(`${selected.onChainPackageId}-${selected.onChainStakeId}-withdraw`);
        setActionType('withdraw');
        withdraw(selected.onChainPackageId, selected.onChainStakeId);
    };

    const isProcessing = isWritePending || isConfirming;
    const unlocked = selected
        ? new Date(selected.unlockTimestamp).getTime() <= Date.now()
        : false;
    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];
    const stakeSymbolFromBackend = selected?.contract?.stakeTokenSymbol;
    const rewardSymbolFromBackend = selected?.contract?.rewardTokenSymbol;
    const stakeTokenDecimalsFromBackend = selected?.contract?.stakeTokenDecimals;
    const rewardTokenDecimalsFromBackend = selected?.contract?.rewardTokenDecimals;

    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Sign in required</h1>
                    <p className="text-muted-foreground">
                        Please sign in to view and manage your stake positions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Withdraw & Claim</h1>
                <p className="text-muted-foreground">Manage your staked positions and claim rewards</p>
            </div>
            {!isConnected && (
                <div className="mb-6 rounded-2xl bg-card border p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="text-lg font-semibold">Wallet not connected</div>
                            <div className="text-sm text-muted-foreground">
                                You can view your positions from backend history, but claiming/withdrawing requires connecting your wallet to sign transactions.
                            </div>
                        </div>
                        <div className="max-w-xs">
                            <WalletDisplay />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-10">
                <div className="lg:col-span-6">
                    <StakedPackagesTable 
                        data={tableData}
                        selectedId={selectedStake || (positions[0] ? `${positions[0].onChainPackageId}-${positions[0].onChainStakeId}` : null)}
                        onSelect={setSelectedStake}
                        explorerUrl={explorerUrl}
                        contractAddress={stakingAddress}
                        stakeSymbol={stakeSymbolFromBackend || tokenSymbol}
                        rewardSymbol={rewardSymbolFromBackend || rewardSymbol}
                    />
                </div>
                <div className="lg:col-span-4">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            {selected ? (
                                <>
                                    <div className="rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-sm">
                                                    AUR
                                                </div>
                                                <div>
                                                    <div className="font-semibold">
                                                        {formatLockPeriod(BigInt(selected.lockPeriod))} Package
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        APY: <span className="text-primary font-semibold">{Number(selected.package?.apy ?? 0) / 100}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {unlocked ? (
                                                    <span className="inline-flex items-center gap-1 text-green-500 text-sm font-medium">
                                                        <Unlock className="h-4 w-4" />
                                                        Unlocked
                                                    </span>
                                                ) : selected ? (
                                                    <span className="text-sm text-muted-foreground">
                                                        {getTimeRemaining(
                                                            BigInt(
                                                                Math.floor(
                                                                    new Date(
                                                                        selected.unlockTimestamp,
                                                                    ).getTime() /
                                                                        1000,
                                                                ),
                                                            ),
                                                        )}{' '}
                                                        remaining
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Staked Amount</span>
                                                <span className="font-semibold">
                                                    {parseFloat(formatUnits(BigInt(selected.principal || '0'), stakeTokenDecimalsFromBackend ?? tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} {stakeSymbolFromBackend || tokenSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Total Rewards</span>
                                                <span className="font-semibold">
                                                    {parseFloat(formatUnits(BigInt(selected.rewardTotal || '0'), rewardTokenDecimalsFromBackend ?? rewardTokenDecimals)).toFixed(4)} {rewardSymbolFromBackend || rewardSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Claimed</span>
                                                <span className="font-semibold">
                                                    {parseFloat(formatUnits(BigInt(selected.rewardClaimed || '0'), rewardTokenDecimalsFromBackend ?? rewardTokenDecimals)).toFixed(4)} {rewardSymbolFromBackend || rewardSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Claimable Now</span>
                                                <span className="font-semibold text-green-500">
                                                    +{parseFloat(formatUnits(BigInt(selected.claimableReward || '0'), rewardTokenDecimalsFromBackend ?? rewardTokenDecimals)).toFixed(4)} {rewardSymbolFromBackend || rewardSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Unlock Date</span>
                                                <span className="font-semibold">{new Date(selected.unlockTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="h-12"
                                            onClick={handleClaim}
                                            disabled={!isConnected || BigInt(selected.claimableReward || '0') === BigInt(0) || isProcessing}
                                        >
                                            {processingId?.endsWith('-claim') && isProcessing ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <Gift className="mr-2 h-5 w-5" />
                                            )}
                                            Claim Rewards
                                        </Button>
                                        <Button
                                            className="h-12 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white"
                                            onClick={handleWithdraw}
                                            disabled={!isConnected || !unlocked || isProcessing}
                                        >
                                            {processingId?.endsWith('-withdraw') && isProcessing ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <ArrowDownToLine className="mr-2 h-5 w-5" />
                                            )}
                                            Withdraw All
                                        </Button>
                                    </div>

                                    {!unlocked && (
                                        <div className="text-center text-sm text-muted-foreground">
                                            Withdrawal available after unlock date. You can claim rewards anytime.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center text-muted-foreground">
                                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No active stakes found</p>
                                    <p className="text-sm mt-1">Start staking to see your positions here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
