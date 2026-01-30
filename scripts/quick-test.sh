#!/bin/bash

# Quick test script to verify everything works

set -e

echo "🧪 Running quick tests..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "   Run: cp .env.example .env"
    exit 1
fi

# Check if built
if [ ! -d dist ]; then
    echo "Building project..."
    npm run build
fi

# Run unit tests
echo "1. Running unit tests..."
npm test
echo "✅ Unit tests passed"
echo ""

# Test CLI commands (dry run)
echo "2. Testing CLI commands..."

echo "   - Fetching skill.md..."
npm run cli fetch-skill > /dev/null 2>&1 || echo "   ⚠️  Skill fetch failed (may be offline)"

echo "   - Testing draft-post..."
npm run cli draft-post --submolt test --topic "Test" > /dev/null 2>&1
echo "   ✅ Draft post works"

echo "   - Testing stats..."
npm run cli stats > /dev/null 2>&1
echo "   ✅ Stats command works"

echo ""
echo "✅ All quick tests passed!"
echo ""
echo "To test with real Moltbook API:"
echo "1. Add MOLTBOOK_AUTH_TOKEN to .env"
echo "2. Run: npm run cli fetch-feed"
