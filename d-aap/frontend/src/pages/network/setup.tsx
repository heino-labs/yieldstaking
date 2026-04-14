import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, Pause, Play, Database, Wallet, Coins, Package, TrendingUp, Settings, Plus, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from 'lucide-react';
import { parseUnits, formatUnits, type Address } from 'viem';
import { useReadContracts } from 'wagmi';
import { createPublicClientForChain } from '@/lib/blockchain/client';
import { getYieldStakingContractConfig } from '@/lib/blockchain/contracts';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminContracts, useAdminBlockchainActions } from '@/hooks';
import { toast } from 'sonner';
import { AdminWalletGuard } from '@/components/auth/admin-wallet-guard';

import type { StakingContractAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals > 6 ? 2 : 4 }).format(value);
}

const PACKAGE_IDS_TO_SCAN = Array.from({ length: 10 }, (_, i) => i);

interface MergedPackage {
    packageId: number;
    lockPeriod: number;
    apy: number;
    isEnabled: boolean;
    totalStaked: string;
    stakersCount: number;
}

interface OnChainPackagesTableProps {
    contractAddress: Address;
    dbPackages: StakingContractAdmin['packages'];
    stakeTokenDecimals: number;
    stakeTokenSymbol: string;
    onUpdatePackage: (pkg: MergedPackage) => void;
}

