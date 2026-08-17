import ClaudeCodeManage from "@/pages/ClaudeCodeManage";
import Discover from "@/pages/Discover";
import Favorites from "@/pages/favorites";
import Manage from "@/pages/manage";
import NotesPage from "@/pages/NotesPage";
import Recently from "@/pages/recently";
import { ServerPage } from "@/pages/ServerPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  Clock,
  Code,
  LayoutDashboard,
  NotebookPen,
  PlusCircle,
  Search,
  Star
} from "lucide-react";
import About from "./pages/About";
import { InstallAppPage } from "./pages/InstallApp";
import { useViewStore } from "./stores/viewStore";

export const AppRoutes = () => {
  const { view } = useViewStore();

  switch (view) {
    case "discover":
      return <Discover />;
    case "manage":
      return <Manage />;
    case "claude-code-manage":
      return <ClaudeCodeManage />;
    case "recently":
      return <Recently />;
    case "settings":
      return <SettingsPage />;
    case "about":
      return <About />;
    case "server":
      return <ServerPage />;
    case "install-app":
      return <InstallAppPage />;
    case "notes":
      return <NotesPage />;
    case "favorites":
      return <Favorites />;
    default:
      return <Discover />;
  }
};

// Route configuration for navigation
export const getNavigationRoutes = (
  t: (key: string, options?: any) => string,
) => {
  return [
    {
      id: "discover",
      name: t("nav.discover"),
      icon: <Search />,
    },
    {
      id: "manage",
      name: t("nav.manage"),
      icon: <LayoutDashboard />,
    },
    {
      id: "notes",
      name: "Notes",
      icon: <NotebookPen />,
    },
    {
      id: "claude-code-manage",
      name: "Claude Code",
      icon: <Code />,
    },
    {
      id: "recently",
      name: t("nav.recentlyAdded"),
      icon: <Clock />,
    },
    {
      id: "favorites",
      name: t("nav.favs"),
      icon: <Star />,
    },
    {
      id: "install-app",
      name: t("nav.installapp"),
      icon: <PlusCircle />,
    },
  ];
};
