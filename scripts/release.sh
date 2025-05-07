#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./release.sh v1.0.0"
  exit 1
fi

VERSION=$1

# Build the Tauri app before tagging
echo "Building Tauri app..."
bun tauri build

# Proceed only if build succeeds
node scripts/bump.ts $VERSION

echo "Tag $VERSION created and pushed. GitHub Actions will now build and upload release artifacts."