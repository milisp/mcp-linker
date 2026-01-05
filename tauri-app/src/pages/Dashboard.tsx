import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, signOut } from "@/services/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type userInfo = {
  email: string,
  fullname: string,
  id: string,
  tier: string,
  trialActive: boolean,
  trialEndsAt?: Date,
  username: string
}

export default function Dashboard() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };
  const [user, setUser] = useState<userInfo>()

  useEffect(() => {
    async function getUser() {
      const userData = await getCurrentUser();
      console.debug("userData", userData);
      setUser({
        ...userData,
        trialEndsAt: userData.trialEndsAt ? new Date(userData.trialEndsAt) : undefined,
      });
    }
    getUser()
  }, [getCurrentUser])

  const getTrialDaysRemaining = () => {
    if (!user?.trialEndsAt) return 0;
    const now = new Date();
    const endDate = new Date(user.trialEndsAt);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const trialDaysRemaining = user?.trialActive ? getTrialDaysRemaining() : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Trial Status Banner */}
      {user?.trialActive && trialDaysRemaining > 0 && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <span>🎉</span>
              Trial Active - Full Access Unlocked!
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              You have <strong>{trialDaysRemaining} days</strong> remaining in your free trial.
              Enjoy full access to all features!
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Trial Expired Banner */}
      {user?.tier === "FREE" && !user?.trialActive && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <span>⏰</span>
              Upgrade to Continue
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Your trial has ended. Upgrade to a paid plan to continue accessing premium features.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Details about your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Full Name:</strong> {user.fullname}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Tier:</strong> {user.tier}</p>
              {user.trialActive && user.trialEndsAt && (
                <p className="text-blue-600 dark:text-blue-400">
                  <strong>Trial Expires:</strong> {user.trialEndsAt.toLocaleDateString()} ({trialDaysRemaining} days remaining)
                </p>
              )}
            </div>
          ) : (
            <p>Loading user information...</p>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 mt-6"
        variant="destructive"
      >
        Logout
      </Button>
    </div>
  );
}
