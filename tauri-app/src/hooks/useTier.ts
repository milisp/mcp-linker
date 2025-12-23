// hooks/useTier.ts
import type { ClientTier } from "@/constants/clients";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/stores/userStore";
import { useMemo } from "react";

// Tier hierarchy levels for comparison
// Student tier is equivalent to LIFETIME_PRO for local features
const TIER_LEVELS: Record<string, number> = {
  "FREE": 0,
  "LIFETIME": 1,
  "LIFETIME_PRO": 2,
  "PRO": 3,
  "TEAM": 4,
};

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
    const isStudent = Boolean(user?.email?.endsWith(".edu"));

    const isFree = !tier || tier === "FREE";
    const hasPaidTier = Boolean(tier && tier !== "FREE");
    // Students can access paid features (local only), same as trial users
    const canAccessPaidFeatures = !isFree || hasActiveTrial || isStudent;

    // Check if user can access a specific tier level
    const hasMinimumTier = (requiredTier: ClientTier): boolean => {
      if (!tier) return requiredTier === "FREE";

      // If user has active trial, they can access all features
      if (hasActiveTrial) return true;

      // Students have access equivalent to LIFETIME_PRO for local features
      if (isStudent && requiredTier !== "PRO" && requiredTier !== "TEAM") {
        const requiredLevel = TIER_LEVELS[requiredTier] ?? 0;
        const studentLevel = TIER_LEVELS["LIFETIME_PRO"];
        return studentLevel >= requiredLevel;
      }

      const userLevel = TIER_LEVELS[tier] ?? 0;
      const requiredLevel = TIER_LEVELS[requiredTier] ?? 0;
      return userLevel >= requiredLevel;
    };

    // Check if user can access client based on tier
    const canAccessClient = (requiredTier: ClientTier): boolean => {
      return hasMinimumTier(requiredTier);
    };

    // Cloud sync is available for PROFESSIONAL and TEAM tiers only (not for students)
    const canUseCloudSync = hasMinimumTier("PRO");

    // Team features are only available for TEAM tier
    const canUseTeamFeatures = tier === "TEAM";

    // Check specific tier types
    const isLifetimeBasic = tier === "LIFETIME";
    const isLifetimePro = tier === "LIFETIME_PRO";
    const isProfessional = tier === "PRO";
    const isTeam = tier === "TEAM";

    return {
      tier,
      loading,
      isFree,
      hasPaidTier,
      hasActiveTrial,
      trialEndsAt,
      isStudent,
      canAccessPaidFeatures,
      hasMinimumTier,
      canAccessClient,
      canUseCloudSync,
      canUseTeamFeatures,
      isLifetimeBasic,
      isLifetimePro,
      isProfessional,
      isTeam,
    };
  }, [user, loading]);
}
