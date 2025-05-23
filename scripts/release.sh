#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./release.sh 1.0.0"
  echo "can't use v1.0.0"
  echo "`package > version` must be a semver string"
  exit 1
fi

VERSION=$1

# Build the Tauri app before tagging
echo "Building Tauri app..."
bun tauri build

# Proceed only if build succeeds
node scripts/bump.ts $VERSION

echo "Tag $VERSION created and pushed. GitHub Actions will now build and upload release artifacts."