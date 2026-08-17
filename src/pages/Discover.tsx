import { HeroBanner } from "@/components/banner";
import { ServerList } from "@/components/server";
import { useMcpServers } from "@/hooks/useMcpServers";
import { Search } from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

type TransportFilter = "all" | "local" | "remote";

const TRANSPORT_FILTERS: { value: TransportFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "local", label: "Local (stdio)" },
  { value: "remote", label: "Remote (HTTP/SSE)" },
];

export default function Discovery() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [transport, setTransport] = useState<TransportFilter>("all");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    servers,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMcpServers({ keyword: deferredSearchTerm });

  const filteredServers = useMemo(() => {
    if (transport === "all") return servers;
    return servers.filter((server) =>
      server.configs?.some((config) =>
        transport === "local"
          ? config.type === "stdio"
          : config.type === "http" || config.type === "sse",
      ),
    );
  }, [servers, transport]);

  // Filtering happens client-side, so a narrow filter can leave too few results
  // to fill the viewport and trigger the scroll sentinel. Keep pulling pages.
  useEffect(() => {
    if (
      transport !== "all" &&
      hasNextPage &&
      !isFetchingNextPage &&
      filteredServers.length < 10
    ) {
      fetchNextPage();
    }
  }, [
    transport,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    filteredServers.length,
  ]);

  // Infinite scrolling
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="p-8 space-y-4">
      <div className="mb-6">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="relative max-w-2xl"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for MCP servers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </form>

        <div className="flex gap-2 mt-3">
          {TRANSPORT_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTransport(value)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                transport === value
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!deferredSearchTerm && <HeroBanner onFeatureClick={() => {}} />}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {deferredSearchTerm
            ? `Search results for "${deferredSearchTerm}"`
            : "MCP Registry"}
        </h2>

        {error && (
          <div className="text-center text-red-600 py-4">
            <p>Failed to load servers from the MCP registry.</p>
            <p className="text-sm mt-1">{(error as Error).message}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">{t("loading") + "..."}</span>
          </div>
        ) : (
          <>
            <ServerList mcpServers={filteredServers} />

            {!error && filteredServers.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <p className="text-lg">No servers found</p>
                {deferredSearchTerm && (
                  <p className="text-sm mt-2">Try a different search term</p>
                )}
              </div>
            )}

            {hasNextPage && (
              <div ref={loadMoreRef} className="p-2 flex justify-center h-10">
                {isFetchingNextPage && (
                  <div className="text-blue-600 dark:text-blue-400">
                    {t("loading") + "..."}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
