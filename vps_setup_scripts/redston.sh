#!/bin/bash
set -e

echo "=== FRP Cloudflare Tunnel VPS Setup ==="

# -----------------------------
# REQUIREMENTS
# -----------------------------
echo "[*] Installing system dependencies..."
sudo apt update
sudo apt install -y curl unzip jq

# -----------------------------
# NODE INSTALL
# -----------------------------
echo "[*] Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# -----------------------------
# ENV CREATION
# -----------------------------
echo "[*] Checking for existing .env..."

if [ -f ".env" ]; then
    echo "[!] .env already exists."
    read -p "Do you want to overwrite it? (y/N): " OVERWRITE
    OVERWRITE=${OVERWRITE:-n}

    if [[ "$OVERWRITE" != "y" && "$OVERWRITE" != "Y" ]]; then
        echo "[*] Keeping existing .env. Skipping creation."
        # DO NOT EXIT — just skip writing the file
    else
        echo "[*] Overwriting existing .env..."

        read -p "Enter VPS public IP: " VPS_IP
        read -p "Enter base domain (example: tunnel.mydomain.com): " BASE_DOMAIN
        read -p "Enter Cloudflare API Token: " CF_TOKEN
        read -p "Enter Cloudflare Zone ID: " CF_ZONE
        read -p "Enter API server port (default 8080): " PORT
        PORT=${PORT:-8080}

        echo "[*] Using FRP server address: $VPS_IP"

        cat <<EOF > .env
VPS_IP=$VPS_IP
BASE_DOMAIN=$BASE_DOMAIN
FRP_SERVER_ADDR=$VPS_IP
CLOUDFLARE_TOKEN=$CF_TOKEN
CLOUDFLARE_ZONE_ID=$CF_ZONE
PORT=$PORT
EOF

        echo "[*] .env created."
    fi
else
    echo "[*] Creating .env configuration..."

    read -p "Enter VPS public IP: " VPS_IP
    read -p "Enter base domain (example: tunnel.mydomain.com): " BASE_DOMAIN
    read -p "Enter Cloudflare API Token: " CF_TOKEN
    read -p "Enter Cloudflare Zone ID: " CF_ZONE
    read -p "Enter API server port (default 8080): " PORT
    PORT=${PORT:-8080}

    echo "[*] Using FRP server address: $VPS_IP"

    cat <<EOF > .env
VPS_IP=$VPS_IP
BASE_DOMAIN=$BASE_DOMAIN
FRP_SERVER_ADDR=$VPS_IP
CLOUDFLARE_TOKEN=$CF_TOKEN
CLOUDFLARE_ZONE_ID=$CF_ZONE
PORT=$PORT
EOF

    echo "[*] .env created."
fi

# -----------------------------
# DOWNLOAD LATEST FRP
# -----------------------------
echo "[*] Fetching latest FRP release info..."

LATEST=$(curl -s https://api.github.com/repos/fatedier/frp/releases/latest)
FRP_VERSION=$(echo "$LATEST" | jq -r '.tag_name' | sed 's/v//')

ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    FRP_ARCH="amd64"
elif [[ "$ARCH" == "aarch64" ]]; then
    FRP_ARCH="arm64"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

FRP_TAR="frp_${FRP_VERSION}_linux_${FRP_ARCH}.tar.gz"

echo "[*] Downloading $FRP_TAR..."
curl -LO "https://github.com/fatedier/frp/releases/latest/download/$FRP_TAR"

echo "[*] Extracting FRP..."
tar -xzf "$FRP_TAR"
rm "$FRP_TAR"

FRP_DIR="frp_${FRP_VERSION}_linux_${FRP_ARCH}"
cp "${FRP_DIR}/frps" ./frps
chmod +x frps

# -----------------------------
# CREATE frps.ini
# -----------------------------
echo "[*] Creating frps.ini..."

cat <<EOF > frps.ini
[common]
bind_port = 7000
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = admin
vhost_http_port = 8081
vhost_https_port = 8443
token = redston
EOF

# -----------------------------
# INSTALL NODE SERVER
# -----------------------------
echo "[*] Setting up Node.js API server..."

mkdir -p api
cat <<'EOF' > api/server.js
require('dotenv').config()
const express = require('express')
const fetch = require('node-fetch')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const leo = require("leo-profanity");
leo.loadDictionary(); // loads English dictionary

const DATA_FILE = path.join(__dirname, 'data.json')
const fallbackSRVs = {};
const FALLBACK_FILE = path.join(__dirname, 'fallbackSRVs.json');

// Load persisted fallback SRVs
if (fs.existsSync(FALLBACK_FILE)) {
  Object.assign(fallbackSRVs, JSON.parse(fs.readFileSync(FALLBACK_FILE)));
}

// Helper to save fallback SRVs
function saveFallbackSRVs() {
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackSRVs, null, 2));
}
const FALLBACK_PORT = 25566;

