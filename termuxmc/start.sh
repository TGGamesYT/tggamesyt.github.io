#!/bin/bash

# Ask the user to input a Minecraft version (e.g., 1.13.1, 1.18.1, 1.21)
echo "Enter the Minecraft version you want to run (e.g., 1.13.1, 1.18.1, 1.21):"
read -p "Minecraft Version: " version

# Ensure version has three parts (e.g., 1.21 -> 1.21.0)
if [[ ! "$version" =~ \. ]]; then
    version="$version.0"
fi

# Define the base URL for version scripts
BASE_URL="https://tggamesyt.github.io/termuxmc/versions"

# Construct the URL for the specific version setup script
VERSION_SCRIPT_URL="$BASE_URL/$version-setup.sh"

# Define a temporary file to store the setup script
TEMP_SCRIPT="/tmp/$version-setup.sh"

# Download the version-specific setup script using curl
echo "Downloading setup script for Minecraft version $version..."
curl -s -o "$TEMP_SCRIPT" "$VERSION_SCRIPT_URL"

# Check if the download was successful
if [[ -f "$TEMP_SCRIPT" ]]; then
    # Make the downloaded script executable
    chmod +x "$TEMP_SCRIPT"

    # Run the downloaded setup script
    echo "Running setup for Minecraft version $version..."
    bash "$TEMP_SCRIPT"
else
    # If the script isn't found, fall back to running the other-version.sh
    echo "Setup script not found for version $version. Running fallback other-version.sh..."

    # Check if the fallback script exists
    curl -s -o /tmp/other-version.sh "https://tggamesyt.github.io/termuxmc/versions/other-version.sh"
    if [[ -f /tmp/other-version.sh ]]; then
        chmod +x /tmp/other-version.sh
        bash /tmp/other-version.sh
    else
        echo "Error: Fallback script not found!"
    fi
fi