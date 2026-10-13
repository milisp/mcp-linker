import CommandChecker from "@/components/settings/CommandChecker";
import { UpdateChecker } from "@/components/UpdateChecker";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useLicense } from "@/stores/license";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { McpRefreshProvider } from "@/contexts/McpRefreshContext";
import { useDeepLink } from "@/hooks/useDeepLink";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import Layout from "@/components/layout";

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
  useEffect(() => {
    useLicense.getState().load().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <McpRefreshProvider>
        <ThemeProvider storageKey="vite-ui-theme">
          <Layout />
          <UpdateChecker />
          <UpgradeDialog />
        </ThemeProvider>
        <CommandChecker />
      </McpRefreshProvider>
    </QueryClientProvider>
  );
}

export default App;
