const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ---------------------------
// LOAD + SAVE PERSISTENT DATA
// ---------------------------
let userStrikes = {};

// Load file
if (fs.existsSync("data.json")) {
  userStrikes = JSON.parse(fs.readFileSync("data.json", "utf8"));
}

// Save file function
function saveData() {
  fs.writeFileSync("data.json", JSON.stringify(userStrikes, null, 2));
}

// ---------------------------
// SPAM TRACKER
// ---------------------------

const userMessageMap = new Map();
const TIME_LIMIT = 10 * 1000; // 10 seconds

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const content = message.content.trim();
  const now = Date.now();

  let data = userMessageMap.get(userId);

  // First message or new content → reset
  if (!data || data.content !== content) {
    data = {
      content,
      channels: new Set([message.channel.id]),
      messages: [message],
      firstTimestamp: now
    };
    userMessageMap.set(userId, data);
    return;
  }

  // If outside 10 sec window → treat as new attempt
  if (now - data.firstTimestamp > TIME_LIMIT) {
    data = {
      content,
      channels: new Set([message.channel.id]),
      messages: [message],
      firstTimestamp: now
    };
    userMessageMap.set(userId, data);
    return;
  }

  // Same message within window
  data.channels.add(message.channel.id);
  data.messages.push(message);

  // If they spammed across 2+ channels
  if (data.channels.size >= 3) {
    await handleSpam(message, data.messages);
    userMessageMap.delete(userId);
  }
});

// ---------------------------
// HANDLE SPAM PUNISHMENTS
// ---------------------------

async function handleSpam(message, messagesToDelete) {
  const guild = message.guild;
  const member = await guild.members.fetch(message.author.id).catch(() => null);
  if (!member) return;

  const id = member.id;

  // Init strike count if missing
  if (!userStrikes[id]) userStrikes[id] = { strikes: 0 };

  userStrikes[id].strikes++;
  saveData(); // write to file

  const strikes = userStrikes[id].strikes;

  // Delete spam messages
  for (const msg of messagesToDelete) {
    msg.delete().catch(() => {});
  }

  // Apply punishment
  if (strikes === 1) {
    // Timeout 7 days
    const msWeek = 7 * 24 * 60 * 60 * 1000;
    await member.timeout(msWeek, "Spam automod: 1st strike").catch(() => {});
    message.channel.send(
      `${member} has been **timed out for 7 days** (1st offense).`
    );

  } else if (strikes === 2) {
    // Kick
    await member.kick("Spam automod: 2nd strike").catch(() => {});
    message.channel.send(
      `${member.user.tag} has been **kicked** (2nd offense).`
    );

  } else if (strikes >= 3) {
    // Ban
    await guild.members.ban(id, {
      reason: "Spam automod: 3rd offense"
    }).catch(() => {});
    message.channel.send(
      `${member.user.tag} has been **banned** (3rd offense).`
    );
  }
}

client.login("BOTTOKEN");
