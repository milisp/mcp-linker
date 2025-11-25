import { GlobalDialog } from "@/components/common/GlobalDialog";
import CommandChecker from "@/components/settings/CommandChecker";
import { UpdateChecker } from "@/components/UpdateChecker";
import { ThemeProvider } from "@/components/theme-provider";
import { McpRefreshProvider } from "@/contexts/McpRefreshContext";
import { useDeepLink } from "@/hooks/useDeepLink";
import { useGlobalDialogStore } from "@/stores/globalDialogStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import Layout from "@/components/layout";
import LicenseNag from "@/components/common/LicenseNag";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useDeepLink();
  const { open, type, hideDialog } = useGlobalDialogStore();

  return (
    <QueryClientProvider client={queryClient}>
      <McpRefreshProvider>
        <ThemeProvider storageKey="vite-ui-theme">
          <Layout />
          <GlobalDialog
            open={open}
            type={type || "login"}
            onClose={hideDialog}
          />
          <LicenseNag />
          <UpdateChecker />
        </ThemeProvider>
        <CommandChecker />
      </McpRefreshProvider>
    </QueryClientProvider>
  );
}

export default App;
