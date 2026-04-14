import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock, Database, Activity, Inbox, Zap, Wallet, ShieldAlert, Coins, ArrowUpFromLine, AlertTriangle } from 'lucide-react';
import { parseUnits } from 'viem';
import { useChainId } from 'wagmi';
import type { Address } from 'viem';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    useBlockchainSyncStatuses,
    useBlockchainHealth,
    useUnprocessedEventCount,
    useTriggerBlockchainSync,
    useProcessBlockchainEvents,
    useAdminBlockchainActions,
    useAdminContracts
} from '@/hooks';
import { toast } from 'sonner';
import { AdminWalletGuard } from '@/components/auth/admin-wallet-guard';
import { getYieldStakingAddress } from '@/lib/blockchain/contracts';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';

import type { BlockchainSyncStatus } from '@/interfaces/admin';

export default function NetworkMonitorPage() {
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const { data: syncStatuses, isLoading: syncLoading, refetch: refetchSync } = useBlockchainSyncStatuses();
    const { data: health, isLoading: healthLoading } = useBlockchainHealth();
    const { data: unprocessed } = useUnprocessedEventCount();
    const { data: contracts } = useAdminContracts();
    const triggerSync = useTriggerBlockchainSync();
    const processEvents = useProcessBlockchainEvents();
    const { withdrawExcessReward, transferRewardToken, transferStakeToken, isWritePending } = useAdminBlockchainActions();

    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = React.useState(false);
    const [withdrawAmount, setWithdrawAmount] = React.useState('100');
    const [withdrawError, setWithdrawError] = React.useState('');
    const [selectedContract, setSelectedContract] = React.useState<any>(null);
    const [isFundDialogOpen, setIsFundDialogOpen] = React.useState(false);
    const [fundAmount, setFundAmount] = React.useState('100');
    const [fundError, setFundError] = React.useState('');
    const [fundTokenType, setFundTokenType] = React.useState<'reward' | 'stake'>('reward');
    const configuredContractAddress = getYieldStakingAddress(chainId).toLowerCase();

    React.useEffect(() => {
        if (!contracts?.length) return;
        const matched =
            contracts.find((c) => c.address.toLowerCase() === configuredContractAddress) ||
            contracts[0];
        setSelectedContract(matched);
    }, [contracts, configuredContractAddress]);

    const onWithdrawSubmit = async () => {
        if (!selectedContract) return;
        
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
            setWithdrawError('Withdraw amount must be greater than 0');
            return;
        }
        setWithdrawError('');
        
        try {
            const amount = parseUnits(withdrawAmount, selectedContract.rewardTokenDecimals);
            await withdrawExcessReward(amount, selectedContract.address as Address);
            setIsWithdrawDialogOpen(false);
            setWithdrawError('');
            toast.success('Withdraw transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to withdraw excess rewards');
        }
    };

    const onFundSubmit = async () => {
        if (!selectedContract) return;
        
        if (!fundAmount || parseFloat(fundAmount) <= 0) {
            setFundError('Fund amount must be greater than 0');
            return;
        }
        setFundError('');
        
        try {
            const decimals =
                fundTokenType === 'reward'
                    ? selectedContract.rewardTokenDecimals
                    : selectedContract.stakeTokenDecimals;
            const amount = parseUnits(fundAmount, decimals);
            if (fundTokenType === 'reward') {
                await transferRewardToken(amount, selectedContract.address as Address);
            } else {
                await transferStakeToken(amount, selectedContract.address as Address);
            }
            setIsFundDialogOpen(false);
            setFundError('');
            toast.success('Fund transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to fund contract');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
            case 'PROCESSING':
                return <Badge variant="default" className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
            case 'FAILED':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
            default:
                return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const columns: ColumnDef<BlockchainSyncStatus>[] = React.useMemo(() => [
        {
            accessorKey: 'contractAddress',
            header: 'Contract',
            cell: ({ row }) => (
                <code className="text-xs">
                    {row.original.contractAddress.slice(0, 10)}...{row.original.contractAddress.slice(-6)}
                </code>
            ),
        },
        {
            accessorKey: 'chain',
            header: 'Chain',
            cell: ({ row }) => row.original.chain?.name || `Chain ${row.original.chainId}`,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: 'lastProcessedBlock',
            header: 'Last Block',
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.lastProcessedBlock}</span>
            ),
        },
        {
            accessorKey: 'currentBlock',
            header: 'Current Block',
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.currentBlock || '-'}</span>
            ),
        },
        {
            accessorKey: 'lastSyncAt',
            header: 'Last Sync',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.lastSyncAt)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => triggerSync.mutate({
                        chainId: row.original.chainId,
                        contractAddress: row.original.contractAddress,
                    })}
                    disabled={triggerSync.isPending}
                >
                    <RefreshCw className={`w-4 h-4 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                </Button>
            ),
        },
    ], [triggerSync]);

    const table = useReactTable({
        data: syncStatuses ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    if (syncLoading || healthLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Monitor</h1>
                    <p className="text-muted-foreground">Monitor sync status and process events</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => refetchSync()}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Service Status</CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Activity className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {health?.isRunning ? (
                                <span className="text-green-500">Running</span>
                            ) : (
                                <span className="text-yellow-500">Stopped</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {Object.keys(health?.providers || {}).length} provider(s) connected
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Unprocessed Events</CardTitle>
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <Inbox className="h-4 w-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unprocessed?.count ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pending blockchain events</p>
                    </CardContent>
                </Card>

                <AdminWalletGuard fallback={
                    <Card className="relative overflow-hidden border-dashed border-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sync Control</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Connect Admin wallet to process events</p>
                        </CardContent>
                    </Card>
                }>
                    <Card className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sync Control</CardTitle>
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Zap className="h-4 w-4 text-blue-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => processEvents.mutate(100)}
                                disabled={processEvents.isPending || (unprocessed?.count ?? 0) === 0}
                                className="w-full"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Process Events
                            </Button>
                        </CardContent>
                    </Card>
                </AdminWalletGuard>

                <AdminWalletGuard fallback={
                    <Card className="relative overflow-hidden border-dashed border-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Reward Fund</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Connect Admin wallet to withdraw rewards</p>
                        </CardContent>
                    </Card>
                }>
                    <Card className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Reward Fund</CardTitle>
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Coins className="h-4 w-4 text-purple-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (!selectedContract) return;
                                    setIsWithdrawDialogOpen(true);
                                }}
                                className="w-full"
                                disabled={!selectedContract}
                            >
                                <Wallet className="w-4 h-4 mr-2" />
                                Withdraw Excess
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (!selectedContract) return;
                                    setFundTokenType('reward');
                                    setFundAmount('100');
                                    setIsFundDialogOpen(true);
                                }}
                                className="w-full mt-2"
                                disabled={!selectedContract}
                            >
                                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                                Fund Contract
                            </Button>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                                Target: {selectedContract
                                    ? `${selectedContract.address.slice(0, 8)}...${selectedContract.address.slice(-6)}`
                                    : 'No contract selected'}
                            </p>
                        </CardContent>
                    </Card>
                </AdminWalletGuard>
            </div>

            {/* Withdraw Dialog */}
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw Excess Rewards</DialogTitle>
                        <DialogDescription>
                            Withdraw surplus reward tokens from the contract to the admin wallet.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Target Contract</Label>
                            <Select
                                value={selectedContract?.address ?? ''}
                                onValueChange={(value) => {
                                    const next =
                                        contracts?.find((c) => c.address === value) ?? null;
                                    setSelectedContract(next);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a contract" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(contracts ?? []).map((c) => (
                                        <SelectItem key={c.id} value={c.address}>
                                            {c.address.slice(0, 10)}...{c.address.slice(-6)} ({c.rewardTokenSymbol})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Withdraw excess reward token from the selected staking contract to the connected Admin wallet.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="withdrawAmount">Amount ({selectedContract?.rewardTokenSymbol})</Label>
                            <Input 
                                id="withdrawAmount" 
                                type="number" 
                                value={withdrawAmount}
                                onChange={(e) => {
                                    setWithdrawAmount(e.target.value);
                                    if (withdrawError) setWithdrawError('');
                                }}
                                className={withdrawError ? 'border-destructive' : ''}
                            />
                            {withdrawError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {withdrawError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onWithdrawSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Withdraw Rewards'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fund Dialog */}
            <Dialog open={isFundDialogOpen} onOpenChange={setIsFundDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fund Contract</DialogTitle>
                        <DialogDescription>
                            Deposit reward/stake token from Admin wallet into this staking contract.
                            Approve token first if needed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Token Type</Label>
                            <Select
                                value={fundTokenType}
                                onValueChange={(v) => setFundTokenType(v as 'reward' | 'stake')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reward">
                                        Reward ({selectedContract?.rewardTokenSymbol})
                                    </SelectItem>
                                    <SelectItem value="stake">
                                        Stake ({selectedContract?.stakeTokenSymbol})
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fundAmount">
                                Amount ({fundTokenType === 'reward' ? selectedContract?.rewardTokenSymbol : selectedContract?.stakeTokenSymbol})
                            </Label>
                            <Input
                                id="fundAmount"
                                type="number"
                                value={fundAmount}
                                onChange={(e) => {
                                    setFundAmount(e.target.value);
                                    if (fundError) setFundError('');
                                }}
                                className={fundError ? 'border-destructive' : ''}
                            />
                            {fundError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {fundError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFundDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onFundSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Fund Token'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Sync Status</h3>
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
                                            <Database className="h-8 w-8 opacity-50" />
                                            <p>No sync records found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(syncStatuses?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {syncStatuses?.length ?? 0} contract(s)
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
