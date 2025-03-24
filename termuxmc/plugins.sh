#!/bin/bash

# ==============================
# Plugin List (Edit this section)
# ==============================
declare -A PLUGINS

PLUGINS["viaversion"]="5.2.1|https://github.com/ViaVersion/ViaVersion/releases/download/5.2.1/ViaVersion-5.2.1.jar"
PLUGINS["playitgg"]="Latest|https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar"
PLUGINS["viabackwards"]="5.2.1|https://github.com/ViaVersion/ViaBackwards/releases/download/5.2.1/ViaBackwards-5.2.1.jar"

PLUGIN_DIR="plugins"
mkdir -p "$PLUGIN_DIR"

# ==============================
# Functions
# ==============================

install_plugin() {
    local plugin=$1
    local versions=(${PLUGINS[$plugin]})

    echo "Available versions for $plugin:"
    for i in "${!versions[@]}"; do
        echo "$((i + 1)). $(echo "${versions[$i]}" | cut -d '|' -f1)"
    done

    read -p "Enter the version number (1-${#versions[@]}): " version
    [[ "$version" =~ ^[1-9][0-9]*$ ]] && [ "$version" -le "${#versions[@]}" ] || { echo "Invalid selection"; return; }

    selected_url=$(echo "${versions[$((version - 1))]}" | cut -d '|' -f2)
    wget -O "$PLUGIN_DIR/$plugin.jar" "$selected_url"
    echo "Installed $plugin!"
}

uninstall_plugin() {
    local plugin=$1
    rm -f "$PLUGIN_DIR/$plugin.jar" && echo "Uninstalled $plugin!" || echo "$plugin is not installed."
}

# ==============================
# Execution
# ==============================

[ "$#" -lt 2 ] && { echo "Usage: $0 -i|-u plugin1 plugin2 ..."; exit 1; }

ACTION=$1
shift

for plugin in "$@"; do
    if [[ -n "${PLUGINS[$plugin]}" ]]; then
        [[ "$ACTION" == "-i" ]] && install_plugin "$plugin"
        [[ "$ACTION" == "-u" ]] && uninstall_plugin "$plugin"
    else
        echo "Unknown plugin: $plugin"
    fi
done
