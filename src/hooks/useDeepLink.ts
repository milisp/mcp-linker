import { useViewStore } from "@/stores/viewStore";
import { listen } from "@tauri-apps/api/event";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function debugLog(msg: string) {
  if (import.meta.env.VITE_IS_DEV === "true") {
    alert(msg);
  }
}

const processedUrls = new Set<string>();

// useDeepLink hook: handles deep link authentication and navigation
export const useDeepLink = () => {
  const { navigate } = useViewStore();
  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);

  useEffect(() => {
    const handleUrl = async (urls: string[] | string) => {
      const url = Array.isArray(urls) ? urls[0] : urls;
      try {
        if (processedUrls.has(url)) {
          // return;
        }
        processedUrls.add(url);

        setIsHandlingDeepLink(true);
        const urlObj = new URL(url);

        if (url.includes("install-app")) {
          const urlObj = new URL(url);
          debugLog(`got ${urlObj.pathname + urlObj.search}`);
          navigate(`/install-app${urlObj.pathname + urlObj.search}`, {
            replace: true,
          });
        }

        if (url.includes("/servers/")) {
          const pathParts = urlObj.pathname.split("/").filter(Boolean);
          const serversIndex = pathParts.indexOf("servers");
          const afterServers = pathParts.slice(serversIndex + 1);

          let targetPath = "";
          if (afterServers.length === 1) {
            targetPath = `/servers/${afterServers[0]}`;
          } else if (afterServers.length === 2) {
            targetPath = `/servers/${afterServers[0]}/${afterServers[1]}`;
          }

          if (urlObj.search) {
            targetPath += urlObj.search;
          }

          navigate(targetPath, { replace: true });
        }

      } catch (err) {
        processedUrls.delete(url);
        toast.error(`Failed to handle link: ${err}`);
      } finally {
        setIsHandlingDeepLink(false);
      }
    };

    onOpenUrl((urls) => handleUrl(urls));

    // Listen to Tauri emit events
    const unlistenPromise = listen<string>("deep-link-received", (event) => {
      handleUrl(event.payload);
    });

    return () => {
      unlistenPromise.then((un) => un());
    };
  }, [navigate]);

  return isHandlingDeepLink;
};
