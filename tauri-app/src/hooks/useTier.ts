// hooks/useTier.ts
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/stores/userStore";
import { useMemo } from "react";

export function useIsFreeUser() {
  const { isAuthenticated } = useAuth();
  const { user } = useUserStore();
  return isAuthenticated && user?.tier === "FREE";
}

export function useTier() {
  const { user, loading } = useUserStore();

  return useMemo(() => {
    const tier = user?.tier?.toUpperCase();
    const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const hasActiveTrial = Boolean(
      user?.trialActive && trialEndsAt && trialEndsAt.getTime() > Date.now()
    );

    const isFree = !tier || tier === "FREE";
    const hasPaidTier = Boolean(tier && tier !== "FREE");
    const canAccessPaidFeatures = !isFree || hasActiveTrial;

    return {
      tier,
      loading,
      isFree,
      hasPaidTier,
      hasActiveTrial,
      trialEndsAt,
      canAccessPaidFeatures,
    };
  }, [user, loading]);
}
