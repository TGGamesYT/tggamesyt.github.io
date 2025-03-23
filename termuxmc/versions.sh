#!/bin/bash

# Define Java versions and PaperMC JAR locations for each Minecraft version

# Format: "MINECRAFT_VERSION=java_version,jar_url"
declare -A JAVA_VERSIONS
declare -A JAR_LOCATIONS

# Minecraft 1.21 and its corresponding Java and JAR URL
JAVA_VERSIONS["1.21"]="openjdk-21"
JAR_LOCATIONS["1.21"]="https://api.papermc.io/v2/projects/paper/versions/1.21/builds/130/downloads/paper-1.21-130.jar"

# Minecraft 1.19 and its corresponding Java and JAR URL
JAVA_VERSIONS["1.19"]="openjdk-17"
JAR_LOCATIONS["1.19"]="https://api.papermc.io/v2/projects/paper/versions/1.19/builds/123/downloads/paper-1.19-123.jar"

# Minecraft 1.18 and its corresponding Java and JAR URL
JAVA_VERSIONS["1.18"]="openjdk-11"
JAR_LOCATIONS["1.18"]="https://api.papermc.io/v2/projects/paper/versions/1.18/builds/456/downloads/paper-1.18-456.jar"

# You can add more versions and their corresponding Java and JAR links here.