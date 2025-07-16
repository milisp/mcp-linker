import { BackButton } from "@/components/common/BackButton";
import { UserConfigForm } from "@/components/dxt";
import { getManifestById } from "@/components/dxt/db";
import { Footer } from "@/components/dxt/Footer";
import { ToolPrompt } from "@/components/dxt/tool-prompt";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DxtManifestSchema } from "@/schemas";
import { useClientPathStore } from "@/stores";
import { ConfigType } from "@/types/mcpConfig";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";

// Add this helper function to sanitize manifest fields that may be null
function sanitizeManifest(raw: any) {
  return {
    ...raw,
    $schema: raw.$schema ?? "",
    documentation:
      raw.documentation &&
      typeof raw.documentation === "string" &&
      raw.documentation.trim() !== ""
        ? raw.documentation
        : undefined,
    support:
      raw.support &&
      typeof raw.support === "string" &&
      raw.support.trim() !== ""
        ? raw.support
        : undefined,
    icon: raw.icon ?? "",
    prompts_generated: raw.prompts_generated ?? false,
    compatibility: raw.compatibility ?? {},
    // add more fields as needed
  };
}

export default function DxtDetail() {
  const { selectedClient, selectedPath } = useClientPathStore();
  const { id } = useParams();
  const [manifest, setManifest] = useState<z.infer<
    typeof DxtManifestSchema
  > | null>(null);
  const [userConfig, setUserConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false); // add isInstalled state

  // First useEffect: load manifest
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getManifestById(Number(id)).then((found) => {
      if (found) {
        try {
          const sanitized = sanitizeManifest(found);
          setManifest(DxtManifestSchema.parse(sanitized));
        } catch (e) {
          setManifest(null);
        }
      } else {
        setManifest(null);
      }
      setLoading(false);
    });
  }, [id]);

  // Second useEffect: check mcpServers after manifest is loaded
  useEffect(() => {
    if (!manifest) return;
    invoke<ConfigType>("read_json_file", {
      clientName: selectedClient,
      path: selectedPath,
    }).then((savedData) => {
      const hasServer = !!savedData.mcpServers?.[manifest.name];
      setIsInstalled(hasServer);
      console.log("get mcpServers", savedData.mcpServers[manifest.name]);
    });
  }, [manifest, selectedClient, selectedPath]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!manifest) return <div className="p-4">Not found</div>;

  const userConfigSchema = manifest.user_config ?? {};

  // Helper to merge userConfig into mcp_config
  function getMergedMcpConfig() {
    const baseConfig = JSON.parse(
      JSON.stringify(manifest?.server.mcp_config || {}),
    );
    // If there's an env object, update it with matching userConfig keys
    if (baseConfig.env && typeof baseConfig.env === "object") {
      for (const [k, v] of Object.entries(userConfig)) {
        if (k in baseConfig.env) {
          baseConfig.env[k] = v;
        } else {
          baseConfig[k] = v;
        }
      }
    } else {
      // No env object, just shallow merge
      Object.assign(baseConfig, userConfig);
    }
    return baseConfig;
  }

  async function addMcpConfig() {
    const mergedConfig = getMergedMcpConfig();
    const _item = {
      clientName: selectedClient,
      path: selectedPath || undefined,
      serverName: manifest?.name,
      serverConfig: mergedConfig,
    };
    console.log(_item);
    invoke("add_mcp_server", _item);
  }

  async function removeMcp() {
    invoke("remove_mcp_server", {
      clientName: selectedClient,
      path: selectedPath || undefined,
      serverName: manifest?.name,
    });
  }

  async function changeStatus(checked: boolean) {
    setEnabled(checked);
    const mergedConfig = getMergedMcpConfig();
    const mcpServerConfig = { [manifest?.name as string]: mergedConfig };
    console.log(mcpServerConfig);
    if (checked) {
      invoke("disable_mcp_server", {
        clientName: selectedClient,
        path: selectedPath || undefined,
        serverName: manifest?.name,
      });
    } else {
      const _serverItem = {
        clientName: selectedClient,
        path: selectedPath || "",
        serverName: manifest?.name,
      };
      try {
        await invoke("enable_mcp_server", _serverItem);
      } catch (error) {}
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton />
      {/* Top section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {manifest.display_name ?? manifest.name}
          </h1>
          <p className="text-gray-700 mb-1">{manifest.description}</p>
        </div>
        {!isInstalled && (
          <button
            onClick={addMcpConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow"
          >
            Install
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <span>
          <Switch onCheckedChange={changeStatus} checked={enabled} />{" "}
          {enabled ? "Enabled" : "Disabled"}
        </span>
        <Button onClick={removeMcp}>Uninstall</Button>
      </div>

      {/* User config form */}
      {Object.keys(userConfigSchema).length > 0 && (
        <div className="mb-8 rounded">
          <h2 className="text-lg font-semibold mb-2">User Configuration</h2>
          <UserConfigForm
            schema={userConfigSchema}
            values={userConfig}
            onChange={(k, v) => setUserConfig((prev) => ({ ...prev, [k]: v }))}
          />
        </div>
      )}

      {/* Middle section: tools & prompts */}
      <ToolPrompt manifest={manifest} />

      <Footer manifest={manifest} />
    </div>
  );
}
