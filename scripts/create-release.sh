#!/bin/bash

# GitHub Release Creator for WATAM AI v1.1.0
# This script creates a GitHub release using gh CLI

set -e

echo "🚀 Creating GitHub Release for WATAM AI v1.1.0"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found!"
    echo ""
    echo "Install it:"
    echo "  macOS: brew install gh"
    echo "  Or visit: https://cli.github.com/"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Authenticating with GitHub..."
    gh auth login
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Create release
echo "📦 Creating release v1.1.0..."
gh release create v1.1.0 \
    --title "WATAM AI v1.1.0 - Desktop App" \
    --notes-file RELEASE_v1.1.0.md \
    --latest

echo ""
echo "✅ Release created successfully!"
echo ""
echo "🌐 View release: https://github.com/WeAreTheArtMakers/watamai/releases/tag/v1.1.0"
echo ""
echo "📝 Next steps:"
echo "  1. Build desktop app: cd electron && npm run build:all"
echo "  2. Upload builds to release"
echo ""
