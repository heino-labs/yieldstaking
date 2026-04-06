import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowRight, TrendingUp, Wallet, Clock, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useYieldStaking } from '@/hooks/use-yield-staking';

function formatNumber(value: string, decimals = 2): string {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
}

function formatLockPeriod(seconds: bigint): string {
    const days = Number(seconds) / 86400;
    if (days >= 365) return `${Math.floor(days / 365)} Year`;
    if (days >= 30) return `${Math.floor(days / 30)} Month`;
    return `${Math.floor(days)} Days`;
}

export default function AureusPage() {
    const navigate = useNavigate();
    const { isConnected } = useAccount();
    const { 
        totalLocked, 
        userTotalStakes, 
        tokenSymbol, 
        packages,
        isPaused 
    } = useYieldStaking();

    const highestApy = packages.length > 0 
        ? Math.max(...packages.map(p => p.apy)) 
        : 0;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 p-8 lg:p-12">
                    <div className="absolute inset-0 bg-grid-white/5" />
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                <Sparkles className="h-4 w-4" />
                                Yield Staking
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                                Stake {tokenSymbol} & Earn Rewards
                            </h1>
                            <p className="text-muted-foreground max-w-lg">
                                Lock your tokens in flexible staking packages and earn competitive APY rewards.
                                Choose from multiple lock periods to maximize your returns.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-2">
                                <Button size="lg" onClick={() => navigate('/app/stake')} disabled={isPaused}>
                                    Start Staking
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                {isConnected && (
                                    <Button size="lg" variant="outline" onClick={() => navigate('/app/withdrawals')}>
                                        Manage Stakes
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-6">
                            <div className="rounded-xl bg-background/80 backdrop-blur p-6 min-w-[140px]">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Max APY
                                </div>
                                <div className="text-3xl font-bold text-primary">{highestApy}%</div>
                            </div>
                            <div className="rounded-xl bg-background/80 backdrop-blur p-6 min-w-[140px]">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                                    <Wallet className="h-4 w-4" />
                                    TVL
                                </div>
                                <div className="text-3xl font-bold">{formatNumber(totalLocked)}</div>
                                <div className="text-sm text-muted-foreground">{tokenSymbol}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {isConnected && parseFloat(userTotalStakes) > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Staking Position</CardTitle>
                            <CardDescription>Overview of your current stakes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold">{formatNumber(userTotalStakes, 4)} {tokenSymbol}</div>
                                    <div className="text-sm text-muted-foreground">Total Staked</div>
                                </div>
                                <Button variant="outline" onClick={() => navigate('/app/withdrawals')}>
                                    View Details
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div>
                    <h2 className="text-xl font-semibold mb-4">Available Packages</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {packages.length > 0 ? packages.map((pkg) => (
                            <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                                {pkg.apy === highestApy && (
                                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg">
                                        Best APY
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        {formatLockPeriod(pkg.lockPeriod)}
                                    </CardTitle>
                                    <CardDescription>Package #{pkg.id + 1}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-primary">{pkg.apy}%</div>
                                        <div className="text-sm text-muted-foreground">Annual APY</div>
                                    </div>
                                    <Button 
                                        className="w-full" 
                                        onClick={() => navigate(`/app/stake?package=${pkg.id}`)}
                                        disabled={isPaused}
                                    >
                                        Stake Now
                                    </Button>
                                </CardContent>
                            </Card>
                        )) : (
                            <Card className="col-span-full">
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    No staking packages available at the moment
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {isPaused && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive text-center">
                        Staking is currently paused. Please check back later.
                    </div>
                )}
            </div>
        </div>
    );
}
