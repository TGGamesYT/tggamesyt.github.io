#!/bin/bash
set -e

# Detect architecture
UNAME_ARCH=$(uname -m)

case "$UNAME_ARCH" in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64 | arm64)
        ARCH="arm64"
        ;;
    armv7l | armv7 | armhf)
        ARCH="armv7"
        ;;
    *)
        echo "Unsupported architecture: $UNAME_ARCH"
        exit 1
        ;;
esac

echo "Detected architecture: $UNAME_ARCH → $ARCH"

# Latest release URL (auto-updated by GitHub)
BASE_URL="https://github.com/rfresh2/ZenithProxy/releases/latest/download"
ZIPFILE="ZenithProxy-launcher-linux-${ARCH}.zip"
FULL_URL="${BASE_URL}/${ZIPFILE}"

echo "Downloading latest ZenithProxy launcher:"
echo "$FULL_URL"

# Download
wget -O launcher.zip "$FULL_URL"

# Unzip
rm -rf ZenithProxy
unzip -o launcher.zip -d ZenithProxy

cd ZenithProxy || exit 1

chmod +x launch

echo "Launching ZenithProxy..."
./launch
