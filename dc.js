require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const Discord = require('discord.js');
const { exec } = require('child_process');

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const screenSession = 'mc';

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  sendToDiscord('[Server] Bot online.');
});

client.login(token);

const logFile = 'logs/latest.log';
const logSize = fs.statSync(logFile).size;

const stream = fs.createReadStream(logFile, {
  encoding: 'utf8',
  start: logSize
});

const rl = readline.createInterface({ input: stream });

fs.watchFile(logFile, () => {
  const size = fs.statSync(logFile).size;
  const newStream = fs.createReadStream(logFile, {
    encoding: 'utf8',
    start: size
  });
  newStream.on('data', chunk => rl.write(chunk));
});

rl.on('line', (line) => {
  const chat = line.match(/INFO\]: <([^>]+)> (.+)/);
  if (chat) {
    const player = chat[1];
    const msg = chat[2];
    sendToDiscord(`[Chat] <${player}> ${msg}`);
    return;
  }

  if (line.includes('joined the game')) {
    const m = line.match(/INFO\]: ([^ ]+) joined the game/);
    if (m) sendToDiscord(`[Join] ${m[1]} joined.`);
  }

  if (line.includes('left the game')) {
    const m = line.match(/INFO\]: ([^ ]+) left the game/);
    if (m) sendToDiscord(`[Leave] ${m[1]} left.`);
  }

  if (line.includes('lost connection')) {
    const m = line.match(/INFO\]: ([^ ]+) lost connection: (.+)/);
    if (m) sendToDiscord(`[Disconnect] ${m[1]} (${m[2]})`);
  }

  if (line.includes('Starting minecraft server')) {
    sendToDiscord('[Server] Starting...');
  }

  if (line.includes('Stopping server')) {
    sendToDiscord('[Server] Stopping...');
  }
});

client.on('message', (msg) => {
  if (msg.author.bot) return;
  const content = msg.content.replace(/"/g, '\\"');
  const mcCmd =
    `/tellraw @a {"text":"<${msg.author.username}>: ${content}"}`;
  const cmd =
    `screen -S ${screenSession} -p 0 -X stuff "${mcCmd}\\n"`;
  exec(cmd, err => {
    if (err) console.error('MC send failed:', err);
  });
});

function sendToDiscord(text) {
  const ch = client.channels.cache.get(channelId);
  if (ch) ch.send(text).catch(console.error);
  else console.warn('Channel not found');
}