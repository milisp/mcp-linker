import { Skeleton } from "@/components/ui/skeleton";
import { ServerType } from "@/types";
import React from "react";
import { useTranslation } from "react-i18next";
import { ServerList } from "../server";

interface InfiniteScrollServersProps {
  servers: ServerType[];
  isLoading: boolean;
  isFetching: boolean;
  hasNext?: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  onLoadMore: () => void;
}

export const InfiniteScrollServers = ({
  servers,
  isLoading,
  isFetching,
  hasNext,
  loadMoreRef,
  onLoadMore,
}: InfiniteScrollServersProps) => {
  const { t } = useTranslation();

  if (servers.length === 0) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400">
        {isLoading || isFetching ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : (
          `${t("noServerTip")}. API is initializing, this may take up to 50 seconds.`
        )}
      </div>
    );
  }

  return (
    <>
      <ServerList mcpServers={servers} />
      <div ref={loadMoreRef} className="p-2 flex justify-center h-32">
        {isFetching && (
          <div className="text-blue-600 dark:text-blue-400">
            {t("loading") + "..."}
          </div>
        )}
        {hasNext && (
          <div className="text-blue-600 dark:text-blue-400">
            <button onClick={onLoadMore}>{t("loadMore")}</button>
          </div>
        )}
      </div>
    </>
  );
};
