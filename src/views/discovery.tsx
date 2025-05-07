import { ServerList } from "@/components/server/server-list";
import { ServerTemplateDialog } from "@/components/server/ServerTemplateDialog";
import { fetchServers } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";


interface Props {
  selectedClient: string;
  selectedPath: string;
}

export default function Discovery({ selectedClient, selectedPath }: Props) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["servers"], // Add page number to query key
    queryFn: () => fetchServers(),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    refetchOnWindowFocus: false, // Prevent refetching on window focus
  });

  if (isLoading) {
    return <div className="p-8">Loading servers...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100 sr-only">
        {t("categories.discover")}
      </h1>
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 mb-8">
        <div className="p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">{t("featured.title")}</h2>
          <p className="text-lg mb-4">{t("featured.description")}</p>
          <button className="px-4 py-2 rounded-full font-semibold bg-white text-blue-600 border border-blue-600 shadow-sm hover:bg-blue-50 dark:bg-gray-900 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-800">
            {t("featured.button")}
          </button>
        </div>
        <div className="absolute right-8 bottom-8 w-32 h-32 bg-white/20 rounded-xl backdrop-blur-sm"></div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("featuredServers")}
        </h2>
        <button 
          onClick={() => setIsDialogOpen(true)}
        className="px-4 py-2 rounded-full font-semibold bg-white text-blue-600 border border-blue-600 shadow-sm hover:bg-blue-50 dark:bg-gray-900 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-800">
          {t("addCustomServer")}
        </button>
      </div>

      {/* Featured apps */}
      {!data?.servers ? (
        <div className="p-8">No servers available</div>
      ) : (
        <ServerList
          selectedClient={selectedClient}
          selectedPath={selectedPath}
          mcpServers={data.servers}
        />
      )}

      <ServerTemplateDialog
          isOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          selectedClient={selectedClient}
          selectedPath={selectedPath}
        />
    </div>
  );
}
