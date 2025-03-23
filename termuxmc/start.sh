#!/bin/bash

# Define the function to fetch the latest build and other details from the given version
get_latest_build() {
    VERSION=$1
    URL="https://tggamesyt.github.io/termuxmc/latestbuild.html?version=$VERSION"

    # Fetch the JSON data from the URL using curl
    JSON=$(curl -s "$URL")

    # Extract the latest build number from the JSON response
    LATEST_BUILD=$(echo "$JSON" | jq -r '.latestBuild')

    # Extract the JAR file name from the JSON response
    JAR_FILE=$(echo "$JSON" | jq -r '.downloads.application.name')

    # If jq doesn't parse correctly, return an error
    if [ "$LATEST_BUILD" == "null" ] || [ "$JAR_FILE" == "null" ]; then
        echo "Error: Failed to fetch or parse the build data for version $VERSION"
        exit 1
    fi

    # Return the latest build number and JAR file
    echo "Minecraft Version: $VERSION, Latest Build: $LATEST_BUILD, JAR File: $JAR_FILE"
    echo $LATEST_BUILD $JAR_FILE
}

# Ask the user for the Minecraft version
read -p "Enter the Minecraft version you want to install (e.g., 1.21.4): " MINECRAFT_VERSION

# Get the latest build and jar file using the get_latest_build function
build_data=$(get_latest_build "$MINECRAFT_VERSION")

# Extract the latest build and JAR file from the function's output
LATEST_BUILD=$(echo "$build_data" | awk '{print $1}')
JAR_FILE=$(echo "$build_data" | awk '{print $2}')

# Check if a valid build and jar file were returned
if [ -z "$LATEST_BUILD" ] || [ -z "$JAR_FILE" ]; then
    echo "Error: Could not fetch valid build data."
    exit 1
fi

echo "Using Minecraft version $MINECRAFT_VERSION with build $LATEST_BUILD."

# Java version selection (you can customize this part)
# Use OpenJDK 21 (adjust based on your system's availability)
JAVA_VERSION="openjdk-21"

# Install the required Java version
pkg update -y
pkg install $JAVA_VERSION -y

# Download the correct Minecraft JAR file
echo "Downloading PaperMC for Minecraft version $MINECRAFT_VERSION, build $LATEST_BUILD..."
wget "https://api.papermc.io/v2/projects/paper/versions/$MINECRAFT_VERSION/builds/$LATEST_BUILD/downloads/$JAR_FILE" -O paper-$MINECRAFT_VERSION-$LATEST_BUILD.jar

# Create eula.txt to agree to the Minecraft EULA
echo "eula=true" > eula.txt

# Create the startup file to run the Minecraft server
echo "#!/bin/bash" > start.sh
echo "export JAVA_HOME=/data/data/com.termux/files/usr/lib/jvm/$(pkg list-installed | grep openjdk-21 | tail -n 1)" >> start.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> start.sh
echo "java -Xms512M -Xmx1G -jar paper-$MINECRAFT_VERSION-$LATEST_BUILD.jar nogui" >> start.sh

# Make the startup file executable
chmod +x start.sh

echo "Minecraft server for version $MINECRAFT_VERSION, build $LATEST_BUILD is ready!"
echo "Run ./start.sh to start the server."