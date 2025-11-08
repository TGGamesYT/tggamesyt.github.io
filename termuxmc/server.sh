#!/bin/bash
# run the following command in termux to get a minecraft server running on android:
# wget https://tggamesyt.github.io/termuxmc/server.sh -O server.sh && chmod +x server.sh && ./server.sh


# Install dependencies
echo "Installing dependencies..."
pkg update -y && pkg upgrade -y
pkg install -y curl wget jq openjdk-17 openjdk-21

# --- Ask for version ---
read -p "Enter Minecraft version (e.g. 1.21.1): " MINECRAFT_VERSION

# --- Ask for distribution (Paper or Vanilla) ---
read -p "Use Paper or Vanilla server? [P/v]: " SERVER_TYPE
SERVER_TYPE=${SERVER_TYPE:-P} # default to Paper
SERVER_TYPE=$(echo "$SERVER_TYPE" | tr '[:upper:]' '[:lower:]')

# --- Function to determine Java version using Mojang metadata ---
get_java_version() {
  local version=$1
  local manifest_url="https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"

  echo "Fetching Mojang version manifest..."
  local version_url=$(curl -s "$manifest_url" | jq -r --arg ver "$version" '.versions[] | select(.id == $ver) | .url')

  if [[ -z "$version_url" || "$version_url" == "null" ]]; then
    echo "❌ Version $version not found in Mojang manifest."
    return 1
  fi

  echo "Fetching version data for $version..."
  local java_ver=$(curl -s "$version_url" | jq -r '.javaVersion.majorVersion // empty')

  if [[ -z "$java_ver" ]]; then
    echo "⚠️  Java version not found in version data, defaulting to 17."
    java_ver=17
  fi

  echo "$java_ver"
}

# --- Function to fetch Paper server jar ---
get_paper_jar() {
  local version=$1
  echo "Checking for Paper build for version $version..."
  local paper_api="https://api.papermc.io/v2/projects/paper/versions/$version"
  local paper_json=$(curl -s "$paper_api")

  local builds=$(echo "$paper_json" | jq '.builds | length' 2>/dev/null)
  if [[ -z "$builds" || "$builds" == "0" ]]; then
    echo "⚠️  No Paper builds found for $version."
    return 1
  fi

  local latest_build=$(echo "$paper_json" | jq '.builds | last')
  local server_url="https://api.papermc.io/v2/projects/paper/versions/$version/builds/$latest_build/downloads/paper-$version-$latest_build.jar"

  echo "✅ Found Paper build #$latest_build"
  wget -O server.jar "$server_url"
  return 0
}

# --- Function to fetch Vanilla server jar ---
get_vanilla_jar() {
  local version=$1
  echo "Fetching Vanilla server for version $version..."
  local manifest_url="https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"

  local version_url=$(curl -s "$manifest_url" | jq -r --arg ver "$version" '.versions[] | select(.id == $ver) | .url')
  if [[ -z "$version_url" || "$version_url" == "null" ]]; then
    echo "❌ Version $version not found in Mojang manifest."
    return 1
  fi

  local server_url=$(curl -s "$version_url" | jq -r '.downloads.server.url // empty')
  if [[ -z "$server_url" ]]; then
    echo "❌ Could not find server jar URL for version $version."
    return 1
  fi

  echo "✅ Downloading Vanilla server..."
  wget -O server.jar "$server_url"
  return 0
}

# --- Determine required Java version ---
JAVA_VERSION=$(get_java_version "$MINECRAFT_VERSION") || exit 1
if [[ "$JAVA_VERSION" != "17" && "$JAVA_VERSION" != "21" ]]; then
  echo "⚠️  Java $JAVA_VERSION required, but Termux only supports 17 or 21."
  read -p "Use closest supported version (17 or 21)? " JAVA_VERSION
fi

# --- Download server jar ---
if [[ "$SERVER_TYPE" == "p" ]]; then
  if ! get_paper_jar "$MINECRAFT_VERSION"; then
    echo "Falling back to Vanilla server..."
    get_vanilla_jar "$MINECRAFT_VERSION" || exit 1
  fi
else
  get_vanilla_jar "$MINECRAFT_VERSION" || exit 1
fi

# --- Set Java environment ---
export JAVA_HOME="/data/data/com.termux/files/usr/lib/jvm/java-${JAVA_VERSION}-openjdk"
export PATH=$JAVA_HOME/bin:$PATH

