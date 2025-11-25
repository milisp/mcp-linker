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
      console.debug(userData);
      setUser({
        ...userData,
        trialEndsAt: userData.trialEndsAt ? new Date(userData.trialEndsAt) : undefined,
      });
    }
    getUser()
  }, [getCurrentUser])

  return (
    <div className="p-4 space-y-4">
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
              <p><strong>Trial Active:</strong> {user.trialActive ? "Yes" : "No"}</p>
              {user.trialEndsAt && (
                <p><strong>Trial Ends At:</strong> {user.trialEndsAt.toLocaleDateString()}</p>
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
