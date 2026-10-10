import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppRoutes } from "@/routes";
import { useViewStore } from "@/stores/viewStore";
import { platform } from "@tauri-apps/plugin-os";
import { useState } from "react";
import { Toaster } from "sonner";
import { ClientSelector } from "../settings/client-selector";
import { InstallationScope } from "../settings/InstallationTarget";

const Layout = () => {
  const isMacOS = platform() === "macos";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { view } = useViewStore();

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar />

      <SidebarInset>
        {/* Main vertical layout: top bar, main content, status bar */}
        <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            <header
              data-tauri-drag-region
              className="flex shrink-0 items-center gap-2 p-2"
            >
                <SidebarTrigger
                  className={isMacOS && !sidebarOpen ? "ml-8 shrink-0" : "shrink-0"}
                />
              {!["auth", "notes", "about", "settings"].includes(view) && <><ClientSelector /><InstallationScope /></>}
            </header>

          <main className="flex-1 overflow-auto">
            <AppRoutes />
          </main>

          <Toaster position="top-center" richColors />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
