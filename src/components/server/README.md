# Server Components Directory Structure

This directory contains all components related to server configuration and management.

## Directory Structure

```
server/
├── config/           # Configuration related components
│   ├── ConfigTabs.tsx
│   ├── ServerInfoSection.tsx
│   ├── ServerTypeSelector.tsx
│   ├── StdioConfigSection.tsx
│   └── index.ts
├── dialog/           # Dialog components
│   ├── ServerConfigDialogFooter.tsx
│   ├── ServerConfigDialogHeader.tsx
│   ├── ServerTemplateDialog.tsx
│   └── index.ts
├── form/             # Form components
│   ├── HeaderEditor.tsx
│   ├── NetworkConfigSection.tsx
│   ├── ServerTemplateForm.tsx
│   ├── SseConfigForm.tsx
│   ├── StdioConfigForm.tsx
│   └── index.ts
├── hooks/            # Custom hooks
│   ├── useLocalDraft.ts
│   ├── useSaveServerConfig.ts
│   ├── useServerConfig.ts
│   ├── useServerConfigDialog.ts
│   └── index.ts
├── input/            # Input components
│   ├── ArgsTextarea.tsx
│   ├── CommandInput.tsx
│   ├── EnvEditor.tsx
│   └── index.ts
├── list/             # List and card components
│   ├── ServerCard.tsx
│   ├── ServerList.tsx
│   └── index.ts
├── utils/            # Utility functions
│   ├── transformConfig.ts
│   └── index.ts
└── index.ts          # Main export file
```

## Usage

All components can be imported from the main index file:

```typescript
import {
  ServerList,
  useServerConfig,
} from "@/components/server";
```

Or imported from specific subdirectories:

```typescript
import { ServerCard } from "@/components/server/list";
import { ConfigTabs } from "@/components/server/config";
import { useLocalDraft } from "@/components/server/hooks";
```

## Component Categories

- **config/**: Components for server configuration UI
- **dialog/**: Modal dialogs for server management
- **form/**: Form-specific components
- **hooks/**: Custom React hooks for server logic
- **input/**: Input field components
- **list/**: Components for displaying server lists
- **utils/**: Utility functions and helpers
