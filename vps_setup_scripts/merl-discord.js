// index.js
const {
    Client,
    GatewayIntentBits,
    Partials,
    SlashCommandBuilder,
    Routes,
    REST
} = require('discord.js');

const TOKEN = "BOTTOKEH";
const CLIENT_ID = "CLIENTID";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// ---- Slash Commands ----
const commands = [
    new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask the bot a question")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Your question")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("rig")
        .setDescription("Rig the bot's next response in this server")
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("The response to force")
                .setRequired(true)
        )
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log("Slash commands registered.");
    } catch (err) {
        console.error(err);
    }
})();

// ---- Response Logic ----

const defaultReplies = [
    "I don't know",
    "Your last message contains language that violates our content policy. Please reword your response.",
    "We are currently experiencing higher traffic than expected. Please wait a moment and resend your last message."
];

// guildId -> rigged response
const riggedResponses = new Map();

function getResponse(guildId) {
    if (guildId && riggedResponses.has(guildId)) {
        const r = riggedResponses.get(guildId);
        riggedResponses.delete(guildId); // one-time use
        return r;
    }

    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}

// ---- Message Create Handler ----
client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const isDM = message.channel.type === 1;
    const isPing = message.mentions.has(client.user);

    if (isDM || isPing) {
        const guildId = message.guild?.id ?? null;
        const reply = getResponse(guildId);
        message.reply(reply);
    }
});

// ---- Slash Command Handler ----
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // /ask
    if (interaction.commandName === "ask") {
        const guildId = interaction.guildId;
        const reply = getResponse(guildId);
        return interaction.reply(reply);
    }

    // /rig
    if (interaction.commandName === "rig") {
        const adminOverrideID = "695276945373397013";

        const isAdmin =
            interaction.memberPermissions?.has("Administrator") ||
            interaction.user.id === adminOverrideID;

        if (!isAdmin) {
            return interaction.reply({
                content: "❌ You do not have permission to use this command.",
                ephemeral: true
            });
        }

        const guildId = interaction.guildId;

        if (!guildId) {
            return interaction.reply("❌ Cannot rig responses in DMs.");
        }

        const text = interaction.options.getString("text", true);
        riggedResponses.set(guildId, text);

        return interaction.reply({
            content: `✅ Rigged **this server's next response** to: **${text}**`,
            ephemeral: true
        });
    }
});

client.login(TOKEN);
