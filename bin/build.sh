#!/bin/sh

# Exit on error
set -e

echo "Starting build process..."

# Run Vite build
pnpm vite build

# Inject timestamp into sw.js for versioning
SW_PATH="dist/sw.js"
if [ -f "$SW_PATH" ]; then
  TIMESTAMP=$(date +%s)
  OS_NAME=$(uname -s)
  # Keep the sed flags portable so the script works under POSIX sh on Linux and macOS.
  if [ "$OS_NAME" = "Darwin" ]; then
    sed -i '' "s/SW_VERSION_PLACEHOLDER/$TIMESTAMP/g" "$SW_PATH"
  else
    sed -i "s/SW_VERSION_PLACEHOLDER/$TIMESTAMP/g" "$SW_PATH"
  fi
  echo "Service Worker version updated with timestamp: $TIMESTAMP"
else
  echo "Warning: dist/sw.js not found, skipping version injection."
fi

echo "Build completed successfully!"
