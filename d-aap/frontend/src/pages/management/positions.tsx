import * as React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Check, X, TrendingUp, Search, ExternalLink, History, Coins, ArrowUpRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAdminPositions, useAdminTransactions } from '@/hooks/use-admin';

import type { StakePositionAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { 
        maximumFractionDigits: decimals >= 18 ? 4 : 6,
        minimumFractionDigits: 0
    }).format(value);
}

function PositionDetails({ positionId, open, onOpenChange }: { positionId: number | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { data: txData, isLoading } = useAdminTransactions({ 
        positionId: positionId ?? undefined,
        limit: 50 
    });

    const claims = txData?.transactions.filter(tx => tx.type === 'CLAIM') ?? [];
    const withdrawal = txData?.transactions.find(tx => tx.type === 'WITHDRAWAL');

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader className="pb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Position History #{positionId}
                    </SheetTitle>
                    <SheetDescription>
                        View all claim and withdrawal events for this staking position.
                    </SheetDescription>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-orange-500" />
                                Principal Withdrawal
                            </h4>
                            {withdrawal ? (
                                <Card className="bg-orange-500/5 border-orange-500/20">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium">Withdrawn</div>
                                            <div className="text-xs text-muted-foreground">{new Date(withdrawal.createdAt).toLocaleString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-orange-600">
                                                {formatAmount(withdrawal.amount, 18)} AUR
                                            </div>
                                            <a 
                                                href={`https://sepolia.etherscan.io/tx/${withdrawal.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-primary hover:underline flex items-center justify-end gap-1"
                                            >
                                                View Tx <ExternalLink className="w-2 h-2" />
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center border border-dashed">
                                    Principal is still locked or not yet withdrawn
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-green-500" />
                                    Reward Claims ({claims.length})
                                </h4>
                            </div>
                            {claims.length > 0 ? (
                                <div className="space-y-2">
                                    {claims.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm">
                                            <div>
                                                <div className="font-medium text-green-600">Claimed Rewards</div>
                                                <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold">
                                                    {formatAmount(tx.amount, 6)} USDT
                                                </div>
                                                <a 
                                                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary hover:underline flex items-center justify-end gap-1"
                                                >
                                                    View Tx <ExternalLink className="w-2 h-2" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center border border-dashed">
                                    No rewards have been claimed yet
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

export default function AdminPositionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const userIdParam = searchParams.get('userId');

    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [selectedPositionId, setSelectedPositionId] = React.useState<number | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    
    const { data, isLoading } = useAdminPositions({ 
        page: 1, 
        isWithdrawn: statusFilter === 'withdrawn' ? true : statusFilter === 'active' ? false : undefined,
        userId: userIdParam ? parseInt(userIdParam) : undefined,
        search: debouncedSearch || undefined,
    });

    const clearUserFilter = () => {
        searchParams.delete('userId');
        setSearchParams(searchParams);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const formatLockPeriod = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        return `${days} days`;
    };

    const columns: ColumnDef<StakePositionAdmin>[] = React.useMemo(() => [
        {
            accessorKey: 'wallet',
            header: 'User',
            cell: ({ row }) => (
                <div>
                    <Link 
                        to={`/admin/users`}
                        className="font-medium hover:underline"
                    >
                        {row.original.wallet.user.name}
                    </Link>
                    <code className="block text-xs text-muted-foreground">
                        {row.original.wallet.walletAddress.slice(0, 6)}...{row.original.wallet.walletAddress.slice(-4)}
                    </code>
                </div>
            ),
        },
        {
            accessorKey: 'package',
            header: 'Package',
            cell: ({ row }) => (
                <div>
                    <div>Package #{row.original.onChainPackageId}</div>
                    <div className="text-sm text-muted-foreground">
                        {(row.original.package.apy / 100).toFixed(1)}% APY
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'principal',
            header: 'Principal',
            cell: ({ row }) => (
                <span className="font-mono">
                    {formatAmount(row.original.principal, 18)} {row.original.contract.stakeTokenSymbol}
                </span>
            ),
        },
        {
            accessorKey: 'rewardTotal',
            header: 'Rewards',
            cell: ({ row }) => {
                const rewardDecimals = row.original.contract.rewardTokenSymbol === 'USDT' ? 6 : 18;
                return (
                    <div className="font-mono">
                        <div className="text-green-600 dark:text-green-400">
                            +{formatAmount(row.original.rewardTotal, rewardDecimals)} {row.original.contract.rewardTokenSymbol}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Claimed: {formatAmount(row.original.rewardClaimed, rewardDecimals)}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'lockPeriod',
            header: 'Lock',
            cell: ({ row }) => formatLockPeriod(row.original.lockPeriod),
        },
        {
            accessorKey: 'unlockTimestamp',
            header: 'Unlock',
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.unlockTimestamp)}</span>
            ),
        },
        {
            accessorKey: 'isWithdrawn',
            header: 'Status',
            cell: ({ row }) => {
                const position = row.original;
                if (position.isWithdrawn) {
                    return (
                        <Badge variant="outline" className="gap-1">
                            <Check className="w-3 h-3" /> Withdrawn
                        </Badge>
                    );
                }
                if (new Date(position.unlockTimestamp) <= new Date()) {
                    return (
                        <Badge className="bg-green-500 gap-1">
                            <Check className="w-3 h-3" /> Unlocked
                        </Badge>
                    );
                }
                return (
                    <Badge variant="secondary" className="gap-1">
                        <X className="w-3 h-3" /> Locked
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => {
                        setSelectedPositionId(row.original.id);
                        setIsDetailsOpen(true);
                    }}
                >
                    <History className="w-3.5 h-3.5" />
                    History
                </Button>
            ),
        },
    ], []);

    const table = useReactTable({
        data: data?.positions ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 8,
            },
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6 space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold">All Stake Positions</h1>
                    <p className="text-muted-foreground">Manage all stake positions in the system</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or wallet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {userIdParam && (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 pr-1">
                        Filtering by User ID: {userIdParam}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                            onClick={clearUserFilter}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                </div>
            )}

            <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <TrendingUp className="h-8 w-8 opacity-50" />
                                            <p>No positions found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(data?.positions?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {data?.total ?? 0} position(s)
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-sm">
                                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    <IconChevronLeft className="size-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    <IconChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PositionDetails 
                positionId={selectedPositionId}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </div>
    );
}
