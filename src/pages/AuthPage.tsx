import AuthUnavailable from "@/components/common/AuthUnavailable";
import { Github, Google } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/authStore";
import supabase, { isSupabaseEnabled } from "@/utils/supabase";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AuthPage() {
  type Provider = "github" | "google";
  const lastProvider = useAuthStore((s) => s.lastOAuthProvider);
  const setLastOAuthProvider = useAuthStore((s) => s.setLastOAuthProvider);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Show trial toast once on first sign-in if user registered within the past 14 days
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const createdAt = new Date(session.user.created_at);
        const trialEndsAt = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (trialEndsAt.getTime() > Date.now()) {
          toast.success("🎉 Trial started! Enjoy your 14-day free access to all features.");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      openUrl(data.url);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw error;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseEnabled || !supabase) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Registration successful! Check your email for a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseEnabled) {
    return <AuthUnavailable />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to MCP Linker</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Sign in to unlock premium features</p>

      {/* Free Trial Notice */}
      <div className="w-full max-w-sm mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="text-2xl mb-2">🎉</div>
        <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
          Start Your Free 14-Day Trial!
        </p>
        <p className="text-xs text-green-700 dark:text-green-300">
          No credit card required. Full access to all features immediately upon sign-up.
        </p>
      </div>

      {/* Student Notice */}
      <div className="w-full max-w-sm mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="text-2xl mb-2">🎓</div>
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
          Students Get Free Access!
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Sign up with your .edu email to unlock all local features permanently
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {([
          { id: "github", icon: Github, label: "GitHub", variant: "default" as const },
          { id: "google", icon: Google, label: "Google", variant: "outline" as const },
        ] as const).map(({ id, icon: Icon, label, variant }) => (
          <div key={id} className="relative">
            <Button
              onClick={() => handleOAuthLogin(id)}
              className="w-full flex items-center justify-center gap-2"
              variant={variant}
            >
              <Icon />
              Continue with {label}
            </Button>
            {lastProvider === id && (
              <Badge variant="outline" className="absolute -top-2 -right-2 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                Last used
              </Badge>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 py-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
          <div className="text-sm text-center">
            <button
              type="button"
              className="text-blue-600 hover:underline dark:text-blue-400"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
