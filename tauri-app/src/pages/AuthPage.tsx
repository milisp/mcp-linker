import AuthUnavailable from "@/components/common/AuthUnavailable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import authService from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import supabase, { isSupabaseEnabled } from "@/utils/supabase";
import { open } from "@tauri-apps/plugin-shell";
import { Github } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AuthPage() {
  type Provider = "github" | "google";
  const lastProvider = useAuthStore((s) => s.lastOAuthProvider);
  const setLastOAuthProvider = useAuthStore((s) => s.setLastOAuthProvider);
  const { fetchUser } = useUserStore();

  // After successful login, automatically start trial if eligible
  // and show a small toast. Navigation is handled by useAuth elsewhere.
  // We scope this to AuthPage per request.
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN") {
          try {
            const user = await authService.getCurrentUser();
            const tier = user?.tier?.toUpperCase?.();
            const hasTrial = !!user?.trialActive;
            const isPaid = tier !== "FREE";
            const isStudent = !!user?.isStudent;

            // Check if user has .edu email and is not already a student or on a paid plan
            const userEmail = user?.email || "";
            const isEduEmail = userEmail.toLowerCase().endsWith(".edu");

            if (isEduEmail && tier === "FREE" && !isStudent) {
              // Upgrade to student tier for .edu emails
              try {
                await api.post("/users/upgrade-student");
                toast.success("🎓 Student account activated! You now have free access to all local features.");
                await fetchUser();
              } catch (error) {
                console.error("Failed to upgrade to student tier:", error);
                // Fall through to trial logic if student upgrade fails
                if (!isPaid && !hasTrial) {
                  await api.post("/users/start-trial");
                  toast.success("Trial started! Enjoy your 14-day access.");
                  await fetchUser();
                }
              }
            } else if (!isPaid && !hasTrial && !isStudent) {
              // Only start trial for non-student, non-paid users
              await api.post("/users/start-trial");
              toast.success("Trial started! Enjoy your 14-day access.");
              await fetchUser();
            }
          } catch (_) {
            // Ignore errors; user can still use the app
          }
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [fetchUser]);

  const handleOAuthLogin = async (provider: Provider) => {
    if (!isSupabaseEnabled || !supabase) {
      console.error("Authentication is not configured");
      return;
    }

    try {
      // Remember last used provider via zustand store
      setLastOAuthProvider(provider);

      const { data } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: import.meta.env.VITE_REDIRECT_URL,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (!data?.url) throw new Error("No auth URL returned");
      open(data.url);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw error;
    }
  };

  if (!isSupabaseEnabled) {
    return <AuthUnavailable />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to MCP Linker</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Sign in to get more</p>

      {/* Student Notice */}
      <div className="w-full max-w-sm mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="text-2xl mb-2">🎓</div>
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
          Students Get Free Access!
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Sign up with your .edu email to unlock all local features for free
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* OAuth providers */}
        <div className="relative mb-4">
          <Button
            onClick={() => handleOAuthLogin("github")}
            className="w-full flex items-center justify-center gap-2"
          >
            <Github />
            Continue with GitHub
          </Button>
          {lastProvider === "github" && (
            <Badge variant="outline" className="absolute -top-2 -right-2 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              Last used
            </Badge>
          )}
        </div>

        <div className="relative">
          <Button
            onClick={() => handleOAuthLogin("google")}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
          >
            <span className="text-sm">🔍</span>
            Continue with Google
          </Button>
          {lastProvider === "google" && (
            <Badge variant="outline" className="absolute -top-2 -right-2 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              Last used
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
