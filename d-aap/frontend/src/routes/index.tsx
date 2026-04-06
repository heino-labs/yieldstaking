import { type RouteObject } from 'react-router-dom';

import ProtectedRoute from '@/components/auth/protected-route';
import AppLayout from '@/components/layout/app-layout';
import { RoleBasedRedirect } from '@/components/auth/role-based-redirect';
import { lazyWithRetry as lazy } from '@/lib/utils/lazy-with-retry';

// Public pages
const HomePage = lazy(() => import('@/pages/home'));

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/login'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/callback'));
const AuthErrorPage = lazy(() => import('@/pages/auth/error'));

// User pages (Aureus)
const AureusPage = lazy(() => import('@/pages/aureus/aureus'));
const YieldStakingPage = lazy(() => import('@/pages/aureus/yield-staking'));
const WithdrawalsPage = lazy(() => import('@/pages/aureus/withdrawals'));
const StakeHistoryPage = lazy(() => import('@/pages/aureus/stake-history'));
const RewardHistoryPage = lazy(() => import('@/pages/aureus/reward-history'));

// Management pages
const ManagementDashboardPage = lazy(() => import('@/pages/management/index'));
const ManagementUsersPage = lazy(() => import('@/pages/management/users'));
const ManagementPositionsPage = lazy(() => import('@/pages/management/positions'));
const ManagementTransactionsPage = lazy(() => import('@/pages/management/transactions'));

// Network pages
const NetworkDashboardPage = lazy(() => import('@/pages/network/index'));
const NetworkContractsPage = lazy(() => import('@/pages/network/setup'));
const NetworkBlockchainPage = lazy(() => import('@/pages/network/monitor'));

// Error pages
const NotFoundPage = lazy(() => import('@/pages/not-found'));

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute>{children}</ProtectedRoute>
);

const AdminPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>
);

export const routes: RouteObject[] = [
    {
        path: '/',
        element: <HomePage />,
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
    {
        path: '/auth/callback',
        element: <AuthCallbackPage />,
    },
    {
        path: '/auth/error',
        element: <AuthErrorPage />,
    },
    {
        path: '/app',
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: (
                    <ProtectedRoute>
                        <RoleBasedRedirect />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'aureus',
                element: (
                    <ProtectedPage>
                        <AureusPage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'stake',
                element: (
                    <ProtectedPage>
                        <YieldStakingPage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'withdrawals',
                element: (
                    <ProtectedPage>
                        <WithdrawalsPage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'stake-history',
                element: (
                    <ProtectedPage>
                        <StakeHistoryPage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'reward-history',
                element: (
                    <ProtectedPage>
                        <RewardHistoryPage />
                    </ProtectedPage>
                ),
            },
            // Management routes
            {
                path: 'management',
                children: [
                    {
                        index: true,
                        element: (
                            <AdminPage>
                                <ManagementDashboardPage />
                            </AdminPage>
                        ),
                    },
                    {
                        path: 'users',
                        element: (
                            <AdminPage>
                                <ManagementUsersPage />
                            </AdminPage>
                        ),
                    },
                    {
                        path: 'positions',
                        element: (
                            <AdminPage>
                                <ManagementPositionsPage />
                            </AdminPage>
                        ),
                    },
                    {
                        path: 'transactions',
                        element: (
                            <AdminPage>
                                <ManagementTransactionsPage />
                            </AdminPage>
                        ),
                    },
                ],
            },
            // Network routes
            {
                path: 'network',
                children: [
                    {
                        index: true,
                        element: (
                            <AdminPage>
                                <NetworkDashboardPage />
                            </AdminPage>
                        ),
                    },
                    {
                        path: 'setup',
                        element: (
                            <AdminPage>
                                <NetworkContractsPage />
                            </AdminPage>
                        ),
                    },
                    {
                        path: 'monitor',
                        element: (
                            <AdminPage>
                                <NetworkBlockchainPage />
                            </AdminPage>
                        ),
                    },
                ],
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
];
