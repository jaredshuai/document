#!/bin/sh

# Exit on error
set -e

echo "Starting build process..."

# Replace the service worker version placeholder using the sed syntax
# supported by the current operating system.
replace_service_worker_version() {
    sw_path="$1"
    timestamp="$2"
    os_name="$(uname -s 2>/dev/null || echo unknown)"

    case "$os_name" in
        Darwin)
            sed -i '' "s/SW_VERSION_PLACEHOLDER/$timestamp/g" "$sw_path"
            ;;
        *)
            sed -i "s/SW_VERSION_PLACEHOLDER/$timestamp/g" "$sw_path"
            ;;
    esac
}

# Run Vite build
pnpm vite build

# Inject timestamp into sw.js for versioning
SW_PATH="dist/sw.js"
if [ -f "$SW_PATH" ]; then
    TIMESTAMP=$(date +%s)
    replace_service_worker_version "$SW_PATH" "$TIMESTAMP"
    echo "Service Worker version updated with timestamp: $TIMESTAMP"
else
    echo "Warning: dist/sw.js not found, skipping version injection."
fi

echo "Build completed successfully!"
