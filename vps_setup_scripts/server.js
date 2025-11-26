// this is for the offline and not existing stuff and other
const mc = require("minecraft-protocol");
const fs = require("fs");
const express = require("express");
const path = require("path");

// =======================
// CONFIG
// =======================
const HTTP_PORT = 80;

// Main server
const MAIN_IP = "0.0.0.0"; // bind all interfaces for main HTTP
const MAIN_MC_PORT = 25566;
const MAIN_MOTD = "§4This server is offline\n§credstone-launcher.com";

// Fake server
const FAKE_IP = "95.216.181.183"; // bind fake server specifically
const FAKE_MC_PORT = 25565;
const FAKE_MOTD = "§4This server doesn't exist\n§credstone-launcher.com";

// HTTP redirect URL & static files
const REDIRECT_URL = "https://redstone-launcher.com";
const FILES_DIR = path.join(__dirname, "files");

// Load ICON
const ICON = fs.existsSync("./server-icon.png")
    ? fs.readFileSync("./server-icon.png").toString("base64")
    : null;

// =======================
// HELPER FUNCTION TO CREATE MINECRAFT SERVER
// =======================
function createMinecraftServer({ host, port, motd }) {
    mc.createServer({
        'online-mode': false,
        host: host,
        port: port,
        version: false,
        beforePing: (response, client) => {
            response.description = motd;

            if (ICON) {
                response.favicon = `data:image/png;base64,${ICON}`;
            }

            response.players = { max: -1, online: -1 };
            return response;
        },
        keepAlive: false,
        onLogin: (client) => {
            client.end("This is a ping-only server.");
        }
    });

    console.log(`Minecraft server running on ${host}:${port}`);
}

// =======================
// CREATE SERVERS
// =======================
createMinecraftServer({ host: MAIN_IP, port: MAIN_MC_PORT, motd: MAIN_MOTD });
createMinecraftServer({ host: FAKE_IP, port: FAKE_MC_PORT, motd: FAKE_MOTD });

// =======================
// HTTP SERVER (serves files + redirects)
// =======================
const app = express();

// Serve static files from /files
app.use(express.static(FILES_DIR, { fallthrough: true }));

// Redirect anything else to REDIRECT_URL
app.use((req, res) => res.redirect(302, REDIRECT_URL));

// Listen on all interfaces
app.listen(HTTP_PORT, () => {
    console.log(`HTTP server running on port ${HTTP_PORT} (serving /files and redirecting others)`);
});
