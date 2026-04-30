import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/ui/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { useTier } from "@/hooks/useTier"
import { cn } from "@/lib/utils"
import { getNavigationRoutes } from "@/routes"
import { signOut } from "@/services/auth"
import { useViewStore } from "@/stores/viewStore"
import { openUrl } from '@tauri-apps/plugin-opener'
import { platform } from "@tauri-apps/plugin-os"
import { ExternalLink, User } from "lucide-react"
import { useTranslation } from "react-i18next"

export const AppSidebar = () => {
  const { t } = useTranslation<"translation">()
  const navs = getNavigationRoutes(t as any);
  const { view, navigate } = useViewStore()
  const { user } = useAuth()
  const { tier } = useTier()
  const platformName = platform()
  const isMacOS = platformName === "macos"
  const { open } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        data-tauri-drag-region
        className={cn(isMacOS && "min-h-11 pt-3")}
      >
        {!isMacOS && <SidebarTrigger />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navs.map((nav) => (
            <SidebarMenuItem key={nav.id}>
              <SidebarMenuButton
                isActive={view === nav.id}
                onClick={() => navigate(`/${nav.id}`)}
              >
                {open ? nav.icon : <span className="text-xl">{nav.icon}</span>}
                <span>{nav.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <span className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left rounded-md hover:bg-accent hover:text-accent-foreground">
                  <User className="w-4 h-4" />
                  {open && <span>
                    {user?.user_metadata.full_name ||
                      user?.user_metadata.user_name ||
                      user?.user_metadata.email?.slice(0, 2) ||
                      t("guest")}
                  </span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem
                  onClick={() => openUrl("https://github.com/milisp/mcp-linker/issues")}
                >
                  <span>{t("feedback")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/about")}
                >
                  <span>{t("nav.about")} MCP Linker</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user?.email ? (<>
                  <DropdownMenuItem>
                    <span className="truncate text-muted-foreground">{user.email}</span>
                  </DropdownMenuItem>
                  {tier === 'FREE' &&
                    <DropdownMenuItem onClick={() => openUrl('https://mcp-linker.milisp.dev/pricing')}>
                      <span>Upgrade Plan</span> <ExternalLink />
                    </DropdownMenuItem>
                  }
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/auth")}>
                    Login
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  {t("nav.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user && (
                  <DropdownMenuItem onClick={() => signOut()}>
                    Logout
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {open && <ModeToggle />}
            </span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
