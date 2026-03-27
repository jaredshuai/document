#!/bin/bash
# Idempotent environment setup for document viewer mission

set -e

echo "Initializing document viewer mission environment..."

# Verify Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
REQUIRED_NODE=20
if [ "$NODE_VERSION" -lt "$REQUIRED_NODE" ]; then
    echo "Error: Node.js $REQUIRED_NODE+ required, found v$NODE_VERSION"
    exit 1
fi
echo "Node.js version OK: $(node -v)"

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi
echo "pnpm version: $(pnpm --version)"

# Install dependencies (idempotent - fast if already installed)
pnpm install --frozen-lockfile

echo "Environment initialization complete."
