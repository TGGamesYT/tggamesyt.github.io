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
echo "[*] Creating .env configuration..."

read -p "Enter VPS public IP: " VPS_IP
read -p "Enter base domain (example: tunnel.mydomain.com): " BASE_DOMAIN
read -p "Enter Cloudflare API Token: " CF_TOKEN
read -p "Enter Cloudflare Zone ID: " CF_ZONE
read -p "Enter API server port (default 8080): " PORT
PORT=${PORT:-8080}

# FRP server address defaults to VPS_IP
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
EOF

# -----------------------------
# INSTALL NODE SERVER
# -----------------------------
echo "[*] Setting up Node.js API server..."

mkdir -p api
cd api

cat <<'EOF' > server.js
YOUR_NODE_SERVER_CODE_WILL_BE_INSERTED_HERE
EOF

# Insert the provided server code into server.js
sed -i "s|YOUR_NODE_SERVER_CODE_WILL_BE_INSERTED_HERE|$(sed 's/\\/\\\\/g' <<< "$(cat <<'JS'
require('dotenv').config()
const express = require('express')
const fetch = require('node-fetch')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')

const DATA_FILE = path.join(__dirname, 'data.json')

// Load persistent data
let data = { subdomains: {} }
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE))
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function randPort() {
  const min=20000, max=30000
  for (let i=0;i<50;i++) {
    const p=Math.floor(Math.random()*(max-min+1))+min
    if (!Object.values(data.subdomains).some(s=>s.remotePort===p)) return p
  }
  for (let p=min;p<=max;p++) if (!Object.values(data.subdomains).some(s=>s.remotePort===p)) return p
  return null
}

const app = express()
app.use(bodyParser.json())

const VPS_IP = process.env.VPS_IP
const DOMAIN = process.env.BASE_DOMAIN
const FRP_SERVER_ADDR = process.env.FRP_SERVER_ADDR
const CF_TOKEN = process.env.CLOUDFLARE_TOKEN
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID

async function createARecord(name, ip) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({
      type:'A',
      name:`${name}.${DOMAIN}`,
      content: ip,
      ttl:1,
      proxied:false
    })
  })
  const j = await res.json()
  if(!j.success) throw new Error(JSON.stringify(j.errors))
  return j.result.id
}

async function createSRVRecord(name, port) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({
      type:'SRV',
      name:`_minecraft._tcp.${name}.${DOMAIN}`,
      data:{
        service: "_minecraft",
        proto: "_tcp",
        name: `${name}.${DOMAIN}`,
        priority: 0,
        weight: 5,
        port: port,
        target: `${name}.${DOMAIN}`
      }
    })
  })
  const j = await res.json()
  if(!j.success) throw new Error(JSON.stringify(j.errors))
  return j.result.id
}

async function deleteRecord(recordId) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records/${recordId}`, {
    method:'DELETE',
    headers:{
      'Authorization': `Bearer ${CF_TOKEN}`
    }
  })
  const j = await res.json()
  if(!j.success) throw new Error(JSON.stringify(j.errors))
}

app.post('/register', async (req,res)=>{
  try{
    const { username, password, local_port, subdomain } = req.body
    if(!username||!password||!subdomain) return res.status(400).json({error:"missing_fields"})
    const name = subdomain.toLowerCase()

    const existing = data.subdomains[name]
    if(existing){
      const match = await bcrypt.compare(password, existing.passwordHash)
      if(!match) return res.status(403).json({error:'subdomain_taken_wrong_password'})
      return res.json({ ok:true, remote_port: existing.remotePort, frp_server: FRP_SERVER_ADDR })
    }

    const passwordHash = await bcrypt.hash(password,10)
    const remotePort = randPort()
    if(!remotePort) return res.status(500).json({error:'no_ports_available'})

    const aRecordId = await createARecord(name,VPS_IP)
    const srvRecordId = await createSRVRecord(name,remotePort)

    data.subdomains[name] = { username, passwordHash, remotePort, aRecordId, srvRecordId }
    saveData()

    return res.json({ ok:true, remote_port: remotePort, frp_server: FRP_SERVER_ADDR })
  }catch(e){
    console.error(e)
    return res.status(500).json({error:'internal',details:e.message})
  }
})

app.post('/release', async (req,res)=>{
  try{
    const { username, password, subdomain } = req.body
    if(!username||!password||!subdomain) return res.status(400).json({error:'missing_fields'})
    const name = subdomain.toLowerCase()
    const record = data.subdomains[name]
    if(!record) return res.status(404).json({error:'subdomain_not_found'})
    if(record.username !== username) return res.status(403).json({error:'not_owner'})
    const match = await bcrypt.compare(password, record.passwordHash)
    if(!match) return res.status(403).json({error:'wrong_password'})

    await deleteRecord(record.aRecordId)
    await deleteRecord(record.srvRecordId)

    delete data.subdomains[name]
    saveData()
    return res.json({ok:true})
  }catch(e){
    console.error(e)
    return res.status(500).json({error:'internal',details:e.message})
  }
})

app.post('/check',(req,res)=>{
  const { subdomain } = req.body
  if(!subdomain) return res.status(400).json({error:'missing_subdomain'})
  const name = subdomain.toLowerCase()
  return res.json({ ok:true, taken: !!data.subdomains[name] })
})

app.listen(process.env.PORT,()=>console.log(`FRP API running on port ${process.env.PORT}`))
JS
)")"| sed 's/|/\\|/g')

npm init -y
npm install express node-fetch bcryptjs body-parser dotenv

echo "{}" > data.json

cd ..

# -----------------------------
# CREATE START SCRIPT
# -----------------------------
echo "[*] Creating start.sh..."

cat <<EOF > start.sh
#!/bin/bash
pm2 start frps --name frps -- ./frps -c ./frps.ini
pm2 start api/server.js --name frp-api
pm2 save
EOF

chmod +x start.sh

echo "=== Setup complete! ==="
echo "Run ./start.sh to start FRP + API server."
