import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn } from "@/lib/utils"
import { getNavigationRoutes } from "@/routes"
import { useViewStore } from "@/stores/viewStore"
import { openUrl } from '@tauri-apps/plugin-opener'
import { platform } from "@tauri-apps/plugin-os"
import { Info, MessageCircle, Settings, User } from "lucide-react"
import { useTranslation } from "react-i18next"

export const AppSidebar = () => {
  const { t } = useTranslation<"translation">()
  const navs = getNavigationRoutes(t as any);
  const { view, navigate } = useViewStore()
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
                  {open && <span>{t("guest")}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings />
                  {t("nav.settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openUrl("https://github.com/milisp/mcp-linker/issues")}
                >
                  <MessageCircle />
                  <span>{t("feedback")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/about")}
                >
                  <Info />
                  <span>{t("nav.about")} MCP Linker</span>
                </DropdownMenuItem>
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
