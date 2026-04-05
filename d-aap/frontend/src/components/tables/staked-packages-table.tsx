import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, Unlock, Clock, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatTokenAmount, formatTokenAmountWithFloor } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface StakedPackageItem {
    id: string;
    packageId: number;
    stakeId: number;
    lockPeriod: string;
    startDate: string;
    apy: number;
    stakedAmount: string;
    claimable: string;
    unlockDate: string;
    timeRemaining: string;
    isUnlocked: boolean;
}

interface StakedPackagesTableProps {
    data: StakedPackageItem[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    explorerUrl?: string;
    contractAddress?: string;
    stakeSymbol?: string;
    rewardSymbol?: string;
    stakeDecimals?: number;
    rewardDecimals?: number;
}

export function StakedPackagesTable({ 
    data, 
    selectedId,
    onSelect,
    explorerUrl = 'https://sepolia.etherscan.io',
    contractAddress,
    stakeSymbol = 'AUR',
    rewardSymbol = 'USDT',
    stakeDecimals = 18,
    rewardDecimals = 6,
}: StakedPackagesTableProps) {
    const columns: ColumnDef<StakedPackageItem>[] = React.useMemo(() => [
        {
            accessorKey: 'lockPeriod',
            header: 'Package',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold">
                        A
                    </div>
                    <div>
                        <div className="font-medium">{row.original.lockPeriod}</div>
                        <div className="text-xs text-muted-foreground">{row.original.apy}% APY</div>
                        <div className="text-xs text-muted-foreground">
                            Stake #{row.original.stakeId} • {row.original.startDate}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'stakedAmount',
            header: 'Staked',
            cell: ({ row }) => {
                const amount = BigInt(row.original.stakedAmount || '0');
                return (
                    <div className="font-medium">
                        {formatTokenAmount(amount, stakeDecimals, 4)} {stakeSymbol}
                    </div>
                );
            },
        },
        {
            accessorKey: 'claimable',
            header: 'Claimable Now',
            cell: ({ row }) => {
                const amount = BigInt(row.original.claimable || '0');
                const displayAmount = formatTokenAmountWithFloor(amount, rewardDecimals, 6);
                return (
                    <span className="font-medium text-green-600 dark:text-green-400">
                        {displayAmount.startsWith('<') ? displayAmount : `+${displayAmount}`} {rewardSymbol}
                    </span>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const isUnlocked = row.original.isUnlocked;
                return isUnlocked ? (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                        <Unlock className="h-3 w-3 mr-1" />
                        Unlocked
                    </Badge>
                ) : (
                    <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {row.original.timeRemaining}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-primary" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/app/reward-history?positionId=${row.original.id}`}>
                            <Gift className="h-3 w-3" />
                        </Link>
                    </Button>
                    <a
                        href={contractAddress ? `${explorerUrl}/address/${contractAddress}` : explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="size-3" />
                    </a>
                </div>
            ),
        },
    ], [contractAddress, explorerUrl, rewardDecimals, rewardSymbol, stakeDecimals, stakeSymbol]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 5,
            },
        },
    });

    return (
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
                            table.getRowModel().rows.map((row) => {
                                const isSelected = selectedId === row.original.id;
                                return (
                                    <TableRow 
                                        key={row.id}
                                        className={`cursor-pointer transition-colors ${
                                            isSelected 
                                                ? 'bg-primary/10 hover:bg-primary/15' 
                                                : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => onSelect?.(row.original.id)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Clock className="h-8 w-8 opacity-50" />
                                        <p>No staked packages</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {data.length > 5 && (
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-sm">
                        {data.length} position(s)
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
    );
}
