import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, CheckCircle2, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatTokenAmount } from '@/lib/utils/format';
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

export interface CompletedStakeItem {
    id: string;
    packageId: number;
    stakeId: number;
    lockPeriod: string;
    startDate: string;
    apy: number;
    stakedAmount: string;
    totalRewards: string;
    unlockDate: string;
    withdrawDate: string;
    stakeDecimals: number;
    rewardDecimals: number;
    stakeSymbol: string;
    rewardSymbol: string;
}

interface CompletedStakesTableProps {
    data: CompletedStakeItem[];
    explorerUrl?: string;
    contractAddress?: string;
}

export function CompletedStakesTable({ 
    data, 
    explorerUrl = 'https://sepolia.etherscan.io',
    contractAddress,
}: CompletedStakesTableProps) {
    const columns: ColumnDef<CompletedStakeItem>[] = React.useMemo(() => [
        {
            accessorKey: 'lockPeriod',
            header: 'Package',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
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
            header: 'Staked Amount',
            cell: ({ row }) => {
                const amount = BigInt(row.original.stakedAmount || '0');
                return (
                    <div className="font-medium">
                        {formatTokenAmount(amount, row.original.stakeDecimals, 2)} {row.original.stakeSymbol}
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalRewards',
            header: 'Total Rewards',
            cell: ({ row }) => {
                const amount = BigInt(row.original.totalRewards || '0');
                return (
                    <span className="font-medium text-green-600 dark:text-green-400">
                        +{formatTokenAmount(amount, row.original.rewardDecimals, 4)} {row.original.rewardSymbol}
                    </span>
                );
            },
        },
        {
            accessorKey: 'withdrawDate',
            header: 'Withdrawn At',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.original.withdrawDate}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: () => (
                <Badge variant="outline" className="border-muted-foreground text-muted-foreground bg-muted/50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-primary">
                        <Link to={`/app/reward-history?positionId=${row.original.id}`}>
                            <Gift className="mr-1 h-3 w-3" />
                            Rewards
                        </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                        <a
                            href={contractAddress ? `${explorerUrl}/address/${contractAddress}` : explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </Button>
                </div>
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
                                        <CheckCircle2 className="h-8 w-8 opacity-50" />
                                        <p>No completed stakes found</p>
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
                        {data.length} completed stake(s)
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
