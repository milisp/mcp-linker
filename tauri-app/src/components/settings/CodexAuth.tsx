import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { invoke } from "@tauri-apps/api/core";

type AccountInfo =
  | { type: "apiKey" }
  | { type: "chatgpt"; email: string; planType: string };

type GetAccountResponse = {
  account: AccountInfo | null;
  requiresOpenaiAuth: boolean;
};

type LoginAccountResponse =
  | { type: "apiKey" }
  | { type: "chatgpt"; loginId: string; authUrl: string };

const REFRESH_LABEL = "Refresh account";
const REFRESH_FORCE_LABEL = "Refresh account (force refresh)";
const LOGIN_LABEL = "Start ChatGPT login";
const CANCEL_LABEL = "Cancel login";
const LOGOUT_LABEL = "Logout";

export function CodexAuth() {
  const [account, setAccount] = useState<GetAccountResponse | null>(null);
  const [loginResponse, setLoginResponse] =
    useState<LoginAccountResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const runAction = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setPendingAction(label);
      setLastStatus(label);
      setLastError(null);
      try {
        await action();
        setLastStatus(`${label} succeeded`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? "Unknown");
        setLastStatus(`${label} failed`);
        setLastError(message);
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const refreshAccount = useCallback(
    (force: boolean) =>
      runAction(force ? REFRESH_FORCE_LABEL : REFRESH_LABEL, async () => {
        const response = await invoke<GetAccountResponse>("get_account", {
          refreshToken: force,
        });
        setAccount(response);
        setLoginResponse(null);
      }),
    [runAction],
  );

  const startChatLogin = useCallback(() => {
    runAction(LOGIN_LABEL, async () => {
      const response = await invoke<LoginAccountResponse>(
        "login_account_chatgpt",
      );
      setLoginResponse(response);
    });
  }, [runAction]);

  const cancelLogin = useCallback(() => {
    if (loginResponse?.type !== "chatgpt") {
      return;
    }
    runAction(CANCEL_LABEL, async () => {
      await invoke<void>("cancel_login_account", {
        loginId: loginResponse.loginId,
      });
      setLoginResponse(null);
    });
  }, [loginResponse, runAction]);

  const logout = useCallback(() => {
    runAction(LOGOUT_LABEL, async () => {
      await invoke<void>("logout_account");
      setAccount(null);
      setLoginResponse(null);
    });
  }, [runAction]);

  useEffect(() => {
    refreshAccount(false);
  }, [refreshAccount]);

  const buttonLabel = (label: string) =>
    pendingAction === label ? `${label}…` : label;
  const isBusy = Boolean(pendingAction);

  const accountType = account?.account?.type ?? "none";

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Codex auth smoke test</CardTitle>
        <CardDescription>
          Exercise `codex app-server` auth calls so the UI can observe
          `requires_openai_auth`.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>requires_openai_auth:</span>
          <Badge variant={account?.requiresOpenaiAuth ? "destructive" : "secondary"}>
            {account?.requiresOpenaiAuth ? "true" : "false"}
          </Badge>
        </div>
        <div>
          <span className="font-semibold text-foreground">Account type:</span>{" "}
          {accountType}
        </div>
        {account?.account?.type === "chatgpt" && (
          <div className="space-y-1">
            <p>Email: {account.account.email}</p>
            <p>Plan: {account.account.planType}</p>
          </div>
        )}
        {loginResponse?.type === "chatgpt" && (
          <div className="space-y-1 rounded-md border border-border/40 p-3 bg-muted">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Pending ChatGPT login
            </p>
            <p className="text-sm">Login ID: {loginResponse.loginId}</p>
            <a
              className="text-sm text-primary underline-offset-4 hover:underline"
              href={loginResponse.authUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open login URL
            </a>
          </div>
        )}
        {loginResponse?.type === "apiKey" && (
          <p className="text-sm text-muted-foreground">
            API key login accepted.
          </p>
        )}
        {lastStatus && (
          <p
            className={`text-xs ${
              lastError ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {lastStatus}
          </p>
        )}
        {lastError && (
          <p className="text-xs text-destructive">Error: {lastError}</p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button onClick={() => refreshAccount(false)} disabled={isBusy}>
          {buttonLabel(REFRESH_LABEL)}
        </Button>
        <Button variant="outline" onClick={() => refreshAccount(true)} disabled={isBusy}>
          {buttonLabel(REFRESH_FORCE_LABEL)}
        </Button>
        <Button variant="secondary" onClick={startChatLogin} disabled={isBusy}>
          {buttonLabel(LOGIN_LABEL)}
        </Button>
        {loginResponse?.type === "chatgpt" && (
          <Button variant="ghost" onClick={cancelLogin} disabled={isBusy}>
            {buttonLabel(CANCEL_LABEL)}
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="destructive" onClick={logout} disabled={isBusy}>
          {buttonLabel(LOGOUT_LABEL)}
        </Button>
      </CardFooter>
    </Card>
  );
}
