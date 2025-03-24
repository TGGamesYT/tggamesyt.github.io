#!/bin/bash

# ==============================
# Plugin List (Edit this section)
# ==============================
declare -A PLUGINS

PLUGINS["viaversion"]="5.2.1|https://github.com/ViaVersion/ViaVersion/releases/download/5.2.1/ViaVersion-5.2.1.jar"
PLUGINS["playitgg"]="Latest|https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar"
PLUGINS["viabackwards"]="5.2.1|https://github.com/ViaVersion/ViaBackwards/releases/download/5.2.1/ViaBackwards-5.2.1.jar"
PLUGINS["geysermc"]="Latest|https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot"
PLUGINS["floodgate"]="Latest|https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot"




PLUGIN_DIR="plugins"
mkdir -p "$PLUGIN_DIR"

# ==============================
# Functions
# ==============================

list_plugins() {
    echo "Available plugins:"
    for plugin in "${!PLUGINS[@]}"; do
        echo " - $plugin"
    done
}

install_plugin() {
    local plugin=$1
    local versions=(${PLUGINS[$plugin]})

    if [ "${#versions[@]}" -eq 1 ]; then
        selected_url=$(echo "${versions[0]}" | cut -d '|' -f2)
    else
        echo "Available versions for $plugin:"
        for i in "${!versions[@]}"; do
            echo "$((i + 1)). $(echo "${versions[$i]}" | cut -d '|' -f1)"
        done

        read -p "Enter the version number (1-${#versions[@]}): " version
        [[ "$version" =~ ^[1-9][0-9]*$ ]] && [ "$version" -le "${#versions[@]}" ] || { echo "Invalid selection"; return; }

        selected_url=$(echo "${versions[$((version - 1))]}" | cut -d '|' -f2)
    fi

    wget -O "$PLUGIN_DIR/$plugin.jar" "$selected_url"
    echo "Installed $plugin!"
}

uninstall_plugin() {
    local plugin=$1
    rm -f "$PLUGIN_DIR/$plugin.jar" && echo "Uninstalled $plugin!" || echo "$plugin is not installed."
}

install_unknown_plugin() {
    local plugin=$1
    read -p "Enter the direct JAR URL for $plugin: " jar_url

    if [[ -z "$jar_url" ]]; then
        echo "No URL provided, skipping $plugin."
        return
    fi

    wget -O "$PLUGIN_DIR/$plugin.jar" "$jar_url"
    echo "Installed $plugin!"
}

# ==============================
# Execution
# ==============================

if [[ "$1" == "-l" ]]; then
    list_plugins
    exit 0
elif [ "$#" -lt 2 ]; then
    echo "Usage: $0 -l | -i|-u plugin1 plugin2 ..."
    exit 1
fi

ACTION=$1
shift

for plugin in "$@"; do
    if [[ -n "${PLUGINS[$plugin]}" ]]; then
        [[ "$ACTION" == "-i" ]] && install_plugin "$plugin"
        [[ "$ACTION" == "-u" ]] && uninstall_plugin "$plugin"
    else
        echo "Unknown plugin: $plugin"
        [[ "$ACTION" == "-i" ]] && install_unknown_plugin "$plugin"
    fi
done
