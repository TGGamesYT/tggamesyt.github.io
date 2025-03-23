#!/bin/bash
# run the code below in termux to have yourself
# a papermc/minecraft server running on your own
# android device!
# wget https://tggamesyt.github.io/termuxmc/start.sh -O start.sh && chmod +x start.sh && ./start.sh

# installing depencies and updating everything
pkg install wget curl jq bash -y
pkg update
# Ask the user to select a Minecraft version
read -p "Enter the Minecraft version you want to install (e.g., 1.21.4): " MINECRAFT_VERSION

# Define the Java versions for each Minecraft version
declare -A JAVA_VERSIONS
JAVA_VERSIONS=(
  ["1.17.1"]="17"
  ["1.17.2"]="17"
  ["1.18"]="17"
  ["1.18.1"]="17"
  ["1.18.2"]="17"
  ["1.19"]="17"
  ["1.19.1"]="17"
  ["1.19.2"]="17"
  ["1.19.3"]="17"
  ["1.19.4"]="17"
  ["1.20"]="17"
  ["1.20.1"]="17"
  ["1.20.2"]="17"
  ["1.20.3"]="17"
  ["1.20.4"]="17"
  ["1.21"]="21"
  ["1.21.1"]="21"
  ["1.21.2"]="21"
  ["1.21.3"]="21"
  ["1.21.4"]="21"
)

# Determine the required Java version
JAVA_VERSION="${JAVA_VERSIONS[$MINECRAFT_VERSION]}"

if [[ -z "$JAVA_VERSION" ]]; then
    echo "Error: That Minecraft  version ( $MINECRAFT_VERSION ) might need an unsupported java version."
    exit 1
fi

echo "Minecraft $MINECRAFT_VERSION requires OpenJDK $JAVA_VERSION."

# Install the required Java version
echo "Installing OpenJDK $JAVA_VERSION..."
pkg install "openjdk-$JAVA_VERSION" -y

# Set the correct Java home directory
JAVA_HOME="/data/data/com.termux/files/usr/lib/jvm/java-${JAVA_VERSION}-openjdk"

# Apply the correct Java version for the session
export JAVA_HOME="$JAVA_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

# Fetch the latest build number from the PaperMC API for the specified version
LATEST_BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/$MINECRAFT_VERSION/builds" | jq '.builds | last | .build')

if [[ -z "$LATEST_BUILD" ]]; then
    echo "Error: Could not fetch the latest build for version $MINECRAFT_VERSION."
    exit 1
fi

# Show the latest build number
echo "Latest build for version $MINECRAFT_VERSION is: $LATEST_BUILD"

# Build the JAR file name
JAR_NAME="paper-${MINECRAFT_VERSION}-${LATEST_BUILD}.jar"

# Download the PaperMC JAR file
echo "Downloading $JAR_NAME..."
wget "https://api.papermc.io/v2/projects/paper/versions/$MINECRAFT_VERSION/builds/$LATEST_BUILD/downloads/$JAR_NAME" -O $JAR_NAME

# Check if the download was successful
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to download the JAR file."
    exit 1
fi

# Create eula.txt to agree to the Minecraft EULA
echo "eula=true" > eula.txt

# Create the startup file to run the Minecraft server
echo "#!/bin/bash" > start.sh
echo 'export JAVA_HOME=$JAVA_HOME' >> start.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> start.sh
echo "java -Xms512M -Xmx1G -jar $JAR_NAME nogui" >> start.sh

# Make the startup file executable
chmod +x start.sh

# Optional: Install the playit.gg plugin to connect without port forwarding
mkdir -p plugins
echo 'cd plugins' > playitgg.sh
echo 'wget https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar' >> playitgg.sh
echo 'cd ..' >> playitgg.sh
echo 'echo "You just installed playit.gg"' >> playitgg.sh
echo 'rm -- "$0"' >> playitgg.sh
chmod +x playitgg.sh

echo "Minecraft $MINECRAFT_VERSION setup complete!"
echo "THANKS FOR INSTALLING"
echo "TGGAMESYT'S TERMUXMC"
echo "CONSIDER DONATING AT"
echo "https://ko-fi.com/tggamesyt"
echo "Run ./playitgg.sh to install ghe playit.gg plugin, which allows you to connect to the server via a generated domain adress"
echo "Run ./start.sh to start the server."
rm -- "$0"
