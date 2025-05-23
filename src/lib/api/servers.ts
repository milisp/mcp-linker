import { api } from "@/lib/api";
import { toast } from "sonner";

function buildQueryParams(
  params: Record<string, string | null | undefined>,
): URLSearchParams {
  // Filter out null and empty string values to avoid invalid query params
  const filtered = Object.entries(params).filter(
    ([, value]) => value != null && value !== "",
  );
  return new URLSearchParams(
    Object.fromEntries(filtered) as Record<string, string>,
  );
}

export async function fetchServers(
  page: number = 1,
  page_size: number = 10,
  category_id: string | null = null,
  searchTerm = "",
  sort: string = "github_stars",
  direction: string = "desc",
  developer: string | null = null,
) {
  const params = buildQueryParams({
    page: page.toString(),
    page_size: page_size.toString(),
    category_id,
    search: searchTerm,
    sort,
    direction,
    developer,
  });

  const path = `/servers/?${params.toString()}`;

  console.log('API Request:', { path, params: Object.fromEntries(params) });

  try {
    // Try API with timeout (5s for search)
    const response = await api.get(path, { timeout: 5000 });
    console.log('API Response:', response.data);
    
    // Ensure we always return a valid structure
    return {
      servers: response.data?.servers || [],
      hasNext: response.data?.hasNext || false,
      total: response.data?.total || 0,
      ...response.data
    };
  } catch (err) {
    console.error('API Error:', err);
    toast.error(
      "Failed to fetch servers: " +
        (err instanceof Error ? err.message : String(err)),
    );
    
    // Return empty result structure instead of null
    return {
      servers: [],
      hasNext: false,
      total: 0
    };
  }
}

export async function updateServerStats(path: string, serverId: number) {
  try {
    const response = await api.post(`/servers/${serverId}${path}`);
    console.log("Stats updated:", response.data);
  } catch (error) {
    console.error("Error updating server stats:", error);
  }
}

export async function incrementViews(serverId: number) {
  await updateServerStats("/views", serverId);
}

export async function incrementDownloads(serverId: number) {
  await updateServerStats("/downloads", serverId);
}
