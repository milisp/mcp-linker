import { fetchRegistryServers } from "@/lib/registry";
import { useInfiniteQuery } from "@tanstack/react-query";

/**
 * Paginated list of MCP servers from the official registry.
 * The registry uses cursor pagination, so pages are accumulated by the query.
 */
export function useMcpServers({
  keyword = "",
  pageSize = 30,
}: { keyword?: string; pageSize?: number } = {}) {
  const query = useInfiniteQuery({
    queryKey: ["registry-servers", keyword, pageSize],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchRegistryServers({
        cursor: pageParam,
        search: keyword || undefined,
        limit: pageSize,
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    ...query,
    servers: query.data?.pages.flatMap((p) => p.servers) ?? [],
  };
}
