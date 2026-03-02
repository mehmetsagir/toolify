#!/bin/bash

# Version bump script for Toolify
# Usage: ./scripts/version.sh [major|minor|patch]

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/version.sh [major|minor|patch]"
  exit 1
fi

VERSION_TYPE=$1

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Bump version
npm version $VERSION_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")

echo "Version bumped from $CURRENT_VERSION to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Commit the version change:"
echo "   git add package.json package-lock.json"
echo "   git commit -m \"chore: bump version to $NEW_VERSION\""
echo ""
echo "2. Push the commit to master:"
echo "   git push origin master"
echo ""
echo "3. GitHub Actions will automatically:"
echo "   - detect the new package.json version"
echo "   - build the macOS artifacts"
echo "   - create tag v$NEW_VERSION"
echo "   - publish the GitHub Release"
echo ""
echo "IMPORTANT:"
echo "Do NOT create or push the git tag manually."
echo "The release workflow skips publishing when tag v$NEW_VERSION already exists."
echo ""
echo "Optional:"
echo "If the automatic run doesn't start, trigger '.github/workflows/release.yml'"
echo "manually from the GitHub Actions tab via 'Run workflow'."

