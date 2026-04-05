import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { Link } from 'react-router-dom';
import {
    History,
    Layers,
    TrendingUp,
    Wallet,
    CheckCircle2,
    ChevronRight,
    Loader2,
} from 'lucide-react';

import { CompletedStakesTable, type CompletedStakeItem } from '@/components/tables';
import { useStakingPositionsView } from '@/hooks';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { hasAccountAuth } from '@/lib/auth/auth';
import { cn } from '@/lib/utils';

/* ── Stat card ── */
function StatCard({
    icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    accent?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5">
            <div className={cn('mb-3 inline-flex w-fit rounded-xl p-2.5', accent ?? 'bg-primary/10 text-primary')}>
                {icon}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/5 blur-2xl" />
        </div>
    );
}

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
                .filter((p) => p.withdrawn)
                .map((p) => ({
                    id: p.id,
                    packageId: p.packageId,
                    stakeId: p.stakeId,
                    lockPeriod: p.lockPeriodLabel,
                    startDate: p.startDateLabel,
                    apy: p.apy,
                    stakedAmount: p.principalRaw.toString(),
                    totalRewards: p.rewardTotalRaw.toString(),
                    unlockDate: p.unlockDateLabel,
                    withdrawDate: p.lastClaimLabel,
                    stakeDecimals: p.stakeTokenDecimals,
                    rewardDecimals: p.rewardTokenDecimals,
                    stakeSymbol: p.stakeSymbol,
                    rewardSymbol: p.rewardSymbol,
                })),
        [positions],
    );

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

    /* ── derived stats ── */
    const stakeSymbol = metadata.stakeSymbol || 'TOKEN';
    const rewardSymbol = metadata.rewardSymbol || 'USDT';

    const totalPrincipalRaw = useMemo(
        () => positions.filter((p) => p.withdrawn).reduce((s, p) => s + p.principalRaw, 0n),
        [positions],
    );
    const totalRewardsRaw = useMemo(
        () => positions.filter((p) => p.withdrawn).reduce((s, p) => s + p.rewardTotalRaw, 0n),
        [positions],
    );
    const avgApy = useMemo(() => {
        const withdrawn = positions.filter((p) => p.withdrawn);
        if (!withdrawn.length) return 0;
        return withdrawn.reduce((s, p) => s + p.apy, 0) / withdrawn.length;
    }, [positions]);

    const fmtBigInt = (raw: bigint, decimals: number, maxDec = 2) =>
        (Number(raw) / Math.pow(10, decimals)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: maxDec,
        });

    const stakeDecimals = positions[0]?.stakeTokenDecimals ?? 18;
    const rewardDecimals = positions[0]?.rewardTokenDecimals ?? 6;

    /* ── unauthenticated ── */
    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center space-y-4">
                    <div className="mx-auto w-fit rounded-full bg-muted p-4">
                        <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-xl font-bold">Sign in required</h1>
                    <p className="text-sm text-muted-foreground">
                        Please connect your wallet to view your staking history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col px-4 py-6 lg:px-8 gap-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stake History</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Completed &amp; withdrawn staking positions
                    </p>
                </div>
                <Link
                    to="/app/reward-history"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
                >
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    Reward History
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex flex-1 items-center justify-center gap-3 py-24 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading history…</span>
                </div>
            )}

            {/* ── Error ── */}
            {isError && (
                <div className="flex flex-1 items-center justify-center py-24">
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-5 text-center">
                        <p className="text-sm font-medium text-destructive">Failed to load stake history</p>
                        <p className="text-xs text-muted-foreground mt-1">Please refresh the page to try again.</p>
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            {!isLoading && !isError && (
                <>
                    {/* Stat cards — only when there is data */}
                    {tableData.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatCard
                                icon={<CheckCircle2 className="h-4 w-4" />}
                                label="Completed Stakes"
                                value={String(tableData.length)}
                                accent="bg-emerald-500/10 text-emerald-400"
                            />
                            <StatCard
                                icon={<Wallet className="h-4 w-4" />}
                                label="Total Principal"
                                value={fmtBigInt(totalPrincipalRaw, stakeDecimals, 2)}
                                sub={stakeSymbol}
                                accent="bg-blue-500/10 text-blue-400"
                            />
                            <StatCard
                                icon={<TrendingUp className="h-4 w-4" />}
                                label="Total Rewards"
                                value={fmtBigInt(totalRewardsRaw, rewardDecimals, 4)}
                                sub={rewardSymbol}
                                accent="bg-amber-500/10 text-amber-400"
                            />
                            <StatCard
                                icon={<Layers className="h-4 w-4" />}
                                label="Avg APY"
                                value={`${(avgApy / 100).toFixed(0)}%`}
                                accent="bg-violet-500/10 text-violet-400"
                            />
                        </div>
                    )}

                    {/* Empty state */}
                    {tableData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-card py-20 text-center">
                            <div className="rounded-full bg-muted/40 p-5">
                                <History className="h-9 w-9 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-semibold">No completed stakes yet</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Withdrawn positions will appear here after you complete a stake.
                                </p>
                            </div>
                            <Link
                                to="/app/stake"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                            >
                                Start Staking
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        /* Table */
                        <div className="rounded-2xl border bg-card overflow-hidden">
                            <div className="flex items-center justify-between border-b px-5 py-3.5">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <History className="h-4 w-4 text-muted-foreground" />
                                    Withdrawn Positions
                                </span>
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                    {tableData.length} {tableData.length === 1 ? 'position' : 'positions'}
                                </span>
                            </div>
                            <CompletedStakesTable
                                data={tableData}
                                explorerUrl={explorerUrl}
                                contractAddress={metadata.contractAddress}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
