import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { useSearchParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    ExternalLink,
    TrendingUp,
    Clock,
    Gift,
    Hash,
    Layers,
    CheckCircle2,
    Copy,
} from 'lucide-react';

import { useRewardHistory } from '@/hooks/use-reward-history';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { hasAccountAuth } from '@/lib/auth/auth';
import { useStakingPositionsView } from '@/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatAmount(raw: string, decimals = 6, symbol = 'USDT') {
    const val = Number(raw) / Math.pow(10, decimals);
    return `${val.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
    })} ${symbol}`;
}

function formatAPY(bps: number) {
    return `${(bps / 100).toFixed(2)}%`;
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
}

function shortHash(hash: string, start = 8, end = 6) {
    if (!hash) return '—';
    return `${hash.slice(0, start)}…${hash.slice(-end)}`;
}

function CopyBtn({ text }: { text: string }) {
    const copy = () => navigator.clipboard.writeText(text).catch(() => {});
    return (
        <button
            onClick={copy}
            className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            title="Copy"
        >
            <Copy className="h-3 w-3" />
        </button>
    );
}

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
function StatCard({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5 flex flex-col gap-3">
            <div
                className={cn(
                    'inline-flex w-fit items-center justify-center rounded-xl p-2.5',
                    accent ?? 'bg-primary/10 text-primary',
                )}
            >
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <p className="mt-0.5 text-xl font-bold font-mono">{value}</p>
            </div>
            {/* subtle glow */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
        </div>
    );
}

/* ─────────────────────────────────────────────
   Badge
───────────────────────────────────────────── */
function ApyBadge({ bps }: { bps: number }) {
    const label = formatAPY(bps);
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            {label} APY
        </span>
    );
}

/* ─────────────────────────────────────────────
   Table row
───────────────────────────────────────────── */
interface RewardRow {
    id: number;
    amount: string;
    txHash: string;
    explorerUrl: string;
    packageId: number;
    positionId: number;
    apy: number;
    claimedAt: string;
    rewardSymbol: string;
    rewardDecimals: number;
}

