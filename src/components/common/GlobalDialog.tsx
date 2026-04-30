import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViewStore } from "@/stores/viewStore";
import { UpgradePlanButton } from "./UpgradePlanButton";

/**
 * GlobalDialog for login or upgrade prompts
 * @param open - whether dialog is open
 * @param type - 'login' | 'upgrade'
 * @param onClose - close handler
 */
export function GlobalDialog({
  open,
  type,
  onClose,
}: {
  open: boolean;
  type: "login" | "upgrade";
  onClose: () => void;
}) {
  const { navigate } = useViewStore();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "login"
              ? "Sign In to Continue"
              : type === "upgrade"
                ? "Unlock Pro Features"
                : "Start Your Free 14-Day Trial, No credit card required!"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {type === "login"
            ? "You need to login to use this feature."
            : type === "upgrade"
              ? "Upgrade to MCP Linker Pro to use this feature."
              : "Start a 14-day free trial to unlock all features. No credit card required."}
        </div>
        <DialogFooter>
          {type === "login" && (
            <Button
              onClick={() => {
                onClose();
                navigate("/auth");
              }}
            >
              Sign In
            </Button>
          )}
          {type === "upgrade" && (
            <UpgradePlanButton />
          )}
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