# Create start.sh
echo "Creating start.sh..."
cat > start.sh <<EOL
#!/bin/bash
rm -r plugins.sh
wget https://tggamesyt.github.io/termuxmc/plugins.sh
chmod +x plugins.sh
echo "updated plugins.sh"
echo "starting minecraft server..."
export JAVA_HOME="/data/data/com.termux/files/usr/lib/jvm/java-${JAVA_VERSION}-openjdk"
export PATH=\$JAVA_HOME/bin:\$PATH
java -Xms512M -Xmx2G -jar server.jar nogui

if grep -q "termuxmc-autobackup=true" "server.properties"; then
    ./backup.sh create
    echo "termuxmc-autobackup=true" >> server.properties
else
    echo "Auto-backup is disabled."
    echo "termuxmc-autobackup=false" >> server.properties
fi
EOL
chmod +x start.sh
# help.sh
echo "creating help.sh..."
cat > help.sh <<EOL
echo "----------------------------------"
echo "            WELCOME TO            "
echo "TGGAMESYT's MINECRAFT SERVER SETUP"
echo "            HELP  INFO            "
echo "----------------------------------"
echo "./plugins.sh"
echo "    usage:"
echo "    ./plugins.sh -l"
echo "    list available preset plugins"
echo "    ./plugins.sh -i plugin1 plugin2 = installs plugins"
echo "    ./plugins.sh -u plugin1 = uninstalls plugins"
echo "./backup.sh"
echo "    usage:"
echo "    ./backup.sh create = creates a backup"
echo "    ./backup.sh restore = restores a backup"
echo "./start.sh"
echo "    starts the server"
echo "./del.sh"
echo "    deletes every file in the folder and restores the original setup script"
echo "    WARNING: THIS CANT BE UNDONE"
echo "./help.sh"
echo "    shows this list."
echo "./debug.sh"
echo "    nothing you should know"
EOL
chmod +x help.sh

echo "#!/bin/bash" > debug.sh
echo "curl ascii.live/rick" >> debug.sh
chmod +x debug.sh

# Create del.sh
echo "Creating del.sh..."
cat > del.sh <<EOL
#!/bin/bash
rm -rf *
wget https://tggamesyt.github.io/termuxmc/server.sh -O server.sh && chmod +x server.sh
echo "Restored original setup script."
EOL
chmod +x del.sh



# backup.sh
wget https://tggamesyt.github.io/termuxmc/backup.sh
chmod +x backup.sh

echo "creating server.properties"
cat > server.properties <<EOL
# TermuxMC server config
# Minecraft config

rcon.port=25575
gamemode=survival
enable-command-block=false
enable-query=false
level-name=world
motd=\u00A76Running on \u00A7aANDROID\u00A7c??
query.port=25565
pvp=true
difficulty=easy
network-compression-threshold=256
require-resource-pack=false
max-tick-time=60000
use-native-transport=true
max-players=20
online-mode=true
enable-status=true
allow-flight=false
broadcast-rcon-to-ops=true
view-distance=10
server-ip=
resource-pack-prompt=
allow-nether=true
server-port=25565
enable-rcon=false
sync-chunk-writes=true
op-permission-level=4
prevent-proxy-connections=false
resource-pack=
entity-broadcast-range-percentage=100
rcon.password=
player-idle-timeout=0
debug=false
force-gamemode=false
rate-limit=0
hardcore=false
white-list=false
broadcast-console-to-ops=true
spawn-npcs=true
spawn-animals=true
snooper-enabled=true
function-permission-level=2
text-filtering-config=
spawn-monsters=true
enforce-whitelist=false
resource-pack-sha1=
spawn-protection=16
max-world-size=29999984
termuxmc-autobackup=true
EOL
# default server icon
wget https://tggamesyt.github.io/termuxmc/termuxmc-icon.png -O server-icon.png

# Create playitgg.sh
echo "Downloading plugins.sh..."
rm -r plugins.sh
wget https://tggamesyt.github.io/termuxmc/plugins.sh -O plugins.sh
chmod +x plugins.sh
echo "Done"

# Accept EULA
echo "eula=true" > eula.txt

# Final messages
echo "Minecraft $MINECRAFT_VERSION setup complete!"
echo "THANKS FOR INSTALLING"
echo "TGGAMESYT'S TERMUXMC"
echo "CONSIDER DONATING AT"
echo "https://ko-fi.com/tggamesyt"
echo "do ./help.sh to show the usage of the tool commands"
echo "Run ./start.sh to start the server."

# Self-delete
rm -- "$0"
