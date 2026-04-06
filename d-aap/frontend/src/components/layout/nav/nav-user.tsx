import { User, Lock, Bell, LogOut } from "lucide-react"
import { useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useDisconnect } from "wagmi"

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from "@/components/ui/sidebar"

import { useAuthentication } from "@/hooks/use-authentication"
import { useUserInfo } from "@/hooks/use-user-info"
import { hasAccountAuth } from "@/lib/auth"

import { AccountSettingsModal } from "../../profile/account-settings-modal"
import { ChangePasswordModal } from "../../profile/change-password-modal"
import { MENU_ITEMS } from "../../profile/profile-constants"
import { UserAvatar } from "../../profile/user-avatar"

const iconMap = { User, Lock, Bell } as const

export function NavUser() {
    const { isMobile } = useSidebar()
    const navigate = useNavigate()
    const { disconnect } = useDisconnect()
    const { signOut } = useAuthentication()
    const userInfo = useUserInfo()

    const [settingsOpen, setSettingsOpen] = useState(false)
    const [passwordOpen, setPasswordOpen] = useState(false)

    const roleLabel = useMemo(() => {
        return userInfo.role && userInfo.role !== "GUEST"
            ? userInfo.role
            : "USER"
    }, [userInfo.role])

    const handleLogout = useCallback(() => {
        signOut()
        if (!hasAccountAuth()) disconnect()
        navigate("/login")
    }, [disconnect, navigate, signOut])

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg">
                                <UserAvatar
                                    avatar={userInfo.avatar}
                                    name={userInfo.name}
                                    size="sm"
                                />

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {userInfo.name}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {roleLabel}
                                    </span>
                                </div>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            align="start"
                            side={isMobile ? "bottom" : "top"}
                            sideOffset={8}
                            className="w-56"
                        >
                            <DropdownMenuLabel>
                                {userInfo.name}
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuGroup>
                                {MENU_ITEMS.map((item) => {
                                    const Icon = iconMap[item.icon]

                                    return (
                                        <DropdownMenuItem
                                            key={item.id}
                                            onClick={() => {
                                                if (item.path) navigate(item.path)
                                                else if (item.id === "account")
                                                    setSettingsOpen(true)
                                                else if (item.id === "change-password")
                                                    setPasswordOpen(true)
                                            }}
                                        >
                                            <Icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>

            {settingsOpen && (
                <AccountSettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            {passwordOpen && (
                <ChangePasswordModal
                    isOpen={passwordOpen}
                    onClose={() => setPasswordOpen(false)}
                />
            )}
        </>
    )
}