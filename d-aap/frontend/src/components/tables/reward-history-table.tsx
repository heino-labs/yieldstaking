import * as React from 'react';
import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';
import { ExternalLink, Search, TrendingUp } from 'lucide-react';

import { formatTokenAmountWithFloor } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export interface RewardHistoryItem {
    id: string;
    packageId: number;
    amount: string;
    claimedAt: string;
    apy: number;
    rewardSymbol: string;
    rewardDecimals: number;
    txHash?: string;
    positionId?: number;
}

interface RewardHistoryTableProps {
    data: RewardHistoryItem[];
    explorerUrl?: string;
}

export function RewardHistoryTable({ 
    data, 
    explorerUrl = 'https://sepolia.etherscan.io',
}: RewardHistoryTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const columns: ColumnDef<RewardHistoryItem>[] = React.useMemo(() => [
        {
            accessorKey: 'claimedAt',
            header: 'Date',
            cell: ({ row }) => (
                <div className="text-sm font-medium">
                    {new Date(row.original.claimedAt).toLocaleString()}
                </div>
            ),
        },
        {
            accessorKey: 'packageId',
            header: 'Package',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold">
                        A
                    </div>
                    <div>
                        <div className="font-medium">{row.original.packageId} Days Package</div>
                        <div className="text-xs text-muted-foreground">{row.original.apy}% APY</div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: ({ row }) => {
                const amount = BigInt(row.original.amount || '0');
                return (
                    <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                        +{formatTokenAmountWithFloor(amount, row.original.rewardDecimals, 6)} {row.original.rewardSymbol}
                    </span>
                );
            },
        },
        {
            id: 'etherscan',
            header: 'Transaction',
            cell: ({ row }) => (
                row.original.txHash ? (
                    <a
                        href={`${explorerUrl}/tx/${row.original.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        View on Explorer
                        <ExternalLink className="size-3" />
                    </a>
                ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                )
            ),
        },
    ], [explorerUrl]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by package, amount..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-9"
                />
            </div>

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
                                        <p>No reward history found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {data.length > 0 && (
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-sm">
                        {table.getFilteredRowModel().rows.length} position(s)
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => table.setPageSize(Number(value))}
                            >
                                <SelectTrigger size="sm" className="w-16" id="rows-per-page">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[5, 10, 20, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-sm">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="hidden size-8 lg:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <IconChevronsLeft className="size-4" />
                            </Button>
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
                            <Button
                                variant="outline"
                                size="icon"
                                className="hidden size-8 lg:flex"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <IconChevronsRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
