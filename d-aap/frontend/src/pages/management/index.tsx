import { 
    Users, 
    Activity, 
    TrendingUp, 
    Wallet, 
    FileText, 
    ArrowUpRight,
    Coins,
    BarChart3,
    Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePlatformStatistics } from '@/hooks/use-admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { 
        maximumFractionDigits: decimals >= 18 ? 2 : 6,
        minimumFractionDigits: 0
    }).format(value);
}

function formatCompact(num: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(num);
}

export default function AdminDashboardPage() {
    const { data: stats, isLoading } = usePlatformStatistics();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    const totalPositions = stats?.staking.positions.total ?? 0;
    const activePositions = stats?.staking.positions.active ?? 0;
    const activePercentage = totalPositions > 0 ? (activePositions / totalPositions) * 100 : 0;

    const totalUsers = stats?.users.total ?? 0;
    const usersWithWallets = stats?.users.withWallets ?? 0;
    const walletPercentage = totalUsers > 0 ? (usersWithWallets / totalUsers) * 100 : 0;

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Global statistics and system health</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Value Locked</CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Wallet className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatAmount(stats?.staking.totalLocked ?? '0', 18)}</div>
                        <p className="text-xs text-muted-foreground mt-1">AUR staked in contracts</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Rewards</CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Coins className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatCompact(Number(formatAmount(stats?.staking.totalRewardDebt ?? '0', 6)))}</div>
                        <p className="text-xs text-muted-foreground mt-1">USDT reserved for unpaid rewards</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Users className="h-4 w-4 text-purple-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground mt-1">{usersWithWallets} with connected wallets</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <FileText className="h-4 w-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.transactions.total ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total on-chain transactions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Active Positions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-bold">{activePositions}</div>
                            <div className="text-sm text-muted-foreground">of {totalPositions}</div>
                        </div>
                        <Progress value={activePercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                            {activePercentage.toFixed(1)}% of positions are currently active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-blue-500" />
                            Wallet Adoption
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-bold">{usersWithWallets}</div>
                            <div className="text-sm text-muted-foreground">of {totalUsers}</div>
                        </div>
                        <Progress value={walletPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                            {walletPercentage.toFixed(1)}% of users have connected wallets
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-500" />
                            Unique Stakers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-bold">{stats?.staking.uniqueStakers ?? 0}</div>
                            <div className="text-sm text-muted-foreground">active</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="text-center p-2 rounded-lg bg-muted">
                                <div className="font-semibold">{stats?.staking.contracts ?? 0}</div>
                                <div className="text-xs text-muted-foreground">Contracts</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-muted">
                                <div className="font-semibold">{stats?.staking.packages ?? 0}</div>
                                <div className="text-xs text-muted-foreground">Packages</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <Link to="/app/management/users">
                        <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="flex items-center gap-4 p-4">
                                <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                    <Users className="h-5 w-5 text-purple-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">Users</div>
                                    <div className="text-sm text-muted-foreground">Manage accounts</div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/app/management/positions">
                        <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="flex items-center gap-4 p-4">
                                <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">Positions</div>
                                    <div className="text-sm text-muted-foreground">View all stakes</div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/app/network/setup">
                        <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="flex items-center gap-4 p-4">
                                <div className="p-3 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                    <BarChart3 className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">Contracts</div>
                                    <div className="text-sm text-muted-foreground">Setup staking</div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/app/network/monitor">
                        <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="flex items-center gap-4 p-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                    <Settings className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">Blockchain</div>
                                    <div className="text-sm text-muted-foreground">Sync & events</div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}
