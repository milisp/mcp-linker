import CommandChecker from "@/components/settings/CommandChecker";
import { UpdateChecker } from "@/components/UpdateChecker";
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

  return (
    <QueryClientProvider client={queryClient}>
      <McpRefreshProvider>
        <ThemeProvider storageKey="vite-ui-theme">
          <Layout />
          <UpdateChecker />
        </ThemeProvider>
        <CommandChecker />
      </McpRefreshProvider>
    </QueryClientProvider>
  );
}

export default App;
