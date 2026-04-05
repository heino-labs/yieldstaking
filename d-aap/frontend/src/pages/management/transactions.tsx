import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { 
    Search, 
    ExternalLink, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Coins, 
    ShieldAlert,
    CheckCircle2,
    Clock,
    XCircle
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAdminTransactions } from '@/hooks/use-admin';

import type { AdminTransactionAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, type: string): string {
    const decimals = type === 'STAKE' || type === 'WITHDRAW' ? 18 : 6;
    const symbol = type === 'STAKE' || type === 'WITHDRAW' ? 'AUR' : 'USDT';
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)} ${symbol}`;
}

export default function AdminTransactionsPage() {
    const [typeFilter, setTypeFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data, isLoading } = useAdminTransactions({
        page: 1,
        limit: 20,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: debouncedSearch || undefined,
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed</Badge>;
            case 'PENDING':
                return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
            case 'FAILED':
                return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'STAKE':
                return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
            case 'CLAIM':
                return <Coins className="w-4 h-4 text-green-500" />;
            case 'WITHDRAW':
                return <ArrowDownLeft className="w-4 h-4 text-orange-500" />;
            case 'EMERGENCY_WITHDRAW':
                return <ShieldAlert className="w-4 h-4 text-destructive" />;
            default:
                return null;
        }
    };

    const columns: ColumnDef<AdminTransactionAdmin>[] = React.useMemo(() => [
        {
            accessorKey: 'createdAt',
            header: 'Time',
            cell: ({ row }) => (
                <div className="text-sm">
                    <div className="font-medium">{new Date(row.original.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleTimeString()}</div>
                </div>
            ),
        },
        {
            accessorKey: 'wallet',
            header: 'User / Wallet',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.wallet.user.name}</div>
                    <code className="text-[10px] text-muted-foreground">
                        {row.original.wallet.walletAddress.slice(0, 10)}...{row.original.wallet.walletAddress.slice(-6)}
                    </code>
                </div>
            ),
        },
        {
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {getTypeIcon(row.original.type)}
                    <span className="text-sm font-medium capitalize">{row.original.type.replace('_', ' ').toLowerCase()}</span>
                </div>
            ),
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: ({ row }) => (
                <span className="font-mono font-bold">
                    {formatAmount(row.original.amount, row.original.type)}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: 'txHash',
            header: 'Transaction Hash',
            cell: ({ row }) => (
                row.original.txHash ? (
                    <a
                        href={`https://sepolia.etherscan.io/tx/${row.original.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        {row.original.txHash.slice(0, 8)}...{row.original.txHash.slice(-6)}
                        <ExternalLink className="w-3 h-3" />
                    </a>
                ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                )
            ),
        },
    ], []);

    const table = useReactTable({
        data: data?.transactions ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
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
            <div>
                <h1 className="text-2xl font-bold">Global Transactions</h1>
                <p className="text-muted-foreground">Monitor and audit all system activities</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by wallet, hash..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        <SelectItem value="STAKE">Staking</SelectItem>
                        <SelectItem value="CLAIM">Claiming Rewards</SelectItem>
                        <SelectItem value="WITHDRAW">Withdrawals</SelectItem>
                        <SelectItem value="EMERGENCY_WITHDRAW">Emergency</SelectItem>
                    </SelectContent>
                </Select>
            </div>

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
                                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                                        No transactions found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(data?.transactions?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {data?.total ?? 0} transaction(s) total
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
        </div>
    );
}
