import { Button } from "@/components/ui/button";
import { homePageUrl } from "@/constants/home-page-url";
import { openUrl } from "@tauri-apps/plugin-opener";

export function UpgradePlanButton() {
  return (
    <Button
      onClick={() => {
        openUrl(homePageUrl + "/pricing");
      }}
      size="sm"
      variant="secondary"
      className="flex ml-auto text-purple-400 rounded-5"
    >
      + upgrade your plan
    </Button>
  );
}
