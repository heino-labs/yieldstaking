import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
    loginWithEmailPassword,
    getMetaMaskNonce,
    signInWithMetaMask,
    refreshToken as refreshTokenApi,
    logout,
    requestPasswordReset,
    resetPassword,
    getAuthProfile,
} from '@/lib/api/auth';

import { fetchTransactions } from '@/lib/api/transactions';
import { fetchUserProfileWithStats, updateUserProfile, fetchUserStatistics } from '@/lib/api/users';
import { useAuthentication } from '@/hooks/use-authentication';

import type {
    UpdateProfileData,
    LoginRequest,
} from '@/interfaces';

export function useAuthProfile() {
    const { isAuthenticated } = useAuthentication();

    return useQuery({
        queryKey: ['auth', 'profile'],
        queryFn: getAuthProfile,
        staleTime: 5 * 60 * 1000,
        enabled: isAuthenticated,
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
        mutationFn: (walletAddress: string) => getMetaMaskNonce(walletAddress as `0x${string}`),
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

export function useTransactions(params?: { page?: number; limit?: number }) {
    return useQuery({
        queryKey: ['transactions', params],
        queryFn: () => fetchTransactions(params),
        staleTime: 2 * 60 * 1000,
    });
}
