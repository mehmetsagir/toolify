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
echo "2. Create a git tag:"
echo "   git tag -a v$NEW_VERSION -m \"Release v$NEW_VERSION\""
echo ""
echo "3. Push commits and tags:"
echo "   git push origin master"
echo "   git push origin v$NEW_VERSION"
echo ""
echo "4. Build DMG:"
echo "   npm run build:dmg"
echo ""
echo "5. The DMG will be available at: dist/toolify-$NEW_VERSION.dmg"

