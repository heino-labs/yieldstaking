import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import {
    ArrowDownToLine,
    Clock,
    Gift,
    Loader2,
    Unlock,
    Lock,
    TrendingUp,
    Wallet,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { StakedPackagesTable, type StakedPackageItem } from '@/components/tables';
import { useStakingPositionsView } from '@/hooks';
import { useStakeWriter } from '@/hooks/use-yield-staking';
import { formatTokenAmount, formatTokenAmountWithFloor } from '@/lib/utils/format';
import { hasAccountAuth } from '@/lib/auth/auth';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { cn } from '@/lib/utils';

/* ── Small stat tile ── */
function InfoRow({
    label,
    value,
    valueClass,
}: {
    label: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', valueClass)}>{value}</span>
        </div>
    );
}

/* ── Status pill ── */
function StatusPill({ unlocked, timeRemaining }: { unlocked: boolean; timeRemaining: string }) {
    if (unlocked) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Unlock className="h-3.5 w-3.5" />
                Unlocked
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            <Lock className="h-3.5 w-3.5" />
            {timeRemaining}
        </span>
    );
}

export default function WithdrawalsPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const [selectedStake, setSelectedStake] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'claim' | 'withdraw' | null>(null);
    const isAuthenticated = hasAccountAuth();
    const queryClient = useQueryClient();

    const { claim, withdraw, isWritePending, isConfirming, isConfirmed, reset } = useStakeWriter();
    const {
        activePositions,
        metadata,
        isLoading,
        isError,
        error,
        refetch,
    } = useStakingPositionsView({ page: 1, limit: 200 });

    const tableData: StakedPackageItem[] = useMemo(
        () =>
            activePositions.map((position) => ({
                id: position.id,
                packageId: position.packageId,
                stakeId: position.stakeId,
                lockPeriod: position.lockPeriodLabel,
                startDate: position.startDateLabel,
                apy: position.apy,
                stakedAmount: position.principalRaw.toString(),
                claimable: position.claimableRewardRaw.toString(),
                unlockDate: position.unlockDateLabel,
                timeRemaining: position.timeRemaining,
                isUnlocked: position.unlocked,
            })),
        [activePositions],
    );

    const selected = useMemo(() => {
        if (!selectedStake) return activePositions[0] || null;
        return activePositions.find((p) => p.id === selectedStake) || null;
    }, [activePositions, selectedStake]);

    useEffect(() => {
        if (isConfirmed) {
            toast.success(actionType === 'claim' ? 'Rewards claimed!' : 'Withdrawal successful!');
            setProcessingId(null);
            setActionType(null);
            reset();
            void queryClient.invalidateQueries({ queryKey: ['staking', 'positions', 'my'] });
        }
    }, [actionType, isConfirmed, queryClient, reset]);

    const handleClaim = async () => {
        if (!selected) return;
        setProcessingId(`${selected.id}-claim`);
        setActionType('claim');
        try {
            await claim(selected.packageId, selected.stakeId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Claim failed');
            reset();
            setProcessingId(null);
            setActionType(null);
        }
    };

    const handleWithdraw = async () => {
        if (!selected) return;
        setProcessingId(`${selected.id}-withdraw`);
        setActionType('withdraw');
        try {
            await withdraw(selected.packageId, selected.stakeId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Withdraw failed');
            reset();
            setProcessingId(null);
            setActionType(null);
        }
    };

    const isProcessing = isWritePending || isConfirming;
    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];
    const stakeSymbol = selected?.stakeSymbol ?? metadata.stakeSymbol;
    const rewardSymbol = selected?.rewardSymbol ?? metadata.rewardSymbol;

    const claimableDisplay = selected
        ? formatTokenAmountWithFloor(selected.claimableRewardRaw, selected.rewardTokenDecimals, 4)
        : '0';
    const showsTinyClaimable =
        selected !== null && selected.claimableRewardRaw > 0n && claimableDisplay.startsWith('< ');
    const claimableLabel = claimableDisplay.startsWith('< ')
        ? claimableDisplay
        : `+${claimableDisplay}`;
    const positionsErrorMessage =
        error instanceof Error ? error.message : 'Unable to load staking positions right now.';

    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center space-y-4">
                    <div className="mx-auto w-fit rounded-full bg-muted p-4">
                        <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-xl font-bold">Sign in required</h1>
                    <p className="text-sm text-muted-foreground">
                        Please connect your wallet to view and manage your stake positions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col px-4 py-6 lg:px-8 gap-6">
            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Withdraw &amp; Claim</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage your staked positions and collect rewards
                </p>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center gap-3 rounded-2xl border bg-card py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading staking positions…</span>
                </div>
            )}

            {isError && !isLoading && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-destructive">
                                Failed to load staking positions
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {positionsErrorMessage}
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => void refetch()}>
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Main layout ── */}
            {!isLoading && !isError && (
                <div className="grid gap-6 xl:grid-cols-10">
                {/* Left — table */}
                    <div className="min-w-0 xl:col-span-6">
                        <StakedPackagesTable
                            data={tableData}
                            selectedId={selectedStake || activePositions[0]?.id || null}
                            onSelect={setSelectedStake}
                            explorerUrl={explorerUrl}
                            contractAddress={metadata.contractAddress}
                            stakeSymbol={stakeSymbol}
                            rewardSymbol={rewardSymbol}
                            stakeDecimals={
                                selected?.stakeTokenDecimals ??
                                activePositions[0]?.stakeTokenDecimals ??
                                18
                            }
                            rewardDecimals={
                                selected?.rewardTokenDecimals ??
                                activePositions[0]?.rewardTokenDecimals ??
                                6
                            }
                        />
                    </div>

                    {/* Right — action panel */}
                    <div className="min-w-0 xl:col-span-4">
                        <div className="rounded-2xl border bg-card overflow-hidden">
                            {selected ? (
                                <>
                                {/* Position header */}
                                <div className="border-b bg-muted/20 px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-sm font-bold text-black shadow-sm">
                                                {selected.stakeSymbol.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold leading-tight">
                                                    {selected.lockPeriodLabel} Package
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Stake #{selected.stakeId} ·{' '}
                                                    <span className="text-emerald-400 font-medium">
                                                        {selected.apy.toFixed(0)}% APY
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <StatusPill
                                            unlocked={selected.unlocked}
                                            timeRemaining={selected.timeRemaining}
                                        />
                                    </div>
                                </div>

                                {/* Position details */}
                                <div className="px-5 py-4 space-y-0.5">
                                    <InfoRow
                                        label="Staked At"
                                        value={selected.startDateLabel}
                                    />
                                    <InfoRow
                                        label="Unlock Date"
                                        value={selected.unlockDateLabel}
                                    />
                                    <InfoRow
                                        label="Principal"
                                        value={`${formatTokenAmount(selected.principalRaw, selected.stakeTokenDecimals, 2)} ${selected.stakeSymbol}`}
                                    />
                                    <InfoRow
                                        label="Total Rewards"
                                        value={`${formatTokenAmount(selected.rewardTotalRaw, selected.rewardTokenDecimals, 6)} ${selected.rewardSymbol}`}
                                    />
                                    <InfoRow
                                        label="Already Claimed"
                                        value={`${formatTokenAmount(selected.rewardClaimedRaw, selected.rewardTokenDecimals, 6)} ${selected.rewardSymbol}`}
                                    />
                                    <InfoRow
                                        label="Claimable Now"
                                        value={`${claimableLabel} ${selected.rewardSymbol}`}
                                        valueClass={
                                            selected.claimableRewardRaw > 0n
                                                ? 'text-emerald-400'
                                                : undefined
                                        }
                                    />
                                </div>

                                {/* Claimable highlight */}
                                {selected.claimableRewardRaw > 0n && (
                                    <div className="mx-5 mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                                                <span className="text-sm font-medium text-emerald-400">
                                                    Ready to claim
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-400 tabular-nums">
                                                {claimableLabel} {selected.rewardSymbol}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="px-5 pb-5 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="h-11 gap-2"
                                            onClick={() => void handleClaim()}
                                            disabled={
                                                !isConnected ||
                                                selected.claimableRewardRaw === 0n ||
                                                isProcessing
                                            }
                                        >
                                            {processingId?.endsWith('-claim') && isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Gift className="h-4 w-4" />
                                            )}
                                            <span className="font-semibold">Claim</span>
                                        </Button>
                                        <Button
                                            className={cn(
                                                'h-11 gap-2 font-semibold text-black',
                                                selected.unlocked
                                                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                            onClick={() => void handleWithdraw()}
                                            disabled={!isConnected || !selected.unlocked || isProcessing}
                                        >
                                            {processingId?.endsWith('-withdraw') && isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowDownToLine className="h-4 w-4" />
                                            )}
                                            Withdraw
                                        </Button>
                                    </div>

                                    {/* Helper messages */}
                                    {!selected.unlocked && (
                                        <p className="text-center text-xs text-muted-foreground">
                                            <Lock className="inline h-3 w-3 mr-1 mb-0.5" />
                                            Principal is locked · Rewards can be claimed anytime
                                        </p>
                                    )}
                                    {showsTinyClaimable && (
                                        <p className="text-center text-xs text-muted-foreground">
                                            Rewards accruing — values &lt; 0.0001 display as &lt; 0.0001
                                        </p>
                                    )}
                                </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
                                    <div className="rounded-full bg-muted/40 p-4">
                                        <Clock className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium">No active stakes</p>
                                    <p className="text-sm text-muted-foreground">
                                        Start staking to see your positions here
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 gap-1"
                                        onClick={() => window.location.href = '/app/stake'}
                                    >
                                        Go to Stake
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
