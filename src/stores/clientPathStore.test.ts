import { beforeEach, describe, expect, it, vi } from "vitest";

// The test environment is node: the store only touches storage when `window` exists,
// so stub both `window` and an in-memory `localStorage`.
let data: Record<string, string>;

const stubStorage = () => {
  const storage = {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = String(v);
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", storage);
};

const loadStore = async (seed: Record<string, string> = {}) => {
  data = { ...seed };
  vi.resetModules();
  stubStorage();
  const { useClientPathStore } = await import("./clientPathStore");
  return useClientPathStore;
};

beforeEach(() => {
  data = {};
  vi.unstubAllGlobals();
});

describe("clientPathStore", () => {
  it("keeps the user scope when project is requested without a remembered path", async () => {
    const store = await loadStore();
    store.getState().setSelectedScope("project");
    expect(store.getState().selectedScope).toBe("user");
    expect(store.getState().selectedPath).toBeNull();
  });

  it("setSelectedPath selects project scope and the user scope keeps the remembered path", async () => {
    const store = await loadStore();
    const client = store.getState().selectedClient;
    store.getState().setSelectedPath("/p");
    expect(store.getState().selectedScope).toBe("project");
    expect(store.getState().selectedPath).toBe("/p");

    store.getState().setSelectedScope("user");
    expect(store.getState().selectedScope).toBe("user");
    expect(store.getState().selectedPath).toBeNull();
    expect(store.getState().getClientPath(client)).toBe("/p");

    store.getState().setSelectedScope("project");
    expect(store.getState().selectedScope).toBe("project");
    expect(store.getState().selectedPath).toBe("/p");
  });

  it("setSelectedPath(null) switches to the user scope and keeps the remembered path", async () => {
    const store = await loadStore();
    const client = store.getState().selectedClient;
    store.getState().setSelectedPath("/p");
    store.getState().setSelectedPath(null);
    expect(store.getState().selectedScope).toBe("user");
    expect(store.getState().selectedPath).toBeNull();
    expect(store.getState().getClientPath(client)).toBe("/p");
  });

  it("restores each client's own scope and path when switching clients", async () => {
    const store = await loadStore();
    store.getState().setSelectedClient("cursor");
    store.getState().setSelectedPath("/a");
    store.getState().setSelectedClient("copilot");
    expect(store.getState().selectedScope).toBe("user");
    expect(store.getState().selectedPath).toBeNull();

    store.getState().setSelectedClient("cursor");
    expect(store.getState().selectedScope).toBe("project");
    expect(store.getState().selectedPath).toBe("/a");

    store.getState().setSelectedClient("copilot");
    expect(store.getState().selectedScope).toBe("user");
    expect(store.getState().selectedPath).toBeNull();
  });

  it("starts in project scope for legacy data with a path but no scope key", async () => {
    const store = await loadStore({ selectedClient: "cursor", clientPath_cursor: "/legacy" });
    expect(store.getState().selectedClient).toBe("cursor");
    expect(store.getState().selectedScope).toBe("project");
    expect(store.getState().selectedPath).toBe("/legacy");
  });

  it("falls back to the user scope when the selected client's path is cleared in project scope", async () => {
    const store = await loadStore();
    store.getState().setSelectedPath("/p");
    store.getState().setClientPath(store.getState().selectedClient, null);
    expect(store.getState().selectedScope).toBe("user");
    expect(store.getState().selectedPath).toBeNull();
  });
});