// bad word thingy
function containsBadWords(input) {
  if (!input) return false;

  // Normalize input (subdomains, identifiers normally use lowercase)
  const cleaned = input.toString().toLowerCase().trim();

  // Check profanity
  return leo.check(cleaned);
}

// Load or initialize data
let data = { users: {}, connections: {} }
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE))
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

const VPS_IP = process.env.VPS_IP
const BASE_DOMAIN = process.env.BASE_DOMAIN
const FRP_SERVER_ADDR = process.env.FRP_SERVER_ADDR
const CF_TOKEN = process.env.CLOUDFLARE_TOKEN
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID
const HEARTBEAT_TIMEOUT = 30_000 // 30 seconds

//----------------------------------------
// Cloudflare API helpers
//----------------------------------------

async function createARecord(name, ip) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: "A",
      name: `${name}.${BASE_DOMAIN}`,
      content: ip,
      ttl: 1,
      proxied: false
    })
  })
  const j = await r.json()
  if (!j.success) throw new Error(JSON.stringify(j.errors))
  return j.result.id
}

async function createSRVRecord(name, port) {
  // Ha van fallback az adott subdomainhez → töröljük
  if (fallbackSRVs[name]) {
    await deleteRecord(fallbackSRVs[name], name, true).catch(() => {});
    delete fallbackSRVs[name];
    saveFallbackSRVs();
  }

  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: "SRV",
      name: `_minecraft._tcp.${name}.${BASE_DOMAIN}`,
      data: {
        service: "_minecraft",
        proto: "_tcp",
        name: `${name}.${BASE_DOMAIN}`,
        priority: 0,
        weight: 5,
        port: port,
        target: `${name}.${BASE_DOMAIN}`
      }
    })
  });

  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));
  return j.result.id;
}

