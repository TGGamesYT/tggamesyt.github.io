require('dotenv').config(); const fs = require('fs'); const { exec } = require('child_process'); const Eris = require('eris');

const TOKEN = process.env.TOKEN; const CHANNEL_ID = process.env.CHANNEL_ID; const LOG_PATH = process.env.LOG_PATH || '/home/tothgergoci/server/logs/latest.log'; const SCREEN_NAME = process.env.SCREEN_NAME || 'mc';

if (!TOKEN || !CHANNEL_ID) { console.error('Missing TOKEN or CHANNEL_ID in .env'); process.exit(1); }

const bot = new Eris(TOKEN); let lastSize = 0;

bot.on('ready', () => { console.log('Bot is online.'); sendToMinecraft('[Server] Bot online.'); bot.createMessage(CHANNEL_ID, '🟢 Server bot online!'); // Initialize lastSize to current file size to prevent dumping old logs if (fs.existsSync(LOG_PATH)) { lastSize = fs.statSync(LOG_PATH).size; } });

bot.on('messageCreate', msg => { if (msg.channel.id !== CHANNEL_ID || msg.author.bot) return; const username = msg.author.username.replace(/[^a-zA-Z0-9_]/g, ''); const text = msg.content.replace(/[ \n]/g, ' ').replace(/[\"]/g, '');

console.log([Discord -> MC] <${username}> ${text});

const tellraw = /tellraw @a {\"text\":\"<${username}> ${text}\"}; exec(screen -S ${SCREEN_NAME} -p 0 -X stuff '${tellraw}\n', (err) => { if (err) console.log("Send error:", err); }); });

function monitorLog() { if (!fs.existsSync(LOG_PATH)) return setTimeout(monitorLog, 2000);

const stat = fs.statSync(LOG_PATH); if (stat.size < lastSize) lastSize = 0;

const stream = fs.createReadStream(LOG_PATH, { start: lastSize, end: stat.size });

let buffer = ''; stream.on('data', chunk => buffer += chunk); stream.on('end', () => { lastSize = stat.size; const lines = buffer.split('\n'); let recentlyLeft = new Set();

for (const line of lines) { if (!line.includes('INFO]:')) continue; if (line.includes('joined the game')) { const player = line.split('INFO]: ')[1].split(' joined')[0]; sendToDiscord(`🟢 **${player} joined the game**`); recentlyLeft.delete(player); } else if (line.includes('lost connection')) { const player = line.split('INFO]: ')[1].split(' ')[0]; recentlyLeft.add(player); } else if (line.includes('left the game')) { const player = line.split('INFO]: ')[1].split(' ')[0]; if (!recentlyLeft.has(player)) { sendToDiscord(`🔴 **${player} left the game**`); } recentlyLeft.delete(player); } else if (line.includes('<') && line.includes('>')) { const chat = line.split('INFO]: ')[1]; sendToDiscord(`💬 ${chat}`); } else if (line.includes('Done (')) { sendToDiscord('✅ **Server started.**'); } } setTimeout(monitorLog, 1000); 

}); }

function sendToDiscord(msg) { bot.createMessage(CHANNEL_ID, msg).catch(console.error); }

function sendToMinecraft(text) { const command = /tellraw @a {\"text\":\"${text.replace(/\"/g, '\\\"')}\"}; exec(screen -S ${SCREEN_NAME} -p 0 -X stuff '${command}\n', (err) => { if (err) console.log("Send error:", err); }); }

bot.connect(); monitorLog();

