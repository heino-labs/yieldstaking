import { useQuery } from '@tanstack/react-query';
import { hasAccountAuth } from '@/lib/auth';

import {
    fetchStakingContracts,
    fetchStakingContract,
    fetchStakingPackages,
    fetchMyPositions,
    fetchMySummary,
    fetchGlobalStatistics,
    fetchLeaderboard,
} from '@/lib/api/staking';

export function useStakingContracts(chainId?: number) {
    return useQuery({
        queryKey: ['staking', 'contracts', chainId],
        queryFn: () => fetchStakingContracts(chainId),
        staleTime: 60 * 1000,
    });
}

export function useStakingContract(id: number) {
    return useQuery({
        queryKey: ['staking', 'contracts', id],
        queryFn: () => fetchStakingContract(id),
        staleTime: 60 * 1000,
        enabled: !!id,
    });
}

export function useStakingPackages(contractId?: number) {
    return useQuery({
        queryKey: ['staking', 'packages', contractId],
        queryFn: () => fetchStakingPackages(contractId),
        staleTime: 60 * 1000,
    });
}

export function useMyPositions(params?: { page?: number; limit?: number; walletAddress?: string }) {
    return useQuery({
        queryKey: ['staking', 'positions', 'my', params],
        queryFn: () => fetchMyPositions(params),
        staleTime: 30 * 1000,
        enabled: hasAccountAuth(),
    });
}

export function useMySummary(walletAddress?: string) {
    return useQuery({
        queryKey: ['staking', 'summary', 'my', walletAddress],
        queryFn: () => fetchMySummary(walletAddress),
        staleTime: 30 * 1000,
        enabled: hasAccountAuth(),
    });
}

export function useGlobalStatistics() {
    return useQuery({
        queryKey: ['staking', 'statistics', 'global'],
        queryFn: fetchGlobalStatistics,
        staleTime: 60 * 1000,
    });
}

export function useLeaderboard(limit?: number) {
    return useQuery({
        queryKey: ['staking', 'leaderboard', limit],
        queryFn: () => fetchLeaderboard(limit),
        staleTime: 60 * 1000,
    });
}
