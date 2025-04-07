const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');
const http = require('http');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { exec } = require('child_process');
const archiver = require('archiver');
const axios = require('axios');
const AdmZip = require('adm-zip'); // Using adm-zip for unzipping
const path = require('path');
const os = require('os');

let serverRunning = false;

// MongoDB connection setup
const uri = "mongodb+srv://everyone:pass@mcsharedhost.htnpmav.mongodb.net/?appName=McSharedHost";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
let db;

// Google Drive setup
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';
let oauth2Client;

// HTTP Server setup
const port = 3000;
const usernameFilePath = 'username.json';

// Utility to generate random username
function generateRandomUsername() {
  const username = 'user_' + Math.random().toString(36).substring(2, 15);
  return username;
}

function readUsername() {
  if (fs.existsSync(usernameFilePath)) {
    const data = fs.readFileSync(usernameFilePath, 'utf8');
    return JSON.parse(data).username;
  } else {
    const username = generateRandomUsername();
    fs.writeFileSync(usernameFilePath, JSON.stringify({ username }));
    return username;
  }
}

// Connect to MongoDB
async function connectToDb() {
  try {
    await client.connect();
    db = client.db();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

async function login() {
  const username = readUsername();
  if (!db) return;

  let user = await db.collection('clients').findOne({ username });

  if (!user) {
    await db.collection('clients').insertOne({
      username,
      ram: (os.freemem() / (1024 * 1024)).toFixed(2),
      lastseen: new Date().toISOString(),
    });
    console.log('User created:', username);
  } else {
    console.log('User logged in:', username);
  }

  return username;
}

async function updateMongoDB() {
  const username = readUsername();
  const freeRam = (os.freemem() / (1024 * 1024)).toFixed(2);
  const currentTime = new Date().toISOString();

  if (!db) return;

  await db.collection('clients').updateOne(
    { username },
    { $set: { ram: freeRam, lastseen: currentTime } }
  );

  if (!serverRunning) {
    process.stdout.write(`\rUpdated ${username} with RAM: ${freeRam} MB at ${currentTime}    `);
  }
}


function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oauth2Client, callback);
    oauth2Client.setCredentials(JSON.parse(token));
    callback(oauth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('Authorize this app by visiting:', authUrl);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter the code: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Token error:', err);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      callback(oAuth2Client);
    });
  });
}

function zipMinecraftFolder(folderPath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Zip created: ${zipPath} (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

async function handleBackupAndUpload() {
  const zipPath = 'minecraft-server.zip';
  await zipMinecraftFolder('./minecraft-server', zipPath); // ✅ Wait until fully zipped

  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.error('Error loading credentials.json:', err);
    authorize(JSON.parse(content), (auth) => {
      uploadFile(auth, async (fileId, link) => {
        const username = readUsername();
        const clientWithMostRam = await db.collection('clients')
          .find({ username: { $ne: username } }).sort({ ram: -1 }).limit(1).next();

        if (clientWithMostRam) {
          console.log('Sending link to client with most RAM:', clientWithMostRam.username);
          await db.collection('clients').updateOne(
            { username: clientWithMostRam.username },
            { $set: { backup_link: link } }
          );
        } else {
          console.log('No client found to send the backup link to.');
        }
      });
    });
  });
}

function uploadFile(auth, callback) {
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = { name: 'minecraft-server.zip' };
  const media = {
    mimeType: 'application/zip',
    body: fs.createReadStream('minecraft-server.zip'),
  };

  drive.files.create({ resource: fileMetadata, media, fields: 'id' }, (err, res) => {
    if (err) return console.error('Upload error:', err);
    const fileId = res.data.id;
    console.log('Uploaded file ID:', fileId);

    drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' }
    }, () => {
      const link = `https://drive.google.com/file/d/${fileId}/view`;
      console.log('Public link:', link);
      callback(fileId, link);
    });
  });
}

async function downloadAndUnzipBackup() {
  const username = readUsername();
  const currentClient = await db.collection('clients').findOne({ username });

  if (!currentClient || !currentClient.backup_link) {
    console.log('No backup link found for this user.');
    return;
  }

  const fileId = currentClient.backup_link.split('/')[5];
  const backupFileUrl = `https://drive.usercontent.google.com/download?export=download&confirm=t&id=${fileId}`;
  const outputPath = path.join(__dirname, 'minecraft-server.zip');

  try {
    console.log("Downloading backup into memory...");
    const response = await axios.get(backupFileUrl, { responseType: 'arraybuffer' });

    // Save buffer to zip file
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    console.log("Backup saved to disk.");

    // Remove old server folder
    console.log("Deleting old server folder...");
    fs.rmSync('./minecraft-server', { recursive: true, force: true });

    // Extract with adm-zip
    console.log("Unzipping new server...");
    await unzipWithAdmZip(outputPath, './minecraft-server');

    console.log("Unzip complete.");

    // RAM decision
    const freeMB = os.freemem() / (1024 * 1024);
    let ramToUse = 1024;
    if (freeMB > 10000) ramToUse = 8192;
    else if (freeMB > 1000) ramToUse = 5120;

    console.log(`Starting Minecraft server with ${ramToUse} MB RAM...`);
    startMinecraftServer(ramToUse);
  } catch (error) {
    console.error('Download or unzip failed:', error);
  }
}

function unzipWithAdmZip(inputZipPath, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(inputZipPath);
      zip.extractAllTo(outputPath, true); // Overwrite existing files
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

const { spawn } = require('child_process');

function startMinecraftServer(ramMB = 1024) {
  console.log(`Launching server with ${ramMB} MB RAM...`);
  const server = spawn('java', [
    `-Xmx${ramMB}M`,
    `-Xms${ramMB}M`,
    '-jar',
    'server.jar',
    'nogui'
  ], { cwd: './minecraft-server' });

  serverRunning = true;

  server.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  server.on('close', (code) => {
    console.log(`Minecraft server process exited with code ${code}`);
    serverRunning = false;
  });
}


function startHttpServer() {
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Minecraft Server Node.js is running');
  }).listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

async function main() {
  await connectToDb();
  const username = await login();
  console.log('Logged in as:', username);
  startHttpServer();
  setInterval(updateMongoDB, 1000);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.on('line', async (input) => {
    if (input === 'a') handleBackupAndUpload();
    else if (input === 'b') downloadAndUnzipBackup();
  });
}

main().catch(console.error);
