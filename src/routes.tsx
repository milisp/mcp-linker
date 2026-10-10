import ClaudeCodeManage from "@/pages/ClaudeCodeManage";
import Discover from "@/pages/Discover";
import Manage from "@/pages/manage";
import NotesPage from "@/pages/NotesPage";
import { ServerPage } from "@/pages/ServerPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  Code,
  LayoutDashboard,
  NotebookPen,
  FileInput,
  Search,
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
      return <Manage />;
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
      return <Discover />;
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
      id: "install-app",
      name: "Import Configuration",
      icon: <FileInput />,
    },
  ];
};
