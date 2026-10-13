import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRICING_URL } from "@/lib/license";
import { useLicense } from "@/stores/license";
import { useViewStore } from "@/stores/viewStore";
import { openUrl } from "@tauri-apps/plugin-opener";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

export function UpgradeDialog() {
  const { t } = useTranslation();
  const feature = useLicense(state => state.upgradeFor);
  const close = useLicense(state => state.closeUpgrade);
  const navigate = useViewStore(state => state.navigate);

  return (
    <Dialog open={feature !== null} onOpenChange={open => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {feature && t(`upgrade.features.${feature}`)}
          </DialogTitle>
          <DialogDescription>{t("upgrade.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              close();
              navigate("/settings?section=license");
            }}
          >
            {t("upgrade.enterKey")}
          </Button>
          <Button onClick={() => openUrl(PRICING_URL)}>{t("upgrade.buy")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
