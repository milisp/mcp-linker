# MCP server catalog

Each JSON file uses the official MCP Registry server.json format:
https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json

The catalog shares RegistryServer and registryServerToConfigs with Discover.
The toPresets module projects catalog entries into the existing dialog form;
client configuration fields are not stored in the JSON catalog.

## Adding a server

1. Create `<server-name>.json` with `$schema`, `name`, `description`, and `version`.
2. Describe installation options in `packages` and/or `remotes`.
3. Register the file in `index.ts`. Array order controls catalog display order.
4. Add optional official fields such as `title`, `websiteUrl`, `repository`, and `icons`.
5. Declare inputs using `environmentVariables`, headers, or remote variables. Never commit secrets.
6. Validate against the linked schema and run `npm run typecheck`.

Catalog-specific metadata lives at
`_meta["io.modelcontextprotocol.registry/publisher-provided"]["io.github.milisp.mcp-linker"]`:
`configName` preserves the existing client configuration key, `category` controls
grouping, and `fullDescription` preserves details beyond the schema's 100-character
description limit.

These are locally curated definitions, not claims of official registry publication
or publisher namespace ownership. Their local namespace is
`io.github.milisp.mcp-linker`, and `version: "1.0.0"` versions the catalog definition,
not an upstream software release. Existing npm presets remain unpinned to preserve
installation behavior; pin verified package versions before official publication.

The dialog currently offers each derived connection as a separate choice and
prompts for package environment variables. URL variables, header inputs, and other
Registry input forms require configuration in the full server editor.
