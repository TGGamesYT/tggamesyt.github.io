const VERSION = "3.0.3";
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12; // adjust for performance/security
let presence = new Map(); 
// userId → { lastSeen: timestamp, status: "online" | "idle" }
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

/* ===========================
   CONFIG + STORAGE
=========================== */

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function load(file, fallback) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
        return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath));
}

function save(file, data) {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

let config = load("config.json", {
    port: 21280,
    domain: "redstonemc.net",
    certFile: "",
    keyFile: "",
    autoupdate: false,
    allowServerCreation: "admin",
    admins: []
});

let users = load("users.json", []);
let sessions = load("sessions.json", {});
let messages = load("messages.json", []);
let servers = load("servers.json", []);

/* ===========================
   CACHE LAYER
=========================== */

let userCache = new Map();

function rebuildCache() {
    userCache.clear();
    users.forEach(u => userCache.set(u.id, u));
}

rebuildCache();

/* ===========================
   UTIL
=========================== */

function generateSession() {
    return crypto.randomUUID();
}

function getUserById(id) {
    return userCache.get(id);
}

function getUserByUsername(username) {
    return users.find(u => u.username === username);
}

function requireSession(req, res) {
    const sessionId = req.body.sessionId || req.query.sessionId;
    const userId = sessions[sessionId];
    if (!userId) {
        res.status(401).json({ error: "Invalid session" });
        return null;
    }
    return getUserById(userId);
}

/* ===========================
   STATUS
=========================== */

app.get("/status", (req, res) => {
    res.json({
        status: "ok",
        uptimeSeconds: process.uptime(),
        totalUsers: users.length,
        totalServers: servers.length,
        totalMessages: messages.length,
        activeSessions: Object.keys(sessions).length,
        version: VERSION
    });
});

/* ===========================
   LOGIN
=========================== */
app.post("/login", async (req, res) => {
    const { encryptedAccount, password } = req.body;

    let account;
    try {
        account = await decryptAccount(encryptedAccount, password);
    } catch {
        return res.json({ success: false, error: "Invalid password or file" });
    }

    if (!account?.id || !account?.username) {
        return res.json({ success: false, error: "Corrupted account data" });
    }

    let user = getUserById(account.id);

    // 🆕 AUTO-REGISTER
    if (!user) {
        // prevent username duplicates
        if (getUserByUsername(account.username)) {
            return res.json({ success: false, error: "Username already taken" });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        user = {
            id: account.id,
            username: account.username,
            nickname: account.nickname || account.username,
            about: account.about || "",
            avatar: account.avatar || null,
            created: Date.now(),
            passwordHash
        };

        users.push(user);
        rebuildCache()
        save("users.json", users);
    } else {
        // 🔐 PASSWORD CHECK
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.json({ success: false, error: "Wrong password" });
        }

        // 🔄 UPDATE PROFILE IF CHANGED
        let changed = false;

        if (user.nickname !== account.nickname) {
            user.nickname = account.nickname || user.username;
            changed = true;
        }

        if (user.about !== account.about) {
            user.about = account.about || "";
            changed = true;
        }

        if (user.avatar !== account.avatar) {
            user.avatar = account.avatar || null;
            changed = true;
        }

        if (changed) {
            save("users.json", users);
        }
    }

    // 🎫 CREATE SESSION
    const sessionId = generateSession();
    sessions[sessionId] = user.id;
    save("sessions.json", sessions);

    // ✅ RESPONSE
    res.json({
        success: true,
        sessionId,
        user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            about: user.about,
            avatar: user.avatar
        }
    });
});
/* ================== CRYPTO ================== */

async function deriveKey(password, salt) {
    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 150000,
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptAccount(account, password) {
    const enc = new TextEncoder();

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        enc.encode(JSON.stringify(account))
    );

    return {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    };
}

async function decryptAccount(raw, password) {
    const data = JSON.parse(raw);

    const salt = Uint8Array.from(
        atob(data.salt),
        c => c.charCodeAt(0)
    );

    const iv = Uint8Array.from(
        atob(data.iv),
        c => c.charCodeAt(0)
    );

    const encrypted = Uint8Array.from(
        atob(data.data),
        c => c.charCodeAt(0)
    );

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encrypted
    );

    return JSON.parse(
        new TextDecoder().decode(decrypted)
    );
}

/* ===========================
   USER ENDPOINTS
=========================== */

app.get("/public-users", (req, res) => {
    res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        about: u.about,
        avatar: u.avatar,
        created: u.created
    })));
});

app.get("/profile/:id", (req, res) => {
    const user = getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });

    res.json({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        about: user.about,
        avatar: user.avatar,
        created: user.created,
        status: getPresenceStatus(user.id)
    });
});

app.get("/users", (req, res) => {
    res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        about: u.about, 
        avatar: u.avatar,
        created: u.created,
        status: getPresenceStatus(u.id)
    })));
});

/* ===========================
   DMS
=========================== */

app.post("/dm", (req, res) => {
    const user = requireSession(req, res);
    if (!user) return;

    const { to, message } = req.body;
    const target = getUserById(to);
    if (!target) return res.json({ error: "Target not found" });

    const msg = {
        id: crypto.randomUUID(),
        from: user.id,
        to: target.id,
        message,
        timestamp: Date.now()
    };

    messages.push(msg);
    save("messages.json", messages);

    res.json({ success: true });
});

