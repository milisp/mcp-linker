import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  activateLicense,
  deactivateLicense,
  type LicenseStatus,
  PRICING_URL,
} from "@/lib/license";
import { useLicense } from "@/stores/license";
import { openUrl } from "@tauri-apps/plugin-opener";
import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function LicenseCard() {
  const { t } = useTranslation();
  const status = useLicense(state => state.status);
  const setStatus = useLicense(state => state.setStatus);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    useLicense.getState().load().catch(error => toast.error(String(error)));
  }, []);

  const run = async (action: () => Promise<LicenseStatus>, success: string) => {
    setBusy(true);
    try {
      setStatus(await action());
      setKey("");
      toast.success(success);
    } catch (error) {
      // Commands reject with a user-facing message from license.rs.
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          {t("license.title")}
        </CardTitle>
        <CardDescription>
          {status?.licensed ? t("license.active") : t("license.inactive")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.licensed ? (
          <div className="flex items-center justify-between gap-4">
            <code className="text-sm">{status.displayKey}</code>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(deactivateLicense, t("license.deactivated"))}
            >
              {t("license.deactivate")}
            </Button>
          </div>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={event => {
              event.preventDefault();
              run(() => activateLicense(key), t("license.activated"));
            }}
          >
            <Input
              value={key}
              onChange={event => setKey(event.target.value)}
              placeholder={t("license.placeholder")}
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit" disabled={busy || !key.trim()}>
              {t("license.activate")}
            </Button>
          </form>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {status?.deviceId && t("license.device", { id: status.deviceId })}
          </span>
          {!status?.licensed && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => openUrl(PRICING_URL)}>
              {t("license.buy")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
