import { ChevronRight, type LucideIcon } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useMemo, useState, useEffect, useCallback } from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // -------- Active item detection (NO duplicate active) --------
  const activeMap = useMemo(() => {
    const map: Record<string, boolean> = {}

    items.forEach((item) => {
      const isExact = pathname === item.url

      const childMatch = item.items?.find(
        (sub) => pathname === sub.url
      )

      if (isExact || childMatch) {
        map[item.title] = true
      }
    })

    return map
  }, [items, pathname])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    {}
  )

  useEffect(() => {
    setOpenSections(activeMap)
  }, [activeMap])

  const toggleSection = useCallback((title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }, [])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => {
          const isActive = !!activeMap[item.title]
          const isOpen = !!openSections[item.title]
          const hasChildren = !!item.items?.length

          if (hasChildren) {
            return (
              <Collapsible
                key={item.title}
                open={isOpen}
                onOpenChange={() => toggleSection(item.title)}
                asChild
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      className="gap-2"
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span className="flex-1 text-left">
                        {item.title}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((sub) => {
                        const isSubActive =
                          pathname === sub.url

                        return (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton
                              isActive={isSubActive}
                              onClick={() => navigate(sub.url)}
                            >
                              {sub.title}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={pathname === item.url}
                onClick={() => navigate(item.url)}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.title}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}