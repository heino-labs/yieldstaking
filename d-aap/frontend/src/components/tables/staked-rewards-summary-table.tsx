import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, Clock, CheckCircle2, Unlock } from 'lucide-react';

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

export interface StakedRewardSummaryItem {
    id: string;
    packageId: number;
    stakeId: number;
    lockPeriod: string;
    startDate: string;
    apy: number;
    stakedAmount: string;
    rewardTotal: string;
    rewardClaimed: string;
    claimable: string;
    unlockDate: string;
    lastClaim: string;
    status: 'active' | 'unlocked' | 'completed';
    stakeSymbol: string;
    rewardSymbol: string;
    stakeDecimals: number;
    rewardDecimals: number;
}

interface StakedRewardsSummaryTableProps {
    data: StakedRewardSummaryItem[];
    explorerUrl?: string;
    contractAddress?: string;
}

export function StakedRewardsSummaryTable({ 
    data, 
    explorerUrl = 'https://sepolia.etherscan.io',
    contractAddress,
}: StakedRewardsSummaryTableProps) {
    const columns: ColumnDef<StakedRewardSummaryItem>[] = React.useMemo(() => [
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
                        {formatTokenAmount(amount, row.original.stakeDecimals, 4)} {row.original.stakeSymbol}
                    </div>
                );
            },
        },
        {
            accessorKey: 'rewardTotal',
            header: 'Total Rewards',
            cell: ({ row }) => {
                const amount = BigInt(row.original.rewardTotal || '0');
                return (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                        +{formatTokenAmount(amount, row.original.rewardDecimals, 6)} {row.original.rewardSymbol}
                    </span>
                );
            },
        },
        {
            accessorKey: 'rewardClaimed',
            header: 'Claimed',
            cell: ({ row }) => {
                const amount = BigInt(row.original.rewardClaimed || '0');
                return (
                    <span className="text-muted-foreground">
                        {formatTokenAmount(amount, row.original.rewardDecimals, 6)} {row.original.rewardSymbol}
                    </span>
                );
            },
        },
        {
            accessorKey: 'claimable',
            header: 'Pending',
            cell: ({ row }) => {
                const amount = BigInt(row.original.claimable || '0');
                const displayAmount = formatTokenAmountWithFloor(amount, row.original.rewardDecimals, 6);
                return (
                    <span className="font-bold text-green-600 dark:text-green-400">
                        {displayAmount.startsWith('<') ? displayAmount : `+${displayAmount}`} {row.original.rewardSymbol}
                    </span>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <Badge 
                        variant="outline" 
                        className={
                            status === 'unlocked' 
                                ? 'border-green-500 text-green-500' 
                                : status === 'completed'
                                ? 'border-muted-foreground text-muted-foreground bg-muted/50'
                                : 'border-primary text-primary'
                        }
                    >
                        {status === 'unlocked' ? (
                            <><Unlock className="h-3 w-3 mr-1" /> Unlocked</>
                        ) : status === 'completed' ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
                        ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Active</>
                        )}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'lastClaim',
            header: 'Last Claim',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.original.lastClaim || '-'}
                </div>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: () => (
                <a
                    href={contractAddress ? `${explorerUrl}/address/${contractAddress}` : explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    View
                    <ExternalLink className="size-3" />
                </a>
            ),
        },
    ], [contractAddress, explorerUrl]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
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
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
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
                                        <Clock className="h-8 w-8 opacity-50" />
                                        <p>No active stakes found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {data.length > 10 && (
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-sm">
                        {data.length} stake(s) total
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
