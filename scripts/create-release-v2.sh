#!/bin/bash

# WATAM AI v2.0.0 Release Script
# This script creates a GitHub release and uploads build artifacts one by one

set -e

VERSION="2.0.0"
REPO="WeAreTheArtMakers/watamai"
RELEASE_NAME="v${VERSION} - Network & Messaging"
TAG="v${VERSION}"

echo "🚀 Creating GitHub Release for WATAM AI v${VERSION}"
echo "================================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Create the release
echo "📝 Creating release ${TAG}..."
gh release create "${TAG}" \
    --repo "${REPO}" \
    --title "${RELEASE_NAME}" \
    --notes-file "RELEASE_NOTES_v${VERSION}.md" \
    --draft

echo "✅ Release created as draft"
echo ""

# Upload files one by one
cd electron/dist

echo "📦 Uploading build artifacts..."
echo ""

# macOS Intel DMG
echo "⬆️  Uploading: WATAM AI-${VERSION}.dmg (macOS Intel)"
gh release upload "${TAG}" "WATAM AI-${VERSION}.dmg" --repo "${REPO}" --clobber
echo "✅ Uploaded macOS Intel DMG"
echo ""

# macOS Apple Silicon DMG
echo "⬆️  Uploading: WATAM AI-${VERSION}-arm64.dmg (macOS Apple Silicon)"
gh release upload "${TAG}" "WATAM AI-${VERSION}-arm64.dmg" --repo "${REPO}" --clobber
echo "✅ Uploaded macOS Apple Silicon DMG"
echo ""

# macOS Intel ZIP
echo "⬆️  Uploading: WATAM AI-${VERSION}-mac.zip (macOS Intel ZIP)"
gh release upload "${TAG}" "WATAM AI-${VERSION}-mac.zip" --repo "${REPO}" --clobber
echo "✅ Uploaded macOS Intel ZIP"
echo ""

# macOS Apple Silicon ZIP
echo "⬆️  Uploading: WATAM AI-${VERSION}-arm64-mac.zip (macOS Apple Silicon ZIP)"
gh release upload "${TAG}" "WATAM AI-${VERSION}-arm64-mac.zip" --repo "${REPO}" --clobber
echo "✅ Uploaded macOS Apple Silicon ZIP"
echo ""

# Windows Installer
echo "⬆️  Uploading: WATAM AI Setup ${VERSION}.exe (Windows Installer)"
gh release upload "${TAG}" "WATAM AI Setup ${VERSION}.exe" --repo "${REPO}" --clobber
echo "✅ Uploaded Windows Installer"
echo ""

# Windows Portable
echo "⬆️  Uploading: WATAM AI ${VERSION}.exe (Windows Portable)"
gh release upload "${TAG}" "WATAM AI ${VERSION}.exe" --repo "${REPO}" --clobber
echo "✅ Uploaded Windows Portable"
echo ""

cd ../..

echo "================================================"
echo "🎉 All files uploaded successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Go to: https://github.com/${REPO}/releases"
echo "2. Review the draft release"
echo "3. Click 'Publish release' when ready"
echo ""
echo "🔗 Release URL: https://github.com/${REPO}/releases/tag/${TAG}"
