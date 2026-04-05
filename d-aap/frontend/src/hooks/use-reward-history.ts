import { useQuery } from '@tanstack/react-query';
import { hasAccountAuth } from '@/lib/auth';
import { fetchRewardHistory } from '@/lib/api/transactions';
import { useUserInfo } from './use-user-info';

export function useRewardHistory(params: { page?: number; limit?: number; walletAddress?: string } = { page: 1, limit: 10 }) {
    const { walletAddress: profileWalletAddress } = useUserInfo();
    const effectiveWalletAddress = params.walletAddress || profileWalletAddress;

    return useQuery({
        queryKey: ['staking', 'rewards', 'history', params, effectiveWalletAddress],
        queryFn: () => fetchRewardHistory({ ...params, walletAddress: effectiveWalletAddress }),
        staleTime: 30 * 1000,
        enabled: hasAccountAuth(),
    });
}
