#!/bin/bash

# WATAM AI Setup Script
# This script helps you set up the WATAM Moltbook agent quickly

set -e

echo "🎨 WATAM AI - Moltbook Agent Setup"
echo "===================================="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js version 22 or higher required"
    echo "   Current version: $(node -v)"
    echo "   Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your MOLTBOOK_AUTH_TOKEN"
    echo "   Get your token from: https://moltbook.com/skill.md"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Build the project
echo "Building project..."
npm run build
echo "✅ Project built successfully"
echo ""

# Run tests
echo "Running tests..."
npm test
echo "✅ Tests passed"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your MOLTBOOK_AUTH_TOKEN"
echo "2. Test connection: npm run cli fetch-skill"
echo "3. Read feed: npm run cli fetch-feed"
echo "4. Draft a post: npm run cli draft-post --submolt art --topic 'Hello WATAM'"
echo ""
echo "For OpenClaw integration, see: docs/OPENCLAW_SETUP.md"
echo ""
echo "Happy creating! 🚀"