function OnChainPackagesTable({ contractAddress, dbPackages, stakeTokenDecimals, stakeTokenSymbol, onUpdatePackage }: OnChainPackagesTableProps) {
    const stakingConfig = React.useMemo(
        () => getYieldStakingContractConfig(DEFAULT_CHAIN_ID),
        [],
    );

    const packageResults = useReadContracts({
        contracts: PACKAGE_IDS_TO_SCAN.map((id) => ({
            ...stakingConfig,
            address: contractAddress,
            functionName: 'packages' as const,
            args: [id],
        })),
    });

    const dbMap = React.useMemo(() => {
        const map = new Map<number, StakingContractAdmin['packages'][number]>();
        for (const p of dbPackages) map.set(p.packageId, p);
        return map;
    }, [dbPackages]);

    const packages = React.useMemo<MergedPackage[]>(() => {
        if (!packageResults.data) return [];

        const result: MergedPackage[] = [];

        packageResults.data.forEach((res, index) => {
            if (res.status !== 'success' || !res.result) return;

            const pkgResult = res.result;
            let lockPeriod: bigint;
            let apy: bigint;
            let enabled: boolean;

            if (Array.isArray(pkgResult)) {
                [lockPeriod, apy, enabled] = pkgResult as unknown as [bigint, bigint, boolean];
            } else if (typeof pkgResult === 'object' && pkgResult !== null) {
                const pkg = pkgResult as unknown as { lockPeriod: bigint; apy: bigint; enabled: boolean };
                lockPeriod = pkg.lockPeriod;
                apy = pkg.apy;
                enabled = pkg.enabled;
            } else {
                return;
            }

            if (Number(lockPeriod) === 0 && Number(apy) === 0) return;

            const dbPkg = dbMap.get(PACKAGE_IDS_TO_SCAN[index]);
            result.push({
                packageId: PACKAGE_IDS_TO_SCAN[index],
                lockPeriod: Number(lockPeriod),
                apy: Number(apy) / 100,
                isEnabled: enabled,
                totalStaked: dbPkg?.totalStaked ?? '0',
                stakersCount: dbPkg?.stakersCount ?? 0,
            });
        });

        return result;
    }, [packageResults.data, dbMap]);

    const formatLockPeriod = (seconds: number) => {
        const days = seconds / 86400;
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
    };

    const columns: ColumnDef<MergedPackage>[] = React.useMemo(() => [
        {
            accessorKey: 'packageId',
            header: 'Package ID',
            cell: ({ row }) => `#${row.original.packageId}`,
        },
        {
            accessorKey: 'lockPeriod',
            header: 'Lock Period',
            cell: ({ row }) => formatLockPeriod(row.original.lockPeriod),
        },
        {
            accessorKey: 'apy',
            header: 'APY',
            cell: ({ row }) => (
                <span className="text-green-600 dark:text-green-400 font-medium">
                    {row.original.apy.toFixed(1)}%
                </span>
            ),
        },
        {
            accessorKey: 'totalStaked',
            header: 'Total Staked',
            cell: ({ row }) => (
                <span className="font-mono">
                    {formatAmount(row.original.totalStaked, stakeTokenDecimals)} {stakeTokenSymbol}
                </span>
            ),
        },
        {
            accessorKey: 'stakersCount',
            header: 'Stakers',
            cell: ({ row }) => row.original.stakersCount,
        },
        {
            accessorKey: 'isEnabled',
            header: 'Status',
            cell: ({ row }) => (
                row.original.isEnabled ? (
                    <Badge className="bg-green-500">Enabled</Badge>
                ) : (
                    <Badge variant="outline">Disabled</Badge>
                )
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onUpdatePackage(row.original)}
                >
                    <Settings className="w-4 h-4" />
                </Button>
            ),
        },
    ], [stakeTokenDecimals, stakeTokenSymbol, onUpdatePackage]);

    const table = useReactTable({
        data: packages,
        columns: columns as ColumnDef<MergedPackage, any>[],
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
            <div className="overflow-hidden rounded-lg">
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
                                <TableCell colSpan={columns.length} className="h-16 text-center text-muted-foreground">
                                    {packageResults.isLoading ? 'Loading on-chain packages…' : 'No packages found on contract'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {packages.length > 5 && (
                <div className="flex items-center justify-end gap-2">
                    <div className="text-sm text-muted-foreground">
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
            )}
        </div>
    );
}

export default function NetworkSetupPage() {
    const { data: contracts, isLoading } = useAdminContracts();
    const {
        pause,
        unpause,
        setPackage,
        setMinStakeAmount,
        setMaxStakePerUser,
        setMaxTotalStakedPerPackage,
        withdrawExcessReward,
        transferRewardToken,
        transferStakeToken,
        isWritePending
    } = useAdminBlockchainActions();
    
    const [selectedContract, setSelectedContract] = React.useState<StakingContractAdmin | null>(null);
    const [isPackageDialogOpen, setIsPackageDialogOpen] = React.useState(false);
    const [isMinStakeDialogOpen, setIsMinStakeDialogOpen] = React.useState(false);
    const [isMaxStakeDialogOpen, setIsMaxStakeDialogOpen] = React.useState(false);
    
    const [packageForm, setPackageForm] = React.useState({
        id: 0,
        lockPeriodDays: 90,
        apyBasisPoints: 2000,
        enabled: true
    });
    const [packageErrors, setPackageErrors] = React.useState<Record<string, string>>({});

    const [isMaxTotalDialogOpen, setIsMaxTotalDialogOpen] = React.useState(false);
    const [isWithdrawRewardDialogOpen, setIsWithdrawRewardDialogOpen] = React.useState(false);
    const [isFundTokenDialogOpen, setIsFundTokenDialogOpen] = React.useState(false);

    const [minStakeValue, setMinStakeValue] = React.useState('500');
    const [minStakeError, setMinStakeError] = React.useState('');
    const [maxStakeValue, setMaxStakeValue] = React.useState('0');
    const [maxStakeError, setMaxStakeError] = React.useState('');
    const [maxTotalValue, setMaxTotalValue] = React.useState('0');
    const [maxTotalError, setMaxTotalError] = React.useState('');
    const [withdrawRewardValue, setWithdrawRewardValue] = React.useState('');
    const [withdrawRewardError, setWithdrawRewardError] = React.useState('');
    const [fundTokenType, setFundTokenType] = React.useState<'reward' | 'stake'>('reward');
    const [fundTokenValue, setFundTokenValue] = React.useState('');
    const [fundTokenError, setFundTokenError] = React.useState('');

    const handleUpdatePackage = (pkg: any) => {
        setPackageForm({
            id: pkg.packageId,
            lockPeriodDays: Math.floor(pkg.lockPeriod / 86400),
            apyBasisPoints: pkg.apy * 100,
            enabled: pkg.isEnabled
        });
        setPackageErrors({});
        setIsPackageDialogOpen(true);
    };

    const onSetPackageSubmit = async () => {
        if (!selectedContract) return;
        
        const errors: Record<string, string> = {};
        if (packageForm.lockPeriodDays <= 0) {
            errors.lockPeriodDays = 'Lock period must be greater than 0 days';
        }
        if (packageForm.apyBasisPoints < 0) {
            errors.apyBasisPoints = 'APY cannot be negative';
        }
        if (packageForm.apyBasisPoints > 10000) {
            errors.apyBasisPoints = 'APY cannot exceed 100% (10000 basis points)';
        }
        
        if (Object.keys(errors).length > 0) {
            setPackageErrors(errors);
            return;
        }
        
        try {
            const lockPeriod = BigInt(packageForm.lockPeriodDays) * 86400n;
            await setPackage(packageForm.id, lockPeriod, packageForm.apyBasisPoints, packageForm.enabled, selectedContract.address as Address);
            setIsPackageDialogOpen(false);
            setPackageErrors({});
            toast.success('Package update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update package');
        }
    };

    const onSetMinStakeSubmit = async () => {
        if (!selectedContract) return;
        
        if (!minStakeValue || parseFloat(minStakeValue) < 0) {
            setMinStakeError('Minimum stake amount must be 0 or greater');
            return;
        }
        setMinStakeError('');
        
        try {
            const amount = parseUnits(minStakeValue, selectedContract.stakeTokenDecimals);
            await setMinStakeAmount(amount, selectedContract.address as Address);
            setIsMinStakeDialogOpen(false);
            setMinStakeError('');
            toast.success('Min stake update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update minimum stake');
        }
    };

    const onSetMaxStakeSubmit = async () => {
        if (!selectedContract) return;
        
        if (!maxStakeValue || parseFloat(maxStakeValue) < 0) {
            setMaxStakeError('Maximum stake amount must be 0 or greater');
            return;
        }
        setMaxStakeError('');
        
        try {
            const amount = parseUnits(maxStakeValue, selectedContract.stakeTokenDecimals);
            await setMaxStakePerUser(amount, selectedContract.address as Address);
            setIsMaxStakeDialogOpen(false);
            setMaxStakeError('');
            toast.success('Max stake update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update maximum stake');
        }
    };

    const onSetMaxTotalSubmit = async () => {
        if (!selectedContract) return;
        
        if (!maxTotalValue || parseFloat(maxTotalValue) < 0) {
            setMaxTotalError('Maximum total staked must be 0 or greater');
            return;
        }
        setMaxTotalError('');
        
        try {
            const amount = parseUnits(maxTotalValue, selectedContract.stakeTokenDecimals);
            await setMaxTotalStakedPerPackage(amount, selectedContract.address as Address);
            setIsMaxTotalDialogOpen(false);
            setMaxTotalError('');
            toast.success('Max total per package update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update max total per package');
        }
    };

    const onWithdrawRewardSubmit = async () => {
        if (!selectedContract) return;
        
        if (!withdrawRewardValue || parseFloat(withdrawRewardValue) <= 0) {
            setWithdrawRewardError('Withdraw amount must be greater than 0');
            return;
        }
        setWithdrawRewardError('');
        
        try {
            const amount = parseUnits(withdrawRewardValue, selectedContract.rewardTokenDecimals);
            await withdrawExcessReward(amount, selectedContract.address as Address);
            setIsWithdrawRewardDialogOpen(false);
            setWithdrawRewardError('');
            toast.success('Withdraw excess reward transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to withdraw excess reward');
        }
    };

    const onFundTokenSubmit = async () => {
        if (!selectedContract) return;
        
        if (!fundTokenValue || parseFloat(fundTokenValue) <= 0) {
            setFundTokenError('Fund amount must be greater than 0');
            return;
        }
        setFundTokenError('');
        
        try {
            const decimals =
                fundTokenType === 'reward'
                    ? selectedContract.rewardTokenDecimals
                    : selectedContract.stakeTokenDecimals;
            const amount = parseUnits(fundTokenValue, decimals);
            if (fundTokenType === 'reward') {
                await transferRewardToken(amount, selectedContract.address as Address);
            } else {
                await transferStakeToken(amount, selectedContract.address as Address);
            }
            setIsFundTokenDialogOpen(false);
            setFundTokenError('');
            toast.success(
                `Fund ${fundTokenType === 'reward' ? selectedContract.rewardTokenSymbol : selectedContract.stakeTokenSymbol} transaction sent`,
            );
        } catch (err: any) {
            toast.error(err.message || 'Failed to fund token');
        }
    };

    const handleTogglePause = async (contract: StakingContractAdmin) => {
        try {
            const contractAddr = contract.address as Address;
            const client = createPublicClientForChain(DEFAULT_CHAIN_ID);
            const stakingConfig = getYieldStakingContractConfig(DEFAULT_CHAIN_ID);
            const onChainPaused = await client.readContract({
                ...stakingConfig,
                address: contractAddr,
                functionName: 'paused',
            });

            if (onChainPaused) {
                await unpause(contractAddr);
                toast.success('Unpause transaction sent');
            } else {
                await pause(contractAddr);
                toast.success('Pause transaction sent');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to toggle pause');
        }
    };

    if (isLoading) {
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
                    <h1 className="text-2xl font-bold">Yield Staking</h1>
                    <p className="text-muted-foreground">Configure staking parameters and packages</p>
                </div>
            </div>

            {contracts?.map((contract) => (
                <Card key={contract.id} onClick={() => setSelectedContract(contract)} className={selectedContract?.id === contract.id ? 'ring-2 ring-primary' : ''}>
                    <CardHeader>
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {contract.chain.name}
                                    {contract.isPaused ? (
                                        <Badge variant="destructive" className="gap-1">
                                            <Pause className="w-3 h-3" /> Paused
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-green-500 gap-1">
                                            <Play className="w-3 h-3" /> Active
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <code>{contract.address}</code>
                                    <a
                                        href={`https://sepolia.etherscan.io/address/${contract.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:opacity-80"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </CardDescription>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    Stake token: {contract.stakeTokenSymbol} • Reward token: {contract.rewardTokenSymbol}
                                </div>
                            </div>
                            <AdminWalletGuard fallback={null}>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            setMinStakeValue(formatUnits(BigInt(contract.minStakeAmount || '0'), contract.stakeTokenDecimals));
                                            setIsMinStakeDialogOpen(true);
                                        }}
                                    >
                                        Min Stake
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            // @ts-ignore
                                            setMaxStakeValue(formatUnits(BigInt(contract.maxStakePerUser || '0'), contract.stakeTokenDecimals));
                                            setIsMaxStakeDialogOpen(true);
                                        }}
                                    >
                                        Max/User
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            // @ts-ignore
                                            setMaxTotalValue(formatUnits(BigInt(contract.maxTotalStakedPerPackage || '0'), contract.stakeTokenDecimals));
                                            setIsMaxTotalDialogOpen(true);
                                        }}
                                    >
                                        Max/Package
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            setWithdrawRewardValue('');
                                            setIsWithdrawRewardDialogOpen(true);
                                        }}
                                    >
                                        <ArrowDownToLine className="w-3 h-3 mr-1" />
                                        Withdraw Reward
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            setFundTokenType('reward');
                                            setFundTokenValue('');
                                            setIsFundTokenDialogOpen(true);
                                        }}
                                    >
                                        <ArrowUpFromLine className="w-3 h-3 mr-1" />
                                        Fund Token
                                    </Button>
                                    <Button 
                                        variant={contract.isPaused ? "default" : "destructive"}
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePause(contract);
                                        }}
                                        disabled={isWritePending}
                                    >
                                        {contract.isPaused ? 'Unpause' : 'Pause'}
                                    </Button>
                                </div>
                            </AdminWalletGuard>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Wallet className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Locked</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.totalLocked, contract.stakeTokenDecimals)} {contract.stakeTokenSymbol}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <Coins className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Outstanding Rewards</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.totalRewardDebt, contract.rewardTokenDecimals)} {contract.rewardTokenSymbol}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Reserved for active positions
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Package className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Min Stake</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.minStakeAmount, contract.stakeTokenDecimals)} {contract.stakeTokenSymbol}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <TrendingUp className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Positions</div>
                                    <div className="text-xl font-bold">{contract._count.stakePositions}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold">Staking Packages</h4>
                                <AdminWalletGuard fallback={null}>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 gap-1"
                                        onClick={() => {
                                            setSelectedContract(contract);
                                            setPackageForm({
                                                id: contract.packages.length,
                                                lockPeriodDays: 90,
                                                apyBasisPoints: 2000,
                                                enabled: true
                                            });
                                            setIsPackageDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="w-3 h-3" /> Add Package
                                    </Button>
                                </AdminWalletGuard>
                            </div>
                            <OnChainPackagesTable 
                                contractAddress={contract.address as Address}
                                dbPackages={contract.packages}
                                stakeTokenDecimals={contract.stakeTokenDecimals}
                                stakeTokenSymbol={contract.stakeTokenSymbol}
                                onUpdatePackage={(pkg) => {
                                    setSelectedContract(contract);
                                    handleUpdatePackage(pkg);
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* Package Update Dialog */}
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Staking Package</DialogTitle>
                        <DialogDescription>
                            Configure the lock period and APY for package #{packageForm.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="days">Lock Period (Days)</Label>
                            <Input 
                                id="days" 
                                type="number" 
                                value={packageForm.lockPeriodDays}
                                onChange={(e) => {
                                    setPackageForm({...packageForm, lockPeriodDays: parseInt(e.target.value) || 0});
                                    if (packageErrors.lockPeriodDays) setPackageErrors({...packageErrors, lockPeriodDays: ''});
                                }}
                                className={packageErrors.lockPeriodDays ? 'border-destructive' : ''}
                            />
                            {packageErrors.lockPeriodDays && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {packageErrors.lockPeriodDays}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="apy">APY (Basis Points: 1000 = 10%)</Label>
                            <Input 
                                id="apy" 
                                type="number" 
                                value={packageForm.apyBasisPoints}
                                onChange={(e) => {
                                    setPackageForm({...packageForm, apyBasisPoints: parseInt(e.target.value) || 0});
                                    if (packageErrors.apyBasisPoints) setPackageErrors({...packageErrors, apyBasisPoints: ''});
                                }}
                                className={packageErrors.apyBasisPoints ? 'border-destructive' : ''}
                            />
                            {packageErrors.apyBasisPoints && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {packageErrors.apyBasisPoints}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="enabled" 
                                checked={packageForm.enabled}
                                onCheckedChange={(checked) => setPackageForm({...packageForm, enabled: !!checked})}
                            />
                            <Label htmlFor="enabled">Enabled</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetPackageSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Min Stake Dialog */}
            <Dialog open={isMinStakeDialogOpen} onOpenChange={setIsMinStakeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Minimum Stake Amount</DialogTitle>
                        <DialogDescription>
                            Current token decimals: {selectedContract?.stakeTokenDecimals}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="minAmount">Minimum Amount ({selectedContract?.stakeTokenSymbol})</Label>
                            <Input 
                                id="minAmount" 
                                type="number" 
                                value={minStakeValue}
                                onChange={(e) => {
                                    setMinStakeValue(e.target.value);
                                    if (minStakeError) setMinStakeError('');
                                }}
                                className={minStakeError ? 'border-destructive' : ''}
                            />
                            {minStakeError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {minStakeError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMinStakeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetMinStakeSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Max Stake Dialog */}
            <Dialog open={isMaxStakeDialogOpen} onOpenChange={setIsMaxStakeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Maximum Stake Per User</DialogTitle>
                        <DialogDescription>
                            Set 0 for unlimited. Current token decimals: {selectedContract?.stakeTokenDecimals}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="maxAmount">Maximum Amount ({selectedContract?.stakeTokenSymbol})</Label>
                            <Input 
                                id="maxAmount" 
                                type="number" 
                                value={maxStakeValue}
                                onChange={(e) => {
                                    setMaxStakeValue(e.target.value);
                                    if (maxStakeError) setMaxStakeError('');
                                }}
                                className={maxStakeError ? 'border-destructive' : ''}
                            />
                            {maxStakeError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {maxStakeError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMaxStakeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetMaxStakeSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMaxTotalDialogOpen} onOpenChange={setIsMaxTotalDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Max Total Staked Per Package</DialogTitle>
                        <DialogDescription>
                            Set 0 for unlimited. Applies to each package individually.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="maxTotal">Maximum Amount ({selectedContract?.stakeTokenSymbol})</Label>
                            <Input
                                id="maxTotal"
                                type="number"
                                value={maxTotalValue}
                                onChange={(e) => {
                                    setMaxTotalValue(e.target.value);
                                    if (maxTotalError) setMaxTotalError('');
                                }}
                                className={maxTotalError ? 'border-destructive' : ''}
                            />
                            {maxTotalError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {maxTotalError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMaxTotalDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetMaxTotalSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Withdraw Excess Reward Dialog */}
            <Dialog open={isWithdrawRewardDialogOpen} onOpenChange={setIsWithdrawRewardDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw Excess Reward</DialogTitle>
                        <DialogDescription>
                            Withdraw reward tokens not needed to pay future rewards. Current reward token: {selectedContract?.rewardTokenSymbol}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="withdrawAmount">Amount ({selectedContract?.rewardTokenSymbol})</Label>
                            <Input
                                id="withdrawAmount"
                                type="number"
                                placeholder="0.00"
                                value={withdrawRewardValue}
                                onChange={(e) => {
                                    setWithdrawRewardValue(e.target.value);
                                    if (withdrawRewardError) setWithdrawRewardError('');
                                }}
                                className={withdrawRewardError ? 'border-destructive' : ''}
                            />
                            {withdrawRewardError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {withdrawRewardError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWithdrawRewardDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onWithdrawRewardSubmit} disabled={isWritePending || !withdrawRewardValue}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fund Token Dialog */}
            <Dialog open={isFundTokenDialogOpen} onOpenChange={setIsFundTokenDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fund Contract Token</DialogTitle>
                        <DialogDescription>
                            Deposit token from Admin wallet into selected staking contract.
                            Please approve token spending first.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Token Type</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={fundTokenType === 'reward' ? 'default' : 'outline'}
                                    onClick={() => setFundTokenType('reward')}
                                >
                                    Reward ({selectedContract?.rewardTokenSymbol})
                                </Button>
                                <Button
                                    type="button"
                                    variant={fundTokenType === 'stake' ? 'default' : 'outline'}
                                    onClick={() => setFundTokenType('stake')}
                                >
                                    Stake ({selectedContract?.stakeTokenSymbol})
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fundAmount">
                                Amount ({fundTokenType === 'reward' ? selectedContract?.rewardTokenSymbol : selectedContract?.stakeTokenSymbol})
                            </Label>
                            <Input
                                id="fundAmount"
                                type="number"
                                placeholder="0.00"
                                value={fundTokenValue}
                                onChange={(e) => {
                                    setFundTokenValue(e.target.value);
                                    if (fundTokenError) setFundTokenError('');
                                }}
                                className={fundTokenError ? 'border-destructive' : ''}
                            />
                            {fundTokenError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {fundTokenError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFundTokenDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onFundTokenSubmit} disabled={isWritePending || !fundTokenValue}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {contracts?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Database className="h-12 w-12 opacity-50 mb-4" />
                    <p>No staking contracts found</p>
                </div>
            )}
        </div>
    );
}
