import { useCallback, useMemo } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import { createPublicClientForChain } from '@/lib/blockchain/client';

import { 
    getYieldStakingContractConfig, 
    getAureusContractConfig,
    getMockUsdtContractConfig,
} from '@/lib/blockchain/contracts';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { getChainConfig } from '@/lib/config/chains';

export function useAdminBlockchainActions() {
    const { address } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const stakingConfig = useMemo(() => getYieldStakingContractConfig(chainId), [chainId]);
    const resolveStakingConfig = useCallback(
        (contractAddress?: Address) =>
            contractAddress
                ? {
                      ...stakingConfig,
                      address: contractAddress,
                  }
                : stakingConfig,
        [stakingConfig],
    );

    const { writeContract, data: txHash, isPending: isWritePending, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    const ensureReadyToWrite = useCallback((): Address => {
        if (!address) {
            throw new Error('Please connect your admin wallet');
        }
        if (chainId !== DEFAULT_CHAIN_ID) {
            throw new Error('Please switch to Sepolia network');
        }
        getChainConfig(chainId);
        return address;
    }, [address, chainId]);

    const pause = useCallback(async (contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'pause',
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'pause',
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const unpause = useCallback(async (contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'unpause',
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'unpause',
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const setPackage = useCallback(async (id: number, lockPeriod: bigint, apy: number, enabled: boolean, contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'setPackage',
            args: [id, lockPeriod, apy, enabled],
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'setPackage',
            args: [id, lockPeriod, apy, enabled],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const setMinStakeAmount = useCallback(async (newAmount: bigint, contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'setMinStakeAmount',
            args: [newAmount],
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'setMinStakeAmount',
            args: [newAmount],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const setMaxStakePerUser = useCallback(async (newMax: bigint, contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'setMaxStakePerUser',
            args: [newMax],
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'setMaxStakePerUser',
            args: [newMax],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const setMaxTotalStakedPerPackage = useCallback(async (newMax: bigint, contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'setMaxTotalStakedPerPackage',
            args: [newMax],
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'setMaxTotalStakedPerPackage',
            args: [newMax],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const withdrawExcessReward = useCallback(async (amount: bigint, contractAddress?: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const targetConfig = resolveStakingConfig(contractAddress);
        const simulation = await client.simulateContract({
            ...targetConfig,
            functionName: 'withdrawExcessReward',
            args: [amount],
            account,
        });
        writeContract({
            ...targetConfig,
            functionName: 'withdrawExcessReward',
            args: [amount],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, resolveStakingConfig, writeContract]);

    const transferRewardToken = useCallback(async (amount: bigint, to: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const rewardConfig = getMockUsdtContractConfig(chainId);
        const simulation = await client.simulateContract({
            ...rewardConfig,
            functionName: 'transfer',
            args: [to, amount],
            account,
        });
        writeContract({
            ...rewardConfig,
            functionName: 'transfer',
            args: [to, amount],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, writeContract]);

    const transferStakeToken = useCallback(async (amount: bigint, to: Address) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const stakeConfig = getAureusContractConfig(chainId);
        const simulation = await client.simulateContract({
            ...stakeConfig,
            functionName: 'transfer',
            args: [to, amount],
            account,
        });
        writeContract({
            ...stakeConfig,
            functionName: 'transfer',
            args: [to, amount],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, writeContract]);

    return {
        pause,
        unpause,
        setPackage,
        setMinStakeAmount,
        setMaxStakePerUser,
        setMaxTotalStakedPerPackage,
        withdrawExcessReward,
        transferRewardToken,
        transferStakeToken,
        isWritePending,
        isConfirming,
        isConfirmed,
        txHash,
        reset
    };
}