app.get("/messages", (req, res) => {
    const sessionId = req.query.sessionId;
    const userId = sessions[sessionId];
    if (!userId) return res.json([]);

    const since = parseInt(req.query.since || 0);

    const userMessages = messages.filter(m =>
        (m.from === userId || m.to === userId) &&
        m.timestamp > since
    );

    res.json(userMessages);
});
app.post("/presence", (req, res) => {
    const user = requireSession(req, res);
    if (!user) return;

    const { status } = req.body;

    presence.set(user.id, {
        lastSeen: Date.now(),
        status: status === "idle" ? "idle" : "online"
    });

    res.json({ success: true });
});
function getPresenceStatus(userId) {
    const data = presence.get(userId);
    if (!data) return "offline";

    const timeout = 45000; // 45 seconds

    if (Date.now() - data.lastSeen > timeout) {
        return "offline";
    }

    return data.status;
}
/* ===========================
   SERVERS
=========================== */

app.get("/servers", (req, res) => {
    res.json(servers.map(s => ({
        id: s.id,
        name: s.name,
        owner: s.owner,
        memberCount: s.members.length
    })));
});

app.post("/create-server", (req, res) => {
    const user = requireSession(req, res);
    if (!user) return;

    if (config.allowServerCreation === "admin" &&
        !config.admins.includes(user.id)) {
        return res.json({ error: "Not allowed" });
    }

    const { name } = req.body;
    if (!name) return res.json({ error: "Name required" });

    const newServer = {
        id: crypto.randomUUID(),
        name,
        owner: user.id,
        members: [user.id],
        messages: []
    };

    servers.push(newServer);
    save("servers.json", servers);

    res.json({ success: true, server: newServer });
});

app.post("/join-server", (req, res) => {
    const user = requireSession(req, res);
    if (!user) return;

    const { serverId } = req.body;
    const server = servers.find(s => s.id === serverId);
    if (!server) return res.json({ error: "Server not found" });

    if (!server.members.includes(user.id)) {
        server.members.push(user.id);
        save("servers.json", servers);
    }

    res.json({ success: true });
});

app.post("/server-message", (req, res) => {
    const user = requireSession(req, res);
    if (!user) return;

    const { serverId, message } = req.body;
    const server = servers.find(s => s.id === serverId);

    if (!server || !server.members.includes(user.id)) {
        return res.json({ error: "Not allowed" });
    }

    const msg = {
        id: crypto.randomUUID(),
        from: user.id,
        message,
        timestamp: Date.now()
    };

    server.messages.push(msg);
    save("servers.json", servers);

    res.json({ success: true });
});

app.get("/server-messages", (req, res) => {
    const sessionId = req.query.sessionId;
    const userId = sessions[sessionId];
    if (!userId) return res.json([]);

    const { serverId, since } = req.query;
    const server = servers.find(s => s.id === serverId);
    if (!server || !server.members.includes(userId)) return res.json([]);

    const filtered = server.messages.filter(m =>
        m.timestamp > parseInt(since || 0)
    );

    res.json(filtered);
});

let pendingUpdatePath = null;

function compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

function checkForUpdate() {
    if (!config.autoupdate) return;

    console.log("🔎 Checking for updates...");

    https.get("https://tggamesyt.dev/tgcord/latest/server.js", res => {
        if (res.statusCode !== 200) {
            console.log("Update check failed:", res.statusCode);
            return;
        }

        let data = "";
        res.on("data", chunk => data += chunk);

        res.on("end", () => {
            const match = data.match(/const VERSION = "(.*?)"/);

            if (!match) {
                console.log("⚠ Could not detect remote version.");
                return;
            }

            const remoteVersion = match[1];

            if (compareVersions(remoteVersion, VERSION) <= 0) {
                console.log("✅ Server is up to date.");
                return;
            }

            console.log(`🚀 Update available: ${remoteVersion}`);

            const tempPath = __filename + ".update";
            fs.writeFileSync(tempPath, data);

            pendingUpdatePath = tempPath;

            console.log("📦 Update staged. Will apply on shutdown.");
        });
    }).on("error", err => {
        console.error("Update request failed:", err.message);
    });
}
function applyPendingUpdate() {
    if (!pendingUpdatePath) return;

    try {
        console.log("🛠 Applying update...");

        const backupPath = __filename + ".backup";
        fs.copyFileSync(__filename, backupPath);

        fs.copyFileSync(pendingUpdatePath, __filename);
        fs.unlinkSync(pendingUpdatePath);

        console.log("✅ Update applied successfully.");
    } catch (err) {
        console.error("❌ Update failed:", err);
    }
}
/* ===========================
   START
=========================== */
(async () => {
    await checkForUpdate();
})();
if (config.protocol === "https") {
    let certPath = config.certFile;
    let keyPath = config.keyFile;

    // If not manually set, use Certbot standard paths
    if (!certPath || !keyPath) {
        certPath = `/etc/letsencrypt/live/${config.domain}/fullchain.pem`;
        keyPath = `/etc/letsencrypt/live/${config.domain}/privkey.pem`;
    }

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.error("HTTPS enabled but certificate files not found:", certPath, keyPath);
        process.exit(1);
    }

    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    https.createServer(options, app).listen(config.port, () => {
        console.log(`TGcord HTTPS server running on port ${config.port}`);
    });
} else {
    // HTTP fallback
    app.listen(config.port, () => {
        console.log(`TGcord HTTP server running on port ${config.port}`);
    });
}

process.on("SIGINT", () => {
    console.log("Shutting down...");
    applyPendingUpdate();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("Shutting down...");
    applyPendingUpdate();
    process.exit(0);
});