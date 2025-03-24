#!/bin/bash

# Get the absolute path of the script directory
SCRIPT_PATH="$(realpath "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
BACKUP_DIR="$SCRIPT_DIR/backup"

# Ensure backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "Backup folder created at $BACKUP_DIR"
fi

# Function to display usage
usage() {
    echo "Usage:"
    echo "  ./backup.sh create    - Create a backup"
    echo "  ./backup.sh restore   - Restore a backup"
    exit 1
}

# Function to create a backup
create_backup() {
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    DEST_DIR="$BACKUP_DIR/$TIMESTAMP"

    mkdir -p "$DEST_DIR"

    # Copy everything except the backup folder itself
    find "$SCRIPT_DIR" -mindepth 1 -maxdepth 1 ! -name "backup" -exec cp -r {} "$DEST_DIR" \;

    echo "Backup created at $DEST_DIR"
}

# Function to restore a backup
restore_backup() {
    echo "Available backups:"
    BACKUPS=("$BACKUP_DIR"/*)

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo "No backups found!"
        exit 1
    fi

    for i in "${!BACKUPS[@]}"; do
        BASENAME=$(basename "${BACKUPS[$i]}")
        echo "[$i] $BASENAME"
    done

    echo -n "Enter the number of the backup to restore: "
    read CHOICE

    if [[ ! "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -ge "${#BACKUPS[@]}" ]]; then
        echo "Invalid choice!"
        exit 1
    fi

    BACKUP_PATH="${BACKUPS[$CHOICE]}"

    # Delete all files except the backup folder
    find "$SCRIPT_DIR" -mindepth 1 -maxdepth 1 ! -name "backup" -exec rm -rf {} +

    cp -r "$BACKUP_PATH"/* "$SCRIPT_DIR"
    echo "Restored from backup: $(basename "$BACKUP_PATH")"
}

# Main logic
case "$1" in
    create)
        create_backup
        ;;
    restore)
        restore_backup
        ;;
    *)
        usage
        ;;
esac
