#!/bin/bash

# Download the versions.sh file from the remote location
curl -s https://tggamesyt.github.io/termuxmc/versions.sh -o versions.sh

# Source the versions.sh file to use the arrays defined in it
source ./versions.sh

# Ask the user to select a Minecraft version
read -p "Enter the Minecraft version you want to install (e.g., 1.21, 1.19): " MINECRAFT_VERSION

# Check if the selected version exists in the predefined versions array
if [[ -z "${JAVA_VERSIONS[$MINECRAFT_VERSION]}" ]] || [[ -z "${JAR_LOCATIONS[$MINECRAFT_VERSION]}" ]]; then
    echo "Minecraft version $MINECRAFT_VERSION is not found in the predefined versions."
    # Ask the user for custom input
    read -p "Enter the custom Minecraft JAR URL: " JAR_URL
    read -p "Enter the custom Java version (e.g., openjdk-21, openjdk-17): " JAVA_VERSION

    # Check if the custom Java version is valid
    if [[ -z "$JAVA_VERSION" ]]; then
        echo "Java version is required."
        exit 1
    fi

    # Download the custom JAR file
    echo "Downloading the custom Minecraft JAR from $JAR_URL..."
    wget $JAR_URL -O paper-custom.jar

    # Set the downloaded JAR location and Java version
    JAR_URL="paper-custom.jar"
else
    # If the version exists in the predefined array, use it
    echo "Using predefined Minecraft version $MINECRAFT_VERSION..."
    JAR_URL=${JAR_LOCATIONS[$MINECRAFT_VERSION]}
    JAVA_VERSION=${JAVA_VERSIONS[$MINECRAFT_VERSION]}
fi

# Update package manager
pkg update -y

# Install the required Java version
echo "Installing Java version: $JAVA_VERSION"
pkg install $JAVA_VERSION -y

# Download the Minecraft Paper JAR (either custom or predefined)
echo "Downloading PaperMC for Minecraft version $MINECRAFT_VERSION..."
wget $JAR_URL -O paper-$MINECRAFT_VERSION.jar

# Create eula.txt to agree to the Minecraft EULA
echo "eula=true" > eula.txt

# Create the startup file to run the Minecraft server
echo "#!/bin/bash" > start.sh
echo "export JAVA_HOME=/data/data/com.termux/files/usr/lib/jvm/$(pkg list-installed | grep $JAVA_VERSION | tail -n 1)" >> start.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> start.sh
echo "java -Xms512M -Xmx1G -jar paper-$MINECRAFT_VERSION.jar nogui" >> start.sh

# Make the startup file executable
chmod +x start.sh

# Optional: Install the playit.gg plugin to connect without port forwarding
mkdir -p plugins
echo 'cd plugins' > playitgg.sh
echo 'wget https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar' >> playitgg.sh
echo 'cd ..' >> playitgg.sh
echo 'rm -- "$0"' >> playitgg.sh
chmod +x playitgg.sh

echo "Minecraft $MINECRAFT_VERSION setup complete!"
echo "Run ./start.sh to start the server."