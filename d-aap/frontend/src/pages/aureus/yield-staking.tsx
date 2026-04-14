import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import {
    Loader2,
    Clock,
    TrendingUp,
    Shield,
    Zap,
    Info,
    AlertTriangle,
    ChevronRight,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseUnits, formatUnits } from 'viem';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeaderboardTable } from '@/components/tables';
import { useYieldStaking } from '@/hooks/use-yield-staking';
import { useLeaderboard } from '@/hooks/use-staking';
import { cn } from '@/lib/utils';

function formatLockPeriod(seconds: bigint): string {
    const days = Number(seconds) / 86400;
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

/* ── Summary row ── */
function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn('text-xs font-semibold tabular-nums', highlight && 'text-emerald-400')}>
                {value}
            </span>
        </div>
    );
}

function PackageCard({
    pkg,
    selected,
    rewardSymbol,
    estimatedReward,
    amount,
    onClick,
}: {
    pkg: { id: number; lockPeriod: bigint; apy: number };
    selected: boolean;
    rewardSymbol: string;
    estimatedReward: string;
    amount: string;
    onClick: () => void;
}) {
    const label = formatLockPeriod(pkg.lockPeriod);
    const apyLabel = `${pkg.apy.toFixed(0)}% APY`;
    const hasAmount = parseFloat(amount) > 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative w-full rounded-xl border p-3.5 text-left transition-all duration-150',
                selected
                    ? 'border-amber-400/60 bg-amber-400/8 ring-1 ring-amber-400/30'
                    : 'border-border bg-muted/10 hover:border-border/80 hover:bg-muted/20',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className={cn('text-sm font-bold', selected ? 'text-amber-400' : 'text-foreground')}>
                        {label}
                    </p>
                    <p className={cn('text-xs mt-0.5', selected ? 'text-amber-400/70' : 'text-muted-foreground')}>
                        {apyLabel}
                    </p>
                </div>
                {selected && (
                    <span className="shrink-0 rounded-full bg-amber-400 p-0.5">
                        <svg className="h-3 w-3 text-black" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                )}
            </div>
            {hasAmount && selected && (
                <p className="mt-2 text-xs font-semibold text-emerald-400">
                    ~ {estimatedReward} {rewardSymbol}
                </p>
            )}
        </button>
    );
}

