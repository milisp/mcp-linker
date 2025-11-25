import { ModelProvider, Profile, ProviderConfig } from "@/types/config";
import { invoke } from "@tauri-apps/api/core";

export class ConfigService {
  static async getProviderConfig(
    providerName: string,
  ): Promise<ProviderConfig | null> {
    try {
      const result = await invoke<[ModelProvider, Profile | null] | null>(
        "get_provider_config",
        {
          providerName,
        },
      );

      if (result) {
        const [provider, profile] = result;
        return {
          provider,
          profile: profile || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error(
        `Failed to get provider config for ${providerName}:`,
        error,
      );
      return null;
    }
  }

  static async getProfileConfig(profileName: string): Promise<Profile | null> {
    try {
      const result = await invoke<Profile | null>("get_profile_config", {
        profileName,
      });

      return result;
    } catch (error) {
      console.error(`Failed to get profile config for ${profileName}:`, error);
      return null;
    }
  }

  static async getAllProviders(): Promise<Record<string, ModelProvider>> {
    try {
      const result = await invoke<Record<string, ModelProvider>>(
        "read_model_providers",
      );
      return result;
    } catch (error) {
      console.error("Failed to get all providers:", error);
      return {};
    }
  }

  static async getAllProfiles(): Promise<Record<string, Profile>> {
    try {
      const result = await invoke<Record<string, Profile>>("read_profiles");
      return result;
    } catch (error) {
      console.error("Failed to get all profiles:", error);
      return {};
    }
  }

  static async addOrUpdateProfile(
    profileName: string,
    profile: Profile,
  ): Promise<void> {
    try {
      await invoke("add_or_update_profile", {
        profileName,
        profile,
      });
    } catch (error) {
      console.error(`Failed to add/update profile ${profileName}:`, error);
      throw new Error(`Failed to add/update profile: ${error}`);
    }
  }

  static async addProviderWithProfile(options: {
    providerId: string;
    providerName: string;
    baseUrl?: string;
    envKey?: string;
    model?: string;
  }): Promise<void> {
    const { providerId, providerName, baseUrl, envKey, model } = options;

    const providerPayload: ModelProvider = {
      name: providerName,
      base_url: baseUrl || "",
      env_key: envKey || undefined,
    };

    await this.addOrUpdateModelProvider(providerId, providerPayload);

    if (model) {
      try {
        await this.addOrUpdateProfile(providerId, {
          model_provider: providerId,
          model,
        });
      } catch (error) {
        try {
          await this.deleteModelProvider(providerId);
        } catch (rollbackError) {
          console.error(
            `Failed to rollback provider ${providerId} after profile error:`,
            rollbackError,
          );
        }
        throw error;
      }
    }
  }

  static async deleteProfile(profileName: string): Promise<void> {
    try {
      await invoke("delete_profile", {
        profileName,
      });
    } catch (error) {
      console.error(`Failed to delete profile ${profileName}:`, error);
      throw new Error(`Failed to delete profile: ${error}`);
    }
  }

  static async addOrUpdateModelProvider(
    providerName: string,
    provider: ModelProvider,
  ): Promise<void> {
    try {
      await invoke("add_or_update_model_provider", {
        providerName,
        provider,
      });
    } catch (error) {
      console.error(
        `Failed to add/update model provider ${providerName}:`,
        error,
      );
      throw new Error(`Failed to add/update model provider: ${error}`);
    }
  }

  static async deleteModelProvider(providerName: string): Promise<void> {
    try {
      await invoke("delete_model_provider", {
        providerName,
      });
    } catch (error) {
      console.error(
        `Failed to delete model provider ${providerName}:`,
        error,
      );
      throw new Error(`Failed to delete model provider: ${error}`);
    }
  }
}
