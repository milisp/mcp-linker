import { create } from "zustand";

export type ViewName =
  | "discover"
  | "manage"
  | "claude-code-manage"
  | "recently"
  | "settings"
  | "about"
  | "server"
  | "install-app"
  | "notes"
  | "favorites";

export type ViewParams = Record<string, string>;
export type ViewSearch = Record<string, string>;
export type NavigateFn = (to: string | number, options?: { replace?: boolean }) => void;

interface ViewEntry {
  view: ViewName;
  params: ViewParams;
  search: ViewSearch;
}

interface ViewStore extends ViewEntry {
  history: ViewEntry[];
  navigate: NavigateFn;
}

// Order matters: more specific patterns first
const ROUTES: Array<{ re: RegExp; view: ViewName; keys: string[] }> = [
  {
    re: /^\/servers\/([^/?]+)\/([^/?]+)/,
    view: "server",
    keys: ["owner", "repo"],
  },
  { re: /^\/servers\/([^/?]+)/, view: "server", keys: ["id"] },
];

export function parsePath(path: string): ViewEntry {
  const qIdx = path.indexOf("?");
  const pathPart = qIdx >= 0 ? path.slice(0, qIdx) : path;
  const queryPart = qIdx >= 0 ? path.slice(qIdx + 1) : "";

  const search: ViewSearch = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => {
      search[k] = v;
    });
  }

  for (const { re, view, keys } of ROUTES) {
    const m = pathPart.match(re);
    if (m) {
      const params: ViewParams = {};
      keys.forEach((k, i) => {
        params[k] = m[i + 1];
      });
      return { view, params, search };
    }
  }

  const segment = pathPart.split("/").filter(Boolean)[0] as ViewName;
  if (!segment || segment === "discover") {
    return { view: "discover", params: {}, search: search };
  }

  return { view: segment, params: {}, search };
}

export function entryToPath({ view, params, search }: ViewEntry): string {
  let path: string;
  switch (view) {
    case "server":
      path = params.owner
        ? `/servers/${params.owner}/${params.repo}`
        : `/servers/${params.id ?? ""}`;
      break;
    case "discover":
      path = "/";
      break;
    default:
      path = `/${view}`;
  }
  const q = new URLSearchParams(search).toString();
  return q ? `${path}?${q}` : path;
}

function getInitialEntry(): ViewEntry {
  try {
    const saved = localStorage.getItem("lastRoute");
    if (saved && saved !== "/") return parsePath(saved);
  } catch {}
  return { view: "discover", params: {}, search: {} };
}

const initial = getInitialEntry();

export const useViewStore = create<ViewStore>((set, get) => ({
  ...initial,
  history: [initial],

  navigate: (to, options) => {
    if (typeof to === "number") {
      if (to === 0) {
        window.location.reload();
        return;
      }
      if (to === -1) {
        const { history } = get();
        if (history.length > 1) {
          const newHist = history.slice(0, -1);
          const prev = newHist[newHist.length - 1];
          localStorage.setItem("lastRoute", entryToPath(prev));
          set({ ...prev, history: newHist });
        }
      }
      return;
    }

    const entry = parsePath(to);
    localStorage.setItem("lastRoute", to);

    set((state) => {
      const newHist = options?.replace
        ? [...state.history.slice(0, -1), entry]
        : [...state.history, entry];
      return { ...entry, history: newHist };
    });
  },
}));
