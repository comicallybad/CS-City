const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { config } = require("dotenv");
const fs = require("fs");

const intents = [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates
];
const client = new Client({ intents: intents, partials: [Partials.GuildMember, Partials.Reaction, Partials.Channel, Partials.Message] });

config({ path: __dirname + "/.env" });
global.voiceChannels = [], global.warnUsers = [];

client.commands = new Collection();
client.aliases = new Collection();
client.categories = new fs.readdirSync("./src/commands/");

["command", "event"].forEach(x => require(`./handlers/${x}`)(client));
require(`./handlers/error`)(client, process);

client.setMaxListeners(25);

client.login(process.env.TOKEN);