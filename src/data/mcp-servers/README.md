# MCP server catalog

This folder is a copy of [milisp/mcp-servers](https://github.com/milisp/mcp-servers).
Edit the catalog there, then run `scripts/sync-catalog.sh` to update it here.

Each JSON file uses the official MCP Registry server.json format:
https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json

The catalog shares RegistryServer and registryServerToConfigs with Discover.
The toPresets module projects catalog entries into the existing dialog form;
client configuration fields are not stored in the JSON catalog.

## Adding a server

Follow the steps in the mcp-servers README, run `bun run validate` there, then sync.

Catalog-specific metadata lives at
`_meta["io.modelcontextprotocol.registry/publisher-provided"]["io.github.milisp.mcp-linker"]`:
`configName` preserves the existing client configuration key, `category` controls
grouping, `featured: true` places an entry in the Featured section, and `fullDescription` preserves details beyond the schema's 100-character
description limit.

These are locally curated definitions, not claims of official registry publication
or publisher namespace ownership. Their local namespace is
`io.github.milisp.mcp-linker`, and `version: "1.0.0"` versions the catalog definition,
not an upstream software release. Existing npm presets remain unpinned to preserve
installation behavior; pin verified package versions before official publication.

The dialog currently offers each derived connection as a separate choice and
prompts for package environment variables. URL variables, header inputs, and other
Registry input forms require configuration in the full server editor.

Discover displays featured entries first, then the remaining catalog grouped by
category, followed by additional Registry results. Search and transport filters
apply to all sections. Local detail pages and installation forms use these same entries.
