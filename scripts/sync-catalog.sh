#!/bin/sh
# Copies the curated catalog from a milisp/mcp-servers checkout into the app.
# Usage: scripts/sync-catalog.sh [path-to-mcp-servers]   (default: ../mcp-servers)
set -eu
src="${1:-../mcp-servers}"
dest="src/data/mcp-servers"
[ -f "$src/index.json" ] || { echo "No catalog at $src" >&2; exit 1; }
rm -rf "$dest/servers" "$dest/collections"
mkdir -p "$dest/servers" "$dest/collections"
cp "$src/index.json" "$dest/index.json"
cp "$src"/servers/*.json "$dest/servers/"
cp "$src"/collections/*.json "$dest/collections/"
echo "Synced $(ls "$dest/servers" | wc -l | tr -d ' ') servers and $(ls "$dest/collections" | wc -l | tr -d ' ') collections from $src"
