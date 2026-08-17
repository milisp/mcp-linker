import { ServerList } from "@/components/server";
import { useFavoriteServers } from "@/stores/favoriteServers";

export default function FavoritesPage() {
  const favoriteServers = useFavoriteServers((s) => s.favoriteServers);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Favorites</h1>
      {favoriteServers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No favorite servers yet
        </div>
      ) : (
        <ServerList mcpServers={favoriteServers} />
      )}
    </div>
  );
}
