#!/bin/bash
# run the following command in termux to get a minecraft server running on android:
# wget https://tggamesyt.github.io/termuxmc/server.sh -O server.sh && chmod +x server.sh && ./server.sh


# Install dependencies
echo "Installing dependencies..."
pkg update -y && pkg upgrade -y
pkg install -y curl wget jq openjdk-17 openjdk-21

# Ask user for Minecraft version
read -p "Enter Minecraft version: " MINECRAFT_VERSION

# Define Java versions
declare -A JAVA_VERSIONS
JAVA_VERSIONS=(
  ["1.17.1"]="17" ["1.17.2"]="17" ["1.18"]="17"
  ["1.18.1"]="17" ["1.18.2"]="17" ["1.19"]="17"
  ["1.19.1"]="17" ["1.19.2"]="17" ["1.19.3"]="17"
  ["1.19.4"]="17" ["1.20"]="17" ["1.20.1"]="17"
  ["1.20.2"]="17" ["1.20.3"]="17" ["1.20.4"]="17"
  ["1.21"]="21" ["1.21.1"]="21" ["1.21.2"]="21"
  ["1.21.3"]="21" ["1.21.4"]="21"
)

# Determine Java version
JAVA_VERSION=${JAVA_VERSIONS[$MINECRAFT_VERSION]}
if [[ -z "$JAVA_VERSION" ]]; then
  echo "Unsupported Minecraft version! Switching to custom mode."
  read -p "Enter the URL for the custom server jar: " CUSTOM_JAR_URL
  read -p "Enter Java version (17 or 21): " JAVA_VERSION
  if [[ "$JAVA_VERSION" != "17" && "$JAVA_VERSION" != "21" ]]; then
    echo "Termux does not support this Java version. Exiting."
    exit 1
  fi
  wget -O server.jar "$CUSTOM_JAR_URL"
else
  LATEST_BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/$MINECRAFT_VERSION/builds" | jq '.builds | last | .build')
  SERVER_URL="https://api.papermc.io/v2/projects/paper/versions/$MINECRAFT_VERSION/builds/$LATEST_BUILD/downloads/paper-$MINECRAFT_VERSION-$LATEST_BUILD.jar"
  wget -O server.jar "$SERVER_URL"
fi

# Set Java environment
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
else
    echo "Auto-backup is disabled."
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

termuxmc-autobackup=true

# Minecraft config


rcon.port=25575
gamemode=survival
enable-command-block=false
enable-query=false
level-name=world
motd=RUNNING ON ANDROID?
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
EOL
# default server icon
wget https://tggamesyt.github.io/termuxmc/termuxmc-icon.png -O icon.png

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