function TableRow({ row, index }: { row: RewardRow; index: number }) {
    const { date, time } = formatDate(row.claimedAt);

    return (
        <tr
            className={cn(
                'group border-b border-border/50 transition-colors hover:bg-muted/30',
                index % 2 === 0 ? 'bg-transparent' : 'bg-muted/5',
            )}
        >
            {/* # */}
            <td className="px-4 py-3 text-center">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-xs font-mono font-medium text-muted-foreground">
                    {row.id}
                </span>
            </td>

            {/* Position */}
            <td className="px-4 py-3">
                <Link
                    to={`/app/stake-history?positionId=${row.positionId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                    <Hash className="h-3 w-3" />
                    Stake #{row.positionId}
                </Link>
            </td>

            {/* Package */}
            <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    <Layers className="h-3 w-3" />
                    Pkg {row.packageId}
                </span>
            </td>

            {/* Amount */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono font-semibold text-sm text-foreground">
                        {formatAmount(row.amount, row.rewardDecimals, row.rewardSymbol)}
                    </span>
                </div>
            </td>

            {/* APY */}
            <td className="px-4 py-3">
                <ApyBadge bps={row.apy} />
            </td>

            {/* Claimed At */}
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{date}</span>
                    <span className="text-xs text-muted-foreground font-mono">{time}</span>
                </div>
            </td>

            {/* TX Hash */}
            <td className="px-4 py-3">
                {row.txHash ? (
                    <div className="flex items-center gap-1">
                        <a
                            href={row.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 font-mono text-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                            title={row.txHash}
                        >
                            <span>{shortHash(row.txHash)}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover/link:text-primary transition-colors" />
                        </a>
                        <CopyBtn text={row.txHash} />
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )}
            </td>
        </tr>
    );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function EmptyState() {
    return (
        <tr>
            <td colSpan={7}>
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="rounded-full bg-muted/40 p-4">
                        <Gift className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No reward claims yet</p>
                    <p className="text-xs text-muted-foreground/60">
                        Your claimed rewards will appear here after each claim transaction.
                    </p>
                </div>
            </td>
        </tr>
    );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function RewardHistoryPage() {
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const isAuthenticated = hasAccountAuth();
    const [searchParams] = useSearchParams();
    const positionId = searchParams.get('positionId');

    const { data, isLoading, isError } = useRewardHistory({ page: 1, limit: 200 });
    const { metadata } = useStakingPositionsView();

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

    const tableData: RewardRow[] = useMemo(() => {
        const rewards = (data?.rewards ?? []).map((r) => ({
            id: r.id,
            amount: r.amount,
            txHash: r.txHash || '',
            explorerUrl: r.explorerUrl || `${explorerUrl}/tx/${r.txHash}`,
            packageId: r.packageId ?? 0,
            positionId: r.positionId ?? 0,
            apy: r.apy ?? 0,
            claimedAt: r.claimedAt || new Date().toISOString(),
            rewardSymbol: metadata.rewardSymbol || 'USDT',
            rewardDecimals: 6,
        }));
        if (positionId) return rewards.filter((r) => String(r.positionId) === positionId);
        return rewards;
    }, [data, metadata, positionId, explorerUrl]);

    /* ── summary stats ── */
    const totalRaw = tableData.reduce((s, r) => s + Number(r.amount), 0);
    const totalFormatted = (totalRaw / 1e6).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });
    const avgApy = tableData.length
        ? tableData.reduce((s, r) => s + r.apy, 0) / tableData.length
        : 0;
    const uniquePositions = new Set(tableData.map((r) => r.positionId)).size;

    /* ── unauthenticated ── */
    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center space-y-4">
                    <div className="mx-auto w-fit rounded-full bg-muted p-4">
                        <Gift className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-xl font-bold">Sign in required</h1>
                    <p className="text-sm text-muted-foreground">
                        Please connect your wallet to view your reward history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-8 gap-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {positionId && (
                            <Button variant="ghost" size="sm" asChild className="-ml-2">
                                <Link to="/app/stake-history">
                                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                                    Back
                                </Link>
                            </Button>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {positionId ? (
                            <>
                                Rewards for{' '}
                                <span className="text-primary">Stake #{positionId}</span>
                            </>
                        ) : (
                            'Claim History'
                        )}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        All claimed staking rewards · on-chain verified
                    </p>
                </div>

                {positionId && (
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/app/stake-history">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            All Reward History
                        </Link>
                    </Button>
                )}
            </div>

            {/* ── Stat cards ── */}
            {!isLoading && !isError && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                        icon={<Gift className="h-4 w-4" />}
                        label="Total Claimed"
                        value={`${totalFormatted} ${metadata.rewardSymbol || 'USDT'}`}
                        accent="bg-emerald-500/10 text-emerald-400"
                    />
                    <StatCard
                        icon={<Hash className="h-4 w-4" />}
                        label="Total Claims"
                        value={String(tableData.length)}
                        accent="bg-blue-500/10 text-blue-400"
                    />
                    <StatCard
                        icon={<TrendingUp className="h-4 w-4" />}
                        label="Avg APY"
                        value={formatAPY(avgApy)}
                        accent="bg-violet-500/10 text-violet-400"
                    />
                    <StatCard
                        icon={<Layers className="h-4 w-4" />}
                        label="Positions"
                        value={String(uniquePositions)}
                        accent="bg-amber-500/10 text-amber-400"
                    />
                </div>
            )}

            {/* ── Table ── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                {/* table header bar */}
                <div className="flex items-center justify-between border-b px-5 py-3.5">
                    <span className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Claim Transactions
                    </span>
                    {tableData.length > 0 && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {tableData.length} {tableData.length === 1 ? 'record' : 'records'}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span className="text-sm">Loading reward history…</span>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <p className="text-sm font-medium text-destructive">Failed to load rewards</p>
                        <p className="text-xs text-muted-foreground">Please try refreshing the page.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-4 py-3 text-center w-12">#</th>
                                    <th className="px-4 py-3 text-left">Position</th>
                                    <th className="px-4 py-3 text-left">Package</th>
                                    <th className="px-4 py-3 text-left">Reward Amount</th>
                                    <th className="px-4 py-3 text-left">APY</th>
                                    <th className="px-4 py-3 text-left">Claimed At</th>
                                    <th className="px-4 py-3 text-left">TX Hash</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    tableData.map((row, i) => (
                                        <TableRow key={row.id} row={row} index={i} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
