import type { ExecCommandApprovalParams } from "@/bindings/ExecCommandApprovalParams";
import type { FileChange } from "@/bindings/FileChange";
import { useApprovalStore } from "@/stores";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";

interface ExecCommandApprovalNotification {
  requestToken: string;
  params: ExecCommandApprovalParams;
}

type ApplyPatchApprovalParamsWire = {
  conversationId?: string;
  callId: string;
  reason: string | null;
  grantRoot?: string | null;
  fileChanges?: Record<string, FileChange>;
};

interface ApplyPatchApprovalNotification {
  requestToken: string;
  params: ApplyPatchApprovalParamsWire;
}

export function useCodexApprovalRequests() {
  const { upsertExecRequest, upsertPatchRequest } = useApprovalStore();

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setup = async () => {
      try {
        const execRequestUnlisten =
          await listen<ExecCommandApprovalNotification>(
            "codex:exec-command-request",
            (event) => {
              const payload = event.payload;
              if (!payload || !payload.params) {
                return;
              }
              const { requestToken, params } = payload;
              if (!requestToken) {
                return;
              }
              console.log("req params:", params);
              const req = {
                requestToken,
                conversationId: params.conversationId,
                callId: params.callId,
                command: params.command,
                parsedCmd: params.parsedCmd,
                cwd: params.cwd,
                reason: params.reason ?? null,
              };
              upsertExecRequest(req);
            },
          );
        unlisteners.push(execRequestUnlisten);

        const patchRequestUnlisten =
          await listen<ApplyPatchApprovalNotification>(
            "codex:apply-patch-request",
            (event) => {
              const payload = event.payload;
              if (!payload || !payload.params) {
                return;
              }
              const { requestToken, params: rawParams } = payload;
              if (!requestToken) {
                return;
              }

              const conversationId = rawParams.conversationId;
              const callId = rawParams.callId;
              if (!conversationId || !callId) {
                console.warn(
                  "Received apply patch request without conversation or call id",
                  rawParams,
                );
                return;
              }

              const reason =
                rawParams.reason !== undefined ? rawParams.reason : null;
              const grantRoot = rawParams.grantRoot ?? null;
              const fileChanges = rawParams.fileChanges ?? {};

              upsertPatchRequest({
                requestToken,
                conversationId,
                callId,
                reason,
                grantRoot,
                changes: fileChanges,
              });
            },
          );
        unlisteners.push(patchRequestUnlisten);
      } catch (error) {
        console.error("Failed to initialize approval listeners", error);
      }
    };

    setup();

    return () => {
      unlisteners.forEach((unlisten) => {
        try {
          unlisten();
        } catch (error) {
          console.warn("Failed to remove approval listener", error);
        }
      });
    };
  }, [upsertExecRequest, upsertPatchRequest]);
}
