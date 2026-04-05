import { useQuery } from '@tanstack/react-query';
import { hasAccountAuth } from '@/lib/auth';
import { fetchRewardHistory } from '@/lib/api/transactions';

export function useRewardHistory(params: { page?: number; limit?: number } = { page: 1, limit: 10 }) {
    return useQuery({
        queryKey: ['staking', 'rewards', 'history', params],
        queryFn: () => fetchRewardHistory(params),
        staleTime: 30 * 1000,
        enabled: hasAccountAuth(),
    });
}