export default function YieldStakingPage() {
    const { isConnected } = useAccount();
    const [searchParams] = useSearchParams();
    const defaultPackage = parseInt(searchParams.get('package') || '0');

    const [amount, setAmount] = useState('');
    const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
    const [step, setStep] = useState<'input' | 'approve' | 'stake'>('input');

    const {
        isTokenReady,
        packages,
        tokenBalance,
        tokenBalanceRaw,
        tokenAllowance,
        tokenDecimals,
        tokenSymbol,
        rewardSymbol,
        minStakeAmount,
        maxStakePerUser,
        userTotalStakesRaw,
        totalLocked,
        stakingAddress,
        isPaused,
        approve,
        stake,
        isWritePending,
        isConfirming,
        isConfirmed,
        reset,
        refetchAll,
    } = useYieldStaking();

    const { data: leaderboardData } = useLeaderboard({
        limit: 20,
        contractAddress: stakingAddress,
    });

    const leaderboardItems = useMemo(() => {
        if (!leaderboardData) return [];
        return leaderboardData.map((item) => ({
            rank: item.rank,
            address: `${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(-4)}`,
            fullAddress: item.walletAddress,
            staked: Number(formatUnits(BigInt(item.totalStaked), tokenDecimals)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
            activeStakes: item.activeStakes,
        }));
    }, [leaderboardData, tokenDecimals]);

    const displayPackages = packages;
    const highestApy = useMemo(
        () => displayPackages.length > 0 ? Math.max(...displayPackages.map(p => p.apy)) : 0,
        [displayPackages],
    );
    const selectedPkg = useMemo(() => {
        if (!displayPackages.length) return null;
        return displayPackages.find((p) => p.id === selectedPackage) || displayPackages[0];
    }, [displayPackages, selectedPackage]);

    const amountWei = useMemo(() => {
        if (!amount || isNaN(parseFloat(amount))) return 0n;
        try { return parseUnits(amount, tokenDecimals); } catch { return 0n; }
    }, [amount, tokenDecimals]);

    const needsApproval = useMemo(() =>
        amountWei > 0n && tokenAllowance < amountWei,
        [amountWei, tokenAllowance]
    );

    const estimatedReward = useMemo(() => {
        if (!amount || !selectedPkg) return '0.00';
        const principal = parseFloat(amount);
        const apy = selectedPkg.apy / 100;
        const lockDays = Number(selectedPkg.lockPeriod) / 86400;
        return (principal * apy * (lockDays / 365)).toFixed(2);
    }, [amount, selectedPkg]);

    const principalDisplay = useMemo(() => {
        const principal = parseFloat(amount);
        if (!amount || !Number.isFinite(principal) || principal <= 0) return '0';
        return principal.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }, [amount]);

    const availableBalanceDisplay = useMemo(() => {
        const balance = parseFloat(tokenBalance);
        if (!Number.isFinite(balance)) return '0';
        return balance.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }, [tokenBalance]);

    const stakeError = useMemo<string | null>(() => {
        if (!isTokenReady || !amount || parseFloat(amount) <= 0) return null;
        if (amountWei > tokenBalanceRaw) return 'Insufficient balance';
        if (amountWei > 0n && amountWei < parseUnits(minStakeAmount, tokenDecimals))
            return `Minimum stake: ${minStakeAmount} ${tokenSymbol}`;
        const maxPerUser = parseUnits(maxStakePerUser, tokenDecimals);
        if (maxPerUser > 0n && userTotalStakesRaw + amountWei > maxPerUser) {
            const remaining = maxPerUser - userTotalStakesRaw;
            return `Exceeds limit. Can stake up to ${formatUnits(remaining, tokenDecimals)} more ${tokenSymbol}`;
        }
        return null;
    }, [isTokenReady, amount, amountWei, tokenBalanceRaw, minStakeAmount, maxStakePerUser, userTotalStakesRaw, tokenDecimals, tokenSymbol]);

    const canStake = useMemo(
        () =>
            displayPackages.length > 0 &&
            selectedPkg !== null &&
            isTokenReady &&
            !!amount &&
            parseFloat(amount) > 0 &&
            stakeError === null,
        [displayPackages.length, selectedPkg, isTokenReady, amount, stakeError],
    );

    useEffect(() => {
        if (isConfirmed) {
            if (step === 'approve') {
                toast.success('Approval successful!');
                setStep('stake');
                reset();
                refetchAll();
            } else if (step === 'stake') {
                toast.success('Staking successful!');
                setAmount('');
                setStep('input');
                reset();
                refetchAll();
            }
        }
    }, [isConfirmed, step, reset, refetchAll]);

    const handleApprove = async () => {
        setStep('approve');
        try { await approve(); }
        catch (err) {
            toast.error(err instanceof Error ? err.message : 'Approval failed');
            reset(); setStep('input');
        }
    };

    const handleStake = async () => {
        if (!selectedPkg) return;
        setStep('stake');
        try { await stake(amount, selectedPkg.id); }
        catch (err) {
            toast.error(err instanceof Error ? err.message : 'Stake failed');
            reset(); setStep('input');
        }
    };

    const handleAction = () => {
        if (!displayPackages.length) {
            toast.error('Staking packages are not available', {
                description: 'Please refresh the page or try again later.',
            });
            return;
        }
        if (needsApproval) handleApprove();
        else handleStake();
    };

    const isProcessing = isWritePending || isConfirming;
    const packagesReady = displayPackages.length > 0;

    if (!isConnected) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center space-y-5">
                    <div className="mx-auto w-fit rounded-full bg-amber-400/10 p-4">
                        <Shield className="h-8 w-8 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Connect your wallet</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Connect to start earning {rewardSymbol} by staking {tokenSymbol}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-8 gap-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">

                <div className="order-2 space-y-6 xl:order-1">

                    <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h2 className="text-base font-bold text-white">
                                            Aureus Staking Program
                                        </h2>
                                        <Badge
                                            className={isPaused
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                            }
                                        >
                                            {isPaused ? 'Paused' : 'Live'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-400 max-w-md">
                                        Stake{' '}
                                        <span className="text-white font-medium">{tokenSymbol}</span>{' '}
                                        and earn up to{' '}
                                        <span className="text-amber-400 font-bold">{highestApy > 0 ? `${highestApy}%` : '—'} APY</span>{' '}
                                        in <span className="text-white font-medium">{rewardSymbol}</span>.
                                        Rewards accrue linearly and can be claimed anytime.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-white/5 border border-white/8 p-3.5">
                                    <p className="text-xs text-slate-400 mb-1">Total Locked</p>
                                    <p className="text-lg font-bold text-white tabular-nums">
                                        {parseFloat(totalLocked).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-xs text-slate-500">{tokenSymbol}</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/8 p-3.5">
                                    <p className="text-xs text-slate-400 mb-1">Reward Token</p>
                                    <p className="text-lg font-bold text-white">{rewardSymbol}</p>
                                    <p className="text-xs text-slate-500">Paid separately</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/8 p-3.5">
                                    <p className="text-xs text-slate-400 mb-1">Claim Policy</p>
                                    <p className="text-lg font-bold text-white">Anytime</p>
                                    <p className="text-xs text-slate-500">Accrues linearly</p>
                                </div>
                            </div>

                            {/* Status bar */}
                            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-400">Contract status:</span>
                                <span className={cn(
                                    'text-xs font-semibold',
                                    isPaused ? 'text-amber-300' : 'text-emerald-300',
                                )}>
                                    {isPaused ? 'Paused — new deposits blocked' : 'Active — accepting deposits'}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                                <span className="text-xs text-slate-400 shrink-0">Staking contract:</span>
                                <code className="text-xs text-slate-200 truncate max-w-[300px]">
                                    {stakingAddress}
                                </code>
                                <a
                                    href={`https://sepolia.etherscan.io/address/${stakingAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-300 hover:text-white transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div>
                        <div className="mb-3 flex items-end justify-between">
                            <div>
                                <h3 className="font-bold">Top Stakers</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Ranked by currently staked balance
                                </p>
                            </div>
                        </div>
                        <LeaderboardTable data={leaderboardItems} stakeSymbol={tokenSymbol} />
                    </div>
                </div>

                {/* ── Right: Stake form ── */}
                <div className="order-1 xl:order-2 xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-2xl border bg-card overflow-hidden">

                        {/* Form header */}
                        <div className="border-b bg-muted/20 px-5 py-4">
                            <h2 className="font-bold">Stake {tokenSymbol}</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Lock tokens to earn {rewardSymbol} rewards
                            </p>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Warnings */}
                            {!packagesReady && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/20 p-3.5">
                                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                        Staking packages unavailable. The app may not be able to load data from the contract on this network.
                                    </p>
                                </div>
                            )}
                            {isPaused && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3.5">
                                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300/90">
                                        Staking is paused on the contract. New deposits are blocked until the admin unpauses.
                                    </p>
                                </div>
                            )}

                            {/* Amount input */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Amount</label>
                                    <button
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => setAmount(tokenBalance)}
                                        disabled={!packagesReady || isProcessing}
                                    >
                                        Balance:{' '}
                                        <span className="font-semibold text-foreground">
                                            {availableBalanceDisplay} {tokenSymbol}
                                        </span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={cn(
                                            'w-full h-13 px-4 pr-24 rounded-xl border-2 bg-muted/20 text-xl font-bold outline-none transition-all',
                                            'placeholder:text-muted-foreground/40 placeholder:text-base placeholder:font-normal',
                                            stakeError && parseFloat(amount) > 0
                                                ? 'border-destructive/60 focus:border-destructive'
                                                : 'border-border focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10',
                                        )}
                                        disabled={!packagesReady || isProcessing}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <button
                                            className="rounded-lg bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-400 hover:bg-amber-400/20 transition-colors"
                                            onClick={() => setAmount(tokenBalance)}
                                            disabled={!packagesReady || isProcessing}
                                        >
                                            MAX
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black font-bold text-[9px] shadow-sm">
                                                A
                                            </div>
                                            <span className="text-sm font-semibold">{tokenSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                                {stakeError && parseFloat(amount || '0') > 0 && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {stakeError}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Min stake: {parseFloat(minStakeAmount).toLocaleString()} {tokenSymbol}
                                </p>
                            </div>

                            {/* Package selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Lock Period</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {displayPackages.map((pkg) => (
                                        <PackageCard
                                            key={pkg.id}
                                            pkg={pkg}
                                            selected={selectedPackage === pkg.id}
                                            rewardSymbol={rewardSymbol}
                                            estimatedReward={estimatedReward}
                                            amount={amount}
                                            onClick={() => setSelectedPackage(pkg.id)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Estimated reward callout */}
                            {selectedPkg && parseFloat(amount) > 0 && !stakeError && (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                                            <span className="text-sm text-emerald-400 font-medium">
                                                Estimated reward
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-400 tabular-nums">
                                            {estimatedReward} {rewardSymbol}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Over {formatLockPeriod(selectedPkg.lockPeriod)} at{' '}
                                        {selectedPkg.apy.toFixed(0)}% APY
                                    </p>
                                </div>
                            )}

                            {/* CTA */}
                            <Button
                                className={cn(
                                    'w-full h-12 font-bold text-base transition-all',
                                    canStake && !isPaused
                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-muted text-muted-foreground',
                                )}
                                onClick={handleAction}
                                disabled={!canStake || isProcessing || isPaused}
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {step === 'approve' ? 'Approving…' : 'Staking…'}
                                    </span>
                                ) : needsApproval ? (
                                    <span className="flex items-center gap-1.5">
                                        <Zap className="h-4 w-4" />
                                        Approve {tokenSymbol}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <ChevronRight className="h-4 w-4" />
                                        Stake Now
                                    </span>
                                )}
                            </Button>

                            {/* Transaction summary */}
                            <div className="rounded-xl border bg-muted/10 px-4 py-3 space-y-0">
                                <SummaryRow
                                    label="Principal at unlock"
                                    value={`${principalDisplay} ${tokenSymbol}`}
                                />
                                <SummaryRow
                                    label="Estimated reward"
                                    value={`${estimatedReward} ${rewardSymbol}`}
                                    highlight={parseFloat(estimatedReward) > 0}
                                />
                                <SummaryRow label="Reward token" value={rewardSymbol} />
                                <SummaryRow
                                    label="Claim schedule"
                                    value="Accrues instantly · claim anytime"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
