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

        // Match on host exactly instead of substring `includes()` so an
        // attacker-controlled URL can't smuggle extra path segments or
        // query values that merely contain "install-app" / "servers".
        if (urlObj.host === "install-app") {
          debugLog(`got ${urlObj.pathname + urlObj.search}`);
          navigate(`/install-app${urlObj.pathname + urlObj.search}`, {
            replace: true,
          });
        }

        if (urlObj.host === "servers") {
          // pathname is everything after the host, e.g. "/foo/bar"
          const pathParts = urlObj.pathname.split("/").filter(Boolean);

          let targetPath = "";
          if (pathParts.length === 1) {
            targetPath = `/servers/${pathParts[0]}`;
          } else if (pathParts.length === 2) {
            targetPath = `/servers/${pathParts[0]}/${pathParts[1]}`;
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
