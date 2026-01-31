#!/bin/bash

set -e

echo "🚀 Building WATAM AI Desktop v1.2.0"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from the project root"
  exit 1
fi

# Step 1: Build TypeScript
echo "📦 Step 1/4: Building TypeScript..."
npm run build
echo "✅ TypeScript build complete"
echo ""

# Step 2: Run tests
echo "🧪 Step 2/4: Running tests..."
npm test
echo "✅ All tests passed"
echo ""

# Step 3: Install Electron dependencies
echo "📥 Step 3/4: Installing Electron dependencies..."
cd electron
if [ ! -d "node_modules" ]; then
  npm install
fi
echo "✅ Electron dependencies installed"
echo ""

# Step 4: Build Electron app
echo "🔨 Step 4/4: Building Electron app..."
echo ""
echo "Building for:"
echo "  - macOS (Apple Silicon + Intel)"
echo "  - Windows (x64)"
echo ""
echo "This may take several minutes..."
echo ""

npm run build:all

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Installers created in: electron/dist/"
echo ""
ls -lh dist/ 2>/dev/null || echo "Check electron/dist/ directory for installers"
echo ""
echo "🎉 Ready for distribution!"
