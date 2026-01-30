#!/bin/bash

# WATAM AI - Interactive Initialization Script
# This script guides you through the complete setup process

set -e

echo "🎨 WATAM AI - Interactive Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}❌ Error: Node.js version 22 or higher required${NC}"
    echo "   Current version: $(node -v)"
    echo "   Please upgrade: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo ""
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
    echo ""
fi

# Interactive configuration
echo "Let's configure your agent..."
echo ""

# Ask for Moltbook token
echo -e "${YELLOW}Do you have a Moltbook auth token? (yes/no)${NC}"
read -r HAS_TOKEN

if [ "$HAS_TOKEN" = "yes" ] || [ "$HAS_TOKEN" = "y" ]; then
    echo "Please enter your Moltbook auth token:"
    read -r MOLTBOOK_TOKEN
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/MOLTBOOK_AUTH_TOKEN=.*/MOLTBOOK_AUTH_TOKEN=$MOLTBOOK_TOKEN/" .env
    else
        # Linux
        sed -i "s/MOLTBOOK_AUTH_TOKEN=.*/MOLTBOOK_AUTH_TOKEN=$MOLTBOOK_TOKEN/" .env
    fi
    
    echo -e "${GREEN}✅ Auth token saved to .env${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}To get a Moltbook auth token:${NC}"
    echo "1. Visit: https://www.moltbook.com/"
    echo "2. Read join instructions: https://moltbook.com/skill.md"
    echo "3. Get claim link"
    echo "4. Tweet the claim link (you must do this manually)"
    echo "5. Receive auth token"
    echo "6. Add token to .env file"
    echo ""
    echo "After getting your token, edit .env:"
    echo "  nano .env"
    echo ""
fi

# Ask about dry-run mode
echo -e "${YELLOW}Enable dry-run mode? (recommended for first-time users) (yes/no)${NC}"
read -r DRY_RUN

if [ "$DRY_RUN" = "no" ] || [ "$DRY_RUN" = "n" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/DRY_RUN_MODE=.*/DRY_RUN_MODE=false/" .env
    else
        sed -i "s/DRY_RUN_MODE=.*/DRY_RUN_MODE=false/" .env
    fi
    echo -e "${YELLOW}⚠️  Dry-run mode disabled - agent will publish when confirmed${NC}"
else
    echo -e "${GREEN}✅ Dry-run mode enabled - agent will only draft content${NC}"
fi
echo ""

# Build the project
echo "Building project..."
npm run build
echo -e "${GREEN}✅ Project built successfully${NC}"
echo ""

# Run tests
echo "Running tests..."
npm test
echo -e "${GREEN}✅ Tests passed${NC}"
echo ""

# Test connection if token provided
if [ "$HAS_TOKEN" = "yes" ] || [ "$HAS_TOKEN" = "y" ]; then
    echo "Testing Moltbook connection..."
    if npm run cli fetch-skill > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Successfully connected to Moltbook${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not connect to Moltbook (may be offline)${NC}"
    fi
    echo ""
fi

# Summary
echo ""
echo "🎉 Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""

if [ "$HAS_TOKEN" != "yes" ] && [ "$HAS_TOKEN" != "y" ]; then
    echo "1. Get Moltbook auth token (see instructions above)"
    echo "2. Add token to .env: nano .env"
    echo "3. Test connection: npm run cli fetch-skill"
    echo "4. Read feed: npm run cli fetch-feed"
else
    echo "1. Read feed: npm run cli fetch-feed"
    echo "2. Draft a post: npm run cli draft-post --submolt art --topic 'Hello'"
    echo "3. Check stats: npm run cli stats"
fi

echo ""
echo -e "${GREEN}Documentation:${NC}"
echo "• Quick start: QUICKSTART.md"
echo "• Full guide: README.md"
echo "• Examples: docs/EXAMPLES.md"
echo "• OpenClaw: docs/OPENCLAW_SETUP.md"
echo ""

echo -e "${GREEN}Kiro Integration:${NC}"
echo "  kiro agent load .kiro/agents/modx-moltbook-agent.json"
echo ""

echo -e "${GREEN}OpenClaw Integration:${NC}"
echo "  npm install -g openclaw@latest"
echo "  openclaw onboard --install-daemon"
echo "  See: docs/OPENCLAW_SETUP.md"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Happy creating! 🚀"
echo ""
