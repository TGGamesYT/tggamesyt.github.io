#!/bin/bash
set -e

echo "=== Termux FRPC Setup ==="

# -----------------------------
# Dependencies
# -----------------------------
echo "[*] Installing dependencies..."
pkg update -y
pkg install -y curl tar jq

# -----------------------------
# Detect architecture
# -----------------------------
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    FRP_ARCH="amd64"
elif [[ "$ARCH" == "aarch64" ]]; then
    FRP_ARCH="arm64"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

# -----------------------------
# Download latest frpc
# -----------------------------
echo "[*] Fetching latest FRP release info..."
LATEST=$(curl -s https://api.github.com/repos/fatedier/frp/releases/latest)
FRP_VERSION=$(echo "$LATEST" | jq -r '.tag_name' | sed 's/v//')

FRP_TAR="frp_${FRP_VERSION}_linux_${FRP_ARCH}.tar.gz"
FRP_URL="https://github.com/fatedier/frp/releases/latest/download/$FRP_TAR"

echo "[*] Downloading $FRP_TAR..."
curl -LO "$FRP_URL"

echo "[*] Extracting frpc..."
tar -xzf "$FRP_TAR"
rm "$FRP_TAR"

FRP_DIR="frp_${FRP_VERSION}_linux_${FRP_ARCH}"
cp "${FRP_DIR}/frpc" ./frpc
chmod +x ./frpc
rm -rf "$FRP_DIR"

# -----------------------------
# Create start.sh
# -----------------------------
cat <<'EOF' > start.sh
#!/bin/bash
set -e

echo "=== FRPC Client Starter ==="

VPS_API="http://157.180.40.103:8080"

# Ask for user credentials and local port
read -p "Username: " USERNAME
read -sp "Password: " PASSWORD
echo
read -p "Subdomain: " SUBDOMAIN
read -p "Local port (service to expose): " LOCAL_PORT

# Save credentials locally
mkdir -p .frpc_data
echo "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" > .frpc_data/creds.json

# -----------------------------
# Register subdomain with VPS
# -----------------------------
echo "[*] Registering subdomain with VPS..."
RESPONSE=$(curl -s -X POST "$VPS_API/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"local_port\":$LOCAL_PORT,\"subdomain\":\"$SUBDOMAIN\"}")

OK=$(echo "$RESPONSE" | jq -r '.ok')
if [[ "$OK" != "true" ]]; then
  echo "Failed to register subdomain:"
  echo "$RESPONSE"
  exit 1
fi

REMOTE_PORT=$(echo "$RESPONSE" | jq -r '.remote_port')
FRP_SERVER=$(echo "$RESPONSE" | jq -r '.frp_server')

echo "[*] Subdomain registered!"
echo "Remote port: $REMOTE_PORT"
echo "FRP server: $FRP_SERVER"

# -----------------------------
# Generate frpc.ini
# -----------------------------
cat <<FRPC_EOF > frpc.ini
[common]
server_addr = $FRP_SERVER
server_port = 7000
token = redston

[${SUBDOMAIN}]
type = tcp
local_port = $LOCAL_PORT
remote_port = $REMOTE_PORT
FRPC_EOF

echo "[*] Starting frpc..."
./frpc -c frpc.ini
EOF

chmod +x start.sh

echo "=== Setup complete! ==="
echo "Run ./start.sh to configure and start the FRPC client."
