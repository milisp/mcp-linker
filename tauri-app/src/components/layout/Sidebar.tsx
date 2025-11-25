import { FoldersTab } from "@/components/layout/FoldersTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/types";
import { Folder, FolderTree, MessageCircle, Navigation, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChatTab } from "../chat/ChatTab";
import { FileTree } from "../filetree";
import { ModeToggle } from "../ui/mode-toggle";

interface SidebarProps {
  navs: Nav[];
  isCollapsed: boolean;
  onTabChange?: (tab: string) => void;
}

export const Sidebar = ({ navs, isCollapsed, onTabChange }: SidebarProps) => {
  const { t } = useTranslation<"translation">();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("navigation");

  const { user } = useAuth();

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === "files") {
      navigate("/chat");
    }
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleSwitchToFilesTab = () => {
    setCurrentTab("files");
    navigate("/chat");
  };

  if (isCollapsed) {
    // Collapsed view - show only navigation buttons
    return (
      <div className="flex flex-col justify-between h-screen bg-background border-r px-2 transition-all duration-300 w-12">
        <div>
          <div className="flex flex-col gap-1">
            {navs.map((nav) => (
              <Link
                key={nav.id}
                to={nav.path || `/${nav.id}`}
                className="w-full"
              >
                <Button
                  variant={
                    location.pathname === (nav.path || `/${nav.id}`)
                      ? "secondary"
                      : "ghost"
                  }
                  className="w-full justify-center p-2"
                >
                  <span className="text-xl">{nav.icon}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* user info */}
        <div className="flex items-center justify-center mb-12">
          <Link
            to={user ? "/dashboard" : "/auth"}
            className="flex items-center justify-center"
          >
            {user?.user_metadata.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                className="rounded-full w-6 h-6"
              />
            ) : (
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="w-4 h-4" />
              </div>
            )}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background border-r transition-all duration-300 w-56">
      <Tabs
        value={currentTab}
        className="flex flex-col h-full min-h-0"
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-4 shrink-0">
          <TabsTrigger value="navigation" className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            <span className="text-xs">Nav</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="folders" className="flex items-center gap-1">
            <Folder className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1">
            <FolderTree className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="navigation"
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 px-2 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {navs.map((nav) => (
                <Link
                  key={nav.id}
                  to={nav.path || `/${nav.id}`}
                  className="w-full"
                >
                  <Button
                    variant={
                      location.pathname === (nav.path || `/${nav.id}`)
                        ? "secondary"
                        : "ghost"
                    }
                    className="w-full justify-start p-2"
                  >
                    <span className="text-xl">{nav.icon}</span>
                    <span>{nav.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* User info - Only shown in navigation tab */}
          <div className="shrink-0 flex items-center gap-3 mb-12 border-t">
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="flex items-center gap-3 flex-grow min-w-0"
            >
              {user?.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  className="rounded-full w-6 h-6 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="w-4 h-4" />
                </div>
              )}
              <p className="font-medium text-sm truncate">
                {user?.user_metadata.full_name ||
                  user?.user_metadata.user_name ||
                  user?.user_metadata.email?.slice(0, 2) ||
                  t("guest")}
              </p>
            </Link>
            <div className="shrink-0">
              <ModeToggle />
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="chat"
          className="flex-1 flex flex-col mt-0 min-h-0"
        >
          <ChatTab />
        </TabsContent>

        <TabsContent
          value="folders"
          className="flex-1 flex flex-col mt-0 min-h-0"
        >
          <div className="flex-1 min-h-0">
            <FoldersTab onSwitchToFilesTab={handleSwitchToFilesTab} />
          </div>
        </TabsContent>

        <TabsContent
          value="files"
          className="flex-1 flex flex-col mt-0 min-h-0"
        >
          <div className="flex-1 min-h-0">
            <FileTree />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
