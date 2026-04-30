// lib/apiClient.ts
import { getSession } from "@/services/auth";
import { isSupabaseEnabled } from "@/utils/supabase";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export const apiUrl =
  import.meta.env.VITE_API_BASE_URL || "https://api.milisp.dev/api/v1";
console.log("API URL:", apiUrl);

class ApiClient {
  private client: AxiosInstance;
  private sessionCache: { session: any; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        "X-Client-Agent": "MCP-Linker-Client/1.0",
      },
    });
    this.setupInterceptors();
  }

  private async getValidSession() {
    const now = Date.now();

    // If auth is disabled, return null without error
    if (!isSupabaseEnabled) {
      return null;
    }

    // use cache session if it's ok
    if (
      this.sessionCache &&
      now - this.sessionCache.timestamp < this.CACHE_DURATION
    ) {
      return this.sessionCache.session;
    }

    // get new session
    try {
      const session = await getSession();
      this.sessionCache = { session, timestamp: now };
      return session;
    } catch (error) {
      this.sessionCache = null;
      // Don't throw error for missing session, just return null
      console.debug("No session available:", error);
      return null;
    }
  }

  private setupInterceptors() {
    // add access_token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const session = await this.getValidSession();
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        } catch (error) {
          console.warn("Failed to add auth header:", error);
          // Continue with request even if auth fails
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response Interceptor - Handling Authentication Errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // clean session
          this.sessionCache = null;
          // trigger the re-login logic here
          console.warn("Authentication failed, session may be expired");
        }
        return Promise.reject(error);
      },
    );
  }

  // http methods
  get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }

  clearSessionCache() {
    this.sessionCache = null;
  }
}

export const apiClient = new ApiClient(apiUrl);
