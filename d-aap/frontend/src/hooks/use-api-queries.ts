import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
    loginWithEmailPassword,
    registerWithEmailPassword,
    getMetaMaskNonce,
    signInWithMetaMask,
    refreshToken as refreshTokenApi,
    logout,
    requestPasswordReset,
    resetPassword,
    getAuthProfile,
} from '@/lib/api/auth';

import {
    fetchTransactions,
    fetchTransactionSummary,
    fetchRewardHistory,
    fetchRewardSummary,
} from '@/lib/api/transactions';
import { fetchUserProfileWithStats, updateUserProfile, fetchUserStatistics, linkWallet as linkWalletApi } from '@/lib/api/users';
import { useAuthentication } from '@/hooks/use-authentication';

import type {
    UpdateProfileData,
    LoginRequest,
    RegisterRequest,
} from '@/interfaces';

export function useLinkWallet() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { walletAddress: string; signature: string; message: string }) =>
            linkWalletApi(data.walletAddress, data.signature, data.message),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
            void queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
            toast.success('Wallet linked successfully');
        },
    });
}

export function useAuthProfile() {
    const { isAuthenticated } = useAuthentication();

    return useQuery({
        queryKey: ['auth', 'profile'],
        queryFn: getAuthProfile,
        staleTime: 30 * 1000,
        enabled: isAuthenticated,
        refetchOnMount: 'always',
    });
}

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: LoginRequest) => loginWithEmailPassword(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['auth'] });
            void queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
}

export function useRegister() {
    return useMutation({
        mutationFn: (data: RegisterRequest) => registerWithEmailPassword(data),
    });
}

export function useMetaMaskAuth() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { walletAddress: `0x${string}`; signature: string; message: string }) =>
            signInWithMetaMask(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['auth'] });
            void queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
}

export function useGetMetaMaskNonce() {
    return useMutation({
        mutationFn: () => getMetaMaskNonce(),
    });
}

export function useRefreshToken() {
    return useMutation({
        mutationFn: (refreshToken: string) => refreshTokenApi(refreshToken),
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (refreshToken: string) => logout(refreshToken),
        onSuccess: () => {
            queryClient.clear();
        },
    });
}

export function useRequestPasswordReset() {
    return useMutation({
        mutationFn: (email: string) => requestPasswordReset(email),
        onSuccess: () => {
            toast.success('Password reset link sent to your email');
        },
    });
}

export function useResetPassword() {
    return useMutation({
        mutationFn: (data: { token: string; newPassword: string }) => resetPassword(data),
        onSuccess: () => {
            toast.success('Password reset successfully');
        },
    });
}

export function useUserProfile() {
    return useQuery({
        queryKey: ['user', 'profile'],
        queryFn: fetchUserProfileWithStats,
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateProfileData) => updateUserProfile(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['user'] });
            toast.success('Profile updated successfully');
        },
    });
}

export function useUserStatistics() {
    return useQuery({
        queryKey: ['user', 'statistics'],
        queryFn: fetchUserStatistics,
        staleTime: 5 * 60 * 1000,
    });
}

export function useTransactions(params?: { page?: number; limit?: number; walletAddress?: string }) {
    return useQuery({
        queryKey: ['transactions', params],
        queryFn: () => fetchTransactions(params),
        staleTime: 2 * 60 * 1000,
    });
}

export function useTransactionSummary(walletAddress?: string) {
    return useQuery({
        queryKey: ['transactions', 'summary', walletAddress],
        queryFn: () => fetchTransactionSummary(walletAddress),
        staleTime: 2 * 60 * 1000,
    });
}

export function useRewardHistory(params?: { page?: number; limit?: number; walletAddress?: string }) {
    return useQuery({
        queryKey: ['rewards', 'history', params],
        queryFn: () => fetchRewardHistory(params),
        staleTime: 2 * 60 * 1000,
    });
}

export function useRewardSummary(walletAddress?: string) {
    return useQuery({
        queryKey: ['rewards', 'summary', walletAddress],
        queryFn: () => fetchRewardSummary(walletAddress),
        staleTime: 2 * 60 * 1000,
    });
}
