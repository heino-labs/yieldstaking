import { GalleryVerticalEnd, Sparkles, Shield, Cpu } from 'lucide-react';
import * as React from 'react';

import { TeamSwitcher } from '@/components/common';
import { NavMain } from '@/components/layout/nav/nav-main';
import { NavUser } from '@/components/layout/nav/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from '@/components/ui/sidebar';
import { useAuthProfile } from '@/hooks/use-api-queries';

const teams = [
    {
        name: 'Yield Staking',
        logo: GalleryVerticalEnd,
        plan: 'Platform',
    },
];

const userNavItems = [
    {
        title: 'Yield Staking',
        url: '/app/yield-staking',
        icon: Sparkles,
        items: [
            {
                title: 'Stake',
                url: '/app/stake',
            },
            {
                title: 'Withdrawals',
                url: '/app/withdrawals',
            },
            {
                title: 'Stake History',
                url: '/app/stake-history',
            },
            {
                title: 'Claim History',
                url: '/app/reward-history',
            },
        ],
    },
];

const adminNavItems = [
    {
        title: 'Platform Management',
        url: '/app/management',
        icon: Shield,
        items: [
            {
                title: 'Dashboard',
                url: '/app/management',
            },
            {
                title: 'Users',
                url: '/app/management/users',
            },
            {
                title: 'Positions',
                url: '/app/management/positions',
            },
            {
                title: 'Transactions',
                url: '/app/management/transactions',
            },
        ],
    },
    {
        title: 'Network Config',
        url: '/app/network',
        icon: Cpu,
        items: [
            {
                title: 'Monitor',
                url: '/app/network/monitor',
            },
            {
                title: 'Setup',
                url: '/app/network/setup',
            },
        ],
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: profile, isLoading: isProfileLoading } = useAuthProfile();
    const isAdmin = profile?.role === 'ADMIN';

    const navItems = React.useMemo(() => {
        if (isProfileLoading && !profile) {
            return [];
        }

        return isAdmin ? adminNavItems : userNavItems;
    }, [isAdmin, isProfileLoading, profile]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
