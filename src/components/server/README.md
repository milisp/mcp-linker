# Server Components

Components for finding, adding, editing and inspecting MCP servers. There are
no server dialogs: Discover cards, installed servers and custom servers all
open a page (`/servers/<id>`, `/servers/new`) built on `ServerWorkspace`.

## Directory Structure

```
server/
├── ServerWorkspace.tsx  # Configure / Tools tabs, Save, Uninstall, install target
├── form/                # Field sections rendered inside the workspace card
│   ├── ArgumentsInput.tsx
│   ├── ConnectionFields.tsx
│   └── StringMapEditor.tsx
├── hooks/
│   ├── useLocalDraft.ts
│   ├── useMcpInspector.ts
│   ├── useSaveServerConfig.ts
│   └── useServerEditor.ts   # Draft per server and target; loads the installed config
├── list/                # Discover cards with one-click Add
│   ├── ServerCard.tsx
│   └── ServerList.tsx
├── tools/               # Live tool inspection
├── ui/
├── utils/
│   ├── arguments.ts
│   ├── importServerJson.ts  # Server configs from pasted JSON or a README
│   ├── installedServer.ts   # Read, list and uninstall servers in the selected target
│   ├── normalizeServerConfig.ts
│   └── quickInstall.ts      # Which configs can be added without editing
└── index.ts
```

## Pages

- `src/pages/ServerPage.tsx`: catalog, registry and installed servers.
- `src/pages/NewServerPage.tsx`: Add custom server, with a type switch,
  command shortcuts, and import from pasted JSON or a GitHub README.