async function deleteRecord(id, name, deleteFallback = false) {
  if (!id) return;

  // Lekérjük a rekordot, hogy megtudjuk a típusát
  const getResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  const getJson = await getResp.json();
  if (!getJson.success) throw new Error(JSON.stringify(getJson.errors));

  const record = getJson.result;

  // Törlés
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${CF_TOKEN}`
    }
  });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));

  // Csak normál SRV rekord törlésekor generáljunk fallbacket
  if (!deleteFallback && name && record.type === "SRV" && record.data.port !== FALLBACK_PORT && !fallbackSRVs[name]) {
    try {
      const fallbackResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: "SRV",
          name: `_minecraft._tcp.${name}.${BASE_DOMAIN}`,
          data: {
            service: "_minecraft",
            proto: "_tcp",
            name: `${name}.${BASE_DOMAIN}`,
            priority: 0,
            weight: 5,
            port: FALLBACK_PORT,
            target: `${name}.${BASE_DOMAIN}`
          }
        })
      });

      const fallbackJson = await fallbackResp.json();
      if (!fallbackJson.success) throw new Error(JSON.stringify(fallbackJson.errors));

      fallbackSRVs[name] = fallbackJson.result.id;
      saveFallbackSRVs();
      console.log(`Fallback SRV létrehozva ${name} subdomainhez 25566-os porton: ${fallbackJson.result.id}`);
    } catch (err) {
      console.error("Fallback SRV létrehozása sikertelen:", err);
    }
  }
}

//----------------------------------------
// Random port allocator
//----------------------------------------

function allocatePort() {
  const min = 20000, max = 30000
  const used = Object.values(data.connections).map(c => c.serverport)

  for (let i = 0; i < 60; i++) {
    const p = Math.floor(Math.random() * (max - min + 1)) + min
    if (!used.includes(p)) return p
  }

  for (let p = min; p <= max; p++) {
    if (!used.includes(p)) return p
  }
  return null
}

//----------------------------------------
// Express
//----------------------------------------

const app = express()
app.use(bodyParser.json())

//----------------------------------------
// USER ENDPOINTS (unchanged)
//----------------------------------------

// Create account
app.post('/createUser', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: "missing_fields" })
  if (containsBadWords(username))
    return res.status(400).json({ error: "bad_username" });
  if (data.users[username])
    return res.status(409).json({ error: "username_taken" })

  data.users[username] = {
    passwordHash: await bcrypt.hash(password, 10)
  }

  saveData()
  return res.json({ ok: true })
})

app.post('/deleteUser', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: "missing_fields" })

  const user = data.users[username]
  if (!user) return res.status(404).json({ error: "user_not_found" })

  if (!await bcrypt.compare(password, user.passwordHash))
    return res.status(403).json({ error: "wrong_password" })

  // Delete all tunnels belonging to this user
  for (const id of Object.keys(data.connections)) {
    const c = data.connections[id]
    if (c.username === username) {

      if (c.hasdomain) {
        await deleteRecord(c.cloudflareA).catch(() => {})
        await deleteRecord(c.cloudflareSRV).catch(() => {})
      }

      delete data.connections[id]
    }
  }

  delete data.users[username]
  saveData()
  return res.json({ ok: true })
})

// Check username availability
app.post('/checkUser', (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: "missing_username" })
  if (containsBadWords(username))
    return res.json({ ok: true, taken: true, reason: "bad_username" });

  return res.json({ ok: true, taken: !!data.users[username] })
})

//----------------------------------------
// TUNNEL ENDPOINTS (with heartbeat system)
//----------------------------------------

// Check subdomain availability
app.post('/checkSubdomain', (req, res) => {
  const { subdomain } = req.body
  if (!subdomain) return res.status(400).json({ error: "missing_subdomain" })
  if (containsBadWords(subdomain))
    return res.json({ ok: true, taken: true, reason: "bad_subdomain" });
  const exists = Object.values(data.connections).some(c => c.publicdomain === `${subdomain}.${BASE_DOMAIN}`)
  return res.json({ ok: true, taken: exists })
})

// Create tunnel
app.post('/createTunnel', async (req, res) => {
  try {
    const { username, password, identifier, localport, hasdomain, subdomain } = req.body

    if (!username || !password || !identifier || !localport)
      return res.status(400).json({ error: "missing_fields" })
    if (containsBadWords(identifier))
      return res.status(400).json({ error: "bad_identifier" });

    // Authenticate user
    const user = data.users[username]
    if (!user) return res.status(404).json({ error: "user_not_found" })
    if (!await bcrypt.compare(password, user.passwordHash))
      return res.status(403).json({ error: "wrong_password" })

    if (data.connections[identifier])
      return res.status(409).json({ error: "identifier_taken" })

    const port = allocatePort()
    if (!port) return res.status(500).json({ error: "no_ports_available" })

    let domain = ""

    if (hasdomain) {
      if (!subdomain) return res.status(400).json({ error: "missing_subdomain" })

      const taken = Object.values(data.connections)
        .some(c => c.publicdomain === `${subdomain}.${BASE_DOMAIN}`)

      if (taken) return res.status(409).json({ error: "subdomain_taken" })
      if (containsBadWords(subdomain)) return res.status(400).json({ error: "bad_subdomain" })
      domain = `${subdomain}.${BASE_DOMAIN}`
    }

    // **Do NOT create DNS here; will be done on heartbeat**
    data.connections[identifier] = {
      username,
      clientport: localport,
      serverport: port,
      hasdomain,
      publicip: `${VPS_IP}:${port}`,
      publicdomain: hasdomain ? domain : "",
      cloudflareA: "",
      cloudflareSRV: "",
      connected: false,
      subdomain: hasdomain ? subdomain : "",
      lastSeen: null
    }
    if (hasdomain) {
  try {
    // Create fallback SRV immediately on 25566
    const fallbackResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: "SRV",
        name: `_minecraft._tcp.${subdomain}.${BASE_DOMAIN}`,
        data: {
          service: "_minecraft",
          proto: "_tcp",
          name: `${subdomain}.${BASE_DOMAIN}`,
          priority: 0,
          weight: 5,
          port: FALLBACK_PORT,
          target: `${subdomain}.${BASE_DOMAIN}`
        }
      })
    });

    const fallbackJson = await fallbackResp.json();
    if (fallbackJson.success) {
      fallbackSRVs[subdomain] = fallbackJson.result.id;
      console.log(`Fallback SRV created for ${subdomain} on port ${FALLBACK_PORT}: ${fallbackJson.result.id}`);
      saveFallbackSRVs();
    }
  } catch (err) {
    console.error("Failed to create fallback SRV:", err);
  }
}
    saveData()

    return res.json({
      ok: true,
      public_ip: `${VPS_IP}:${port}`,
      public_domain: hasdomain ? domain : "",
      frp_server: FRP_SERVER_ADDR
    })

  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "internal", details: e.message })
  }
})

// Delete tunnel
app.post('/deleteTunnel', async (req, res) => {
  const { username, password, identifier } = req.body
  if (!username || !password || !identifier)
    return res.status(400).json({ error: "missing_fields" })

  const user = data.users[username]
  if (!user) return res.status(404).json({ error: "user_not_found" })
  if (!await bcrypt.compare(password, user.passwordHash))
    return res.status(403).json({ error: "wrong_password" })

  const tunnel = data.connections[identifier]
  if (!tunnel) return res.status(404).json({ error: "tunnel_not_found" })
  if (tunnel.username !== username)
    return res.status(403).json({ error: "not_owner" })

  // Delete DNS if any
  if (tunnel.hasdomain) {
    await deleteRecord(tunnel.cloudflareA).catch(() => {})
    await deleteRecord(tunnel.cloudflareSRV).catch(() => {})
  }

  delete data.connections[identifier]
  saveData()
  return res.json({ ok: true })
})

// List tunnels
app.post('/listTunnels', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: "missing_fields" })

  const user = data.users[username]
  if (!user) return res.status(404).json({ error: "user_not_found" })
  if (!await bcrypt.compare(password, user.passwordHash))
    return res.status(403).json({ error: "wrong_password" })

  const list = Object.entries(data.connections)
    .filter(([id, c]) => c.username === username)
    .map(([id, c]) => ({
      identifier: id,
      local_port: c.clientport,
      remote_port: c.serverport,
      hasdomain: c.hasdomain,
      publicip: c.publicip,
      publicdomain: c.publicdomain
    }))

  return res.json({ ok: true, tunnels: list })
})

// Connect tunnel (return info)
app.post("/connectTunnel", async (req, res) => {
  const { username, password, identifier } = req.body;

  if (!username || !password || !identifier)
    return res.status(400).json({ error: "missing_fields" });

  const user = data.users[username];
  if (!user) return res.status(404).json({ error: "user_not_found" });

  if (!await bcrypt.compare(password, user.passwordHash))
    return res.status(403).json({ error: "wrong_password" });

  const tunnel = data.connections[identifier];
  if (!tunnel) return res.status(404).json({ error: "tunnel_not_found" });

  if (tunnel.username !== username)
    return res.status(403).json({ error: "not_owner" });

  return res.json({
    ok: true,
    identifier,
    local_port: tunnel.clientport,
    remote_port: tunnel.serverport,
    public_ip: tunnel.publicip,
    public_domain: tunnel.publicdomain,
    has_domain: tunnel.hasdomain,
    frp_server: FRP_SERVER_ADDR
  });
})

//----------------------------------------
// Heartbeat endpoint
//----------------------------------------
app.post("/tunnelHeartbeat", async (req, res) => {
  const { identifier } = req.body
  if (!identifier) return res.status(400).json({ error: "missing_identifier" })

  const tunnel = data.connections[identifier]
  if (!tunnel) return res.status(404).json({ error: "tunnel_not_found" })

  tunnel.lastSeen = Date.now()

  // Create DNS if not already connected
  if (tunnel.hasdomain && !tunnel.connected) {
    try {
      tunnel.cloudflareA = await createARecord(tunnel.subdomain, VPS_IP)
      tunnel.cloudflareSRV = await createSRVRecord(tunnel.subdomain, tunnel.serverport)
      tunnel.connected = true
    } catch (err) {
      console.error("Failed to create DNS records on heartbeat:", err)
    }
  }

  saveData()
  return res.json({ ok: true })
})

//----------------------------------------
// Cleanup disconnected tunnels periodically
//----------------------------------------
setInterval(async () => {
  const now = Date.now()
  for (const [id, tunnel] of Object.entries(data.connections)) {
    if (!tunnel.connected || !tunnel.lastSeen) continue

    if (now - tunnel.lastSeen > HEARTBEAT_TIMEOUT) {
      console.log(`Tunnel ${id} disconnected due to missed heartbeat, removing DNS`)

      if (tunnel.hasdomain) {
        await deleteRecord(tunnel.cloudflareA).catch(() => {})
        await deleteRecord(tunnel.cloudflareSRV, tunnel.subdomain).catch(() => {})
      }

      tunnel.connected = false
      tunnel.cloudflareA = ""
      tunnel.cloudflareSRV = ""
      saveData()
    }
  }
}, 5000)

//----------------------------------------
app.listen(process.env.PORT, () =>
  console.log(`API server running on port ${process.env.PORT}`)
)
EOF

npm init -y
npm install express node-fetch bcryptjs body-parser dotenv

echo "{ "users": {}, "connections": {} }" > data.json

# -----------------------------
# CREATE START SCRIPT
# -----------------------------
echo "[*] Creating start.sh..."

cat <<EOF > start.sh
#!/bin/bash
pm2 start ./frps --name frps -- -c ./frps.ini
pm2 start api/server.js --name frp-api
pm2 save
EOF

chmod +x start.sh

echo "=== Setup complete! ==="
echo "Run ./start.sh to start FRP + API server."
