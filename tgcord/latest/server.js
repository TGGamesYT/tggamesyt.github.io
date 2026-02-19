const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

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
        version: "TGcord-Server-2.0"
    });
});

/* ===========================
   LOGIN
=========================== */

app.post("/login", (req, res) => {
    const { id, username, nickname, about, avatar } = req.body;

    if (!id || !username) {
        return res.json({ success: false, error: "Missing fields" });
    }

    const existingUsername = getUserByUsername(username);
    if (existingUsername && existingUsername.id !== id) {
        return res.json({ success: false, error: "Username taken" });
    }

    let user = getUserById(id);

    if (!user) {
        user = {
            id,
            username,
            nickname: nickname || username,
            about: about || "",
            avatar: avatar || null,
            created: Date.now()
        };
        users.push(user);
    } else {
        user.username = username;
        user.nickname = nickname || user.nickname;
        user.about = about || user.about;
        user.avatar = avatar || user.avatar;
    }

    save("users.json", users);
    rebuildCache();

    const sessionId = generateSession();
    sessions[sessionId] = id;
    save("sessions.json", sessions);

    res.json({ success: true, sessionId });
});

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

    res.json(user);
});

app.get("/users", (req, res) => {
    res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname
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

/* ===========================
   START
=========================== */

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
